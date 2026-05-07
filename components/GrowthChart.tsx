'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  getWeightPercentiles, getHeightPercentiles,
  getPercentilesAtAge,
  getWeightPercentileForAge, getHeightPercentileForAge,
  type PercentilePoint,
} from '@/lib/whoGrowthData'

export interface GrowthChartProps {
  gender: 'M' | 'F' | null
  measurements: {
    age: number    // decimal years at time of record
    weight: number // kg
    height: number // cm
    date: string
  }[]
}

// ── Chart data builder ────────────────────────────────────────────────────────

type ChartPoint = PercentilePoint & { patient?: number | null }

function buildData(
  type: 'weight' | 'height',
  gender: 'M' | 'F',
  measurements: GrowthChartProps['measurements'],
): ChartPoint[] {
  const percentiles =
    type === 'weight' ? getWeightPercentiles(gender) : getHeightPercentiles(gender)

  // Start with all 20 integer-age percentile points
  const map = new Map<number, ChartPoint>()
  percentiles.forEach(p => map.set(p.age, { ...p, patient: null }))

  // Merge patient measurements (may be at decimal ages)
  measurements.forEach(m => {
    const val = type === 'weight' ? m.weight : m.height
    if (val <= 0 || m.age < 0 || m.age > 19) return
    const age = Math.round(m.age * 10) / 10 // round to 1dp
    if (map.has(age)) {
      const pt = map.get(age)!
      // Keep closest-to-whole-number measurement if collision
      if (pt.patient == null) pt.patient = val
    } else {
      const pPt = getPercentilesAtAge(age, type, gender)
      map.set(age, { ...pPt, patient: val })
    }
  })

  return Array.from(map.values()).sort((a, b) => a.age - b.age)
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; payload: ChartPoint }>
  label?: number
  gender: 'M' | 'F'
  type: 'weight' | 'height'
}

function CustomTooltip({ active, payload, label, gender, type }: TooltipProps) {
  if (!active || !payload?.length || label == null) return null
  const patientEntry = payload.find(p => p.dataKey === 'patient')
  if (!patientEntry || patientEntry.value == null) return null

  const value = patientEntry.value
  const pct =
    type === 'weight'
      ? getWeightPercentileForAge(value, label, gender)
      : getHeightPercentileForAge(value, label, gender)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-sm leading-relaxed">
      <p className="font-semibold text-gray-800">{label.toFixed(1)} anos</p>
      <p className="text-blue-600 font-medium">
        {type === 'weight' ? `${value} kg` : `${value} cm`}
      </p>
      <p className="text-gray-500">Percentil {Math.round(pct)}</p>
    </div>
  )
}

// ── Single chart ───────────────────────────────────────────────────────────────

interface SingleChartProps {
  type: 'weight' | 'height'
  gender: 'M' | 'F'
  measurements: GrowthChartProps['measurements']
}

const PERCENTILE_COLOR = '#d1d5db'
const PERCENTILE_DASH = '4 2'
const P50_COLOR = '#9ca3af'
const PATIENT_COLOR = '#3b82f6'

function SingleChart({ type, gender, measurements }: SingleChartProps) {
  const data = useMemo(
    () => buildData(type, gender, measurements),
    [type, gender, measurements],
  )

  const unit = type === 'weight' ? ' kg' : ' cm'
  const title = type === 'weight' ? 'Peso por Idade' : 'Altura por Idade'

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2 text-center">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="age"
            type="number"
            domain={[0, 19]}
            ticks={[0, 2, 5, 10, 15, 19]}
            tickFormatter={v => `${v}a`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            label={{ value: 'Idade (anos)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }}
          />
          <YAxis
            tickFormatter={v => `${v}`}
            unit={unit}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            width={52}
          />
          <Tooltip
            content={
              <CustomTooltip
                gender={gender}
                type={type}
              />
            }
          />

          {/* P3 */}
          <Line dataKey="p3"  stroke={PERCENTILE_COLOR} strokeWidth={1} dot={false} strokeDasharray={PERCENTILE_DASH} connectNulls isAnimationActive={false} />
          {/* P15 */}
          <Line dataKey="p15" stroke={PERCENTILE_COLOR} strokeWidth={1} dot={false} strokeDasharray={PERCENTILE_DASH} connectNulls isAnimationActive={false} />
          {/* P50 — Mediana, solid */}
          <Line dataKey="p50" stroke={P50_COLOR} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false}
            label={(props: { index: number; x: number; y: number }) =>
              props.index === data.length - 1 ? (
                <text x={props.x + 4} y={props.y + 4} fontSize={9} fill={P50_COLOR}>P50</text>
              ) : <g />
            }
          />
          {/* P85 */}
          <Line dataKey="p85" stroke={PERCENTILE_COLOR} strokeWidth={1} dot={false} strokeDasharray={PERCENTILE_DASH} connectNulls isAnimationActive={false} />
          {/* P97 */}
          <Line dataKey="p97" stroke={PERCENTILE_COLOR} strokeWidth={1} dot={false} strokeDasharray={PERCENTILE_DASH} connectNulls isAnimationActive={false} />

          {/* Patient line */}
          <Line
            dataKey="patient"
            stroke={PATIENT_COLOR}
            strokeWidth={2}
            dot={{ r: 4, fill: PATIENT_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: PATIENT_COLOR }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export function GrowthChart({ gender, measurements }: GrowthChartProps) {
  const [localGender, setLocalGender] = useState<'M' | 'F'>('M')
  const effectiveGender = gender ?? localGender

  const hasMeasurements = measurements.filter(
    m => m.weight > 0 || m.height > 0,
  ).length

  return (
    <div className="border border-sky-200 rounded-xl bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Curva de Crescimento
        </p>
        {gender == null && (
          <select
            value={localGender}
            onChange={e => setLocalGender(e.target.value as 'M' | 'F')}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SingleChart type="weight" gender={effectiveGender} measurements={measurements} />
        <SingleChart type="height" gender={effectiveGender} measurements={measurements} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-3 px-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: PATIENT_COLOR }} />
          Paciente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-px" style={{ backgroundColor: P50_COLOR }} />
          P50 (Mediana)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4" className="overflow-visible">
            <line x1="0" y1="2" x2="20" y2="2" stroke={PERCENTILE_COLOR} strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          P3 / P15 / P85 / P97 (OMS)
        </span>
      </div>

      {hasMeasurements < 2 && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Registre mais consultas para acompanhar a evolução na curva.
        </p>
      )}
    </div>
  )
}
