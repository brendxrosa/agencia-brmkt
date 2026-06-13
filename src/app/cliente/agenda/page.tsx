'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Converte data/hora local (Brasil UTC-3) para ISO string com timezone correto
function toLocalISO(data: string, hora: string) {
  return `${data}T${hora}:00-03:00`
}

function formatHoraBR(isoStr: string) {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
}

function formatDataBR(isoStr: string) {
  const d = new Date(isoStr)
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}


const TIPOS_EVENTO = [
  { key: 'reuniao', label: 'Reunião' },
  { key: 'captacao', label: 'Captação' },
  { key: 'outro', label: 'Outro' },
]

const STATUS_CONFIG = {
  confirmado: { label: 'Confirmado', icon: CheckCircle, cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  pendente: { label: 'Aguardando aprovação', icon: AlertCircle, cor: 'text-orange-600 bg-orange-50 border-orange-200' },
  cancelado: { label: 'Cancelado', icon: XCircle, cor: 'text-red-600 bg-red-50 border-red-200' },
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

// Status do dia baseado nos eventos
type DiaStatus = 'livre' | 'parcial' | 'ocupado' | 'bloqueado' | 'fora_horario'

export default function ClienteAgendaPage() {
  const supabase = createClient()
  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [mes, setMes] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
  const [eventosOcupados, setEventosOcupados] = useState<any[]>([])
  const [diasBloqueados, setDiasBloqueados] = useState<string[]>([])
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    titulo: '', tipo: 'reuniao', data: '',
    hora_inicio: '09:00', hora_fim: '10:00', descricao: ''
  })

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)

    const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mes), 'yyyy-MM-dd')

    const [{ data: eventos }, { data: bloqueados }, { data: solicitacoes }] = await Promise.all([
      // Todos eventos confirmados (mostra como ocupado sem detalhes)
      supabase.from('eventos').select('id, data_inicio, data_fim, dia_todo, status')
        .gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59')
        .eq('status', 'confirmado'),
      // Dias bloqueados pelo admin
      supabase.from('dias_bloqueados').select('data, motivo').gte('data', inicio).lte('data', fim),
      // Solicitações do próprio cliente
      supabase.from('eventos').select('*')
        .eq('cliente_id', profile.cliente_id)
        .eq('solicitado_por', user.id)
        .gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59')
    ])

    setEventosOcupados(eventos || [])
    setDiasBloqueados((bloqueados || []).map((b: any) => b.data))
    setMinhasSolicitacoes(solicitacoes || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mes])

  function getDiaStatus(dia: Date): DiaStatus {
    const diaSemana = dia.getDay()
    const dataStr = format(dia, 'yyyy-MM-dd')

    // Domingo sempre bloqueado
    if (diaSemana === 0) return 'bloqueado'

    // Dias bloqueados pelo admin
    if (diasBloqueados.includes(dataStr)) return 'bloqueado'

    // Sábado: só emergência = parcial por padrão
    if (diaSemana === 6) return 'fora_horario'

    // Verifica eventos do dia
    const eventosNoDia = eventosOcupados.filter(e => isSameDay(parseISO(e.data_inicio), dia))

    if (eventosNoDia.length === 0) return 'livre'

    // Se tem evento dia todo, está ocupado
    if (eventosNoDia.some(e => e.dia_todo)) return 'ocupado'

    // Verifica se sobram horários comerciais (8h-18h = 10h úteis)
    const totalHorasOcupadas = eventosNoDia.reduce((acc, e) => {
      const inicio = parseISO(e.data_inicio)
      const fim = parseISO(e.data_fim || e.data_inicio)
      return acc + (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60)
    }, 0)

    if (totalHorasOcupadas >= 8) return 'ocupado'
    return 'parcial'
  }

  function getCorDia(status: DiaStatus, selecionado: boolean, hoje: boolean) {
    if (selecionado) return 'bg-vinho text-white'
    if (hoje) return 'bg-rosa-pale text-vinho font-semibold'
    switch (status) {
      case 'livre': return 'hover:bg-emerald-50 cursor-pointer'
      case 'parcial': return 'hover:bg-orange-50 cursor-pointer'
      case 'ocupado': return 'opacity-60 cursor-not-allowed'
      case 'bloqueado': return 'opacity-40 cursor-not-allowed bg-gray-100'
      case 'fora_horario': return 'opacity-50 cursor-pointer hover:bg-gray-50'
      default: return 'hover:bg-creme cursor-pointer'
    }
  }

  function getPontoDia(status: DiaStatus, selecionado: boolean) {
    if (selecionado) return 'bg-white'
    switch (status) {
      case 'livre': return 'bg-emerald-400'
      case 'parcial': return 'bg-orange-400'
      case 'ocupado': return 'bg-red-400'
      case 'bloqueado': return 'bg-gray-400'
      case 'fora_horario': return 'bg-gray-300'
      default: return ''
    }
  }

  async function solicitarEvento() {
    if (!form.titulo || !form.data) return alert('Título e data são obrigatórios!')
    setSalvando(true)
    await supabase.from('eventos').insert({
      titulo: form.titulo, tipo: form.tipo, cliente_id: clienteId,
      data_inicio: toLocalISO(form.data, form.hora_inicio),
      data_fim: toLocalISO(form.data, form.hora_fim),
      descricao: form.descricao || null,
      dia_todo: false, visivel_cliente: true,
      status: 'pendente', solicitado_por: userId,
    })
    setModalAberto(false)
    setForm({ titulo: '', tipo: 'reuniao', data: '', hora_inicio: '09:00', hora_fim: '10:00', descricao: '' })
    setSalvando(false)
    carregar()
  }

  // Gera timeline de horários ocupados/livres para o dia selecionado
  function gerarTimeline(dia: Date) {
    const eventosNoDia = eventosOcupados
      .filter(e => isSameDay(parseISO(e.data_inicio), dia) && !e.dia_todo)
      .map(e => ({
        inicio: format(parseISO(e.data_inicio), 'HH:mm'),
        fim: e.data_fim ? format(parseISO(e.data_fim), 'HH:mm') : format(parseISO(e.data_inicio), 'HH:mm'),
        inicioh: parseISO(e.data_inicio).getHours() + parseISO(e.data_inicio).getMinutes() / 60,
        fimh: e.data_fim ? parseISO(e.data_fim).getHours() + parseISO(e.data_fim).getMinutes() / 60 : parseISO(e.data_inicio).getHours() + 1,
      }))
      .sort((a, b) => a.inicioh - b.inicioh)

    if (eventosNoDia.length === 0) return []

    const INICIO_DIA = 8
    const FIM_DIA = 18
    const blocos: { inicio: string; fim: string; ocupado: boolean }[] = []
    let cursor = INICIO_DIA

    eventosNoDia.forEach(e => {
      if (e.inicioh > cursor) {
        blocos.push({ inicio: `${String(cursor).padStart(2,'0')}:00`, fim: e.inicio, ocupado: false })
      }
      blocos.push({ inicio: e.inicio, fim: e.fim, ocupado: true })
      cursor = e.fimh
    })
    if (cursor < FIM_DIA) {
      blocos.push({ inicio: `${String(Math.floor(cursor)).padStart(2,'0')}:00`, fim: '18:00', ocupado: false })
    }
    return blocos
  }

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) })
  const primeiroDia = startOfMonth(mes).getDay()
  const diasVazios = Array(primeiroDia).fill(null)

  const solicitacoesDia = diaSelecionado
    ? minhasSolicitacoes.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
    : []

  const statusDiaSelecionado = diaSelecionado ? getDiaStatus(diaSelecionado) : null
  const passado = diaSelecionado ? isBefore(diaSelecionado, startOfDay(new Date())) : false

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
        }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Solicitar
        </button>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 flex-wrap text-xs">
        {[
          { cor: 'bg-emerald-400', label: 'Disponível' },
          { cor: 'bg-orange-400', label: 'Parcialmente ocupado' },
          { cor: 'bg-red-400', label: 'Sem horários' },
          { cor: 'bg-gray-400', label: 'Indisponível' },
          { cor: 'bg-gray-300', label: 'Sábado (emergência)' },
        ].map(({ cor, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-gray-500">
            <span className={cn('w-2.5 h-2.5 rounded-full', cor)} /> {label}
          </div>
        ))}
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
              const status = getDiaStatus(dia)
              const selecionado = diaSelecionado ? isSameDay(dia, diaSelecionado) : false
              const hoje = isToday(dia)
              const bloqueado = status === 'bloqueado' || status === 'ocupado'
              const temSolicitacao = minhasSolicitacoes.some(e => isSameDay(parseISO(e.data_inicio), dia))

              return (
                <button key={dia.toISOString()}
                  onClick={() => !bloqueado && setDiaSelecionado(dia)}
                  disabled={bloqueado}
                  className={cn('relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center gap-1',
                    getCorDia(status, selecionado, hoje))}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  <div className="flex gap-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', getPontoDia(status, selecionado))} />
                    {temSolicitacao && !selecionado && (
                      <span className="w-1.5 h-1.5 rounded-full bg-vinho" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Painel do dia */}
        <div className="space-y-4">
          {diaSelecionado ? (
            <div className="card">
              <h3 className="section-title text-sm mb-3">
                {format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>

              {passado ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-gray-500">Data passada</p>
                </div>
              ) : statusDiaSelecionado === 'fora_horario' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-sm font-medium text-gray-600">🟡 Sábado</p>
                  <p className="text-xs text-gray-500 mt-1">Atendemos apenas em casos de emergência. Descreva o motivo na solicitação.</p>
                  <button onClick={() => { setForm(f => ({ ...f, data: format(diaSelecionado, 'yyyy-MM-dd') })); setModalAberto(true) }}
                    className="btn-secondary mt-3 w-full text-xs py-2 justify-center">Solicitar (emergência)</button>
                </div>
              ) : statusDiaSelecionado === 'livre' ? (
                <div className="space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-medium text-emerald-600">🟢 Dia disponível</p>
                    <p className="text-xs text-emerald-500 mt-1">Horário comercial: 8h às 18h</p>
                    <button onClick={() => { setForm(f => ({ ...f, data: format(diaSelecionado, 'yyyy-MM-dd') })); setModalAberto(true) }}
                      className="btn-primary mt-3 w-full text-xs py-2 justify-center">+ Solicitar evento</button>
                  </div>
                  {gerarTimeline(diaSelecionado).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horários do dia</p>
                      {gerarTimeline(diaSelecionado).map((bloco, i) => (
                        <div key={i} className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                          bloco.ocupado ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
                        )}>
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', bloco.ocupado ? 'bg-red-400' : 'bg-emerald-400')} />
                          <span className={cn('font-medium text-xs', bloco.ocupado ? 'text-red-700' : 'text-emerald-700')}>
                            {bloco.inicio} – {bloco.fim}
                          </span>
                          <span className={cn('text-xs ml-auto', bloco.ocupado ? 'text-red-500' : 'text-emerald-600')}>
                            {bloco.ocupado ? 'Ocupado' : 'Disponível'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : statusDiaSelecionado === 'parcial' ? (
                <div className="space-y-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-medium text-orange-600">🟡 Horários limitados</p>
                    <p className="text-xs text-orange-500 mt-1">Veja os horários disponíveis abaixo.</p>
                    <button onClick={() => { setForm(f => ({ ...f, data: format(diaSelecionado, 'yyyy-MM-dd') })); setModalAberto(true) }}
                      className="btn-primary mt-3 w-full text-xs py-2 justify-center">+ Solicitar evento</button>
                  </div>
                  {/* Timeline de horários */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horários do dia</p>
                    {gerarTimeline(diaSelecionado).map((bloco, i) => (
                      <div key={i} className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                        bloco.ocupado ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
                      )}>
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', bloco.ocupado ? 'bg-red-400' : 'bg-emerald-400')} />
                        <span className={cn('font-medium text-xs', bloco.ocupado ? 'text-red-700' : 'text-emerald-700')}>
                          {bloco.inicio} – {bloco.fim}
                        </span>
                        <span className={cn('text-xs ml-auto', bloco.ocupado ? 'text-red-500' : 'text-emerald-600')}>
                          {bloco.ocupado ? 'Ocupado' : 'Disponível'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Minhas solicitações no dia */}
              {solicitacoesDia.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">Suas solicitações:</p>
                  {solicitacoesDia.map(s => {
                    const config = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente
                    const Icon = config.icon
                    return (
                      <div key={s.id} className={cn('border rounded-xl p-3', config.cor)}>
                        <p className="text-sm font-medium">{s.titulo}</p>
                        <p className="text-xs mt-0.5">
                          {formatHoraBR(s.data_inicio)} - {formatHoraBR(s.data_fim)}
                        </p>
                        <span className="flex items-center gap-1 text-xs mt-1 font-medium">
                          <Icon size={11} /> {config.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-8">
              <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Selecione um dia para ver disponibilidade</p>
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
                        <Icon size={10} />
                        {s.status === 'confirmado' ? '✓' : s.status === 'cancelado' ? '✗' : '⏳'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal solicitar */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-vinho">Solicitar evento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-orange-700">⏳ Sua solicitação será analisada pela agência. Você receberá uma confirmação em breve.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Tipo</label>
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
              <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Reunião de alinhamento" />
            </div>
            <div>
              <label className="label">Data *</label>
              <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hora início</label>
                <input className="input" type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Hora fim</label>
                <input className="input" type="time" value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Descrição / Observações</label>
              <textarea className="input resize-none" rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o objetivo..." />
            </div>
            <div className="flex gap-3 pb-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={solicitarEvento} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
