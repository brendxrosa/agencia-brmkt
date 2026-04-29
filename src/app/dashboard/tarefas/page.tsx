'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Tarefa } from '@/types'
import { PRIORIDADE_CORES, cn, formatDate } from '@/lib/utils'
import { Plus, X, CheckSquare, Square, AlertCircle, Clock } from 'lucide-react'

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
  const [tarefas, setTarefas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas')
  const [form, setForm] = useState({
    titulo: '', descricao: '', cliente_id: '', responsavel_id: '',
    prioridade: 'media' as Tarefa['prioridade'],
    prazo: '', status: 'pendente' as Tarefa['status']
  })

  async function carregar() {
    const [{ data: t }, { data: c }, { data: e }] = await Promise.all([
      supabase.from('tarefas').select('*, clientes(nome), profiles!responsavel_id(nome, avatar_url)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('profiles').select('id, nome, avatar_url').in('role', ['admin', 'equipe'])
    ])
    setTarefas(t || [])
    setClientes(c || [])
    setEquipe(e || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirEditar(tarefa: any) {
    setEditando(tarefa)
    setForm({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || '',
      cliente_id: tarefa.cliente_id || '',
      responsavel_id: tarefa.responsavel_id || '',
      prioridade: tarefa.prioridade,
      prazo: tarefa.prazo || '',
      status: tarefa.status
    })
    setModalAberto(true)
  }

  async function salvar() {
    if (!form.titulo) return alert('Título é obrigatório!')
    if (editando?.id) {
      await supabase.from('tarefas').update(form).eq('id', editando.id)
    } else {
      await supabase.from('tarefas').insert(form)
    }
    setModalAberto(false)
    setEditando(null)
    setForm({ titulo: '', descricao: '', cliente_id: '', responsavel_id: '', prioridade: 'media', prazo: '', status: 'pendente' })
    carregar()
  }

  async function toggleStatus(tarefa: any) {
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

  const vencida = (prazo?: string) => prazo && new Date(prazo) < new Date()

  const getInitials = (nome: string) => nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="text-gray-500 text-sm mt-1">{pendentes} pendentes · {urgentes} urgentes</p>
        </div>
        <button onClick={() => { setEditando(null); setForm({ titulo: '', descricao: '', cliente_id: '', responsavel_id: '', prioridade: 'media', prazo: '', status: 'pendente' }); setModalAberto(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 bg-creme rounded-xl p-1">
          {[['todas','Todas'],['pendente','Pendentes'],['em_progresso','Em progresso'],['concluida','Concluídas']].map(([v,l]) => (
            <button key={v} onClick={() => setFiltroStatus(v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filtroStatus === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-creme rounded-xl p-1">
          {[['todas','Todas'],['urgente','🔴'],['alta','🟠'],['media','🔵'],['baixa','⚪']].map(([v,l]) => (
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
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}</div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center py-16">
          <CheckSquare size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma tarefa encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(tarefa => (
            <div key={tarefa.id} className={cn('card flex items-center gap-4 py-3 group transition-all', tarefa.status === 'concluida' && 'opacity-60')}>
              <button onClick={() => toggleStatus(tarefa)} className="flex-shrink-0 text-gray-400 hover:text-vinho transition-colors">
                {tarefa.status === 'concluida'
                  ? <CheckSquare size={20} className="text-emerald-500" />
                  : <Square size={20} />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium text-gray-800', tarefa.status === 'concluida' && 'line-through text-gray-400')}>
                  {tarefa.titulo}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {tarefa.clientes?.nome && <span className="text-xs text-gray-400">{tarefa.clientes.nome}</span>}
                  {tarefa.prazo && (
                    <div className={cn('flex items-center gap-1 text-xs', vencida(tarefa.prazo) && tarefa.status !== 'concluida' ? 'text-red-500' : 'text-gray-400')}>
                      <Clock size={11} /> {formatDate(tarefa.prazo)}
                      {vencida(tarefa.prazo) && tarefa.status !== 'concluida' && ' · Vencida'}
                    </div>
                  )}
                  {tarefa.descricao && <span className="text-xs text-gray-400 truncate max-w-48">{tarefa.descricao}</span>}
                </div>
              </div>

              {/* Responsável */}
              {tarefa.profiles && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {tarefa.profiles.avatar_url ? (
                    <img src={tarefa.profiles.avatar_url} className="w-6 h-6 rounded-full object-cover" alt={tarefa.profiles.nome} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-vinho flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(tarefa.profiles.nome)}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 hidden sm:block">{tarefa.profiles.nome?.split(' ')[0]}</span>
                </div>
              )}

              <span className={cn('badge text-xs flex-shrink-0', PRIORIDADE_CORES[tarefa.prioridade])}>
                {tarefa.prioridade === 'urgente' && <AlertCircle size={11} className="mr-1" />}
                {tarefa.prioridade}
              </span>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => abrirEditar(tarefa)} className="btn-ghost p-1.5 text-xs">✏️</button>
                <button onClick={() => excluir(tarefa.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">
              {editando ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <button onClick={() => { setModalAberto(false); setEditando(null) }} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="O que precisa ser feito?" />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input resize-none" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cliente</label>
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

            {/* Responsável */}
            <div>
              <label className="label">Responsável</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setForm(f => ({ ...f, responsavel_id: '' }))}
                  className={cn('px-3 py-1.5 rounded-xl text-sm transition-all border',
                    !form.responsavel_id ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                  Ninguém
                </button>
                {equipe.map(m => (
                  <button key={m.id} onClick={() => setForm(f => ({ ...f, responsavel_id: m.id }))}
                    className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all border',
                      form.responsavel_id === m.id ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} className="w-5 h-5 rounded-full object-cover" alt={m.nome} />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                        {getInitials(m.nome)}
                      </div>
                    )}
                    {m.nome.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Prioridade</label>
              <div className="flex gap-2">
                {(['baixa','media','alta','urgente'] as const).map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, prioridade: p }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                      form.prioridade === p ? cn(PRIORIDADE_CORES[p], 'ring-2 ring-offset-1 ring-current') : 'bg-creme text-gray-600')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {editando && (
              <div>
                <label className="label">Status</label>
                <div className="flex gap-2">
                  {(['pendente','em_progresso','concluida'] as const).map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={cn('flex-1 py-2 rounded-xl text-xs font-medium transition-all',
                        form.status === s ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                      {s === 'em_progresso' ? 'Em progresso' : s === 'concluida' ? 'Concluída' : 'Pendente'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModalAberto(false); setEditando(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} className="btn-primary flex-1 justify-center">
                {editando ? 'Salvar alterações' : 'Criar tarefa'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
