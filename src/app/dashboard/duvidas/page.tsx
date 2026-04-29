'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { HelpCircle, CheckCircle, Clock, Send, ChevronDown, ChevronUp } from 'lucide-react'

export default function DuvidasPage() {
  const supabase = createClient()
  const [duvidas, setDuvidas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('pendentes')
  const [abertos, setAbertos] = useState<string[]>([])

  async function carregar() {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('duvidas_clientes').select('*, clientes(nome, cor)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo')
    ])
    setDuvidas(d || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function responder(id: string) {
    if (!respostas[id]?.trim()) return alert('Digite uma resposta!')
    setSalvando(id)
    await supabase.from('duvidas_clientes').update({
      resposta: respostas[id],
      respondida: true
    }).eq('id', id)
    setSalvando(null)
    setRespostas(r => ({ ...r, [id]: '' }))
    carregar()
  }

  async function adicionarFAQ(duvida: any) {
    if (!confirm(`Adicionar "${duvida.pergunta}" ao FAQ?`)) return
    await supabase.from('faq').insert({
      pergunta: duvida.pergunta,
      resposta: duvida.resposta || respostas[duvida.id] || '',
      categoria: 'Geral',
      ordem: 99,
      ativo: true
    })
    alert('Adicionada ao FAQ!')
  }

  const toggleAberto = (id: string) =>
    setAbertos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filtradas = duvidas.filter(d =>
    filtro === 'todas' ? true : filtro === 'pendentes' ? !d.respondida : d.respondida
  )

  const pendentes = duvidas.filter(d => !d.respondida).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dúvidas dos Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">{pendentes} dúvida(s) sem resposta</p>
      </div>

      <div className="flex gap-1 bg-creme rounded-xl p-1 w-fit">
        {[['pendentes','Pendentes'],['respondidas','Respondidas'],['todas','Todas']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filtro === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            {l}
            {v === 'pendentes' && pendentes > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-rosa rounded-full text-xs text-white inline-flex items-center justify-center">
                {pendentes}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-creme" />)}</div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center py-16">
          <HelpCircle size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma dúvida {filtro === 'pendentes' ? 'pendente' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(duvida => (
            <div key={duvida.id} className={cn('card', !duvida.respondida && 'border-l-4 border-l-orange-400')}>
              <button onClick={() => toggleAberto(duvida.id)} className="w-full flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: duvida.clientes?.cor + '20' }}>
                  {duvida.respondida
                    ? <CheckCircle size={16} className="text-emerald-600" />
                    : <Clock size={16} style={{ color: duvida.clientes?.cor }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: duvida.clientes?.cor }}>
                      {duvida.clientes?.nome}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(duvida.created_at, "dd/MM 'às' HH:mm")}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{duvida.pergunta}</p>
                  {duvida.respondida && duvida.resposta && (
                    <p className="text-xs text-emerald-600 mt-0.5 truncate">✓ {duvida.resposta}</p>
                  )}
                </div>
                {abertos.includes(duvida.id) ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />}
              </button>

              {abertos.includes(duvida.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-fade-in">
                  {duvida.respondida ? (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-emerald-600 mb-1">Resposta enviada:</p>
                      <p className="text-sm text-emerald-800">{duvida.resposta}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="label">Resposta *</label>
                        <textarea className="input resize-none" rows={3}
                          value={respostas[duvida.id] || ''}
                          onChange={e => setRespostas(r => ({ ...r, [duvida.id]: e.target.value }))}
                          placeholder="Digite a resposta para o cliente..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => adicionarFAQ(duvida)}
                          className="btn-secondary text-xs py-2 flex items-center gap-1.5">
                          <HelpCircle size={13} /> Adicionar ao FAQ
                        </button>
                        <button onClick={() => responder(duvida.id)} disabled={salvando === duvida.id}
                          className="btn-primary flex-1 justify-center flex items-center gap-2 text-sm">
                          <Send size={14} />
                          {salvando === duvida.id ? 'Enviando...' : 'Responder cliente'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
