import axios from 'axios'

export interface EvolutionConfig {
  baseUrl: string
  apiKey: string
  instanceName: string
}

export interface SendTextPayload {
  number: string
  text: string
  delay?: number
}

export interface SendMediaPayload {
  number: string
  mediatype: 'image' | 'video' | 'audio' | 'document'
  media: string
  caption?: string
  fileName?: string
}

export class EvolutionAPI {
  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor(config: EvolutionConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
    this.instanceName = config.instanceName
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey,
    }
  }

  async createInstance() {
    return axios.post(
      `${this.baseUrl}/instance/create`,
      {
        instanceName: this.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      },
      { headers: { 'Content-Type': 'application/json', apikey: this.apiKey } }
    )
  }

  async getQRCode() {
    const res = await axios.get(
      `${this.baseUrl}/instance/connect/${this.instanceName}`,
      { headers: this.headers }
    )
    return res.data
  }

  async getInstanceStatus() {
    const res = await axios.get(
      `${this.baseUrl}/instance/connectionState/${this.instanceName}`,
      { headers: this.headers }
    )
    return res.data
  }

  async sendText(payload: SendTextPayload) {
    const res = await axios.post(
      `${this.baseUrl}/message/sendText/${this.instanceName}`,
      {
        number: payload.number,
        text: payload.text,
        delay: payload.delay || 1000,
      },
      { headers: this.headers }
    )
    return res.data
  }

  async sendMedia(payload: SendMediaPayload) {
    const res = await axios.post(
      `${this.baseUrl}/message/sendMedia/${this.instanceName}`,
      { ...payload, base64: true },
      { headers: this.headers }
    )
    return res.data
  }

  async sendAudio(number: string, audioBase64: string) {
    const res = await axios.post(
      `${this.baseUrl}/message/sendWhatsAppAudio/${this.instanceName}`,
      { number, audio: audioBase64, encoding: true },
      { headers: this.headers }
    )
    return res.data
  }

  async getChats() {
    const res = await axios.post(
      `${this.baseUrl}/chat/findChats/${this.instanceName}`,
      {},
      { headers: this.headers }
    )
    return res.data
  }

  async fetchProfile(number: string): Promise<{ name: string; picture: string } | null> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/chat/fetchProfile/${this.instanceName}`,
        { number },
        { headers: this.headers, timeout: 6000 }
      )
      const { name, picture } = res.data
      return { name: name || '', picture: picture || '' }
    } catch {
      return null
    }
  }

  async getWebhook() {
    const res = await axios.get(
      `${this.baseUrl}/webhook/find/${this.instanceName}`,
      { headers: this.headers }
    )
    return res.data
  }

  async getMessages(remoteJid: string, limit = 50) {
    const res = await axios.post(
      `${this.baseUrl}/chat/findMessages/${this.instanceName}`,
      { where: { key: { remoteJid } }, limit },
      { headers: this.headers }
    )
    return res.data
  }

  async setWebhook(webhookUrl: string) {
    const res = await axios.post(
      `${this.baseUrl}/webhook/set/${this.instanceName}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'MESSAGES_REACTION',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
          ],
        },
      },
      { headers: this.headers }
    )
    return res.data
  }

  async sendReaction(remoteJid: string, messageId: string, emoji: string) {
    const res = await axios.post(
      `${this.baseUrl}/message/sendReaction/${this.instanceName}`,
      {
        key: { remoteJid, fromMe: true, id: messageId },
        reaction: emoji,
      },
      { headers: this.headers }
    )
    return res.data
  }

  async deleteInstance() {
    return axios.delete(
      `${this.baseUrl}/instance/delete/${this.instanceName}`,
      { headers: this.headers }
    )
  }

  async markAsRead(remoteJid: string) {
    return axios.post(
      `${this.baseUrl}/chat/markMessageAsRead/${this.instanceName}`,
      { readMessages: [{ remoteJid, fromMe: false, id: 'all' }] },
      { headers: this.headers }
    )
  }
}

export async function getEvolutionClient(clinicId: string): Promise<EvolutionAPI | null> {
  const { prisma } = await import('./db')
  const instance = await prisma.whatsappInstance.findUnique({ where: { clinicId } })
  if (!instance) return null
  
  const baseUrl = process.env.EVOLUTION_API_URL || instance.baseUrl
  const apiKey = process.env.EVOLUTION_API_KEY || instance.apiKey

  return new EvolutionAPI({
    baseUrl,
    apiKey,
    instanceName: instance.instanceName,
  })
}
