'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Pagamento } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Plus, X, DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function FinanceiroPage() {
  const supabase = createClient()
  const [pagamentos, setPagamentos] = useState<(Pagamento & { clientes: { nome: string; cor: string } | null })[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string; valor_mensal: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [form, setForm] = useState({
    cliente_id: '', valor: 0, mes_referencia: '',
    vencimento: '', status: 'pendente' as Pagamento['status'], observacoes: ''
  })

  async function carregar() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('pagamentos').select('*, clientes(nome, cor)').order('vencimento', { ascending: false }),
      supabase.from('clientes').select('id, nome, valor_mensal').eq('status', 'ativo').order('nome')
    ])
    setPagamentos(p || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.cliente_id || !form.valor || !form.vencimento) return alert('Cliente, valor e vencimento são obrigatórios!')
    await supabase.from('pagamentos').insert(form)
    setModalAberto(false)
    setForm({ cliente_id: '', valor: 0, mes_referencia: '', vencimento: '', status: 'pendente', observacoes: '' })
    carregar()
  }

  async function marcarPago(id: string) {
    await supabase.from('pagamentos').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este pagamento?')) return
    await supabase.from('pagamentos').delete().eq('id', id)
    carregar()
  }

  const filtrados = filtroStatus === 'todos' ? pagamentos : pagamentos.filter(p => p.status === filtroStatus)

  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((acc, p) => acc + p.valor, 0)
  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((acc, p) => acc + p.valor, 0)
  const totalAtrasado = pagamentos.filter(p => p.status === 'atrasado').reduce((acc, p) => acc + p.valor, 0)

  function gerarPagamentosMes() {
    const hoje = new Date()
    const mes = `${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`
    const promessas = clientes.map(c =>
      supabase.from('pagamentos').insert({
        cliente_id: c.id, valor: c.valor_mensal, mes_referencia: mes,
        vencimento: new Date(hoje.getFullYear(), hoje.getMonth(), 10).toISOString().split('T')[0],
        status: 'pendente'
      })
    )
    Promise.all(promessas).then(() => carregar())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">{pagamentos.length} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarPagamentosMes} className="btn-secondary text-sm">
            Gerar cobranças do mês
          </button>
          <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo pagamento
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Recebido</p>
              <p className="text-lg font-display font-bold text-emerald-700">{formatCurrency(totalPago)}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-orange-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pendente</p>
              <p className="text-lg font-display font-bold text-orange-700">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Atrasado</p>
              <p className="text-lg font-display font-bold text-red-700">{formatCurrency(totalAtrasado)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-creme rounded-xl p-1 w-fit">
        {[['todos','Todos'],['pendente','Pendentes'],['pago','Pagos'],['atrasado','Atrasados']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltroStatus(v)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              filtroStatus === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <DollarSign size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum registro encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(pag => (
            <div key={pag.id} className="card flex items-center gap-4 py-3 group">
              <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: pag.clientes?.cor || '#6B0F2A' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{pag.clientes?.nome}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {pag.mes_referencia && <span className="text-xs text-gray-400">{pag.mes_referencia}</span>}
                  <span className="text-xs text-gray-400">Vence {formatDate(pag.vencimento)}</span>
                  {pag.data_pagamento && <span className="text-xs text-emerald-600">Pago em {formatDate(pag.data_pagamento)}</span>}
                </div>
              </div>
              <p className="text-base font-display font-semibold text-vinho">{formatCurrency(pag.valor)}</p>
              <span className={cn('badge text-xs', {
                'bg-emerald-100 text-emerald-700': pag.status === 'pago',
                'bg-orange-100 text-orange-700': pag.status === 'pendente',
                'bg-red-100 text-red-700': pag.status === 'atrasado',
              })}>
                {pag.status === 'pago' ? 'Pago' : pag.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                {pag.status !== 'pago' && (
                  <button onClick={() => marcarPago(pag.id)} className="btn-ghost text-xs py-1 px-2 text-emerald-600">
                    ✓ Marcar pago
                  </button>
                )}
                <button onClick={() => excluir(pag.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo pagamento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => {
                const c = clientes.find(c => c.id === e.target.value)
                setForm(f => ({ ...f, cliente_id: e.target.value, valor: c?.valor_mensal || 0 }))
              }}>
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Valor (R$) *</label>
                <input className="input" type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Vencimento *</label>
                <input className="input" type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Mês de referência</label>
              <input className="input" value={form.mes_referencia} onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))} placeholder="Ex: Abril 2026" />
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2">
                {(['pendente','pago','atrasado'] as const).map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                      form.status === s ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <input className="input" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} className="btn-primary flex-1 justify-center">Salvar</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
