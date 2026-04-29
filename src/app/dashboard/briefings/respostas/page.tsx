'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { FileText, CheckCircle, Clock, ChevronDown, ChevronUp, Download, Edit2, Save, Plus } from 'lucide-react'
import { CATEGORIAS } from '@/lib/briefings-data'

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-md animate-slide-up p-6">
        {children}
      </div>
    </div>
  )
}

export default function BriefingRespostasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [respostas, setRespostas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [briefings, setBriefings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [abertos, setAbertos] = useState<string[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [formEdit, setFormEdit] = useState<Record<string, any>>({})
  const [salvando, setSalvando] = useState(false)
  const [modalPreencher, setModalPreencher] = useState(false)
  const [clienteEscolhido, setClienteEscolhido] = useState('')
  const [briefingEscolhido, setBriefingEscolhido] = useState('')

  async function carregar() {
    const [{ data: r }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('briefing_respostas').select('*, clientes(nome, cor), briefings(nome, perguntas)').order('updated_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome'),
      supabase.from('briefings').select('id, nome').eq('ativo', true).order('nome')
    ])
    setRespostas(r || [])
    setClientes(c || [])
    setBriefings(b || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const toggleAberto = (id: string) =>
    setAbertos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  function iniciarEdicao(resposta: any) {
    setEditando(resposta.id)
    setFormEdit({ ...resposta.respostas })
  }

  async function salvarEdicao(respostaId: string) {
    setSalvando(true)
    await supabase.from('briefing_respostas').update({
      respostas: formEdit,
      preenchido_por: 'admin',
      updated_at: new Date().toISOString()
    }).eq('id', respostaId)
    setSalvando(false)
    setEditando(null)
    carregar()
  }

  function irPreencher() {
    if (!clienteEscolhido || !briefingEscolhido) return alert('Selecione cliente e briefing!')
    router.push(`/dashboard/briefings/preencher/${clienteEscolhido}/${briefingEscolhido}`)
  }

  function exportarTexto(resposta: any) {
    const briefing = resposta.briefings
    if (!briefing) return
    let texto = `BRIEFING: ${briefing.nome}\nCLIENTE: ${resposta.clientes?.nome}\nDATA: ${formatDate(resposta.updated_at)}\n\n${'='.repeat(50)}\n`
    const perguntas = briefing.perguntas || []
    Object.entries(CATEGORIAS).forEach(([cat, label]) => {
      const pergsCategoria = perguntas.filter((p: any) => p.categoria === cat)
      if (pergsCategoria.length === 0) return
      texto += `\n${label.toUpperCase()}\n${'-'.repeat(30)}\n`
      pergsCategoria.forEach((p: any) => {
        const r = resposta.respostas?.[p.id]
        if (!r) return
        texto += `\n${p.pergunta}\n→ ${Array.isArray(r) ? r.join(', ') : r}\n`
      })
    })
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `briefing-${resposta.clientes?.nome?.toLowerCase().replace(/\s/g, '-')}.txt`
    a.click()
  }

  const filtradas = respostas.filter(r => filtroCliente === 'todos' || r.cliente_id === filtroCliente)
  const concluidas = respostas.filter(r => r.concluido).length
  const pendentes = respostas.filter(r => !r.concluido).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Respostas de Briefings</h1>
          <p className="text-gray-500 text-sm mt-1">{concluidas} concluído(s) · {pendentes} em andamento</p>
        </div>
        <button onClick={() => setModalPreencher(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Preencher por cliente
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroCliente('todos')}
          className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
            filtroCliente === 'todos' ? 'bg-vinho text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-creme')}>
          Todos
        </button>
        {clientes.map(c => (
          <button key={c.id} onClick={() => setFiltroCliente(c.id)}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5',
              filtroCliente === c.id ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-creme')}
            style={filtroCliente === c.id ? { backgroundColor: c.cor } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
            {c.nome}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-creme" />)}</div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma resposta ainda</p>
          <button onClick={() => setModalPreencher(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Preencher agora
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(resposta => {
            const aberto = abertos.includes(resposta.id)
            const perguntas = resposta.briefings?.perguntas || []
            const modoEditar = editando === resposta.id
            const porCategoria: Record<string, any[]> = {}
            perguntas.forEach((p: any) => {
              if (!porCategoria[p.categoria]) porCategoria[p.categoria] = []
              porCategoria[p.categoria].push(p)
            })
            const totalRespostas = Object.keys(resposta.respostas || {}).filter(k => resposta.respostas[k]).length

            return (
              <div key={resposta.id} className={cn('card', resposta.concluido && 'border-l-4 border-l-emerald-400')}>
                <button onClick={() => toggleAberto(resposta.id)}
                  className="w-full flex items-center gap-3 text-left">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    resposta.concluido ? 'bg-emerald-100' : 'bg-orange-100')}>
                    {resposta.concluido
                      ? <CheckCircle size={18} className="text-emerald-600" />
                      : <Clock size={18} className="text-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: resposta.clientes?.cor }} />
                      <p className="font-semibold text-gray-800">{resposta.clientes?.nome}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400">{resposta.briefings?.nome}</p>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{totalRespostas}/{perguntas.length} respondidas</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {resposta.preenchido_por === 'admin' ? '✏️ Agência' : '👤 Cliente'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resposta.concluido
                      ? <span className="badge bg-emerald-100 text-emerald-700 text-xs">Concluído</span>
                      : <span className="badge bg-orange-100 text-orange-700 text-xs">Em andamento</span>}
                    {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {aberto && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in space-y-5">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => router.push(`/dashboard/briefings/preencher/${resposta.cliente_id}/${resposta.briefing_id}`)}
                        className="btn-primary text-xs py-2 flex items-center gap-1.5">
                        <Edit2 size={13} /> Editar completo
                      </button>
                      {!modoEditar ? (
                        <button onClick={() => iniciarEdicao(resposta)}
                          className="btn-secondary text-xs py-2 flex items-center gap-1.5">
                          <Edit2 size={13} /> Editar rápido
                        </button>
                      ) : (
                        <>
                          <button onClick={() => salvarEdicao(resposta.id)} disabled={salvando}
                            className="btn-primary text-xs py-2 flex items-center gap-1.5">
                            <Save size={13} /> {salvando ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditando(null)} className="btn-ghost text-xs py-2">Cancelar</button>
                        </>
                      )}
                      <button onClick={() => exportarTexto(resposta)}
                        className="btn-ghost text-xs py-2 flex items-center gap-1.5 ml-auto">
                        <Download size={13} /> Exportar .txt
                      </button>
                    </div>

                    {Object.entries(porCategoria).map(([cat, pergs]) => (
                      <div key={cat}>
                        <h3 className="text-xs font-semibold text-vinho uppercase tracking-wide mb-3">
                          {CATEGORIAS[cat] || cat}
                        </h3>
                        <div className="space-y-3">
                          {pergs.map((p: any) => {
                            const valor = modoEditar ? formEdit[p.id] : resposta.respostas?.[p.id]
                            const temResposta = valor && (Array.isArray(valor) ? valor.length > 0 : true)
                            return (
                              <div key={p.id} className={cn('rounded-xl p-3', temResposta ? 'bg-creme' : 'bg-gray-50 opacity-60')}>
                                <p className="text-xs font-medium text-gray-500 mb-1">{p.pergunta}</p>
                                {modoEditar ? (
                                  p.tipo === 'textarea' ? (
                                    <textarea className="input resize-none text-sm mt-1" rows={2}
                                      value={formEdit[p.id] || ''}
                                      onChange={e => setFormEdit(f => ({ ...f, [p.id]: e.target.value }))} />
                                  ) : p.tipo === 'texto' ? (
                                    <input className="input text-sm mt-1" value={formEdit[p.id] || ''}
                                      onChange={e => setFormEdit(f => ({ ...f, [p.id]: e.target.value }))} />
                                  ) : (
                                    <p className="text-xs text-gray-400 mt-1 italic">Use "Editar completo" para este tipo</p>
                                  )
                                ) : temResposta ? (
                                  p.tipo === 'arquivo' ? (
                                    <a href={valor} target="_blank" rel="noopener noreferrer"
                                      className="text-sm text-vinho hover:underline mt-1 block">📎 Ver arquivo</a>
                                  ) : (
                                    <p className="text-sm text-gray-800 font-medium mt-1">
                                      {Array.isArray(valor) ? valor.join(', ') : valor}
                                    </p>
                                  )
                                ) : (
                                  <p className="text-xs text-gray-400 italic mt-1">Não respondido</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal preencher */}
      <Modal open={modalPreencher} onClose={() => setModalPreencher(false)}>
        <h2 className="font-display text-xl font-semibold text-vinho mb-5">Preencher briefing</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select className="input" value={clienteEscolhido} onChange={e => setClienteEscolhido(e.target.value)}>
              <option value="">Selecione o cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Briefing *</label>
            <select className="input" value={briefingEscolhido} onChange={e => setBriefingEscolhido(e.target.value)}>
              <option value="">Selecione o briefing</option>
              {briefings.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalPreencher(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={irPreencher} className="btn-primary flex-1 justify-center">Ir preencher</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
