'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void
  onClear: () => void
  width?: number
  height?: number
  disabled?: boolean
}

export function SignaturePad({
  onSave,
  onClear,
  width = 500,
  height = 200,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [error, setError] = useState('')

  // Fill white background on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#000000'
    return ctx
  }, [])

  const clientToCanvas = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = useCallback((x: number, y: number) => {
    if (disabled) return
    isDrawing.current = true
    const ctx = getCtx()
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [disabled, getCtx])

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawing.current || disabled) return
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
    setError('')
  }, [disabled, getCtx])

  const stopDrawing = useCallback(() => {
    isDrawing.current = false
  }, [])

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = clientToCanvas(canvasRef.current!, e.clientX, e.clientY)
    startDrawing(x, y)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = clientToCanvas(canvasRef.current!, e.clientX, e.clientY)
    draw(x, y)
  }

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const { x, y } = clientToCanvas(canvasRef.current!, touch.clientX, touch.clientY)
    startDrawing(x, y)
  }

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const { x, y } = clientToCanvas(canvasRef.current!, touch.clientX, touch.clientY)
    draw(x, y)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setError('')
    onClear()
  }

  const handleSave = () => {
    if (!hasDrawn) {
      setError('Por favor, assine antes de confirmar')
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full border border-gray-300 rounded-lg bg-white touch-none"
        style={{ height: '200px', cursor: disabled ? 'default' : 'crosshair' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={stopDrawing}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!disabled && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition font-medium"
          >
            Confirmar Assinatura
          </button>
        </div>
      )}
    </div>
  )
}
