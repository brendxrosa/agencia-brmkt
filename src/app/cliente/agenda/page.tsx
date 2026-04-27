'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPOS_EVENTO = [
  { key: 'reuniao', label: 'Reunião', cor: '#6B0F2A' },
  { key: 'captacao', label: 'Captação', cor: '#C2185B' },
  { key: 'outro', label: 'Outro', cor: '#E65100' },
]

const STATUS_CONFIG = {
  confirmado: { label: 'Confirmado', icon: CheckCircle, cor: 'text-emerald-600 bg-emerald-50' },
  pendente: { label: 'Aguardando aprovação', icon: AlertCircle, cor: 'text-orange-600 bg-orange-50' },
  cancelado: { label: 'Cancelado', icon: XCircle, cor: 'text-red-600 bg-red-50' },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default function ClienteAgendaPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [mes, setMes] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'reuniao',
    data: '',
    hora_inicio: '09:00',
    hora_fim: '10:00',
    descricao: '',
  })

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles').select('cliente_id, nome').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)
    setUserName(profile.nome)

    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')

    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('posts').select('id, titulo, tipo, data_publicacao, status_interno')
        .eq('cliente_id', profile.cliente_id)
        .gte('data_publicacao', inicio)
        .lte('data_publicacao', fim)
        .order('data_publicacao'),
      supabase.from('eventos').select('*')
        .eq('cliente_id', profile.cliente_id)
        .gte('data_inicio', inicio)
        .lte('data_inicio', fim + 'T23:59:59')
        .order('data_inicio')
    ])
    setPosts(p || [])
    setEventos(e || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mes])

  async function solicitarEvento() {
    if (!form.titulo || !form.data) return alert('Título e data são obrigatórios!')
    setSalvando(true)

    await supabase.from('eventos').insert({
      titulo: form.titulo,
      tipo: form.tipo,
      cliente_id: clienteId,
      data_inicio: `${form.data}T${form.hora_inicio}:00`,
      data_fim: `${form.data}T${form.hora_fim}:00`,
      descricao: form.descricao,
      dia_todo: false,
      visivel_cliente: true,
      status: 'pendente',
      solicitado_por: userId,
    })

    setModalAberto(false)
    setForm({ titulo: '', tipo: 'reuniao', data: '', hora_inicio: '09:00', hora_fim: '10:00', descricao: '' })
    setSalvando(false)
    carregar()
  }

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) })
  const primeiroDia = startOfMonth(mes).getDay()
  const diasVazios = Array(primeiroDia).fill(null)

  const postsNoDia = (dia: Date) =>
    posts.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), dia))
  const eventosNoDia = (dia: Date) =>
    eventos.filter(e => isSameDay(parseISO(e.data_inicio), dia))

  const itensDia = diaSelecionado ? {
    posts: posts.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), diaSelecionado)),
    eventos: eventos.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
  } : { posts: [], eventos: [] }

  const minhasSolicitacoes = eventos.filter(e => e.solicitado_por === userId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Minha Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Posts e eventos do mês</p>
        </div>
        <button onClick={() => {
          setForm(f => ({ ...f, data: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' }))
          setModalAberto(true)
        }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Solicitar evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário */}
        <div className="lg:col-span-2 card">
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
                    'relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : 'hover:bg-creme',
                    fds && !selecionado && 'text-gray-400'
                  )}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {ps.slice(0, 2).map(p => (
                      <span key={p.id} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: selecionado ? 'white' : '#C2185B' }} />
                    ))}
                    {es.slice(0, 2).map(e => (
                      <span key={e.id} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: selecionado ? 'rgba(255,255,255,0.6)' : '#6B0F2A' }} />
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

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Itens do dia selecionado */}
          <div className="card">
            <h3 className="section-title text-sm mb-3">
              {diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
            </h3>

            {itensDia.posts.length === 0 && itensDia.eventos.length === 0 ? (
              <div className="text-center py-6">
                <Calendar size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Nenhum item neste dia</p>
                <button onClick={() => {
                  setForm(f => ({ ...f, data: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' }))
                  setModalAberto(true)
                }} className="text-xs text-vinho hover:underline mt-1">
                  + Solicitar evento
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {itensDia.eventos.map(evento => {
                  const config = STATUS_CONFIG[evento.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
                  const Icon = config.icon
                  return (
                    <div key={evento.id} className="p-2.5 rounded-xl bg-vinho/5 border border-vinho/10">
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
                      <span className={cn('badge text-xs mt-1 flex items-center gap-1 w-fit', config.cor)}>
                        <Icon size={10} /> {config.label}
                      </span>
                    </div>
                  )
                })}
                {itensDia.posts.map(post => (
                  <div key={post.id} className="p-2.5 rounded-xl bg-rosa-pale/30 border border-rosa/10">
                    <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{post.tipo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Minhas solicitações */}
          {minhasSolicitacoes.length > 0 && (
            <div className="card">
              <h3 className="section-title text-sm mb-3">Minhas solicitações</h3>
              <div className="space-y-2">
                {minhasSolicitacoes.map(evento => {
                  const config = STATUS_CONFIG[evento.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
                  const Icon = config.icon
                  return (
                    <div key={evento.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-creme transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{evento.titulo}</p>
                        <p className="text-xs text-gray-400">{formatDate(evento.data_inicio, 'dd/MM')}</p>
                      </div>
                      <span className={cn('badge text-xs flex items-center gap-1', config.cor)}>
                        <Icon size={10} /> {config.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal solicitar evento */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Solicitar evento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-orange-700">
              ⏳ Sua solicitação será analisada pela agência. Você receberá a confirmação em até 24h.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Tipo de evento</label>
              <div className="flex gap-2">
                {TIPOS_EVENTO.map(t => (
                  <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                      form.tipo === t.key ? 'text-white' : 'bg-creme text-gray-600')}
                    style={form.tipo === t.key ? { backgroundColor: t.cor } : {}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Título *</label>
              <input className="input" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Reunião de alinhamento mensal" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="label">Data *</label>
                <input className="input" type="date" value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="col-span-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Hora início</label>
                  <input className="input" type="time" value={form.hora_inicio} min="08:00" max="18:00"
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Hora fim</label>
                  <input className="input" type="time" value={form.hora_fim} min="08:00" max="18:00"
                    onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Descrição / Observações</label>
              <textarea className="input resize-none" rows={3} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o objetivo do evento, pauta ou qualquer informação relevante..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={solicitarEvento} disabled={salvando}
                className="btn-primary flex-1 justify-center">
                {salvando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
