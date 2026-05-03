import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageTime(date: Date | string): string {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ontem'
  return format(d, 'dd/MM/yyyy')
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  if (digits.length >= 10) return `55${digits}`
  return digits
}

export function phoneToJid(phone: string): string {
  const digits = normalizePhone(phone)
  return `${digits}@s.whatsapp.net`
}

export function jidToPhone(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`
}

export function buildMasterPrompt(data: {
  clinicName: string
  specialty?: string
  doctorNames?: string[]
  services?: string[]
  workingHours?: string
  address?: string
  phone?: string
  customInstructions?: string
  voiceTone?: string
  empathyLevel?: string
}): string {
  const toneMap: Record<string, string> = {
    formal: 'formal e profissional',
    friendly: 'amigável e acolhedor',
    neutral: 'neutro e objetivo',
    empathetic: 'empático e cuidadoso',
  }

  const empathyMap: Record<string, string> = {
    low: 'Mantenha foco nas informações objetivas.',
    medium: 'Demonstre cuidado e atenção com o paciente.',
    high: 'Seja muito empático, acolhedor e demonstre profundo cuidado com o bem-estar do paciente.',
  }

  return `Você é o assistente virtual da ${data.clinicName}${data.specialty ? `, clínica especializada em ${data.specialty}` : ''}.

## Seu Papel
Você atende pacientes via WhatsApp, auxiliando com informações, agendamentos e dúvidas gerais.

## Tom de Comunicação
Utilize um tom ${data.voiceTone ? toneMap[data.voiceTone] || data.voiceTone : 'amigável e profissional'}.
${data.empathyLevel ? empathyMap[data.empathyLevel] || '' : empathyMap['medium']}

${
  data.doctorNames?.length
    ? `## Médicos Disponíveis
${data.doctorNames.map((d) => `- ${d}`).join('\n')}`
    : ''
}

${
  data.services?.length
    ? `## Serviços Oferecidos
${data.services.map((s) => `- ${s}`).join('\n')}`
    : ''
}

${
  data.workingHours
    ? `## Horário de Funcionamento
${data.workingHours}`
    : ''
}

${
  data.address
    ? `## Endereço
${data.address}`
    : ''
}

${
  data.phone
    ? `## Telefone de Contato
${data.phone}`
    : ''
}

${data.customInstructions ? `## Instruções Específicas\n${data.customInstructions}` : ''}`.trim()
}
