'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Plus, X, Edit2, Eye, Trash2, FileText, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { BANCO_PERGUNTAS, CATEGORIAS, type Pergunta } from '@/lib/briefings-data'

const PACOTES_PREDEFINIDOS: Record<string, { label: string; categorias: string[] }> = {
  geral: { label: 'Briefing Geral', categorias: ['negocio', 'publico', 'objetivos', 'pacote'] },
  audiovisual: { label: 'Direção e Produção Audiovisual', categorias: ['negocio', 'publico', 'tom_voz', 'audiovisual'] },
  fotografia: { label: 'Fotografia', categorias: ['negocio', 'publico', 'identidade_visual', 'fotografia'] },
  curadoria: { label: 'Curadoria', categorias: ['negocio', 'publico', 'tom_voz', 'gestao_redes'] },
  gestao_essencial: { label: 'Gestão Essencial', categorias: ['negocio', 'publico', 'identidade_visual', 'tom_voz', 'objetivos', 'gestao_redes'] },
  gestao_estrategica: { label: 'Gestão Estratégica', categorias: ['negocio', 'publico', 'identidade_visual', 'tom_voz', 'objetivos', 'gestao_redes'] },
  gestao_completa: { label: 'Gestão Completa', categorias: ['negocio', 'publico', 'identidade_visual', 'tom_voz', 'objetivos', 'gestao_redes', 'audiovisual'] },
  trafego: { label: 'Tráfego Pago', categorias: ['negocio', 'publico', 'objetivos', 'trafego'] },
  branding: { label: 'Branding e Identidade Visual', categorias: ['negocio', 'publico', 'identidade_visual', 'tom_voz'] },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {children}
      </div>
    </div>
  )
}

export default function BriefingsPage() {
  const supabase = createClient()
  const [briefings, setBriefings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalVisualizar, setModalVisualizar] = useState(false)
  const [briefingAtual, setBriefingAtual] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)

  // Estado do editor
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteVinculo, setClienteVinculo] = useState<string>('')
  const [perguntasSelecionadas, setPerguntasSelecionadas] = useState<string[]>([])
  const [categoriasAbertas, setCategoriasAbertas] = useState<string[]>([])
  const [pacoteBase, setPacoteBase] = useState('')

  async function carregar() {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from('briefings').select('*, clientes(nome)').order('created_at'),
      supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome')
    ])
    setBriefings(b || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo() {
    setNome('')
    setDescricao('')
    setPerguntasSelecionadas([])
    setClienteVinculo('')
    setPacoteBase('')
    setBriefingAtual(null)
    setModalEditar(true)
  }

  function abrirEditar(b: any) {
    setNome(b.nome)
    setDescricao(b.descricao || '')
    setPerguntasSelecionadas(b.perguntas.map((p: any) => p.id))
    setPacoteBase('')
    setBriefingAtual(b)
    setModalEditar(true)
  }

  function aplicarPacote(key: string) {
    const pacote = PACOTES_PREDEFINIDOS[key]
    if (!pacote) return
    setPacoteBase(key)
    if (!nome) setNome(pacote.label)
    const ids = BANCO_PERGUNTAS.filter(p => pacote.categorias.includes(p.categoria)).map(p => p.id)
    setPerguntasSelecionadas(ids)
    setCategoriasAbertas(pacote.categorias)
  }

  function togglePergunta(id: string) {
    setPerguntasSelecionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleCategoria(cat: string) {
    setCategoriasAbertas(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    )
  }

  function selecionarCategoria(cat: string, selecionar: boolean) {
    const ids = BANCO_PERGUNTAS.filter(p => p.categoria === cat).map(p => p.id)
    if (selecionar) {
      setPerguntasSelecionadas(prev => [...prev, ...ids].filter((v, i, a) => a.indexOf(v) === i))
    } else {
      setPerguntasSelecionadas(prev => prev.filter(id => !ids.includes(id)))
    }
  }

  async function salvar() {
    if (!nome) return alert('Nome é obrigatório!')
    if (perguntasSelecionadas.length === 0) return alert('Selecione ao menos uma pergunta!')
    setSalvando(true)

    const perguntas = BANCO_PERGUNTAS.filter(p => perguntasSelecionadas.includes(p.id))

    if (briefingAtual?.id) {
      await supabase.from('briefings').update({
        nome, descricao, perguntas,
        cliente_id: clienteVinculo || null, updated_at: new Date().toISOString()
      }).eq('id', briefingAtual.id)
    } else {
      await supabase.from('briefings').insert({ nome, descricao, perguntas, cliente_id: clienteVinculo || null })
    }

    setSalvando(false)
    setModalEditar(false)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este briefing?')) return
    await supabase.from('briefings').delete().eq('id', id)
    carregar()
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from('briefings').update({ ativo: !ativo }).eq('id', id)
    carregar()
  }

  const perguntasPorCategoria = Object.keys(CATEGORIAS).reduce((acc, cat) => {
    acc[cat] = BANCO_PERGUNTAS.filter(p => p.categoria === cat)
    return acc
  }, {} as Record<string, Pergunta[]>)

  const perguntasDoEditor = BANCO_PERGUNTAS.filter(p => perguntasSelecionadas.includes(p.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Briefings</h1>
          <p className="text-gray-500 text-sm mt-1">{briefings.length} briefing(s) criado(s)</p>
        </div>
        <button onClick={abrirNovo} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo briefing
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-creme" />)}
        </div>
      ) : briefings.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum briefing criado ainda</p>
          <button onClick={abrirNovo} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Criar primeiro briefing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {briefings.map(b => (
            <div key={b.id} className={cn('card group', !b.ativo && 'opacity-60')}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{b.nome}</p>
                    {!b.ativo && <span className="badge bg-gray-100 text-gray-500 text-xs">Inativo</span>}
                    {b.clientes?.nome
                      ? <span className="badge bg-blue-50 text-blue-600 text-xs">👤 {b.clientes.nome}</span>
                      : <span className="badge bg-gray-50 text-gray-400 text-xs">🌐 Global</span>
                    }
                  </div>
                  {b.descricao && <p className="text-xs text-gray-400 mt-0.5">{b.descricao}</p>}
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-4">{b.perguntas?.length || 0} perguntas</p>

              {/* Categorias do briefing */}
              <div className="flex flex-wrap gap-1 mb-4">
                {(b.perguntas || []).map((p: any) => p.categoria).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i).map((cat: any) => (
                  <span key={cat} className="badge bg-creme text-gray-600 text-xs">
                    {CATEGORIAS[cat]?.split(' ').slice(1).join(' ') || cat}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => { setBriefingAtual(b); setModalVisualizar(true) }}
                  className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1.5">
                  <Eye size={13} /> Visualizar
                </button>
                <button onClick={() => abrirEditar(b)}
                  className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1.5">
                  <Edit2 size={13} /> Editar
                </button>
                <button onClick={() => toggleAtivo(b.id, b.ativo)}
                  className={cn('flex-1 text-xs py-1.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all',
                    b.ativo ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}>
                  {b.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => excluir(b.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors px-2">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editor */}
      <Modal open={modalEditar} onClose={() => setModalEditar(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">
              {briefingAtual ? 'Editar briefing' : 'Novo briefing'}
            </h2>
            <button onClick={() => setModalEditar(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-5">
            {/* Info básica */}
            <div>
              <label className="label">Nome do briefing *</label>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Gestão Essencial" />
            </div>
            <div>
              <label className="label">Descrição</label>
              <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição do briefing" />
            </div>

            {/* Pacote base */}
            <div>
              <label className="label">Começar com pacote pré-definido (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PACOTES_PREDEFINIDOS).map(([key, p]) => (
                  <button key={key} onClick={() => aplicarPacote(key)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                      pacoteBase === key ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de perguntas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Perguntas selecionadas: {perguntasSelecionadas.length}</label>
                <button onClick={() => setPerguntasSelecionadas([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Limpar tudo
                </button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                {Object.entries(perguntasPorCategoria).map(([cat, perguntas]) => {
                  const aberto = categoriasAbertas.includes(cat)
                  const selecionadasNaCategoria = perguntas.filter(p => perguntasSelecionadas.includes(p.id)).length
                  const todasSelecionadas = selecionadasNaCategoria === perguntas.length

                  return (
                    <div key={cat} className="border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3 p-3 hover:bg-creme/50 transition-colors">
                        <button onClick={() => selecionarCategoria(cat, !todasSelecionadas)}
                          className={cn('w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all',
                            todasSelecionadas ? 'bg-vinho border-vinho' : selecionadasNaCategoria > 0 ? 'border-vinho bg-rosa-pale' : 'border-gray-300')}>
                          {todasSelecionadas && <Check size={12} className="text-white" />}
                          {!todasSelecionadas && selecionadasNaCategoria > 0 && <span className="w-2 h-2 bg-vinho rounded-sm" />}
                        </button>
                        <button onClick={() => toggleCategoria(cat)} className="flex-1 flex items-center justify-between text-left">
                          <span className="text-sm font-medium text-gray-700">{CATEGORIAS[cat]}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{selecionadasNaCategoria}/{perguntas.length}</span>
                            {aberto ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </div>
                        </button>
                      </div>

                      {aberto && (
                        <div className="bg-gray-50/50 px-3 pb-2 space-y-1">
                          {perguntas.map(p => (
                            <label key={p.id} className="flex items-start gap-3 py-2 cursor-pointer group">
                              <div onClick={() => togglePergunta(p.id)}
                                className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                                  perguntasSelecionadas.includes(p.id) ? 'bg-vinho border-vinho' : 'border-gray-300 group-hover:border-vinho/50')}>
                                {perguntasSelecionadas.includes(p.id) && <Check size={10} className="text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 leading-relaxed">{p.pergunta}</p>
                                <span className="text-xs text-gray-400 capitalize">{p.tipo.replace('_', ' ')}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalEditar(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Salvando...' : briefingAtual ? 'Salvar alterações' : 'Criar briefing'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal visualizar */}
      <Modal open={modalVisualizar} onClose={() => setModalVisualizar(false)}>
        {briefingAtual && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-xl font-semibold text-vinho">{briefingAtual.nome}</h2>
              <button onClick={() => setModalVisualizar(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            {briefingAtual.descricao && <p className="text-sm text-gray-500 mb-6">{briefingAtual.descricao}</p>}

            <div className="space-y-6">
              {Object.entries(CATEGORIAS).map(([cat, label]) => {
                const perguntas = (briefingAtual.perguntas || []).filter((p: any) => p.categoria === cat)
                if (perguntas.length === 0) return null
                return (
                  <div key={cat}>
                    <h3 className="font-semibold text-sm text-vinho mb-3">{label}</h3>
                    <div className="space-y-3">
                      {perguntas.map((p: any, i: number) => (
                        <div key={p.id} className="bg-creme rounded-xl p-3">
                          <p className="text-sm text-gray-700 font-medium">{i + 1}. {p.pergunta}</p>
                          {p.opcoes && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.opcoes.map((op: string) => (
                                <span key={op} className="badge bg-white text-gray-500 text-xs border border-gray-200">{op}</span>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-gray-400 mt-1 block capitalize">{p.tipo.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
