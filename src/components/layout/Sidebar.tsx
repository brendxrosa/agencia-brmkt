'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, Kanban, CalendarDays,
  CheckSquare, TrendingUp, DollarSign, BarChart2, FileText,
  BookOpen, UserCheck, LogOut, ChevronLeft, ChevronRight,
  Shield, HelpCircle, ClipboardList
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/kanban', label: 'Kanban', icon: Kanban },
  { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/dashboard/prospeccao', label: 'Prospecção', icon: TrendingUp },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/metricas', label: 'Métricas', icon: BarChart2 },
  { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/dashboard/onboarding', label: 'Onboarding', icon: UserCheck },
  { href: '/dashboard/briefings', label: 'Briefings', icon: FileText },
  { href: '/dashboard/briefings/respostas', label: 'Respostas', icon: ClipboardList },
  { href: '/dashboard/duvidas', label: 'Dúvidas', icon: HelpCircle },
  { href: '/dashboard/equipe', label: 'Equipe', icon: Shield },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-vinho-dark flex flex-col transition-all duration-300 z-40 shadow-xl',
      collapsed ? 'w-16' : 'w-56'
    )}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-display font-bold text-sm">BR</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-display font-semibold text-sm leading-tight">Agência BR MKT</p>
            <p className="text-white/40 text-xs">Gestão</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              )}>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-white/10 space-y-1">
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all text-sm">
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Recolher</span></>}
        </button>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-red-300 hover:bg-white/8 transition-all text-sm">
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
