'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Plus, X, Search, FileText, Upload, Trash2, Eye, Edit2, Save, ExternalLink, Send, CheckCircle, Clock, Settings, Paperclip, MessageCircle } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function ComentariosDocAdmin({ docId }: { docId: string }) {
  const supabase = createClient()
  const [comentarios, setComentarios] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [adminNome, setAdminNome] = useState('')
  const [adminId, setAdminId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAdminId(user.id)
        supabase.from('profiles').select('nome').eq('id', user.id).single().then(({ data }) => {
          if (data) setAdminNome(data.nome)
        })
      }
    })
    carregar()
  }, [docId])

  async function carregar() {
    const { data } = await supabase.from('aprovacao_comentarios').select('*').eq('doc_id', docId).order('created_at')
    setComentarios(data || [])
  }

  async function enviar() {
    if (!texto.trim() && !arquivo) return
    setEnviando(true)
    await supabase.from('aprovacao_comentarios').insert({
      doc_id: docId, autor_id: adminId, autor_nome: adminNome || 'Agência',
      autor_role: 'admin', conteudo: texto || null, arquivo_url: arquivo || null,
    })
    setTexto(''); setArquivo('')
    setEnviando(false)
    carregar()
  }

  async function uploadArquivo(file: File) {
    setUploadando(true)
    const path = `comentarios/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('docs').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('docs').getPublicUrl(path)
      setArquivo(data.publicUrl)
    }
    setUploadando(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <MessageCircle size={12} /> Comentários ({comentarios.length})
      </p>
      {comentarios.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comentarios.map(c => (
            <div key={c.id} className={cn('flex gap-2', c.autor_role === 'admin' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                c.autor_role === 'admin' ? 'bg-vinho' : 'bg-gray-400')}>
                {c.autor_nome?.charAt(0)}
              </div>
              <div className="max-w-[75%]">
                <div className={cn('rounded-2xl px-3 py-2 text-xs',
                  c.autor_role === 'admin' ? 'bg-vinho text-white rounded-tr-sm' : 'bg-creme text-gray-800 rounded-tl-sm')}>
                  {c.conteudo && <p>{c.conteudo}</p>}
                  {c.arquivo_url && (
                    <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer"
                      className={cn('flex items-center gap-1 mt-1 hover:underline', c.autor_role === 'admin' ? 'text-white/80' : 'text-vinho')}>
                      <Paperclip size={10} /> Arquivo
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 px-1 mt-0.5">
                  {c.autor_nome} · {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {arquivo && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
          <Paperclip size={12} className="text-emerald-600" />
          <span className="text-xs text-emerald-700 flex-1 truncate">Arquivo pronto</span>
          <button onClick={() => setArquivo('')}><X size={12} className="text-gray-400" /></button>
        </div>
      )}
      <div className="flex gap-2">
        <input className="input flex-1 text-sm" value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
          placeholder="Comentar ou responder ao cliente..." />
        <label className="btn-ghost p-2 cursor-pointer">
          <Paperclip size={15} className={uploadando ? 'animate-pulse text-vinho' : 'text-gray-400'} />
          <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadArquivo(f) }} />
        </label>
        <button onClick={enviar} disabled={enviando} className="btn-primary p-2"><Send size={15} /></button>
      </div>
    </div>
  )
}

const TIPOS_DOC_PADRAO = ['briefing', 'estrategia', 'curadoria', 'calendario', 'referencia', 'nota', 'contrato', 'outro']
const TIPO_CORES: Record<string, string> = {
  briefing: 'bg-blue-100 text-blue-700',
  estrategia: 'bg-purple-100 text-purple-700',
  curadoria: 'bg-pink-100 text-pink-700',
  calendario: 'bg-indigo-100 text-indigo-700',
  referencia: 'bg-orange-100 text-orange-700',
  nota: 'bg-gray-100 text-gray-700',
  contrato: 'bg-emerald-100 text-emerald-700',
  outro: 'bg-rose-100 text-rose-700',
}
const STATUS_APROVACAO: Record<string, { label: string; cor: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600' },
  aguardando: { label: 'Aguardando aprovação', cor: 'bg-orange-100 text-orange-700' },
  aprovado: { label: 'Aprovado', cor: 'bg-emerald-100 text-emerald-700' },
  reprovado: { label: 'Reprovado', cor: 'bg-red-100 text-red-700' },
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

export default function DocsPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [tiposCustom, setTiposCustom] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [modalTipos, setModalTipos] = useState(false)
  const [docVisualizar, setDocVisualizar] = useState<any>(null)
  const [editando, setEditando] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [novoTipo, setNovoTipo] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    cliente_id: '', titulo: '', tipo: 'nota',
    conteudo: '', link_arquivo: '', drive_url: '',
    status_aprovacao: 'rascunho', visivel_cliente: false
  })

  const todosTipos = [...TIPOS_DOC_PADRAO, ...tiposCustom].filter((v, i, a) => a.indexOf(v) === i)

  function getLabelTipo(tipo: string) { return tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
  function getCorTipo(tipo: string) { return TIPO_CORES[tipo] || 'bg-gray-100 text-gray-600' }

  async function carregar() {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('docs').select('*, clientes(nome, cor)').order('updated_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setDocs(d || [])
    setClientes(c || [])
    try { const saved = localStorage.getItem('docs_tipos_custom'); if (saved) setTiposCustom(JSON.parse(saved)) } catch {}
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function salvarTipoCustom() {
    if (!novoTipo.trim()) return
    const normalizado = novoTipo.trim().toLowerCase().replace(/\s+/g, '_')
    const novos = [...tiposCustom, normalizado].filter((v, i, a) => a.indexOf(v) === i)
    setTiposCustom(novos)
    localStorage.setItem('docs_tipos_custom', JSON.stringify(novos))
    setNovoTipo('')
  }

  function removerTipoCustom(tipo: string) {
    const novos = tiposCustom.filter(t => t !== tipo)
    setTiposCustom(novos)
    localStorage.setItem('docs_tipos_custom', JSON.stringify(novos))
  }

  function abrirEditar(doc: any) {
    setEditando(doc)
    setForm({
      cliente_id: doc.cliente_id || '', titulo: doc.titulo || '', tipo: doc.tipo || 'nota',
      conteudo: doc.conteudo || '', link_arquivo: doc.link_arquivo || '', drive_url: doc.drive_url || '',
      status_aprovacao: doc.status_aprovacao || 'rascunho', visivel_cliente: doc.visivel_cliente || false,
    })
    setModalAberto(true)
  }

  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null)

  async function handleUpload(file: File) {
    // Só guarda o arquivo, faz upload quando salvar
    setArquivoPendente(file)
    setForm(f => ({ ...f, link_arquivo: file.name })) // mostra nome pro usuário
  }

  async function uploadArquivo(file: File): Promise<string> {
    const path = `docs/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('docs').upload(path, file, { upsert: true })
    if (error) throw new Error('Erro no upload: ' + error.message)
    const { data } = supabase.storage.from('docs').getPublicUrl(path)
    return data.publicUrl
  }

  async function salvar(enviarParaAprovacao = false) {
    if (!form.titulo) return alert('Título é obrigatório!')
    setSalvando(true)

    let linkArquivo = form.link_arquivo || null

    // Se tem arquivo pendente, faz upload agora
    if (arquivoPendente) {
      try {
        linkArquivo = await uploadArquivo(arquivoPendente)
        setArquivoPendente(null)
      } catch (err: any) {
        setSalvando(false)
        return alert(err.message)
      }
    }

    const dados = {
      titulo: form.titulo, tipo: form.tipo,
      cliente_id: form.cliente_id || null,
      conteudo: form.conteudo || null,
      link_arquivo: linkArquivo,
      drive_url: form.drive_url || null,
      status_aprovacao: enviarParaAprovacao ? 'aguardando' : (form.status_aprovacao || 'rascunho'),
      visivel_cliente: enviarParaAprovacao ? true : form.visivel_cliente,
    }

    if (editando?.id) {
      await supabase.from('docs').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', editando.id)
    } else {
      await supabase.from('docs').insert(dados)
    }
    setSalvando(false)
    setModalAberto(false)
    setEditando(null)
    setArquivoPendente(null)
    setForm({ cliente_id: '', titulo: '', tipo: 'nota', conteudo: '', link_arquivo: '', drive_url: '', status_aprovacao: 'rascunho', visivel_cliente: false })
    carregar()
  }

  async function enviarParaAprovacao(doc: any) {
    setEnviando(true)
    await supabase.from('docs').update({ status_aprovacao: 'aguardando', visivel_cliente: true, updated_at: new Date().toISOString() }).eq('id', doc.id)
    setEnviando(false)
    setDocVisualizar(null)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este documento?')) return
    await supabase.from('docs').delete().eq('id', id)
    carregar()
  }

  const filtrados = docs.filter(d => {
    const buscaOk = d.titulo?.toLowerCase().includes(busca.toLowerCase())
    const clienteOk = filtroCliente === 'todos' || d.cliente_id === filtroCliente
    const tipoOk = filtroTipo === 'todos' || d.tipo === filtroTipo
    const statusOk = filtroStatus === 'todos' || d.status_aprovacao === filtroStatus
    return buscaOk && clienteOk && tipoOk && statusOk
  })

  const aguardando = docs.filter(d => d.status_aprovacao === 'aguardando').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {docs.length} documento(s)
            {aguardando > 0 && <span className="ml-2 badge bg-orange-100 text-orange-700">{aguardando} aguardando aprovação</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalTipos(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Settings size={15} /> Tipos
          </button>
          <button onClick={() => { setEditando(null); setForm({ cliente_id: '', titulo: '', tipo: 'nota', conteudo: '', link_arquivo: '', drive_url: '', status_aprovacao: 'rascunho', visivel_cliente: false }); setModalAberto(true) }}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

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
          {todosTipos.map(t => <option key={t} value={t}>{getLabelTipo(t)}</option>)}
        </select>
        <select className="input w-auto" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_APROVACAO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-creme" />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16"><FileText size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Nenhum documento encontrado</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map(doc => {
            const statusConfig = STATUS_APROVACAO[doc.status_aprovacao || 'rascunho']
            return (
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
                      <span className={cn('badge text-xs', getCorTipo(doc.tipo))}>{getLabelTipo(doc.tipo)}</span>
                      <span className={cn('badge text-xs', statusConfig.cor)}>{statusConfig.label}</span>
                    </div>
                  </div>
                </div>
                {doc.conteudo && (
                  <div className="text-xs text-gray-400 line-clamp-2 mb-3"
                    dangerouslySetInnerHTML={{ __html: doc.conteudo.replace(/<[^>]+>/g, ' ').slice(0, 120) + '...' }} />
                )}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {doc.link_arquivo && <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-vinho hover:underline">📎 Arquivo</a>}
                  {doc.drive_url && <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink size={11} /> Drive</a>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{formatDate(doc.updated_at, "dd/MM/yyyy")}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {doc.status_aprovacao === 'rascunho' && doc.cliente_id && (
                      <button onClick={() => enviarParaAprovacao(doc)} disabled={enviando}
                        className="btn-ghost p-1.5 text-orange-500 hover:text-orange-700" title="Enviar para aprovação">
                        <Send size={14} />
                      </button>
                    )}
                    <button onClick={() => setDocVisualizar(doc)} className="btn-ghost p-1.5"><Eye size={14} /></button>
                    <button onClick={() => abrirEditar(doc)} className="btn-ghost p-1.5"><Edit2 size={14} /></button>
                    <button onClick={() => excluir(doc.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
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
                  <span className={cn('badge text-xs', getCorTipo(docVisualizar.tipo))}>{getLabelTipo(docVisualizar.tipo)}</span>
                  <span className={cn('badge text-xs', STATUS_APROVACAO[docVisualizar.status_aprovacao || 'rascunho']?.cor)}>
                    {STATUS_APROVACAO[docVisualizar.status_aprovacao || 'rascunho']?.label}
                  </span>
                  {docVisualizar.clientes && <span className="text-xs text-gray-400">{docVisualizar.clientes.nome}</span>}
                </div>
              </div>
              <button onClick={() => setDocVisualizar(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            {docVisualizar.link_arquivo && (
              <div className="mb-4">
                {/\.(pdf)$/i.test(docVisualizar.link_arquivo) ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <div className="flex items-center justify-between px-3 py-2 bg-creme border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">📄 Visualizando PDF</span>
                      <a href={docVisualizar.link_arquivo} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-vinho hover:underline">Abrir em nova aba ↗</a>
                    </div>
                    <iframe src={docVisualizar.link_arquivo} className="w-full h-96" title="Preview do documento" />
                  </div>
                ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(docVisualizar.link_arquivo) ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <div className="flex items-center justify-between px-3 py-2 bg-creme border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">🖼 Imagem</span>
                      <a href={docVisualizar.link_arquivo} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-vinho hover:underline">Abrir em nova aba ↗</a>
                    </div>
                    <img src={docVisualizar.link_arquivo} alt="Anexo" className="w-full max-h-96 object-contain bg-gray-50" />
                  </div>
                ) : (
                  <a href={docVisualizar.link_arquivo} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-vinho hover:underline">
                    📎 Baixar arquivo anexo
                  </a>
                )}
              </div>
            )}
            {docVisualizar.drive_url && <a href={docVisualizar.drive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-3"><ExternalLink size={14} /> Abrir no Drive</a>}
            {docVisualizar.conteudo && <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: docVisualizar.conteudo }} />}

            {docVisualizar.status_aprovacao !== 'rascunho' && docVisualizar.cliente_id && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <ComentariosDocAdmin docId={docVisualizar.id} />
              </div>
            )}

            <div className="flex gap-3 mt-4">
              {docVisualizar.status_aprovacao === 'rascunho' && docVisualizar.cliente_id && (
                <button onClick={() => enviarParaAprovacao(docVisualizar)} disabled={enviando}
                  className="btn-primary flex-1 justify-center flex items-center gap-2">
                  <Send size={14} /> {enviando ? 'Enviando...' : 'Enviar para aprovação'}
                </button>
              )}
              {docVisualizar.status_aprovacao === 'aguardando' && (
                <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-orange-700 flex items-center justify-center gap-2"><Clock size={14} /> Aguardando aprovação</p>
                </div>
              )}
              {docVisualizar.status_aprovacao === 'aprovado' && (
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-emerald-700 flex items-center justify-center gap-2"><CheckCircle size={14} /> Aprovado ✓</p>
                </div>
              )}
              <button onClick={() => { setDocVisualizar(null); abrirEditar(docVisualizar) }} className="btn-secondary flex items-center gap-2"><Edit2 size={14} /> Editar</button>
              <button onClick={() => setDocVisualizar(null)} className="btn-ghost">Fechar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal tipos */}
      <Modal open={modalTipos} onClose={() => setModalTipos(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Tipos de documento</h2>
            <button onClick={() => setModalTipos(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tipos padrão</p>
              <div className="flex flex-wrap gap-2">{TIPOS_DOC_PADRAO.map(t => <span key={t} className={cn('badge', getCorTipo(t))}>{getLabelTipo(t)}</span>)}</div>
            </div>
            {tiposCustom.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tipos customizados</p>
                <div className="flex flex-wrap gap-2">
                  {tiposCustom.map(t => (
                    <span key={t} className="badge bg-gray-100 text-gray-700 flex items-center gap-1.5">
                      {getLabelTipo(t)}
                      <button onClick={() => removerTipoCustom(t)} className="hover:text-red-500"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Adicionar novo tipo</p>
              <div className="flex gap-2">
                <input className="input flex-1" value={novoTipo} onChange={e => setNovoTipo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvarTipoCustom()} placeholder="Ex: relatório, planejamento..." />
                <button onClick={salvarTipoCustom} className="btn-primary px-4">Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal criar/editar */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">{editando ? 'Editar documento' : 'Novo documento'}</h2>
            <button onClick={() => { setModalAberto(false); setEditando(null) }} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Título *</label><input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {todosTipos.map(t => <option key={t} value={t}>{getLabelTipo(t)}</option>)}
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
              <label className="label">Descrição / Notas</label>
              <textarea className="input resize-none" rows={4}
                value={form.conteudo}
                onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                placeholder="Observações, descrição ou contexto do documento..." />
            </div>
            <div><label className="label">Link do Google Drive</label><input className="input" value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} placeholder="https://drive.google.com/..." /></div>
            <div>
              <label className="label">Arquivo anexo</label>
              {form.link_arquivo ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <Paperclip size={13} className="text-emerald-600" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">
                    {arquivoPendente ? `📎 ${arquivoPendente.name}` : '✅ Arquivo enviado'}
                  </span>
                  <button onClick={() => setForm(f => ({ ...f, link_arquivo: '' }))} className="text-xs text-gray-400 hover:text-red-500">Remover</button>
                </div>
              ) : (
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-vinho hover:bg-rosa-pale/10 transition-all">
                  <Upload size={18} className="text-gray-300" />
                  <span className="text-sm text-gray-500">{uploadando ? 'Enviando...' : 'Clique para anexar arquivo'}</span>
                  <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                </label>
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <input type="checkbox" id="visivel_doc" checked={form.visivel_cliente} onChange={e => setForm(f => ({ ...f, visivel_cliente: e.target.checked }))} className="rounded" />
              <label htmlFor="visivel_doc" className="text-sm font-medium text-blue-700 cursor-pointer">Visível para o cliente</label>
            </div>
            <div className="flex gap-3 pt-2 pb-2">
              <button onClick={() => { setModalAberto(false); setEditando(null) }} className="btn-secondary flex-1">Cancelar</button>
              {form.cliente_id && (
                <button onClick={() => salvar(true)} disabled={salvando} className="btn-secondary flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50">
                  <Send size={14} /> Enviar p/ aprovação
                </button>
              )}
              <button onClick={() => salvar(false)} disabled={salvando} className="btn-primary flex items-center gap-2 justify-center">
                <Save size={14} /> {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// PATCH: adicionar visualização de comentários no modal de docs
// Substituir no modal de visualizar, após os botões de aprovação, adicionar:
/*
<ComentariosDoc docId={docVisualizar?.id} isAdmin={true} userId={adminId} userName={adminNome} />
*/
