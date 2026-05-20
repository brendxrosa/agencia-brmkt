'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Kanban, Calendar, CalendarDays,
  CheckSquare, TrendingUp, DollarSign, BarChart2, FileText,
  BookOpen, UserCheck, LogOut, ChevronLeft, ChevronRight,
  Shield, HelpCircle, ClipboardList, ChevronDown, ChevronUp,
  Menu, X
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

const NAV_GRUPOS: NavGrupo[] = [
  {
    grupo: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    grupo: 'Clientes',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/onboarding', label: 'Onboarding', icon: UserCheck },
      { href: '/dashboard/prospeccao', label: 'Prospecção', icon: TrendingUp },
    ]
  },
  {
    grupo: 'Conteúdo',
    items: [
      { href: '/dashboard/kanban', label: 'Kanban', icon: Kanban },
      { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
      { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
    ]
  },
  {
    grupo: 'Tarefas & Docs',
    items: [
      { href: '/dashboard/tarefas', label: 'Tarefas', icon: CheckSquare },
      { href: '/dashboard/docs', label: 'Docs', icon: BookOpen },
      { href: '/dashboard/briefings', label: 'Briefings', icon: FileText },
      { href: '/dashboard/briefings/respostas', label: 'Respostas', icon: ClipboardList },
    ]
  },
  {
    grupo: 'Financeiro',
    items: [
      { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
      { href: '/dashboard/metricas', label: 'Métricas', icon: BarChart2 },
      { href: '/dashboard/relatorios', label: 'Relatórios', icon: FileText },
    ]
  },
  {
    grupo: 'Suporte',
    items: [
      { href: '/dashboard/duvidas', label: 'Dúvidas', icon: HelpCircle },
      { href: '/dashboard/equipe', label: 'Equipe', icon: Shield },
    ]
  },
]

function NavContent({
  collapsed,
  setCollapsed,
  onNavClick,
  gruposAbertos,
  toggleGrupo,
  isActive,
  handleLogout,
  showCollapseBtn,
}: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  onNavClick: () => void
  gruposAbertos: string[]
  toggleGrupo: (g: string) => void
  isActive: (href: string, exact?: boolean) => boolean
  handleLogout: () => void
  showCollapseBtn: boolean
}) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_GRUPOS.map(({ grupo, items }) => (
          <div key={grupo || 'main'}>
            {!grupo && items.map((item) => (
              <Link key={item.href} href={item.href} onClick={onNavClick}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-1',
                  isActive(item.href, item.exact) ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                )}>
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}

            {grupo && (
              <div className="mb-1">
                {!collapsed ? (
                  <button onClick={() => toggleGrupo(grupo)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-white/30 hover:text-white/50 transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wider">{grupo}</span>
                    {gruposAbertos.includes(grupo) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : (
                  <div className="border-t border-white/10 my-2" />
                )}

                {(collapsed || gruposAbertos.includes(grupo)) && (
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <Link key={item.href} href={item.href} onClick={onNavClick}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                          isActive(item.href) ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                        )}>
                        <item.icon size={16} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-white/10 space-y-1 flex-shrink-0">
        {showCollapseBtn && (
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all text-sm">
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Recolher</span></>}
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-red-300 hover:bg-white/8 transition-all text-sm">
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
  const [gruposAbertos, setGruposAbertos] = useState<string[]>([
    'Clientes', 'Conteúdo', 'Tarefas & Docs', 'Financeiro', 'Suporte'
  ])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function toggleGrupo(grupo: string) {
    setGruposAbertos(prev =>
      prev.includes(grupo) ? prev.filter(g => g !== grupo) : [...prev, grupo]
    )
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navProps = {
    gruposAbertos,
    toggleGrupo,
    isActive,
    handleLogout,
  }

  return (
    <>
      {/* Botão hamburguer — só mobile */}
      <button onClick={() => setMobileAberto(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-vinho rounded-xl flex items-center justify-center shadow-lg">
        <Menu size={20} className="text-white" />
      </button>

      {/* Overlay mobile */}
      {mobileAberto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileAberto(false)} />
      )}

      {/* Sidebar mobile — drawer */}
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
          <button onClick={() => setMobileAberto(false)} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <NavContent
          {...navProps}
          collapsed={false}
          setCollapsed={() => {}}
          onNavClick={() => setMobileAberto(false)}
          showCollapseBtn={false}
        />
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
        <NavContent
          {...navProps}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onNavClick={() => {}}
          showCollapseBtn={true}
        />
      </aside>
    </>
  )
}
