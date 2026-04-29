'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { FileText, CheckCircle, ChevronDown, ChevronUp, Send, Upload } from 'lucide-react'
import { CATEGORIAS } from '@/lib/briefings-data'

export default function ClienteBriefingsPage() {
  const supabase = createClient()
  const [briefings, setBriefings] = useState<any[]>([])
  const [respostas, setRespostas] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [loading, setLoading] = useState(true)
  const [briefingAberto, setBriefingAberto] = useState<string | null>(null)
  const [formRespostas, setFormRespostas] = useState<Record<string, any>>({})
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return
    setClienteId(profile.cliente_id)

    // Busca briefings ativos
    const { data: b } = await supabase.from('briefings').select('*').eq('ativo', true).order('created_at')

    // Busca respostas do cliente
    const { data: r } = await supabase.from('briefing_respostas')
      .select('*').eq('cliente_id', profile.cliente_id)

    setBriefings(b || [])
    setRespostas(r || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function getResposta(briefingId: string) {
    return respostas.find(r => r.briefing_id === briefingId)
  }

  function abrirBriefing(briefingId: string) {
    if (briefingAberto === briefingId) {
      setBriefingAberto(null)
      return
    }
    setBriefingAberto(briefingId)

    // Carrega respostas existentes
    const resposta = getResposta(briefingId)
    if (resposta?.respostas) {
      setFormRespostas(resposta.respostas)
    } else {
      setFormRespostas({})
    }
  }

  function setResposta(perguntaId: string, valor: any) {
    setFormRespostas(prev => ({ ...prev, [perguntaId]: valor }))
  }

  function toggleOpcaoMultipla(perguntaId: string, opcao: string) {
    const atual = formRespostas[perguntaId] || []
    const novas = atual.includes(opcao)
      ? atual.filter((o: string) => o !== opcao)
      : [...atual, opcao]
    setResposta(perguntaId, novas)
  }

  async function salvarResposta(briefingId: string, concluido = false) {
    setSalvando(true)
    const resposta = getResposta(briefingId)

    if (resposta) {
      await supabase.from('briefing_respostas').update({
        respostas: formRespostas,
        concluido,
        updated_at: new Date().toISOString()
      }).eq('id', resposta.id)
    } else {
      await supabase.from('briefing_respostas').insert({
        briefing_id: briefingId,
        cliente_id: clienteId,
        respostas: formRespostas,
        concluido,
        preenchido_por: 'cliente'
      })
    }

    setSalvando(false)
    if (concluido) {
      setSucesso('Briefing enviado com sucesso! 🎉')
      setBriefingAberto(null)
      setTimeout(() => setSucesso(''), 4000)
    }
    carregar()
  }

  async function handleUploadArquivo(perguntaId: string, file: File) {
    const path = `briefings/${clienteId}/${perguntaId}-${file.name}`
    const { error } = await supabase.storage.from('briefings').upload(path, file, { upsert: true })
    if (error) return alert('Erro ao fazer upload: ' + error.message)
    const { data } = supabase.storage.from('briefings').getPublicUrl(path)
    setResposta(perguntaId, data.publicUrl)
  }

  const concluidos = respostas.filter(r => r.concluido).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Meus Briefings</h1>
        <p className="text-gray-500 text-sm mt-1">
          {concluidos} de {briefings.length} briefing(s) concluído(s)
        </p>
      </div>

      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle size={16} /> {sucesso}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card h-20 animate-pulse bg-creme" />)}</div>
      ) : briefings.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum briefing disponível ainda</p>
          <p className="text-xs text-gray-400 mt-1">A agência irá disponibilizar seus briefings em breve</p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefings.map(briefing => {
            const resposta = getResposta(briefing.id)
            const concluido = resposta?.concluido
            const emAndamento = resposta && !concluido
            const aberto = briefingAberto === briefing.id
            const perguntas = briefing.perguntas || []

            // Agrupa por categoria
            const porCategoria: Record<string, any[]> = {}
            perguntas.forEach((p: any) => {
              if (!porCategoria[p.categoria]) porCategoria[p.categoria] = []
              porCategoria[p.categoria].push(p)
            })

            return (
              <div key={briefing.id} className={cn('card', concluido && 'border-l-4 border-l-emerald-400')}>
                <button onClick={() => abrirBriefing(briefing.id)}
                  className="w-full flex items-center gap-3 text-left">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    concluido ? 'bg-emerald-100' : emAndamento ? 'bg-orange-100' : 'bg-creme')}>
                    {concluido
                      ? <CheckCircle size={18} className="text-emerald-600" />
                      : <FileText size={18} className={emAndamento ? 'text-orange-500' : 'text-gray-400'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{briefing.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{perguntas.length} perguntas</span>
                      {concluido && <span className="badge bg-emerald-100 text-emerald-700 text-xs">Concluído ✓</span>}
                      {emAndamento && <span className="badge bg-orange-100 text-orange-700 text-xs">Em andamento</span>}
                      {!resposta && <span className="badge bg-gray-100 text-gray-500 text-xs">Não iniciado</span>}
                    </div>
                  </div>
                  {aberto ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {aberto && !concluido && (
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-6 animate-fade-in">
                    {Object.entries(porCategoria).map(([cat, pergs]) => (
                      <div key={cat}>
                        <h3 className="text-sm font-semibold text-vinho mb-3">{CATEGORIAS[cat] || cat}</h3>
                        <div className="space-y-4">
                          {pergs.map((p: any) => (
                            <div key={p.id}>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {p.pergunta}
                              </label>

                              {p.tipo === 'texto' && (
                                <input className="input" value={formRespostas[p.id] || ''}
                                  onChange={e => setResposta(p.id, e.target.value)}
                                  placeholder="Sua resposta..." />
                              )}

                              {p.tipo === 'textarea' && (
                                <textarea className="input resize-none" rows={3}
                                  value={formRespostas[p.id] || ''}
                                  onChange={e => setResposta(p.id, e.target.value)}
                                  placeholder="Sua resposta..." />
                              )}

                              {p.tipo === 'opcao' && (
                                <div className="flex flex-wrap gap-2">
                                  {p.opcoes?.map((op: string) => (
                                    <button key={op} onClick={() => setResposta(p.id, op)}
                                      className={cn('px-3 py-2 rounded-xl text-sm transition-all border',
                                        formRespostas[p.id] === op
                                          ? 'bg-vinho text-white border-vinho'
                                          : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                                      {op}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {p.tipo === 'opcoes_multiplas' && (
                                <div className="flex flex-wrap gap-2">
                                  {p.opcoes?.map((op: string) => {
                                    const selecionado = (formRespostas[p.id] || []).includes(op)
                                    return (
                                      <button key={op} onClick={() => toggleOpcaoMultipla(p.id, op)}
                                        className={cn('px-3 py-2 rounded-xl text-sm transition-all border flex items-center gap-1.5',
                                          selecionado
                                            ? 'bg-vinho text-white border-vinho'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                                        {selecionado && <CheckCircle size={12} />}
                                        {op}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}

                              {p.tipo === 'arquivo' && (
                                <div>
                                  {formRespostas[p.id] ? (
                                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                      <CheckCircle size={16} className="text-emerald-600" />
                                      <a href={formRespostas[p.id]} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-emerald-700 hover:underline truncate flex-1">
                                        Arquivo enviado — clique para ver
                                      </a>
                                      <button onClick={() => setResposta(p.id, null)}
                                        className="text-xs text-gray-400 hover:text-red-500">Remover</button>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-vinho hover:bg-rosa-pale/10 transition-all">
                                      <Upload size={20} className="text-gray-300" />
                                      <span className="text-sm text-gray-500">Clique para enviar arquivo</span>
                                      <span className="text-xs text-gray-400">PDF, JPG, PNG, AI, etc</span>
                                      <input type="file" className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0]
                                          if (file) handleUploadArquivo(p.id, file)
                                        }} />
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                      <button onClick={() => salvarResposta(briefing.id, false)} disabled={salvando}
                        className="btn-secondary flex-1">
                        {salvando ? 'Salvando...' : 'Salvar rascunho'}
                      </button>
                      <button onClick={() => salvarResposta(briefing.id, true)} disabled={salvando}
                        className="btn-primary flex-1 justify-center flex items-center gap-2">
                        <Send size={14} />
                        {salvando ? 'Enviando...' : 'Enviar briefing'}
                      </button>
                    </div>
                  </div>
                )}

                {aberto && concluido && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <CheckCircle size={24} className="mx-auto mb-2 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-700">Briefing concluído!</p>
                      <p className="text-xs text-emerald-600 mt-1">Suas respostas foram enviadas para a agência.</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
