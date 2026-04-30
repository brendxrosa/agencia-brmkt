'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Bell, MessageCircle, CheckSquare, DollarSign, Calendar, AlertTriangle, X } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import Link from 'next/link'

interface Notificacao {
  id: string
  tipo: 'mensagem' | 'aprovacao' | 'pagamento' | 'evento' | 'contrato'
  titulo: string
  descricao: string
  href: string
  lida: boolean
  data: string
}

const TIPO_CONFIG = {
  mensagem: { icon: MessageCircle, cor: 'text-vinho bg-rosa-pale' },
  aprovacao: { icon: CheckSquare, cor: 'text-orange-600 bg-orange-50' },
  pagamento: { icon: DollarSign, cor: 'text-red-600 bg-red-50' },
  evento: { icon: Calendar, cor: 'text-blue-600 bg-blue-50' },
  contrato: { icon: AlertTriangle, cor: 'text-orange-500 bg-orange-50' },
}

export default function NotificacoesSino() {
  const supabase = createClient()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const [lidas, setLidas] = useState<Set<string>>(new Set<string>())
  const ref = useRef<HTMLDivElement>(null)

  async function carregar() {
    const hoje = new Date()

    const [
      { data: mensagens },
      { data: posts },
      { data: pagamentos },
      { data: eventos },
      { data: clientes },
    ] = await Promise.all([
      supabase.from('mensagens').select('*, clientes(nome)').eq('lida', false).neq('autor_role', 'admin').order('created_at', { ascending: false }).limit(5),
      supabase.from('posts').select('*, clientes(nome)').eq('status_interno', 'aguardando_cliente').order('created_at', { ascending: false }).limit(5),
      supabase.from('pagamentos').select('*, clientes(nome)').eq('status', 'atrasado').limit(5),
      supabase.from('eventos').select('*, clientes(nome)').eq('status', 'pendente').limit(5),
      supabase.from('clientes').select('id, nome, data_fim_contrato').eq('status', 'ativo'),
    ])

    const lista: Notificacao[] = []

    // Mensagens não lidas
    const grupos: Record<string, any[]> = {}
    ;(mensagens || []).forEach(m => {
      if (!grupos[m.cliente_id]) grupos[m.cliente_id] = []
      grupos[m.cliente_id].push(m)
    })
    Object.entries(grupos).forEach(([clienteId, msgs]) => {
      const nome = msgs[0].clientes?.nome || 'Cliente'
      lista.push({
        id: `msg-${clienteId}`,
        tipo: 'mensagem',
        titulo: `${msgs.length} mensagem(ns) de ${nome}`,
        descricao: msgs[0].conteudo?.slice(0, 60) + '...',
        href: '/dashboard',
        lida: false,
        data: msgs[0].created_at,
      })
    })

    // Posts aguardando aprovação
    ;(posts || []).forEach(p => {
      lista.push({
        id: `post-${p.id}`,
        tipo: 'aprovacao',
        titulo: `Post aguardando aprovação`,
        descricao: `${p.titulo} — ${p.clientes?.nome}`,
        href: '/dashboard/kanban',
        lida: false,
        data: p.created_at,
      })
    })

    // Pagamentos atrasados
    ;(pagamentos || []).forEach(p => {
      lista.push({
        id: `pag-${p.id}`,
        tipo: 'pagamento',
        titulo: `Pagamento atrasado`,
        descricao: `${p.clientes?.nome} — R$ ${p.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        href: '/dashboard/financeiro',
        lida: false,
        data: p.vencimento,
      })
    })

    // Eventos pendentes
    ;(eventos || []).forEach(e => {
      lista.push({
        id: `evento-${e.id}`,
        tipo: 'evento',
        titulo: `Solicitação de evento`,
        descricao: `${e.titulo} — ${e.clientes?.nome}`,
        href: '/dashboard/agenda',
        lida: false,
        data: e.data_inicio,
      })
    })

    // Contratos vencendo
    ;(clientes || []).forEach(c => {
      if (!c.data_fim_contrato) return
      const dias = differenceInDays(parseISO(c.data_fim_contrato), hoje)
      if (dias >= 0 && dias <= 30) {
        lista.push({
          id: `contrato-${c.id}`,
          tipo: 'contrato',
          titulo: `Contrato vencendo em ${dias} dia(s)`,
          descricao: c.nome,
          href: '/dashboard/clientes',
          lida: false,
          data: c.data_fim_contrato,
        })
      }
    })

    // Ordena por data mais recente
    lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

    setNotificacoes(lista)
  }

  useEffect(() => { carregar() }, [])

  // Polling a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(carregar, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const naoLidas = notificacoes.filter(n => !lidas.has(n.id)).length

 function marcarLida(id: string) {
  setLidas(prev => {
    const novo = new Set(Array.from(prev))
    novo.add(id)
    return novo
  })
}
  
  function marcarTodasLidas() {
  setLidas(new Set(notificacoes.map(n => n.id)))
}

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setAberto(!aberto); if (!aberto) carregar() }}
        className="relative w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-creme transition-all shadow-sm">
        <Bell size={16} className="text-gray-600" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rosa rounded-full text-white text-xs font-bold flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-modal border border-gray-100 z-50 animate-slide-up overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-800">Notificações</h3>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas} className="text-xs text-vinho hover:underline">
                  Marcar todas como lidas
                </button>
              )}
              <button onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="text-center py-10">
                <Bell size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map(n => {
                const config = TIPO_CONFIG[n.tipo]
                const Icon = config.icon
                const lida = lidas.has(n.id)
                return (
                  <Link key={n.id} href={n.href}
                    onClick={() => { marcarLida(n.id); setAberto(false) }}
                    className={cn('flex items-start gap-3 px-4 py-3 hover:bg-creme transition-all border-b border-gray-50 last:border-0',
                      lida && 'opacity-50')}>
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', config.cor)}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">{n.titulo}</p>
                        {!lida && <span className="w-2 h-2 bg-rosa rounded-full flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.descricao}</p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {notificacoes.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <button onClick={() => { marcarTodasLidas(); setAberto(false) }}
                className="text-xs text-gray-400 hover:text-gray-600 w-full text-center">
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
