'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FileText, Plus, Search, Loader2, Sparkles, MessageSquare,
  Mail, CheckCircle, X, Stethoscope, FileCheck, FileMinus,
  ChevronLeft, Edit3, Download, PenLine, Clock, Copy, Link,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Document {
  id: string; title: string; type: string; content: string; createdAt: string
  sentWhatsapp: boolean; sentEmail: boolean
  signatureToken: string | null; signatureStatus: string | null
  signedAt: string | null; signerName: string | null
  signerCpf: string | null; ipAddress: string | null
  signatureImageUrl: string | null
  patient: { id: string; name: string }
  createdBy: { id: string; name: string }
}
interface Patient { id: string; name: string }

interface DocTypeConfig {
  value: string
  label: string
  icon: typeof FileText
}

function getDocumentTypes(clinicType?: string | null): DocTypeConfig[] {
  switch (clinicType) {
    case 'ODONTOLOGIA':
      return [
        { value: 'PRESCRIPTION', label: 'Receituário Odontológico', icon: FileText },
        { value: 'CERTIFICATE', label: 'Atestado de Saúde Bucal', icon: FileMinus },
        { value: 'REPORT', label: 'Orçamento', icon: FileText },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Orientações Pós-Procedimento', icon: FileText },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'GINECOLOGIA':
      return [
        { value: 'PRESCRIPTION', label: 'Receituário', icon: FileText },
        { value: 'EXAM_REQUEST', label: 'Pedido de Exames', icon: FileCheck },
        { value: 'CERTIFICATE', label: 'Atestado', icon: FileMinus },
        { value: 'REPORT', label: 'Cartão da Gestante', icon: FileText },
        { value: 'EXAM_REQUEST', label: 'Solicitação de Pré-natal', icon: FileCheck },
        { value: 'OTHER', label: 'Declaração de Comparecimento', icon: FileText },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'PEDIATRIA':
      return [
        { value: 'PRESCRIPTION', label: 'Receituário Pediátrico', icon: FileText },
        { value: 'EXAM_REQUEST', label: 'Pedido de Exames', icon: FileCheck },
        { value: 'CERTIFICATE', label: 'Atestado', icon: FileMinus },
        { value: 'OTHER', label: 'Declaração Escolar', icon: FileText },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'DERMATOLOGIA':
      return [
        { value: 'PRESCRIPTION', label: 'Receituário Dermatológico', icon: FileText },
        { value: 'REPORT', label: 'Protocolo Estético', icon: FileText },
        { value: 'OTHER', label: 'Termo de Consentimento', icon: FileText },
        { value: 'REPORT', label: 'Orientações Pós-Procedimento', icon: FileText },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'PSICOLOGIA':
      return [
        { value: 'REPORT', label: 'Relatório Psicológico', icon: FileText },
        { value: 'REPORT', label: 'Laudo', icon: FileText },
        { value: 'CERTIFICATE', label: 'Declaração de Acompanhamento', icon: FileMinus },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'FISIOTERAPIA':
      return [
        { value: 'REPORT', label: 'Plano de Reabilitação', icon: FileText },
        { value: 'REPORT', label: 'Relatório de Evolução', icon: FileText },
        { value: 'CERTIFICATE', label: 'Atestado', icon: FileMinus },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'ENDOCRINOLOGIA':
      return [
        { value: 'PRESCRIPTION', label: 'Receituário', icon: FileText },
        { value: 'EXAM_REQUEST', label: 'Pedido de Exames', icon: FileCheck },
        { value: 'REPORT', label: 'Relatório Metabólico', icon: FileText },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    case 'NUTRICAO':
      return [
        { value: 'REPORT', label: 'Plano Alimentar', icon: FileText },
        { value: 'OTHER', label: 'Lista de Substituições', icon: FileText },
        { value: 'OTHER', label: 'Orientações Nutricionais', icon: FileText },
        { value: 'REPORT', label: 'Relatório de Evolução', icon: FileText },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
    default:
      return [
        { value: 'PRESCRIPTION', label: 'Receituário', icon: FileText },
        { value: 'EXAM_REQUEST', label: 'Pedido de Exames', icon: FileCheck },
        { value: 'REPORT', label: 'Relatório Médico', icon: FileText },
        { value: 'CERTIFICATE', label: 'Atestado', icon: FileMinus },
        { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
        { value: 'OTHER', label: 'Outro', icon: FileText },
      ]
  }
}

const BASE_ICON_MAP: DocTypeConfig[] = [
  { value: 'PRESCRIPTION', label: 'Receituário', icon: FileText },
  { value: 'EXAM_REQUEST', label: 'Pedido de Exames', icon: FileCheck },
  { value: 'REPORT', label: 'Relatório', icon: FileText },
  { value: 'CERTIFICATE', label: 'Atestado', icon: FileMinus },
  { value: 'REFERRAL', label: 'Encaminhamento', icon: Stethoscope },
  { value: 'OTHER', label: 'Outro', icon: FileText },
]

function maskCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

type Step = 'form' | 'preview' | 'done'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [clinicType, setClinicType] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<'whatsapp' | 'email' | null>(null)
  const [requestingSignature, setRequestingSignature] = useState(false)
  const [form, setForm] = useState({
    patientId: '', type: 'PRESCRIPTION', title: 'Receituário',
    content: '', details: '', useAI: true,
  })
  const [previewContent, setPreviewContent] = useState('')

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/documents')
    const data = await res.json()
    setDocuments(data.documents || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDocuments()
    fetch('/api/patients?limit=200').then(r => r.json()).then(d => setPatients(d.patients || []))
    fetch('/api/settings/clinic').then(r => r.json()).then(d => {
      const ct = d.clinic?.clinicType ?? null
      setClinicType(ct)
      setClinicName(d.clinic?.name ?? '')
      const types = getDocumentTypes(ct)
      if (types.length > 0) {
        setForm(p => ({ ...p, type: types[0].value, title: types[0].label }))
      }
    })
  }, [fetchDocuments])

  const docTypes = getDocumentTypes(clinicType)

  const generatePreview = async () => {
    if (!form.patientId) return toast.error('Selecione um paciente')
    if (!form.details) return toast.error('Informe as instruções para a IA')
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinicType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreviewContent(data.content)
      setStep('preview')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar documento')
    } finally { setGenerating(false) }
  }

  const saveDocument = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, content: previewContent, useAI: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Documento salvo!')
      setSelectedDoc(data.document)
      setStep('done')
      setShowNewForm(false)
      fetchDocuments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const sendDocument = async (docId: string, via: 'whatsapp' | 'email') => {
    setSending(via)
    try {
      const res = await fetch(`/api/documents/${docId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ via }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success(`Enviado via ${via === 'whatsapp' ? 'WhatsApp' : 'e-mail'}!`)
      fetchDocuments()
      setSelectedDoc(prev => prev ? { ...prev, [via === 'whatsapp' ? 'sentWhatsapp' : 'sentEmail']: true } : null)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao enviar') }
    finally { setSending(null) }
  }

  const downloadPDF = async (doc: Document) => {
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF()
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(doc.title, 20, 20)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100)
      pdf.text(`Paciente: ${doc.patient.name}  |  Data: ${formatDate(doc.createdAt)}  |  Dr(a): ${doc.createdBy.name}`, 20, 30)
      pdf.setDrawColor(200)
      pdf.line(20, 34, 190, 34)
      pdf.setTextColor(0)
      pdf.setFontSize(11)
      const lines = pdf.splitTextToSize(doc.content, 170)
      pdf.text(lines, 20, 44)
      pdf.save(`${doc.title.replace(/\s+/g, '_')}.pdf`)
    } catch { toast.error('Erro ao gerar PDF') }
  }

  const downloadSignedPDF = async (doc: Document) => {
    if (!doc.signatureImageUrl || !doc.signerName || !doc.signerCpf || !doc.signedAt) return
    try {
      const { generateSignedDocumentPdf } = await import('@/lib/pdfGenerator')
      await generateSignedDocumentPdf({
        title: doc.title,
        clinicName,
        patientName: doc.patient.name,
        content: doc.content,
        signerName: doc.signerName,
        signerCpf: doc.signerCpf,
        signedAt: doc.signedAt,
        ipAddress: doc.ipAddress || 'desconhecido',
        signatureImageUrl: doc.signatureImageUrl,
      })
    } catch { toast.error('Erro ao gerar PDF assinado') }
  }

  const requestSignature = async (docId: string) => {
    setRequestingSignature(true)
    try {
      const res = await fetch(`/api/documents/${docId}/request-signature`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Link de assinatura gerado!')
      await fetchDocuments()
      setSelectedDoc(prev => prev ? {
        ...prev,
        signatureToken: data.token,
        signatureStatus: 'PENDING',
      } : null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao solicitar assinatura')
    } finally { setRequestingSignature(false) }
  }

  const resetForm = () => {
    const types = getDocumentTypes(clinicType)
    const first = types[0] ?? { value: 'PRESCRIPTION', label: 'Receituário' }
    setForm({ patientId: '', type: first.value, title: first.label, content: '', details: '', useAI: true })
    setPreviewContent('')
    setStep('form')
  }

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.patient.name.toLowerCase().includes(search.toLowerCase())
  )

  const typeInfo = (type: string) => BASE_ICON_MAP.find(t => t.value === type) ?? BASE_ICON_MAP[5]
  const isSelected = (dt: DocTypeConfig) => form.type === dt.value && form.title === dt.label

  const signLink = (doc: Document) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
    return doc.signatureToken ? `${origin}/sign/${doc.signatureToken}` : null
  }

  const sigBadge = (doc: Document) => {
    if (doc.signatureStatus === 'SIGNED') {
      return <span className="text-xs text-violet-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />Assinado</span>
    }
    if (doc.signatureToken && doc.signatureStatus === 'PENDING') {
      return <span className="text-xs text-amber-500 flex items-center gap-0.5"><Clock className="w-3 h-3" />Aguardando</span>
    }
    return null
  }

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Documentos</h2>
            <button onClick={() => { resetForm(); setShowNewForm(true); setSelectedDoc(null) }}
              className="p-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
            : filteredDocs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum documento</p>
              </div>
            ) : filteredDocs.map(doc => {
              const T = typeInfo(doc.type)
              const badge = sigBadge(doc)
              return (
                <button key={doc.id} onClick={() => { setSelectedDoc(doc); setShowNewForm(false) }}
                  className={cn('w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition',
                    selectedDoc?.id === doc.id && 'bg-sky-50 border-l-2 border-l-sky-500')}>
                  <div className="flex items-start gap-3">
                    <T.icon className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500 truncate">{doc.patient.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.createdAt)}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {doc.sentWhatsapp && <span className="text-xs text-green-500 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />WA</span>}
                        {doc.sentEmail && <span className="text-xs text-blue-500 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />Email</span>}
                        {badge}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showNewForm ? (
          <div className="p-6 max-w-3xl">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {step !== 'form' && (
                <button onClick={() => setStep('form')} className="p-1.5 hover:bg-gray-100 rounded-lg mr-1">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              {(['form', 'preview', 'done'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    step === s ? 'bg-sky-500 text-white' : i < (['form','preview','done'] as const).indexOf(step) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500')}>
                    {i + 1}
                  </div>
                  <span className={cn('text-sm', step === s ? 'text-sky-600 font-medium' : 'text-gray-400')}>
                    {s === 'form' ? 'Formulário' : s === 'preview' ? 'Revisar & Editar' : 'Concluído'}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
                </div>
              ))}
              <button onClick={() => setShowNewForm(false)} className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* STEP 1 */}
            {step === 'form' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Documento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {docTypes.map((dt, idx) => (
                      <button key={`${dt.value}-${idx}`}
                        onClick={() => setForm(p => ({ ...p, type: dt.value, title: dt.label }))}
                        className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition',
                          isSelected(dt) ? 'bg-sky-50 border-sky-300 text-sky-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                        <dt.icon className="w-4 h-4" />{dt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Paciente</label>
                  <select value={form.patientId} onChange={e => setForm(p => ({ ...p, patientId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="">Selecione o paciente</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Título</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div onClick={() => setForm(p => ({ ...p, useAI: !p.useAI }))}
                    className={cn('relative w-10 h-6 rounded-full transition cursor-pointer flex-shrink-0', form.useAI ? 'bg-purple-500' : 'bg-gray-300')}>
                    <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', form.useAI ? 'translate-x-5' : 'translate-x-1')} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800 flex items-center gap-1.5"><Sparkles className="w-4 h-4" />Gerar com IA (DeepSeek)</p>
                    <p className="text-xs text-purple-600">A IA cria o documento completo baseado nas suas instruções</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    {form.useAI ? 'Instruções para a IA' : 'Conteúdo do Documento'}
                  </label>
                  <textarea value={form.useAI ? form.details : form.content}
                    onChange={e => setForm(p => form.useAI ? { ...p, details: e.target.value } : { ...p, content: e.target.value })}
                    rows={6} placeholder={form.useAI ? 'ex: Atestado de 2 dias por síndrome gripal...' : 'Digite o conteúdo...'}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowNewForm(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                  <button onClick={form.useAI ? generatePreview : saveDocument} disabled={generating || saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 disabled:opacity-60">
                    {(generating || saving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {form.useAI ? 'Gerar com IA' : 'Criar Documento'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-gray-600">Documento gerado pela IA. Revise e edite antes de salvar:</p>
                </div>
                <textarea value={previewContent} onChange={e => setPreviewContent(e.target.value)}
                  rows={22}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none bg-white shadow-sm" />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setStep('form')} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Voltar</button>
                  <button onClick={saveDocument} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Salvar Documento
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : selectedDoc ? (
          <div className="p-6 max-w-3xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{selectedDoc.title}</h2>
                  {selectedDoc.signatureStatus === 'SIGNED' && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />Assinado
                    </span>
                  )}
                  {selectedDoc.signatureToken && selectedDoc.signatureStatus === 'PENDING' && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />Aguardando Assinatura
                    </span>
                  )}
                  {!selectedDoc.signatureToken && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                      Assinatura não solicitada
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedDoc.patient.name} · {formatDate(selectedDoc.createdAt)} · {selectedDoc.createdBy.name}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => downloadPDF(selectedDoc)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                  <Download className="w-4 h-4" />PDF
                </button>
                <button onClick={() => sendDocument(selectedDoc.id, 'whatsapp')} disabled={sending === 'whatsapp'}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                    selectedDoc.sentWhatsapp ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                  {sending === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  {selectedDoc.sentWhatsapp ? 'Enviado WA' : 'WhatsApp'}
                </button>
                <button onClick={() => sendDocument(selectedDoc.id, 'email')} disabled={sending === 'email'}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                    selectedDoc.sentEmail ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                  {sending === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {selectedDoc.sentEmail ? 'Enviado Email' : 'E-mail'}
                </button>
              </div>
            </div>

            {/* Document content */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm mb-5">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">{selectedDoc.content}</pre>
            </div>

            {/* ── Signature section ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <PenLine className="w-4 h-4 text-sky-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Assinatura Digital</h3>
              </div>

              <div className="p-5">
                {/* Not requested */}
                {!selectedDoc.signatureToken && selectedDoc.signatureStatus !== 'SIGNED' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Nenhuma assinatura solicitada para este documento.</p>
                    <button
                      onClick={() => requestSignature(selectedDoc.id)}
                      disabled={requestingSignature}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-60 transition"
                    >
                      {requestingSignature ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                      Solicitar Assinatura
                    </button>
                  </div>
                )}

                {/* Pending — show link */}
                {selectedDoc.signatureToken && selectedDoc.signatureStatus === 'PENDING' && (() => {
                  const link = signLink(selectedDoc)!
                  const waMsg = encodeURIComponent(
                    `Olá, ${selectedDoc.patient.name}! 📋\nA ${clinicName} solicita sua assinatura digital no documento:\n*${selectedDoc.title}*\nAcesse o link abaixo para visualizar e assinar:\n${link}\n⚠️ Esta assinatura tem validade legal.`
                  )
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-amber-700 font-medium">Aguardando assinatura do paciente.</p>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 flex-1 truncate">{link}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado!') }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                          title="Copiar link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/?text=${waMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Enviar via WhatsApp
                        </a>
                        <button
                          onClick={() => requestSignature(selectedDoc.id)}
                          disabled={requestingSignature}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
                        >
                          Gerar novo link
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* Signed — show info + image + download */}
                {selectedDoc.signatureStatus === 'SIGNED' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Documento assinado com sucesso
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Signatário:</span>{' '}
                        <span className="font-medium text-gray-900">{selectedDoc.signerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">CPF:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {selectedDoc.signerCpf ? maskCpf(selectedDoc.signerCpf) : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Data/Hora:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {selectedDoc.signedAt
                            ? format(new Date(selectedDoc.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">IP:</span>{' '}
                        <span className="font-medium text-gray-900">{selectedDoc.ipAddress || '-'}</span>
                      </div>
                    </div>
                    {selectedDoc.signatureImageUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Assinatura:</p>
                        <img
                          src={selectedDoc.signatureImageUrl}
                          alt="Assinatura digital"
                          className="h-20 border border-gray-200 rounded-lg p-2 bg-white"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => downloadSignedPDF(selectedDoc)}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Documento Assinado
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-center">
            <div>
              <FileText className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <h3 className="text-gray-500 font-medium">Selecione ou crie um documento</h3>
              <p className="text-gray-400 text-sm mt-1">Receituários, atestados, relatórios e mais</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
