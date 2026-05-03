import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('clinic-assets')
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('clinic-assets')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
