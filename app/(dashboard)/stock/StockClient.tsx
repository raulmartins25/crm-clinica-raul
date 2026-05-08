'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Package, Plus, ArrowDown, ArrowUp, Edit2, Ban, X, Loader2,
  AlertTriangle, BarChart2, List, TrendingDown, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDefaultCategories, STOCK_UNITS } from '@/lib/stockConfig'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StockItem {
  id: string
  name: string
  description: string | null
  category: string | null
  unit: string
  quantity: number
  minQuantity: number
  maxQuantity: number | null
  costPrice: number | null
  supplier: string | null
  expirationDate: string | null
  location: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  unitCost: number | null
  totalCost: number | null
  reason: string | null
  createdAt: string
  item: { id: string; name: string; unit: string }
  performer: { id: string; name: string }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  IN: 'bg-green-100 text-green-700',
  OUT: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
}
const TYPE_LABELS: Record<string, string> = {
  IN: 'Entrada', OUT: 'Saída', ADJUSTMENT: 'Ajuste', EXPIRED: 'Descarte',
}

const OUT_REASONS = ['Uso em procedimento', 'Descarte', 'Vencimento', 'Outro']

// ── Status helpers ─────────────────────────────────────────────────────────────

function getItemStatus(item: StockItem): { label: string; className: string } {
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (item.expirationDate && new Date(item.expirationDate) <= thirtyDays && new Date(item.expirationDate) > now) {
    return { label: 'Vencimento próximo', className: 'bg-orange-100 text-orange-700' }
  }
  if (item.quantity === 0) return { label: 'Sem estoque', className: 'bg-red-100 text-red-700' }
  if (item.quantity <= item.minQuantity) return { label: 'Baixo', className: 'bg-yellow-100 text-yellow-700' }
  return { label: 'OK', className: 'bg-green-100 text-green-700' }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StockClient({
  initialItems, clinicType, sessionId, alertCount: initialAlertCount,
}: {
  initialItems: StockItem[]
  clinicType: string | null
  sessionId: string
  alertCount: number
}) {
  const categories = getDefaultCategories(clinicType)
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'report'>('stock')
  const [items, setItems] = useState<StockItem[]>(initialItems)
  const [alertCount, setAlertCount] = useState(initialAlertCount)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modals
  const [itemModal, setItemModal] = useState<'new' | 'edit' | null>(null)
  const [movementModal, setMovementModal] = useState<'in' | 'out' | null>(null)
  const [activeItem, setActiveItem] = useState<StockItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Item form
  const [itemForm, setItemForm] = useState({
    name: '', description: '', category: '', unit: 'unidade',
    quantity: '', minQuantity: '0', maxQuantity: '', costPrice: '',
    supplier: '', expirationDate: '', location: '',
  })

  // Movement form
  const [movQty, setMovQty] = useState('')
  const [movUnitCost, setMovUnitCost] = useState('')
  const [movReason, setMovReason] = useState('')
  const [movSupplier, setMovSupplier] = useState('')

  // Movements tab
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movLoading, setMovLoading] = useState(false)
  const [movFilterType, setMovFilterType] = useState('')
  const [movFilterStart, setMovFilterStart] = useState('')
  const [movFilterEnd, setMovFilterEnd] = useState('')
  const [movFilterItem, setMovFilterItem] = useState('')

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Item CRUD ───────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams({
      search,
      category: filterCategory,
      status: filterStatus,
      showInactive: showInactive ? 'true' : 'false',
    })
    const res = await fetch(`/api/stock?${params}`)
    const data = await res.json()
    setItems(data.items ?? [])
    // Refresh alert count
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    setAlertCount((data.items ?? []).filter(
      (i: StockItem) => i.quantity <= i.minQuantity || (i.expirationDate && new Date(i.expirationDate) <= thirtyDays),
    ).length)
  }, [search, filterCategory, filterStatus, showInactive])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(fetchItems, 300)
  }, [fetchItems])

  const openNewItem = () => {
    setItemForm({ name: '', description: '', category: categories[0] ?? '', unit: 'unidade', quantity: '', minQuantity: '0', maxQuantity: '', costPrice: '', supplier: '', expirationDate: '', location: '' })
    setActiveItem(null)
    setItemModal('new')
  }

  const openEditItem = (item: StockItem) => {
    setItemForm({
      name: item.name, description: item.description ?? '', category: item.category ?? '',
      unit: item.unit, quantity: String(item.quantity), minQuantity: String(item.minQuantity),
      maxQuantity: item.maxQuantity != null ? String(item.maxQuantity) : '',
      costPrice: item.costPrice != null ? String(item.costPrice) : '',
      supplier: item.supplier ?? '', expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : '',
      location: item.location ?? '',
    })
    setActiveItem(item)
    setItemModal('edit')
  }

  const saveItem = async () => {
    if (!itemForm.name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      const url = itemModal === 'edit' && activeItem ? `/api/stock/${activeItem.id}` : '/api/stock'
      const method = itemModal === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(itemModal === 'edit' ? 'Item atualizado!' : 'Item criado!')
      setItemModal(null)
      fetchItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const deactivateItem = async (item: StockItem) => {
    if (!confirm(`Desativar "${item.name}"?`)) return
    try {
      await fetch(`/api/stock/${item.id}`, { method: 'DELETE' })
      toast.success('Item desativado')
      fetchItems()
    } catch { toast.error('Erro ao desativar') }
  }

  // ── Movements ───────────────────────────────────────────────────────────────

  const openMovModal = (type: 'in' | 'out', item: StockItem) => {
    setActiveItem(item)
    setMovQty('')
    setMovUnitCost('')
    setMovReason(type === 'in' ? 'Compra mensal' : 'Uso em procedimento')
    setMovSupplier(item.supplier ?? '')
    setMovementModal(type)
  }

  const saveMovement = async () => {
    if (!activeItem || !movQty || Number(movQty) <= 0) return toast.error('Informe a quantidade')
    if (movementModal === 'out' && Number(movQty) > activeItem.quantity) {
      return toast.error(`Quantidade insuficiente. Disponível: ${activeItem.quantity} ${activeItem.unit}`)
    }
    setSaving(true)
    try {
      const type = movementModal === 'in' ? 'IN' : (movReason === 'Vencimento' ? 'EXPIRED' : 'OUT')
      const res = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: activeItem.id,
          type,
          quantity: Number(movQty),
          unitCost: movUnitCost ? Number(movUnitCost) : undefined,
          reason: movReason || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(movementModal === 'in' ? 'Entrada registrada!' : 'Saída registrada!')
      setMovementModal(null)
      fetchItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar')
    } finally { setSaving(false) }
  }

  const fetchMovements = useCallback(async () => {
    setMovLoading(true)
    const params = new URLSearchParams({
      ...(movFilterType ? { type: movFilterType } : {}),
      ...(movFilterStart ? { start: movFilterStart } : {}),
      ...(movFilterEnd ? { end: movFilterEnd } : {}),
      ...(movFilterItem ? { itemId: movFilterItem } : {}),
    })
    const res = await fetch(`/api/stock/movements?${params}`)
    const data = await res.json()
    setMovements(data.movements ?? [])
    setMovLoading(false)
  }, [movFilterType, movFilterStart, movFilterEnd, movFilterItem])

  useEffect(() => {
    if (activeTab === 'movements') fetchMovements()
  }, [activeTab, fetchMovements])

  // ── PDF Export ──────────────────────────────────────────────────────────────

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF()
    function n(str: string) { return str.normalize('NFD').replace(/[̀-ͯ]/g, '') }

    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    const activeItems = items.filter(i => i.active)
    const criticalItems = activeItems.filter(i => i.quantity <= i.minQuantity)
    const expiringItems = activeItems.filter(
      i => i.expirationDate && new Date(i.expirationDate) <= sixtyDays && new Date(i.expirationDate) > now,
    )
    const hasPrice = activeItems.some(i => i.costPrice != null)
    const totalValue = activeItems.reduce((sum, i) => sum + (i.costPrice ?? 0) * i.quantity, 0)

    let y = 20
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(n('Relatorio de Estoque'), 14, y)
    y += 8
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(n(`Gerado em: ${format(now, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`), 14, y)
    y += 12

    // KPI line
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(n(`Total de itens: ${activeItems.length}`), 14, y)
    pdf.text(n(`Itens criticos: ${criticalItems.length}`), 80, y)
    if (hasPrice) pdf.text(n(`Valor total: R$ ${totalValue.toFixed(2)}`), 150, y)
    y += 12

    // Full stock table
    pdf.setFont('helvetica', 'bold')
    pdf.text(n('ESTOQUE ATUAL'), 14, y)
    y += 6
    pdf.setFillColor(240, 240, 240)
    pdf.rect(14, y - 4, 182, 7, 'F')
    pdf.setFontSize(8)
    pdf.text('Nome', 15, y)
    pdf.text('Categoria', 75, y)
    pdf.text('Qtd', 120, y)
    pdf.text('Min', 135, y)
    pdf.text('Status', 150, y)
    y += 5

    pdf.setFont('helvetica', 'normal')
    for (const item of activeItems) {
      if (y > 270) { pdf.addPage(); y = 20 }
      const status = getItemStatus(item)
      pdf.text(n(item.name.slice(0, 32)), 15, y)
      pdf.text(n((item.category ?? '-').slice(0, 18)), 75, y)
      pdf.text(`${item.quantity} ${item.unit}`, 120, y)
      pdf.text(String(item.minQuantity), 135, y)
      pdf.text(n(status.label), 150, y)
      y += 5
    }

    // Critical section
    if (criticalItems.length > 0) {
      y += 8
      if (y > 260) { pdf.addPage(); y = 20 }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text(n('ITENS CRITICOS'), 14, y)
      y += 6
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      for (const item of criticalItems) {
        if (y > 270) { pdf.addPage(); y = 20 }
        pdf.text(n(`• ${item.name}: ${item.quantity} ${item.unit} (minimo: ${item.minQuantity})`), 15, y)
        y += 5
      }
    }

    // Expiring section
    if (expiringItems.length > 0) {
      y += 8
      if (y > 260) { pdf.addPage(); y = 20 }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text(n('VENCIMENTOS PROXIMOS (60 dias)'), 14, y)
      y += 6
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      for (const item of expiringItems) {
        if (y > 270) { pdf.addPage(); y = 20 }
        const exp = item.expirationDate ? format(new Date(item.expirationDate), 'dd/MM/yyyy') : '-'
        pdf.text(n(`• ${item.name}: vence em ${exp}`), 15, y)
        y += 5
      }
    }

    pdf.save(`estoque-${format(now, 'yyyy-MM-dd')}.pdf`)
    toast.success('PDF exportado!')
  }

  // ── Filtered items ──────────────────────────────────────────────────────────

  const filteredItems = items // Server-side filtered; local state reflects API response

  // Movement totals
  const totalIn = movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0)
  const totalOut = movements.filter(m => m.type !== 'IN').reduce((s, m) => s + m.quantity, 0)
  const totalCost = movements.filter(m => m.type === 'IN' && m.totalCost != null).reduce((s, m) => s + (m.totalCost ?? 0), 0)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-gray-500 text-sm mt-1">Controle de materiais e insumos</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {([
            { id: 'stock', icon: Package, label: 'Estoque' },
            { id: 'movements', icon: List, label: 'Movimentações' },
            { id: 'report', icon: BarChart2, label: 'Relatório' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition',
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && activeTab === 'stock' && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{alertCount}</strong> item(ns) com estoque abaixo do mínimo ou com vencimento próximo.
          </p>
          <button
            onClick={() => setFilterStatus('low')}
            className="ml-auto text-xs text-yellow-700 underline hover:text-yellow-900 flex-shrink-0"
          >
            Ver itens críticos
          </button>
        </div>
      )}

      {/* ── STOCK TAB ── */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="flex-1 min-w-[180px] px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos os status</option>
              <option value="ok">Estoque OK</option>
              <option value="low">Estoque Baixo</option>
              <option value="empty">Sem Estoque</option>
              <option value="expiring">Vencimento próximo</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="accent-sky-500"
              />
              Inativos
            </label>
            <button
              onClick={openNewItem}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition ml-auto"
            >
              <Plus className="w-4 h-4" />
              Novo Item
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nome', 'Categoria', 'Unidade', 'Quantidade', 'Mínimo', 'Validade', 'Localização', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(item => {
                  const status = getItemStatus(item)
                  return (
                    <tr key={item.id} className={cn('hover:bg-gray-50', !item.active && 'opacity-50')}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.category ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.minQuantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.expirationDate ? format(new Date(item.expirationDate), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openMovModal('in', item)}
                            title="Entrada"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openMovModal('out', item)}
                            title="Saída"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            title="Editar"
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.active && (
                            <button
                              onClick={() => deactivateItem(item)}
                              title="Desativar"
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum item encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MOVEMENTS TAB ── */}
      {activeTab === 'movements' && (
        <div className="flex flex-col flex-1 gap-4">
          {/* Movement filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={movFilterType}
              onChange={e => setMovFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              value={movFilterItem}
              onChange={e => setMovFilterItem(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos os itens</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input
              type="date"
              value={movFilterStart}
              onChange={e => setMovFilterStart(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              type="date"
              value={movFilterEnd}
              onChange={e => setMovFilterEnd(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={fetchMovements}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition"
            >
              Filtrar
            </button>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
            {movLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
            ) : (
              <>
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Data', 'Item', 'Tipo', 'Quantidade', 'Custo unit.', 'Total', 'Motivo', 'Realizado por'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {movements.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {format(new Date(m.createdAt), 'dd/MM/yy HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.item.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[m.type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TYPE_LABELS[m.type] ?? m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{m.quantity} {m.item.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {m.unitCost != null ? `R$ ${m.unitCost.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {m.totalCost != null ? `R$ ${m.totalCost.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.reason ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.performer.name}</td>
                      </tr>
                    ))}
                    {movements.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                          Nenhuma movimentação encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Totals footer */}
                {movements.length > 0 && (
                  <div className="flex gap-6 px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                      Entradas: <strong>{totalIn}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                      Saídas: <strong>{totalOut}</strong>
                    </span>
                    <span>Custo total entradas: <strong>R$ {totalCost.toFixed(2)}</strong></span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === 'report' && (
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Relatório de Estoque</h2>
            <p className="text-sm text-gray-500 mb-5">
              Visão consolidada do estoque atual, itens críticos e vencimentos.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total de Itens', value: items.filter(i => i.active).length, color: 'bg-sky-50 text-sky-700' },
                { label: 'Itens Críticos', value: items.filter(i => i.active && i.quantity <= i.minQuantity).length, color: 'bg-red-50 text-red-700' },
                { label: 'Sem Estoque', value: items.filter(i => i.active && i.quantity === 0).length, color: 'bg-orange-50 text-orange-700' },
                {
                  label: 'Valor Total',
                  value: `R$ ${items.filter(i => i.active && i.costPrice != null).reduce((s, i) => s + (i.costPrice ?? 0) * i.quantity, 0).toFixed(2)}`,
                  color: 'bg-green-50 text-green-700',
                },
              ].map(kpi => (
                <div key={kpi.label} className={`rounded-lg p-4 ${kpi.color}`}>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs mt-1 opacity-80">{kpi.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition"
            >
              <BarChart2 className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      )}

      {/* ── ITEM MODAL ── */}
      {itemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {itemModal === 'new' ? 'Novo Item' : `Editar — ${activeItem?.name}`}
              </h2>
              <button onClick={() => setItemModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</label>
                  <input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Luva descartável"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
                  <input value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
                  <select value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Unidade</label>
                  <select value={itemForm.unit} onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {itemModal === 'new' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Quantidade inicial</label>
                    <input type="number" value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: e.target.value }))}
                      min={0}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Qtd mínima</label>
                  <input type="number" value={itemForm.minQuantity} onChange={e => setItemForm(p => ({ ...p, minQuantity: e.target.value }))}
                    min={0}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Qtd máxima</label>
                  <input type="number" value={itemForm.maxQuantity} onChange={e => setItemForm(p => ({ ...p, maxQuantity: e.target.value }))}
                    min={0} placeholder="Opcional"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Preço de custo</label>
                  <input type="number" value={itemForm.costPrice} onChange={e => setItemForm(p => ({ ...p, costPrice: e.target.value }))}
                    min={0} step="0.01" placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Fornecedor</label>
                  <input value={itemForm.supplier} onChange={e => setItemForm(p => ({ ...p, supplier: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Data de validade</label>
                  <input type="date" value={itemForm.expirationDate} onChange={e => setItemForm(p => ({ ...p, expirationDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Localização</label>
                  <input value={itemForm.location} onChange={e => setItemForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="Ex: Armário 2, Prateleira A"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button onClick={() => setItemModal(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={saveItem} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOVEMENT MODAL ── */}
      {movementModal && activeItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {movementModal === 'in' ? (
                  <><ArrowDown className="w-4 h-4 text-green-500" /> Registrar Entrada</>
                ) : (
                  <><ArrowUp className="w-4 h-4 text-red-500" /> Registrar Saída</>
                )}
              </h2>
              <button onClick={() => setMovementModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                <strong>{activeItem.name}</strong> — {activeItem.quantity} {activeItem.unit} em estoque
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Quantidade *{movementModal === 'out' && ` (máx: ${activeItem.quantity})`}
                </label>
                <input
                  type="number" value={movQty} onChange={e => setMovQty(e.target.value)}
                  min={0.01} max={movementModal === 'out' ? activeItem.quantity : undefined} step="any"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              {movementModal === 'in' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Custo unitário (R$)
                      {movQty && movUnitCost ? (
                        <span className="ml-1 text-xs text-gray-400">
                          Total: R$ {(Number(movQty) * Number(movUnitCost)).toFixed(2)}
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="number" value={movUnitCost} onChange={e => setMovUnitCost(e.target.value)}
                      min={0} step="0.01" placeholder="Opcional"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fornecedor</label>
                    <input value={movSupplier} onChange={e => setMovSupplier(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                </>
              )}
              {movementModal === 'out' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo</label>
                  <select value={movReason} onChange={e => setMovReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    {OUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {movReason === 'Vencimento' && (
                    <p className="text-xs text-orange-600 mt-1">Este item será registrado como Descarte por Vencimento.</p>
                  )}
                </div>
              )}
              {movementModal === 'in' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo</label>
                  <input value={movReason} onChange={e => setMovReason(e.target.value)}
                    placeholder="Ex: Compra mensal"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button onClick={() => setMovementModal(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={saveMovement} disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60',
                  movementModal === 'in'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white',
                )}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {movementModal === 'in' ? 'Registrar Entrada' : 'Registrar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
