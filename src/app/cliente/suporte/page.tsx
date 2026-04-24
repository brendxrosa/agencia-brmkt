'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { HelpCircle, Search, ChevronDown, ChevronUp, Send, CheckCircle } from 'lucide-react'

const TUTORIAIS = [
  { titulo: 'Como aprovar ou reprovar um post', descricao: 'Acesse "Aprovações" no menu, clique em "Analisar e responder", leia o conteúdo e clique em Aprovar ou Reprovar. Se reprovar, deixe um comentário explicando o que precisa ser ajustado.' },
  { titulo: 'Como agendar uma reunião', descricao: 'Acesse "Agenda" no menu, clique em "Solicitar reunião", escolha uma data e horário disponível. Nossa equipe confirmará em até 24h.' },
  { titulo: 'Como enviar uma mensagem para a equipe', descricao: 'Acesse "Mensagens" no menu e escreva sua mensagem. Respondemos em horário comercial de segunda a sexta, das 8h às 18h.' },
  { titulo: 'Como ver meu calendário de posts', descricao: 'Acesse "Calendário" no menu para ver todos os posts programados do mês. Clique em um dia para ver os detalhes dos posts daquele dia.' },
]

export default function ClienteSuportePage() {
  const supabase = createClient()
  const [faqs, setFaqs] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState<string[]>([])
  const [aba, setAba] = useState('faq')
  const [duvida, setDuvida] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [tutorialAberto, setTutorialAberto] = useState<number | null>(null)

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('cliente_id').eq('id', user.id).single()
    if (profile?.cliente_id) setClienteId(profile.cliente_id)

    const { data } = await supabase.from('faq').select('*').eq('ativo', true).order('ordem')
    setFaqs(data || [])
  }

  useEffect(() => { carregar() }, [])

  const toggleAberto = (id: string) =>
    setAbertos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const faqsFiltrados = faqs.filter(f =>
    f.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
    f.resposta.toLowerCase().includes(busca.toLowerCase())
  )

  const categorias = [...new Set(faqs.map(f => f.categoria))]

  async function enviarDuvida() {
    if (!duvida.trim() || !clienteId) return
    setEnviando(true)
    await supabase.from('duvidas_clientes').insert({
      cliente_id: clienteId, pergunta: duvida.trim(), respondida: false
    })
    setDuvida('')
    setEnviado(true)
    setEnviando(false)
    setTimeout(() => setEnviado(false), 3000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Suporte</h1>
        <p className="text-gray-500 text-sm mt-1">Tire suas dúvidas sobre a plataforma</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-creme rounded-xl p-1">
        {[['faq','Perguntas Frequentes'],['tutoriais','Tutoriais'],['duvida','Enviar Dúvida']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              aba === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {/* FAQ */}
      {aba === 'faq' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar pergunta..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>

          {faqsFiltrados.length === 0 ? (
            <div className="card text-center py-12">
              <HelpCircle size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-gray-500 text-sm">Nenhuma pergunta encontrada</p>
              <button onClick={() => setAba('duvida')} className="btn-primary mt-3 text-sm">
                Enviar minha dúvida
              </button>
            </div>
          ) : (
            <>
              {categorias.map(cat => {
                const itens = faqsFiltrados.filter(f => f.categoria === cat)
                if (itens.length === 0) return null
                return (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</h3>
                    <div className="space-y-2">
                      {itens.map(faq => (
                        <div key={faq.id} className="card">
                          <button onClick={() => toggleAberto(faq.id)}
                            className="w-full flex items-center justify-between gap-4 text-left">
                            <p className="text-sm font-medium text-gray-800">{faq.pergunta}</p>
                            {abertos.includes(faq.id) ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                          </button>
                          {abertos.includes(faq.id) && (
                            <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                              {faq.resposta}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Tutoriais */}
      {aba === 'tutoriais' && (
        <div className="space-y-3">
          {TUTORIAIS.map((t, i) => (
            <div key={i} className="card">
              <button onClick={() => setTutorialAberto(tutorialAberto === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 text-left">
                <p className="text-sm font-medium text-gray-800">{t.titulo}</p>
                {tutorialAberto === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {tutorialAberto === i && (
                <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                  {t.descricao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Enviar dúvida */}
      {aba === 'duvida' && (
        <div className="card space-y-4">
          <div>
            <h3 className="section-title text-base mb-1">Não encontrou sua dúvida?</h3>
            <p className="text-sm text-gray-500">Envie sua pergunta e nossa equipe vai responder em breve.</p>
          </div>
          <div>
            <label className="label">Sua dúvida</label>
            <textarea className="input resize-none" rows={4} value={duvida}
              onChange={e => setDuvida(e.target.value)}
              placeholder="Descreva sua dúvida com detalhes..." />
          </div>

          {enviado ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle size={20} className="text-emerald-600" />
              <p className="text-sm text-emerald-700">Dúvida enviada! Responderemos em breve.</p>
            </div>
          ) : (
            <button onClick={enviarDuvida} disabled={enviando || !duvida.trim()}
              className="btn-primary w-full justify-center flex items-center gap-2">
              <Send size={16} />
              {enviando ? 'Enviando...' : 'Enviar dúvida'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
