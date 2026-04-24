'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Send, MessageCircle } from 'lucide-react'

export default function ClienteMensagensPage() {
  const supabase = createClient()
  const [mensagens, setMensagens] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('cliente_id, nome').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)
    setUserName(profile.nome)

    const { data } = await supabase.from('mensagens')
      .select('*').eq('cliente_id', profile.cliente_id).order('created_at')
    setMensagens(data || [])
    setLoading(false)

    // Marca como lidas
    await supabase.from('mensagens').update({ lida: true })
      .eq('cliente_id', profile.cliente_id).eq('autor_role', 'admin')
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar() {
    if (!texto.trim() || !clienteId) return
    setEnviando(true)
    await supabase.from('mensagens').insert({
      cliente_id: clienteId, autor_id: userId,
      autor_nome: userName, autor_role: 'cliente',
      conteudo: texto.trim(), lida: false
    })
    setTexto('')
    setEnviando(false)
    carregar()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Mensagens</h1>
        <p className="text-gray-500 text-sm mt-1">Chat com a equipe da agência</p>
      </div>

      <div className="card flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <MessageCircle size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma mensagem ainda</p>
            <p className="text-gray-400 text-xs mt-1">Mande uma mensagem para a equipe!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.map(msg => {
              const isCliente = msg.autor_role === 'cliente'
              return (
                <div key={msg.id} className={cn('flex', isCliente ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5', {
                    'bg-vinho text-white rounded-br-sm': isCliente,
                    'bg-creme text-gray-800 rounded-bl-sm': !isCliente
                  })}>
                    {!isCliente && (
                      <p className="text-xs font-medium text-vinho mb-0.5">{msg.autor_nome}</p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.conteudo}</p>
                    <p className={cn('text-xs mt-1', isCliente ? 'text-white/60' : 'text-gray-400')}>
                      {formatDate(msg.created_at, "dd/MM 'às' HH:mm")}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex gap-3">
            <input
              className="input flex-1"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            />
            <button onClick={enviar} disabled={enviando || !texto.trim()}
              className="btn-primary px-4 flex items-center gap-2">
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Respondemos em horário comercial (8h-18h, seg-sex)</p>
        </div>
      </div>
    </div>
  )
}
