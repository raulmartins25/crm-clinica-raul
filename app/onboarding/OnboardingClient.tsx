'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────
const CLINIC_TYPES = [
  { value: 'MEDICA',          emoji: '🩺', label: 'Clínica Médica',               desc: 'Clínica geral e especialidades médicas' },
  { value: 'ODONTOLOGIA',     emoji: '🦷', label: 'Odontologia',                  desc: 'Atendimento odontológico e bucal' },
  { value: 'GINECOLOGIA',     emoji: '🤰', label: 'Ginecologia e Obstetrícia',     desc: 'Saúde da mulher e maternidade' },
  { value: 'PEDIATRIA',       emoji: '👶', label: 'Pediatria',                    desc: 'Cuidados de saúde infantil' },
  { value: 'DERMATOLOGIA',    emoji: '💆', label: 'Dermatologia e Estética',       desc: 'Pele, cabelo e procedimentos estéticos' },
  { value: 'PSICOLOGIA',      emoji: '🧠', label: 'Psicologia / Psiquiatria',      desc: 'Saúde mental e bem-estar' },
  { value: 'FISIOTERAPIA',    emoji: '🦵', label: 'Ortopedia e Fisioterapia',      desc: 'Reabilitação e movimento' },
  { value: 'ENDOCRINOLOGIA',  emoji: '🩸', label: 'Endocrinologia',               desc: 'Hormônios e metabolismo' },
  { value: 'NUTRICAO',        emoji: '🥗', label: 'Nutrição',                     desc: 'Alimentação e saúde nutricional' },
] as const

type ClinicTypeValue = typeof CLINIC_TYPES[number]['value']

const COUNCIL_LABEL: Record<ClinicTypeValue, string> = {
  MEDICA:         'CRM',
  GINECOLOGIA:    'CRM',
  PEDIATRIA:      'CRM',
  DERMATOLOGIA:   'CRM',
  ENDOCRINOLOGIA: 'CRM',
  ODONTOLOGIA:    'CRO',
  PSICOLOGIA:     'CRP',
  FISIOTERAPIA:   'CREFITO',
  NUTRICAO:       'CRN',
}

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

interface Clinic {
  name?: string
  cnpj?: string
  phone?: string
  email?: string
  city?: string
  state?: string
  logoUrl?: string
  responsavelTecnico?: string
  numeroConselho?: string
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ current }: { current: number }) {
  const steps = ['Tipo de Clínica', 'Dados da Clínica', 'Confirmação']
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                done  && 'bg-sky-500 border-sky-500 text-white',
                active && 'bg-white border-sky-500 text-sky-600',
                !done && !active && 'bg-white border-gray-200 text-gray-400',
              )}>
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium whitespace-nowrap',
                active ? 'text-sky-600' : done ? 'text-sky-500' : 'text-gray-400',
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-16 h-0.5 mx-1 mb-5 transition-colors',
                done ? 'bg-sky-500' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OnboardingClient({ clinic }: { clinic: Clinic }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [clinicType, setClinicType] = useState<ClinicTypeValue | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name:           clinic.name           || '',
    cnpj:           clinic.cnpj           || '',
    phone:          clinic.phone          || '',
    email:          clinic.email          || '',
    city:           clinic.city           || '',
    state:          clinic.state          || '',
    responsavel:    clinic.responsavelTecnico || '',
    numeroConselho: clinic.numeroConselho  || '',
    logoUrl:        clinic.logoUrl         || '',
  })

  const councilLabel = clinicType ? COUNCIL_LABEL[clinicType] : 'Conselho'
  const selectedType = CLINIC_TYPES.find(t => t.value === clinicType)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  // ── Logo upload ──
  const handleLogo = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/settings/clinic/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(prev => ({ ...prev, logoUrl: data.url }))
    } catch {
      toast.error('Erro ao fazer upload da logo')
    } finally {
      setUploading(false)
    }
  }

  // ── Submit ──
  const handleSubmit = async () => {
    if (!clinicType) return
    setSaving(true)
    try {
      const res = await fetch('/api/clinic/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicType, ...form, responsavel: form.responsavel, numeroConselho: form.numeroConselho }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep(3)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white flex flex-col items-center px-4 py-12">
      {/* Logo / brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="font-bold text-xl text-gray-900">ClinicaCRM</span>
      </div>

      <div className="w-full max-w-2xl">
        <Stepper current={step} />

        {/* ── Step 1: Tipo de clínica ── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Qual é o tipo da sua clínica?</h1>
              <p className="text-gray-500 mt-2 text-sm">Selecione a especialidade principal para personalizar sua experiência</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CLINIC_TYPES.map(({ value, emoji, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setClinicType(value)}
                  className={cn(
                    'flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all hover:border-sky-300 hover:bg-sky-50',
                    clinicType === value
                      ? 'border-sky-500 bg-sky-50 shadow-sm'
                      : 'border-gray-200 bg-white',
                  )}
                >
                  <span className="text-3xl mb-2">{emoji}</span>
                  <span className={cn(
                    'text-sm font-semibold leading-tight',
                    clinicType === value ? 'text-sky-700' : 'text-gray-800',
                  )}>{label}</span>
                  <span className="text-xs text-gray-400 mt-1 leading-tight">{desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!clinicType}
                className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Dados da clínica ── */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Dados da clínica</h1>
              <p className="text-gray-500 mt-2 text-sm">Preencha as informações da sua clínica</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              {/* Logo upload */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-sky-400 transition overflow-hidden bg-gray-50"
                >
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
                  ) : uploading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Logo da clínica</p>
                  <p className="text-xs text-gray-400">PNG, JPG até 2 MB</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 text-xs text-sky-600 hover:underline"
                  >
                    {form.logoUrl ? 'Trocar imagem' : 'Selecionar imagem'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogo(f) }}
                />
              </div>

              {/* Row: Nome + CNPJ */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome da clínica *" value={form.name} onChange={set('name')} placeholder="Ex: Clínica Saúde" />
                <Field label="CNPJ" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" />
              </div>

              {/* Row: Telefone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Telefone" value={form.phone} onChange={set('phone')} placeholder="(00) 0000-0000" />
                <Field label="E-mail" value={form.email} onChange={set('email')} placeholder="contato@clinica.com" type="email" />
              </div>

              {/* Row: Cidade + Estado */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Cidade" value={form.city} onChange={set('city')} placeholder="São Paulo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={form.state}
                    onChange={set('state')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="">UF</option>
                    {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Row: Responsável + Conselho */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Responsável técnico" value={form.responsavel} onChange={set('responsavel')} placeholder="Dr. João Silva" />
                <Field label={`Número do ${councilLabel}`} value={form.numeroConselho} onChange={set('numeroConselho')} placeholder={`${councilLabel} 123456`} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || saving}
                className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Salvando...' : 'Concluir configuração'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirmação ── */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tudo pronto! 🎉</h1>
            {selectedType && (
              <p className="text-gray-500 mb-1">
                Sua clínica foi configurada como{' '}
                <strong className="text-gray-700">{selectedType.emoji} {selectedType.label}</strong>
              </p>
            )}
            <p className="text-gray-400 text-sm mb-8">Você já pode começar a usar todas as funcionalidades do ClinicaCRM.</p>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-left mb-8 max-w-sm mx-auto space-y-2">
              {form.name     && <InfoRow label="Clínica" value={form.name} />}
              {form.city     && <InfoRow label="Cidade" value={`${form.city}${form.state ? ` - ${form.state}` : ''}`} />}
              {form.responsavel && <InfoRow label="Responsável" value={form.responsavel} />}
              {form.numeroConselho && <InfoRow label={councilLabel} value={form.numeroConselho} />}
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold transition shadow-sm"
            >
              Acessar minha clínica
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
