'use client'

import { useState, useEffect } from 'react'

export interface AnthropometryPanelProps {
  weight: number | null
  height: number | null
  imc: number | null
  birthDate: string | null
  gender?: string | null
  sexoBiologico?: string
  nivelAtividade?: string
  onSexoBiologicoChange?: (v: string) => void
  onNivelAtividadeChange?: (v: string) => void
  readOnly?: boolean
}

const ACTIVITY_LEVELS = [
  { value: '1.2',   label: 'Sedentário' },
  { value: '1.375', label: 'Levemente ativo' },
  { value: '1.55',  label: 'Moderadamente ativo' },
  { value: '1.725', label: 'Muito ativo' },
  { value: '1.9',   label: 'Extremamente ativo' },
]

const IMC_CLASSES = [
  { max: 18.5, label: 'Abaixo do peso',     textCls: 'text-blue-600',   bgCls: 'bg-blue-50' },
  { max: 25,   label: 'Peso normal',         textCls: 'text-green-600',  bgCls: 'bg-green-50' },
  { max: 30,   label: 'Sobrepeso',           textCls: 'text-yellow-600', bgCls: 'bg-yellow-50' },
  { max: 35,   label: 'Obesidade grau I',    textCls: 'text-orange-500', bgCls: 'bg-orange-50' },
  { max: 40,   label: 'Obesidade grau II',   textCls: 'text-orange-700', bgCls: 'bg-orange-50' },
  { max: Infinity, label: 'Obesidade grau III', textCls: 'text-red-600', bgCls: 'bg-red-50' },
]

// Gradient covers IMC range 15–45
const BAR_GRADIENT =
  'linear-gradient(to right, #3b82f6 0%, #3b82f6 10%, #22c55e 18%, #22c55e 33%, #eab308 40%, #f97316 50%, #ea580c 67%, #ef4444 83%, #dc2626 100%)'

const BAR_TICKS = [
  { v: 15, label: '15' },
  { v: 25, label: '25' },
  { v: 30, label: '30' },
  { v: 40, label: '40' },
  { v: 45, label: '45' },
]

function imcClass(imc: number) {
  return IMC_CLASSES.find(c => imc < c.max) ?? IMC_CLASSES[IMC_CLASSES.length - 1]
}

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) age--
  return age
}

function fmtBr(n: number | null): string {
  return n != null ? Math.round(n).toLocaleString('pt-BR') : '—'
}

const selectCls =
  'px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white'

export function AnthropometryPanel({
  weight,
  height,
  imc,
  birthDate,
  gender,
  sexoBiologico,
  nivelAtividade,
  onSexoBiologicoChange,
  onNivelAtividadeChange,
  readOnly = false,
}: AnthropometryPanelProps) {
  // Gender known from patient profile if M or F
  const knownGender = gender === 'M' || gender === 'F' ? gender : null

  const [localGender, setLocalGender] = useState<string>(
    knownGender ?? sexoBiologico ?? 'M'
  )
  const [actLevel, setActLevel] = useState<string>(nivelAtividade ?? '1.2')
  const [tmb, setTmb] = useState<number | null>(null)
  const [get, setGet] = useState<number | null>(null)

  // Sync from parent when props change (e.g. loading readOnly historical data)
  useEffect(() => {
    if (sexoBiologico && !knownGender) setLocalGender(sexoBiologico)
  }, [sexoBiologico, knownGender])

  useEffect(() => {
    if (nivelAtividade) setActLevel(nivelAtividade)
  }, [nivelAtividade])

  // Recalculate TMB / GET
  useEffect(() => {
    const w = weight
    const h = height
    const age = calcAge(birthDate)
    if (!w || !h || !age || w <= 0 || h <= 0 || age <= 0) {
      setTmb(null); setGet(null); return
    }
    const sex = knownGender ?? localGender
    const base = sex === 'F'
      ? (10 * w) + (6.25 * h) - (5 * age) - 161
      : (10 * w) + (6.25 * h) - (5 * age) + 5
    const factor = parseFloat(actLevel)
    setTmb(base)
    setGet(base * factor)
  }, [weight, height, birthDate, localGender, knownGender, actLevel])

  const handleGenderChange = (v: string) => {
    setLocalGender(v)
    onSexoBiologicoChange?.(v)
  }

  const handleActChange = (v: string) => {
    setActLevel(v)
    onNivelAtividadeChange?.(v)
  }

  // ── IMC section ──────────────────────────────
  const imcVal = imc && imc > 0 ? imc : null
  const cls = imcVal ? imcClass(imcVal) : null
  const imcPct = imcVal != null
    ? Math.max(1, Math.min(99, (imcVal - 15) / 30 * 100))
    : null

  // ── Ideal weight section ──────────────────────
  const hM = height && height > 0 ? height / 100 : null
  const idealMin = hM ? +(18.5 * hM * hM).toFixed(1) : null
  const idealMax = hM ? +(24.9 * hM * hM).toFixed(1) : null

  let weightStatus: { text: string; cls: string } | null = null
  if (weight && weight > 0 && idealMin != null && idealMax != null) {
    if (weight < idealMin) {
      weightStatus = {
        text: `Déficit: ${(idealMin - weight).toFixed(1)} kg para o mínimo`,
        cls: 'text-blue-600',
      }
    } else if (weight > idealMax) {
      weightStatus = {
        text: `Excesso: ${(weight - idealMax).toFixed(1)} kg acima do máximo`,
        cls: 'text-orange-600',
      }
    } else {
      weightStatus = { text: '✓ Dentro do peso ideal', cls: 'text-green-600' }
    }
  }

  return (
    <div className="border border-sky-200 rounded-xl bg-white p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Antropometria
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-gray-100">

        {/* ── Seção 1: IMC Visual ────────────────── */}
        <div className="space-y-3 pb-4 md:pb-0 md:pr-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">IMC</p>

          <div className="text-center">
            <span className="text-4xl font-bold text-gray-900">
              {imcVal != null ? imcVal.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-gray-400 ml-1.5">kg/m²</span>
          </div>

          {cls && (
            <div className={`text-center py-1 px-3 rounded-full text-sm font-semibold ${cls.textCls} ${cls.bgCls}`}>
              {cls.label}
            </div>
          )}

          {/* Gradient bar with marker */}
          <div className="relative pt-4">
            {imcPct != null && (
              <div
                className="absolute top-0 w-3 h-3 rounded-full bg-gray-800 border-2 border-white shadow-sm"
                style={{ left: `${imcPct}%`, transform: 'translateX(-50%)' }}
              />
            )}
            <div
              className="h-3 rounded-full w-full"
              style={{ background: BAR_GRADIENT }}
            />
            {/* Tick labels */}
            <div className="relative h-4 mt-0.5">
              {BAR_TICKS.map(({ v, label }) => {
                const pct = (v - 15) / 30 * 100
                return (
                  <span
                    key={v}
                    className="absolute text-xs text-gray-400"
                    style={{
                      left: `${pct}%`,
                      transform: pct < 5 ? 'none' : pct > 95 ? 'translateX(-100%)' : 'translateX(-50%)',
                    }}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Seção 2: TMB / GET ─────────────────── */}
        <div className="space-y-3 py-4 md:py-0 md:px-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">TMB / GET</p>

          <div className="space-y-2">
            {/* Sexo biológico */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16 flex-shrink-0">Sexo</span>
              {knownGender != null ? (
                <span className="text-sm text-gray-700">
                  {knownGender === 'F' ? 'Feminino' : 'Masculino'}
                </span>
              ) : readOnly ? (
                <span className="text-sm text-gray-700">
                  {localGender === 'F' ? 'Feminino' : 'Masculino'}
                </span>
              ) : (
                <select
                  value={localGender}
                  onChange={e => handleGenderChange(e.target.value)}
                  className={selectCls}
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              )}
            </div>

            {/* Nível de atividade */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16 flex-shrink-0">Atividade</span>
              {readOnly ? (
                <span className="text-sm text-gray-700">
                  {ACTIVITY_LEVELS.find(a => a.value === actLevel)?.label ?? actLevel}
                </span>
              ) : (
                <select
                  value={actLevel}
                  onChange={e => handleActChange(e.target.value)}
                  className={`${selectCls} flex-1`}
                >
                  {ACTIVITY_LEVELS.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500">TMB</span>
              <span className="font-semibold text-gray-900 text-sm">
                {fmtBr(tmb)}{' '}
                <span className="text-xs font-normal text-gray-400">kcal/dia</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between bg-sky-50 rounded-lg px-3 py-2">
              <span className="text-xs text-sky-600 font-medium">GET</span>
              <span className="font-semibold text-sky-700 text-sm">
                {fmtBr(get)}{' '}
                <span className="text-xs font-normal text-sky-400">kcal/dia</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Seção 3: Peso Ideal ────────────────── */}
        <div className="space-y-3 pt-4 md:pt-0 md:pl-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Peso Ideal</p>

          {idealMin != null && idealMax != null ? (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Range saudável (IMC 18,5–24,9)</p>
                <p className="text-lg font-bold text-gray-900">
                  {idealMin.toFixed(1)} – {idealMax.toFixed(1)}{' '}
                  <span className="text-sm font-normal text-gray-400">kg</span>
                </p>
              </div>

              {weightStatus && (
                <div className={`text-sm font-semibold py-2 px-3 rounded-lg bg-gray-50 ${weightStatus.cls}`}>
                  {weightStatus.text}
                </div>
              )}

              {/* Mini progress bar */}
              {weight && weight > 0 && idealMin != null && idealMax != null && (() => {
                const pad = (idealMax - idealMin) * 0.6
                const barMin = Math.max(30, idealMin - pad)
                const barMax = idealMax + pad * 1.5
                const span = barMax - barMin
                const healthL = (idealMin - barMin) / span * 100
                const healthW = (idealMax - idealMin) / span * 100
                const weightPct = Math.max(0, Math.min(100, (weight - barMin) / span * 100))
                return (
                  <div className="space-y-0.5">
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-green-200 rounded"
                        style={{ left: `${healthL}%`, width: `${healthW}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-700"
                        style={{ left: `${weightPct}%`, transform: 'translateX(-50%)' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{barMin.toFixed(0)} kg</span>
                      <span className="text-green-600 text-xs">zona saudável</span>
                      <span>{barMax.toFixed(0)} kg</span>
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <p className="text-sm text-gray-400 py-4">Informe a altura para calcular</p>
          )}
        </div>
      </div>
    </div>
  )
}
