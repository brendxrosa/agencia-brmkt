'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPOS_EVENTO = [
  { key: 'reuniao', label: 'Reunião' },
  { key: 'captacao', label: 'Captação' },
  { key: 'outro', label: 'Outro' },
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
  const [eventosOcupados, setEventosOcupados] = useState<any[]>([])
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [mes, setMes] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
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
      .from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)

    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')

    // Busca TODOS os eventos confirmados (sem mostrar detalhes)
    const { data: e } = await supabase.from('eventos')
      .select('id, data_inicio, data_fim, dia_todo, status, cliente_id, solicitado_por')
      .gte('data_inicio', inicio)
      .lte('data_inicio', fim + 'T23:59:59')
      .eq('status', 'confirmado')

    // Busca solicitações do próprio cliente
    const { data: s } = await supabase.from('eventos')
      .select('*')
      .eq('cliente_id', profile.cliente_id)
      .eq('solicitado_por', user.id)
      .gte('data_inicio', inicio)
      .lte('data_inicio', fim + 'T23:59:59')

    setEventosOcupados(e || [])
    setMinhasSolicitacoes(s || [])
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

  function getDiaStatus(dia: Date) {
    const passado = isBefore(dia, startOfDay(new Date()))
    const ocupado = eventosOcupados.some(e => isSameDay(parseISO(e.data_inicio), dia))
    const temSolicitacao = minhasSolicitacoes.some(e => isSameDay(parseISO(e.data_inicio), dia))
    return { passado, ocupado, temSolicitacao }
  }

  const solicitacoesDia = diaSelecionado
    ? minhasSolicitacoes.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
    : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Solicite reuniões e acompanhe confirmações</p>
        </div>
        <button onClick={() => {
          setForm(f => ({ ...f, data: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' }))
          setModalAberto(true)
        }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Solicitar evento
        </button>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-emerald-500" /> Disponível
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-red-400" /> Ocupado
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-full bg-orange-400" /> Minha solicitação
        </div>
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
              const { passado, ocupado, temSolicitacao } = getDiaStatus(dia)
              const selecionado = diaSelecionado && isSameDay(dia, diaSelecionado)
              const hoje = isToday(dia)
              const fds = dia.getDay() === 0 || dia.getDay() === 6

              return (
                <button key={dia.toISOString()}
                  onClick={() => setDiaSelecionado(dia)}
                  disabled={passado}
                  className={cn(
                    'relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center gap-1',
                    selecionado ? 'bg-vinho text-white' :
                    hoje ? 'bg-rosa-pale text-rosa font-semibold' :
                    passado ? 'text-gray-200 cursor-not-allowed' :
                    'hover:bg-creme cursor-pointer',
                    fds && !selecionado && !passado && 'text-gray-400'
                  )}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  {!passado && (
                    <div className="flex gap-0.5">
                      {ocupado && (
                        <span className={cn('w-1.5 h-1.5 rounded-full', selecionado ? 'bg-white/70' : 'bg-red-400')} />
                      )}
                      {temSolicitacao && (
                        <span className={cn('w-1.5 h-1.5 rounded-full', selecionado ? 'bg-white' : 'bg-orange-400')} />
                      )}
                      {!ocupado && !temSolicitacao && (
                        <span className={cn('w-1.5 h-1.5 rounded-full', selecionado ? 'bg-white/50' : 'bg-emerald-400')} />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {diaSelecionado && (
            <div className="card">
              <h3 className="section-title text-sm mb-3">
                {format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })}
              </h3>

              {(() => {
                const { ocupado, temSolicitacao } = getDiaStatus(diaSelecionado)
                if (ocupado && !temSolicitacao) return (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <p className="text-sm font-medium text-red-600">🔴 Dia ocupado</p>
                    <p className="text-xs text-red-500 mt-1">A agência já tem compromissos neste dia</p>
                  </div>
                )
                if (temSolicitacao) return (
                  <div className="space-y-2">
                    {solicitacoesDia.map(s => {
                      const config = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
                      const Icon = config.icon
                      return (
                        <div key={s.id} className="p-3 bg-creme rounded-xl">
                          <p className="text-sm font-medium text-gray-800">{s.titulo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(parseISO(s.data_inicio), 'HH:mm')} - {format(parseISO(s.data_fim), 'HH:mm')}
                          </p>
                          <span className={cn('badge text-xs mt-2 flex items-center gap-1 w-fit', config.cor)}>
                            <Icon size={10} /> {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
                return (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-sm font-medium text-emerald-600">🟢 Disponível</p>
                    <p className="text-xs text-emerald-500 mt-1">Você pode solicitar um evento neste dia</p>
                    <button onClick={() => {
                      setForm(f => ({ ...f, data: format(diaSelecionado, 'yyyy-MM-dd') }))
                      setModalAberto(true)
                    }} className="btn-primary mt-3 text-xs py-1.5 w-full justify-center">
                      + Solicitar evento
                    </button>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Minhas solicitações do mês */}
          {minhasSolicitacoes.length > 0 && (
            <div className="card">
              <h3 className="section-title text-sm mb-3">Minhas solicitações</h3>
              <div className="space-y-2">
                {minhasSolicitacoes.map(s => {
                  const config = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
                  const Icon = config.icon
                  return (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.titulo}</p>
                        <p className="text-xs text-gray-400">{format(parseISO(s.data_inicio), "dd/MM 'às' HH:mm")}</p>
                      </div>
                      <span className={cn('badge text-xs flex items-center gap-1 flex-shrink-0', config.cor)}>
                        <Icon size={10} /> {s.status === 'confirmado' ? '✓' : s.status === 'cancelado' ? '✗' : '⏳'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!diaSelecionado && (
            <div className="card text-center py-8">
              <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Selecione um dia para ver disponibilidade</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal solicitar */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Solicitar evento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-orange-700">⏳ Sua solicitação será analisada pela agência em até 24h.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Tipo de evento</label>
              <div className="flex gap-2">
                {TIPOS_EVENTO.map(t => (
                  <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                      form.tipo === t.key ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Título *</label>
              <input className="input" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Reunião de alinhamento" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="label">Data *</label>
                <input className="input" type="date" value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Hora início</label>
                  <input className="input" type="time" value={form.hora_inicio}
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Hora fim</label>
                  <input className="input" type="time" value={form.hora_fim}
                    onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} />
                </div>
              </div>
            </div>
            <div>
              <label className="label">Descrição / Observações</label>
              <textarea className="input resize-none" rows={3} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o objetivo do evento..." />
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
