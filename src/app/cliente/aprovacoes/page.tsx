'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, MessageSquare, X, FileText, Kanban } from 'lucide-react'
import { STATUS_POST_LABELS, STATUS_POST_CORES } from '@/lib/utils'

export default function ClienteAprovacoesPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState('posts')
  const [itemSelecionado, setItemSelecionado] = useState<any>(null)
  const [feedback, setFeedback] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)

    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from('posts').select('*')
        .eq('cliente_id', profile.cliente_id)
        .in('status_interno', ['aguardando_cliente', 'aprovado', 'reprovado'])
        .order('created_at', { ascending: false }),
      supabase.from('aprovacoes_docs').select('*')
        .eq('cliente_id', profile.cliente_id)
        .order('created_at', { ascending: false })
    ])

    setPosts(p || [])
    setDocs(d || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function responderPost(postId: string, status: 'aprovado' | 'reprovado') {
    setSalvando(true)
    await supabase.from('posts').update({
      status_cliente: status,
      feedback_cliente: feedback || null,
      status_interno: status
    }).eq('id', postId)
    setItemSelecionado(null)
    setFeedback('')
    setSalvando(false)
    carregar()
  }

  async function responderDoc(docId: string, status: 'aprovado' | 'reprovado') {
    setSalvando(true)
    await supabase.from('aprovacoes_docs').update({
      status,
      feedback_cliente: feedback || null,
      updated_at: new Date().toISOString()
    }).eq('id', docId)
    setItemSelecionado(null)
    setFeedback('')
    setSalvando(false)
    carregar()
  }

  const postsPendentes = posts.filter(p => p.status_cliente === 'pendente')
  const postsRespondidos = posts.filter(p => p.status_cliente !== 'pendente')
  const docsPendentes = docs.filter(d => d.status === 'pendente')
  const docsRespondidos = docs.filter(d => d.status !== 'pendente')
  const totalPendentes = postsPendentes.length + docsPendentes.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Aprovações</h1>
        <p className="text-gray-500 text-sm mt-1">{totalPendentes} item(s) aguardando sua aprovação</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-creme rounded-xl p-1">
        <button onClick={() => setAba('posts')}
          className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
            aba === 'posts' ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
          <Kanban size={14} /> Posts
          {postsPendentes.length > 0 && (
            <span className="w-5 h-5 bg-rosa rounded-full text-xs text-white flex items-center justify-center">
              {postsPendentes.length}
            </span>
          )}
        </button>
        <button onClick={() => setAba('docs')}
          className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
            aba === 'docs' ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
          <FileText size={14} /> Estratégias
          {docsPendentes.length > 0 && (
            <span className="w-5 h-5 bg-rosa rounded-full text-xs text-white flex items-center justify-center">
              {docsPendentes.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-creme" />)}</div>
      ) : (
        <>
          {/* ABA POSTS */}
          {aba === 'posts' && (
            <div className="space-y-4">
              {postsPendentes.length > 0 && (
                <div className="space-y-3">
                  <h2 className="section-title text-sm flex items-center gap-2">
                    <Clock size={16} className="text-orange-500" /> Aguardando aprovação
                  </h2>
                  {postsPendentes.map(post => (
                    <div key={post.id} className="card border-l-4 border-l-orange-400">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800">{post.titulo}</p>
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{post.tipo}</p>
                          {post.copy && (
                            <div className="mt-3 bg-creme rounded-xl p-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Copy/Roteiro:</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.copy}</p>
                            </div>
                          )}
                          {post.legenda && (
                            <div className="mt-2 bg-creme rounded-xl p-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Legenda:</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.legenda}</p>
                            </div>
                          )}
                          {post.link_midia && (
                            <a href={post.link_midia} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-xs text-vinho hover:underline">
                              📎 Ver mídia/arquivo
                            </a>
                          )}
                        </div>
                      </div>

                      {itemSelecionado?.id === post.id ? (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="label">Feedback (opcional para aprovação)</label>
                            <textarea className="input resize-none" rows={3} value={feedback}
                              onChange={e => setFeedback(e.target.value)}
                              placeholder="Deixe um comentário..." />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setItemSelecionado(null); setFeedback('') }} className="btn-ghost flex-1">Cancelar</button>
                            <button onClick={() => responderPost(post.id, 'reprovado')} disabled={salvando}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                              <XCircle size={16} /> Reprovar
                            </button>
                            <button onClick={() => responderPost(post.id, 'aprovado')} disabled={salvando}
                              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                              <CheckCircle size={16} /> Aprovar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setItemSelecionado(post)}
                          className="mt-4 btn-primary w-full justify-center flex items-center gap-2">
                          <MessageSquare size={16} /> Analisar e responder
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {postsRespondidos.length > 0 && (
                <div className="space-y-2">
                  <h2 className="section-title text-sm">Histórico de posts</h2>
                  {postsRespondidos.map(post => (
                    <div key={post.id} className={cn('card border-l-4', {
                      'border-l-emerald-400': post.status_cliente === 'aprovado',
                      'border-l-red-400': post.status_cliente === 'reprovado',
                    })}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{post.titulo}</p>
                          <p className="text-xs text-gray-400 capitalize">{post.tipo}</p>
                          {post.feedback_cliente && <p className="text-xs text-gray-500 mt-1 italic">"{post.feedback_cliente}"</p>}
                        </div>
                        <span className={cn('badge text-xs flex items-center gap-1', {
                          'bg-emerald-100 text-emerald-700': post.status_cliente === 'aprovado',
                          'bg-red-100 text-red-700': post.status_cliente === 'reprovado',
                        })}>
                          {post.status_cliente === 'aprovado' ? <><CheckCircle size={11} /> Aprovado</> : <><XCircle size={11} /> Reprovado</>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {posts.length === 0 && (
                <div className="card text-center py-16">
                  <CheckCircle size={40} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-500">Nenhum post para aprovar no momento</p>
                </div>
              )}
            </div>
          )}

          {/* ABA DOCS/ESTRATÉGIA */}
          {aba === 'docs' && (
            <div className="space-y-4">
              {docsPendentes.length > 0 && (
                <div className="space-y-3">
                  <h2 className="section-title text-sm flex items-center gap-2">
                    <Clock size={16} className="text-orange-500" /> Aguardando aprovação
                  </h2>
                  {docsPendentes.map(doc => (
                    <div key={doc.id} className="card border-l-4 border-l-purple-400">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{doc.titulo}</p>
                        {doc.descricao && <p className="text-xs text-gray-400 mt-0.5">{doc.descricao}</p>}
                        {doc.conteudo && (
                          <div className="mt-3 bg-creme rounded-xl p-3 max-h-48 overflow-y-auto">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{doc.conteudo}</p>
                          </div>
                        )}
                        {doc.link_arquivo && (
                          <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs text-vinho hover:underline">
                            📎 Ver arquivo completo
                          </a>
                        )}
                        <p className="text-xs text-gray-400 mt-2">{formatDate(doc.created_at)}</p>
                      </div>

                      {itemSelecionado?.id === doc.id ? (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="label">Feedback</label>
                            <textarea className="input resize-none" rows={3} value={feedback}
                              onChange={e => setFeedback(e.target.value)}
                              placeholder="Deixe um comentário sobre a estratégia..." />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setItemSelecionado(null); setFeedback('') }} className="btn-ghost flex-1">Cancelar</button>
                            <button onClick={() => responderDoc(doc.id, 'reprovado')} disabled={salvando}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                              <XCircle size={16} /> Solicitar ajuste
                            </button>
                            <button onClick={() => responderDoc(doc.id, 'aprovado')} disabled={salvando}
                              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                              <CheckCircle size={16} /> Aprovar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setItemSelecionado(doc)}
                          className="mt-4 btn-primary w-full justify-center flex items-center gap-2">
                          <MessageSquare size={16} /> Analisar e responder
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {docsRespondidos.length > 0 && (
                <div className="space-y-2">
                  <h2 className="section-title text-sm">Histórico de estratégias</h2>
                  {docsRespondidos.map(doc => (
                    <div key={doc.id} className={cn('card border-l-4', {
                      'border-l-emerald-400': doc.status === 'aprovado',
                      'border-l-red-400': doc.status === 'reprovado',
                    })}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{doc.titulo}</p>
                          {doc.feedback_cliente && <p className="text-xs text-gray-500 mt-1 italic">"{doc.feedback_cliente}"</p>}
                        </div>
                        <span className={cn('badge text-xs flex items-center gap-1', {
                          'bg-emerald-100 text-emerald-700': doc.status === 'aprovado',
                          'bg-red-100 text-red-700': doc.status === 'reprovado',
                        })}>
                          {doc.status === 'aprovado' ? <><CheckCircle size={11} /> Aprovado</> : <><XCircle size={11} /> Ajuste solicitado</>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {docs.length === 0 && (
                <div className="card text-center py-16">
                  <FileText size={40} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-500">Nenhuma estratégia para aprovar</p>
                  <p className="text-xs text-gray-400 mt-1">A agência enviará documentos aqui quando precisar da sua aprovação</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
