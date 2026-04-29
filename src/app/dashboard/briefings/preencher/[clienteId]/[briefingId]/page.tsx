'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ChevronLeft, CheckCircle, Save, Send, Upload } from 'lucide-react'
import { CATEGORIAS } from '@/lib/briefings-data'

export default function PreencherBriefingPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const clienteId = params.clienteId as string
  const briefingId = params.briefingId as string

  const [briefing, setBriefing] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [respostaExistente, setRespostaExistente] = useState<any>(null)
  const [formRespostas, setFormRespostas] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: b }, { data: c }, { data: r }] = await Promise.all([
      supabase.from('briefings').select('*').eq('id', briefingId).single(),
      supabase.from('clientes').select('*').eq('id', clienteId).single(),
      supabase.from('briefing_respostas').select('*')
        .eq('briefing_id', briefingId).eq('cliente_id', clienteId).single()
    ])
    setBriefing(b)
    setCliente(c)
    if (r) {
      setRespostaExistente(r)
      setFormRespostas(r.respostas || {})
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function setResposta(id: string, valor: any) {
    setFormRespostas(prev => ({ ...prev, [id]: valor }))
  }

  function toggleMultipla(id: string, opcao: string) {
    const atual = formRespostas[id] || []
    setResposta(id, atual.includes(opcao) ? atual.filter((o: string) => o !== opcao) : [...atual, opcao])
  }

  async function handleUpload(id: string, file: File) {
    const path = `briefings/${clienteId}/${id}-${file.name}`
    const { error } = await supabase.storage.from('briefings').upload(path, file, { upsert: true })
    if (error) return alert('Erro no upload: ' + error.message)
    const { data } = supabase.storage.from('briefings').getPublicUrl(path)
    setResposta(id, data.publicUrl)
  }

  async function salvar(concluido = false) {
    setSalvando(true)
    if (respostaExistente) {
      await supabase.from('briefing_respostas').update({
        respostas: formRespostas, concluido,
        preenchido_por: 'admin',
        updated_at: new Date().toISOString()
      }).eq('id', respostaExistente.id)
    } else {
      await supabase.from('briefing_respostas').insert({
        briefing_id: briefingId, cliente_id: clienteId,
        respostas: formRespostas, concluido,
        preenchido_por: 'admin'
      })
    }
    setSalvando(false)
    if (concluido) router.push('/dashboard/briefings/respostas')
    else carregar()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
    </div>
  )

  if (!briefing || !cliente) return (
    <div className="card text-center py-16">
      <p className="text-gray-500">Briefing ou cliente não encontrado</p>
    </div>
  )

  const perguntas = briefing.perguntas || []
  const porCategoria: Record<string, any[]> = {}
  perguntas.forEach((p: any) => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = []
    porCategoria[p.categoria].push(p)
  })

  const totalRespondidas = Object.keys(formRespostas).filter(k => formRespostas[k]).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-vinho mb-4 transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: cliente.cor }}>
            {cliente.nome?.charAt(0)}
          </div>
          <div>
            <h1 className="page-title">{briefing.nome}</h1>
            <p className="text-gray-500 text-sm">Preenchendo para: {cliente.nome}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-vinho transition-all duration-500"
              style={{ width: `${Math.round((totalRespondidas / perguntas.length) * 100)}%` }} />
          </div>
          <span className="text-xs text-gray-500">{totalRespondidas}/{perguntas.length}</span>
        </div>
      </div>

      {/* Formulário por seções */}
      {Object.entries(porCategoria).map(([cat, pergs]) => (
        <div key={cat} className="card space-y-4">
          <h2 className="font-display text-base font-semibold text-vinho border-b border-gray-100 pb-3">
            {CATEGORIAS[cat] || cat}
          </h2>

          {pergs.map((p: any) => (
            <div key={p.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{p.pergunta}</label>

              {p.tipo === 'texto' && (
                <input className="input" value={formRespostas[p.id] || ''}
                  onChange={e => setResposta(p.id, e.target.value)} placeholder="Resposta..." />
              )}
              {p.tipo === 'textarea' && (
                <textarea className="input resize-none" rows={3}
                  value={formRespostas[p.id] || ''}
                  onChange={e => setResposta(p.id, e.target.value)} placeholder="Resposta..." />
              )}
              {p.tipo === 'opcao' && (
                <div className="flex flex-wrap gap-2">
                  {p.opcoes?.map((op: string) => (
                    <button key={op} onClick={() => setResposta(p.id, op)}
                      className={cn('px-3 py-2 rounded-xl text-sm transition-all border',
                        formRespostas[p.id] === op ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                      {op}
                    </button>
                  ))}
                </div>
              )}
              {p.tipo === 'opcoes_multiplas' && (
                <div className="flex flex-wrap gap-2">
                  {p.opcoes?.map((op: string) => {
                    const sel = (formRespostas[p.id] || []).includes(op)
                    return (
                      <button key={op} onClick={() => toggleMultipla(p.id, op)}
                        className={cn('px-3 py-2 rounded-xl text-sm transition-all border flex items-center gap-1.5',
                          sel ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                        {sel && <CheckCircle size={12} />}{op}
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
                        className="text-sm text-emerald-700 hover:underline flex-1 truncate">
                        Arquivo enviado — clique para ver
                      </a>
                      <button onClick={() => setResposta(p.id, null)}
                        className="text-xs text-gray-400 hover:text-red-500">Remover</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-vinho hover:bg-rosa-pale/10 transition-all">
                      <Upload size={18} className="text-gray-300" />
                      <span className="text-sm text-gray-500">Clique para enviar arquivo</span>
                      <input type="file" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(p.id, f) }} />
                    </label>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Botões */}
      <div className="flex gap-3 pb-8">
        <button onClick={() => salvar(false)} disabled={salvando} className="btn-secondary flex-1">
          <Save size={14} className="mr-1.5 inline" />
          {salvando ? 'Salvando...' : 'Salvar rascunho'}
        </button>
        <button onClick={() => salvar(true)} disabled={salvando} className="btn-primary flex-1 justify-center">
          <Send size={14} className="mr-1.5 inline" />
          {salvando ? 'Finalizando...' : 'Finalizar briefing'}
        </button>
      </div>
    </div>
  )
}
