'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { FileText, CheckCircle, Clock, ChevronDown, ChevronUp, Download, Edit2, Save } from 'lucide-react'
import { CATEGORIAS } from '@/lib/briefings-data'

export default function BriefingRespostasPage() {
  const supabase = createClient()
  const [respostas, setRespostas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [briefings, setBriefings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [abertos, setAbertos] = useState<string[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [formEdit, setFormEdit] = useState<Record<string, any>>({})
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: r }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('briefing_respostas').select('*, clientes(nome, cor), briefings(nome, perguntas)').order('updated_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome'),
      supabase.from('briefings').select('id, nome').eq('ativo', true)
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

  function exportarTexto(resposta: any) {
    const briefing = resposta.briefings
    if (!briefing) return

    let texto = `BRIEFING: ${briefing.nome}\n`
    texto += `CLIENTE: ${resposta.clientes?.nome}\n`
    texto += `DATA: ${formatDate(resposta.updated_at)}\n`
    texto += `\n${'='.repeat(50)}\n\n`

    const perguntas = briefing.perguntas || []
    Object.entries(CATEGORIAS).forEach(([cat, label]) => {
      const pergsCategoria = perguntas.filter((p: any) => p.categoria === cat)
      if (pergsCategoria.length === 0) return

      texto += `\n${label.toUpperCase()}\n${'-'.repeat(30)}\n`
      pergsCategoria.forEach((p: any) => {
        const r = resposta.respostas?.[p.id]
        if (!r) return
        texto += `\n${p.pergunta}\n`
        texto += `→ ${Array.isArray(r) ? r.join(', ') : r}\n`
      })
    })

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `briefing-${resposta.clientes?.nome?.toLowerCase().replace(/\s/g, '-')}.txt`
    a.click()
  }

  const filtradas = respostas.filter(r =>
    filtroCliente === 'todos' || r.cliente_id === filtroCliente
  )

  const concluidas = respostas.filter(r => r.concluido).length
  const pendentes = respostas.filter(r => !r.concluido).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Respostas de Briefings</h1>
        <p className="text-gray-500 text-sm mt-1">
          {concluidas} concluído(s) · {pendentes} em andamento
        </p>
      </div>

      {/* Filtro cliente */}
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
          <p className="text-xs text-gray-400 mt-1">As respostas aparecerão aqui quando os clientes preencherem os briefings</p>
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
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resposta.clientes?.cor }} />
                      <p className="font-semibold text-gray-800">{resposta.clientes?.nome}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">{resposta.briefings?.nome}</p>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{totalRespostas}/{perguntas.length} respondidas</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {resposta.preenchido_por === 'admin' ? '✏️ Preenchido pela agência' : '👤 Preenchido pelo cliente'}
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
                    {/* Ações */}
                    <div className="flex gap-2">
                      {!modoEditar ? (
                        <button onClick={() => iniciarEdicao(resposta)}
                          className="btn-secondary text-xs py-2 flex items-center gap-1.5">
                          <Edit2 size={13} /> Editar respostas
                        </button>
                      ) : (
                        <button onClick={() => salvarEdicao(resposta.id)} disabled={salvando}
                          className="btn-primary text-xs py-2 flex items-center gap-1.5">
                          <Save size={13} /> {salvando ? 'Salvando...' : 'Salvar edição'}
                        </button>
                      )}
                      {modoEditar && (
                        <button onClick={() => setEditando(null)} className="btn-ghost text-xs py-2">
                          Cancelar
                        </button>
                      )}
                      <button onClick={() => exportarTexto(resposta)}
                        className="btn-ghost text-xs py-2 flex items-center gap-1.5 ml-auto">
                        <Download size={13} /> Exportar .txt
                      </button>
                    </div>

                    {/* Respostas por categoria */}
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
                                  p.tipo === 'opcao' ? (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {p.opcoes?.map((op: string) => (
                                        <button key={op} onClick={() => setFormEdit(f => ({ ...f, [p.id]: op }))}
                                          className={cn('px-2 py-1 rounded-lg text-xs transition-all border',
                                            formEdit[p.id] === op ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600')}>
                                          {op}
                                        </button>
                                      ))}
                                    </div>
                                  ) : p.tipo === 'opcoes_multiplas' ? (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {p.opcoes?.map((op: string) => {
                                        const sel = (formEdit[p.id] || []).includes(op)
                                        return (
                                          <button key={op} onClick={() => {
                                            const atual = formEdit[p.id] || []
                                            const novas = sel ? atual.filter((o: string) => o !== op) : [...atual, op]
                                            setFormEdit(f => ({ ...f, [p.id]: novas }))
                                          }}
                                            className={cn('px-2 py-1 rounded-lg text-xs transition-all border',
                                              sel ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600')}>
                                            {op}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : p.tipo === 'arquivo' ? (
                                    <p className="text-xs text-gray-400 mt-1">Upload não editável aqui</p>
                                  ) : p.tipo === 'textarea' ? (
                                    <textarea className="input resize-none text-sm mt-1" rows={3}
                                      value={formEdit[p.id] || ''}
                                      onChange={e => setFormEdit(f => ({ ...f, [p.id]: e.target.value }))} />
                                  ) : (
                                    <input className="input text-sm mt-1" value={formEdit[p.id] || ''}
                                      onChange={e => setFormEdit(f => ({ ...f, [p.id]: e.target.value }))} />
                                  )
                                ) : (
                                  temResposta ? (
                                    p.tipo === 'arquivo' ? (
                                      <a href={valor} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-vinho hover:underline flex items-center gap-1 mt-1">
                                        📎 Ver arquivo
                                      </a>
                                    ) : (
                                      <p className="text-sm text-gray-800 font-medium mt-1">
                                        {Array.isArray(valor) ? valor.join(', ') : valor}
                                      </p>
                                    )
                                  ) : (
                                    <p className="text-xs text-gray-400 italic mt-1">Não respondido</p>
                                  )
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
    </div>
  )
}
