'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Evento } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { Plus, X, ChevronLeft, ChevronRight, Clock, Users, Camera, Package, DollarSign, Calendar, MapPin, Link, Edit2, Save, CheckCircle, XCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_CONFIG = {
  reuniao: { label: 'Reunião', icon: Users, cor: '#6B0F2A' },
  captacao: { label: 'Captação', icon: Camera, cor: '#C2185B' },
  entrega: { label: 'Entrega', icon: Package, cor: '#7B1FA2' },
  pagamento: { label: 'Pagamento', icon: DollarSign, cor: '#2E7D32' },
  outro: { label: 'Outro', icon: Calendar, cor: '#E65100' },
}

const formVazio = {
  titulo: '', descricao: '', tipo: 'reuniao' as Evento['tipo'],
  cliente_id: '', data_inicio: '', hora_inicio: '09:00',
  data_fim: '', hora_fim: '10:00', dia_todo: false,
  visivel_cliente: false, local: '', link_online: '', observacoes: ''
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

export default function AgendaPage() {
  const supabase = createClient()
  const [eventos, setEventos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [mesSelecionado, setMesSelecionado] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [modalAberto, setModalAberto] = useState(false)
  const [eventoDetalhes, setEventoDetalhes] = useState<any>(null)
  const [modoEditar, setModoEditar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [formEditar, setFormEditar] = useState(formVazio)

  async function carregar() {
    const inicio = format(startOfMonth(mesSelecionado), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('eventos').select('*, clientes(nome, cor)')
        .gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59').order('data_inicio'),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setEventos(e || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mesSelecionado])

  function abrirDetalhes(evento: any) {
    setEventoDetalhes(evento)
    setFormEditar({
      titulo: evento.titulo || '',
      descricao: evento.descricao || '',
      tipo: evento.tipo || 'reuniao',
      cliente_id: evento.cliente_id || '',
      data_inicio: evento.data_inicio ? format(parseISO(evento.data_inicio), 'yyyy-MM-dd') : '',
      hora_inicio: evento.data_inicio ? format(parseISO(evento.data_inicio), 'HH:mm') : '09:00',
      data_fim: evento.data_fim ? format(parseISO(evento.data_fim), 'yyyy-MM-dd') : '',
      hora_fim: evento.data_fim ? format(parseISO(evento.data_fim), 'HH:mm') : '10:00',
      dia_todo: evento.dia_todo || false,
      visivel_cliente: evento.visivel_cliente || false,
      local: evento.local || '',
      link_online: evento.link_online || '',
      observacoes: evento.observacoes || '',
    })
    setModoEditar(false)
  }

  async function salvar() {
    if (!form.titulo || !form.data_inicio) return alert('Título e data são obrigatórios!')
    const data_inicio = form.dia_todo ? `${form.data_inicio}T00:00:00` : `${form.data_inicio}T${form.hora_inicio}:00`
    const data_fim = form.data_fim
      ? (form.dia_todo ? `${form.data_fim}T23:59:59` : `${form.data_fim}T${form.hora_fim}:00`)
      : data_inicio

    await supabase.from('eventos').insert({
      titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
      cliente_id: form.cliente_id || null, data_inicio, data_fim,
      dia_todo: form.dia_todo, visivel_cliente: form.visivel_cliente,
      local: form.local || null, link_online: form.link_online || null,
      observacoes: form.observacoes || null, status: 'confirmado'
    })
    setModalAberto(false)
    setForm(formVazio)
    carregar()
  }

  async function salvarEdicao() {
    if (!eventoDetalhes?.id) return
    setSalvando(true)
    const data_inicio = formEditar.dia_todo
      ? `${formEditar.data_inicio}T00:00:00`
      : `${formEditar.data_inicio}T${formEditar.hora_inicio}:00`
    const data_fim = formEditar.data_fim
      ? (formEditar.dia_todo ? `${formEditar.data_fim}T23:59:59` : `${formEditar.data_fim}T${formEditar.hora_fim}:00`)
      : data_inicio

    await supabase.from('eventos').update({
      titulo: formEditar.titulo, descricao: formEditar.descricao, tipo: formEditar.tipo,
      cliente_id: formEditar.cliente_id || null, data_inicio, data_fim,
      dia_todo: formEditar.dia_todo, visivel_cliente: formEditar.visivel_cliente,
      local: formEditar.local || null, link_online: formEditar.link_online || null,
      observacoes: formEditar.observacoes || null,
    }).eq('id', eventoDetalhes.id)

    setSalvando(false)
    setModoEditar(false)
    setEventoDetalhes(null)
    carregar()
  }

  async function aprovarEvento(id: string, status: 'confirmado' | 'cancelado') {
    await supabase.from('eventos').update({ status }).eq('id', id)
    setEventoDetalhes(null)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    setEventoDetalhes(null)
    carregar()
  }

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesSelecionado), end: endOfMonth(mesSelecionado) })
  const primeiroDia = startOfMonth(mesSelecionado).getDay()
  const diasVazios = Array(primeiroDia).fill(null)

  const eventosNoDia = (dia: Date) => eventos.filter(e => isSameDay(parseISO(e.data_inicio), dia))
  const eventosDiaSelecionado = diaSelecionado ? eventos.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado)) : []

  const CamposEvento = ({ f, set }: { f: typeof formVazio; set: (k: string, v: any) => void }) => (
    <div className="space-y-4">
      <div>
        <label className="label">Título *</label>
        <input className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Nome do evento" />
      </div>
      <div>
        <label className="label">Tipo</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(TIPO_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => set('tipo', k)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                f.tipo === k ? 'text-white' : 'bg-creme text-gray-600')}
              style={f.tipo === k ? { backgroundColor: v.cor } : {}}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Cliente</label>
        <select className="input" value={f.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
          <option value="">Sem cliente</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="dia_todo" checked={f.dia_todo} onChange={e => set('dia_todo', e.target.checked)} className="rounded" />
        <label htmlFor="dia_todo" className="text-sm text-gray-700">Dia todo</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Data início *</label>
          <input className="input" type="date" value={f.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
        </div>
        {!f.dia_todo && (
          <div>
            <label className="label">Hora início</label>
            <input className="input" type="time" value={f.hora_inicio} min="08:00" max="18:00" onChange={e => set('hora_inicio', e.target.value)} />
          </div>
        )}
      </div>
      {!f.dia_todo && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data fim</label>
            <input className="input" type="date" value={f.data_fim} onChange={e => set('data_fim', e.target.value)} />
          </div>
          <div>
            <label className="label">Hora fim</label>
            <input className="input" type="time" value={f.hora_fim} min="08:00" max="18:00" onChange={e => set('hora_fim', e.target.value)} />
          </div>
        </div>
      )}

      {/* Local ou link */}
      <div>
        <label className="label flex items-center gap-1.5"><MapPin size={13} /> Local (presencial)</label>
        <input className="input" value={f.local} onChange={e => set('local', e.target.value)} placeholder="Ex: Rua das Flores, 123 — Salvador" />
      </div>
      <div>
        <label className="label flex items-center gap-1.5"><Link size={13} /> Link (online)</label>
        <input className="input" value={f.link_online} onChange={e => set('link_online', e.target.value)} placeholder="https://meet.google.com/..." />
      </div>

      <div>
        <label className="label">Descrição</label>
        <textarea className="input resize-none" rows={2} value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Pauta ou descrição..." />
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea className="input resize-none" rows={2} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas internas..." />
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="visivel" checked={f.visivel_cliente} onChange={e => set('visivel_cliente', e.target.checked)} className="rounded" />
        <label htmlFor="visivel" className="text-sm text-gray-700">Visível para o cliente</label>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Horário comercial 8h-18h · Seg-Sex</p>
        </div>
        <button onClick={() => {
          setForm({ ...formVazio, data_inicio: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' })
          setModalAberto(true)
        }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMesSelecionado(m => subMonths(m, 1))} className="btn-ghost p-2"><ChevronLeft size={18} /></button>
            <h2 className="font-display text-lg font-semibold text-gray-800 capitalize">
              {format(mesSelecionado, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setMesSelecionado(m => addMonths(m, 1))} className="btn-ghost p-2"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {diasVazios.map((_, i) => <div key={`v-${i}`} />)}
            {diasDoMes.map(dia => {
              const evs = eventosNoDia(dia)
              const selecionado = diaSelecionado && isSameDay(dia, diaSelecionado)
              const hoje = isToday(dia)
              const fds = dia.getDay() === 0 || dia.getDay() === 6
              const temPendente = evs.some(e => e.status === 'pendente')

              return (
                <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                  className={cn(
                    'relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : 'hover:bg-creme',
                    fds && !selecionado && 'text-gray-400'
                  )}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  {evs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {evs.slice(0, 3).map(e => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: selecionado ? 'white' : TIPO_CONFIG[e.tipo as keyof typeof TIPO_CONFIG]?.cor || '#6B0F2A' }} />
                      ))}
                    </div>
                  )}
                  {temPendente && !selecionado && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.cor }} />
                <span className="text-xs text-gray-500">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Eventos do dia */}
        <div className="card">
          <h3 className="section-title text-base mb-4">
            {diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
          </h3>

          {eventosDiaSelecionado.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum evento</p>
              <button onClick={() => {
                setForm({ ...formVazio, data_inicio: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' })
                setModalAberto(true)
              }} className="btn-ghost text-xs mt-2">+ Adicionar</button>
            </div>
          ) : (
            <div className="space-y-3">
              {eventosDiaSelecionado.map(evento => {
                const config = TIPO_CONFIG[evento.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.outro
                const Icon = config.icon
                return (
                  <div key={evento.id}
                    onClick={() => abrirDetalhes(evento)}
                    className="group flex gap-3 p-3 rounded-xl hover:bg-creme transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.cor + '20' }}>
                      <Icon size={14} style={{ color: config.cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                      {evento.clientes?.nome && <p className="text-xs text-gray-400">{evento.clientes.nome}</p>}
                      {!evento.dia_todo && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {format(parseISO(evento.data_inicio), 'HH:mm')}
                            {evento.data_fim && ` - ${format(parseISO(evento.data_fim), 'HH:mm')}`}
                          </span>
                        </div>
                      )}
                      {evento.local && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{evento.local}</p>}
                      {evento.link_online && (
                        <a href={evento.link_online} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-vinho hover:underline flex items-center gap-1 mt-0.5">
                          <Link size={10} /> Entrar na reunião
                        </a>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {evento.status === 'pendente' && (
                          <span className="badge bg-orange-100 text-orange-700 text-xs">⏳ Aguardando aprovação</span>
                        )}
                        {evento.status === 'confirmado' && (
                          <span className="badge bg-emerald-100 text-emerald-700 text-xs">✓ Confirmado</span>
                        )}
                        {evento.status === 'cancelado' && (
                          <span className="badge bg-red-100 text-red-700 text-xs">✗ Cancelado</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal detalhes/edição */}
      <Modal open={!!eventoDetalhes} onClose={() => { setEventoDetalhes(null); setModoEditar(false) }}>
        {eventoDetalhes && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-vinho">{eventoDetalhes.titulo}</h2>
              <div className="flex items-center gap-2">
                {!modoEditar ? (
                  <button onClick={() => setModoEditar(true)} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5">
                    <Edit2 size={14} /> Editar
                  </button>
                ) : (
                  <>
                    <button onClick={salvarEdicao} disabled={salvando} className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                      <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setModoEditar(false)} className="btn-ghost text-sm py-1.5">Cancelar</button>
                  </>
                )}
                <button onClick={() => { setEventoDetalhes(null); setModoEditar(false) }} className="btn-ghost p-2"><X size={18} /></button>
              </div>
            </div>

            {modoEditar ? (
              <CamposEvento f={formEditar} set={(k, v) => setFormEditar(f => ({ ...f, [k]: v }))} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge text-xs text-white" style={{ backgroundColor: TIPO_CONFIG[eventoDetalhes.tipo as keyof typeof TIPO_CONFIG]?.cor }}>
                    {TIPO_CONFIG[eventoDetalhes.tipo as keyof typeof TIPO_CONFIG]?.label}
                  </span>
                  {eventoDetalhes.clientes?.nome && (
                    <span className="badge bg-creme text-gray-600 text-xs">{eventoDetalhes.clientes.nome}</span>
                  )}
                  <span className={cn('badge text-xs', {
                    'bg-emerald-100 text-emerald-700': eventoDetalhes.status === 'confirmado',
                    'bg-orange-100 text-orange-700': eventoDetalhes.status === 'pendente',
                    'bg-red-100 text-red-700': eventoDetalhes.status === 'cancelado',
                  })}>
                    {eventoDetalhes.status}
                  </span>
                </div>

                {!eventoDetalhes.dia_todo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} />
                    {format(parseISO(eventoDetalhes.data_inicio), "dd/MM/yyyy 'às' HH:mm")}
                    {eventoDetalhes.data_fim && ` até ${format(parseISO(eventoDetalhes.data_fim), 'HH:mm')}`}
                  </div>
                )}
                {eventoDetalhes.local && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} /> {eventoDetalhes.local}
                  </div>
                )}
                {eventoDetalhes.link_online && (
                  <a href={eventoDetalhes.link_online} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-vinho hover:underline">
                    <Link size={14} /> Entrar na reunião online
                  </a>
                )}
                {eventoDetalhes.descricao && <p className="text-sm text-gray-600">{eventoDetalhes.descricao}</p>}
                {eventoDetalhes.observacoes && (
                  <div className="bg-creme rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
                    <p className="text-sm text-gray-700">{eventoDetalhes.observacoes}</p>
                  </div>
                )}

                {/* Aprovação de solicitações */}
                {eventoDetalhes.status === 'pendente' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-orange-700 mb-2">⏳ Solicitação pendente de aprovação</p>
                    <div className="flex gap-2">
                      <button onClick={() => aprovarEvento(eventoDetalhes.id, 'cancelado')}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-1.5">
                        <XCircle size={14} /> Recusar
                      </button>
                      <button onClick={() => aprovarEvento(eventoDetalhes.id, 'confirmado')}
                        className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} /> Confirmar
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => excluir(eventoDetalhes.id)} className="btn-danger flex-1 justify-center text-sm">Excluir</button>
                  <button onClick={() => { setEventoDetalhes(null); setModoEditar(false) }} className="btn-secondary flex-1 text-sm">Fechar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal novo evento */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo evento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <CamposEvento f={form} set={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
          <div className="flex gap-3 pt-4">
            <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={salvar} className="btn-primary flex-1 justify-center">Salvar evento</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
