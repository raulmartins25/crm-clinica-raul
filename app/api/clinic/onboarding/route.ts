import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()

    const {
      clinicType,
      name,
      cnpj,
      phone,
      email,
      city,
      state,
      responsavel,
      numeroConselho,
      logoUrl,
    } = body

    if (!clinicType) {
      return NextResponse.json({ error: 'Tipo de clínica é obrigatório' }, { status: 400 })
    }

    const clinic = await prisma.clinic.update({
      where: { id: session.clinicId },
      data: {
        clinicType,
        name: name || undefined,
        cnpj: cnpj || undefined,
        phone: phone || undefined,
        email: email || undefined,
        city: city || undefined,
        state: state || undefined,
        responsavelTecnico: responsavel || undefined,
        numeroConselho: numeroConselho || undefined,
        logoUrl: logoUrl || undefined,
        onboardingCompleted: true,
      },
    })

    return NextResponse.json({ clinic })
  } catch (err: any) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: err.message || 'Erro ao salvar' }, { status: 500 })
  }
}
