'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Kanban, Calendar, CalendarDays, CalendarClock,
  DollarSign, BookOpen, LogOut, ChevronLeft, ChevronRight,
  Shield, HelpCircle, Menu, X
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: any
  exact?: boolean
}

interface NavGrupo {
  grupo: string | null
  items: NavItem[]
}

// Ordem: Dashboard → Conteúdo → Agenda → Docs → Clientes → Financeiro → Suporte
const NAV_GRUPOS: NavGrupo[] = [
  { grupo: null, items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  ]},
  { grupo: 'Conteúdo', items: [
    { href: '/dashboard/kanban', label: 'Kanban', icon: Kanban },
    { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
  ]},
  { grupo: 'Agenda', items: [
    { href: '/dashboard/minha-agenda', label: 'Minha agenda', icon: CalendarClock },
    { href: '/dashboard/agenda', label: 'Reuniões', icon: CalendarDays },
  ]},
  { grupo: 'Docs', items: [
    { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
  ]},
  { grupo: 'Clientes', items: [
    { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  ]},
  { grupo: 'Financeiro', items: [
    { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  ]},
  { grupo: 'Suporte', items: [
    { href: '/dashboard/duvidas', label: 'Dúvidas', icon: HelpCircle },
    { href: '/dashboard/equipe', label: 'Equipe', icon: Shield },
  ]},
]

// Barra inferior do celular
const ABAS_MOBILE: NavItem[] = [
  { href: '/dashboard', label: 'Hoje', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/kanban', label: 'Kanban', icon: Kanban },
  { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
]

function NavContent({
  collapsed, setCollapsed, onNavClick, isActive, handleLogout, showCollapseBtn,
}: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  onNavClick: () => void
  isActive: (href: string, exact?: boolean) => boolean
  handleLogout: () => void
  showCollapseBtn: boolean
}) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_GRUPOS.map(({ grupo, items }) => (
          <div key={grupo || 'main'} className="mb-1">
            {grupo && !collapsed && items.length > 1 && (
              <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-white/30">{grupo}</p>
            )}
            {grupo && collapsed && <div className="border-t border-white/10 my-2" />}
            <div className="space-y-0.5">
              {items.map((item) => (
                <Link key={item.href} href={item.href} onClick={onNavClick}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive(item.href, item.exact) ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                  )}>
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-white/10 space-y-1 flex-shrink-0">
        {showCollapseBtn && (
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm">
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Recolher</span></>}
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-red-300 hover:bg-white/10 transition-all text-sm">
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileAberto, setMobileAberto] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Botão hamburguer — só mobile */}
      <button onClick={() => setMobileAberto(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-vinho rounded-xl flex items-center justify-center shadow-lg">
        <Menu size={20} className="text-white" />
      </button>

      {mobileAberto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileAberto(false)} />
      )}

      {/* Drawer mobile */}
      <aside className={cn(
        'lg:hidden fixed left-0 top-0 h-screen bg-vinho-dark flex flex-col z-50 shadow-xl transition-transform duration-300 w-72',
        mobileAberto ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">BR</span>
            </div>
            <div>
              <p className="text-white font-display font-semibold text-sm">Agência BR MKT</p>
              <p className="text-white/40 text-xs">Gestão</p>
            </div>
          </div>
          <button onClick={() => setMobileAberto(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
        </div>
        <NavContent collapsed={false} setCollapsed={() => {}} onNavClick={() => setMobileAberto(false)}
          isActive={isActive} handleLogout={handleLogout} showCollapseBtn={false} />
      </aside>

      {/* Sidebar desktop */}
      <aside className={cn(
        'hidden lg:flex fixed left-0 top-0 h-screen bg-vinho-dark flex-col transition-all duration-300 z-40 shadow-xl',
        collapsed ? 'w-16' : 'w-56'
      )}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0">
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
        <NavContent collapsed={collapsed} setCollapsed={setCollapsed} onNavClick={() => {}}
          isActive={isActive} handleLogout={handleLogout} showCollapseBtn={true} />
      </aside>

      {/* Barra inferior — só celular */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {ABAS_MOBILE.map(item => (
          <Link key={item.href} href={item.href}
            className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium',
              isActive(item.href, item.exact) ? 'text-vinho' : 'text-gray-400')}>
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
