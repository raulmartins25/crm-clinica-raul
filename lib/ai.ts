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

export function getSystemPrompt(clinicType?: string | null): string {
  switch (clinicType) {
    case 'ODONTOLOGIA':
      return 'Você é um assistente odontológico especializado em documentos clínicos. Use terminologia odontológica precisa (elementos dentais, nomenclatura FDI). Responda APENAS com o conteúdo do documento.'
    case 'GINECOLOGIA':
      return 'Você é um assistente especializado em ginecologia e obstetrícia. Use terminologia obstétrica adequada (DUM, DPP, semanas gestacionais, G/P/A). Responda APENAS com o conteúdo do documento.'
    case 'PEDIATRIA':
      return 'Você é um assistente especializado em pediatria. Sempre calcule doses por peso quando relevante, use linguagem acessível para os responsáveis quando necessário. Responda APENAS com o conteúdo do documento.'
    case 'DERMATOLOGIA':
      return 'Você é um assistente especializado em dermatologia e estética. Use terminologia dermatológica precisa para lesões e protocolos estéticos. Inclua orientações pós-procedimento quando relevante. Responda APENAS com o conteúdo do documento.'
    case 'PSICOLOGIA':
      return 'Você é um assistente especializado em psicologia clínica. Use linguagem técnica psicológica baseada no DSM-5/CID-11. Mantenha sigilo e ética profissional na redação. Responda APENAS com o conteúdo do documento.'
    case 'FISIOTERAPIA':
      return 'Você é um assistente especializado em fisioterapia e reabilitação. Use terminologia fisioterapêutica precisa, inclua graduação de exercícios e progressão de carga quando relevante. Responda APENAS com o conteúdo do documento.'
    case 'ENDOCRINOLOGIA':
      return 'Você é um assistente especializado em endocrinologia e metabolismo. Inclua referências a valores de referência laboratoriais e metas terapêuticas quando relevante. Responda APENAS com o conteúdo do documento.'
    case 'NUTRICAO':
      return 'Você é um assistente especializado em nutrição clínica. Use linguagem nutricional precisa, inclua equivalências e substituições quando relevante. Responda APENAS com o conteúdo do documento.'
    default:
      return 'Você é um assistente médico especializado em redação de documentos clínicos gerais. Gere documentos com linguagem técnica médica, incluindo todos os campos obrigatórios. Responda APENAS com o conteúdo do documento.'
  }
}

export interface GenerateDocumentParams {
  type: string
  documentTitle?: string
  patientName: string
  patientAge?: number
  doctorName: string
  doctorCRM?: string
  clinicName: string
  clinicType?: string | null
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

  const docLabel = params.documentTitle || typeLabels[params.type] || 'Documento'

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: getSystemPrompt(params.clinicType),
      },
      {
        role: 'user',
        content: `Gere um ${docLabel} com as seguintes informações:

Paciente: ${params.patientName}${params.patientAge ? `, ${params.patientAge} anos` : ''}
Médico: ${params.doctorName}${params.doctorCRM ? ` - CRM: ${params.doctorCRM}` : ''}
Clínica: ${params.clinicName}
Tipo de clínica: ${params.clinicType || 'Clínica Médica'}
Data: ${new Date().toLocaleDateString('pt-BR')}

Detalhes/Instruções:
${params.details}`,
      },
    ],
  })

  return response.choices[0]?.message?.content || ''
}
