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

const CONDITIONS: Array<{ id: Condition | null; label: string; color: string; border: string }> = [
  { id: null,          label: 'Saudável',   color: '#ffffff', border: '#d1d5db' },
  { id: 'CARIE',       label: 'Cárie',      color: '#ef4444', border: '#dc2626' },
  { id: 'RESTAURADO',  label: 'Restaurado', color: '#3b82f6', border: '#2563eb' },
  { id: 'AUSENTE',     label: 'Ausente',    color: '#9ca3af', border: '#6b7280' },
  { id: 'COROA',       label: 'Coroa',      color: '#f59e0b', border: '#d97706' },
  { id: 'CANAL',       label: 'Canal',      color: '#8b5cf6', border: '#7c3aed' },
  { id: 'FRATURA',     label: 'Fratura',    color: '#f97316', border: '#ea580c' },
]

const FACES: ToothFace[] = ['top', 'bottom', 'left', 'right', 'center']

// FDI display order (left → right on screen)
const UPPER_R = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_L = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_R = [48, 47, 46, 45, 44, 43, 42, 41]
const LOWER_L = [31, 32, 33, 34, 35, 36, 37, 38]

// ─── SVG Tooth shapes ────────────────────────────────────────────────────────
// All paths defined in a 32×82 viewBox (width may vary).
// Crown occupies y ≈ 2–40, roots occupy y ≈ 40–80.
// Upper teeth will be rendered scaleY(-1) so crown faces DOWN toward lower jaw.
// Lower teeth rendered normally so crown faces UP.

type ToothShape = { vw: number; vh: number; crown: string; roots: string[] }

const SHAPES: Record<string, ToothShape> = {
  // ── Upper central incisor ── wide rectangular crown, single root
  ui_c: {
    vw: 32, vh: 82,
    crown: 'M4,38 C4,30 4,18 5,12 C6,5 10,2 16,2 C22,2 26,5 27,12 C28,18 28,30 28,38 C24,41 8,41 4,38Z',
    roots: ['M9,40 C9,48 10,58 11,68 C12,76 14,80 16,80 C18,80 20,76 21,68 C22,58 23,48 23,40Z'],
  },
  // ── Upper lateral incisor ── slightly narrower
  ui_l: {
    vw: 28, vh: 80,
    crown: 'M4,37 C4,29 4,18 5,12 C7,5 10,3 14,3 C18,3 21,5 23,12 C24,18 24,29 24,37 C21,40 7,40 4,37Z',
    roots: ['M7,39 C7,47 8,57 9,66 C10,74 12,77 14,77 C16,77 18,74 19,66 C20,57 21,47 21,39Z'],
  },
  // ── Canine (upper) ── pointed, longer root
  can_up: {
    vw: 28, vh: 86,
    crown: 'M4,38 C4,28 4,17 5,11 C7,4 10,1 14,1 C18,1 21,4 23,11 C24,17 24,28 24,38 C21,41 7,41 4,38Z',
    roots: ['M7,40 C7,50 8,62 10,72 C11,79 13,84 14,84 C15,84 17,79 18,72 C20,62 21,50 21,40Z'],
  },
  // ── Upper premolar ── two-cusp crown, two roots
  pre_up: {
    vw: 30, vh: 80,
    crown: 'M4,37 C4,29 3,18 4,12 C5,5 9,2 15,2 C21,2 25,5 26,12 C27,18 26,29 26,37 C23,40 7,40 4,37Z',
    roots: [
      'M5,39 C5,47 6,56 6,65 C6,73 8,77 11,77 C13,77 14,73 14,65 C14,56 12,47 10,39Z',
      'M20,39 C18,47 16,56 16,65 C16,73 17,77 19,77 C22,77 24,73 24,65 C24,56 25,47 25,39Z',
    ],
  },
  // ── Upper molar ── wide crown, three roots
  mol_up: {
    vw: 38, vh: 80,
    crown: 'M3,38 C2,29 2,18 3,11 C4,4 9,1 19,1 C29,1 34,4 35,11 C36,18 36,29 35,38 C31,42 7,42 3,38Z',
    roots: [
      'M4,41 C4,50 5,59 5,68 C5,75 7,78 10,78 C12,78 13,75 13,68 C13,59 11,50 9,41Z',
      'M16,41 C16,50 16,60 16,69 C16,76 18,79 19,79 C20,79 22,76 22,69 C22,60 22,50 22,41Z',
      'M27,41 C29,50 31,59 31,68 C31,75 29,78 27,78 C25,78 24,75 24,68 C24,59 25,50 27,41Z',
    ],
  },
  // ── Wisdom upper ── shorter crown, three compressed roots
  wis_up: {
    vw: 36, vh: 76,
    crown: 'M3,36 C2,28 2,17 3,11 C5,5 9,2 18,2 C27,2 31,5 33,11 C34,17 34,28 33,36 C29,40 7,40 3,36Z',
    roots: [
      'M4,39 C4,48 5,56 5,64 C5,71 7,74 10,74 C12,74 13,71 12,64 C12,56 10,48 8,39Z',
      'M15,39 C15,49 15,58 15,66 C15,72 17,75 18,75 C19,75 21,72 21,66 C21,58 21,49 21,39Z',
      'M26,39 C28,48 29,56 29,64 C29,71 27,74 25,74 C23,74 22,71 23,64 C23,56 24,48 26,39Z',
    ],
  },
  // ── Lower central incisor ── small and narrow
  li_c: {
    vw: 24, vh: 78,
    crown: 'M4,35 C4,28 4,19 5,14 C6,8 9,5 12,5 C15,5 18,8 19,14 C20,19 20,28 20,35 C17,38 7,38 4,35Z',
    roots: ['M6,37 C6,45 7,54 8,63 C9,71 10,75 12,75 C14,75 15,71 16,63 C17,54 18,45 18,37Z'],
  },
  // ── Lower lateral incisor ──
  li_l: {
    vw: 26, vh: 80,
    crown: 'M4,36 C4,29 4,19 5,13 C7,7 10,4 13,4 C16,4 19,7 21,13 C22,19 22,29 22,36 C19,39 7,39 4,36Z',
    roots: ['M6,38 C6,46 7,55 8,64 C9,72 11,76 13,76 C15,76 17,72 18,64 C19,55 20,46 20,38Z'],
  },
  // ── Lower canine ── longer root
  can_low: {
    vw: 28, vh: 86,
    crown: 'M4,38 C4,28 4,17 5,11 C7,4 10,1 14,1 C18,1 21,4 23,11 C24,17 24,28 24,38 C21,41 7,41 4,38Z',
    roots: ['M7,40 C7,50 8,62 10,73 C11,80 13,84 14,84 C15,84 17,80 18,73 C20,62 21,50 21,40Z'],
  },
  // ── Lower premolar ── single root
  pre_low: {
    vw: 30, vh: 80,
    crown: 'M4,37 C4,29 4,18 5,12 C6,5 10,2 15,2 C20,2 24,5 25,12 C26,18 26,29 26,37 C23,40 7,40 4,37Z',
    roots: ['M9,39 C9,47 10,57 11,66 C12,74 13,77 15,77 C17,77 18,74 19,66 C20,57 21,47 21,39Z'],
  },
  // ── Lower molar ── wide crown, two roots
  mol_low: {
    vw: 38, vh: 80,
    crown: 'M3,38 C2,29 2,18 3,11 C4,4 9,1 19,1 C29,1 34,4 35,11 C36,18 36,29 35,38 C31,42 7,42 3,38Z',
    roots: [
      'M5,41 C5,50 6,59 6,68 C6,75 8,78 12,78 C15,78 16,75 15,68 C14,59 12,50 11,41Z',
      'M23,41 C25,50 26,59 26,68 C26,75 24,78 21,78 C18,78 17,75 18,68 C18,59 20,50 22,41Z',
    ],
  },
}

function getShape(n: number): ToothShape {
  if (n === 11 || n === 21) return SHAPES.ui_c
  if (n === 12 || n === 22) return SHAPES.ui_l
  if (n === 13 || n === 23) return SHAPES.can_up
  if ([14, 15, 24, 25].includes(n)) return SHAPES.pre_up
  if ([16, 17, 26, 27].includes(n)) return SHAPES.mol_up
  if (n === 18 || n === 28) return SHAPES.wis_up
  if (n === 31 || n === 41) return SHAPES.li_c
  if (n === 32 || n === 42) return SHAPES.li_l
  if (n === 33 || n === 43) return SHAPES.can_low
  if ([34, 35, 44, 45].includes(n)) return SHAPES.pre_low
  return SHAPES.mol_low // 36-38, 46-48
}

function getDominant(tooth?: Partial<Record<ToothFace, Condition | null>>): Condition | null {
  if (!tooth) return null
  const vals = FACES.map(f => tooth[f]).filter(Boolean) as Condition[]
  if (!vals.length) return null
  const order: Condition[] = ['AUSENTE', 'CARIE', 'CANAL', 'FRATURA', 'COROA', 'RESTAURADO']
  for (const p of order) if (vals.includes(p)) return p
  return vals[0]
}

function condColor(c: Condition | null) {
  return CONDITIONS.find(x => x.id === c)?.color ?? '#ffffff'
}

function isAbsent(t?: Partial<Record<ToothFace, Condition | null>>) {
  return !!t && FACES.every(f => t[f] === 'AUSENTE')
}

// ─── Single tooth SVG ────────────────────────────────────────────────────────
interface ToothProps {
  n: number
  condition: Condition | null
  absent: boolean
  isUpper: boolean
  readOnly: boolean
  onClick: (e: React.MouseEvent) => void
}

function Tooth({ n, condition, absent, isUpper, readOnly, onClick }: ToothProps) {
  const shape = getShape(n)
  const fill = absent ? '#9ca3af' : condColor(condition)
  const stroke = condition ? (CONDITIONS.find(c => c.id === condition)?.border ?? '#9ca3af') : '#9ca3af'
  const rootFill = '#f3f4f6'
  const rootStroke = '#c4c9d0'

  // Upper teeth: scaleY(-1) so crown faces down toward lower jaw
  const transform = isUpper ? `scale(1,-1) translate(0,-${shape.vh})` : undefined

  // Crown bounding approx: x≈3 to vw-3, y≈2 to 42 (in SVG coords before flip)
  const cx1 = shape.vw * 0.2, cy1 = 6
  const cx2 = shape.vw * 0.8, cy2 = 38

  return (
    <div className="flex flex-col items-center" style={{ gap: 2 }}>
      {isUpper && (
        <span className="text-[8px] text-gray-400 font-mono leading-none">{n}</span>
      )}
      <svg
        viewBox={`0 0 ${shape.vw} ${shape.vh}`}
        width={shape.vw}
        height={shape.vh}
        style={{ cursor: readOnly ? 'default' : 'pointer', display: 'block', flexShrink: 0 }}
        onClick={onClick}
      >
        <g transform={transform}>
          {/* Roots rendered first (behind crown) */}
          {shape.roots.map((r, i) => (
            <path key={i} d={r} fill={rootFill} stroke={rootStroke} strokeWidth="0.8" strokeLinejoin="round" />
          ))}
          {/* Crown */}
          <path
            d={shape.crown}
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
            fillOpacity={absent ? 0.7 : 1}
          />
          {/* Absent: diagonal cross over crown area */}
          {absent && (
            <g stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round">
              <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} />
              <line x1={cx2} y1={cy1} x2={cx1} y2={cy2} />
            </g>
          )}
        </g>
      </svg>
      {!isUpper && (
        <span className="text-[8px] text-gray-400 font-mono leading-none">{n}</span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Odontogram({ value, onChange, readOnly = false }: OdontogramProps) {
  const [pop, setPop] = useState<{ tooth: number; px: number; py: number } | null>(null)

  useEffect(() => {
    if (!pop) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [pop])

  const handleClick = useCallback((e: React.MouseEvent, n: number) => {
    if (readOnly) return
    e.stopPropagation()
    setPop({ tooth: n, px: e.clientX, py: e.clientY })
  }, [readOnly])

  const apply = useCallback((cond: Condition | null) => {
    if (!pop || !onChange) return
    const { tooth } = pop
    if (cond === null) {
      const next = { ...value }; delete next[tooth]; onChange(next)
    } else {
      onChange({ ...value, [tooth]: Object.fromEntries(FACES.map(f => [f, cond])) as Record<ToothFace, Condition> })
    }
    setPop(null)
  }, [pop, onChange, value])

  const row = (teeth: number[], isUpper: boolean) => (
    <div className="flex items-end gap-0.5">
      {teeth.map(n => (
        <Tooth
          key={n}
          n={n}
          condition={getDominant(value[n])}
          absent={isAbsent(value[n])}
          isUpper={isUpper}
          readOnly={readOnly}
          onClick={e => handleClick(e, n)}
        />
      ))}
    </div>
  )

  return (
    <div className="relative select-none overflow-x-auto" onClick={() => setPop(null)}>
      {/* Quadrant labels */}
      <div className="flex text-[10px] text-gray-400 mb-1 min-w-max">
        <span style={{ width: 310 }} className="text-center">Q1 – Sup. Direito</span>
        <span style={{ width: 310 }} className="text-center">Q2 – Sup. Esquerdo</span>
      </div>

      {/* Upper jaw — crown faces DOWN */}
      <div className="flex items-end min-w-max">
        {row(UPPER_R, true)}
        <div className="w-px self-stretch bg-gray-300 mx-1" />
        {row(UPPER_L, true)}
      </div>

      {/* Midline */}
      <div className="border-t-2 border-dashed border-gray-300 my-0.5 min-w-max" />

      {/* Lower jaw — crown faces UP */}
      <div className="flex items-start min-w-max">
        {row(LOWER_R, false)}
        <div className="w-px self-stretch bg-gray-300 mx-1" />
        {row(LOWER_L, false)}
      </div>

      <div className="flex text-[10px] text-gray-400 mt-1 min-w-max">
        <span style={{ width: 310 }} className="text-center">Q4 – Inf. Direito</span>
        <span style={{ width: 310 }} className="text-center">Q3 – Inf. Esquerdo</span>
      </div>

      {/* Condition picker popover */}
      {pop && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3"
          style={{ left: pop.px + 12, top: pop.py, transform: 'translateY(-50%)', minWidth: 200 }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-gray-400 mb-2 text-center font-semibold">Dente {pop.tooth}</p>
          <div className="grid grid-cols-4 gap-1">
            {CONDITIONS.map(c => (
              <button
                key={String(c.id)}
                onClick={() => apply(c.id)}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-gray-50 transition"
              >
                <span
                  className="w-7 h-7 rounded-lg border-2 block flex-shrink-0"
                  style={{ backgroundColor: c.color, borderColor: c.border }}
                />
                <span className="text-[8px] text-gray-500 leading-tight text-center">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {CONDITIONS.slice(1).map(c => (
          <span key={String(c.id)} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="w-3 h-3 rounded border flex-shrink-0"
              style={{ backgroundColor: c.color, borderColor: c.border }}
            />
            {c.label}
          </span>
        ))}
        {!readOnly && <span className="text-xs text-gray-400">· Clique no dente para marcar</span>}
      </div>
    </div>
  )
}
