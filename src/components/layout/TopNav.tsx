'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificacoesSino from '@/components/layout/NotificacoesSino'

const MAIS = [
  { href: '/dashboard/kanban', label: 'Kanban de conteúdo' },
  { href: '/dashboard/calendario', label: 'Calendário' },
  { href: '/dashboard/minha-agenda', label: 'Agenda' },
  { href: '/dashboard/tarefas', label: 'Tarefas' },
  { href: '/dashboard/docs', label: 'Documentos' },
  { href: '/dashboard/financeiro', label: 'Financeiro' },
  { href: '/dashboard/duvidas', label: 'Dúvidas' },
  { href: '/dashboard/briefings', label: 'Briefings' },
  { href: '/dashboard/relatorios', label: 'Relatórios' },
  { href: '/dashboard/equipe', label: 'Equipe' },
]

const ATALHOS = [
  { href: '/dashboard#tarefas', label: 'Tarefas e agenda' },
  { href: '/dashboard#conteudo', label: 'Conteúdo geral' },
  { href: '/dashboard#inbox', label: 'Caixa de entrada' },
  { href: '/dashboard#abas', label: 'Estratégia · Dinheiro · Prompts' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [clientes, setClientes] = useState<{ id: string; nome: string; status: string }[]>([])
  const [abreCli, setAbreCli] = useState(false)
  const [abreMais, setAbreMais] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, nome, status').order('nome').then(({ data }) => setClientes(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setAbreCli(false); setAbreMais(false); setMenu(false) }, [pathname])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const nav = 'text-[15px] text-[#F1E6D2] no-underline px-1 py-2.5 inline-block bg-transparent border-0 cursor-pointer font-body hover:text-white'
  const dd = 'block px-3.5 py-3 rounded-[10px] no-underline text-[#2B1218] text-[15px] hover:bg-[#F5CFC8] hover:text-[#5A1A2B]'
  const painel = 'absolute top-full left-0 bg-[#FBF6EC] rounded-[14px] p-2 min-w-[250px] shadow-[0_12px_32px_rgba(43,18,24,0.25)]'
  const item = 'block px-3 py-2.5 rounded-lg text-[15px] text-[#F1E6D2] no-underline hover:bg-white/10'

  return (
    <header className="bg-[#5A1A2B] text-[#F1E6D2] relative z-20">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-12 py-2 lg:py-3.5">
        <Link href="/dashboard" className="font-display text-[24px] lg:text-[30px] leading-none tracking-[0.5px] text-[#F1E6D2]">BR MKT</Link>

        {/* Desktop */}
        <nav className="hidden lg:flex flex-wrap items-center gap-x-7 gap-y-1">
          <div className="relative">
            <button className={nav} onClick={() => { setAbreCli(v => !v); setAbreMais(false) }}>Clientes ▾</button>
            {abreCli && (
              <div className={painel}>
                {clientes.map(c => (
                  <Link key={c.id} href={'/dashboard/clientes?id=' + c.id} className={dd}>
                    {c.nome}{c.status !== 'ativo' ? ' (' + c.status + ')' : ''}
                  </Link>
                ))}
                <Link href="/dashboard/clientes" className={dd + ' !text-[#B0546E]'}>+ Novo cliente</Link>
              </div>
            )}
          </div>
          {ATALHOS.map(a => <Link key={a.href} className={nav} href={a.href}>{a.label}</Link>)}
          <div className="relative">
            <button className={nav} onClick={() => { setAbreMais(v => !v); setAbreCli(false) }}>Mais ▾</button>
            {abreMais && (
              <div className={painel}>
                {MAIS.map(l => <Link key={l.href} href={l.href} className={dd}>{l.label}</Link>)}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 lg:gap-3">
          <NotificacoesSino />
          <Link href="/cliente" className="bg-[#D4F25A] text-[#2B3A00] no-underline font-bold text-[12px] lg:text-sm px-3 lg:px-5 py-1.5 lg:py-3 rounded-full hover:text-[#2B3A00] whitespace-nowrap">
            <span className="lg:hidden">Portal</span><span className="hidden lg:inline">Ver portal da Ana</span>
          </Link>
          <button onClick={sair} className={nav + ' hidden lg:inline-block'}>Sair</button>
          <button onClick={() => setMenu(v => !v)} aria-label="Menu"
            className="lg:hidden w-9 h-9 rounded-full bg-white/10 text-lg leading-none text-[#F1E6D2] border-0">{menu ? '×' : '☰'}</button>
        </div>
      </div>

      {/* Celular: menu que abre e fecha */}
      {menu && (
        <div className="lg:hidden border-t border-white/10 px-3 py-2 max-h-[70vh] overflow-y-auto bg-[#4A1423]">
          <p className="px-3 pt-1 pb-1 text-[11px] uppercase tracking-wider text-[#F5CFC8]">Clientes</p>
          {clientes.map(c => (
            <Link key={c.id} href={'/dashboard/clientes?id=' + c.id} className={item}>
              {c.nome}{c.status !== 'ativo' ? ' (' + c.status + ')' : ''}
            </Link>
          ))}
          <Link href="/dashboard/clientes" className={item + ' !text-[#F5CFC8]'}>+ Novo cliente</Link>
          <p className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-[#F5CFC8]">Nesta página</p>
          {ATALHOS.map(a => <Link key={a.href} href={a.href} className={item}>{a.label}</Link>)}
          <p className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-[#F5CFC8]">Mais</p>
          {MAIS.map(l => <Link key={l.href} href={l.href} className={item}>{l.label}</Link>)}
          <button onClick={sair} className={item + ' w-full text-left bg-transparent border-0 cursor-pointer'}>Sair</button>
        </div>
      )}
    </header>
  )
}
