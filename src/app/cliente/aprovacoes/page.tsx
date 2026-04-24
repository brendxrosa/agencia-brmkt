'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, MessageSquare, X } from 'lucide-react'

export default function ClienteAprovacoesPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [postSelecionado, setPostSelecionado] = useState<any>(null)
  const [feedback, setFeedback] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    const { data } = await supabase.from('posts').select('*')
      .eq('cliente_id', profile.cliente_id)
      .in('status_interno', ['aguardando_cliente', 'aprovado', 'reprovado'])
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function responder(postId: string, status: 'aprovado' | 'reprovado') {
    setSalvando(true)
    await supabase.from('posts').update({
      status_cliente: status,
      feedback_cliente: feedback || null,
      status_interno: status === 'aprovado' ? 'aprovado' : 'reprovado'
    }).eq('id', postId)
    setPostSelecionado(null)
    setFeedback('')
    setSalvando(false)
    carregar()
  }

  const pendentes = posts.filter(p => p.status_cliente === 'pendente')
  const respondidos = posts.filter(p => p.status_cliente !== 'pendente')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Aprovações</h1>
        <p className="text-gray-500 text-sm mt-1">{pendentes.length} aguardando sua aprovação</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-creme" />)}</div>
      ) : (
        <>
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div className="space-y-3">
              <h2 className="section-title text-sm flex items-center gap-2">
                <Clock size={16} className="text-orange-500" /> Aguardando aprovação
              </h2>
              {pendentes.map(post => (
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
                    </div>
                  </div>

                  {postSelecionado?.id === post.id ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="label">Feedback (opcional para aprovação, recomendado para reprovação)</label>
                        <textarea className="input resize-none" rows={3} value={feedback}
                          onChange={e => setFeedback(e.target.value)}
                          placeholder="Deixe um comentário sobre o post..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setPostSelecionado(null); setFeedback('') }} className="btn-ghost flex-1">
                          Cancelar
                        </button>
                        <button onClick={() => responder(post.id, 'reprovado')} disabled={salvando}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                          <XCircle size={16} /> Reprovar
                        </button>
                        <button onClick={() => responder(post.id, 'aprovado')} disabled={salvando}
                          className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                          <CheckCircle size={16} /> Aprovar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setPostSelecionado(post)}
                      className="mt-4 btn-primary w-full justify-center flex items-center gap-2">
                      <MessageSquare size={16} /> Analisar e responder
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Respondidos */}
          {respondidos.length > 0 && (
            <div className="space-y-3">
              <h2 className="section-title text-sm">Histórico</h2>
              {respondidos.map(post => (
                <div key={post.id} className={cn('card border-l-4', {
                  'border-l-emerald-400': post.status_cliente === 'aprovado',
                  'border-l-red-400': post.status_cliente === 'reprovado',
                })}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{post.titulo}</p>
                      <p className="text-xs text-gray-400 capitalize">{post.tipo}</p>
                      {post.feedback_cliente && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{post.feedback_cliente}"</p>
                      )}
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
        </>
      )}
    </div>
  )
}
