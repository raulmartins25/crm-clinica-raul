import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { analyzeDocument } from '@/lib/ai'

export async function POST(req: NextRequest) {
  await requireSession()
  const { text, type } = await req.json()

  if (!text) return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 })

  const analysis = await analyzeDocument(text, type || 'documento médico')
  return NextResponse.json({ analysis })
}
