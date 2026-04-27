'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Post } from '@/types'
import { STATUS_POST_LABELS, STATUS_POST_CORES, cn, formatDate } from '@/lib/utils'
import { Plus, X, Calendar, Instagram, Video, Image, Layout, Link, Paperclip } from 'lucide-react'

const COLUNAS = [
  'briefing', 'copy', 'design', 'edicao',
  'revisao_interna', 'aguardando_cliente', 'aprovado', 'publicado'
] as const

const TIPO_ICONS: Record<string, React.ReactNode> = {
  reels: <Video size={12} />,
  carrossel: <Layout size={12} />,
  feed: <Image size={12} />,
  stories: <Instagram size={12} />,
}

const TIPO_MIDIA = [
  { key: 'link', label: 'Link externo' },
  { key: 'drive', label: 'Google Drive' },
  { key: 'canva', label: 'Canva' },
  { key: 'wetransfer', label: 'WeTransfer' },
  { key: 'outro', label: 'Outro' },
]

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {children}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [clientes, setClientes] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [postDetalhes, setPostDetalhes] = useState<any>(null)
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [form, setForm] = useState({
    cliente_id: '', titulo: '', tipo: 'reels' as Post['tipo'],
    data_publicacao: '', tema: '', copy: '', legenda: '',
    direcionamento: '', link_midia: '', tipo_midia: 'link'
  })

  async function carregar() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('posts').select('*, clientes(nome, cor)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setPosts(p || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarPost() {
    if (!form.cliente_id || !form.titulo) return alert('Cliente e título são obrigatórios!')
    await supabase.from('posts').insert({
      ...form,
      status_interno: 'briefing',
      status_cliente: 'pendente'
    })
    setModalAberto(false)
    setForm({ cliente_id: '', titulo: '', tipo: 'reels', data_publicacao: '', tema: '', copy: '', legenda: '', direcionamento: '', link_midia: '', tipo_midia: 'link' })
    carregar()
  }

  async function moverPost(postId: string, novoStatus: string) {
    await supabase.from('posts').update({ status_interno: novoStatus }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status_interno: novoStatus as Post['status_interno'] } : p))
  }

  async function excluirPost(id: string) {
    if (!confirm('Excluir este post?')) return
    await supabase.from('posts').delete().eq('id', id)
    if (postDetalhes?.id === id) setPostDetalhes(null)
    carregar()
  }

  const postsFiltrados = filtroCliente === 'todos' ? posts : posts.filter(p => p.cliente_id === filtroCliente)
  const postsPorColuna = (status: string) => postsFiltrados.filter(p => p.status_interno === status)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Kanban Editorial</h1>
          <p className="text-gray-500 text-sm mt-1">{posts.length} posts no pipeline</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo post
        </button>
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

      {/* Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map(c => <div key={c} className="w-64 flex-shrink-0 h-96 bg-creme rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {COLUNAS.map(coluna => (
            <div key={coluna}
              className="w-64 flex-shrink-0 bg-creme/50 rounded-2xl"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const postId = e.dataTransfer.getData('postId')
                if (postId) moverPost(postId, coluna)
                setArrastando(null)
              }}>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('badge text-xs', STATUS_POST_CORES[coluna])}>{STATUS_POST_LABELS[coluna]}</span>
                  <span className="text-xs text-gray-400 font-medium">{postsPorColuna(coluna).length}</span>
                </div>
              </div>

              <div className="px-3 pb-3 space-y-2 min-h-24">
                {postsPorColuna(coluna).map(post => (
                  <div key={post.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('postId', post.id); setArrastando(post.id) }}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => setPostDetalhes(post)}
                    className={cn('bg-white rounded-xl p-3 shadow-card cursor-grab active:cursor-grabbing group transition-all hover:shadow-card-hover',
                      arrastando === post.id && 'opacity-40')}>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: post.clientes?.cor || '#6B0F2A' }} />
                        <span className="text-xs text-gray-400 truncate max-w-28">{post.clientes?.nome}</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); excluirPost(post.id) }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                        <X size={12} />
                      </button>
                    </div>

                    <p className="text-sm font-medium text-gray-800 leading-tight mb-2">{post.titulo}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-400">
                        {TIPO_ICONS[post.tipo]}
                        <span className="text-xs capitalize">{post.tipo}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {post.link_midia && (
                          <a href={post.link_midia} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-vinho hover:text-rosa transition-colors" title="Ver mídia">
                            <Paperclip size={12} />
                          </a>
                        )}
                        {post.data_publicacao && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Calendar size={11} />
                            <span className="text-xs">{formatDate(post.data_publicacao, 'dd/MM')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mover para */}
                    <div className="mt-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-xs text-gray-400 mb-1">Mover para:</p>
                      <div className="flex flex-wrap gap-1">
                        {COLUNAS.filter(c => c !== coluna).slice(0, 3).map(c => (
                          <button key={c} onClick={e => { e.stopPropagation(); moverPost(post.id, c) }}
                            className="text-xs px-2 py-0.5 rounded-lg bg-creme hover:bg-rosa-pale text-gray-600 transition-colors">
                            {STATUS_POST_LABELS[c]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {postsPorColuna(coluna).length === 0 && (
                  <div className="text-center py-6 text-gray-300 text-xs">Nenhum post aqui</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhes do post */}
      <Modal open={!!postDetalhes} onClose={() => setPostDetalhes(null)}>
        {postDetalhes && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: postDetalhes.clientes?.cor }} />
                <span className="text-sm text-gray-500">{postDetalhes.clientes?.nome}</span>
              </div>
              <button onClick={() => setPostDetalhes(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>

            <h2 className="font-display text-xl font-semibold text-gray-800 mb-1">{postDetalhes.titulo}</h2>
            <div className="flex items-center gap-3 mb-4">
              <span className={cn('badge text-xs', STATUS_POST_CORES[postDetalhes.status_interno])}>
                {STATUS_POST_LABELS[postDetalhes.status_interno]}
              </span>
              <span className="badge bg-creme text-gray-600 text-xs capitalize">{postDetalhes.tipo}</span>
              {postDetalhes.data_publicacao && (
                <span className="text-xs text-gray-400">📅 {formatDate(postDetalhes.data_publicacao)}</span>
              )}
            </div>

            <div className="space-y-3">
              {postDetalhes.tema && (
                <div>
                  <p className="label">Tema</p>
                  <p className="text-sm text-gray-700">{postDetalhes.tema}</p>
                </div>
              )}
              {postDetalhes.direcionamento && (
                <div>
                  <p className="label">Direcionamento</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{postDetalhes.direcionamento}</p>
                </div>
              )}
              {postDetalhes.copy && (
                <div className="bg-creme rounded-xl p-3">
                  <p className="label">Copy / Roteiro</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{postDetalhes.copy}</p>
                </div>
              )}
              {postDetalhes.legenda && (
                <div className="bg-creme rounded-xl p-3">
                  <p className="label">Legenda</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{postDetalhes.legenda}</p>
                </div>
              )}
              {postDetalhes.link_midia && (
                <div>
                  <p className="label">Mídia / Arquivo</p>
                  <a href={postDetalhes.link_midia} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-vinho hover:text-rosa transition-colors">
                    <Paperclip size={14} />
                    <span className="truncate">{postDetalhes.tipo_midia ? `${postDetalhes.tipo_midia}: ` : ''}{postDetalhes.link_midia}</span>
                  </a>
                </div>
              )}
              {postDetalhes.feedback_cliente && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="label text-orange-600">Feedback do cliente</p>
                  <p className="text-sm text-orange-700">{postDetalhes.feedback_cliente}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => excluirPost(postDetalhes.id)} className="btn-danger flex-1 justify-center">Excluir</button>
              <button onClick={() => setPostDetalhes(null)} className="btn-secondary flex-1">Fechar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal novo post */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo post</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Selecione o cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Título do post *</label>
              <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Dicas de fisioterapia pós-lesão" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Post['tipo'] }))}>
                  <option value="reels">Reels</option>
                  <option value="carrossel">Carrossel</option>
                  <option value="feed">Feed</option>
                  <option value="stories">Stories</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div>
                <label className="label">Data de publicação</label>
                <input className="input" type="date" value={form.data_publicacao} onChange={e => setForm(f => ({ ...f, data_publicacao: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Tema</label>
              <input className="input" value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} placeholder="Ex: Educação, Bastidores, Depoimento..." />
            </div>

            <div>
              <label className="label">Direcionamento</label>
              <textarea className="input resize-none" rows={2} value={form.direcionamento} onChange={e => setForm(f => ({ ...f, direcionamento: e.target.value }))} placeholder="Instruções para a equipe..." />
            </div>

            <div>
              <label className="label">Copy / Roteiro</label>
              <textarea className="input resize-none" rows={3} value={form.copy} onChange={e => setForm(f => ({ ...f, copy: e.target.value }))} placeholder="Texto do post ou roteiro do vídeo..." />
            </div>

            <div>
              <label className="label">Legenda</label>
              <textarea className="input resize-none" rows={2} value={form.legenda} onChange={e => setForm(f => ({ ...f, legenda: e.target.value }))} placeholder="Legenda para o Instagram..." />
            </div>

            {/* Campo de mídia */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Paperclip size={13} /> Mídia / Arquivo (link)
              </label>
              <div className="flex gap-2">
                <select className="input w-40 flex-shrink-0" value={form.tipo_midia} onChange={e => setForm(f => ({ ...f, tipo_midia: e.target.value }))}>
                  {TIPO_MIDIA.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <input className="input flex-1" value={form.link_midia}
                  onChange={e => setForm(f => ({ ...f, link_midia: e.target.value }))}
                  placeholder="https://..." />
              </div>
              <p className="text-xs text-gray-400 mt-1">Cole o link do Drive, Canva, WeTransfer ou qualquer outro</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarPost} className="btn-primary flex-1 justify-center">Criar post</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
