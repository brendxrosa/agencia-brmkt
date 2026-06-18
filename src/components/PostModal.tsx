'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, STATUS_POST_LABELS, STATUS_POST_CORES, ETIQUETA_LABELS, ETIQUETA_CORES } from '@/lib/utils'
import { X, Paperclip, Send, MessageCircle, Tag, AlertCircle, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ETIQUETAS_FEEDBACK = [
  { key: 'aprovado', label: '✓ Aprovado' },
  { key: 'ajuste_copy', label: 'Ajuste na copy' },
  { key: 'ajuste_arte', label: 'Ajuste na arte' },
  { key: 'ajuste_roteiro', label: 'Ajuste no roteiro' },
  { key: 'ajuste_data', label: 'Ajuste na data' },
  { key: 'reprovado', label: '✗ Reprovar' },
]

const isVideo = (url: string) => /\.(mp4|mov|webm|avi)$/i.test(url) || url.includes('youtube') || url.includes('vimeo') || url.includes('drive.google') 
const isImage = (url: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(url)

interface Props {
  post: any
  userId: string
  userName: string
  onClose: () => void
  onAtualizado: () => void
}

export default function PostModal({ post, userId, userName, onClose, onAtualizado }: Props) {
  const supabase = createClient()
  const [comentarios, setComentarios] = useState<any[]>([])
  const [comentarioTexto, setComentarioTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [etiquetaSelecionada, setEtiquetaSelecionada] = useState<string>(post.etiqueta_cliente || '')
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false)
  // Reprovar exige etiqueta + comentário
  const [etiquetaPendente, setEtiquetaPendente] = useState<string | null>(null)
  const [erroComentario, setErroComentario] = useState('')
  const comentarioRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('aprovacao_comentarios').select('*')
        .eq('doc_id', post.id).order('created_at')
      setComentarios(data || [])
    }
    carregar()
  }, [post.id])

  // Quando seleciona etiqueta de reprovação → exige comentário antes de confirmar
  function selecionarEtiqueta(etiqueta: string) {
    const precisaComentario = etiqueta !== 'aprovado'
    if (precisaComentario) {
      setEtiquetaPendente(etiqueta)
      setErroComentario('')
      setTimeout(() => comentarioRef.current?.focus(), 100)
    } else {
      aplicarEtiqueta(etiqueta, '')
    }
  }

  async function confirmarComComentario() {
    if (!etiquetaPendente) return
    const texto = comentarioTexto.trim()
    if (!texto) {
      setErroComentario('Explica o motivo antes de enviar — o cliente vai precisar saber o que ajustar.')
      comentarioRef.current?.focus()
      return
    }
    await aplicarEtiqueta(etiquetaPendente, texto)
    setEtiquetaPendente(null)
  }

  async function aplicarEtiqueta(etiqueta: string, comentarioAdicional: string) {
    setAtualizando(true)
    const isAprovado = etiqueta === 'aprovado'

    const novoStatusInterno = isAprovado
      ? (isAprovacaoArte ? 'aprovado' : 'aprovacao_arte')
      : (isAprovacaoArte ? 'edicao' : 'revisao_interna')
    const novoStatusCliente = isAprovado
      ? (isAprovacaoArte ? 'aprovado' : 'pendente')
      : 'reprovado'

    await supabase.from('posts').update({
      etiqueta_cliente: etiqueta,
      status_cliente: novoStatusCliente,
      status_interno: novoStatusInterno,
      data_aprovacao: new Date().toISOString(),
    }).eq('id', post.id)

    // Registra etiqueta como comentário automático
    await supabase.from('aprovacao_comentarios').insert({
      doc_id: post.id, autor_id: userId, autor_nome: userName, autor_role: 'cliente',
      conteudo: `🏷️ ${ETIQUETA_LABELS[etiqueta] || etiqueta}`,
    })

    // Se tiver comentário adicional, registra separado
    if (comentarioAdicional) {
      await supabase.from('aprovacao_comentarios').insert({
        doc_id: post.id, autor_id: userId, autor_nome: userName, autor_role: 'cliente',
        conteudo: comentarioAdicional,
      })
    }

    // Recarrega comentários
    const { data } = await supabase.from('aprovacao_comentarios').select('*').eq('doc_id', post.id).order('created_at')
    setComentarios(data || [])
    setComentarioTexto('')
    setEtiquetaSelecionada(etiqueta)
    setMostrarEtiquetas(false)
    setAtualizando(false)
    onAtualizado()
  }

  async function enviarComentario() {
    const texto = comentarioTexto.trim()
    if (!texto) return
    setEnviando(true)
    await supabase.from('aprovacao_comentarios').insert({
      doc_id: post.id, autor_id: userId, autor_nome: userName, autor_role: 'cliente',
      conteudo: texto,
    })
    setComentarioTexto('')
    const { data } = await supabase.from('aprovacao_comentarios').select('*').eq('doc_id', post.id).order('created_at')
    setComentarios(data || [])
    setEnviando(false)
  }

  const aguardando = ['aguardando_cliente', 'aprovacao_arte'].includes(post.status_interno)
  const isAprovacaoArte = post.status_interno === 'aprovacao_arte'
  const concluido = post.status_interno === 'concluido'
  const midia = post.link_midia

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-white rounded-3xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up',
        concluido && 'opacity-80'
      )}>
        <div className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold text-gray-800 leading-tight', concluido && 'text-gray-400')}>{post.titulo}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="badge bg-gray-100 text-gray-500 text-xs capitalize">{post.tipo}</span>
                <span className={cn('badge text-xs', STATUS_POST_CORES[post.status_interno])}>
                  {STATUS_POST_LABELS[post.status_interno]}
                </span>
                {post.data_publicacao && <span className="text-xs text-gray-400">📅 {formatDate(post.data_publicacao)}</span>}
                {etiquetaSelecionada && ETIQUETA_LABELS[etiquetaSelecionada] && (
                  <span className={cn('badge text-xs flex items-center gap-1', ETIQUETA_CORES[etiquetaSelecionada])}>
                    <Tag size={9} /> {ETIQUETA_LABELS[etiquetaSelecionada]}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 flex-shrink-0"><X size={18} /></button>
          </div>

          {/* Conteúdo */}
          {post.tema && <div><p className="label">Tema</p><p className="text-sm text-gray-700">{post.tema}</p></div>}
          {post.abordagem && <div><p className="label">Abordagem</p><p className="text-sm text-gray-600">{post.abordagem}</p></div>}
          {post.copy && (
            <div className="bg-creme rounded-xl p-3">
              <p className="label mb-1">Copy / Roteiro</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.copy}</p>
            </div>
          )}
          {post.legenda && (
            <div className="bg-creme rounded-xl p-3">
              <p className="label mb-1">Legenda</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.legenda}</p>
            </div>
          )}
          {post.direcionamento && <div><p className="label">Direcionamento</p><p className="text-sm text-gray-500 italic">{post.direcionamento}</p></div>}

          {/* Link externo */}
          {post.link_externo && (
            <div>
              <p className="label mb-1">Link</p>
              <a href={post.link_externo} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-creme transition-all text-sm text-vinho">
                <ExternalLink size={15} className="flex-shrink-0" />
                <span className="truncate">{post.link_externo}</span>
              </a>
            </div>
          )}

          {/* Galeria de arquivos */}
          {(post.midias_urls || []).length > 0 && (
            <div>
              <p className="label mb-1.5">Arte / Arquivos</p>
              <div className={(post.midias_urls || []).length === 1 ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2'}>
                {(post.midias_urls as string[]).map((url: string, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    {/\.(png|jpg|jpeg|gif|webp)$/i.test(url) ? (
                      <img src={url} alt={'Arte ' + (i+1)} className="w-full max-h-64 object-contain" />
                    ) : /\.(mp4|mov|webm)$/i.test(url) ? (
                      <video src={url} controls className="w-full max-h-64" />
                    ) : (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 text-sm text-vinho hover:underline">
                        <Paperclip size={14} /> Arquivo {i + 1}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback: link_midia legado */}
          {midia && !(post.midias_urls || []).length && !post.link_externo && (
            <div>
              <p className="label mb-1.5">Arte / Arquivo</p>
              {isImage(midia) ? (
                <img src={midia} alt="Arte do post" className="w-full max-h-64 object-contain rounded-xl border border-gray-100 bg-gray-50" />
              ) : isVideo(midia) ? (
                <a href={midia} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-creme transition-all">
                  <div className="w-10 h-10 bg-vinho/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ExternalLink size={18} className="text-vinho" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ver arquivo</p>
                    <p className="text-xs text-gray-400 truncate max-w-64">{midia}</p>
                  </div>
                </a>
              ) : (
                <a href={midia} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-vinho hover:underline">
                  <Paperclip size={14} /> Ver arquivo
                </a>
              )}
            </div>
          )}

          {/* Etiquetas — cliente */}
          {aguardando && (
            <div className="pt-2 border-t border-gray-100">
              {!mostrarEtiquetas && !etiquetaPendente ? (
                <button onClick={() => setMostrarEtiquetas(true)}
                  className="w-full flex items-center justify-center gap-2 bg-vinho text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-vinho/90 transition-all">
                  <Tag size={15} /> {isAprovacaoArte ? 'Avaliar arte' : 'Dar feedback'}
                </button>
              ) : etiquetaPendente ? (
                /* Fluxo de reprovação: etiqueta escolhida, aguarda comentário */
                <div className="space-y-3">
                  <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                    etiquetaPendente === 'reprovado' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700')}>
                    <Tag size={13} /> {ETIQUETA_LABELS[etiquetaPendente]}
                    <button onClick={() => { setEtiquetaPendente(null); setErroComentario('') }} className="ml-auto text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">
                      Comentário obrigatório — o que precisa ser ajustado?
                    </p>
                    <input
                      ref={comentarioRef}
                      className={cn('input w-full text-sm', erroComentario && 'border-red-300 ring-1 ring-red-200')}
                      value={comentarioTexto}
                      onChange={e => { setComentarioTexto(e.target.value); setErroComentario('') }}
                      onKeyDown={e => e.key === 'Enter' && confirmarComComentario()}
                      placeholder="Ex: Ajustar o tom da legenda, está muito formal..."
                    />
                    {erroComentario && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {erroComentario}
                      </p>
                    )}
                  </div>
                  <button onClick={confirmarComComentario} disabled={atualizando}
                    className="w-full flex items-center justify-center gap-2 bg-vinho text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-vinho/90 transition-all">
                    {atualizando ? 'Enviando...' : 'Confirmar feedback'}
                  </button>
                </div>
              ) : (
                /* Grid de etiquetas */
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Selecione o feedback:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ETIQUETAS_FEEDBACK.map(e => (
                      <button key={e.key} onClick={() => selecionarEtiqueta(e.key)} disabled={atualizando}
                        className={cn(
                          'px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border',
                          e.key === 'aprovado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                          e.key === 'reprovado' ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' :
                          'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                        )}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setMostrarEtiquetas(false)} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-1">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Comentários — visível para todos (cliente e admin) */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <MessageCircle size={12} /> Comentários {comentarios.length > 0 && <span className="badge bg-gray-100 text-gray-500">{comentarios.length}</span>}
            </p>
            {comentarios.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {comentarios.map(c => (
                  <div key={c.id} className={cn('flex gap-2', c.autor_role === 'cliente' ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                      c.autor_role === 'cliente' ? 'bg-vinho' : 'bg-gray-400')}>
                      {c.autor_nome?.charAt(0)}
                    </div>
                    <div className={cn('max-w-[80%]', c.autor_role === 'cliente' ? 'items-end' : 'items-start')}>
                      <div className={cn('rounded-2xl px-3 py-2 text-sm',
                        c.autor_role === 'cliente' ? 'bg-vinho text-white rounded-tr-sm' : 'bg-creme text-gray-800 rounded-tl-sm')}>
                        {c.conteudo}
                      </div>
                      <p className="text-xs text-gray-400 px-1 mt-0.5">
                        {c.autor_nome} · {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Campo de comentário — sempre visível, para admin e cliente */}
            {!etiquetaPendente && (
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" value={comentarioTexto}
                  onChange={e => setComentarioTexto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarComentario()}
                  placeholder="Comentar ou dar um retorno..." />
                <button onClick={enviarComentario} disabled={enviando || !comentarioTexto.trim()} className="btn-primary p-2.5">
                  <Send size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
