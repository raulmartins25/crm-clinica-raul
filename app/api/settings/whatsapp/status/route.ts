import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EvolutionAPI } from '@/lib/evolution'

export async function GET(req: NextRequest) {
  const session = await requireSession()

  const instance = await prisma.whatsappInstance.findUnique({
    where: { clinicId: session.clinicId },
  })
  if (!instance) return NextResponse.json({ error: 'Não configurado' }, { status: 404 })

  const evo = new EvolutionAPI({
    baseUrl: instance.baseUrl,
    apiKey: instance.apiKey,
    instanceName: instance.instanceName,
  })

  const status = await evo.getInstanceStatus()
  return NextResponse.json({ status })
}
