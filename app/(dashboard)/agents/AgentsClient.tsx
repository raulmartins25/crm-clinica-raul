'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { buildMasterPrompt } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Bot, Plus, Save, Trash2, Loader2, Send, RefreshCw, BookOpen,
  ChevronDown, ChevronUp, Power, X, Sparkles, MessageSquare,
  Clock, AlertCircle, Settings,
} from 'lucide-react'

interface Agent {
  id: string; name: string; description: string | null; status: string
  masterPrompt: string; temperature: number; maxTokens: number
  voiceTone: string | null; empathyLevel: string | null
  workingHoursStart: string | null; workingHoursEnd: string | null
  awayMessage: string | null; transferKeywords: string[]
  followUpEnabled: boolean; followUpMinutes: number; followUpMessage: string | null
  appointmentConfirmEnabled: boolean; appointmentConfirmHours: number; appointmentConfirmMessage: string | null
  _count: { knowledgeItems: number; conversations: number }
}

interface KnowledgeItem {
  id: string; title: string; content: string; category: string | null; active: boolean
}

interface Clinic { name: string; specialty: string | null; phone: string | null; address: string | null }

const defaultWizard = {
  clinicName: '', specialty: '', services: '', workingHours: '',
  voiceTone: 'friendly', empathyLevel: 'medium', customInstructions: '',
}

export function AgentsClient({ clinic, doctorNames }: { clinic: Clinic; doctorNames: string[] }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [activeSection, setActiveSection] = useState<'prompt' | 'knowledge' | 'settings' | 'test'>('prompt')

  // Wizard state for master prompt builder
  const [wizard, setWizard] = useState({ ...defaultWizard, clinicName: clinic.name, specialty: clinic.specialty || '' })
  const [wizardOpen, setWizardOpen] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '', description: '', masterPrompt: '', temperature: 0.7,
    maxTokens: 1024, voiceTone: 'friendly', empathyLevel: 'medium',
    workingHoursStart: '08:00', workingHoursEnd: '18:00',
    awayMessage: 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve.',
    transferKeywords: [] as string[],
    status: 'ACTIVE',
    followUpEnabled: false, followUpMinutes: 30, followUpMessage: '',
    appointmentConfirmEnabled: false, appointmentConfirmHours: 24, appointmentConfirmMessage: '',
  })

  // Knowledge form
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', category: '' })
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false)

  // Test chat
  const [testMessages, setTestMessages] = useState<Array<{ role: string; content: string }>>([])
  const [testInput, setTestInput] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const testEndRef = useRef<HTMLDivElement>(null)

  // Keyword input
  const [keywordInput, setKeywordInput] = useState('')

  useEffect(() => { fetchAgents() }, [])
  useEffect(() => { testEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [testMessages])

  const fetchAgents = async () => {
    setLoading(true)
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data.agents)
    setLoading(false)
  }

  const selectAgent = async (agent: Agent) => {
    setSelectedAgent(agent)
    setForm({
      name: agent.name,
      description: agent.description || '',
      masterPrompt: agent.masterPrompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      voiceTone: agent.voiceTone || 'friendly',
      empathyLevel: agent.empathyLevel || 'medium',
      workingHoursStart: agent.workingHoursStart || '08:00',
      workingHoursEnd: agent.workingHoursEnd || '18:00',
      awayMessage: agent.awayMessage || '',
      transferKeywords: agent.transferKeywords || [],
      status: agent.status,
      followUpEnabled: agent.followUpEnabled ?? false,
      followUpMinutes: agent.followUpMinutes ?? 30,
      followUpMessage: agent.followUpMessage || '',
      appointmentConfirmEnabled: agent.appointmentConfirmEnabled ?? false,
      appointmentConfirmHours: agent.appointmentConfirmHours ?? 24,
      appointmentConfirmMessage: agent.appointmentConfirmMessage || '',
    })
    setTestMessages([])
    // Fetch knowledge
    const res = await fetch(`/api/agents/${agent.id}`)
    const data = await res.json()
    setKnowledge(data.agent.knowledgeItems || [])
  }

  const generatePrompt = () => {
    const generated = buildMasterPrompt({
      clinicName: wizard.clinicName,
      specialty: wizard.specialty,
      doctorNames,
      services: wizard.services.split('\n').filter(Boolean),
      workingHours: wizard.workingHours,
      address: clinic.address || undefined,
      phone: clinic.phone || undefined,
      customInstructions: wizard.customInstructions,
      voiceTone: wizard.voiceTone,
      empathyLevel: wizard.empathyLevel,
    })
    setForm(p => ({ ...p, masterPrompt: generated }))
    setWizardOpen(false)
    toast.success('Prompt gerado com sucesso!')
  }

  const saveAgent = async () => {
    if (!form.name) return toast.error('Nome é obrigatório')
    if (!form.masterPrompt) return toast.error('Prompt mestre é obrigatório')
    setSaving(true)
    try {
      if (selectedAgent) {
        await fetch(`/api/agents/${selectedAgent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Agente atualizado!')
      } else {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        toast.success('Agente criado!')
        await selectAgent({ ...data.agent, _count: { knowledgeItems: 0, conversations: 0 } })
        setShowNewAgent(false)
      }
      await fetchAgents()
    } catch {
      toast.error('Erro ao salvar agente')
    } finally {
      setSaving(false)
    }
  }

  const deleteAgent = async (id: string) => {
    if (!confirm('Excluir este agente?')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    toast.success('Agente excluído')
    setSelectedAgent(null)
    fetchAgents()
  }

  const addKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return toast.error('Título e conteúdo são obrigatórios')
    if (!selectedAgent) return
    const res = await fetch(`/api/agents/${selectedAgent.id}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newKnowledge),
    })
    const data = await res.json()
    setKnowledge(p => [...p, data.item])
    setNewKnowledge({ title: '', content: '', category: '' })
    setShowKnowledgeForm(false)
    toast.success('Conhecimento adicionado!')
  }

  const removeKnowledge = async (itemId: string) => {
    if (!selectedAgent) return
    await fetch(`/api/agents/${selectedAgent.id}/knowledge?itemId=${itemId}`, { method: 'DELETE' })
    setKnowledge(p => p.filter(k => k.id !== itemId))
    toast.success('Item removido')
  }

  const sendTestMessage = async () => {
    if (!testInput.trim() || !selectedAgent) return
    const userMsg = { role: 'user', content: testInput }
    setTestMessages(p => [...p, userMsg])
    setTestInput('')
    setTestLoading(true)
    try {
      const history = testMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const res = await fetch(`/api/agents/${selectedAgent.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testInput, history }),
      })
      const data = await res.json()
      setTestMessages(p => [...p, { role: 'assistant', content: data.response }])
    } catch {
      toast.error('Erro no teste')
    } finally {
      setTestLoading(false)
    }
  }

  const addKeyword = () => {
    if (!keywordInput.trim()) return
    setForm(p => ({ ...p, transferKeywords: [...p.transferKeywords, keywordInput.trim()] }))
    setKeywordInput('')
  }

  const toneOptions = [
    { value: 'formal', label: 'Formal', desc: 'Profissional e técnico' },
    { value: 'friendly', label: 'Amigável', desc: 'Acolhedor e próximo' },
    { value: 'neutral', label: 'Neutro', desc: 'Objetivo e direto' },
    { value: 'empathetic', label: 'Empático', desc: 'Muito cuidadoso' },
  ]
  const empathyOptions = [
    { value: 'low', label: 'Objetivo', desc: 'Foco em informações' },
    { value: 'medium', label: 'Equilibrado', desc: 'Cuidado moderado' },
    { value: 'high', label: 'Muito empático', desc: 'Máximo acolhimento' },
  ]

  return (
    <div className="flex h-full">
      {/* Agent List */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Agentes IA</h2>
            <button
              onClick={() => { setSelectedAgent(null); setShowNewAgent(true); setForm({ ...form, name: '', description: '', masterPrompt: '' }) }}
              className="p-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
          ) : agents.length === 0 && !showNewAgent ? (
            <div className="text-center py-10 text-gray-400">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum agente criado</p>
              <button onClick={() => setShowNewAgent(true)} className="mt-2 text-sky-500 text-sm hover:underline">
                Criar primeiro agente
              </button>
            </div>
          ) : (
            agents.map(ag => (
              <button
                key={ag.id}
                onClick={() => selectAgent(ag)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition group',
                  selectedAgent?.id === ag.id ? 'bg-sky-50 border border-sky-200' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot className={cn('w-4 h-4', ag.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-400')} />
                  <p className="text-sm font-medium text-gray-900 truncate flex-1">{ag.name}</p>
                  <button
                    onClick={e => { e.stopPropagation(); deleteAgent(ag.id) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{ag._count.conversations} conversas</span>
                  <span>{ag._count.knowledgeItems} itens</span>
                </div>
                <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  ag.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                )}>
                  {ag.status === 'ACTIVE' ? 'Ativo' : ag.status === 'PAUSED' ? 'Pausado' : 'Inativo'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Agent Editor */}
      {(selectedAgent || showNewAgent) ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome do agente"
                className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none w-full focus:ring-0 p-0"
              />
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrição opcional..."
                className="text-sm text-gray-500 bg-transparent border-none outline-none w-full mt-0.5"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setForm(p => ({ ...p, status: p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }))}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition',
                  form.status === 'ACTIVE' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                <Power className="w-3.5 h-3.5" />
                {form.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
              </button>
              <button
                onClick={saveAgent}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-100 px-6">
            <div className="flex gap-0">
              {[
                { id: 'prompt', label: 'Prompt & Personalidade', icon: Sparkles },
                { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen },
                { id: 'settings', label: 'Configurações', icon: Settings },
                ...(selectedAgent ? [{ id: 'test', label: 'Testar Agente', icon: MessageSquare }] : []),
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id as typeof activeSection)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition',
                    activeSection === id
                      ? 'border-sky-500 text-sky-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* PROMPT TAB */}
            {activeSection === 'prompt' && (
              <div className="max-w-4xl space-y-6">
                {/* Tone and Empathy */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Personalidade do Agente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-3 block">Tom de Voz</label>
                      <div className="space-y-2">
                        {toneOptions.map(opt => (
                          <label key={opt.value} className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                            form.voiceTone === opt.value ? 'border-sky-300 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                          )}>
                            <input
                              type="radio"
                              value={opt.value}
                              checked={form.voiceTone === opt.value}
                              onChange={e => setForm(p => ({ ...p, voiceTone: e.target.value }))}
                              className="accent-sky-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                              <p className="text-xs text-gray-500">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-3 block">Nível de Empatia</label>
                      <div className="space-y-2">
                        {empathyOptions.map(opt => (
                          <label key={opt.value} className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                            form.empathyLevel === opt.value ? 'border-sky-300 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                          )}>
                            <input
                              type="radio"
                              value={opt.value}
                              checked={form.empathyLevel === opt.value}
                              onChange={e => setForm(p => ({ ...p, empathyLevel: e.target.value }))}
                              className="accent-sky-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                              <p className="text-xs text-gray-500">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master Prompt */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Prompt Mestre</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Instrução base que define como o agente se comporta</p>
                    </div>
                    <button
                      onClick={() => setWizardOpen(!wizardOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      Gerador Automático
                      {wizardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Wizard */}
                  {wizardOpen && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 space-y-3">
                      <p className="text-sm font-medium text-purple-800">
                        Preencha as informações da clínica e geramos o prompt automaticamente:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Nome da Clínica</label>
                          <input
                            value={wizard.clinicName}
                            onChange={e => setWizard(p => ({ ...p, clinicName: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Especialidade</label>
                          <input
                            value={wizard.specialty}
                            onChange={e => setWizard(p => ({ ...p, specialty: e.target.value }))}
                            placeholder="ex: Cardiologia"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Serviços (um por linha)</label>
                          <textarea
                            value={wizard.services}
                            onChange={e => setWizard(p => ({ ...p, services: e.target.value }))}
                            rows={3}
                            placeholder="Consulta&#10;Retorno&#10;Exames"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Horário de Funcionamento</label>
                          <textarea
                            value={wizard.workingHours}
                            onChange={e => setWizard(p => ({ ...p, workingHours: e.target.value }))}
                            rows={3}
                            placeholder="Seg a Sex: 8h-18h&#10;Sáb: 8h-12h"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Instruções Especiais (opcional)</label>
                          <textarea
                            value={wizard.customInstructions}
                            onChange={e => setWizard(p => ({ ...p, customInstructions: e.target.value }))}
                            rows={2}
                            placeholder="ex: Sempre perguntar o plano de saúde, solicitar chegada 15min antes..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                          />
                        </div>
                      </div>
                      <button
                        onClick={generatePrompt}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        Gerar Prompt Automaticamente
                      </button>
                    </div>
                  )}

                  <textarea
                    value={form.masterPrompt}
                    onChange={e => setForm(p => ({ ...p, masterPrompt: e.target.value }))}
                    rows={16}
                    placeholder="Descreva como o agente deve se comportar, o que ele pode e não pode fazer, como deve responder..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    {form.masterPrompt.length} caracteres · O agente usará este prompt como base para todas as conversas
                  </p>
                </div>

                {/* Temperature */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Parâmetros do Modelo</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                        <span>Criatividade (Temperature)</span>
                        <span className="text-sky-500 font-bold">{form.temperature}</span>
                      </label>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={form.temperature}
                        onChange={e => setForm(p => ({ ...p, temperature: Number(e.target.value) }))}
                        className="w-full accent-sky-500"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Preciso</span>
                        <span>Criativo</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                        <span>Máx. Tokens por Resposta</span>
                        <span className="text-sky-500 font-bold">{form.maxTokens}</span>
                      </label>
                      <input
                        type="range" min="256" max="4096" step="256"
                        value={form.maxTokens}
                        onChange={e => setForm(p => ({ ...p, maxTokens: Number(e.target.value) }))}
                        className="w-full accent-sky-500"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>256</span>
                        <span>4096</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KNOWLEDGE TAB */}
            {activeSection === 'knowledge' && (
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Base de Conhecimento</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Informações que o agente utilizará para responder perguntas</p>
                  </div>
                  <button
                    onClick={() => setShowKnowledgeForm(!showKnowledgeForm)}
                    className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {showKnowledgeForm && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Título</label>
                        <input
                          value={newKnowledge.title}
                          onChange={e => setNewKnowledge(p => ({ ...p, title: e.target.value }))}
                          placeholder="ex: Preços, Planos aceitos, Horários..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Categoria (opcional)</label>
                        <input
                          value={newKnowledge.category}
                          onChange={e => setNewKnowledge(p => ({ ...p, category: e.target.value }))}
                          placeholder="ex: Financeiro, Serviços..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Conteúdo</label>
                      <textarea
                        value={newKnowledge.content}
                        onChange={e => setNewKnowledge(p => ({ ...p, content: e.target.value }))}
                        rows={5}
                        placeholder="Escreva as informações que o agente deve saber sobre este tópico..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowKnowledgeForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                      <button onClick={addKnowledge} className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition">
                        <Save className="w-4 h-4" />Salvar
                      </button>
                    </div>
                  </div>
                )}

                {knowledge.length === 0 && !showKnowledgeForm ? (
                  <div className="bg-white rounded-xl border border-gray-100 py-12 text-center text-gray-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhum item na base de conhecimento</p>
                  </div>
                ) : (
                  knowledge.map(item => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          {item.category && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeKnowledge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />Horário de Atendimento
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Início</label>
                      <input type="time" value={form.workingHoursStart}
                        onChange={e => setForm(p => ({ ...p, workingHoursStart: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fim</label>
                      <input type="time" value={form.workingHoursEnd}
                        onChange={e => setForm(p => ({ ...p, workingHoursEnd: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mensagem Fora do Horário</label>
                    <textarea value={form.awayMessage}
                      onChange={e => setForm(p => ({ ...p, awayMessage: e.target.value }))}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                  </div>
                </div>

                {/* Follow-up */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />Follow-up Automático
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Envia mensagem quando paciente fica sem responder</p>
                    </div>
                    <div onClick={() => setForm(p => ({ ...p, followUpEnabled: !p.followUpEnabled }))}
                      className={cn('relative w-10 h-6 rounded-full cursor-pointer transition', form.followUpEnabled ? 'bg-amber-500' : 'bg-gray-300')}>
                      <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', form.followUpEnabled ? 'translate-x-5' : 'translate-x-1')} />
                    </div>
                  </div>
                  {form.followUpEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Minutos sem resposta para disparar</label>
                        <input type="number" min={5} max={1440} value={form.followUpMinutes}
                          onChange={e => setForm(p => ({ ...p, followUpMinutes: Number(e.target.value) }))}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mensagem de Follow-up</label>
                        <textarea value={form.followUpMessage}
                          onChange={e => setForm(p => ({ ...p, followUpMessage: e.target.value }))}
                          rows={3} placeholder="ex: Olá! Passou algum tempo desde nossa última conversa..."
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Appointment Confirmation */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-500" />Confirmação de Agendamento
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Envia mensagem via WhatsApp para confirmar consultas</p>
                    </div>
                    <div onClick={() => setForm(p => ({ ...p, appointmentConfirmEnabled: !p.appointmentConfirmEnabled }))}
                      className={cn('relative w-10 h-6 rounded-full cursor-pointer transition', form.appointmentConfirmEnabled ? 'bg-green-500' : 'bg-gray-300')}>
                      <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', form.appointmentConfirmEnabled ? 'translate-x-5' : 'translate-x-1')} />
                    </div>
                  </div>
                  {form.appointmentConfirmEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Enviar confirmação X horas antes</label>
                        <input type="number" min={1} max={72} value={form.appointmentConfirmHours}
                          onChange={e => setForm(p => ({ ...p, appointmentConfirmHours: Number(e.target.value) }))}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mensagem personalizada (opcional)</label>
                        <textarea value={form.appointmentConfirmMessage}
                          onChange={e => setForm(p => ({ ...p, appointmentConfirmMessage: e.target.value }))}
                          rows={4} placeholder="Deixe em branco para usar a mensagem padrão com os dados do agendamento"
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                        <p className="font-medium mb-1">Como funciona:</p>
                        <p>Quando o paciente responder <strong>SIM</strong> ou <strong>CONFIRMO</strong>, o agendamento será automaticamente atualizado para <strong>Confirmado</strong> no calendário.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-500" />Palavras para Transferência Humana
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">Quando o paciente usar estas palavras, o agente pausa e notifica um atendente humano</p>
                  <div className="flex gap-2 mb-3">
                    <input value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addKeyword()}
                      placeholder="ex: urgente, emergência, humano..."
                      className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    <button onClick={addKeyword} className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.transferKeywords.map((kw, i) => (
                      <span key={i} className="flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                        {kw}
                        <button onClick={() => setForm(p => ({ ...p, transferKeywords: p.transferKeywords.filter((_, j) => j !== i) }))} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TEST TAB */}
            {activeSection === 'test' && selectedAgent && (
              <div className="max-w-2xl flex flex-col h-full">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Modo de teste — simula como o agente responde. Não envia mensagens reais pelo WhatsApp.
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '500px' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-green-500" />
                      <p className="text-sm font-medium">{selectedAgent.name}</p>
                    </div>
                    <button
                      onClick={() => setTestMessages([])}
                      className="p-1 text-gray-400 hover:text-gray-600 transition"
                      title="Limpar conversa"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {testMessages.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-30" />
                        Envie uma mensagem para testar o agente
                      </div>
                    )}
                    {testMessages.map((msg, i) => (
                      <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[80%] px-4 py-2 rounded-2xl text-sm',
                          msg.role === 'user'
                            ? 'bg-sky-500 text-white rounded-br-sm'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                        )}>
                          {msg.role === 'assistant' && (
                            <p className="text-xs text-green-500 mb-1 flex items-center gap-1">
                              <Bot className="w-3 h-3" /> {selectedAgent.name}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {testLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={testEndRef} />
                  </div>
                  <div className="border-t border-gray-100 p-3 flex gap-2">
                    <input
                      value={testInput}
                      onChange={e => setTestInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendTestMessage()}
                      placeholder="Digite uma mensagem de teste..."
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={sendTestMessage}
                      disabled={testLoading || !testInput.trim()}
                      className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 disabled:opacity-40 transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <Bot className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <h3 className="text-gray-500 font-medium">Selecione ou crie um agente</h3>
            <p className="text-gray-400 text-sm mt-1">Configure agentes de IA para atender pacientes automaticamente</p>
          </div>
        </div>
      )}
    </div>
  )
}
