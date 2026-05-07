'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  Bot,
  FileText,
  Settings,
  Stethoscope,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Shield,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inbox', icon: MessageSquare, label: 'Inbox WhatsApp' },
  { href: '/patients', icon: Users, label: 'Pacientes' },
  { href: '/calendar', icon: Calendar, label: 'Agenda' },
  { href: '/agents', icon: Bot, label: 'Agentes IA' },
  { href: '/documents', icon: FileText, label: 'Documentos' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
]

interface SidebarProps {
  user: { name: string; email: string; role: string; avatarUrl?: string | null }
  clinicName: string
}

export function Sidebar({ user, clinicName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Sessão encerrada')
    router.push('/login')
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    DOCTOR: 'Médico',
    NURSE: 'Enfermeiro(a)',
    RECEPTIONIST: 'Recepcionista',
    ASSISTANT: 'Assistente',
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r border-gray-100 transition-all duration-300 h-screen',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-gray-100', collapsed && 'justify-center px-2')}>
        <div className="flex-shrink-0 w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{clinicName}</p>
            <p className="text-xs text-gray-400">ClinicaOS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'sidebar-item',
                active && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Admin link — apenas para ADMIN */}
      {user.role === 'ADMIN' && (
        <div className="px-2 pb-1">
          {!collapsed && <div className="border-t border-amber-100 mb-1" />}
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-amber-600 hover:bg-amber-50 cursor-pointer',
              collapsed && 'justify-center px-2',
              (pathname === '/admin' || pathname.startsWith('/admin/')) && 'bg-amber-50',
            )}
            title={collapsed ? 'Painel Admin' : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Painel Admin</span>}
          </Link>
        </div>
      )}

      {/* Notifications badge */}
      {!collapsed && (
        <div className="px-3 py-2">
          <button className="sidebar-item w-full text-gray-500 hover:text-gray-900">
            <Bell className="w-5 h-5" />
            <span>Notificações</span>
          </button>
        </div>
      )}

      {/* User */}
      <div className={cn('border-t border-gray-100 p-3', collapsed && 'flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold text-sm flex-shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{roleLabels[user.role] || user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-500" />
        )}
      </button>
    </aside>
  )
}
