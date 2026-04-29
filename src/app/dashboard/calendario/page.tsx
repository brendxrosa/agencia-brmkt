'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { STATUS_POST_LABELS, STATUS_POST_CORES } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function CalendarioPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [mes, setMes] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')

    const [{ data: p }, { data: e }, { data: c }] = await Promise.all([
      supabase.from('posts').select('*, clientes(nome, cor)')
        .gte('data_publicacao', inicio)
        .lte('data_publicacao', fim)
        .order('data_publicacao'),
      supabase.from('eventos').select('*, clientes(nome, cor)')
        .gte('data_inicio', inicio)
        .lte('data_inicio', fim + 'T23:59:59')
        .order('data_inicio'),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])

    setPosts(p || [])
    setEventos(e || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mes])

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) })
  const primeiroDia = startOfMonth(mes).getDay()
  const diasVazios = Array(primeiroDia).fill(null)

  const postsFiltrados = posts.filter(p => filtroCliente === 'todos' || p.cliente_id === filtroCliente)
  const eventosFiltrados = eventos.filter(e => filtroCliente === 'todos' || e.cliente_id === filtroCliente)

  const postsNoDia = (dia: Date) =>
    postsFiltrados.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), dia))
      .filter(p => filtroTipo === 'todos' || filtroTipo === 'posts')

  const eventosNoDia = (dia: Date) =>
    eventosFiltrados.filter(e => isSameDay(parseISO(e.data_inicio), dia))
      .filter(e => filtroTipo === 'todos' || filtroTipo === 'eventos')

  const itensDia = diaSelecionado ? {
    posts: postsFiltrados.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), diaSelecionado)),
    eventos: eventosFiltrados.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
  } : { posts: [], eventos: [] }

  const totalPostsMes = postsFiltrados.length
  const totalEventosMes = eventosFiltrados.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalPostsMes} posts · {totalEventosMes} eventos em {format(mes, 'MMMM', { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={14} />
        </div>

        {/* Filtro cliente */}
        <select className="input text-sm py-1.5 w-auto"
          value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="todos">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        {/* Filtro tipo */}
        <div className="flex gap-1 bg-creme rounded-xl p-1">
          {[['todos','Todos'],['posts','Posts'],['eventos','Eventos']].map(([v,l]) => (
            <button key={v} onClick={() => setFiltroTipo(v)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filtroTipo === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário */}
        <div className="lg:col-span-2 card">
          {/* Nav mês */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMes(m => subMonths(m, 1))} className="btn-ghost p-2">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-lg font-semibold text-gray-800 capitalize">
              {format(mes, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setMes(m => addMonths(m, 1))} className="btn-ghost p-2">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grade */}
          <div className="grid grid-cols-7 gap-1">
            {diasVazios.map((_, i) => <div key={`v-${i}`} />)}
            {diasDoMes.map(dia => {
              const ps = postsNoDia(dia)
              const es = eventosNoDia(dia)
              const selecionado = diaSelecionado && isSameDay(dia, diaSelecionado)
              const hoje = isToday(dia)
              const fds = dia.getDay() === 0 || dia.getDay() === 6

              return (
                <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                  className={cn(
                    'relative p-1 rounded-xl text-sm transition-all min-h-14 flex flex-col items-center gap-0.5',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : 'hover:bg-creme',
                    fds && !selecionado && 'text-gray-400'
                  )}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>

                  {/* Pontos de posts por cliente */}
                  {ps.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center max-w-full">
                      {ps.slice(0, 4).map(p => (
                        <span key={p.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.8)' : p.clientes?.cor || '#C2185B' }} />
                      ))}
                      {ps.length > 4 && (
                        <span className={cn('text-xs', selecionado ? 'text-white/70' : 'text-gray-400')}>+{ps.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Pontos de eventos */}
                  {es.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {es.slice(0, 2).map(e => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.5)' : '#6B0F2A' }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {filtroCliente === 'todos' ? (
              clientes.map(c => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                  <span className="text-xs text-gray-500">{c.nome}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: clientes.find(c => c.id === filtroCliente)?.cor }} />
                <span className="text-xs text-gray-500">{clientes.find(c => c.id === filtroCliente)?.nome}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-vinho/40" />
              <span className="text-xs text-gray-500">Eventos</span>
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Dia selecionado */}
          <div className="card">
            <h3 className="section-title text-sm mb-3">
              {diaSelecionado
                ? format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : 'Selecione um dia'}
            </h3>

            {itensDia.posts.length === 0 && itensDia.eventos.length === 0 ? (
              <div className="text-center py-6">
                <Calendar size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Nenhum item neste dia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itensDia.eventos.map(evento => (
                  <div key={evento.id} className="p-2.5 rounded-xl border border-vinho/10 bg-vinho/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-vinho flex-shrink-0" />
                      <span className="text-xs text-gray-400">{evento.clientes?.nome}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                    {!evento.dia_todo && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(parseISO(evento.data_inicio), 'HH:mm')}
                        {evento.data_fim && ` - ${format(parseISO(evento.data_fim), 'HH:mm')}`}
                      </p>
                    )}
                    <span className={cn('badge text-xs mt-1', {
                      'bg-emerald-100 text-emerald-700': evento.status === 'confirmado',
                      'bg-orange-100 text-orange-700': evento.status === 'pendente',
                      'bg-red-100 text-red-700': evento.status === 'cancelado',
                    })}>
                      {evento.status}
                    </span>
                  </div>
                ))}

                {itensDia.posts.map(post => (
                  <div key={post.id} className="p-2.5 rounded-xl border border-gray-100 hover:bg-creme/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: post.clientes?.cor }} />
                      <span className="text-xs text-gray-400">{post.clientes?.nome}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 capitalize">{post.tipo}</span>
                      <span className={cn('badge text-xs', STATUS_POST_CORES[post.status_interno])}>
                        {STATUS_POST_LABELS[post.status_interno]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo do mês */}
          <div className="card">
            <h3 className="section-title text-sm mb-3">Resumo do mês</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total de posts</span>
                <span className="font-semibold text-gray-800">{totalPostsMes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Publicados</span>
                <span className="font-semibold text-emerald-700">
                  {postsFiltrados.filter(p => p.status_interno === 'publicado').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Aguardando aprovação</span>
                <span className="font-semibold text-orange-600">
                  {postsFiltrados.filter(p => p.status_interno === 'aguardando_cliente').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Eventos</span>
                <span className="font-semibold text-gray-800">{totalEventosMes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Eventos pendentes</span>
                <span className="font-semibold text-orange-600">
                  {eventosFiltrados.filter(e => e.status === 'pendente').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista completa do mês */}
      {postsFiltrados.length > 0 && (
        <div className="card">
          <h3 className="section-title text-sm mb-4">Todos os posts do mês</h3>
          <div className="space-y-1">
            {postsFiltrados.map(post => (
              <div key={post.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-creme/30 px-2 rounded-xl transition-all">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: post.clientes?.cor }} />
                <div className="w-24 flex-shrink-0">
                  <p className="text-xs text-gray-400">{post.data_publicacao ? formatDate(post.data_publicacao, 'dd/MM') : '—'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                  <p className="text-xs text-gray-400">{post.clientes?.nome} · {post.tipo}</p>
                </div>
                <span className={cn('badge text-xs flex-shrink-0', STATUS_POST_CORES[post.status_interno])}>
                  {STATUS_POST_LABELS[post.status_interno]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
