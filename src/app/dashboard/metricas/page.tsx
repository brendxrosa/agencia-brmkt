// metricas v3
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type MetricasMes } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, X, BarChart2, TrendingUp, TrendingDown, Users, Eye, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const ABAS = ['Visão geral', 'Importar dados', 'Performance de posts']

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
  const [posts, setPosts] = useState<any[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('Visão geral')
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importMsg, setImportMsg] = useState('')
  const [dadosImportados, setDadosImportados] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    cliente_id: '', plataforma: 'Instagram', mes_referencia: '',
    seguidores: 0, alcance: 0, impressoes: 0, engajamento: 0,
    novos_seguidores: 0, posts_publicados: 0
  })

  async function carregar() {
    const [{ data: m }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('metricas').select('*, clientes(nome, cor)').order('mes_referencia', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome'),
      supabase.from('posts').select('*, clientes(nome, cor)').eq('status_interno', 'publicado').order('data_publicacao', { ascending: false })
    ])
    setMetricas(m || [])
    setClientes(c || [])
    setPosts(p || [])
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

  async function importarJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('idle')
    setImportMsg('')
    try {
      const texto = await file.text()
      const dados = JSON.parse(texto)
      if (!dados.cliente_id && !dados.cliente_nome) throw new Error('Arquivo inválido: falta cliente_id ou cliente_nome')
      if (!dados.mes_referencia) throw new Error('Arquivo inválido: falta mes_referencia')
      setDadosImportados(dados)
      let clienteId = dados.cliente_id
      if (!clienteId && dados.cliente_nome) {
        const cliente = clientes.find(c => c.nome.toLowerCase() === dados.cliente_nome.toLowerCase())
        if (!cliente) throw new Error(`Cliente "${dados.cliente_nome}" não encontrado`)
        clienteId = cliente.id
      }
      await supabase.from('metricas').upsert({
        cliente_id: clienteId, plataforma: dados.plataforma || 'Instagram',
        mes_referencia: dados.mes_referencia, seguidores: dados.seguidores || 0,
        alcance: dados.alcance || 0, impressoes: dados.impressoes || 0,
        engajamento: dados.engajamento || 0, novos_seguidores: dados.novos_seguidores || 0,
        posts_publicados: dados.posts_publicados || 0,
      }, { onConflict: 'cliente_id,plataforma,mes_referencia' })
      setImportStatus('success')
      setImportMsg(`Métricas de ${dados.mes_referencia} importadas com sucesso!`)
      carregar()
    } catch (err: any) {
      setImportStatus('error')
      setImportMsg(err.message || 'Erro ao ler o arquivo')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const metricasCliente = metricas
    .filter(m => m.cliente_id === clienteSelecionado)
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia))

  const postsCliente = posts.filter(p => p.cliente_id === clienteSelecionado)
  const ultima = metricasCliente[metricasCliente.length - 1]
  const penultima = metricasCliente[metricasCliente.length - 2]

  const variacao = (atual?: number, anterior?: number) => {
    if (!atual || !anterior) return null
    return Number(((atual - anterior) / anterior * 100).toFixed(1))
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

      {/* Abas */}
      <div className="flex gap-1 bg-creme rounded-xl p-1 w-fit">
        {ABAS.map(aba => (
          <button key={aba} onClick={() => setAbaAtiva(aba)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              abaAtiva === aba ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            {aba}
          </button>
        ))}
      </div>

      {/* ABA 1 — VISÃO GERAL */}
      {abaAtiva === 'Visão geral' && (
        <>
          {metricasCliente.length === 0 ? (
            <div className="card text-center py-16">
              <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhuma métrica cadastrada para este cliente</p>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={() => { setForm(f => ({ ...f, cliente_id: clienteSelecionado })); setModalAberto(true) }}
                  className="btn-primary inline-flex items-center gap-2"><Plus size={16} /> Adicionar manualmente</button>
                <button onClick={() => setAbaAtiva('Importar dados')} className="btn-secondary inline-flex items-center gap-2">
                  <Upload size={16} /> Importar arquivo</button>
              </div>
            </div>
          ) : (
            <>
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
              <div className="card overflow-x-auto">
                <h3 className="section-title text-sm mb-4">Histórico completo</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Mês','Plataforma','Seguidores','Novos','Alcance','Impressões','Engajamento','Posts'].map(h => (
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
        </>
      )}

      {/* ABA 2 — IMPORTAR DADOS */}
      {abaAtiva === 'Importar dados' && (
        <div className="space-y-5">
          <div className="card border-l-4 border-l-vinho">
            <h3 className="section-title text-base mb-3">Como funciona</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>1. Mande os prints das métricas do Instagram para o Claude no chat</p>
              <p>2. Peça: <span className="font-mono text-xs bg-creme px-2 py-0.5 rounded">"Extraia as métricas desse print e me dê o arquivo JSON para importar na plataforma"</span></p>
              <p>3. Baixe o arquivo JSON que o Claude gerar</p>
              <p>4. Faça upload aqui embaixo — os dados serão preenchidos automaticamente!</p>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title text-sm mb-3">Formato esperado do JSON</h3>
            <pre className="bg-creme rounded-xl p-4 text-xs font-mono text-gray-700 overflow-x-auto">{`{
  "cliente_nome": "Júlio Teixeira",
  "plataforma": "Instagram",
  "mes_referencia": "Abril 2026",
  "seguidores": 12500,
  "novos_seguidores": 320,
  "alcance": 45000,
  "impressoes": 89000,
  "engajamento": 4.2,
  "posts_publicados": 12
}`}</pre>
          </div>

          <div className="card">
            <h3 className="section-title text-sm mb-4">Importar arquivo</h3>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-vinho hover:bg-rosa-pale/10 transition-all">
              <Upload size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">Clique para selecionar o arquivo JSON</p>
              <p className="text-xs text-gray-400 mt-1">Apenas arquivos .json</p>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importarJSON} />
            </div>
            {importStatus === 'success' && (
              <div className="mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">{importMsg}</p>
                  {dadosImportados && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {dadosImportados.seguidores?.toLocaleString('pt-BR')} seguidores · {dadosImportados.alcance?.toLocaleString('pt-BR')} alcance · {dadosImportados.engajamento}% engajamento
                    </p>
                  )}
                </div>
              </div>
            )}
            {importStatus === 'error' && (
              <div className="mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{importMsg}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3 — PERFORMANCE DE POSTS */}
      {abaAtiva === 'Performance de posts' && (
        <div className="space-y-4">
          {postsCliente.length === 0 ? (
            <div className="card text-center py-16">
              <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhum post publicado para este cliente ainda</p>
              <p className="text-xs text-gray-400 mt-1">Posts marcados como "Publicado" no Kanban aparecem aqui</p>
            </div>
          ) : (
            <>
              <div className="card">
                <h3 className="section-title text-sm mb-1">Posts publicados</h3>
                <p className="text-xs text-gray-400 mb-4">Posts com status "Publicado" no Kanban</p>
                <div className="space-y-3">
                  {postsCliente.map(post => (
                    <div key={post.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-creme transition-all border border-gray-50">
                      <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: post.clientes?.cor || '#6B0F2A' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="badge bg-creme text-gray-600 text-xs capitalize">{post.tipo}</span>
                          {post.data_publicacao && <span className="text-xs text-gray-400">{new Date(post.data_publicacao).toLocaleDateString('pt-BR')}</span>}
                          {post.tema && <span className="text-xs text-gray-400">{post.tema}</span>}
                        </div>
                      </div>
                      <span className="badge bg-emerald-100 text-emerald-700 text-xs">Publicado</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="section-title text-sm mb-4">Distribuição por tipo</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {['reels','carrossel','feed','stories','tiktok'].map(tipo => {
                    const count = postsCliente.filter(p => p.tipo === tipo).length
                    return (
                      <div key={tipo} className={cn('card text-center py-3', count === 0 && 'opacity-40')}>
                        <p className="text-2xl font-display font-bold text-vinho">{count}</p>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{tipo}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal manual */}
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
                  {['Instagram','TikTok','LinkedIn','YouTube','Facebook'].map(p => <option key={p}>{p}</option>)}
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
