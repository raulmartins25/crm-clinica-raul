import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

export interface AgentContext {
  masterPrompt: string
  clinicName: string
  clinicSpecialty?: string
  patientName?: string
  patientHistory?: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  userMessage: string
}

export async function runAgent(ctx: AgentContext): Promise<string> {
  const systemPrompt = buildSystemPrompt(ctx)

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...ctx.conversationHistory,
    { role: 'user', content: ctx.userMessage },
  ]

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    max_tokens: 1024,
  })

  return response.choices[0]?.message?.content || ''
}

function buildSystemPrompt(ctx: AgentContext): string {
  return `${ctx.masterPrompt}

## Contexto da Clínica
- **Nome:** ${ctx.clinicName}
${ctx.clinicSpecialty ? `- **Especialidade:** ${ctx.clinicSpecialty}` : ''}

${
  ctx.patientName
    ? `## Paciente Atual
- **Nome:** ${ctx.patientName}
${ctx.patientHistory ? `- **Histórico:** ${ctx.patientHistory}` : ''}`
    : ''
}

## Instruções Gerais
- Responda SEMPRE em português brasileiro
- Seja empático, profissional e acolhedor
- Nunca forneça diagnósticos médicos
- Para urgências, oriente o paciente a ligar 192 (SAMU) ou 193 (Bombeiros)
- Encaminhe para agendamento quando pertinente
- Respostas concisas e claras para WhatsApp`
}

export async function analyzeDocument(
  documentText: string,
  documentType: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: `Você é um assistente médico especializado em análise de documentos clínicos.
Analise o documento fornecido e apresente um resumo estruturado com:
- Achados principais
- Valores fora do padrão (se exame)
- Pontos de atenção
- Recomendações gerais

Seja claro, técnico e objetivo. Responda em português.`
      },
      {
        role: 'user',
        content: `Tipo de documento: ${documentType}\n\nConteúdo:\n${documentText}`,
      },
    ],
  })

  return response.choices[0]?.message?.content || ''
}

export interface GenerateDocumentParams {
  type: 'prescription' | 'exam_request' | 'report' | 'certificate' | 'referral'
  patientName: string
  patientAge?: number
  doctorName: string
  doctorCRM?: string
  clinicName: string
  details: string
}

export async function generateDocument(params: GenerateDocumentParams): Promise<string> {
  const typeLabels: Record<string, string> = {
    prescription: 'Receituário Médico',
    exam_request: 'Solicitação de Exames',
    report: 'Relatório Médico',
    certificate: 'Atestado Médico',
    referral: 'Encaminhamento',
  }

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: `Você é um assistente médico especializado em redação de documentos clínicos.
Gere documentos médicos profissionais, bem formatados, com linguagem técnica adequada.
Sempre inclua todos os campos obrigatórios para o tipo de documento solicitado.
Responda APENAS com o conteúdo do documento, sem explicações adicionais.`
      },
      {
        role: 'user',
        content: `Gere um ${typeLabels[params.type]} com as seguintes informações:

Paciente: ${params.patientName}${params.patientAge ? `, ${params.patientAge} anos` : ''}
Médico: ${params.doctorName}${params.doctorCRM ? ` - CRM: ${params.doctorCRM}` : ''}
Clínica: ${params.clinicName}
Data: ${new Date().toLocaleDateString('pt-BR')}

Detalhes/Instruções:
${params.details}`,
      },
    ],
  })

  return response.choices[0]?.message?.content || ''
}
