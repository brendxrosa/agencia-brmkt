'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { CheckCircle, Clock, MessageCircle, FileText, Calendar, AlertCircle, Square } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErro('Não autenticado'); setLoading(false); return }

        const { data: profile } = await supabase
          .from('profiles').select('cliente_id, nome').eq('id', user.id).single()

        if (!profile?.cliente_id) { setErro('Perfil não encontrado'); setLoading(false); return }

        setClienteId(profile.cliente_id)
        setUserName(profile.nome || '')

        const [{ data: c }, { data: p }, { data: m }, { data: e }, { data: t }, { data: b }, { data: r }] = await Promise.all([
          supabase.from('clientes').select('*').eq('id', profile.cliente_id).single(),
          supabase.from('posts').select('id, titulo, tipo, status_interno, status_cliente')
            .eq('cliente_id', profile.cliente_id)
            .eq('status_interno', 'aguardando_cliente')
            .order('created_at', { ascending: false }),
          supabase.from('mensagens').select('id, conteudo, created_at')
            .eq('cliente_id', profile.cliente_id)
            .eq('lida', false)
            .neq('autor_role', 'cliente'),
          supabase.from('eventos').select('id, titulo, data_inicio, dia_todo, link_online, status')
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

        setCliente(c || null)
        setPosts(p || [])
        setMensagens(m || [])
        setEventos(e || [])
        setTarefas(t || [])
        setBriefings(b || [])
        setRespostas(r || [])
      } catch (err) {
        setErro('Erro ao carregar dados')
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

  if (erro) return (
    <div className="card text-center py-16">
      <AlertCircle size={32} className="mx-auto mb-3 text-red-300" />
      <p className="text-gray-500">{erro}</p>
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
      {(posts.length > 0 || mensagens.length > 0 || briefingsPendentes.length > 0) && (
        <div className="space-y-3">
          {posts.length > 0 && (
            <Link href="/cliente/aprovacoes" className="card border-l-4 border-l-orange-400 bg-orange-50/50 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">{posts.length} post(s) aguardando sua aprovação</p>
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
                <p className="text-sm font-semibold text-vinho">{mensagens.length} mensagem(ns) não lida(s)</p>
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
                <p className="text-sm font-semibold text-purple-700">{briefingsPendentes.length} briefing(s) para preencher</p>
                <p className="text-xs text-purple-600">Ajuda a agência a conhecer melhor sua marca</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {posts.length === 0 && mensagens.length === 0 && briefingsPendentes.length === 0 && (
        <div className="card bg-emerald-50 border border-emerald-100 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700">Tudo em dia! Nenhuma pendência no momento. 🎉</p>
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

        {/* Tarefas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Minhas tarefas</h3>
          </div>
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
                  })}>
                    {tarefa.prioridade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info do plano */}
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
