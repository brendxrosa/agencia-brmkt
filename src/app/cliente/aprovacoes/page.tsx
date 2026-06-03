'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, MessageCircle, Paperclip, Send, Download, FileText, ChevronDown, ChevronUp, X } from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_CONFIG = {
  aguardando: { label: 'Aguardando aprovação', cor: 'bg-orange-100 text-orange-700', icon: Clock },
  aprovado: { label: 'Aprovado', cor: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  reprovado: { label: 'Reprovado', cor: 'bg-red-100 text-red-700', icon: XCircle },
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600', icon: Clock },
}

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

function getLabelTipo(tipo: string) {
  return tipo?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Documento'
}

export default function ClienteAprovacoesPage() {
  const supabase = createClient()
  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [aba, setAba] = useState<'posts' | 'docs'>('docs')
  const [posts, setPosts] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [comentarios, setComentarios] = useState<Record<string, any[]>>({})
  const [abertos, setAbertos] = useState<string[]>([])
  const [comentario, setComentario] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [uploadando, setUploadando] = useState<string | null>(null)
  const [arquivoTemp, setArquivoTemp] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement>>({})
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('cliente_id, nome').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)
    setUserName(profile.nome || 'Cliente')

    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from('posts').select('*').eq('cliente_id', profile.cliente_id).eq('status_interno', 'aguardando_cliente').order('created_at', { ascending: false }),
      supabase.from('docs').select('*').eq('cliente_id', profile.cliente_id).eq('status_aprovacao', 'aguardando').order('updated_at', { ascending: false }),
    ])

    setPosts(p || [])
    setDocs(d || [])
    setLoading(false)
  }

  async function carregarComentarios(docId: string) {
    const { data } = await supabase.from('aprovacao_comentarios').select('*').eq('doc_id', docId).order('created_at')
    setComentarios(prev => ({ ...prev, [docId]: data || [] }))
  }

  useEffect(() => { carregar() }, [])

  function toggleAberto(id: string) {
    const novoEstado = abertos.includes(id) ? abertos.filter(x => x !== id) : [...abertos, id]
    setAbertos(novoEstado)
    if (!abertos.includes(id)) carregarComentarios(id)
  }

  async function aprovarDoc(docId: string, status: 'aprovado' | 'reprovado') {
    setAtualizando(docId)
    await supabase.from('docs').update({
      status_aprovacao: status,
      updated_at: new Date().toISOString()
    }).eq('id', docId)

    // Registra no histórico como comentário do sistema
    await supabase.from('aprovacao_comentarios').insert({
      doc_id: docId,
      autor_id: userId,
      autor_nome: userName,
      autor_role: 'cliente',
      conteudo: status === 'aprovado' ? '✅ Documento aprovado.' : '❌ Documento reprovado.',
    })

    setAtualizando(null)
    carregar()
    carregarComentarios(docId)
  }

  async function aprovarPost(postId: string, status: 'aprovado' | 'reprovado') {
    setAtualizando(postId)
    await supabase.from('posts').update({
      status_cliente: status,
      status_interno: status === 'aprovado' ? 'aprovado' : 'ajuste_necessario'
    }).eq('id', postId)
    setAtualizando(null)
    carregar()
  }

  async function enviarComentario(docId: string) {
    const texto = comentario[docId]?.trim()
    const arquivo = arquivoTemp[docId]
    if (!texto && !arquivo) return

    setEnviando(docId)
    await supabase.from('aprovacao_comentarios').insert({
      doc_id: docId,
      autor_id: userId,
      autor_nome: userName,
      autor_role: 'cliente',
      conteudo: texto || null,
      arquivo_url: arquivo || null,
    })
    setComentario(prev => ({ ...prev, [docId]: '' }))
    setArquivoTemp(prev => ({ ...prev, [docId]: '' }))
    setEnviando(null)
    carregarComentarios(docId)
  }

  async function handleUploadComentario(docId: string, file: File) {
    setUploadando(docId)
    const path = `comentarios/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('docs').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('docs').getPublicUrl(path)
      setArquivoTemp(prev => ({ ...prev, [docId]: data.publicUrl }))
    }
    setUploadando(null)
  }

  const totalPendente = posts.length + docs.length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Aprovações</h1>
        <p className="text-gray-500 text-sm mt-1">{totalPendente} item(s) aguardando sua aprovação</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-creme rounded-xl p-1">
        <button onClick={() => setAba('docs')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
            aba === 'docs' ? 'bg-white shadow-card text-vinho' : 'text-gray-500')}>
          <FileText size={15} /> Documentos {docs.length > 0 && <span className="badge bg-orange-100 text-orange-700 text-xs">{docs.length}</span>}
        </button>
        <button onClick={() => setAba('posts')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
            aba === 'posts' ? 'bg-white shadow-card text-vinho' : 'text-gray-500')}>
          <CheckCircle size={15} /> Posts {posts.length > 0 && <span className="badge bg-orange-100 text-orange-700 text-xs">{posts.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-creme" />)}</div>
      ) : aba === 'docs' ? (
        docs.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhum documento aguardando aprovação 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {docs.map(doc => {
              const aberto = abertos.includes(doc.id)
              const coments = comentarios[doc.id] || []
              const statusConfig = STATUS_CONFIG[doc.status_aprovacao as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.aguardando
              const Icon = statusConfig.icon

              return (
                <div key={doc.id} className="card">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{doc.titulo}</p>
                        <span className={cn('badge text-xs', TIPO_CORES[doc.tipo] || 'bg-gray-100 text-gray-600')}>
                          {getLabelTipo(doc.tipo)}
                        </span>
                        <span className={cn('badge text-xs flex items-center gap-1', statusConfig.cor)}>
                          <Icon size={10} /> {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Enviado {formatDistanceToNow(parseISO(doc.updated_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <button onClick={() => toggleAberto(doc.id)} className="btn-ghost p-1.5 flex-shrink-0">
                      {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {aberto && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {/* Conteúdo do doc */}
                      {doc.conteudo && (
                        <div className="prose prose-sm max-w-none text-gray-700 bg-creme/50 rounded-xl p-4"
                          dangerouslySetInnerHTML={{ __html: doc.conteudo }} />
                      )}

                      {/* Preview inline */}
                      {doc.link_arquivo && (
                        <div className="mb-3">
                          {/\.(pdf)$/i.test(doc.link_arquivo) ? (
                            <div className="rounded-xl overflow-hidden border border-gray-200">
                              <div className="flex items-center justify-between px-3 py-2 bg-creme border-b border-gray-200">
                                <span className="text-xs font-medium text-gray-600">📄 PDF</span>
                                <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer" className="text-xs text-vinho hover:underline flex items-center gap-1"><Download size={11} /> Baixar</a>
                              </div>
                              <iframe src={doc.link_arquivo} className="w-full h-72" title="Preview" />
                            </div>
                          ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(doc.link_arquivo) ? (
                            <img src={doc.link_arquivo} alt="Anexo" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-50" />
                          ) : (
                            <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm text-vinho hover:underline">
                              <Download size={14} /> Baixar arquivo
                            </a>
                          )}
                        </div>
                      )}
                      {doc.drive_url && (
                          <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                            <Download size={14} /> Abrir no Drive
                          </a>
                      )}

                      {/* Botões aprovação */}
                      {doc.status_aprovacao === 'aguardando' && (
                        <div className="flex gap-3">
                          <button onClick={() => aprovarDoc(doc.id, 'reprovado')} disabled={atualizando === doc.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl font-medium text-sm hover:bg-red-100 transition-all">
                            <XCircle size={16} /> Reprovar
                          </button>
                          <button onClick={() => aprovarDoc(doc.id, 'aprovado')} disabled={atualizando === doc.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-all">
                            <CheckCircle size={16} /> {atualizando === doc.id ? 'Salvando...' : 'Aprovar'}
                          </button>
                        </div>
                      )}

                      {doc.status_aprovacao !== 'aguardando' && (
                        <div className={cn('rounded-xl p-3 text-center', statusConfig.cor)}>
                          <p className="text-sm font-medium flex items-center justify-center gap-2">
                            <Icon size={14} /> {statusConfig.label}
                          </p>
                        </div>
                      )}

                      {/* Comentários */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                          <MessageCircle size={12} /> Comentários e ajustes
                        </p>

                        {coments.length === 0 ? (
                          <p className="text-xs text-gray-400">Nenhum comentário ainda. Use o campo abaixo para deixar observações ou pedir ajustes.</p>
                        ) : (
                          <div className="space-y-3">
                            {coments.map(c => (
                              <div key={c.id} className={cn('flex gap-2', c.autor_role === 'cliente' ? 'flex-row-reverse' : 'flex-row')}>
                                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                                  c.autor_role === 'cliente' ? 'bg-vinho' : 'bg-gray-400')}>
                                  {c.autor_nome?.charAt(0)}
                                </div>
                                <div className={cn('max-w-[80%] space-y-1', c.autor_role === 'cliente' ? 'items-end' : 'items-start')}>
                                  <div className={cn('rounded-2xl px-3 py-2 text-sm',
                                    c.autor_role === 'cliente' ? 'bg-vinho text-white rounded-tr-sm' : 'bg-creme text-gray-800 rounded-tl-sm')}>
                                    {c.conteudo && <p>{c.conteudo}</p>}
                                    {c.arquivo_url && (
                                      <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer"
                                        className={cn('flex items-center gap-1.5 text-xs mt-1 hover:underline',
                                          c.autor_role === 'cliente' ? 'text-white/80' : 'text-vinho')}>
                                        <Paperclip size={11} /> Ver arquivo anexo
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 px-1">
                                    {c.autor_nome} · {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Campo comentário */}
                        <div className="space-y-2">
                          {arquivoTemp[doc.id] && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                              <Paperclip size={13} className="text-emerald-600" />
                              <span className="text-xs text-emerald-700 flex-1 truncate">Arquivo pronto para enviar</span>
                              <button onClick={() => setArquivoTemp(prev => ({ ...prev, [doc.id]: '' }))}
                                className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input className="input flex-1 text-sm" value={comentario[doc.id] || ''}
                              onChange={e => setComentario(prev => ({ ...prev, [doc.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarComentario(doc.id)}
                              placeholder="Deixe um comentário ou pedido de ajuste..." />
                            <label className="btn-ghost p-2.5 cursor-pointer" title="Anexar arquivo">
                              <Paperclip size={16} className={uploadando === doc.id ? 'animate-pulse text-vinho' : 'text-gray-400'} />
                              <input type="file" className="hidden"
                                ref={el => { if (el) fileRefs.current[doc.id] = el }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadComentario(doc.id, f) }} />
                            </label>
                            <button onClick={() => enviarComentario(doc.id)} disabled={enviando === doc.id}
                              className="btn-primary p-2.5">
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Posts */
        posts.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhum post aguardando aprovação 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="card">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{post.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge bg-gray-100 text-gray-600 text-xs">{post.tipo}</span>
                      <span className="badge bg-orange-100 text-orange-700 text-xs flex items-center gap-1">
                        <Clock size={10} /> Aguardando aprovação
                      </span>
                    </div>
                  </div>
                </div>
                {post.descricao && <p className="text-sm text-gray-600 mb-3">{post.descricao}</p>}
                {post.legenda && (
                  <div className="bg-creme rounded-xl p-3 mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Legenda</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.legenda}</p>
                  </div>
                )}
                {post.link_midia && (
                  <a href={post.link_midia} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-vinho hover:underline mb-4">
                    <Download size={14} /> Ver arquivo do post
                  </a>
                )}
                <div className="flex gap-3">
                  <button onClick={() => aprovarPost(post.id, 'reprovado')} disabled={atualizando === post.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl font-medium text-sm hover:bg-red-100 transition-all">
                    <XCircle size={16} /> Reprovar
                  </button>
                  <button onClick={() => aprovarPost(post.id, 'aprovado')} disabled={atualizando === post.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-all">
                    <CheckCircle size={16} /> {atualizando === post.id ? 'Salvando...' : 'Aprovar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
