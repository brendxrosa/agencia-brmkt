'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { MessageCircle, X, Send, ChevronLeft, Plus, ArrowRight } from 'lucide-react'

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

interface Conversa {
  cliente_id: string
  cliente_nome: string
  cliente_cor: string
  ultima_msg: string
  ultima_msg_data: string
  nao_lidas: number
}

export default function ChatFlutuante() {
  const supabase = createClient()
  const [aberto, setAberto] = useState(false)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)
  const [equipe, setEquipe] = useState<any[]>([])
  const [redirecionando, setRedirecionando] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
    if (profile) setUserName(profile.nome)

    // Busca todos os clientes ativos
    const { data: clientes } = await supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')

    // Busca última mensagem e não lidas por cliente
    const conversasFormatadas: Conversa[] = []
    let total = 0

    for (const cliente of clientes || []) {
      const { data: msgs } = await supabase.from('mensagens')
        .select('*').eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false }).limit(1)

      const { count } = await supabase.from('mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', cliente.id)
        .eq('lida', false)
        .neq('autor_role', 'admin')

      const naoLidas = count || 0
      total += naoLidas

      conversasFormatadas.push({
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        cliente_cor: cliente.cor,
        ultima_msg: msgs?.[0]?.conteudo || 'Nenhuma mensagem ainda',
        ultima_msg_data: msgs?.[0]?.created_at || '',
        nao_lidas: naoLidas,
      })
    }

    // Ordena por não lidas primeiro, depois por data
    conversasFormatadas.sort((a, b) => {
      if (b.nao_lidas !== a.nao_lidas) return b.nao_lidas - a.nao_lidas
      return b.ultima_msg_data.localeCompare(a.ultima_msg_data)
    })

    setConversas(conversasFormatadas)
    setTotalNaoLidas(total)

    // Busca equipe pra redirecionamento
    const { data: eq } = await supabase.from('profiles').select('id, nome').eq('role', 'equipe')
    setEquipe(eq || [])
  }

  async function abrirConversa(clienteId: string) {
    setConversaAtiva(clienteId)
    const { data } = await supabase.from('mensagens')
      .select('*').eq('cliente_id', clienteId).order('created_at')
    setMensagens(data || [])

    // Marca como lidas
    await supabase.from('mensagens').update({ lida: true })
      .eq('cliente_id', clienteId).eq('lida', false)

    carregar()
  }

  async function enviar() {
    if (!texto.trim() || !conversaAtiva) return
    setEnviando(true)
    await supabase.from('mensagens').insert({
      cliente_id: conversaAtiva,
      autor_id: userId,
      autor_nome: userName,
      autor_role: 'admin',
      conteudo: texto.trim(),
      lida: false,
    })
    setTexto('')
    setEnviando(false)

    const { data } = await supabase.from('mensagens')
      .select('*').eq('cliente_id', conversaAtiva).order('created_at')
    setMensagens(data || [])
  }

  async function redirecionar(msgId: string, membroId: string, membroNome: string) {
    const msg = mensagens.find(m => m.id === msgId)
    if (!msg) return

    // Cria nova mensagem com redirecionamento
    await supabase.from('mensagens').insert({
      cliente_id: conversaAtiva,
      autor_id: userId,
      autor_nome: userName,
      autor_role: 'admin',
      conteudo: `↪️ Redirecionado para ${membroNome}: "${msg.conteudo}"`,
      lida: false,
    })

    setRedirecionando(null)
    const { data } = await supabase.from('mensagens')
      .select('*').eq('cliente_id', conversaAtiva).order('created_at')
    setMensagens(data || [])
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (aberto) carregar()
  }, [aberto])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Polling a cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (aberto && conversaAtiva) {
        supabase.from('mensagens').select('*').eq('cliente_id', conversaAtiva).order('created_at')
          .then(({ data }) => setMensagens(data || []))
      }
      if (aberto) carregar()
    }, 15000)
    return () => clearInterval(interval)
  }, [aberto, conversaAtiva])

  const conversaAtivaInfo = conversas.find(c => c.cliente_id === conversaAtiva)

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-vinho text-white rounded-full shadow-modal flex items-center justify-center hover:bg-vinho-light transition-all hover:scale-110 active:scale-95"
      >
        {aberto ? <X size={22} /> : <MessageCircle size={22} />}
        {!aberto && totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rosa rounded-full text-xs font-bold flex items-center justify-center">
            {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
          </span>
        )}
      </button>

      {/* Painel de chat */}
      {aberto && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-3xl shadow-modal border border-gray-100 overflow-hidden animate-slide-up flex flex-col"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="bg-vinho px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {conversaAtiva && (
                <button onClick={() => { setConversaAtiva(null); setMensagens([]) }}
                  className="text-white/70 hover:text-white transition-colors mr-1">
                  <ChevronLeft size={18} />
                </button>
              )}
              <MessageCircle size={18} className="text-white/80" />
              <span className="text-white font-semibold text-sm">
                {conversaAtiva ? conversaAtivaInfo?.cliente_nome : 'Mensagens'}
              </span>
            </div>
            <button onClick={() => setAberto(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Lista de conversas */}
          {!conversaAtiva && (
            <div className="flex-1 overflow-y-auto">
              {conversas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <MessageCircle size={32} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversas.map(conv => (
                  <button key={conv.cliente_id} onClick={() => abrirConversa(conv.cliente_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-creme transition-all border-b border-gray-50 text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: conv.cliente_cor }}>
                      {getInitials(conv.cliente_nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 truncate">{conv.cliente_nome}</p>
                        {conv.ultima_msg_data && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                            {formatDate(conv.ultima_msg_data, 'dd/MM')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{conv.ultima_msg}</p>
                    </div>
                    {conv.nao_lidas > 0 && (
                      <span className="w-5 h-5 bg-rosa rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0">
                        {conv.nao_lidas}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Chat ativo */}
          {conversaAtiva && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-xs text-gray-400">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  mensagens.map(msg => {
                    const isAdmin = msg.autor_role === 'admin' || msg.autor_role === 'equipe'
                    return (
                      <div key={msg.id} className={cn('flex group', isAdmin ? 'justify-end' : 'justify-start')}>
                        <div className="relative max-w-[85%]">
                          <div className={cn('rounded-2xl px-3 py-2', {
                            'bg-vinho text-white rounded-br-sm': isAdmin,
                            'bg-creme text-gray-800 rounded-bl-sm': !isAdmin
                          })}>
                            {!isAdmin && (
                              <p className="text-xs font-medium text-vinho mb-0.5">{msg.autor_nome}</p>
                            )}
                            {msg.assunto && (
                              <p className={cn('text-xs mb-1 font-medium', isAdmin ? 'text-white/70' : 'text-vinho/70')}>
                                📌 {msg.assunto}
                              </p>
                            )}
                            <p className="text-xs leading-relaxed">{msg.conteudo}</p>
                            <p className={cn('text-xs mt-1', isAdmin ? 'text-white/50' : 'text-gray-400')}>
                              {formatDate(msg.created_at, "HH:mm")}
                            </p>
                          </div>

                          {/* Botão redirecionar */}
                          {!isAdmin && equipe.length > 0 && (
                            <div className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => setRedirecionando(redirecionando === msg.id ? null : msg.id)}
                                className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-rosa hover:text-white transition-all"
                                title="Redirecionar">
                                <ArrowRight size={10} />
                              </button>
                            </div>
                          )}

                          {/* Menu de redirecionamento */}
                          {redirecionando === msg.id && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-100 rounded-xl shadow-card-hover z-10 py-1 min-w-40">
                              <p className="text-xs text-gray-400 px-3 py-1">Redirecionar para:</p>
                              {equipe.map(m => (
                                <button key={m.id} onClick={() => redirecionar(msg.id, m.id, m.nome)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-creme transition-colors">
                                  {m.nome}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-xs py-2"
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
                  />
                  <button onClick={enviar} disabled={enviando || !texto.trim()}
                    className="btn-primary px-3 py-2">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
