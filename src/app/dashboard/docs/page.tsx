'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Doc } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { Plus, X, BookOpen, Save, Search } from 'lucide-react'

const TIPOS = [
  { key: 'briefing', label: 'Briefing', cor: 'bg-blue-100 text-blue-700' },
  { key: 'estrategia', label: 'Estratégia', cor: 'bg-purple-100 text-purple-700' },
  { key: 'referencia', label: 'Referência', cor: 'bg-orange-100 text-orange-700' },
  { key: 'nota', label: 'Nota', cor: 'bg-gray-100 text-gray-700' },
  { key: 'outro', label: 'Outro', cor: 'bg-pink-100 text-pink-700' },
]

export default function DocsPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<(Doc & { clientes: { nome: string; cor: string } | null })[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [docAberto, setDocAberto] = useState<(Doc & { clientes: { nome: string; cor: string } | null }) | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [salvando, setSalvando] = useState(false)
  const [conteudoEditado, setConteudoEditado] = useState('')
  const [novoForm, setNovoForm] = useState({ cliente_id: '', titulo: '', tipo: 'nota' as Doc['tipo'], conteudo: '' })

  async function carregar() {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('docs').select('*, clientes(nome, cor)').order('updated_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setDocs(d || [])
    setClientes(c || [])
  }

  useEffect(() => { carregar() }, [])

  async function criarDoc() {
    if (!novoForm.cliente_id || !novoForm.titulo) return alert('Cliente e título são obrigatórios!')
    const { data } = await supabase.from('docs').insert(novoForm).select('*, clientes(nome, cor)').single()
    setNovoAberto(false)
    setNovoForm({ cliente_id: '', titulo: '', tipo: 'nota', conteudo: '' })
    await carregar()
    if (data) { setDocAberto(data); setConteudoEditado(data.conteudo) }
  }

  async function salvarDoc() {
    if (!docAberto) return
    setSalvando(true)
    await supabase.from('docs').update({ conteudo: conteudoEditado, updated_at: new Date().toISOString() }).eq('id', docAberto.id)
    setSalvando(false)
    carregar()
  }

  async function excluirDoc(id: string) {
    if (!confirm('Excluir este documento?')) return
    await supabase.from('docs').delete().eq('id', id)
    if (docAberto?.id === id) setDocAberto(null)
    carregar()
  }

  const filtrados = docs.filter(d => {
    const buscaOk = d.titulo.toLowerCase().includes(busca.toLowerCase()) || d.conteudo.toLowerCase().includes(busca.toLowerCase())
    const clienteOk = filtroCliente === 'todos' || d.cliente_id === filtroCliente
    const tipoOk = filtroTipo === 'todos' || d.tipo === filtroTipo
    return buscaOk && clienteOk && tipoOk
  })

  const tipoConfig = (tipo: string) => TIPOS.find(t => t.key === tipo) || TIPOS[3]

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-5">
      {/* Sidebar de docs */}
      <div className={cn('flex flex-col gap-3', docAberto ? 'w-72 flex-shrink-0' : 'flex-1')}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="page-title">Docs</h1>
          <button onClick={() => setNovoAberto(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo doc
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar docs..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <select className="input text-sm py-1.5" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="todos">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select className="input text-sm py-1.5" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtrados.length === 0 ? (
            <div className="card text-center py-12">
              <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Nenhum documento encontrado</p>
            </div>
          ) : filtrados.map(doc => (
            <div key={doc.id}
              onClick={() => { setDocAberto(doc); setConteudoEditado(doc.conteudo) }}
              className={cn('card-hover p-4 group cursor-pointer', docAberto?.id === doc.id && 'ring-2 ring-vinho/30 bg-rosa-pale/20')}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{doc.titulo}</p>
                <button onClick={e => { e.stopPropagation(); excluirDoc(doc.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {doc.clientes && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.clientes.cor }} />
                    {doc.clientes.nome}
                  </span>
                )}
                <span className={cn('badge text-xs', tipoConfig(doc.tipo).cor)}>{tipoConfig(doc.tipo).label}</span>
              </div>
              {doc.conteudo && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{doc.conteudo.substring(0, 100)}</p>
              )}
              <p className="text-xs text-gray-300 mt-2">{formatDate(doc.updated_at, "dd/MM/yyyy 'às' HH:mm")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      {docAberto && (
        <div className="flex-1 card flex flex-col animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-800">{docAberto.titulo}</h2>
              <div className="flex items-center gap-2 mt-1">
                {docAberto.clientes && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: docAberto.clientes.cor }} />
                    {docAberto.clientes.nome}
                  </span>
                )}
                <span className={cn('badge text-xs', tipoConfig(docAberto.tipo).cor)}>{tipoConfig(docAberto.tipo).label}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={salvarDoc} disabled={salvando}
                className="btn-primary flex items-center gap-2">
                <Save size={14} />
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setDocAberto(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
          </div>
          <textarea
            value={conteudoEditado}
            onChange={e => setConteudoEditado(e.target.value)}
            placeholder="Comece a escrever aqui... Use este espaço para briefings, estratégias, referências e notas sobre o cliente."
            className="flex-1 resize-none border-0 outline-none text-sm text-gray-700 leading-relaxed font-body placeholder-gray-300"
          />
        </div>
      )}

      {/* Modal novo doc */}
      {novoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNovoAberto(false)} />
          <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-slide-up p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-vinho">Novo documento</h2>
              <button onClick={() => setNovoAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Cliente *</label>
                <select className="input" value={novoForm.cliente_id} onChange={e => setNovoForm(f => ({ ...f, cliente_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Título *</label>
                <input className="input" value={novoForm.titulo} onChange={e => setNovoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Nome do documento" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {TIPOS.map(t => (
                    <button key={t.key} onClick={() => setNovoForm(f => ({ ...f, tipo: t.key as Doc['tipo'] }))}
                      className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        novoForm.tipo === t.key ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setNovoAberto(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={criarDoc} className="btn-primary flex-1 justify-center">Criar documento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
