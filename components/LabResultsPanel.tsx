'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ── Config ─────────────────────────────────────────────────────────────────────

interface LabConfig {
  key: string
  label: string
  unit: string
  min: number
  max: number
  danger: number | null
}

const LAB_CONFIG: LabConfig[] = [
  { key: 'glicemia',        label: 'Glicemia',         unit: 'mg/dL', min: 70,  max: 99,  danger: 126  },
  { key: 'hba1c',           label: 'HbA1c',            unit: '%',     min: 0,   max: 5.7, danger: 6.5  },
  { key: 'tsh',             label: 'TSH',               unit: 'mUI/L', min: 0.4, max: 4.0, danger: 10.0 },
  { key: 't4l',             label: 'T4 Livre',          unit: 'ng/dL', min: 0.8, max: 1.8, danger: null },
  { key: 'colesterolTotal', label: 'Colesterol Total',  unit: 'mg/dL', min: 0,   max: 199, danger: 240  },
  { key: 'triglicerideos',  label: 'Triglicerídeos',   unit: 'mg/dL', min: 0,   max: 149, danger: 200  },
]

/** Key → { label, unit } map for external use (e.g. PatientProfile record display) */
export const LAB_KEY_LABELS: Record<string, { label: string; unit: string }> =
  Object.fromEntries(LAB_CONFIG.map(c => [c.key, { label: c.label, unit: c.unit }]))

// ── Props ──────────────────────────────────────────────────────────────────────

export interface LabResultsPanelProps {
  records: {
    createdAt: string
    extraData: Record<string, unknown> | null
  }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type Status = 'normal' | 'elevated' | 'critical' | 'none'

function getStatus(value: number, cfg: LabConfig): Status {
  if (cfg.danger != null && value >= cfg.danger) return 'critical'
  if (value > cfg.max || (cfg.min > 0 && value < cfg.min)) return 'elevated'
  return 'normal'
}

function parseVal(raw: unknown): number | null {
  const n = parseFloat(String(raw))
  return isNaN(n) ? null : n
}

function fmtMonthYear(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fmtFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

interface ChartPoint { date: string; dateLabel: string; value: number }

function buildChartData(key: string, records: LabResultsPanelProps['records']): ChartPoint[] {
  return records
    .filter(r => r.extraData && r.extraData[key] != null)
    .map(r => {
      const val = parseVal(r.extraData![key])
      return val == null ? null : { date: r.createdAt, dateLabel: fmtMonthYear(r.createdAt), value: val }
    })
    .filter((p): p is ChartPoint => p != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function getLastMeasurement(key: string, records: LabResultsPanelProps['records']) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  for (const r of sorted) {
    if (r.extraData && r.extraData[key] != null) {
      const val = parseVal(r.extraData[key])
      if (val != null) return { value: val, date: r.createdAt }
    }
  }
  return null
}

// ── Status card styles ─────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Status, { border: string; valueText: string; bg: string }> = {
  normal:   { border: 'border-green-200',  valueText: 'text-green-700',  bg: 'bg-green-50/40'  },
  elevated: { border: 'border-yellow-300', valueText: 'text-yellow-700', bg: 'bg-yellow-50/40' },
  critical: { border: 'border-red-300',    valueText: 'text-red-600',    bg: 'bg-red-50/40'    },
  none:     { border: 'border-gray-200',   valueText: 'text-gray-300',   bg: 'bg-gray-50'      },
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayload { payload: ChartPoint }

function CustomTooltip({
  active,
  payload,
  cfg,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  cfg: LabConfig
}) {
  if (!active || !payload?.length) return null
  const { date, value } = payload[0].payload
  const status = getStatus(value, cfg)
  const statusLabel = status === 'critical' ? 'Crítico' : status === 'elevated' ? 'Alterado' : 'Normal'
  const statusColor =
    status === 'critical' ? 'text-red-600' : status === 'elevated' ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-sm leading-relaxed">
      <p className="text-gray-400 text-xs mb-0.5">{fmtFullDate(date)}</p>
      <p className="font-semibold text-gray-900">
        {value} <span className="text-gray-400 font-normal text-xs">{cfg.unit}</span>
      </p>
      <p className={`text-xs font-medium mt-0.5 ${statusColor}`}>{statusLabel}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LabResultsPanel({ records }: LabResultsPanelProps) {
  const [selectedKey, setSelectedKey] = useState<string>('glicemia')

  const selectedCfg = LAB_CONFIG.find(c => c.key === selectedKey) ?? LAB_CONFIG[0]

  const chartData = useMemo(
    () => buildChartData(selectedKey, records),
    [selectedKey, records],
  )

  const yDomain = useMemo((): [number, number | ((v: number) => number)] => {
    const threshold = selectedCfg.danger ?? selectedCfg.max
    return [0, (dataMax: number) => Math.ceil(Math.max(dataMax, threshold) * 1.12)]
  }, [selectedCfg])

  return (
    <div className="border border-sky-200 rounded-xl bg-white p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Exames Laboratoriais
      </p>

      {/* ── Part A: Status cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {LAB_CONFIG.map(cfg => {
          const last = getLastMeasurement(cfg.key, records)
          const status: Status = last ? getStatus(last.value, cfg) : 'none'
          const styles = STATUS_STYLES[status]

          return (
            <div
              key={cfg.key}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${styles.border} ${styles.bg} ${
                selectedKey === cfg.key ? 'ring-2 ring-sky-400 ring-offset-1' : 'hover:ring-1 hover:ring-sky-200'
              }`}
              onClick={() => setSelectedKey(cfg.key)}
            >
              <p className="text-xs text-gray-500 font-medium truncate">{cfg.label}</p>
              {last ? (
                <>
                  <p className={`text-xl font-bold mt-1 leading-none ${styles.valueText}`}>
                    {last.value}
                    <span className="text-xs font-normal text-gray-400 ml-1">{cfg.unit}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{fmtFullDate(last.date)}</p>
                </>
              ) : (
                <p className="text-2xl font-bold mt-1 text-gray-200">—</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Part B: Evolution chart ────────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500">
            Evolução — {selectedCfg.label}
          </p>
          <select
            value={selectedKey}
            onChange={e => setSelectedKey(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            {LAB_CONFIG.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={v => fmtMonthYear(String(v))}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis
                domain={yDomain}
                unit={` ${selectedCfg.unit}`}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                width={64}
              />
              <Tooltip content={(props) => (
                <CustomTooltip
                  active={props.active}
                  payload={props.payload as TooltipPayload[] | undefined}
                  cfg={selectedCfg}
                />
              )} />

              {/* Normal upper limit */}
              <ReferenceLine
                y={selectedCfg.max}
                stroke="#f59e0b"
                strokeDasharray="4 2"
                label={{ value: 'Limite', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }}
              />
              {/* Danger threshold */}
              {selectedCfg.danger != null && (
                <ReferenceLine
                  y={selectedCfg.danger}
                  stroke="#ef4444"
                  strokeDasharray="4 2"
                  label={{ value: 'Atenção', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
                />
              )}

              <Line
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
            Nenhuma medição registrada para {selectedCfg.label}
          </div>
        )}

        {chartData.length > 0 && chartData.length < 2 && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Registre mais consultas para visualizar a evolução.
          </p>
        )}
      </div>
    </div>
  )
}
