'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDate, formatDateTime, formatPhoneDisplay, getInitials, cn } from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, Stethoscope,
  Plus, Activity, Heart, Thermometer, Weight, Ruler, Droplets,
  MessageSquare, Loader2, ChevronDown, Edit, Save, X,
} from 'lucide-react'
import { getMedicalRecordConfig, type FieldConfig } from '@/lib/medicalRecordConfig'

interface Props {
  patient: {
    id: string; name: string; cpf: string | null; birthDate: string | null
    gender: string | null; phone: string; phone2: string | null; email: string | null
    address: string | null; city: string | null; state: string | null; zipCode: string | null
    bloodType: string | null; allergies: string | null; observations: string | null
    appointments: Array<{
      id: string; title: string; startTime: string; endTime: string; status: string
      doctor: { name: string; crm: string | null }
    }>
    medicalRecords: Array<{
      id: string; createdAt: string; chiefComplaint: string | null
      diagnosis: string | null; treatment: string | null; observations: string | null
      bloodPressure: string | null; heartRate: number | null; temperature: number | null
      weight: number | null; height: number | null; oxygenSat: number | null
      extraData: Record<string, unknown> | null
      doctor: { name: string; crm: string | null }
    }>
    documents: Array<{
      id: string; title: string; type: string; createdAt: string
      createdBy: { name: string }
    }>
  }
  doctors: Array<{ id: string; name: string; crm: string | null }>
  session: { id: string; name: string; role: string }
  clinicType?: string | null
}

const ALL_VITALS = [
  { key: 'bloodPressure', label: 'PA (mmHg)', icon: Activity, placeholder: '120/80' },
  { key: 'heartRate', label: 'FC (bpm)', icon: Heart, placeholder: '72' },
  { key: 'temperature', label: 'Temp. (°C)', icon: Thermometer, placeholder: '36.5' },
  { key: 'weight', label: 'Peso (kg)', icon: Weight, placeholder: '70' },
  { key: 'height', label: 'Altura (cm)', icon: Ruler, placeholder: '170' },
  { key: 'oxygenSat', label: 'SpO2 (%)', icon: Activity, placeholder: '98' },
] as const

export function PatientProfile({ patient, doctors, session, clinicType }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'appointments' | 'documents'>('overview')
  const [showNewRecord, setShowNewRecord] = useState(false)
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordForm, setRecordForm] = useState({
    chiefComplaint: '', anamnesis: '', physicalExam: '', diagnosis: '',
    icdCode: '', treatment: '', observations: '', bloodPressure: '',
    heartRate: '', temperature: '', weight: '', height: '', oxygenSat: '',
    doctorId: session.id,
  })
  const [extraData, setExtraData] = useState<Record<string, string>>({})

  const config = getMedicalRecordConfig(clinicType)
  const visibleVitals = ALL_VITALS.filter(v => config.showVitals[v.key as keyof typeof config.showVitals])

  // Calculate DPP and semanasGestacao from DUM (GINECOLOGIA)
  useEffect(() => {
    if (!extraData.dum) return
    const dum = new Date(extraData.dum)
    if (isNaN(dum.getTime())) return
    const dpp = new Date(dum.getTime() + 280 * 24 * 60 * 60 * 1000)
    const semanas = Math.max(0, Math.floor((Date.now() - dum.getTime()) / (7 * 24 * 60 * 60 * 1000)))
    setExtraData(p => ({
      ...p,
      dpp: dpp.toISOString().split('T')[0],
      semanasGestacao: String(semanas),
    }))
  }, [extraData.dum])

  // Calculate IMC from weight and height (NUTRICAO)
  useEffect(() => {
    const weight = parseFloat(recordForm.weight)
    const height = parseFloat(recordForm.height)
    if (weight > 0 && height > 0) {
      const heightM = height / 100
      setExtraData(p => ({ ...p, imc: (weight / (heightM * heightM)).toFixed(1) }))
    }
  }, [recordForm.weight, recordForm.height])

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'records', label: 'Prontuário', icon: Stethoscope },
    { id: 'appointments', label: 'Consultas', icon: Calendar },
    { id: 'documents', label: 'Documentos', icon: FileText },
  ] as const

  const genderLabel = { M: 'Masculino', F: 'Feminino', O: 'Outro' }

  const saveRecord = async () => {
    setSavingRecord(true)
    try {
      const res = await fetch(`/api/patients/${patient.id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recordForm, extraData }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Prontuário salvo com sucesso!')
      setShowNewRecord(false)
      router.refresh()
    } catch {
      toast.error('Erro ao salvar prontuário')
    } finally {
      setSavingRecord(false)
    }
  }

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-orange-100 text-orange-700',
  }
  const statusLabels: Record<string, string> = {
    SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado', NO_SHOW: 'Faltou', IN_PROGRESS: 'Em Andamento',
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/patients" className="p-2 hover:bg-gray-100 rounded-lg transition mt-1">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg">
            {getInitials(patient.name)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
              {patient.birthDate && <span>{formatDate(patient.birthDate)}</span>}
              {patient.gender && <span>{genderLabel[patient.gender as keyof typeof genderLabel] || patient.gender}</span>}
              {patient.bloodType && (
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-red-400" />
                  {patient.bloodType}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {formatPhoneDisplay(patient.phone)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/inbox?phone=${patient.phone}`}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </Link>
            <button
              onClick={() => setShowNewRecord(true)}
              className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition"
            >
              <Plus className="w-4 h-4" />
              Prontuário
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
            <dl className="space-y-3">
              {patient.cpf && <InfoRow label="CPF" value={patient.cpf} />}
              {patient.email && <InfoRow label="E-mail" value={patient.email} icon={<Mail className="w-3.5 h-3.5" />} />}
              {patient.phone2 && <InfoRow label="Tel. 2" value={formatPhoneDisplay(patient.phone2)} icon={<Phone className="w-3.5 h-3.5" />} />}
              {(patient.address || patient.city) && (
                <InfoRow
                  label="Endereço"
                  value={[patient.address, patient.city, patient.state].filter(Boolean).join(', ')}
                  icon={<MapPin className="w-3.5 h-3.5" />}
                />
              )}
            </dl>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Informações Clínicas</h3>
            {patient.allergies ? (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Alergias</p>
                <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3">{patient.allergies}</p>
              </div>
            ) : null}
            {patient.observations && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-gray-600">{patient.observations}</p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Resumo</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Consultas', value: patient.appointments.length, icon: Calendar, color: 'text-blue-500' },
                { label: 'Prontuários', value: patient.medicalRecords.length, icon: Stethoscope, color: 'text-green-500' },
                { label: 'Documentos', value: patient.documents.length, icon: FileText, color: 'text-purple-500' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
                  <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {showNewRecord && (
            <div className="bg-white rounded-xl border border-sky-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900">Novo Prontuário</h3>
                <button onClick={() => setShowNewRecord(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sinais Vitais */}
                {visibleVitals.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sinais Vitais</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {visibleVitals.map(f => (
                        <div key={f.key}>
                          <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                          <input
                            value={recordForm[f.key as keyof typeof recordForm]}
                            onChange={e => setRecordForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campos clínicos base */}
                {[
                  { key: 'chiefComplaint', label: 'Queixa Principal' },
                  { key: 'anamnesis', label: 'Anamnese' },
                  { key: 'physicalExam', label: 'Exame Físico' },
                  { key: 'diagnosis', label: 'Diagnóstico' },
                  { key: 'treatment', label: 'Conduta / Tratamento' },
                  { key: 'observations', label: 'Observações' },
                ].map(f => (
                  <div key={f.key} className={f.key === 'anamnesis' || f.key === 'physicalExam' ? 'md:col-span-2' : ''}>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">{f.label}</label>
                    <textarea
                      value={recordForm[f.key as keyof typeof recordForm]}
                      onChange={e => setRecordForm(p => ({ ...p, [f.key]: e.target.value }))}
                      rows={f.key === 'anamnesis' || f.key === 'physicalExam' ? 4 : 2}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">CID-10</label>
                  <input
                    value={recordForm.icdCode}
                    onChange={e => setRecordForm(p => ({ ...p, icdCode: e.target.value }))}
                    placeholder="ex: J18.0"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Médico Responsável</label>
                  <select
                    value={recordForm.doctorId}
                    onChange={e => setRecordForm(p => ({ ...p, doctorId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}{d.crm ? ` - CRM ${d.crm}` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Seção extra por nicho */}
                {config.extraSection && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-2">
                      {config.extraSection.title}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {config.extraSection.fields.map(f => (
                        <div key={f.key} className={f.colSpan === 'full' ? 'md:col-span-2' : ''}>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">{f.label}</label>
                          <ExtraField
                            field={f}
                            value={extraData[f.key] ?? ''}
                            onChange={val => setExtraData(p => ({ ...p, [f.key]: val }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowNewRecord(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveRecord}
                  disabled={savingRecord}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition disabled:opacity-60"
                >
                  {savingRecord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Prontuário
                </button>
              </div>
            </div>
          )}

          {patient.medicalRecords.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
              <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum prontuário registrado</p>
              <button
                onClick={() => setShowNewRecord(true)}
                className="mt-3 text-sky-500 text-sm hover:underline"
              >
                Adicionar primeiro prontuário
              </button>
            </div>
          ) : (
            patient.medicalRecords.map(record => (
              <div key={record.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{formatDateTime(record.createdAt)}</p>
                    <p className="text-sm text-gray-500">Dr(a). {record.doctor.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {record.bloodPressure && <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-red-400" />{record.bloodPressure}</span>}
                    {record.heartRate && <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-pink-400" />{record.heartRate} bpm</span>}
                    {record.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-orange-400" />{record.temperature}°C</span>}
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Queixa Principal', value: record.chiefComplaint },
                    { label: 'Diagnóstico', value: record.diagnosis },
                    { label: 'Conduta', value: record.treatment },
                    { label: 'Observações', value: record.observations },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.value}</p>
                    </div>
                  ))}
                  {record.extraData && Object.keys(record.extraData).length > 0 && (
                    <div className="md:col-span-2 border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(record.extraData).map(([k, v]) =>
                        v ? (
                          <div key={k}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{k}</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(v)}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {patient.appointments.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma consulta registrada</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase">Data</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Consulta</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Médico</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patient.appointments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-sm text-gray-700">{formatDateTime(a.startTime)}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{a.title}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">Dr(a). {a.doctor.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[a.status] || a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-2">
          {patient.documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum documento gerado</p>
              <Link href={`/documents/new?patientId=${patient.id}`} className="mt-3 text-sky-500 text-sm hover:underline block">
                Gerar documento
              </Link>
            </div>
          ) : (
            patient.documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-4 hover:bg-gray-50 transition">
                <FileText className="w-8 h-8 text-sky-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {doc.type} · {formatDate(doc.createdAt)} · {doc.createdBy.name}
                  </p>
                </div>
                <Link href={`/documents/${doc.id}`} className="text-sky-500 text-sm hover:underline">
                  Ver
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ExtraField({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (v: string) => void }) {
  const baseClass = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500'
  const readonlyClass = 'bg-gray-50 text-gray-500 cursor-not-allowed'

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        readOnly={field.readonly}
        className={cn(baseClass, 'resize-none', field.readonly && readonlyClass)}
      />
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(baseClass, field.readonly && readonlyClass)}
        disabled={field.readonly}
      >
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt || '— selecione —'}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      type={field.type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      readOnly={field.readonly}
      className={cn(baseClass, field.readonly && readonlyClass)}
    />
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-20 text-xs font-medium text-gray-400 pt-0.5 flex-shrink-0">{label}</div>
      <div className="flex items-center gap-1 text-sm text-gray-700 min-w-0">
        {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
        <span className="truncate">{value}</span>
      </div>
    </div>
  )
}
