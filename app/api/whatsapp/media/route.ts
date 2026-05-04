import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import axios from 'axios'

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('id')
    const convId = searchParams.get('convId')

    if (!messageId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Get instance info from DB
    const instance = await prisma.whatsappInstance.findFirst()
    if (!instance) return NextResponse.json({ error: 'No instance' }, { status: 404 })

    const baseUrl = process.env.EVOLUTION_API_URL || instance.baseUrl
    const apiKey = process.env.EVOLUTION_API_KEY || instance.apiKey
    const instanceName = instance.instanceName

    // Fetch media base64 from Evolution API
    const res = await axios.post(
      `${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        message: { key: { id: messageId } },
        convertToMp4: false,
      },
      {
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
      }
    )

    const { base64, mimetype } = res.data
    if (!base64) return NextResponse.json({ error: 'No media' }, { status: 404 })

    // Decode and stream back
    const buffer = Buffer.from(base64, 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimetype || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('Media proxy error:', err.response?.data || err.message)
    return NextResponse.json({ error: 'Media not available' }, { status: 404 })
  }
}
