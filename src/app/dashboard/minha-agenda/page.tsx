'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, addWeeks, subMonths, subWeeks, isToday, isSameMonth
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TZ = 'America/Bahia'
const H0 = 6
const H1 = 22
const PX = 44

function diaBR(iso: string) { return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }) }
function horaBR(iso: string) { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) }
function toISO(data: string, hora: string) { return data + 'T' + hora + ':00-03:00' }
function minutos(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
function hhmm(min: number) { const h = Math.floor(min / 60), m = min % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') }

interface Ev {
  id: string; titulo: string; data: string; ini: string; fim: string
  dia_todo: boolean; local?: string; descricao?: string; google?: boolean
}

const VAZIO = { id: '', titulo: '', data: '', ini: '09:00', fim: '10:00', dia_todo: false, local: '', descricao: '' }

export default function MinhaAgendaPage() {
  const supabase = createClient()
  const [visao, setVisao] = useState<'semana' | 'mes'>('semana')
  const [ref, setRef] = useState(new Date())
  const [eventos, setEventos] = useState<Ev[]>([])
  const [googleEv, setGoogleEv] = useState<Ev[]>([])
  const [googleOk, setGoogleOk] = useState<boolean | null>(null)
  const [form, setForm] = useState<typeof VAZIO | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)

  async function carregar() {
    const { data } = await supabase.from('eventos').select('*').order('data_inicio')
    const lista: Ev[] = (data || []).map((e: any) => ({
      id: e.id, titulo: e.titulo, data: diaBR(e.data_inicio),
      ini: e.dia_todo ? '00:00' : horaBR(e.data_inicio),
      fim: e.data_fim && !e.dia_todo ? horaBR(e.data_fim) : (e.dia_todo ? '23:59' : hhmm(Math.min(minutos(horaBR(e.data_inicio)) + 60, 1439))),
      dia_todo: !!e.dia_todo, local: e.local || '', descricao: e.descricao || '',
    }))
    setEventos(lista)
    const gids = new Set((data || []).map((e: any) => e.google_event_id).filter(Boolean))
    try {
      const r = await fetch('/api/google-calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar' }),
      })
      const j = await r.json()
      if (r.ok && j.eventos) {
        setGoogleOk(true)
        setGoogleEv(j.eventos.filter((g: any) => !gids.has(g.id)).map((g: any) => {
          const inicio = g.start?.dateTime || g.start?.date
          const fim = g.end?.dateTime || g.end?.date
          const todo = !g.start?.dateTime
          return {
            id: 'g-' + g.id, titulo: g.summary || '(sem título)', google: true,
            data: todo ? g.start.date : diaBR(inicio), dia_todo: todo,
            ini: todo ? '00:00' : horaBR(inicio), fim: todo ? '23:59' : horaBR(fim),
            local: g.location || '', descricao: g.description || '',
          } as Ev
        }))
      } else setGoogleOk(false)
    } catch { setGoogleOk(false) }
  }
  useEffect(() => { carregar() }, [])

  const todos = [...eventos, ...googleEv]
  const doDia = (d: Date) => todos.filter(e => e.data === format(d, 'yyyy-MM-dd'))

  function abrirNovo(data: Date, ini?: string) {
    const i = ini || '09:00'
    setForm({ ...VAZIO, data: format(data, 'yyyy-MM-dd'), ini: i, fim: hhmm(Math.min(minutos(i) + 60, 1439)) })
  }
  function abrirEditar(e: Ev) {
    if (e.google) return
    setForm({ id: e.id, titulo: e.titulo, data: e.data, ini: e.ini, fim: e.fim, dia_todo: e.dia_todo, local: e.local || '', descricao: e.descricao || '' })
  }

  async function salvar() {
    if (!form || !form.titulo || !form.data) return
    setSalvando(true)
    const dados: any = {
      titulo: form.titulo, tipo: 'outro', dia_todo: form.dia_todo,
      data_inicio: form.dia_todo ? toISO(form.data, '00:00') : toISO(form.data, form.ini),
      data_fim: form.dia_todo ? toISO(form.data, '23:59') : toISO(form.data, form.fim),
      local: form.local || null, descricao: form.descricao || null,
    }
    if (form.id) await supabase.from('eventos').update(dados).eq('id', form.id)
    else await supabase.from('eventos').insert({ ...dados, status: 'confirmado', visivel_cliente: false, cliente_id: null })
    setSalvando(false); setForm(null); carregar()
  }

  async function excluir() {
    if (!form?.id || !confirm('Excluir este evento?')) return
    await supabase.from('eventos').delete().eq('id', form.id)
    setForm(null); carregar()
  }

  async function mover(id: string, dia: Date, minInicio?: number) {
    const e = eventos.find(x => x.id === id); if (!e) return
    const dur = minutos(e.fim) - minutos(e.ini)
    const ini = e.dia_todo ? '00:00' : minInicio !== undefined ? hhmm(minInicio) : e.ini
    const fim = e.dia_todo ? '23:59' : hhmm(Math.min(minutos(ini) + Math.max(dur, 15), 1439))
    const data = format(dia, 'yyyy-MM-dd')
    await supabase.from('eventos').update({ data_inicio: toISO(data, ini), data_fim: toISO(data, fim) }).eq('id', id)
    setArrastando(null); carregar()
  }

  const dias = visao === 'semana'
    ? eachDayOfInterval({ start: startOfWeek(ref), end: endOfWeek(ref) })
    : eachDayOfInterval({ start: startOfWeek(startOfMonth(ref)), end: endOfWeek(endOfMonth(ref)) })

  function nav(delta: number) {
    if (visao === 'semana') setRef(delta > 0 ? addWeeks(ref, 1) : subWeeks(ref, 1))
    else setRef(delta > 0 ? addMonths(ref, 1) : subMonths(ref, 1))
  }

  const titulo = visao === 'semana'
    ? format(dias[0], 'd MMM', { locale: ptBR }) + ' – ' + format(dias[6], 'd MMM yyyy', { locale: ptBR })
    : format(ref, 'MMMM yyyy', { locale: ptBR })

  const horas = Array.from({ length: H1 - H0 }, (_, i) => H0 + i)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Minha agenda</h1>
          <p className="text-gray-500 text-sm mt-1">
            Só seus compromissos, sem os posts dos clientes.
            {googleOk === false && ' Google Agenda ainda não conectado.'}
            {googleOk === true && ' Google Agenda conectado.'}
          </p>
        </div>
        <button onClick={() => abrirNovo(new Date())} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Novo evento
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => nav(-1)} className="btn-ghost p-2"><ChevronLeft size={18} /></button>
            <button onClick={() => nav(1)} className="btn-ghost p-2"><ChevronRight size={18} /></button>
            <button onClick={() => setRef(new Date())} className="btn-secondary text-xs px-3 py-1.5 ml-1">Hoje</button>
          </div>
          <h2 className="font-display text-lg font-semibold text-gray-800 capitalize">{titulo}</h2>
          <div className="flex gap-1 bg-creme rounded-xl p-1">
            {(['semana', 'mes'] as const).map(v => (
              <button key={v} onClick={() => setVisao(v)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize',
                  visao === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500')}>
                {v === 'mes' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
        </div>

        {visao === 'mes' ? (
          <div>
            <div className="grid grid-cols-7 mb-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {dias.map(d => (
                <div key={d.toISOString()}
                  onClick={() => abrirNovo(d)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => arrastando && mover(arrastando, d)}
                  className={cn('bg-white min-h-24 p-1 cursor-pointer hover:bg-creme/40', !isSameMonth(d, ref) && 'bg-gray-50')}>
                  <div className={cn('text-xs w-6 h-6 flex items-center justify-center rounded-full mb-0.5',
                    isToday(d) ? 'bg-vinho text-white' : isSameMonth(d, ref) ? 'text-gray-700' : 'text-gray-300')}>
                    {format(d, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {doDia(d).slice(0, 3).map(e => (
                      <div key={e.id} draggable={!e.google}
                        onDragStart={() => setArrastando(e.id)}
                        onClick={ev => { ev.stopPropagation(); abrirEditar(e) }}
                        className={cn('text-xs truncate rounded px-1 py-0.5',
                          e.google ? 'bg-blue-50 text-blue-700 border border-dashed border-blue-200' : 'bg-vinho/10 text-vinho')}>
                        {!e.dia_todo && <span className="opacity-60">{e.ini} </span>}{e.titulo}
                      </div>
                    ))}
                    {doDia(d).length > 3 && <p className="text-xs text-gray-400 px-1">+{doDia(d).length - 3}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div />
                {dias.map(d => (
                  <div key={d.toISOString()} className="text-center pb-1">
                    <p className="text-xs text-gray-400 uppercase">{format(d, 'EEE', { locale: ptBR })}</p>
                    <p className={cn('text-sm font-medium w-8 h-8 mx-auto flex items-center justify-center rounded-full',
                      isToday(d) ? 'bg-vinho text-white' : 'text-gray-700')}>{format(d, 'd')}</p>
                    {doDia(d).filter(e => e.dia_todo).map(e => (
                      <div key={e.id} onClick={() => abrirEditar(e)}
                        className={cn('text-xs truncate rounded px-1 py-0.5 mt-0.5 mx-0.5 cursor-pointer',
                          e.google ? 'bg-blue-50 text-blue-700' : 'bg-vinho/10 text-vinho')}>{e.titulo}</div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="grid border-t border-gray-100" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div>
                  {horas.map(h => (
                    <div key={h} style={{ height: PX }} className="text-xs text-gray-400 text-right pr-2 -mt-2">{String(h).padStart(2, '0')}:00</div>
                  ))}
                </div>
                {dias.map(d => (
                  <div key={d.toISOString()} className="relative border-l border-gray-100"
                    style={{ height: PX * horas.length }}
                    onClick={ev => {
                      const r = ev.currentTarget.getBoundingClientRect()
                      const m = H0 * 60 + Math.floor(((ev.clientY - r.top) / PX) * 2) * 30
                      abrirNovo(d, hhmm(m))
                    }}
                    onDragOver={ev => ev.preventDefault()}
                    onDrop={ev => {
                      if (!arrastando) return
                      const r = ev.currentTarget.getBoundingClientRect()
                      const m = H0 * 60 + Math.round(((ev.clientY - r.top) / PX) * 2) * 30
                      mover(arrastando, d, Math.max(H0 * 60, Math.min(m, H1 * 60 - 30)))
                    }}>
                    {horas.map(h => (
                      <div key={h} style={{ height: PX }} className="border-b border-gray-50" />
                    ))}
                    {doDia(d).filter(e => !e.dia_todo).map(e => {
                      const top = Math.max(0, (minutos(e.ini) - H0 * 60) / 60 * PX)
                      const alt = Math.max(22, (minutos(e.fim) - minutos(e.ini)) / 60 * PX)
                      return (
                        <div key={e.id} draggable={!e.google}
                          onDragStart={() => setArrastando(e.id)}
                          onClick={ev => { ev.stopPropagation(); abrirEditar(e) }}
                          style={{ top, height: alt }}
                          className={cn('absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden text-xs cursor-pointer',
                            e.google ? 'bg-blue-50 text-blue-700 border border-dashed border-blue-200' : 'bg-vinho text-white')}>
                          <p className="font-medium truncate">{e.titulo}</p>
                          <p className="opacity-70 truncate">{e.ini}–{e.fim}</p>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Clique num horário ou dia para criar. Arraste um evento para mover. Eventos azuis tracejados vêm do seu Google Agenda.</p>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-vinho">{form.id ? 'Editar evento' : 'Novo evento'}</h2>
              <button onClick={() => setForm(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Título *</label>
                <input className="input" autoFocus value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Captação Colibri" /></div>
              <div><label className="label">Data</label>
                <input className="input" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={form.dia_todo} onChange={e => setForm({ ...form, dia_todo: e.target.checked })} /> Dia todo
              </label>
              {!form.dia_todo && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Início</label>
                    <input className="input" type="time" value={form.ini} onChange={e => setForm({ ...form, ini: e.target.value })} /></div>
                  <div><label className="label">Fim</label>
                    <input className="input" type="time" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} /></div>
                </div>
              )}
              <div><label className="label flex items-center gap-1"><MapPin size={12} /> Local</label>
                <input className="input" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} /></div>
              <div><label className="label">Notas</label>
                <textarea className="input resize-none" rows={3} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="flex gap-2 pt-1">
                {form.id && <button onClick={excluir} className="btn-secondary text-red-600 px-3"><Trash2 size={16} /></button>}
                <button onClick={() => setForm(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={salvar} disabled={salvando || !form.titulo} className="btn-primary flex-1 justify-center">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
