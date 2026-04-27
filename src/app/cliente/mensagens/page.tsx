'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Send, MessageCircle, ChevronDown } from 'lucide-react'

const ASSUNTOS = [
  'Aprovação de post',
  'Calendário editorial',
  'Reunião / Agenda',
  'Pagamento / Financeiro',
  'Estratégia de conteúdo',
  'Acesso às redes',
  'Dúvida geral',
  'Outro assunto',
]

export default function ClienteMensagensPage() {
  const supabase = createClient()
  const [mensagens, setMensagens] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [texto, setTexto] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mostrarAssuntos, setMostrarAssuntos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles').select('cliente_id, nome').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)
    setUserName(profile.nome)

    const { data } = await supabase.from('mensagens')
      .select('*').eq('cliente_id', profile.cliente_id).order('created_at')
    setMensagens(data || [])
    setLoading(false)

    // Marca mensagens da agência como lidas
    await supabase.from('mensagens').update({ lida: true })
      .eq('cliente_id', profile.cliente_id)
      .neq('autor_role', 'cliente')
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Polling a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(carregar, 10000)
    return () => clearInterval(interval)
  }, [clienteId])

  async function enviar() {
    if (!texto.trim() || !clienteId) return
    setEnviando(true)

    await supabase.from('mensagens').insert({
      cliente_id: clienteId,
      autor_id: userId,
      autor_nome: userName,
      autor_role: 'cliente',
      conteudo: texto.trim(),
      assunto: assunto || null,
      lida: false,
    })

    setTexto('')
    setAssunto('')
    setMostrarAssuntos(false)
    setEnviando(false)
    carregar()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Mensagens</h1>
        <p className="text-gray-500 text-sm mt-1">Chat com a equipe da agência · respondemos em horário comercial</p>
      </div>

      <div className="card flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageCircle size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma mensagem ainda</p>
            <p className="text-gray-400 text-xs mt-1">Mande uma mensagem pra gente! Escolha o assunto abaixo.</p>
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
                      <p className="text-xs font-semibold text-vinho mb-0.5">{msg.autor_nome} · Agência BR MKT</p>
                    )}
                    {msg.assunto && (
                      <p className={cn('text-xs font-medium mb-1 px-2 py-0.5 rounded-lg w-fit',
                        isCliente ? 'bg-white/20 text-white' : 'bg-vinho/10 text-vinho')}>
                        📌 {msg.assunto}
                      </p>
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

        {/* Input com assunto */}
        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          {/* Seletor de assunto */}
          <div className="mb-3">
            <button onClick={() => setMostrarAssuntos(!mostrarAssuntos)}
              className={cn('flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl transition-all border',
                assunto ? 'bg-vinho/10 border-vinho/20 text-vinho font-medium' : 'bg-creme border-transparent text-gray-500 hover:bg-gray-100')}>
              <span>{assunto || '📌 Escolher assunto (opcional)'}</span>
              <ChevronDown size={12} className={cn('transition-transform', mostrarAssuntos && 'rotate-180')} />
            </button>

            {mostrarAssuntos && (
              <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in">
                {ASSUNTOS.map(a => (
                  <button key={a} onClick={() => { setAssunto(a); setMostrarAssuntos(false) }}
                    className={cn('text-xs px-3 py-1.5 rounded-xl transition-all border',
                      assunto === a
                        ? 'bg-vinho text-white border-vinho'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                    {a}
                  </button>
                ))}
                {assunto && (
                  <button onClick={() => setAssunto('')}
                    className="text-xs px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-all">
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

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
        </div>
      </div>
    </div>
  )
}
