'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Calendar, CheckSquare, MessageCircle, HelpCircle, LogOut,
  CalendarDays, FileText, LayoutDashboard, User, Menu, X
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/cliente', label: 'Início', icon: LayoutDashboard, badge: false },
  { href: '/cliente/calendario', label: 'Calendário', icon: Calendar, badge: false },
  { href: '/cliente/aprovacoes', label: 'Aprovações', icon: CheckSquare, badge: true },
  { href: '/cliente/agenda', label: 'Agenda', icon: CalendarDays, badge: false },
  { href: '/cliente/mensagens', label: 'Mensagens', icon: MessageCircle, badge: false },
  { href: '/cliente/docs', label: 'Documentos', icon: FileText, badge: false },
  { href: '/cliente/suporte', label: 'Suporte', icon: HelpCircle, badge: false },
  { href: '/cliente/briefings', label: 'Briefings', icon: FileText, badge: false },
  { href: '/cliente/perfil', label: 'Perfil', icon: User, badge: false },
]

export default function ClienteNav({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileAberto, setMobileAberto] = useState(false)
  const [pendentes, setPendentes] = useState(0)

  const clienteInfo = profile?.clientes
  const cor = clienteInfo?.cor || '#6B0F2A'

  useEffect(() => {
    async function contarPendentes() {
      if (!clienteInfo?.id) return
      const [{ count: posts }, { count: docs }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true })
          .eq('cliente_id', clienteInfo.id).eq('status_interno', 'aguardando_cliente'),
        supabase.from('docs').select('*', { count: 'exact', head: true })
          .eq('cliente_id', clienteInfo.id).eq('status_aprovacao', 'aguardando')
      ])
      setPendentes((posts || 0) + (docs || 0))
    }
    contarPendentes()
    const interval = setInterval(contarPendentes, 30000)
    return () => clearInterval(interval)
  }, [clienteInfo?.id])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/cliente-login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/cliente') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: cor }}>
                {clienteInfo?.nome?.charAt(0) || 'C'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{clienteInfo?.nome || 'Portal'}</p>
                <p className="text-xs text-gray-400">Agência BR MKT</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map(({ href, label, icon: Icon, badge }) => {
                const ativo = isActive(href)
                const temPendente = badge && pendentes > 0
                return (
                  <Link key={href} href={href}
                    className={cn(
                      'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all',
                      ativo ? 'bg-vinho text-white' : 'text-gray-500 hover:bg-creme hover:text-gray-700',
                      // destaque pulsante quando tem pendente e NÃO está na aba
                      temPendente && !ativo && 'text-rosa font-semibold'
                    )}>
                    <Icon size={14} className={cn(temPendente && !ativo && 'text-rosa')} />
                    <span>{label}</span>
                    {temPendente && (
                      <span className={cn(
                        'absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs font-bold flex items-center justify-center',
                        ativo ? 'bg-white text-vinho' : 'bg-rosa animate-pulse'
                      )}>
                        {pendentes > 9 ? '9+' : pendentes}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <LogOut size={14} />
                <span>Sair</span>
              </button>
              <button onClick={() => setMobileAberto(true)}
                className="md:hidden w-9 h-9 rounded-xl bg-creme flex items-center justify-center relative">
                <Menu size={18} className="text-gray-600" />
                {pendentes > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rosa rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileAberto && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileAberto(false)} />
      )}

      <div className={cn(
        'md:hidden fixed top-0 right-0 h-screen w-72 bg-white z-50 shadow-xl transition-transform duration-300 flex flex-col',
        mobileAberto ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: cor }}>
              {clienteInfo?.nome?.charAt(0) || 'C'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{clienteInfo?.nome || 'Portal'}</p>
              <p className="text-xs text-gray-400">Agência BR MKT</p>
            </div>
          </div>
          <button onClick={() => setMobileAberto(false)} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const ativo = isActive(href)
            const temPendente = badge && pendentes > 0
            return (
              <Link key={href} href={href}
                onClick={() => setMobileAberto(false)}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  ativo ? 'bg-vinho text-white' : 'text-gray-600 hover:bg-creme',
                  temPendente && !ativo && 'text-rosa'
                )}>
                <Icon size={18} />
                {label}
                {temPendente && (
                  <span className={cn(
                    'ml-auto w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center',
                    ativo ? 'bg-white text-vinho' : 'bg-rosa animate-pulse'
                  )}>
                    {pendentes > 9 ? '9+' : pendentes}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

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
