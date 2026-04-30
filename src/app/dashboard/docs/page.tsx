'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Plus, X, Search, FileText, Bold, Italic, Underline, Link, Upload, Trash2, Eye, Edit2, Save, ExternalLink } from 'lucide-react'

const TIPOS_DOC = ['briefing', 'estrategia', 'referencia', 'nota', 'outro']
const TIPO_CONFIG: Record<string, { label: string; cor: string }> = {
  briefing: { label: 'Briefing', cor: 'bg-blue-100 text-blue-700' },
  estrategia: { label: 'Estratégia', cor: 'bg-purple-100 text-purple-700' },
  referencia: { label: 'Referência', cor: 'bg-orange-100 text-orange-700' },
  nota: { label: 'Nota', cor: 'bg-gray-100 text-gray-700' },
  outro: { label: 'Outro', cor: 'bg-pink-100 text-pink-700' },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {children}
      </div>
    </div>
  )
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)

  function execCmd(cmd: string, val?: string) {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  function handleInput() {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  function handleLink() {
    const url = prompt('Cole o link:')
    if (url) execCmd('createLink', url)
  }

  function handleFontSize(size: string) {
    execCmd('fontSize', size)
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-creme border-b border-gray-200 flex-wrap">
        <button type="button" onClick={() => execCmd('bold')}
          className="p-1.5 rounded-lg hover:bg-white transition-colors" title="Negrito">
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => execCmd('italic')}
          className="p-1.5 rounded-lg hover:bg-white transition-colors" title="Itálico">
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => execCmd('underline')}
          className="p-1.5 rounded-lg hover:bg-white transition-colors" title="Sublinhado">
          <Underline size={14} />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select onChange={e => handleFontSize(e.target.value)} defaultValue="3"
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
          <option value="1">Pequeno</option>
          <option value="3">Normal</option>
          <option value="5">Grande</option>
          <option value="7">Enorme</option>
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" onClick={() => execCmd('insertUnorderedList')}
          className="px-2 py-1 rounded-lg hover:bg-white text-xs transition-colors" title="Lista">
          • Lista
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')}
          className="px-2 py-1 rounded-lg hover:bg-white text-xs transition-colors" title="Numerada">
          1. Numerada
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {['#6B0F2A','#C2185B','#2E7D32','#1565C0','#E65100','#000000'].map(cor => (
          <button key={cor} type="button" onClick={() => execCmd('foreColor', cor)}
            className="w-5 h-5 rounded-full border border-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: cor }} title={cor} />
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" onClick={handleLink}
          className="p-1.5 rounded-lg hover:bg-white transition-colors" title="Link">
          <Link size={14} />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        className="min-h-48 p-4 text-sm text-gray-700 focus:outline-none leading-relaxed"
        style={{ wordBreak: 'break-word' }}
      />
    </div>
  )
}

export default function DocsPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [docVisualizar, setDocVisualizar] = useState<any>(null)
  const [editando, setEditando] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    cliente_id: '', titulo: '', tipo: 'nota',
    conteudo: '', link_arquivo: '', drive_url: ''
  })

  async function carregar() {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('docs').select('*, clientes(nome, cor)').order('updated_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setDocs(d || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirEditar(doc: any) {
    setEditando(doc)
    setForm({
      cliente_id: doc.cliente_id || '',
      titulo: doc.titulo || '',
      tipo: doc.tipo || 'nota',
      conteudo: doc.conteudo || '',
      link_arquivo: doc.link_arquivo || '',
      drive_url: doc.drive_url || '',
    })
    setModalAberto(true)
  }

  async function handleUpload(file: File) {
    setUploadando(true)
    const path = `docs/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('docs').upload(path, file, { upsert: true })
    if (error) { alert('Erro no upload: ' + error.message); setUploadando(false); return }
    const { data } = supabase.storage.from('docs').getPublicUrl(path)
    setForm(f => ({ ...f, link_arquivo: data.publicUrl }))
    setUploadando(false)
  }

  async function salvar() {
    if (!form.titulo) return alert('Título é obrigatório!')
    setSalvando(true)
    if (editando?.id) {
      await supabase.from('docs').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editando.id)
    } else {
      await supabase.from('docs').insert(form)
    }
    setSalvando(false)
    setModalAberto(false)
    setEditando(null)
    setForm({ cliente_id: '', titulo: '', tipo: 'nota', conteudo: '', link_arquivo: '', drive_url: '' })
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este documento?')) return
    await supabase.from('docs').delete().eq('id', id)
    carregar()
  }

  const filtrados = docs.filter(d => {
    const buscaOk = d.titulo.toLowerCase().includes(busca.toLowerCase())
    const clienteOk = filtroCliente === 'todos' || d.cliente_id === filtroCliente
    const tipoOk = filtroTipo === 'todos' || d.tipo === filtroTipo
    return buscaOk && clienteOk && tipoOk
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">{docs.length} documento(s)</p>
        </div>
        <button onClick={() => { setEditando(null); setForm({ cliente_id: '', titulo: '', tipo: 'nota', conteudo: '', link_arquivo: '', drive_url: '' }); setModalAberto(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo documento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="input w-auto" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="todos">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="input w-auto" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {TIPOS_DOC.map(t => <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-creme" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map(doc => (
            <div key={doc.id} className="card group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{doc.titulo}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {doc.clientes && (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.clientes.cor }} />
                        <span className="text-xs text-gray-400">{doc.clientes.nome}</span>
                      </div>
                    )}
                    <span className={cn('badge text-xs', TIPO_CONFIG[doc.tipo]?.cor)}>{TIPO_CONFIG[doc.tipo]?.label}</span>
                  </div>
                </div>
              </div>

              {doc.conteudo && (
                <div className="text-xs text-gray-400 line-clamp-2 mb-3"
                  dangerouslySetInnerHTML={{ __html: doc.conteudo.replace(/<[^>]+>/g, ' ').slice(0, 120) + '...' }} />
              )}

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {doc.link_arquivo && (
                  <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-vinho hover:underline">
                    📎 Arquivo anexo
                  </a>
                )}
                {doc.drive_url && (
                  <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink size={11} /> Drive
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{formatDate(doc.updated_at, "dd/MM/yyyy")}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => setDocVisualizar(doc)}
                    className="btn-ghost p-1.5"><Eye size={14} /></button>
                  <button onClick={() => abrirEditar(doc)}
                    className="btn-ghost p-1.5"><Edit2 size={14} /></button>
                  <button onClick={() => excluir(doc.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal visualizar */}
      <Modal open={!!docVisualizar} onClose={() => setDocVisualizar(null)}>
        {docVisualizar && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-gray-800">{docVisualizar.titulo}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('badge text-xs', TIPO_CONFIG[docVisualizar.tipo]?.cor)}>{TIPO_CONFIG[docVisualizar.tipo]?.label}</span>
                  {docVisualizar.clientes && <span className="text-xs text-gray-400">{docVisualizar.clientes.nome}</span>}
                </div>
              </div>
              <button onClick={() => setDocVisualizar(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            {docVisualizar.link_arquivo && (
              <a href={docVisualizar.link_arquivo} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-vinho hover:underline mb-4">
                📎 Ver arquivo anexo
              </a>
            )}
            {docVisualizar.drive_url && (
              <a href={docVisualizar.drive_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
                <ExternalLink size={14} /> Abrir no Google Drive
              </a>
            )}
            {docVisualizar.conteudo && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: docVisualizar.conteudo }} />
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setDocVisualizar(null); abrirEditar(docVisualizar) }}
                className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <Edit2 size={14} /> Editar
              </button>
              <button onClick={() => setDocVisualizar(null)} className="btn-primary flex-1 justify-center">Fechar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal criar/editar */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">
              {editando ? 'Editar documento' : 'Novo documento'}
            </h2>
            <button onClick={() => { setModalAberto(false); setEditando(null) }} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Título *</label>
                <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Cliente</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Sem cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Conteúdo</label>
              <RichTextEditor value={form.conteudo} onChange={v => setForm(f => ({ ...f, conteudo: v }))} />
            </div>

            <div>
              <label className="label">Link do Google Drive</label>
              <input className="input" value={form.drive_url}
                onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))}
                placeholder="https://drive.google.com/..." />
            </div>

            <div>
              <label className="label">Arquivo anexo</label>
              {form.link_arquivo ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="text-sm text-emerald-700 flex-1 truncate">✅ Arquivo enviado</span>
                  <a href={form.link_arquivo} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-vinho hover:underline">Ver</a>
                  <button onClick={() => setForm(f => ({ ...f, link_arquivo: '' }))}
                    className="text-xs text-gray-400 hover:text-red-500">Remover</button>
                </div>
              ) : (
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-vinho hover:bg-rosa-pale/10 transition-all">
                  <Upload size={18} className="text-gray-300" />
                  <span className="text-sm text-gray-500">
                    {uploadando ? 'Enviando...' : 'Clique para anexar arquivo (PDF, DOC, imagem...)'}
                  </span>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                </label>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModalAberto(false); setEditando(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                className="btn-primary flex-1 justify-center flex items-center gap-2">
                <Save size={14} /> {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
