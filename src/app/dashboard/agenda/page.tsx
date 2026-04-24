'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Evento } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { Plus, X, ChevronLeft, ChevronRight, Clock, Users, Camera, Package, DollarSign, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_CONFIG = {
  reuniao: { label: 'Reunião', icon: Users, cor: '#6B0F2A' },
  captacao: { label: 'Captação', icon: Camera, cor: '#C2185B' },
  entrega: { label: 'Entrega', icon: Package, cor: '#7B1FA2' },
  pagamento: { label: 'Pagamento', icon: DollarSign, cor: '#2E7D32' },
  outro: { label: 'Outro', icon: Calendar, cor: '#E65100' },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-slide-up">
        {children}
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const supabase = createClient()
  const [eventos, setEventos] = useState<(Evento & { clientes: { nome: string } | null })[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [mesSelecionado, setMesSelecionado] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    titulo: '', descricao: '', tipo: 'reuniao' as Evento['tipo'],
    cliente_id: '', data_inicio: '', hora_inicio: '09:00',
    data_fim: '', hora_fim: '10:00', dia_todo: false, visivel_cliente: false
  })

  async function carregar() {
    const inicio = format(startOfMonth(mesSelecionado), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('eventos').select('*, clientes(nome)')
        .gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59')
        .order('data_inicio'),
      supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome')
    ])
    setEventos(e || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mesSelecionado])

  async function salvar() {
    if (!form.titulo || !form.data_inicio) return alert('Título e data são obrigatórios!')
    const data_inicio = form.dia_todo
      ? `${form.data_inicio}T00:00:00`
      : `${form.data_inicio}T${form.hora_inicio}:00`
    const data_fim = form.data_fim
      ? (form.dia_todo ? `${form.data_fim}T23:59:59` : `${form.data_fim}T${form.hora_fim}:00`)
      : data_inicio

    await supabase.from('eventos').insert({
      titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
      cliente_id: form.cliente_id || null, data_inicio, data_fim,
      dia_todo: form.dia_todo, visivel_cliente: form.visivel_cliente, status: 'confirmado'
    })
    setModalAberto(false)
    setForm({ titulo: '', descricao: '', tipo: 'reuniao', cliente_id: '', data_inicio: '', hora_inicio: '09:00', data_fim: '', hora_fim: '10:00', dia_todo: false, visivel_cliente: false })
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    carregar()
  }

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(mesSelecionado),
    end: endOfMonth(mesSelecionado)
  })

  const eventosNoDia = (dia: Date) =>
    eventos.filter(e => isSameDay(parseISO(e.data_inicio), dia))

  const eventosDiaSelecionado = diaSelecionado
    ? eventos.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado))
    : []

  const primeiroDia = startOfMonth(mesSelecionado).getDay()
  const diasVazios = Array(primeiroDia).fill(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Horário comercial 8h-18h · Seg-Sex</p>
        </div>
        <button onClick={() => {
          setForm(f => ({ ...f, data_inicio: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' }))
          setModalAberto(true)
        }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário */}
        <div className="lg:col-span-2 card">
          {/* Nav mês */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMesSelecionado(m => subMonths(m, 1))} className="btn-ghost p-2">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-lg font-semibold text-gray-800 capitalize">
              {format(mesSelecionado, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setMesSelecionado(m => addMonths(m, 1))} className="btn-ghost p-2">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1">
            {diasVazios.map((_, i) => <div key={`v-${i}`} />)}
            {diasDoMes.map(dia => {
              const evs = eventosNoDia(dia)
              const selecionado = diaSelecionado && isSameDay(dia, diaSelecionado)
              const hoje = isToday(dia)
              const fimDeSemana = dia.getDay() === 0 || dia.getDay() === 6

              return (
                <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                  className={cn(
                    'relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : 'hover:bg-creme',
                    fimDeSemana && !selecionado && 'text-gray-400'
                  )}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  {evs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {evs.slice(0, 3).map(e => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: selecionado ? 'white' : TIPO_CONFIG[e.tipo].cor }} />
                      ))}
                      {evs.length > 3 && <span className={cn('text-xs', selecionado ? 'text-white/70' : 'text-gray-400')}>+{evs.length - 3}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legenda tipos */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.cor }} />
                <span className="text-xs text-gray-500">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Eventos do dia selecionado */}
        <div className="card">
          <h3 className="section-title text-base mb-4">
            {diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
          </h3>

          {eventosDiaSelecionado.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum evento neste dia</p>
              <button onClick={() => {
                setForm(f => ({ ...f, data_inicio: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' }))
                setModalAberto(true)
              }} className="btn-ghost text-xs mt-2">+ Adicionar evento</button>
            </div>
          ) : (
            <div className="space-y-3">
              {eventosDiaSelecionado.map(evento => {
                const config = TIPO_CONFIG[evento.tipo]
                const Icon = config.icon
                return (
                  <div key={evento.id} className="group flex gap-3 p-3 rounded-xl hover:bg-creme transition-all">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.cor + '20' }}>
                      <Icon size={14} style={{ color: config.cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                      {evento.clientes?.nome && (
                        <p className="text-xs text-gray-400">{evento.clientes.nome}</p>
                      )}
                      {!evento.dia_todo && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {format(parseISO(evento.data_inicio), 'HH:mm')}
                            {evento.data_fim && ` - ${format(parseISO(evento.data_fim), 'HH:mm')}`}
                          </span>
                        </div>
                      )}
                      {evento.visivel_cliente && (
                        <span className="text-xs text-rosa">Visível ao cliente</span>
                      )}
                    </div>
                    <button onClick={() => excluir(evento.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo evento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Nome do evento" />
            </div>

            <div>
              <label className="label">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, tipo: k as Evento['tipo'] }))}
                    className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                      form.tipo === k ? 'text-white' : 'bg-creme text-gray-600')}
                    style={form.tipo === k ? { backgroundColor: v.cor } : {}}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Cliente (opcional)</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Sem cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="dia_todo" checked={form.dia_todo}
                onChange={e => setForm(f => ({ ...f, dia_todo: e.target.checked }))}
                className="rounded" />
              <label htmlFor="dia_todo" className="text-sm text-gray-700">Dia todo</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data início *</label>
                <input className="input" type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              {!form.dia_todo && (
                <div>
                  <label className="label">Hora início</label>
                  <input className="input" type="time" value={form.hora_inicio} min="08:00" max="18:00"
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                </div>
              )}
            </div>

            {!form.dia_todo && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Data fim</label>
                  <input className="input" type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Hora fim</label>
                  <input className="input" type="time" value={form.hora_fim} min="08:00" max="18:00"
                    onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} />
                </div>
              </div>
            )}

            <div>
              <label className="label">Descrição</label>
              <textarea className="input resize-none" rows={2} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes do evento..." />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="visivel" checked={form.visivel_cliente}
                onChange={e => setForm(f => ({ ...f, visivel_cliente: e.target.checked }))}
                className="rounded" />
              <label htmlFor="visivel" className="text-sm text-gray-700">Visível para o cliente</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} className="btn-primary flex-1 justify-center">Salvar evento</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
