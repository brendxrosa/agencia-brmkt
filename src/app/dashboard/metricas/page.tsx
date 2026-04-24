'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type MetricasMes } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, X, BarChart2, TrendingUp, TrendingDown, Users, Eye } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

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

export default function MetricasPage() {
  const supabase = createClient()
  const [metricas, setMetricas] = useState<(MetricasMes & { clientes: { nome: string; cor: string } | null })[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({
    cliente_id: '', plataforma: 'Instagram', mes_referencia: '',
    seguidores: 0, alcance: 0, impressoes: 0, engajamento: 0,
    novos_seguidores: 0, posts_publicados: 0
  })

  async function carregar() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('metricas').select('*, clientes(nome, cor)').order('mes_referencia', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setMetricas(m || [])
    setClientes(c || [])
    if (c && c.length > 0 && !clienteSelecionado) setClienteSelecionado(c[0].id)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.cliente_id || !form.mes_referencia) return alert('Cliente e mês são obrigatórios!')
    await supabase.from('metricas').upsert(form, { onConflict: 'cliente_id,plataforma,mes_referencia' })
    setModalAberto(false)
    setForm({ cliente_id: '', plataforma: 'Instagram', mes_referencia: '', seguidores: 0, alcance: 0, impressoes: 0, engajamento: 0, novos_seguidores: 0, posts_publicados: 0 })
    carregar()
  }

  const metricasCliente = metricas
    .filter(m => m.cliente_id === clienteSelecionado)
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia))

  const ultima = metricasCliente[metricasCliente.length - 1]
  const penultima = metricasCliente[metricasCliente.length - 2]

  const variacao = (atual?: number, anterior?: number) => {
    if (!atual || !anterior) return null
    const pct = ((atual - anterior) / anterior * 100).toFixed(1)
    return Number(pct)
  }

  const StatCard = ({ label, valor, anterior, icon: Icon, formato = 'numero' }: any) => {
    const v = variacao(valor, anterior)
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <Icon size={16} className="text-gray-400" />
          {v !== null && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', v >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {v >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(v)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-display font-bold text-vinho">
          {formato === 'pct' ? `${valor}%` : valor?.toLocaleString('pt-BR') || '—'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Métricas</h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhamento por cliente</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Adicionar métricas
        </button>
      </div>

      {/* Seletor de cliente */}
      <div className="flex gap-2 flex-wrap">
        {clientes.map(c => (
          <button key={c.id} onClick={() => setClienteSelecionado(c.id)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
              clienteSelecionado === c.id ? 'text-white shadow-card' : 'bg-white border border-gray-200 text-gray-600 hover:bg-creme')}
            style={clienteSelecionado === c.id ? { backgroundColor: c.cor } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
            {c.nome}
          </button>
        ))}
      </div>

      {metricasCliente.length === 0 ? (
        <div className="card text-center py-16">
          <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma métrica cadastrada para este cliente</p>
          <button onClick={() => { setForm(f => ({ ...f, cliente_id: clienteSelecionado })); setModalAberto(true) }}
            className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Adicionar primeiro mês
          </button>
        </div>
      ) : (
        <>
          {/* Cards do último mês */}
          {ultima && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="section-title">Último mês: {ultima.mes_referencia}</h2>
                <span className="text-xs text-gray-400">{ultima.plataforma}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Seguidores" valor={ultima.seguidores} anterior={penultima?.seguidores} icon={Users} />
                <StatCard label="Novos seguidores" valor={ultima.novos_seguidores} anterior={penultima?.novos_seguidores} icon={TrendingUp} />
                <StatCard label="Alcance" valor={ultima.alcance} anterior={penultima?.alcance} icon={Eye} />
                <StatCard label="Engajamento" valor={ultima.engajamento} anterior={penultima?.engajamento} icon={BarChart2} formato="pct" />
              </div>
            </>
          )}

          {/* Gráficos */}
          {metricasCliente.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card">
                <h3 className="section-title text-sm mb-4">Crescimento de seguidores</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={metricasCliente}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe9" />
                    <XAxis dataKey="mes_referencia" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="seguidores" stroke="#6B0F2A" strokeWidth={2} dot={{ fill: '#6B0F2A', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="section-title text-sm mb-4">Alcance por mês</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricasCliente}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe9" />
                    <XAxis dataKey="mes_referencia" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="alcance" fill="#C2185B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabela histórico */}
          <div className="card overflow-x-auto">
            <h3 className="section-title text-sm mb-4">Histórico completo</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Mês', 'Plataforma', 'Seguidores', 'Novos', 'Alcance', 'Impressões', 'Engajamento', 'Posts'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...metricasCliente].reverse().map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-creme/50 transition-colors">
                    <td className="py-2 pr-4 font-medium text-gray-800">{m.mes_referencia}</td>
                    <td className="py-2 pr-4 text-gray-500">{m.plataforma}</td>
                    <td className="py-2 pr-4">{m.seguidores?.toLocaleString('pt-BR')}</td>
                    <td className="py-2 pr-4 text-emerald-600">+{m.novos_seguidores}</td>
                    <td className="py-2 pr-4">{m.alcance?.toLocaleString('pt-BR')}</td>
                    <td className="py-2 pr-4">{m.impressoes?.toLocaleString('pt-BR')}</td>
                    <td className="py-2 pr-4">{m.engajamento}%</td>
                    <td className="py-2 pr-4">{m.posts_publicados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Adicionar métricas</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cliente *</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plataforma</label>
                <select className="input" value={form.plataforma} onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))}>
                  {['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Facebook'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Mês de referência *</label>
              <input className="input" value={form.mes_referencia} onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))} placeholder="Ex: Abril 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Seguidores</label><input className="input" type="number" value={form.seguidores} onChange={e => setForm(f => ({ ...f, seguidores: Number(e.target.value) }))} /></div>
              <div><label className="label">Novos seguidores</label><input className="input" type="number" value={form.novos_seguidores} onChange={e => setForm(f => ({ ...f, novos_seguidores: Number(e.target.value) }))} /></div>
              <div><label className="label">Alcance</label><input className="input" type="number" value={form.alcance} onChange={e => setForm(f => ({ ...f, alcance: Number(e.target.value) }))} /></div>
              <div><label className="label">Impressões</label><input className="input" type="number" value={form.impressoes} onChange={e => setForm(f => ({ ...f, impressoes: Number(e.target.value) }))} /></div>
              <div><label className="label">Engajamento (%)</label><input className="input" type="number" step="0.1" value={form.engajamento} onChange={e => setForm(f => ({ ...f, engajamento: Number(e.target.value) }))} /></div>
              <div><label className="label">Posts publicados</label><input className="input" type="number" value={form.posts_publicados} onChange={e => setForm(f => ({ ...f, posts_publicados: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} className="btn-primary flex-1 justify-center">Salvar métricas</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
