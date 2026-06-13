'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, STATUS_POST_LABELS, STATUS_POST_CORES } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PostModal from '@/components/PostModal'

export default function ClienteCalendarioPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [mes, setMes] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(true)
  const [postAberto, setPostAberto] = useState<any>(null)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [clienteId, setClienteId] = useState('')

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('cliente_id, nome').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)
    setUserName(profile.nome || 'Cliente')
    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('posts').select('*').eq('cliente_id', profile.cliente_id)
        .gte('data_publicacao', inicio).lte('data_publicacao', fim).order('data_publicacao'),
      supabase.from('eventos').select('*').eq('cliente_id', profile.cliente_id)
        .eq('visivel_cliente', true).gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59')
    ])
    setPosts(p || [])
    setEventos(e || [])
    setLoading(false)
  }, [mes])

  useEffect(() => { carregar() }, [carregar])

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) })
  const primeiroDia = startOfMonth(mes).getDay()
  const diasVazios = Array(primeiroDia).fill(null)
  const postsNoDia = (dia: Date) => posts.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), dia))
  const eventosNoDia = (dia: Date) => eventos.filter(e => isSameDay(parseISO(e.data_inicio), dia))
  const itensDia = diaSelecionado ? {
    posts: posts.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), diaSelecionado)),
    eventos: eventos.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
  } : { posts: [], eventos: [] }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Meu Calendário</h1>
        <p className="text-gray-500 text-sm mt-1">{posts.length} posts programados este mês</p>
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
              const temPendente = ps.some(p => ['aguardando_cliente','aprovacao_arte'].includes(p.status_interno))
              return (
                <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                  className={cn(
                    'relative p-1 rounded-xl text-sm transition-all min-h-16 flex flex-col',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : 'hover:bg-creme',
                    temPendente && !selecionado && 'ring-1 ring-rosa/40'
                  )}>
                  <span className="text-xs font-medium self-center mb-0.5">{format(dia, 'd')}</span>
                  <div className="w-full space-y-0.5 px-0.5">
                    {ps.slice(0, 2).map(p => {
                      const cor = STATUS_POST_CORES[p.status_interno] || 'bg-rosa/20 text-rosa'
                      const corBarra = p.status_interno === 'publicado' ? '#10b981' :
                        p.status_interno === 'aprovado' ? '#22c55e' :
                        ['aguardando_cliente','aprovacao_arte'].includes(p.status_interno) ? '#C2185B' :
                        p.status_interno === 'concluido' ? '#9ca3af' : '#C2185B'
                      return (
                        <div key={p.id} className="w-full flex items-center gap-0.5 rounded overflow-hidden"
                          style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.15)' : corBarra + '18' }}>
                          <div className="w-1 h-3.5 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.8)' : corBarra }} />
                          <span className={cn('truncate leading-none py-0.5', selecionado ? 'text-white/90' : 'text-gray-700')}
                            style={{ fontSize: '9px' }}>
                            {p.tipo?.slice(0,1).toUpperCase()} {p.titulo?.split(' ').slice(0,3).join(' ')}
                          </span>
                        </div>
                      )
                    })}
                    {ps.length > 2 && (
                      <span className={cn('text-gray-400', selecionado && 'text-white/60')} style={{ fontSize: '9px' }}>
                        +{ps.length - 2} mais
                      </span>
                    )}
                    {es.slice(0,1).map(e => (
                      <div key={e.id} className="w-full flex items-center gap-0.5 rounded overflow-hidden"
                        style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.1)' : '#6B0F2A18' }}>
                        <div className="w-1 h-3.5 flex-shrink-0 rounded-sm bg-vinho" />
                        <span className={cn('truncate leading-none py-0.5', selecionado ? 'text-white/80' : 'text-gray-600')}
                          style={{ fontSize: '9px' }}>
                          {e.titulo?.split(' ').slice(0,3).join(' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

        </div>

        {/* Detalhes do dia */}
        <div className="card">
          <h3 className="section-title text-base mb-4">
            {diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
          </h3>
          {itensDia.posts.length === 0 && itensDia.eventos.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum item neste dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensDia.eventos.map(evento => (
                <div key={evento.id} className="flex gap-3 p-2.5 rounded-xl bg-vinho/5 border border-vinho/10">
                  <div className="w-2 h-2 rounded-full bg-vinho mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                    <p className="text-xs text-gray-400">{format(parseISO(evento.data_inicio), 'HH:mm')}</p>
                  </div>
                </div>
              ))}
              {itensDia.posts.map(post => (
                <button key={post.id} onClick={() => setPostAberto(post)}
                  className={cn(
                    'w-full text-left flex gap-3 p-2.5 rounded-xl border transition-all hover:shadow-card-hover',
                    post.status_interno === 'concluido'
                      ? 'bg-gray-50 border-gray-100 opacity-60'
                      : post.status_interno === 'aguardando_cliente'
                      ? 'bg-rosa-pale/40 border-rosa/20 hover:bg-rosa-pale/60'
                      : 'bg-rosa-pale/20 border-rosa/10 hover:bg-rosa-pale/40'
                  )}>
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    post.status_interno === 'concluido' ? 'bg-gray-300' : 'bg-rosa')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate',
                      post.status_interno === 'concluido' ? 'text-gray-400' : 'text-gray-800')}>
                      {post.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 capitalize">{post.tipo}</span>
                      <span className={cn('badge text-xs', STATUS_POST_CORES[post.status_interno])}>
                        {STATUS_POST_LABELS[post.status_interno]}
                      </span>
                    </div>
                  </div>
                  {post.status_interno === 'aguardando_cliente' && (
                    <span className="text-xs text-rosa font-medium self-center flex-shrink-0">Ver →</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista do mês */}
      {posts.length > 0 && (
        <div className="card">
          <h3 className="section-title text-sm mb-4">Todos os posts do mês</h3>
          <div className="space-y-1">
            {posts.map(post => (
              <button key={post.id} onClick={() => setPostAberto(post)}
                className={cn(
                  'w-full text-left flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-creme',
                  post.status_interno === 'concluido' && 'opacity-50'
                )}>
                <div className={cn('w-1.5 h-8 rounded-full flex-shrink-0',
                  post.status_interno === 'concluido' ? 'bg-gray-300' : 'bg-rosa')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate',
                    post.status_interno === 'concluido' ? 'text-gray-400' : 'text-gray-800')}>
                    {post.titulo}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {post.tipo} · {post.data_publicacao ? formatDate(post.data_publicacao) : 'Sem data'}
                  </p>
                </div>
                <span className={cn('badge text-xs', STATUS_POST_CORES[post.status_interno])}>
                  {STATUS_POST_LABELS[post.status_interno] || post.status_interno}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {postAberto && (
        <PostModal
          post={postAberto}
          userId={userId}
          userName={userName}
          onClose={() => setPostAberto(null)}
          onAtualizado={() => { carregar(); setPostAberto(null) }}
        />
      )}
    </div>
  )
}
