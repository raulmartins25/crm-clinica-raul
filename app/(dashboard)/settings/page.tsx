'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Settings, Users, MessageSquare, Mail, Building2,
  Plus, Loader2, QrCode, RefreshCw, CheckCircle, X, Power,
  Key, Server, Webhook, UserPlus, Upload, Edit2, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'clinic', label: 'Clínica', icon: Building2 },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'email', label: 'E-mail', icon: Mail },
] as const

type TabId = typeof tabs[number]['id']

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string(),
  crm: z.string().optional(),
  specialty: z.string().optional(),
  phone: z.string().optional(),
})
type UserForm = z.infer<typeof userSchema>

const waSchema = z.object({
  baseUrl: z.string().url('URL inválida'),
  apiKey: z.string().min(1, 'API Key obrigatória'),
  instanceName: z.string().min(1, 'Nome da instância obrigatório'),
})
type WAForm = z.infer<typeof waSchema>

interface User {
  id: string; name: string; email: string; role: string
  crm: string | null; specialty: string | null; phone: string | null; active: boolean
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador', DOCTOR: 'Médico', NURSE: 'Enfermeiro(a)',
  RECEPTIONIST: 'Recepcionista', ASSISTANT: 'Assistente',
}
const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700', DOCTOR: 'bg-blue-100 text-blue-700',
  NURSE: 'bg-green-100 text-green-700', RECEPTIONIST: 'bg-yellow-100 text-yellow-700',
  ASSISTANT: 'bg-gray-100 text-gray-600',
}

interface Clinic {
  id: string; name: string; cnpj: string | null; phone: string | null
  email: string | null; address: string | null; city: string | null
  state: string | null; zipCode: string | null; logoUrl: string | null
  website: string | null; specialty: string | null
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('clinic')
  const [users, setUsers] = useState<User[]>([])
  const [showNewUser, setShowNewUser] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  // Clinic state
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [clinicForm, setClinicForm] = useState({ name: '', cnpj: '', phone: '', email: '', address: '', city: '', state: '', zipCode: '', website: '', specialty: '', logoUrl: '' })
  const [savingClinic, setSavingClinic] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<string | null>(null)
  const [doctorEdits, setDoctorEdits] = useState<Record<string, { crm: string; specialty: string }>>({})
  const logoInputRef = useRef<HTMLInputElement>(null)

  // WhatsApp state
  const [waConnected, setWaConnected] = useState(false)
  const [waInstance, setWaInstance] = useState<{ instanceName: string; baseUrl: string; connected: boolean } | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingQR, setLoadingQR] = useState(false)
  const [savingWA, setSavingWA] = useState(false)

  // Email state
  const [emailForm, setEmailForm] = useState({ host: '', port: '587', user: '', password: '', fromName: '', fromEmail: '', secure: false })
  const [savingEmail, setSavingEmail] = useState(false)

  const { register: userReg, handleSubmit: handleUserSubmit, formState: { errors: userErrors }, reset: resetUser } = useForm<UserForm>({ resolver: zodResolver(userSchema) })
  const { register: waReg, handleSubmit: handleWASubmit, formState: { errors: waErrors } } = useForm<WAForm>({ resolver: zodResolver(waSchema) })

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'whatsapp') fetchWAStatus()
    if (activeTab === 'clinic') fetchClinic()
  }, [activeTab])

  const fetchClinic = async () => {
    const res = await fetch('/api/settings/clinic')
    const data = await res.json()
    if (data.clinic) {
      setClinic(data.clinic)
      setClinicForm({
        name: data.clinic.name || '', cnpj: data.clinic.cnpj || '',
        phone: data.clinic.phone || '', email: data.clinic.email || '',
        address: data.clinic.address || '', city: data.clinic.city || '',
        state: data.clinic.state || '', zipCode: data.clinic.zipCode || '',
        website: data.clinic.website || '', specialty: data.clinic.specialty || '',
        logoUrl: data.clinic.logoUrl || '',
      })
    }
  }

  const saveClinic = async () => {
    setSavingClinic(true)
    try {
      const res = await fetch('/api/settings/clinic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicForm),
      })
      if (!res.ok) throw new Error()
      toast.success('Informações da clínica salvas!')
      fetchClinic()
    } catch { toast.error('Erro ao salvar') }
    finally { setSavingClinic(false) }
  }

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/settings/clinic/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClinicForm(p => ({ ...p, logoUrl: data.url }))
      toast.success('Logo enviada!')
    } catch (e: any) { toast.error(e.message || 'Erro ao enviar logo') }
    finally { setUploadingLogo(false) }
  }

  const saveDoctorEdits = async (userId: string) => {
    const edits = doctorEdits[userId]
    if (!edits) return
    try {
      await fetch('/api/settings/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, crm: edits.crm, specialty: edits.specialty }),
      })
      toast.success('Médico atualizado!')
      setEditingDoctor(null)
      fetchUsers()
    } catch { toast.error('Erro ao salvar') }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    const res = await fetch('/api/settings/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoadingUsers(false)
  }

  const createUser = async (data: UserForm) => {
    setSavingUser(true)
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Usuário criado com sucesso!')
      setShowNewUser(false)
      resetUser()
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setSavingUser(false)
    }
  }

  const fetchWAStatus = async () => {
    const res = await fetch('/api/settings/whatsapp')
    const data = await res.json()
    if (data.instance) {
      setWaInstance(data.instance)
      setWaConnected(data.instance.connected)
    }
  }

  const setupWhatsApp = async (data: WAForm) => {
    setSavingWA(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao configurar')
      setWaInstance(json.instance)
      toast.success('Evolution API configurada! Agora conecte seu WhatsApp.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao configurar WhatsApp')
    } finally {
      setSavingWA(false)
    }
  }

  const fetchQRCode = async () => {
    setLoadingQR(true)
    setQrCode(null)
    try {
      const res = await fetch('/api/settings/whatsapp/qr')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido do servidor')
      if (data.qr) setQrCode(data.qr)
      else throw new Error('O servidor não retornou um QR Code válido')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar QR Code')
    } finally {
      setLoadingQR(false)
    }
  }

  const saveEmail = async () => {
    setSavingEmail(true)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      if (!res.ok) throw new Error()
      toast.success('Configurações de e-mail salvas!')
    } catch {
      toast.error('Erro ao salvar configurações de e-mail')
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie sua clínica, usuários e integrações</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                  activeTab === id ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-3xl">
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Gerenciar Usuários</h2>
                <button
                  onClick={() => setShowNewUser(!showNewUser)}
                  className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Usuário
                </button>
              </div>

              {showNewUser && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Criar Novo Usuário</h3>
                  <form onSubmit={handleUserSubmit(createUser)} className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Nome completo</label>
                      <input {...userReg('name')} placeholder="Nome do usuário"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      {userErrors.name && <p className="text-red-500 text-xs mt-1">{userErrors.name.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</label>
                      <input {...userReg('email')} type="email" placeholder="usuario@email.com"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      {userErrors.email && <p className="text-red-500 text-xs mt-1">{userErrors.email.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Senha</label>
                      <input {...userReg('password')} type="password" placeholder="Mínimo 6 caracteres"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      {userErrors.password && <p className="text-red-500 text-xs mt-1">{userErrors.password.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Função</label>
                      <select {...userReg('role')}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                        {Object.entries(roleLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">CRM (médicos)</label>
                      <input {...userReg('crm')} placeholder="ex: 12345/SP"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Especialidade</label>
                      <input {...userReg('specialty')} placeholder="ex: Cardiologia"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <button type="button" onClick={() => setShowNewUser(false)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                      <button type="submit" disabled={savingUser}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 disabled:opacity-60">
                        {savingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                        Criar Usuário
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loadingUsers ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Função</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-xs">
                                {u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                {u.crm && <p className="text-xs text-gray-400">CRM: {u.crm}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{u.email}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                              {roleLabels[u.role] || u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('flex items-center gap-1 text-xs', u.active ? 'text-green-500' : 'text-gray-400')}>
                              <Power className="w-3 h-3" />{u.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* WHATSAPP TAB */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Conectar WhatsApp</h3>
                    <p className="text-sm text-gray-500">
                      Integração via Evolution API {waInstance?.instanceName ? `(Instância: ${waInstance.instanceName})` : ''}
                    </p>
                  </div>
                  <div className={cn('flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full',
                    waConnected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                  )}>
                    <div className={cn('w-2 h-2 rounded-full', waConnected ? 'bg-green-500' : 'bg-gray-400')} />
                    {waConnected ? 'Conectado' : 'Desconectado'}
                  </div>
                </div>

                {!waConnected && (
                  <div className="text-center py-6">
                    <button
                      onClick={fetchQRCode}
                      disabled={loadingQR}
                      className="flex items-center gap-2 px-6 py-3 mx-auto bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition shadow-sm hover:shadow disabled:opacity-60"
                    >
                      {loadingQR ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                      {qrCode ? 'Atualizar QR Code' : 'Gerar QR Code para Conectar'}
                    </button>

                    {qrCode && (
                      <div className="mt-8">
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          Abra o WhatsApp no seu celular
                        </p>
                        <p className="text-xs text-gray-500 mb-6">
                          Vá em <strong className="text-gray-700">Configurações &gt; Dispositivos Conectados &gt; Conectar Dispositivo</strong> e aponte a câmera para o código abaixo:
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto w-64 h-64 border border-gray-200 rounded-xl p-2 bg-white shadow-sm" />
                        <button
                          onClick={fetchQRCode}
                          className="mt-6 flex items-center gap-1.5 text-sm font-medium text-sky-500 hover:text-sky-600 mx-auto transition"
                        >
                          <RefreshCw className="w-4 h-4" />Gerar Novo Código
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {waConnected && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">WhatsApp Conectado</h4>
                    <p className="text-sm text-gray-500">Sua clínica já está enviando e recebendo mensagens automaticamente.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EMAIL TAB */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900">Configurar E-mail (SMTP)</h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Servidor SMTP</label>
                    <input value={emailForm.host} onChange={e => setEmailForm(p => ({ ...p, host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Porta</label>
                    <input value={emailForm.port} onChange={e => setEmailForm(p => ({ ...p, port: e.target.value }))}
                      placeholder="587"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Usuário</label>
                    <input value={emailForm.user} onChange={e => setEmailForm(p => ({ ...p, user: e.target.value }))}
                      placeholder="email@gmail.com"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Senha / App Password</label>
                    <input value={emailForm.password} onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))}
                      type="password" placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome do Remetente</label>
                    <input value={emailForm.fromName} onChange={e => setEmailForm(p => ({ ...p, fromName: e.target.value }))}
                      placeholder="Clínica Dr. Silva"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">E-mail do Remetente</label>
                    <input value={emailForm.fromEmail} onChange={e => setEmailForm(p => ({ ...p, fromEmail: e.target.value }))}
                      placeholder="clinica@email.com"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="secure" checked={emailForm.secure}
                    onChange={e => setEmailForm(p => ({ ...p, secure: e.target.checked }))}
                    className="accent-sky-500" />
                  <label htmlFor="secure" className="text-sm text-gray-700">Usar SSL/TLS (porta 465)</label>
                </div>
                <button onClick={saveEmail} disabled={savingEmail}
                  className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition disabled:opacity-60">
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Salvar Configurações
                </button>
              </div>
            </div>
          )}

          {/* CLINIC TAB */}
          {activeTab === 'clinic' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Logo da Clínica</h2>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                    {clinicForm.logoUrl
                      ? <img src={clinicForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      : <Building2 className="w-8 h-8 text-gray-300" />}
                  </div>
                  <div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
                    <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-sm font-medium hover:bg-sky-100 transition disabled:opacity-60">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG ou SVG — recomendado 256×256px</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Informações da Clínica</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[{label:'Nome da Clínica',key:'name',col:'col-span-2'},{label:'CNPJ',key:'cnpj'},{label:'Especialidade',key:'specialty'},{label:'Telefone',key:'phone'},{label:'E-mail',key:'email'},{label:'Site',key:'website',col:'col-span-2'},{label:'Endereço',key:'address',col:'col-span-2'},{label:'Cidade',key:'city'},{label:'Estado (UF)',key:'state'},{label:'CEP',key:'zipCode',col:'col-span-2'}].map(f => (
                    <div key={f.key} className={f.col || ''}>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{f.label}</label>
                      <input value={(clinicForm as any)[f.key]} onChange={e => setClinicForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                  ))}
                </div>
                <button onClick={saveClinic} disabled={savingClinic}
                  className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition disabled:opacity-60">
                  {savingClinic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Informações
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Médicos Cadastrados</h2>
                <div className="space-y-2">
                  {users.filter(u => u.role === 'DOCTOR').map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                        {u.name.slice(0,2).toUpperCase()}
                      </div>
                      {editingDoctor === u.id ? (
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input placeholder="CRM (ex: 12345/SP)"
                            value={doctorEdits[u.id]?.crm ?? u.crm ?? ''}
                            onChange={e => setDoctorEdits(p => ({ ...p, [u.id]: { ...p[u.id], crm: e.target.value } }))}
                            className="px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                          <input placeholder="Especialidade"
                            value={doctorEdits[u.id]?.specialty ?? u.specialty ?? ''}
                            onChange={e => setDoctorEdits(p => ({ ...p, [u.id]: { ...p[u.id], specialty: e.target.value } }))}
                            className="px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.crm ? `CRM: ${u.crm}` : 'CRM não informado'} {u.specialty ? `· ${u.specialty}` : ''}</p>
                        </div>
                      )}
                      {editingDoctor === u.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveDoctorEdits(u.id)} className="p-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingDoctor(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingDoctor(u.id); setDoctorEdits(p => ({ ...p, [u.id]: { crm: u.crm || '', specialty: u.specialty || '' } })) }}
                          className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {users.filter(u => u.role === 'DOCTOR').length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum médico cadastrado ainda.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
