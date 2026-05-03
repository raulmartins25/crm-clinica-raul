import { EvolutionAPI } from '../lib/evolution'
import dotenv from 'dotenv'
dotenv.config()

async function test() {
  const baseUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  
  if (!baseUrl || !apiKey) throw new Error('Missing env vars')

  const evo = new EvolutionAPI({
    baseUrl,
    apiKey,
    instanceName: 'test-instance-' + Date.now()
  })

  console.log('Creating instance...')
  try {
    const createRes = await evo.createInstance()
    console.log('Created:', createRes.data)
  } catch (err: any) {
    console.error('Create error:', err.response?.data || err.message)
  }

  console.log('Getting QR...')
  try {
    const qrRes = await evo.getQRCode()
    console.log('QR Res keys:', Object.keys(qrRes))
    if (qrRes.base64) {
      console.log('Got base64 length:', qrRes.base64.length)
    } else {
      console.log('No base64 field found:', JSON.stringify(qrRes).substring(0, 200))
    }
  } catch (err: any) {
    console.error('QR error:', err.response?.data || err.message)
  }
}

test()
