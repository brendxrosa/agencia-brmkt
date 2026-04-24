'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Tarefa } from '@/types'
import { PRIORIDADE_CORES, cn, formatDate } from '@/lib/utils'
import { Plus, X, CheckSquare, Square, AlertCircle, Clock, Filter } from 'lucide-react'

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

export default function TarefasPage() {
  const supabase = createClient()
  const [tarefas, setTarefas] = useState<(Tarefa & { clientes: { nome: string } | null })[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas')
  const [form, setForm] = useState({
    titulo: '', descricao: '', cliente_id: '',
    prioridade: 'media' as Tarefa['prioridade'],
    prazo: '', status: 'pendente' as Tarefa['status']
  })

  async function carregar() {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tarefas').select('*, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome')
    ])
    setTarefas(t || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.titulo) return alert('Título é obrigatório!')
    await supabase.from('tarefas').insert(form)
    setModalAberto(false)
    setForm({ titulo: '', descricao: '', cliente_id: '', prioridade: 'media', prazo: '', status: 'pendente' })
    carregar()
  }

  async function toggleStatus(tarefa: Tarefa) {
    const novoStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida'
    await supabase.from('tarefas').update({ status: novoStatus }).eq('id', tarefa.id)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta tarefa?')) return
    await supabase.from('tarefas').delete().eq('id', id)
    carregar()
  }

  const filtradas = tarefas.filter(t => {
    const statusOk = filtroStatus === 'todas' || t.status === filtroStatus
    const prioridadeOk = filtroPrioridade === 'todas' || t.prioridade === filtroPrioridade
    return statusOk && prioridadeOk
  })

  const pendentes = tarefas.filter(t => t.status === 'pendente').length
  const urgentes = tarefas.filter(t => t.prioridade === 'urgente' && t.status !== 'concluida').length
  const concluidas = tarefas.filter(t => t.status === 'concluida').length

  const vencida = (prazo?: string) => {
    if (!prazo) return false
    return new Date(prazo) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="text-gray-500 text-sm mt-1">{pendentes} pendentes · {urgentes} urgentes · {concluidas} concluídas</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 bg-creme rounded-xl p-1">
          {[['todas', 'Todas'], ['pendente', 'Pendentes'], ['em_progresso', 'Em progresso'], ['concluida', 'Concluídas']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroStatus(v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filtroStatus === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-creme rounded-xl p-1">
          {[['todas', 'Todas'], ['urgente', '🔴 Urgente'], ['alta', '🟠 Alta'], ['media', '🔵 Média'], ['baixa', '⚪ Baixa']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroPrioridade(v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filtroPrioridade === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center py-16">
          <CheckSquare size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhuma tarefa encontrada</p>
          <button onClick={() => setModalAberto(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Nova tarefa
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(tarefa => (
            <div key={tarefa.id}
              className={cn('card flex items-center gap-4 py-3 group transition-all',
                tarefa.status === 'concluida' && 'opacity-60')}>
              {/* Checkbox */}
              <button onClick={() => toggleStatus(tarefa)} className="flex-shrink-0 text-gray-400 hover:text-vinho transition-colors">
                {tarefa.status === 'concluida'
                  ? <CheckSquare size={20} className="text-emerald-500" />
                  : <Square size={20} />}
              </button>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium text-gray-800', tarefa.status === 'concluida' && 'line-through text-gray-400')}>
                  {tarefa.titulo}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {tarefa.clientes?.nome && (
                    <span className="text-xs text-gray-400">{tarefa.clientes.nome}</span>
                  )}
                  {tarefa.prazo && (
                    <div className={cn('flex items-center gap-1 text-xs', vencida(tarefa.prazo) && tarefa.status !== 'concluida' ? 'text-red-500' : 'text-gray-400')}>
                      <Clock size={11} />
                      {formatDate(tarefa.prazo)}
                      {vencida(tarefa.prazo) && tarefa.status !== 'concluida' && ' · Vencida'}
                    </div>
                  )}
                  {tarefa.descricao && (
                    <span className="text-xs text-gray-400 truncate max-w-48">{tarefa.descricao}</span>
                  )}
                </div>
              </div>

              {/* Prioridade */}
              <span className={cn('badge text-xs flex-shrink-0', PRIORIDADE_CORES[tarefa.prioridade])}>
                {tarefa.prioridade === 'urgente' && <AlertCircle size={11} className="mr-1" />}
                {tarefa.prioridade}
              </span>

              {/* Status */}
              <span className={cn('badge text-xs flex-shrink-0', {
                'bg-gray-100 text-gray-600': tarefa.status === 'pendente',
                'bg-blue-100 text-blue-700': tarefa.status === 'em_progresso',
                'bg-emerald-100 text-emerald-700': tarefa.status === 'concluida',
              })}>
                {tarefa.status === 'em_progresso' ? 'Em progresso' : tarefa.status === 'concluida' ? 'Concluída' : 'Pendente'}
              </span>

              {/* Excluir */}
              <button onClick={() => excluir(tarefa.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Nova tarefa</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="O que precisa ser feito?" />
            </div>

            <div>
              <label className="label">Descrição</label>
              <textarea className="input resize-none" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes da tarefa..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cliente (opcional)</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                  <option value="">Sem cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Prazo</label>
                <input className="input" type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Prioridade</label>
              <div className="flex gap-2">
                {(['baixa', 'media', 'alta', 'urgente'] as const).map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, prioridade: p }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                      form.prioridade === p ? cn(PRIORIDADE_CORES[p], 'ring-2 ring-offset-1 ring-current') : 'bg-creme text-gray-600')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} className="btn-primary flex-1 justify-center">Criar tarefa</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
