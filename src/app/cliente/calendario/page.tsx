'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { STATUS_POST_LABELS, STATUS_POST_CORES } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ClienteCalendarioPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [mes, setMes] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(true)
  const [clienteId, setClienteId] = useState('')

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)

    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')

    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('posts').select('*')
        .eq('cliente_id', profile.cliente_id)
        .gte('data_publicacao', inicio)
        .lte('data_publicacao', fim)
        .order('data_publicacao'),
      supabase.from('eventos').select('*')
        .eq('cliente_id', profile.cliente_id)
        .eq('visivel_cliente', true)
        .gte('data_inicio', inicio)
        .lte('data_inicio', fim + 'T23:59:59')
    ])
    setPosts(p || [])
    setEventos(e || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mes])

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) })
  const primeiroDia = startOfMonth(mes).getDay()
  const diasVazios = Array(primeiroDia).fill(null)

  const postsNoDia = (dia: Date) => posts.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), dia))
  const eventosNoDia = (dia: Date) => eventos.filter(e => isSameDay(parseISO(e.data_inicio), dia))

  const itensDiaSelecionado = diaSelecionado ? {
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

              return (
                <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                  className={cn(
                    'relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : 'hover:bg-creme'
                  )}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {ps.slice(0, 3).map(p => (
                      <span key={p.id} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: selecionado ? 'white' : '#C2185B' }} />
                    ))}
                    {es.slice(0, 1).map(e => (
                      <span key={e.id} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: selecionado ? 'white' : '#6B0F2A' }} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-rosa" /> Posts
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-vinho" /> Eventos
            </div>
          </div>
        </div>

        {/* Detalhes do dia */}
        <div className="card">
          <h3 className="section-title text-base mb-4">
            {diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
          </h3>

          {itensDiaSelecionado.posts.length === 0 && itensDiaSelecionado.eventos.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum item neste dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensDiaSelecionado.eventos.map(evento => (
                <div key={evento.id} className="flex gap-3 p-2.5 rounded-xl bg-vinho/5 border border-vinho/10">
                  <div className="w-2 h-2 rounded-full bg-vinho mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                    <p className="text-xs text-gray-400">{format(parseISO(evento.data_inicio), 'HH:mm')}</p>
                  </div>
                </div>
              ))}
              {itensDiaSelecionado.posts.map(post => (
                <div key={post.id} className="flex gap-3 p-2.5 rounded-xl bg-rosa-pale/30 border border-rosa/10">
                  <div className="w-2 h-2 rounded-full bg-rosa mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 capitalize">{post.tipo}</span>
                      <span className={cn('badge text-xs', STATUS_POST_CORES[post.status_interno])}>
                        {STATUS_POST_LABELS[post.status_interno]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de posts do mês */}
      {posts.length > 0 && (
        <div className="card">
          <h3 className="section-title text-sm mb-4">Todos os posts do mês</h3>
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-creme transition-all">
                <div className="w-1.5 h-8 rounded-full bg-rosa flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                  <p className="text-xs text-gray-400 capitalize">{post.tipo} · {post.data_publicacao ? formatDate(post.data_publicacao) : 'Sem data'}</p>
                </div>
                <span className={cn('badge text-xs', STATUS_POST_CORES[post.status_interno])}>
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
