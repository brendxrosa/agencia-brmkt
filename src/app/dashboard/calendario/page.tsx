'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { STATUS_POST_LABELS, STATUS_POST_CORES } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Filter, X, Paperclip, Clock, MapPin, Link } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_EVENTO_CONFIG: Record<string, { label: string; cor: string }> = {
  reuniao: { label: 'Reunião', cor: '#6B0F2A' },
  captacao: { label: 'Captação', cor: '#C2185B' },
  entrega: { label: 'Entrega', cor: '#7B1FA2' },
  pagamento: { label: 'Pagamento', cor: '#2E7D32' },
  outro: { label: 'Outro', cor: '#E65100' },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-slide-up max-h-[85vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

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
  const [itemDetalhes, setItemDetalhes] = useState<any>(null)
  const [tipoDetalhes, setTipoDetalhes] = useState<'post' | 'evento' | null>(null)

  async function carregar() {
    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')

    const [{ data: p }, { data: e }, { data: c }] = await Promise.all([
      supabase.from('posts').select('*, clientes(nome, cor)')
        .gte('data_publicacao', inicio).lte('data_publicacao', fim).order('data_publicacao'),
      supabase.from('eventos').select('*, clientes(nome, cor)')
        .gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59').order('data_inicio'),
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
      .filter(() => filtroTipo === 'todos' || filtroTipo === 'posts')

  const eventosNoDia = (dia: Date) =>
    eventosFiltrados.filter(e => isSameDay(parseISO(e.data_inicio), dia))
      .filter(() => filtroTipo === 'todos' || filtroTipo === 'eventos')

  const itensDia = diaSelecionado ? {
    posts: postsFiltrados.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), diaSelecionado)),
    eventos: eventosFiltrados.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
  } : { posts: [], eventos: [] }

  function abrirPost(post: any) {
    setItemDetalhes(post)
    setTipoDetalhes('post')
  }

  function abrirEvento(evento: any) {
    setItemDetalhes(evento)
    setTipoDetalhes('evento')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="text-gray-500 text-sm mt-1">
            {postsFiltrados.length} posts · {eventosFiltrados.length} eventos em {format(mes, 'MMMM', { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter size={14} className="text-gray-400" />
        <select className="input text-sm py-1.5 w-auto"
          value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="todos">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
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
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMes(m => subMonths(m, 1))} className="btn-ghost p-2"><ChevronLeft size={18} /></button>
            <h2 className="font-display text-lg font-semibold text-gray-800 capitalize">
              {format(mes, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setMes(m => addMonths(m, 1))} className="btn-ghost p-2"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

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
                  {ps.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center max-w-full">
                      {ps.slice(0, 4).map(p => (
                        <span key={p.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.8)' : p.clientes?.cor || '#C2185B' }} />
                      ))}
                      {ps.length > 4 && <span className={cn('text-xs', selecionado ? 'text-white/70' : 'text-gray-400')}>+{ps.length - 4}</span>}
                    </div>
                  )}
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
            {filtroCliente === 'todos' ? clientes.map(c => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                <span className="text-xs text-gray-500">{c.nome}</span>
              </div>
            )) : (
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
          <div className="card">
            <h3 className="section-title text-sm mb-3">
              {diaSelecionado ? format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
            </h3>

            {itensDia.posts.length === 0 && itensDia.eventos.length === 0 ? (
              <div className="text-center py-6">
                <Calendar size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Nenhum item neste dia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itensDia.eventos.map(evento => (
                  <button key={evento.id} onClick={() => abrirEvento(evento)}
                    className="w-full p-2.5 rounded-xl bg-vinho/5 border border-vinho/10 text-left hover:bg-vinho/10 transition-all">
                    <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                    {!evento.dia_todo && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {format(parseISO(evento.data_inicio), 'HH:mm')}
                          {evento.data_fim && ` - ${format(parseISO(evento.data_fim), 'HH:mm')}`}
                        </span>
                      </div>
                    )}
                    <span className={cn('badge text-xs mt-1', {
                      'bg-emerald-100 text-emerald-700': evento.status === 'confirmado',
                      'bg-orange-100 text-orange-700': evento.status === 'pendente',
                      'bg-red-100 text-red-700': evento.status === 'cancelado',
                    })}>{evento.status}</span>
                  </button>
                ))}

                {itensDia.posts.map(post => (
                  <button key={post.id} onClick={() => abrirPost(post)}
                    className="w-full p-2.5 rounded-xl border border-gray-100 text-left hover:bg-creme transition-all">
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
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resumo do mês */}
          <div className="card">
            <h3 className="section-title text-sm mb-3">Resumo do mês</h3>
            <div className="space-y-2">
              {[
                ['Total de posts', postsFiltrados.length, 'text-gray-800'],
                ['Publicados', postsFiltrados.filter(p => p.status_interno === 'publicado').length, 'text-emerald-700'],
                ['Aguardando aprovação', postsFiltrados.filter(p => p.status_interno === 'aguardando_cliente').length, 'text-orange-600'],
                ['Eventos', eventosFiltrados.length, 'text-gray-800'],
                ['Eventos pendentes', eventosFiltrados.filter(e => e.status === 'pendente').length, 'text-orange-600'],
              ].map(([label, value, cor]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={cn('font-semibold', cor)}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lista completa */}
      {postsFiltrados.length > 0 && (
        <div className="card">
          <h3 className="section-title text-sm mb-4">Todos os posts do mês</h3>
          <div className="space-y-1">
            {postsFiltrados.map(post => (
              <button key={post.id} onClick={() => abrirPost(post)}
                className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-creme/30 px-2 rounded-xl transition-all text-left">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: post.clientes?.cor }} />
                <div className="w-16 flex-shrink-0">
                  <p className="text-xs text-gray-400">{post.data_publicacao ? formatDate(post.data_publicacao, 'dd/MM') : '—'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                  <p className="text-xs text-gray-400">{post.clientes?.nome} · {post.tipo}</p>
                </div>
                <span className={cn('badge text-xs flex-shrink-0', STATUS_POST_CORES[post.status_interno])}>
                  {STATUS_POST_LABELS[post.status_interno]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal detalhes post */}
      <Modal open={tipoDetalhes === 'post' && !!itemDetalhes} onClose={() => { setItemDetalhes(null); setTipoDetalhes(null) }}>
        {itemDetalhes && tipoDetalhes === 'post' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: itemDetalhes.clientes?.cor }} />
                <span className="text-sm text-gray-500">{itemDetalhes.clientes?.nome}</span>
              </div>
              <button onClick={() => { setItemDetalhes(null); setTipoDetalhes(null) }} className="btn-ghost p-2"><X size={18} /></button>
            </div>

            <h2 className="font-display text-xl font-semibold text-gray-800 mb-1">{itemDetalhes.titulo}</h2>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={cn('badge text-xs', STATUS_POST_CORES[itemDetalhes.status_interno])}>
                {STATUS_POST_LABELS[itemDetalhes.status_interno]}
              </span>
              <span className="badge bg-creme text-gray-600 text-xs capitalize">{itemDetalhes.tipo}</span>
              {itemDetalhes.data_publicacao && (
                <span className="text-xs text-gray-400">📅 {formatDate(itemDetalhes.data_publicacao)}</span>
              )}
              {itemDetalhes.status_cliente && (
                <span className={cn('badge text-xs', {
                  'bg-emerald-100 text-emerald-700': itemDetalhes.status_cliente === 'aprovado',
                  'bg-red-100 text-red-700': itemDetalhes.status_cliente === 'reprovado',
                  'bg-orange-100 text-orange-700': itemDetalhes.status_cliente === 'pendente',
                })}>
                  Cliente: {itemDetalhes.status_cliente}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {itemDetalhes.tema && <div><p className="label">Tema</p><p className="text-sm text-gray-700">{itemDetalhes.tema}</p></div>}
              {itemDetalhes.direcionamento && <div><p className="label">Direcionamento</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{itemDetalhes.direcionamento}</p></div>}
              {itemDetalhes.copy && (
                <div className="bg-creme rounded-xl p-3">
                  <p className="label">Copy / Roteiro</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{itemDetalhes.copy}</p>
                </div>
              )}
              {itemDetalhes.legenda && (
                <div className="bg-creme rounded-xl p-3">
                  <p className="label">Legenda</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{itemDetalhes.legenda}</p>
                </div>
              )}
              {itemDetalhes.link_midia && (
                <div>
                  <p className="label">Mídia</p>
                  <a href={itemDetalhes.link_midia} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-vinho hover:text-rosa">
                    <Paperclip size={14} /> {itemDetalhes.tipo_midia}: {itemDetalhes.link_midia}
                  </a>
                </div>
              )}
              {itemDetalhes.feedback_cliente && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="label text-orange-600">Feedback do cliente</p>
                  <p className="text-sm text-orange-700">{itemDetalhes.feedback_cliente}</p>
                </div>
              )}
            </div>

            <button onClick={() => { setItemDetalhes(null); setTipoDetalhes(null) }} className="btn-secondary w-full mt-4 justify-center">Fechar</button>
          </div>
        )}
      </Modal>

      {/* Modal detalhes evento */}
      <Modal open={tipoDetalhes === 'evento' && !!itemDetalhes} onClose={() => { setItemDetalhes(null); setTipoDetalhes(null) }}>
        {itemDetalhes && tipoDetalhes === 'evento' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: TIPO_EVENTO_CONFIG[itemDetalhes.tipo]?.cor }}>
                  {TIPO_EVENTO_CONFIG[itemDetalhes.tipo]?.label}
                </span>
                {itemDetalhes.clientes?.nome && <span className="text-sm text-gray-400">· {itemDetalhes.clientes.nome}</span>}
              </div>
              <button onClick={() => { setItemDetalhes(null); setTipoDetalhes(null) }} className="btn-ghost p-2"><X size={18} /></button>
            </div>

            <h2 className="font-display text-xl font-semibold text-gray-800 mb-3">{itemDetalhes.titulo}</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={14} />
                {itemDetalhes.dia_todo
                  ? 'Dia todo'
                  : `${format(parseISO(itemDetalhes.data_inicio), "dd/MM 'às' HH:mm")}${itemDetalhes.data_fim ? ` até ${format(parseISO(itemDetalhes.data_fim), 'HH:mm')}` : ''}`}
              </div>
              {itemDetalhes.local && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} /> {itemDetalhes.local}
                </div>
              )}
              {itemDetalhes.link_online && (
                <a href={itemDetalhes.link_online} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-vinho hover:underline">
                  <Link size={14} /> Entrar na reunião online
                </a>
              )}
              {itemDetalhes.descricao && <p className="text-sm text-gray-600">{itemDetalhes.descricao}</p>}
              {itemDetalhes.observacoes && (
                <div className="bg-creme rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-700">{itemDetalhes.observacoes}</p>
                </div>
              )}
              <span className={cn('badge text-xs', {
                'bg-emerald-100 text-emerald-700': itemDetalhes.status === 'confirmado',
                'bg-orange-100 text-orange-700': itemDetalhes.status === 'pendente',
                'bg-red-100 text-red-700': itemDetalhes.status === 'cancelado',
              })}>{itemDetalhes.status}</span>
            </div>

            <button onClick={() => { setItemDetalhes(null); setTipoDetalhes(null) }} className="btn-secondary w-full mt-4 justify-center">Fechar</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
