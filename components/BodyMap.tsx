'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type LesionStatus = 'LESAO_ATIVA' | 'EM_TRATAMENTO' | 'CICATRIZADA' | 'MONITORAR' | 'PROCEDIMENTO'

export type BodyMapData = {
  [regionId: string]: { status: LesionStatus; note?: string }
}

export interface BodyMapProps {
  value: BodyMapData
  onChange?: (data: BodyMapData) => void
  readOnly?: boolean
}

interface PopoverState { regionId: string; px: number; py: number }
type ShapeType = 'circle' | 'ellipse' | 'rect' | 'polygon'
interface BodyShape { regionId: string; type: ShapeType; attrs: Record<string, string | number> }

// ── Constants ──────────────────────────────────────────────────────────────────

export const LESION_STATES: { value: LesionStatus; label: string; color: string }[] = [
  { value: 'LESAO_ATIVA',   label: 'Lesão Ativa',   color: '#ef4444' },
  { value: 'EM_TRATAMENTO', label: 'Em Tratamento', color: '#f59e0b' },
  { value: 'CICATRIZADA',   label: 'Cicatrizada',   color: '#22c55e' },
  { value: 'MONITORAR',     label: 'Monitorar',     color: '#8b5cf6' },
  { value: 'PROCEDIMENTO',  label: 'Procedimento',  color: '#3b82f6' },
]

export const REGION_LABELS: Record<string, string> = {
  cabeca: 'Cabeça', pescoco: 'Pescoço',
  ombroDireito: 'Ombro Direito', ombroEsquerdo: 'Ombro Esquerdo',
  bracoDireito: 'Braço Direito', bracoEsquerdo: 'Braço Esquerdo',
  antebracoDireito: 'Antebraço Direito', antebracoEsquerdo: 'Antebraço Esquerdo',
  maoDireita: 'Mão Direita', maoEsquerda: 'Mão Esquerda',
  torax: 'Tórax', abdomen: 'Abdômen',
  costasSuperiores: 'Costas Superiores', costasInferiores: 'Costas Inferiores',
  gluteos: 'Glúteos',
  coxaDireita: 'Coxa Direita', coxaEsquerda: 'Coxa Esquerda',
  pernaDireita: 'Perna Direita', pernaEsquerda: 'Perna Esquerda',
  peDireito: 'Pé Direito', peEsquerdo: 'Pé Esquerdo',
}

// ── Shape data (viewBox 0 0 260 400) ──────────────────────────────────────────
// Frontal: x 0–120 (body centered at 60). Dorsal: x 140–260 (body centered at 200).

const FRONTAL: BodyShape[] = [
  { regionId: 'cabeca',            type: 'circle',  attrs: { cx: 60, cy: 30, r: 22 } },
  { regionId: 'pescoco',           type: 'rect',    attrs: { x: 54, y: 50, width: 12, height: 16, rx: 3 } },
  { regionId: 'ombroDireito',      type: 'ellipse', attrs: { cx: 32, cy: 75, rx: 15, ry: 11 } },
  { regionId: 'ombroEsquerdo',     type: 'ellipse', attrs: { cx: 88, cy: 75, rx: 15, ry: 11 } },
  { regionId: 'torax',             type: 'polygon', attrs: { points: '38,64 82,64 84,138 36,138' } },
  { regionId: 'abdomen',           type: 'polygon', attrs: { points: '36,138 84,138 82,192 38,192' } },
  { regionId: 'bracoDireito',      type: 'rect',    attrs: { x: 13, y: 70, width: 16, height: 46, rx: 4 } },
  { regionId: 'bracoEsquerdo',     type: 'rect',    attrs: { x: 91, y: 70, width: 16, height: 46, rx: 4 } },
  { regionId: 'antebracoDireito',  type: 'rect',    attrs: { x: 14, y: 116, width: 14, height: 42, rx: 4 } },
  { regionId: 'antebracoEsquerdo', type: 'rect',    attrs: { x: 92, y: 116, width: 14, height: 42, rx: 4 } },
  { regionId: 'maoDireita',        type: 'ellipse', attrs: { cx: 21, cy: 166, rx: 10, ry: 12 } },
  { regionId: 'maoEsquerda',       type: 'ellipse', attrs: { cx: 99, cy: 166, rx: 10, ry: 12 } },
  { regionId: 'coxaDireita',       type: 'rect',    attrs: { x: 37, y: 194, width: 20, height: 60, rx: 4 } },
  { regionId: 'coxaEsquerda',      type: 'rect',    attrs: { x: 63, y: 194, width: 20, height: 60, rx: 4 } },
  { regionId: 'pernaDireita',      type: 'rect',    attrs: { x: 38, y: 254, width: 18, height: 60, rx: 4 } },
  { regionId: 'pernaEsquerda',     type: 'rect',    attrs: { x: 64, y: 254, width: 18, height: 60, rx: 4 } },
  { regionId: 'peDireito',         type: 'ellipse', attrs: { cx: 50, cy: 321, rx: 14, ry: 9 } },
  { regionId: 'peEsquerdo',        type: 'ellipse', attrs: { cx: 72, cy: 321, rx: 14, ry: 9 } },
]

const DORSAL: BodyShape[] = [
  { regionId: 'cabeca',            type: 'circle',  attrs: { cx: 200, cy: 30, r: 22 } },
  { regionId: 'pescoco',           type: 'rect',    attrs: { x: 194, y: 50, width: 12, height: 16, rx: 3 } },
  { regionId: 'ombroDireito',      type: 'ellipse', attrs: { cx: 172, cy: 75, rx: 15, ry: 11 } },
  { regionId: 'ombroEsquerdo',     type: 'ellipse', attrs: { cx: 228, cy: 75, rx: 15, ry: 11 } },
  { regionId: 'costasSuperiores',  type: 'polygon', attrs: { points: '178,64 222,64 224,138 176,138' } },
  { regionId: 'costasInferiores',  type: 'polygon', attrs: { points: '176,138 224,138 222,192 178,192' } },
  { regionId: 'bracoDireito',      type: 'rect',    attrs: { x: 153, y: 70, width: 16, height: 46, rx: 4 } },
  { regionId: 'bracoEsquerdo',     type: 'rect',    attrs: { x: 231, y: 70, width: 16, height: 46, rx: 4 } },
  { regionId: 'antebracoDireito',  type: 'rect',    attrs: { x: 154, y: 116, width: 14, height: 42, rx: 4 } },
  { regionId: 'antebracoEsquerdo', type: 'rect',    attrs: { x: 232, y: 116, width: 14, height: 42, rx: 4 } },
  { regionId: 'maoDireita',        type: 'ellipse', attrs: { cx: 161, cy: 166, rx: 10, ry: 12 } },
  { regionId: 'maoEsquerda',       type: 'ellipse', attrs: { cx: 239, cy: 166, rx: 10, ry: 12 } },
  { regionId: 'gluteos',           type: 'polygon', attrs: { points: '178,192 222,192 220,246 180,246' } },
  { regionId: 'coxaDireita',       type: 'rect',    attrs: { x: 177, y: 248, width: 20, height: 56, rx: 4 } },
  { regionId: 'coxaEsquerda',      type: 'rect',    attrs: { x: 203, y: 248, width: 20, height: 56, rx: 4 } },
  { regionId: 'pernaDireita',      type: 'rect',    attrs: { x: 178, y: 304, width: 18, height: 56, rx: 4 } },
  { regionId: 'pernaEsquerda',     type: 'rect',    attrs: { x: 204, y: 304, width: 18, height: 56, rx: 4 } },
  { regionId: 'peDireito',         type: 'ellipse', attrs: { cx: 190, cy: 367, rx: 14, ry: 9 } },
  { regionId: 'peEsquerdo',        type: 'ellipse', attrs: { cx: 212, cy: 367, rx: 14, ry: 9 } },
]

// ── Shape renderer ─────────────────────────────────────────────────────────────

function ShapeEl({
  shape, keyPrefix, value, popover, readOnly, onShapeClick,
}: {
  shape: BodyShape
  keyPrefix: string
  value: BodyMapData
  popover: PopoverState | null
  readOnly: boolean
  onShapeClick: (regionId: string, e: React.MouseEvent) => void
}) {
  const lesion = value[shape.regionId]
  const stateInfo = lesion ? LESION_STATES.find(s => s.value === lesion.status) : null
  const selected = popover?.regionId === shape.regionId

  const fill = stateInfo ? stateInfo.color : '#e5e7eb'
  const fillOpacity = stateInfo ? 0.45 : 1
  const stroke = selected ? '#0ea5e9' : stateInfo ? stateInfo.color : '#d1d5db'
  const strokeWidth = selected ? 2 : 1.2

  const common: React.SVGProps<SVGElement> = {
    fill, fillOpacity, stroke, strokeWidth,
    style: { cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.12s' },
    onClick: readOnly ? undefined : (e: React.MouseEvent) => onShapeClick(shape.regionId, e),
  }

  const k = `${keyPrefix}-${shape.regionId}`
  if (shape.type === 'circle') {
    return <circle key={k} {...common as React.SVGProps<SVGCircleElement>}
      cx={Number(shape.attrs.cx)} cy={Number(shape.attrs.cy)} r={Number(shape.attrs.r)} />
  }
  if (shape.type === 'ellipse') {
    return <ellipse key={k} {...common as React.SVGProps<SVGEllipseElement>}
      cx={Number(shape.attrs.cx)} cy={Number(shape.attrs.cy)}
      rx={Number(shape.attrs.rx)} ry={Number(shape.attrs.ry)} />
  }
  if (shape.type === 'rect') {
    return <rect key={k} {...common as React.SVGProps<SVGRectElement>}
      x={Number(shape.attrs.x)} y={Number(shape.attrs.y)}
      width={Number(shape.attrs.width)} height={Number(shape.attrs.height)}
      rx={shape.attrs.rx != null ? Number(shape.attrs.rx) : undefined} />
  }
  // polygon
  return <polygon key={k} {...common as React.SVGProps<SVGPolygonElement>}
    points={String(shape.attrs.points)} />
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BodyMap({ value, onChange, readOnly = false }: BodyMapProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [noteText, setNoteText] = useState('')

  // Sync note textarea when popover region changes
  useEffect(() => {
    setNoteText(value[popover?.regionId ?? '']?.note ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popover?.regionId])

  // Close popover on Escape
  useEffect(() => {
    if (!popover) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopover(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [popover])

  const handleShapeClick = (regionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (popover?.regionId === regionId) { setPopover(null); return }
    setPopover({ regionId, px: e.clientX, py: e.clientY })
  }

  const handleStatusChange = (status: LesionStatus) => {
    if (!popover || !onChange) return
    onChange({ ...value, [popover.regionId]: { status, note: noteText } })
  }

  const handleNoteChange = (note: string) => {
    setNoteText(note)
    if (!popover || !onChange) return
    const status = value[popover.regionId]?.status
    if (!status) return
    onChange({ ...value, [popover.regionId]: { status, note } })
  }

  const handleClear = () => {
    if (!popover || !onChange) return
    const next = { ...value }
    delete next[popover.regionId]
    onChange(next)
    setPopover(null)
  }

  const markedEntries = Object.entries(value)
  const currentLesion = popover ? value[popover.regionId] : null

  return (
    <div className="border border-sky-200 rounded-xl bg-white p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Mapa Corporal de Lesões
      </p>

      <div className="flex gap-4 items-start">
        {/* ── SVG silhouettes ── */}
        <div className="flex-shrink-0">
          <svg
            viewBox="0 0 260 400"
            width={260}
            height={400}
            onClick={() => setPopover(null)}
          >
            {/* Divider */}
            <line x1="128" y1="8" x2="128" y2="388" stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="4 3" />
            {/* View labels */}
            <text x="60" y="392" fontSize="9" fill="#9ca3af" textAnchor="middle">Frontal</text>
            <text x="200" y="392" fontSize="9" fill="#9ca3af" textAnchor="middle">Dorsal</text>

            {/* Frontal shapes */}
            {FRONTAL.map(shape => (
              <ShapeEl
                key={`f-${shape.regionId}`}
                shape={shape}
                keyPrefix="f"
                value={value}
                popover={popover}
                readOnly={readOnly}
                onShapeClick={handleShapeClick}
              />
            ))}

            {/* Dorsal shapes */}
            {DORSAL.map(shape => (
              <ShapeEl
                key={`d-${shape.regionId}`}
                shape={shape}
                keyPrefix="d"
                value={value}
                popover={popover}
                readOnly={readOnly}
                onShapeClick={handleShapeClick}
              />
            ))}
          </svg>
        </div>

        {/* ── Legend panel ── */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Regiões Marcadas
          </p>

          {markedEntries.length === 0 ? (
            <p className="text-xs text-gray-400 leading-relaxed">
              {readOnly
                ? 'Nenhuma lesão registrada.'
                : 'Clique nas regiões do corpo para marcar lesões.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {markedEntries.map(([regionId, lesion]) => {
                const si = LESION_STATES.find(s => s.value === lesion.status)
                return (
                  <div
                    key={regionId}
                    className="flex items-start gap-2 bg-gray-50 rounded-lg px-2.5 py-2"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: si?.color ?? '#e5e7eb' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 leading-tight">
                        {REGION_LABELS[regionId] ?? regionId}
                      </p>
                      <p className="text-xs text-gray-500">{si?.label ?? lesion.status}</p>
                      {lesion.note && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{lesion.note}</p>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => {
                          const next = { ...value }
                          delete next[regionId]
                          onChange?.(next)
                          if (popover?.regionId === regionId) setPopover(null)
                        }}
                        className="text-gray-300 hover:text-red-400 text-base leading-none flex-shrink-0 mt-0.5"
                        title="Remover"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!readOnly && markedEntries.length > 0 && (
            <button
              onClick={() => { onChange?.({}); setPopover(null) }}
              className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Limpar tudo
            </button>
          )}

          {/* State legend */}
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Legenda</p>
            {LESION_STATES.map(s => (
              <div key={s.value} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Popover ── */}
      {popover && !readOnly && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-52"
          style={{ left: popover.px + 14, top: popover.py - 24 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-gray-700 truncate pr-2">
              {REGION_LABELS[popover.regionId] ?? popover.regionId}
            </p>
            <button
              onClick={() => setPopover(null)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status buttons */}
          <div className="space-y-1 mb-2">
            {LESION_STATES.map(s => {
              const active = currentLesion?.status === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                  style={{
                    backgroundColor: active ? `${s.color}22` : 'transparent',
                    border: `1px solid ${active ? s.color : '#e5e7eb'}`,
                    color: active ? s.color : '#6b7280',
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Note — only if region is already marked */}
          {currentLesion && (
            <>
              <label className="text-xs text-gray-500 mb-1 block">Nota</label>
              <textarea
                value={noteText}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder="Observação (opcional)"
                rows={2}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none"
              />
              <button
                onClick={handleClear}
                className="mt-1.5 w-full text-xs text-red-400 hover:text-red-600 transition-colors py-0.5"
              >
                Remover marcação
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
