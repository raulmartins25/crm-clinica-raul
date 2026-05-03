import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getEvolutionClient, EvolutionAPI } from '@/lib/evolution'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await requireSession()

    let evo = await getEvolutionClient(session.clinicId)

    // Se não tiver instância ainda, cria automaticamente
    if (!evo) {
      const baseUrl = process.env.EVOLUTION_API_URL
      const apiKey = process.env.EVOLUTION_API_KEY
      
      if (!baseUrl || !apiKey) {
        return NextResponse.json({ error: 'Servidor Evolution API não configurado no .env' }, { status: 500 })
      }

      const instanceName = `clinic-${session.clinicId.substring(0, 10)}`

      evo = new EvolutionAPI({ baseUrl, apiKey, instanceName })

      try {
        await evo.createInstance()
      } catch (err: any) {
        if (err.response?.status !== 403 && err.response?.data?.message?.includes('already exists') === false) {
           console.error('Error creating instance:', err.response?.data || err.message)
        }
      }

      let webhookUrl: string | null = null;
      try {
        webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
        await evo.setWebhook(webhookUrl)
      } catch (whErr: any) {
        console.error('Warning: Failed to set webhook on creation:', whErr.response?.data || whErr.message)
      }

      await prisma.whatsappInstance.create({
        data: {
          clinicId: session.clinicId,
          instanceName,
          apiKey,
          baseUrl,
          webhookUrl,
        },
      })
    }

    let data;
    try {
      data = await evo.getQRCode()
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('not found')) {
         console.log('Instance not found on Evolution server, recreating...')
         await evo.createInstance()
         try {
           const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
           await evo.setWebhook(webhookUrl)
         } catch (whErr: any) {
           console.error('Warning: Failed to set webhook (usually normal if testing on localhost without ngrok):', whErr.response?.data || whErr.message)
         }
         data = await evo.getQRCode()
      } else {
         throw err
      }
    }

    if (data?.base64) {
      await prisma.whatsappInstance.update({
        where: { clinicId: session.clinicId },
        data: { qrCode: data.base64 },
      })
    }

    return NextResponse.json({ qr: data?.base64, code: data?.code })
  } catch (err: any) {
    console.error('Error fetching QR:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR Code: ' + (err.response?.data?.message || err.message) }, { status: 500 })
  }
}
