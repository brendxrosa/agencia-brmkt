'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { CheckCircle, Clock, MessageCircle, FileText, Calendar, AlertCircle, CheckSquare, Square } from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function ClienteDashboardPage() {
  const supabase = createClient()
  const [cliente, setCliente] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [mensagens, setMensagens] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [tarefas, setTarefas] = useState<any[]>([])
  const [briefings, setBriefings] = useState<any[]>([])
  const [respostas, setRespostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('cliente_id, nome').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setUserName(profile.nome)

    const clienteId = profile.cliente_id

    const [{ data: c }, { data: p }, { data: m }, { data: e }, { data: t }, { data: b }, { data: r }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', clienteId).single(),
      supabase.from('posts').select('*').eq('cliente_id', clienteId)
        .in('status_interno', ['aguardando_cliente']).order('created_at', { ascending: false }),
      supabase.from('mensagens').select('*').eq('cliente_id', clienteId)
        .eq('lida', false).neq('autor_role', 'cliente'),
      supabase.from('eventos').select('*').eq('cliente_id', clienteId)
        .gte('data_inicio', new Date().toISOString()).order('data_inicio').limit(3),
      supabase.from('tarefas').select('*').eq('cliente_id', clienteId)
        .neq('status', 'concluida').order('prazo').limit(5),
      supabase.from('briefings').select('*').eq('ativo', true),
      supabase.from('briefing_respostas').select('*').eq('cliente_id', clienteId)
    ])

    setCliente(c)
    setPosts(p || [])
    setMensagens(m || [])
    setEventos(e || [])
    setTarefas(t || [])
    setBriefings(b || [])
    setRespostas(r || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">{saudacao}, {primeiroNome}! 👋</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Alertas urgentes */}
      {(posts.length > 0 || mensagens.length > 0 || briefingsPendentes.length > 0) && (
        <div className="space-y-3">
          {posts.length > 0 && (
            <Link href="/cliente/aprovacoes" className="card border-l-4 border-l-orange-400 bg-orange-50/50 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">
                  {posts.length} post(s) aguardando sua aprovação
                </p>
                <p className="text-xs text-orange-600">Clique para revisar e aprovar</p>
              </div>
              <span className="w-7 h-7 bg-orange-500 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {posts.length}
              </span>
            </Link>
          )}

          {mensagens.length > 0 && (
            <Link href="/cliente/mensagens" className="card border-l-4 border-l-vinho bg-rosa-pale/20 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <MessageCircle size={20} className="text-vinho flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-vinho">
                  {mensagens.length} mensagem(ns) não lida(s)
                </p>
                <p className="text-xs text-gray-500">Da equipe Agência BR MKT</p>
              </div>
              <span className="w-7 h-7 bg-vinho rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {mensagens.length}
              </span>
            </Link>
          )}

          {briefingsPendentes.length > 0 && (
            <Link href="/cliente/briefings" className="card border-l-4 border-l-purple-400 bg-purple-50/30 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <FileText size={20} className="text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-700">
                  {briefingsPendentes.length} briefing(s) para preencher
                </p>
                <p className="text-xs text-purple-600">Ajuda a agência a conhecer melhor sua marca</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Próximos eventos */}
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
                    <div className={cn('w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white',
                      ehHoje ? 'bg-vinho' : 'bg-gray-400')}>
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

        {/* Tarefas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Minhas tarefas</h3>
          </div>
          {tarefas.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma tarefa pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tarefas.map(tarefa => (
                <div key={tarefa.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  {tarefa.status === 'concluida'
                    ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    : <Square size={16} className="text-gray-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tarefa.titulo}</p>
                    {tarefa.prazo && (
                      <p className="text-xs text-gray-400">📅 {formatDate(tarefa.prazo)}</p>
                    )}
                  </div>
                  <span className={cn('badge text-xs flex-shrink-0', {
                    'bg-red-100 text-red-700': tarefa.prioridade === 'urgente',
                    'bg-orange-100 text-orange-700': tarefa.prioridade === 'alta',
                    'bg-blue-100 text-blue-700': tarefa.prioridade === 'media',
                    'bg-gray-100 text-gray-600': tarefa.prioridade === 'baixa',
                  })}>
                    {tarefa.prioridade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info do contrato */}
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
