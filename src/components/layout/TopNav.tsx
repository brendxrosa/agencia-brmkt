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

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [clientes, setClientes] = useState<{ id: string; nome: string; status: string }[]>([])
  const [abreCli, setAbreCli] = useState(false)
  const [abreMais, setAbreMais] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, nome, status').order('nome').then(({ data }) => setClientes(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setAbreCli(false); setAbreMais(false) }, [pathname])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const nav = 'text-[15px] text-[#F1E6D2] no-underline px-1 py-2.5 inline-block bg-transparent border-0 cursor-pointer font-body hover:text-white'
  const dd = 'block px-3.5 py-3 rounded-[10px] no-underline text-[#2B1218] text-[15px] hover:bg-[#F5CFC8] hover:text-[#5A1A2B]'
  const painel = 'absolute top-full left-0 bg-[#FBF6EC] rounded-[14px] p-2 min-w-[250px] shadow-[0_12px_32px_rgba(43,18,24,0.25)]'

  return (
    <header className="bg-[#5A1A2B] text-[#F1E6D2] flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 lg:px-12 py-3.5 relative z-20">
      <Link href="/dashboard" className="font-display text-[30px] tracking-[0.5px] text-[#F1E6D2]">BR MKT</Link>

      <nav className="flex flex-wrap items-center gap-x-7 gap-y-1">
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
        <Link className={nav} href="/dashboard#tarefas">Tarefas e agenda</Link>
        <Link className={nav} href="/dashboard#conteudo">Conteúdo geral</Link>
        <Link className={nav} href="/dashboard#inbox">Caixa de entrada</Link>
        <Link className={nav} href="/dashboard#abas">Estratégia · Dinheiro · Prompts</Link>
        <div className="relative">
          <button className={nav} onClick={() => { setAbreMais(v => !v); setAbreCli(false) }}>Mais ▾</button>
          {abreMais && (
            <div className={painel}>
              {MAIS.map(l => <Link key={l.href} href={l.href} className={dd}>{l.label}</Link>)}
            </div>
          )}
        </div>
      </nav>

      <div className="flex items-center gap-3">
        <NotificacoesSino />
        <Link href="/cliente" className="bg-[#D4F25A] text-[#2B3A00] no-underline font-bold text-sm px-5 py-3 rounded-full hover:text-[#2B3A00]">Ver portal da Ana</Link>
        <button onClick={sair} className={nav}>Sair</button>
      </div>
    </header>
  )
}
