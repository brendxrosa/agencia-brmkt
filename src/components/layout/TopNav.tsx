'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import NotificacoesSino from '@/components/layout/NotificacoesSino'

type Link_ = { href: string; label: string; exact?: boolean }

const LINKS: Link_[] = [
  { href: '/dashboard', label: 'Hoje', exact: true },
  { href: '/dashboard/tarefas', label: 'Tarefas' },
  { href: '/dashboard/kanban', label: 'Conteúdo' },
  { href: '/dashboard/calendario', label: 'Calendário' },
  { href: '/dashboard/minha-agenda', label: 'Agenda' },
  { href: '/dashboard/docs', label: 'Docs' },
  { href: '/dashboard/financeiro', label: 'Dinheiro' },
  { href: '/dashboard/duvidas', label: 'Dúvidas' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [clientes, setClientes] = useState<{ id: string; nome: string; cor?: string; status: string }[]>([])
  const [abreClientes, setAbreClientes] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, nome, cor, status').order('nome').then(({ data }) => setClientes(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setAbreClientes(false); setMenuMobile(false) }, [pathname])

  const ativo = (l: Link_) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + '/'))

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const linkCls = (on: boolean) =>
    cn('px-3 py-2 rounded-full text-sm font-medium transition-colors',
      on ? 'bg-white/15 text-white' : 'text-offwhite/80 hover:text-white hover:bg-white/10')

  return (
    <header className="sticky top-0 z-40 bg-vinho text-offwhite">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="font-display text-3xl leading-none tracking-wide text-offwhite">BR MKT</Link>

        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className={linkCls(ativo(l))}>{l.label}</Link>
          ))}
          <div className="relative">
            <button onClick={() => setAbreClientes(v => !v)}
              className={cn(linkCls(pathname.startsWith('/dashboard/clientes')), 'flex items-center gap-1')}>
              Clientes <ChevronDown size={14} />
            </button>
            {abreClientes && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-papel text-tinta rounded-2xl shadow-modal p-2 z-50">
                {clientes.filter(c => c.status === 'ativo').map(c => (
                  <Link key={c.id} href={'/dashboard/clientes?id=' + c.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-rosa-pale">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor || '#B0546E' }} />
                    <span className="truncate">{c.nome}</span>
                  </Link>
                ))}
                {clientes.filter(c => c.status !== 'ativo').map(c => (
                  <Link key={c.id} href={'/dashboard/clientes?id=' + c.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-rosa-pale">
                    <span className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300" />
                    <span className="truncate">{c.nome} · {c.status}</span>
                  </Link>
                ))}
                <Link href="/dashboard/clientes" className="block px-3 py-2.5 rounded-xl text-sm text-rosa font-medium hover:bg-rosa-pale">
                  Todos os clientes e novo cliente
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <NotificacoesSino />
          <button onClick={sair} title="Sair" aria-label="Sair"
            className="hidden lg:flex w-10 h-10 items-center justify-center rounded-full text-offwhite/70 hover:text-white hover:bg-white/10">
            <LogOut size={18} />
          </button>
          <button onClick={() => setMenuMobile(v => !v)} aria-label="Menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/10">
            {menuMobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuMobile && (
        <div className="lg:hidden border-t border-white/10 px-4 py-3 space-y-1 bg-vinho-dark">
          {[...LINKS, { href: '/dashboard/clientes', label: 'Clientes' }, { href: '/dashboard/equipe', label: 'Equipe' }].map(l => (
            <Link key={l.href} href={l.href} className="block px-3 py-3 rounded-xl text-sm text-offwhite hover:bg-white/10">{l.label}</Link>
          ))}
          <button onClick={sair} className="block w-full text-left px-3 py-3 rounded-xl text-sm text-offwhite/70 hover:bg-white/10">Sair</button>
        </div>
      )}
    </header>
  )
}
