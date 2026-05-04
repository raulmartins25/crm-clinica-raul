import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EvolutionAPI } from '@/lib/evolution'

export async function GET(req: NextRequest) {
  const session = await requireSession()

  const instance = await prisma.whatsappInstance.findUnique({
    where: { clinicId: session.clinicId },
  })

  if (!instance) return NextResponse.json({ instance: null })

  // Query Evolution API for live state
  try {
    const evo = new EvolutionAPI({
      baseUrl: process.env.EVOLUTION_API_URL || instance.baseUrl,
      apiKey: process.env.EVOLUTION_API_KEY || instance.apiKey,
      instanceName: instance.instanceName,
    })
    const status = await evo.getInstanceStatus()
    const liveConnected = status?.instance?.state === 'open' || status?.state === 'open'
    
    // Update DB if status changed
    if (liveConnected !== instance.connected) {
      await prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { connected: liveConnected },
      })
      instance.connected = liveConnected
    }
  } catch {
    // If Evolution is unreachable, keep DB value
  }

  return NextResponse.json({ instance })
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()

    const evo = new EvolutionAPI({
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      instanceName: body.instanceName,
    })

    try {
      await evo.createInstance()
    } catch (err: any) {
      // If instance already exists, we can ignore the create error and proceed to set webhook
      if (err.response?.status !== 403 && err.response?.data?.message?.includes('already exists') === false) {
         console.error('Error creating instance:', err.response?.data || err.message)
      }
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
    await evo.setWebhook(webhookUrl)

    const instance = await prisma.whatsappInstance.upsert({
      where: { clinicId: session.clinicId },
      update: {
        instanceName: body.instanceName,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
        webhookUrl,
        connected: false,
      },
      create: {
        clinicId: session.clinicId,
        instanceName: body.instanceName,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
        webhookUrl,
      },
    })

    return NextResponse.json({ instance })
  } catch (error: any) {
    console.error('Evolution API setup error:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao configurar a Evolution API'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
