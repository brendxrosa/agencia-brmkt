'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Plus, X, ChevronLeft, ChevronRight, Clock, Users, Camera, Package, DollarSign, Calendar, MapPin, Link, Edit2, Save, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Converte data/hora local (Brasil UTC-3) para ISO string com timezone correto
function toLocalISO(data: string, hora: string) {
  return `${data}T${hora}:00-03:00`
}

// Formata hora de um ISO string considerando UTC-3
function formatHoraBR(isoStr: string) {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
}

// Formata data de um ISO string considerando UTC-3
function formatDataBR(isoStr: string) {
  const d = new Date(isoStr)
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}

import { useSearchParams } from 'next/navigation'

const TIPO_CONFIG = {
  reuniao: { label: 'Reunião', icon: Users, cor: '#6B0F2A' },
  captacao: { label: 'Captação', icon: Camera, cor: '#C2185B' },
  entrega: { label: 'Entrega', icon: Package, cor: '#7B1FA2' },
  pagamento: { label: 'Pagamento', icon: DollarSign, cor: '#2E7D32' },
  outro: { label: 'Outro', icon: Calendar, cor: '#E65100' },
}

const formVazio = {
  titulo: '', descricao: '', tipo: 'reuniao' as any,
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

function CamposEvento({ f, set, clientes }: { f: typeof formVazio; set: (k: string, v: any) => void; clientes: any[] }) {
  return (
    <div className="space-y-4">
      <div><label className="label">Título *</label>
        <input className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} /></div>
      <div>
        <label className="label">Tipo</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(TIPO_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => set('tipo', k)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all', f.tipo === k ? 'text-white' : 'bg-creme text-gray-600')}
              style={f.tipo === k ? { backgroundColor: v.cor } : {}}>{v.label}</button>
          ))}
        </div>
      </div>
      <div><label className="label">Cliente</label>
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
        <div><label className="label">Data início *</label>
          <input className="input" type="date" value={f.data_inicio} onChange={e => set('data_inicio', e.target.value)} /></div>
        {!f.dia_todo && <div><label className="label">Hora início</label>
          <input className="input" type="time" value={f.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} /></div>}
      </div>
      {!f.dia_todo && (
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Data fim</label>
            <input className="input" type="date" value={f.data_fim} onChange={e => set('data_fim', e.target.value)} /></div>
          <div><label className="label">Hora fim</label>
            <input className="input" type="time" value={f.hora_fim} onChange={e => set('hora_fim', e.target.value)} /></div>
        </div>
      )}
      <div><label className="label flex items-center gap-1.5"><MapPin size={13} /> Local (presencial)</label>
        <input className="input" value={f.local} onChange={e => set('local', e.target.value)} placeholder="Ex: Rua das Flores, 123" /></div>
      <div><label className="label flex items-center gap-1.5"><Link size={13} /> Link (online)</label>
        <input className="input" value={f.link_online} onChange={e => set('link_online', e.target.value)} placeholder="https://meet.google.com/..." /></div>
      <div><label className="label">Descrição</label>
        <textarea className="input resize-none" rows={2} value={f.descricao} onChange={e => set('descricao', e.target.value)} /></div>
      <div><label className="label">Observações</label>
        <textarea className="input resize-none" rows={2} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="visivel" checked={f.visivel_cliente} onChange={e => set('visivel_cliente', e.target.checked)} className="rounded" />
        <label htmlFor="visivel" className="text-sm text-gray-700">Visível para o cliente</label>
      </div>
    </div>
  )
}

function AgendaContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [eventos, setEventos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [mesSelecionado, setMesSelecionado] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const [modalAberto, setModalAberto] = useState(false)
  const [eventoDetalhes, setEventoDetalhes] = useState<any>(null)
  const [modoEditar, setModoEditar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [googleConectado, setGoogleConectado] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [form, setForm] = useState(formVazio)
  const [formEditar, setFormEditar] = useState(formVazio)
  const [diasBloqueados, setDiasBloqueados] = useState<any[]>([])
  const [modalBloquear, setModalBloquear] = useState(false)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [dataBloqueio, setDataBloqueio] = useState('')

  async function carregar() {
    const inicio = format(startOfMonth(mesSelecionado), 'yyyy-MM-dd')
    const fim = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: e }, { data: c }, googleStatus, { data: db }] = await Promise.all([
      supabase.from('eventos').select('*, clientes(nome, cor)')
        .gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59').order('data_inicio'),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome'),
      fetch('/api/google-status').then(r => r.json()).catch(() => ({ conectado: false })),
      supabase.from('dias_bloqueados').select('*').gte('data', inicio).lte('data', fim)
    ])

    setEventos(e || [])
    setClientes(c || [])
    setGoogleConectado(!!googleStatus?.conectado)
    setDiasBloqueados(db || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mesSelecionado])

  useEffect(() => {
    const google = searchParams.get('google')
    const erro = searchParams.get('erro')
    if (google === 'conectado') setSucesso('Google Calendar conectado com sucesso! ✅')
    if (erro) setSucesso('Erro ao conectar Google Calendar. Tente novamente.')
    if (google || erro) setTimeout(() => setSucesso(''), 5000)
  }, [searchParams])

  function abrirDetalhes(evento: any) {
    setEventoDetalhes(evento)
    setFormEditar({
      titulo: evento.titulo || '',
      descricao: evento.descricao || '',
      tipo: evento.tipo || 'reuniao',
      cliente_id: evento.cliente_id || '',
      data_inicio: evento.data_inicio ? format(parseISO(evento.data_inicio), 'yyyy-MM-dd') : '',
      hora_inicio: evento.data_inicio ? formatHoraBR(evento.data_inicio) : '09:00',
      data_fim: evento.data_fim ? format(parseISO(evento.data_fim), 'yyyy-MM-dd') : '',
      hora_fim: evento.data_fim ? formatHoraBR(evento.data_fim) : '10:00',
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
    setSalvando(true)
    const data_inicio = form.dia_todo ? `${form.data_inicio}T00:00:00-03:00` : toLocalISO(form.data_inicio, form.hora_inicio)
    const data_fim = form.data_fim
      ? (form.dia_todo ? `${form.data_fim}T23:59:59-03:00` : toLocalISO(form.data_fim, form.hora_fim))
      : data_inicio

    const { data: novoEvento } = await supabase.from('eventos').insert({
      titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
      cliente_id: form.cliente_id || null, data_inicio, data_fim,
      dia_todo: form.dia_todo, visivel_cliente: form.visivel_cliente,
      local: form.local || null, link_online: form.link_online || null,
      observacoes: form.observacoes || null, status: 'confirmado'
    }).select().single()

    if (googleConectado && novoEvento) {
      await fetch('/api/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'criar', evento: novoEvento })
      })
    }

    setModalAberto(false)
    setForm(formVazio)
    setSalvando(false)
    carregar()
  }

  async function salvarEdicao() {
    if (!eventoDetalhes?.id) return
    setSalvando(true)
    const data_inicio = formEditar.dia_todo
      ? `${formEditar.data_inicio}T00:00:00-03:00`
      : toLocalISO(formEditar.data_inicio, formEditar.hora_inicio)
    const data_fim = formEditar.data_fim
      ? (formEditar.dia_todo ? `${formEditar.data_fim}T23:59:59-03:00` : toLocalISO(formEditar.data_fim, formEditar.hora_fim))
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

  async function bloquearDia() {
    if (!dataBloqueio) return
    await supabase.from('dias_bloqueados').insert({
      data: dataBloqueio,
      motivo: motivoBloqueio || null
    })
    setModalBloquear(false)
    setDataBloqueio('')
    setMotivoBloqueio('')
    carregar()
  }

  async function desbloquearDia(data: string) {
    await supabase.from('dias_bloqueados').delete().eq('data', data)
    carregar()
  }

  async function sincronizarComGoogle() {
    if (!googleConectado) { window.location.href = '/api/auth/google'; return }
    setSincronizando(true)
    try {
      const eventosSemSync = eventos.filter(e => !e.google_event_id)
      let count = 0
      for (const evento of eventosSemSync) {
        const res = await fetch('/api/google-calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'criar', evento })
        })
        const data = await res.json()
        if (data.success) count++
      }
      if (eventosSemSync.length === 0) {
        setSucesso('Todos os eventos já estão sincronizados! ✅')
      } else {
        setSucesso(`${count} evento(s) sincronizado(s) com o Google Calendar! ✅`)
      }
      setTimeout(() => setSucesso(''), 5000)
      carregar()
    } catch { setSucesso('Erro ao sincronizar') }
    setSincronizando(false)
  }

  async function enviarParaGoogle(evento: any) {
    setSincronizando(true)
    const res = await fetch('/api/google-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'criar', evento })
    })
    const data = await res.json()
    setSucesso(data.success ? 'Adicionado ao Google Calendar! ✅' : 'Erro: ' + data.error)
    setTimeout(() => setSucesso(''), 4000)
    setSincronizando(false)
    setEventoDetalhes(null)
    if (data.success) carregar()
  }

  async function aprovarEvento(id: string, status: 'confirmado' | 'cancelado') {
    await supabase.from('eventos').update({ status }).eq('id', id)
    setEventoDetalhes(null)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este evento?')) return
    const evento = eventos.find(e => e.id === id)
    if (evento?.google_event_id && googleConectado) {
      await fetch('/api/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletar', evento })
      })
    }
    await supabase.from('eventos').delete().eq('id', id)
    setEventoDetalhes(null)
    carregar()
  }

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesSelecionado), end: endOfMonth(mesSelecionado) })
  const primeiroDia = startOfMonth(mesSelecionado).getDay()
  const diasVazios = Array(primeiroDia).fill(null)
  const eventosNoDia = (dia: Date) => eventos.filter(e => isSameDay(parseISO(e.data_inicio), dia))
  const eventosDiaSelecionado = diaSelecionado ? eventos.filter(e => isSameDay(parseISO(e.data_inicio), diaSelecionado)) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Horário comercial 8h–18h · Seg–Sex</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            setDataBloqueio(diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '')
            setModalBloquear(true)
          }} className="btn-secondary flex items-center gap-2 text-sm text-gray-600">
            🚫 Bloquear dia
          </button>
          <button onClick={sincronizarComGoogle} disabled={sincronizando}
            className={cn('btn-secondary flex items-center gap-2 text-sm', googleConectado ? 'text-emerald-700 border-emerald-200' : '')}>
            <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
            {googleConectado
              ? `Sincronizar (${eventos.filter(e => !e.google_event_id).length} pendente(s))`
              : 'Conectar Google'}
          </button>
          <button onClick={() => {
            setForm({ ...formVazio, data_inicio: diaSelecionado ? format(diaSelecionado, 'yyyy-MM-dd') : '' })
            setModalAberto(true)
          }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo evento
          </button>
        </div>
      </div>

      {sucesso && (
        <div className={cn('px-4 py-3 rounded-xl text-sm', sucesso.includes('Erro') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700')}>
          {sucesso}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
              const ehBloqueado = diasBloqueados.some(d => d.data === format(dia, 'yyyy-MM-dd'))
              return (
                <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                  className={cn('relative p-1.5 rounded-xl text-sm transition-all min-h-12 flex flex-col items-center gap-0.5',
                    selecionado ? 'bg-vinho text-white' : hoje ? 'bg-rosa-pale text-rosa font-semibold' : ehBloqueado ? 'bg-gray-100 text-gray-400' : 'hover:bg-creme',
                    fds && !selecionado && 'text-gray-400')}>
                  <span className="text-xs font-medium">{format(dia, 'd')}</span>
                  {evs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {evs.slice(0, 3).map(e => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: selecionado ? 'white' : TIPO_CONFIG[e.tipo as keyof typeof TIPO_CONFIG]?.cor || '#6B0F2A' }} />
                      ))}
                    </div>
                  )}
                  {temPendente && !selecionado && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />}
                  {ehBloqueado && !selecionado && <span className="text-xs">🚫</span>}
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
                  <div key={evento.id} onClick={() => abrirDetalhes(evento)}
                    className="flex gap-3 p-3 rounded-xl hover:bg-creme transition-all cursor-pointer">
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
                          <span className="text-xs text-gray-400">{formatHoraBR(evento.data_inicio)}</span>
                        </div>
                      )}
                      {evento.local && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{evento.local}</p>}
                      {evento.link_online && (
                        <a href={evento.link_online} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()} className="text-xs text-vinho hover:underline flex items-center gap-1">
                          <Link size={10} /> Entrar
                        </a>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {evento.google_event_id && <span className="text-xs text-emerald-600">📅 No Google</span>}
                        <span className={cn('badge text-xs', {
                          'bg-emerald-100 text-emerald-700': evento.status === 'confirmado',
                          'bg-orange-100 text-orange-700': evento.status === 'pendente',
                          'bg-red-100 text-red-700': evento.status === 'cancelado',
                        })}>{evento.status}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
              <CamposEvento f={formEditar} set={(k, v) => setFormEditar(f => ({ ...f, [k]: v }))} clientes={clientes} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge text-xs text-white" style={{ backgroundColor: TIPO_CONFIG[eventoDetalhes.tipo as keyof typeof TIPO_CONFIG]?.cor }}>
                    {TIPO_CONFIG[eventoDetalhes.tipo as keyof typeof TIPO_CONFIG]?.label}
                  </span>
                  {eventoDetalhes.clientes?.nome && <span className="badge bg-creme text-gray-600 text-xs">{eventoDetalhes.clientes.nome}</span>}
                  <span className={cn('badge text-xs', {
                    'bg-emerald-100 text-emerald-700': eventoDetalhes.status === 'confirmado',
                    'bg-orange-100 text-orange-700': eventoDetalhes.status === 'pendente',
                    'bg-red-100 text-red-700': eventoDetalhes.status === 'cancelado',
                  })}>{eventoDetalhes.status}</span>
                  {eventoDetalhes.google_event_id && <span className="badge bg-blue-100 text-blue-700 text-xs">📅 Google Calendar</span>}
                </div>
                {!eventoDetalhes.dia_todo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} />
                    {format(parseISO(eventoDetalhes.data_inicio), "dd/MM/yyyy 'às' HH:mm")}
                    {eventoDetalhes.data_fim && ` até ${format(parseISO(eventoDetalhes.data_fim), 'HH:mm')}`}
                  </div>
                )}
                {eventoDetalhes.local && <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={14} /> {eventoDetalhes.local}</div>}
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
                {eventoDetalhes.status === 'pendente' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-orange-700 mb-2">⏳ Solicitação pendente</p>
                    <div className="flex gap-2">
                      <button onClick={() => aprovarEvento(eventoDetalhes.id, 'cancelado')}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
                        <XCircle size={14} /> Recusar
                      </button>
                      <button onClick={() => aprovarEvento(eventoDetalhes.id, 'confirmado')}
                        className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} /> Confirmar
                      </button>
                    </div>
                  </div>
                )}
                {googleConectado && !eventoDetalhes.google_event_id && (
                  <button onClick={() => enviarParaGoogle(eventoDetalhes)} disabled={sincronizando}
                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                    <ExternalLink size={14} /> {sincronizando ? 'Adicionando...' : 'Adicionar ao Google Calendar'}
                  </button>
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

      {/* Modal bloquear dia */}
      <Modal open={modalBloquear} onClose={() => setModalBloquear(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">🚫 Bloquear dia</h2>
            <button onClick={() => setModalBloquear(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Data *</label>
              <input className="input" type="date" value={dataBloqueio} onChange={e => setDataBloqueio(e.target.value)} />
            </div>
            <div>
              <label className="label">Motivo (opcional)</label>
              <input className="input" value={motivoBloqueio} onChange={e => setMotivoBloqueio(e.target.value)} placeholder="Ex: Feriado, Férias, Compromisso..." />
            </div>
            {diasBloqueados.length > 0 && (
              <div>
                <p className="label mb-2">Dias bloqueados neste mês</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {diasBloqueados.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{format(new Date(d.data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}</p>
                        {d.motivo && <p className="text-xs text-gray-400">{d.motivo}</p>}
                      </div>
                      <button onClick={() => desbloquearDia(d.data)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg">
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pb-2">
              <button onClick={() => setModalBloquear(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={bloquearDia} className="btn-primary flex-1 justify-center">Bloquear</button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo evento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <CamposEvento f={form} set={(k, v) => setForm(f => ({ ...f, [k]: v }))} clientes={clientes} />
          <div className="flex gap-3 pt-4">
            <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="btn-primary flex-1 justify-center">
              {salvando ? 'Salvando...' : 'Salvar evento'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
      </div>
    }>
      <AgendaContent />
    </Suspense>
  )
}
