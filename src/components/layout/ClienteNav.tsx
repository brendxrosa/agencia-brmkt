'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Calendar, CheckSquare, MessageCircle, HelpCircle, LogOut } from 'lucide-react'

const navItems = [
  { href: '/cliente/calendario', label: 'Calendário', icon: Calendar },
  { href: '/cliente/aprovacoes', label: 'Aprovações', icon: CheckSquare },
  { href: '/cliente/agenda', label: 'Agenda', icon: Calendar },
  { href: '/cliente/mensagens', label: 'Mensagens', icon: MessageCircle },
  { href: '/cliente/suporte', label: 'Suporte', icon: HelpCircle },
]

export default function ClienteNav({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/cliente-login')
    router.refresh()
  }

  const cliente = profile?.clientes
  const cor = cliente?.cor || '#6B0F2A'

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + cliente */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: cor }}>
              {cliente?.nome?.charAt(0) || 'C'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{cliente?.nome || 'Portal'}</p>
              <p className="text-xs text-gray-400">Agência BR MKT</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                    active ? 'bg-vinho text-white' : 'text-gray-500 hover:bg-creme hover:text-gray-700'
                  )}>
                  <Icon size={14} />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={14} />
            <span className="hidden sm:block">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
