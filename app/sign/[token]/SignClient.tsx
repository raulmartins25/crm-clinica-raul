'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Loader2, PenLine, AlertTriangle } from 'lucide-react'
import { SignaturePad } from '@/components/SignaturePad'

interface DocInfo {
  id: string
  title: string
  content: string
  clinicName: string
  patientName: string
  token: string
}

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function cpfDigits(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export function SignClient({ doc }: { doc: DocInfo }) {
  const [signerName, setSignerName] = useState('')
  const [signerCpf, setSignerCpf] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const cpfValid = cpfDigits(signerCpf).length === 11
  const canSubmit = signerName.trim() && cpfValid && agreed && signatureBase64 !== null

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setFormError('')
    try {
      const res = await fetch(`/api/sign/${doc.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerCpf: cpfDigits(signerCpf),
          signatureBase64,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao assinar')
      setSignedAt(data.signedAt)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao processar assinatura')
    } finally {
      setLoading(false)
    }
  }

  if (signedAt) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Documento assinado com sucesso!</h2>
        <p className="text-gray-500">
          Data:{' '}
          {format(new Date(signedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
        <p className="text-sm text-gray-400 mt-3">
          Você pode fechar esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legal notice */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Você está prestes a assinar digitalmente este documento. Esta ação tem validade legal.
        </p>
      </div>

      {/* Section 1 — Signer identification */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">1. Identificação do Signatário</h2>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Seu nome completo"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            CPF <span className="text-red-500">*</span>
          </label>
          <input
            value={signerCpf}
            onChange={e => setSignerCpf(maskCPF(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {signerCpf && !cpfValid && (
            <p className="text-xs text-red-500 mt-1">CPF deve ter 11 dígitos</p>
          )}
        </div>
      </div>

      {/* Section 2 — Document content */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">2. Conteúdo do Documento</h2>
        <div
          className="max-h-72 overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700 leading-relaxed">
            {doc.content}
          </pre>
        </div>
      </div>

      {/* Section 3 — Signature */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <PenLine className="w-4 h-4 text-sky-500" />
          3. Assinatura
        </h2>
        <p className="text-sm text-gray-500">
          Assine abaixo com o dedo ou mouse. Após desenhar sua assinatura, clique em &quot;Confirmar Assinatura&quot;.
        </p>
        {signatureBase64 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-3 py-2 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Assinatura capturada
            </div>
            <img
              src={signatureBase64}
              alt="Assinatura"
              className="max-h-20 border border-gray-200 rounded-lg p-2 bg-white"
            />
            <button
              onClick={() => setSignatureBase64(null)}
              className="text-sm text-sky-600 hover:text-sky-700 underline"
            >
              Refazer assinatura
            </button>
          </div>
        ) : (
          <SignaturePad
            onSave={base64 => setSignatureBase64(base64)}
            onClear={() => setSignatureBase64(null)}
            width={600}
            height={200}
          />
        )}

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700">
            Li e concordo com o conteúdo deste documento
          </span>
        </label>
      </div>

      {formError && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {formError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
        Assinar Documento
      </button>
    </div>
  )
}
