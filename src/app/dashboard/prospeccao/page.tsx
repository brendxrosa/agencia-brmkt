'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Prospecto } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { Plus, X, TrendingUp, Instagram, Phone, Mail } from 'lucide-react'

const COLUNAS: { key: Prospecto['status']; label: string; cor: string }[] = [
  { key: 'contato', label: 'Contato', cor: '#6B7280' },
  { key: 'proposta', label: 'Proposta enviada', cor: '#6B0F2A' },
  { key: 'negociacao', label: 'Em negociação', cor: '#C2185B' },
  { key: 'fechado', label: 'Fechado ✓', cor: '#2E7D32' },
  { key: 'perdido', label: 'Perdido', cor: '#9E9E9E' },
]

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

export default function ProspeccaoPage() {
  const supabase = createClient()
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', empresa: '', email: '', telefone: '', instagram: '',
    segmento: '', origem: '', valor_estimado: 0, observacoes: '', status: 'contato' as Prospecto['status']
  })

  async function carregar() {
    const { data } = await supabase.from('prospectos').select('*').order('created_at', { ascending: false })
    setProspectos(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.nome) return alert('Nome é obrigatório!')
    await supabase.from('prospectos').insert(form)
    setModalAberto(false)
    setForm({ nome: '', empresa: '', email: '', telefone: '', instagram: '', segmento: '', origem: '', valor_estimado: 0, observacoes: '', status: 'contato' })
    carregar()
  }

  async function mover(id: string, status: Prospecto['status']) {
    await supabase.from('prospectos').update({ status }).eq('id', id)
    setProspectos(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este prospecto?')) return
    await supabase.from('prospectos').delete().eq('id', id)
    carregar()
  }

  const totalFechado = prospectos.filter(p => p.status === 'fechado').reduce((acc, p) => acc + (p.valor_estimado || 0), 0)
  const totalPipeline = prospectos.filter(p => !['fechado','perdido'].includes(p.status)).reduce((acc, p) => acc + (p.valor_estimado || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Prospecção</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pipeline: {formatCurrency(totalPipeline)} · Fechado: {formatCurrency(totalFechado)}
          </p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo prospecto
        </button>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map(c => <div key={c.key} className="w-64 flex-shrink-0 h-96 bg-creme rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {COLUNAS.map(coluna => {
            const items = prospectos.filter(p => p.status === coluna.key)
            return (
              <div key={coluna.key}
                className="w-64 flex-shrink-0 bg-creme/50 rounded-2xl"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('id')
                  if (id) mover(id, coluna.key)
                  setArrastando(null)
                }}>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: coluna.cor }} />
                    <span className="text-sm font-medium text-gray-700">{coluna.label}</span>
                    <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full">{items.length}</span>
                  </div>
                </div>

                <div className="px-3 pb-3 space-y-2 min-h-24">
                  {items.map(p => (
                    <div key={p.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('id', p.id); setArrastando(p.id) }}
                      onDragEnd={() => setArrastando(null)}
                      className={cn('bg-white rounded-xl p-3 shadow-card cursor-grab active:cursor-grabbing group hover:shadow-card-hover transition-all',
                        arrastando === p.id && 'opacity-40')}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.nome}</p>
                          {p.empresa && <p className="text-xs text-gray-400">{p.empresa}</p>}
                        </div>
                        <button onClick={() => excluir(p.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                          <X size={12} />
                        </button>
                      </div>

                      {p.segmento && (
                        <span className="badge bg-creme text-gray-600 text-xs mb-2">{p.segmento}</span>
                      )}

                      <div className="space-y-1">
                        {p.instagram && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Instagram size={11} />{p.instagram}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Mail size={11} /><span className="truncate">{p.email}</span>
                          </div>
                        )}
                        {p.telefone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Phone size={11} />{p.telefone}
                          </div>
                        )}
                      </div>

                      {p.valor_estimado ? (
                        <p className="text-sm font-semibold text-vinho mt-2">{formatCurrency(p.valor_estimado)}/mês</p>
                      ) : null}

                      {p.origem && <p className="text-xs text-gray-300 mt-1">via {p.origem}</p>}

                      <div className="mt-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all">
                        <p className="text-xs text-gray-400 mb-1">Mover para:</p>
                        <div className="flex flex-wrap gap-1">
                          {COLUNAS.filter(c => c.key !== coluna.key).map(c => (
                            <button key={c.key} onClick={() => mover(p.id, c.key)}
                              className="text-xs px-2 py-0.5 rounded-lg bg-creme hover:bg-rosa-pale text-gray-600 transition-colors">
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-6 text-gray-300 text-xs">Nenhum aqui</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo prospecto</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do lead" />
              </div>
              <div>
                <label className="label">Empresa</label>
                <input className="input" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Instagram</label>
                <input className="input" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@perfil" />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(71) 99999-9999" />
              </div>
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@lead.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Segmento</label>
                <input className="input" value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))} placeholder="Ex: Saúde, Moda..." />
              </div>
              <div>
                <label className="label">Origem</label>
                <input className="input" value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} placeholder="Ex: Indicação, Instagram..." />
              </div>
            </div>
            <div>
              <label className="label">Valor estimado (R$/mês)</label>
              <input className="input" type="number" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas sobre o lead..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} className="btn-primary flex-1 justify-center">Adicionar</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
