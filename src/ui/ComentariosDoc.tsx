'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Send, Paperclip, X } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function ComentariosDoc({ docId, userId, userName, autorRole = 'admin' }: {
  docId: string; userId: string; userName: string; autorRole?: 'admin' | 'cliente'
}) {
  const supabase = createClient()
  const [comentarios, setComentarios] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    const { data } = await supabase.from('aprovacao_comentarios')
      .select('*').eq('doc_id', docId).order('created_at')
    setComentarios(data || [])
  }

  useEffect(() => { if (docId) carregar() }, [docId])

  async function enviar() {
    if (!texto.trim() && !arquivo) return
    setEnviando(true)
    await supabase.from('aprovacao_comentarios').insert({
      doc_id: docId, autor_id: userId, autor_nome: userName,
      autor_role: autorRole, conteudo: texto || null, arquivo_url: arquivo || null,
    })
    setTexto('')
    setArquivo('')
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
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico de comentários</p>

      {comentarios.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comentarios.map(c => (
            <div key={c.id} className={cn('flex gap-2', c.autor_role !== 'cliente' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                c.autor_role === 'cliente' ? 'bg-gray-400' : 'bg-vinho')}>
                {c.autor_nome?.charAt(0)}
              </div>
              <div className="max-w-[80%] space-y-0.5">
                <div className={cn('rounded-2xl px-3 py-2 text-sm',
                  c.autor_role !== 'cliente' ? 'bg-vinho text-white rounded-tr-sm' : 'bg-creme text-gray-800 rounded-tl-sm')}>
                  {c.conteudo && <p>{c.conteudo}</p>}
                  {c.arquivo_url && (
                    <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer"
                      className={cn('flex items-center gap-1 text-xs mt-1 hover:underline',
                        c.autor_role !== 'cliente' ? 'text-white/80' : 'text-vinho')}>
                      <Paperclip size={10} /> Arquivo anexo
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

      {arquivo && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <Paperclip size={13} className="text-emerald-600" />
          <span className="text-xs text-emerald-700 flex-1 truncate">Arquivo pronto para enviar</span>
          <button onClick={() => setArquivo('')} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
        </div>
      )}

      <div className="flex gap-2">
        <input className="input flex-1 text-sm" value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
          placeholder="Comentar ou responder..." />
        <label className="btn-ghost p-2.5 cursor-pointer">
          <Paperclip size={16} className={uploadando ? 'animate-pulse text-vinho' : 'text-gray-400'} />
          <input type="file" className="hidden" ref={fileRef}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadArquivo(f) }} />
        </label>
        <button onClick={enviar} disabled={enviando} className="btn-primary p-2.5">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
