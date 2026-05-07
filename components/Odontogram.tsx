'use client'

import { useState, useCallback, useEffect } from 'react'

export type Condition = 'CARIE' | 'RESTAURADO' | 'AUSENTE' | 'COROA' | 'CANAL' | 'FRATURA'
export type ToothFace = 'top' | 'bottom' | 'left' | 'right' | 'center'
export type OdontogramData = Partial<Record<number, Partial<Record<ToothFace, Condition | null>>>>

interface OdontogramProps {
  value: OdontogramData
  onChange?: (data: OdontogramData) => void
  readOnly?: boolean
}

const CONDITIONS: Array<{ id: Condition | null; label: string; color: string }> = [
  { id: null,         label: 'Saudável',   color: '#f9fafb' },
  { id: 'CARIE',      label: 'Cárie',      color: '#ef4444' },
  { id: 'RESTAURADO', label: 'Restaurado', color: '#3b82f6' },
  { id: 'AUSENTE',    label: 'Ausente',    color: '#6b7280' },
  { id: 'COROA',      label: 'Coroa',      color: '#f59e0b' },
  { id: 'CANAL',      label: 'Canal',      color: '#8b5cf6' },
  { id: 'FRATURA',    label: 'Fratura',    color: '#f97316' },
]

// Layout constants
const S = 36, INN = 10, INO = 26
const STEP = S + 2           // stride between teeth = 38
const QGAP = 12              // gap between left/right quadrant groups
const Q2X = 7 * STEP + S + QGAP   // x-start of right group = 266+36+12 = 314
const LABEL_H = 12           // height reserved for tooth number labels
const ROW_H = 18             // vertical gap between upper and lower rows
const UPPER_Y = LABEL_H      // y of upper teeth = 12
const LOWER_Y = LABEL_H + S + ROW_H  // y of lower teeth = 66
const SVG_W = Q2X + 7 * STEP + S    // total SVG width = 616
const SVG_H = LABEL_H + S + ROW_H + S + LABEL_H  // total SVG height = 114

// FDI tooth arrays, each in left-to-right display order
const UPPER_R = [18, 17, 16, 15, 14, 13, 12, 11]  // Q1: patient upper-right
const UPPER_L = [21, 22, 23, 24, 25, 26, 27, 28]  // Q2: patient upper-left
const LOWER_R = [48, 47, 46, 45, 44, 43, 42, 41]  // Q4: patient lower-right
const LOWER_L = [31, 32, 33, 34, 35, 36, 37, 38]  // Q3: patient lower-left
const ALL_TEETH = [...UPPER_R, ...UPPER_L, ...LOWER_R, ...LOWER_L]
const FACES: ToothFace[] = ['top', 'bottom', 'left', 'right', 'center']

function getPos(n: number): { x: number; y: number } {
  let i = UPPER_R.indexOf(n); if (i >= 0) return { x: i * STEP, y: UPPER_Y }
  i = UPPER_L.indexOf(n); if (i >= 0) return { x: Q2X + i * STEP, y: UPPER_Y }
  i = LOWER_R.indexOf(n); if (i >= 0) return { x: i * STEP, y: LOWER_Y }
  i = LOWER_L.indexOf(n); if (i >= 0) return { x: Q2X + i * STEP, y: LOWER_Y }
  return { x: 0, y: 0 }
}

function toothFaces(x: number, y: number): Record<ToothFace, string> {
  return {
    top:    `${x},${y} ${x+S},${y} ${x+S-INN},${y+INN} ${x+INN},${y+INN}`,
    bottom: `${x+INN},${y+INO} ${x+S-INN},${y+INO} ${x+S},${y+S} ${x},${y+S}`,
    left:   `${x},${y} ${x+INN},${y+INN} ${x+INN},${y+INO} ${x},${y+S}`,
    right:  `${x+S},${y} ${x+S},${y+S} ${x+S-INN},${y+INO} ${x+S-INN},${y+INN}`,
    center: `${x+INN},${y+INN} ${x+S-INN},${y+INN} ${x+S-INN},${y+INO} ${x+INN},${y+INO}`,
  }
}

function condColor(c?: Condition | null): string {
  if (!c) return '#f9fafb'
  return CONDITIONS.find(x => x.id === c)?.color ?? '#f9fafb'
}

function isAbsent(t?: Partial<Record<ToothFace, Condition | null>>): boolean {
  return !!t && FACES.every(f => t[f] === 'AUSENTE')
}

type Popover = { tooth: number; face: ToothFace; px: number; py: number } | null

export function Odontogram({ value, onChange, readOnly = false }: OdontogramProps) {
  const [popover, setPopover] = useState<Popover>(null)

  useEffect(() => {
    if (!popover) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopover(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [popover])

  const handleFaceClick = useCallback((
    e: React.MouseEvent<SVGPolygonElement>,
    tooth: number,
    face: ToothFace,
  ) => {
    if (readOnly) return
    e.stopPropagation()
    setPopover({ tooth, face, px: e.clientX, py: e.clientY })
  }, [readOnly])

  const handleNumClick = useCallback((tooth: number) => {
    if (readOnly || !onChange) return
    setPopover(null)
    if (isAbsent(value[tooth])) {
      const next = { ...value }
      delete next[tooth]
      onChange(next)
    } else {
      onChange({
        ...value,
        [tooth]: Object.fromEntries(FACES.map(f => [f, 'AUSENTE'])) as Record<ToothFace, Condition>,
      })
    }
  }, [readOnly, onChange, value])

  const applyCondition = useCallback((cond: Condition | null) => {
    if (!popover || !onChange) return
    const { tooth, face } = popover
    onChange({ ...value, [tooth]: { ...(value[tooth] ?? {}), [face]: cond } })
    setPopover(null)
  }, [popover, onChange, value])

  return (
    <div className="relative select-none" onClick={() => setPopover(null)}>
      {/* Quadrant labels above */}
      <div className="flex mb-0.5 text-xs text-gray-400">
        <span className="w-1/2 text-center">Q1 – Sup. Direito</span>
        <span className="w-1/2 text-center">Q2 – Sup. Esquerdo</span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full border border-gray-200 rounded-lg bg-white"
        style={{ maxWidth: SVG_W, display: 'block' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Center divider */}
        <line
          x1={Q2X - QGAP / 2} y1={0}
          x2={Q2X - QGAP / 2} y2={SVG_H}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 2"
        />

        {ALL_TEETH.map(n => {
          const { x, y } = getPos(n)
          const fp = toothFaces(x, y)
          const tooth = value[n]
          const absent = isAbsent(tooth)
          const isUpper = UPPER_R.includes(n) || UPPER_L.includes(n)

          return (
            <g key={n}>
              {/* Clickable faces */}
              {FACES.map(face => (
                <polygon
                  key={face}
                  points={fp[face]}
                  fill={condColor(tooth?.[face])}
                  stroke="#d1d5db"
                  strokeWidth="0.5"
                  style={{ cursor: readOnly ? 'default' : 'pointer' }}
                  onClick={e => handleFaceClick(e, n, face)}
                />
              ))}

              {/* Absent tooth X overlay */}
              {absent && (
                <g stroke="#4b5563" strokeWidth="1.5" style={{ pointerEvents: 'none' }}>
                  <line x1={x + 3} y1={y + 3} x2={x + S - 3} y2={y + S - 3} />
                  <line x1={x + S - 3} y1={y + 3} x2={x + 3} y2={y + S - 3} />
                </g>
              )}

              {/* Tooth number — click to toggle AUSENTE for entire tooth */}
              <text
                x={x + S / 2}
                y={isUpper ? y - 2 : y + S + 9}
                textAnchor="middle"
                fontSize="8"
                fill={readOnly ? '#9ca3af' : '#6b7280'}
                style={{ cursor: readOnly ? 'default' : 'pointer', userSelect: 'none' }}
                onClick={(e) => { e.stopPropagation(); handleNumClick(n) }}
              >
                {n}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Quadrant labels below */}
      <div className="flex mt-0.5 text-xs text-gray-400">
        <span className="w-1/2 text-center">Q4 – Inf. Direito</span>
        <span className="w-1/2 text-center">Q3 – Inf. Esquerdo</span>
      </div>

      {/* Condition picker popover */}
      {popover && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2.5"
          style={{ left: popover.px + 10, top: popover.py, transform: 'translateY(-50%)' }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-gray-400 mb-1.5 text-center">Dente {popover.tooth}</p>
          <div className="flex gap-1.5">
            {CONDITIONS.map(c => (
              <button
                key={String(c.id)}
                onClick={() => applyCondition(c.id)}
                title={c.label}
                className="w-7 h-7 rounded border-2 hover:scale-110 transition-transform"
                style={{ backgroundColor: c.color, borderColor: c.id ? c.color : '#d1d5db' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
        {CONDITIONS.slice(1).map(c => (
          <span key={String(c.id)} className="flex items-center gap-1 text-xs text-gray-500">
            <span
              className="inline-block w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: c.color }}
            />
            {c.label}
          </span>
        ))}
        {!readOnly && (
          <span className="text-xs text-gray-400">· N° do dente = marcar ausente</span>
        )}
      </div>
    </div>
  )
}
