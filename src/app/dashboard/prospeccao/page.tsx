'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Pagamento } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Plus, X, DollarSign, AlertCircle, CheckCircle, Clock, Send, TrendingUp, TrendingDown } from 'lucide-react'

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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function FinanceiroPage() {
  const supabase = createClient()
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [cobrando, setCobrando] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    cliente_id: '', valor: '', mes_referencia: '',
    vencimento: '', status: 'pendente' as Pagamento['status'], observacoes: ''
  })

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
      if (profile) setUserName(profile.nome)
    }
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('pagamentos').select('*, clientes(nome, cor, id)').order('vencimento', { ascending: false }),
      supabase.from('clientes').select('id, nome, valor_mensal').eq('status', 'ativo').order('nome')
    ])
    setPagamentos(p || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.cliente_id || !form.valor || !form.vencimento) return alert('Cliente, valor e vencimento são obrigatórios!')
    setSalvando(true)
    await supabase.from('pagamentos').insert({
      cliente_id: form.cliente_id,
      valor: Number(form.valor),
      mes_referencia: form.mes_referencia || null,
      vencimento: form.vencimento,
      status: form.status,
      observacoes: form.observacoes || null,
    })
    setSalvando(false)
    setModalAberto(false)
    setForm({ cliente_id: '', valor: '', mes_referencia: '', vencimento: '', status: 'pendente', observacoes: '' })
    carregar()
  }

  async function marcarPago(id: string) {
    await supabase.from('pagamentos').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    carregar()
  }

  async function marcarAtrasado(id: string) {
    await supabase.from('pagamentos').update({ status: 'atrasado' }).eq('id', id)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este pagamento?')) return
    await supabase.from('pagamentos').delete().eq('id', id)
    carregar()
  }

  async function enviarCobranca(pagamento: any) {
    if (!pagamento.clientes?.id) return
    setCobrando(pagamento.id)
    const msg = `Olá! 👋 Passando para lembrar que o pagamento referente a *${pagamento.mes_referencia || 'sua mensalidade'}* no valor de *${formatCurrency(pagamento.valor)}* está em aberto. Vencimento: ${formatDate(pagamento.vencimento)}. Qualquer dúvida, estou à disposição! 😊`
    await supabase.from('mensagens').insert({
      cliente_id: pagamento.clientes.id, autor_id: userId,
      autor_nome: userName || 'Agência BR MKT', autor_role: 'admin',
      conteudo: msg, assunto: 'Pagamento / Financeiro', lida: false,
    })
    setCobrando(null)
    alert(`Cobrança enviada para ${pagamento.clientes.nome} via chat! ✅`)
  }

  async function gerarPagamentosMes() {
    const hoje = new Date()
    const mes = `${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`
    const promessas = clientes.map(c =>
      supabase.from('pagamentos').insert({
        cliente_id: c.id, valor: c.valor_mensal, mes_referencia: mes,
        vencimento: new Date(hoje.getFullYear(), hoje.getMonth(), 10).toISOString().split('T')[0],
        status: 'pendente',
      })
    )
    await Promise.all(promessas)
    carregar()
    alert(`${clientes.length} pagamento(s) gerado(s) para ${mes}!`)
  }

  const filtrados = filtroStatus === 'todos' ? pagamentos : pagamentos.filter(p => p.status === filtroStatus)
  const totalPendente = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + (p.valor || 0), 0)
  const totalAtrasado = pagamentos.filter(p => p.status === 'atrasado').reduce((s, p) => s + (p.valor || 0), 0)
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor || 0), 0)

  const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: any }> = {
    pendente: { label: 'Pendente', cor: 'bg-orange-100 text-orange-700', icon: Clock },
    pago: { label: 'Pago', cor: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    atrasado: { label: 'Atrasado', cor: 'bg-red-100 text-red-700', icon: AlertCircle },
    cancelado: { label: 'Cancelado', cor: 'bg-gray-100 text-gray-600', icon: X },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">{pagamentos.length} lançamento(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarPagamentosMes} className="btn-secondary flex items-center gap-2 text-sm">
            <TrendingUp size={15} /> Gerar mês
          </button>
          <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'A receber', valor: totalPendente, cor: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Atrasado', valor: totalAtrasado, cor: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Recebido', valor: totalPago, cor: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, valor, cor, bg }) => (
          <div key={label} className={cn('card text-center', bg)}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={cn('text-lg font-bold font-display', cor)}>{formatCurrency(valor)}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-creme rounded-xl p-1 w-fit">
        {[['todos','Todos'],['pendente','Pendentes'],['atrasado','Atrasados'],['pago','Pagos']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltroStatus(v)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filtroStatus === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <DollarSign size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(pag => {
            const config = STATUS_CONFIG[pag.status] || STATUS_CONFIG.pendente
            const Icon = config.icon
            return (
              <div key={pag.id} className="card flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (pag.clientes?.cor || '#6B0F2A') + '20' }}>
                  <DollarSign size={18} style={{ color: pag.clientes?.cor || '#6B0F2A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{pag.clientes?.nome || 'Cliente'}</p>
                    <span className={cn('badge text-xs flex items-center gap-1', config.cor)}>
                      <Icon size={10} /> {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pag.mes_referencia && `${pag.mes_referencia} · `}
                    Vence {formatDate(pag.vencimento)}
                    {pag.observacoes && ` · ${pag.observacoes}`}
                  </p>
                </div>
                <p className="font-bold text-gray-800 flex-shrink-0">{formatCurrency(pag.valor)}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {pag.status !== 'pago' && (
                    <button onClick={() => marcarPago(pag.id)}
                      className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-all">
                      Pago ✓
                    </button>
                  )}
                  {pag.status === 'pendente' && (
                    <button onClick={() => enviarCobranca(pag)} disabled={cobrando === pag.id}
                      className="btn-ghost p-1.5" title="Enviar cobrança">
                      <Send size={14} />
                    </button>
                  )}
                  <button onClick={() => excluir(pag.id)} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo lançamento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => {
                const c = clientes.find(x => x.id === e.target.value)
                setForm(f => ({ ...f, cliente_id: e.target.value, valor: c?.valor_mensal?.toString() || '' }))
              }}>
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Valor *</label>
                <input className="input" type="number" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Vencimento *</label>
                <input className="input" type="date" value={form.vencimento}
                  onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Mês de referência</label>
              <input className="input" value={form.mes_referencia}
                onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))}
                placeholder="Ex: Junho 2026" />
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
              <input className="input" value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Nota fiscal, parcela, etc..." />
            </div>
            <div className="flex gap-3 pt-2 pb-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
