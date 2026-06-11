'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { CheckCircle, Clock, MessageCircle, FileText, Calendar, AlertCircle, Square, PauseCircle, XCircle, CreditCard } from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function ClienteDashboardPage() {
  const supabase = createClient()
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [mensagens, setMensagens] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [tarefas, setTarefas] = useState<any[]>([])
  const [briefings, setBriefings] = useState<any[]>([])
  const [respostas, setRespostas] = useState<any[]>([])
  const [docsPendentes, setDocsPendentes] = useState<any[]>([])
  const [diasVencimento, setDiasVencimento] = useState<number | null>(null)
  const [pagamentosPendentes, setPagamentosPendentes] = useState<any[]>([])

  useEffect(() => {
    // Verifica role — admin/equipe não pode acessar portal do cliente
    supabase.from('profiles').select('role').then(({ data }) => {
      // pega o user atual
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/auth/cliente-login'; return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role === 'admin' || data?.role === 'equipe') {
          window.location.href = '/dashboard'
        }
      })
    })
  }, [])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [statusCliente, setStatusCliente] = useState<string>('ativo')

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: profile } = await supabase
          .from('profiles').select('cliente_id, nome').eq('id', user.id).single()

        if (!profile?.cliente_id) { setLoading(false); return }

        setClienteId(profile.cliente_id)
        setUserName(profile.nome || '')

        // Busca cliente primeiro pra checar status
        const { data: c } = await supabase.from('clientes').select('*').eq('id', profile.cliente_id).single()
        setCliente(c || null)
        setStatusCliente(c?.status || 'ativo')

        // Se pausado ou encerrado, não carrega o resto
        if (c?.status !== 'ativo') { setLoading(false); return }

        const [{ data: p }, { data: m }, { data: e }, { data: t }, { data: b }, { data: r }] = await Promise.all([
          supabase.from('posts').select('id, titulo, tipo, status_interno')
            .eq('cliente_id', profile.cliente_id)
            .eq('status_interno', 'aguardando_cliente')
            .order('created_at', { ascending: false }),
          supabase.from('mensagens').select('id, conteudo, created_at')
            .eq('cliente_id', profile.cliente_id)
            .eq('lida', false)
            .neq('autor_role', 'cliente'),
          supabase.from('eventos').select('id, titulo, data_inicio, dia_todo, link_online')
            .eq('cliente_id', profile.cliente_id)
            .eq('visivel_cliente', true)
            .gte('data_inicio', new Date().toISOString())
            .order('data_inicio').limit(3),
          supabase.from('tarefas').select('id, titulo, prazo, prioridade, status')
            .eq('cliente_id', profile.cliente_id)
            .eq('visivel_cliente', true)
            .neq('status', 'concluida')
            .order('prazo'),
          supabase.from('briefings').select('id, nome').eq('ativo', true),
          supabase.from('briefing_respostas').select('briefing_id, concluido')
            .eq('cliente_id', profile.cliente_id)
        ])

        setPosts(p || [])
        setMensagens(m || [])
        setEventos(e || [])
        setTarefas(t || [])
        setBriefings(b || [])
        setRespostas(r || [])

        // Docs aguardando aprovação
        const { data: docs } = await supabase
          .from('docs').select('id, titulo, tipo')
          .eq('cliente_id', profile.cliente_id)
          .eq('status_aprovacao', 'aguardando')
          .order('updated_at', { ascending: false })
        setDocsPendentes(docs || [])

        // Dias pro próximo vencimento
        if (c?.dia_vencimento) {
          const hoje = new Date()
          let proximo = new Date(hoje.getFullYear(), hoje.getMonth(), c.dia_vencimento)
          if (proximo <= hoje) proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, c.dia_vencimento)
          setDiasVencimento(Math.ceil((proximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)))
        }

        // Pagamentos pendentes/atrasados emitidos pela agência
        const { data: pags } = await supabase
          .from('pagamentos').select('*')
          .eq('cliente_id', profile.cliente_id)
          .in('status', ['pendente', 'atrasado'])
          .order('vencimento', { ascending: true })
        setPagamentosPendentes(pags || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const briefingsPendentes = briefings.filter(b => {
    const resposta = respostas.find(r => r.briefing_id === b.id)
    return !resposta || !resposta.concluido
  })

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = userName?.split(' ')[0] || ''

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
    </div>
  )

  // Status pausado
  if (statusCliente === 'pausado') return (
    <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
      <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center">
        <PauseCircle size={32} className="text-yellow-500" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-gray-800">Conta pausada</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-sm">
          Sua conta está temporariamente pausada. Entre em contato com a agência para mais informações.
        </p>
      </div>
      <Link href="/cliente/mensagens" className="btn-primary flex items-center gap-2">
        <MessageCircle size={16} /> Falar com a agência
      </Link>
    </div>
  )

  // Status encerrado
  if (statusCliente === 'encerrado') return (
    <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
        <XCircle size={32} className="text-gray-400" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-gray-800">Contrato encerrado</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-sm">
          Seu contrato com a agência foi encerrado. Caso queira retomar a parceria, entre em contato conosco.
        </p>
      </div>
      <Link href="/cliente/mensagens" className="btn-secondary flex items-center gap-2">
        <MessageCircle size={16} /> Entrar em contato
      </Link>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{saudacao}, {primeiroNome}! 👋</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Alertas */}
      {(posts.length > 0 || mensagens.length > 0 || briefingsPendentes.length > 0 || docsPendentes.length > 0 || (diasVencimento !== null && diasVencimento <= 5) || pagamentosPendentes.length > 0) && (
        <div className="space-y-3">
          {posts.length > 0 && (
            <Link href="/cliente/aprovacoes" className="card border-l-4 border-l-orange-400 bg-orange-50/50 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">{posts.length} post(s) aguardando sua aprovação</p>
                <p className="text-xs text-orange-600">Clique para revisar e aprovar</p>
              </div>
              <span className="w-7 h-7 bg-orange-500 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{posts.length}</span>
            </Link>
          )}
          {mensagens.length > 0 && (
            <Link href="/cliente/mensagens" className="card border-l-4 border-l-vinho bg-rosa-pale/20 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <MessageCircle size={20} className="text-vinho flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-vinho">{mensagens.length} mensagem(ns) não lida(s)</p>
                <p className="text-xs text-gray-500">Da equipe Agência BR MKT</p>
              </div>
              <span className="w-7 h-7 bg-vinho rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{mensagens.length}</span>
            </Link>
          )}
          {briefingsPendentes.length > 0 && (
            <Link href="/cliente/briefings" className="card border-l-4 border-l-purple-400 bg-purple-50/30 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <FileText size={20} className="text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-700">{briefingsPendentes.length} briefing(s) para preencher</p>
                <p className="text-xs text-purple-600">Ajuda a agência a conhecer melhor sua marca</p>
              </div>
            </Link>
          )}
          {docsPendentes.length > 0 && (
            <Link href="/cliente/aprovacoes" className="card border-l-4 border-l-blue-400 bg-blue-50/30 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <FileText size={20} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-700">{docsPendentes.length} documento(s) aguardando sua aprovação</p>
                <p className="text-xs text-blue-600">{docsPendentes[0]?.titulo}{docsPendentes.length > 1 ? ` e mais ${docsPendentes.length - 1}` : ''}</p>
              </div>
              <span className="w-7 h-7 bg-blue-500 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{docsPendentes.length}</span>
            </Link>
          )}
          {pagamentosPendentes.length > 0 && pagamentosPendentes.map(pag => {
            const venc = new Date(pag.vencimento + 'T00:00:00')
            const hoje = new Date(); hoje.setHours(0,0,0,0)
            const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
            const atrasado = pag.status === 'atrasado' || diff < 0
            return (
              <div key={pag.id} className={`card border-l-4 flex items-center gap-3 ${atrasado ? 'border-l-red-500 bg-red-50/30' : 'border-l-orange-400 bg-orange-50/20'}`}>
                <CreditCard size={20} className={atrasado ? 'text-red-500 flex-shrink-0' : 'text-orange-500 flex-shrink-0'} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${atrasado ? 'text-red-700' : 'text-orange-700'}`}>
                    {atrasado ? `⚠️ Pagamento atrasado — ${pag.mes_referencia}` : diff === 0 ? `Pagamento vence hoje — ${pag.mes_referencia}` : `Pagamento vence em ${diff} dia(s) — ${pag.mes_referencia}`}
                  </p>
                  <p className={`text-xs ${atrasado ? 'text-red-600' : 'text-orange-600'}`}>
                    R$ {pag.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Venc. {new Date(pag.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )
          })}
          {pagamentosPendentes.length === 0 && diasVencimento !== null && diasVencimento <= 5 && (
            <div className="card border-l-4 border-l-orange-400 bg-orange-50/20 flex items-center gap-3">
              <CreditCard size={20} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">
                  {diasVencimento === 0 ? 'Pagamento vence hoje!' : `Pagamento vence em ${diasVencimento} dia(s)`}
                </p>
                <p className="text-xs text-orange-600">
                  {cliente?.valor_mensal ? `R$ ${cliente.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · ` : ''}
                  Dia {cliente?.dia_vencimento} · {cliente?.forma_pagamento || 'consulte a agência'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {posts.length === 0 && mensagens.length === 0 && briefingsPendentes.length === 0 && docsPendentes.length === 0 && (diasVencimento === null || diasVencimento > 5) && pagamentosPendentes.length === 0 && (
        <div className="card bg-emerald-50 border border-emerald-100 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700">Tudo em dia! Nenhuma pendência no momento. 🎉</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Próximos eventos</h3>
            <Link href="/cliente/agenda" className="text-xs text-vinho hover:underline">Ver agenda</Link>
          </div>
          {eventos.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum evento próximo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventos.map(evento => {
                const data = parseISO(evento.data_inicio)
                const ehHoje = isToday(data)
                const ehAmanha = isTomorrow(data)
                const dias = differenceInDays(data, new Date())
                return (
                  <div key={evento.id} className={cn('flex gap-3 p-3 rounded-xl', ehHoje ? 'bg-rosa-pale/30' : 'bg-creme/50')}>
                    <div className={cn('w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white', ehHoje ? 'bg-vinho' : 'bg-gray-400')}>
                      <span className="text-xs font-medium">{format(data, 'MMM', { locale: ptBR })}</span>
                      <span className="text-lg font-bold leading-none">{format(data, 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ehHoje ? '🔴 Hoje' : ehAmanha ? '🟡 Amanhã' : `em ${dias} dias`}
                        {!evento.dia_todo && ` · ${format(data, 'HH:mm')}`}
                      </p>
                      {evento.link_online && (
                        <a href={evento.link_online} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-vinho hover:underline">🔗 Entrar na reunião</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title text-base mb-4">Minhas tarefas</h3>
          {tarefas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma tarefa pendente 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tarefas.map(tarefa => (
                <div key={tarefa.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Square size={16} className="text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tarefa.titulo}</p>
                    {tarefa.prazo && <p className="text-xs text-gray-400">📅 {formatDate(tarefa.prazo)}</p>}
                  </div>
                  <span className={cn('badge text-xs flex-shrink-0', {
                    'bg-red-100 text-red-700': tarefa.prioridade === 'urgente',
                    'bg-orange-100 text-orange-700': tarefa.prioridade === 'alta',
                    'bg-blue-100 text-blue-700': tarefa.prioridade === 'media',
                    'bg-gray-100 text-gray-600': tarefa.prioridade === 'baixa',
                  })}>{tarefa.prioridade}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cliente && (
        <div className="card border-l-4 border-l-vinho">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="section-title text-base mb-1">Meu plano</h3>
              <p className="text-sm text-gray-600">{cliente.plano} · R$ {cliente.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
              <p className="text-xs text-gray-400 mt-0.5">Vencimento todo dia {cliente.dia_vencimento}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/cliente/docs" className="btn-secondary text-sm flex items-center gap-2">
                <FileText size={14} /> Ver documentos
              </Link>
              <Link href="/cliente/mensagens" className="btn-primary text-sm flex items-center gap-2">
                <MessageCircle size={14} /> Falar com a agência
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
