'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Calendar, CheckSquare, MessageCircle, HelpCircle, LogOut,
  CalendarDays, FileText, LayoutDashboard, User, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/cliente', label: 'Início', icon: LayoutDashboard },
  { href: '/cliente/calendario', label: 'Calendário', icon: Calendar },
  { href: '/cliente/aprovacoes', label: 'Aprovações', icon: CheckSquare },
  { href: '/cliente/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/cliente/mensagens', label: 'Mensagens', icon: MessageCircle },
  { href: '/cliente/docs', label: 'Documentos', icon: FileText },
  { href: '/cliente/suporte', label: 'Suporte', icon: HelpCircle },
  { href: '/cliente/briefings', label: 'Briefings', icon: FileText },
  { href: '/cliente/perfil', label: 'Perfil', icon: User },
]

export default function ClienteNav({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileAberto, setMobileAberto] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/cliente-login')
    router.refresh()
  }

  const cliente = profile?.clientes
  const cor = cliente?.cor || '#6B0F2A'

  function isActive(href: string) {
    if (href === '/cliente') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo/Cliente */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: cor }}>
                {cliente?.nome?.charAt(0) || 'C'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{cliente?.nome || 'Portal'}</p>
                <p className="text-xs text-gray-400">Agência BR MKT</p>
              </div>
            </div>

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all',
                    isActive(href) ? 'bg-vinho text-white' : 'text-gray-500 hover:bg-creme hover:text-gray-700'
                  )}>
                  <Icon size={14} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Logout desktop */}
              <button onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <LogOut size={14} />
                <span>Sair</span>
              </button>

              {/* Hamburguer mobile */}
              <button onClick={() => setMobileAberto(true)}
                className="md:hidden w-9 h-9 rounded-xl bg-creme flex items-center justify-center">
                <Menu size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay mobile */}
      {mobileAberto && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileAberto(false)} />
      )}

      {/* Drawer mobile */}
      <div className={cn(
        'md:hidden fixed top-0 right-0 h-screen w-72 bg-white z-50 shadow-xl transition-transform duration-300 flex flex-col',
        mobileAberto ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header drawer */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: cor }}>
              {cliente?.nome?.charAt(0) || 'C'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{cliente?.nome || 'Portal'}</p>
              <p className="text-xs text-gray-400">Agência BR MKT</p>
            </div>
          </div>
          <button onClick={() => setMobileAberto(false)} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              onClick={() => setMobileAberto(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                isActive(href) ? 'bg-vinho text-white' : 'text-gray-600 hover:bg-creme'
              )}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </div>
    </>
  )
}
