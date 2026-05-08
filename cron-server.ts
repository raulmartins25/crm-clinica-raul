import cron from 'node-cron'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-local'

async function callCronEndpoint(path: string) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })
    const data = await res.json()
    console.log(`[CRON] ${path}:`, data)
  } catch (err) {
    console.error(`[CRON] Error calling ${path}:`, err)
  }
}

console.log('[CRON] Starting cron server...')

// Follow-up: check every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('[CRON] Running follow-up check...')
  callCronEndpoint('/api/cron/follow-up')
})

// Appointment confirmation: check every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log('[CRON] Running appointment confirmation check...')
  callCronEndpoint('/api/cron/appointment-confirmation')
})

// Post-appointment message — every hour
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running post-appointment check...')
  try {
    const res = await fetch(`${BASE_URL}/api/cron/post-appointment?secret=${CRON_SECRET}`)
    const data = await res.json()
    console.log('[CRON] /api/cron/post-appointment:', data)
  } catch (err) {
    console.error('[CRON] Error calling /api/cron/post-appointment:', err)
  }
})

// Return suggestion — every day at 10:00
cron.schedule('0 10 * * *', async () => {
  console.log('[CRON] Running return-suggestion check...')
  try {
    const res = await fetch(`${BASE_URL}/api/cron/return-suggestion?secret=${CRON_SECRET}`)
    const data = await res.json()
    console.log('[CRON] /api/cron/return-suggestion:', data)
  } catch (err) {
    console.error('[CRON] Error calling /api/cron/return-suggestion:', err)
  }
})

console.log('[CRON] Cron server started. Follow-up: every 5min | Confirmations: every 30min | Post-appointment: every hour | Return suggestion: daily at 10h')
