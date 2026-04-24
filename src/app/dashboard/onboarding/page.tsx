'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle, Circle, ChevronDown, ChevronUp, UserCheck, AlertCircle } from 'lucide-react'

const ETAPAS = [
  { key: 'contrato_assinado', label: 'Contrato assinado', descricao: 'Contrato enviado, lido e assinado pelo cliente' },
  { key: 'briefing_preenchido', label: 'Briefing preenchido', descricao: 'Formulário de briefing completo com persona, tom de voz e objetivos' },
  { key: 'acesso_redes', label: 'Acesso às redes sociais', descricao: 'Login ou acesso de colaborador às redes do cliente' },
  { key: 'reuniao_kick_realizada', label: 'Reunião de kickoff', descricao: 'Reunião inicial realizada com alinhamento de expectativas' },
  { key: 'calendario_aprovado', label: 'Calendário aprovado', descricao: 'Primeiro calendário editorial aprovado pelo cliente' },
]

export default function OnboardingPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [onboardings, setOnboardings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [abertos, setAbertos] = useState<string[]>([])

  async function carregar() {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from('clientes').select('id, nome, cor, status').eq('status', 'ativo').order('nome'),
      supabase.from('onboarding').select('*')
    ])
    setClientes(c || [])
    setOnboardings(o || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function toggleEtapa(clienteId: string, etapa: string, valor: boolean) {
    const onb = onboardings.find(o => o.cliente_id === clienteId)
    if (onb) {
      await supabase.from('onboarding').update({ [etapa]: valor }).eq('cliente_id', clienteId)
    } else {
      await supabase.from('onboarding').insert({ cliente_id: clienteId, [etapa]: valor })
    }
    carregar()
  }

  async function salvarObs(clienteId: string, obs: string) {
    const onb = onboardings.find(o => o.cliente_id === clienteId)
    if (onb) {
      await supabase.from('onboarding').update({ observacoes: obs }).eq('cliente_id', clienteId)
    } else {
      await supabase.from('onboarding').insert({ cliente_id: clienteId, observacoes: obs })
    }
    carregar()
  }

  const toggleAberto = (id: string) =>
    setAbertos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const getOnb = (clienteId: string) => onboardings.find(o => o.cliente_id === clienteId) || {}

  const progresso = (clienteId: string) => {
    const onb = getOnb(clienteId)
    const concluidas = ETAPAS.filter(e => onb[e.key]).length
    return Math.round((concluidas / ETAPAS.length) * 100)
  }

  const totalConcluidos = clientes.filter(c => progresso(c.id) === 100).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Onboarding</h1>
        <p className="text-gray-500 text-sm mt-1">{totalConcluidos} de {clientes.length} clientes com onboarding completo</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-creme" />)}</div>
      ) : clientes.length === 0 ? (
        <div className="card text-center py-16">
          <UserCheck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum cliente ativo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientes.map(cliente => {
            const pct = progresso(cliente.id)
            const onb = getOnb(cliente.id)
            const aberto = abertos.includes(cliente.id)
            const completo = pct === 100

            return (
              <div key={cliente.id} className="card overflow-hidden">
                {/* Header */}
                <button onClick={() => toggleAberto(cliente.id)}
                  className="w-full flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: cliente.cor }}>
                    {cliente.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{cliente.nome}</p>
                      {completo && <span className="badge bg-emerald-100 text-emerald-700 text-xs">Completo ✓</span>}
                      {!completo && pct > 0 && <span className="badge bg-orange-100 text-orange-700 text-xs">Em andamento</span>}
                      {pct === 0 && <span className="badge bg-gray-100 text-gray-500 text-xs">Não iniciado</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-48">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: completo ? '#2E7D32' : cliente.cor }} />
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </div>
                  {aberto ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
                </button>

                {/* Etapas expandidas */}
                {aberto && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-fade-in">
                    {ETAPAS.map(etapa => {
                      const feito = !!onb[etapa.key]
                      return (
                        <div key={etapa.key}
                          onClick={() => toggleEtapa(cliente.id, etapa.key, !feito)}
                          className="flex items-start gap-3 cursor-pointer group">
                          <div className="mt-0.5 flex-shrink-0">
                            {feito
                              ? <CheckCircle size={20} className="text-emerald-500" />
                              : <Circle size={20} className="text-gray-300 group-hover:text-gray-400 transition-colors" />}
                          </div>
                          <div>
                            <p className={cn('text-sm font-medium', feito ? 'text-gray-400 line-through' : 'text-gray-800')}>
                              {etapa.label}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{etapa.descricao}</p>
                          </div>
                        </div>
                      )
                    })}

                    {/* Observações */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="label">Observações</label>
                      <textarea
                        className="input resize-none text-sm"
                        rows={2}
                        defaultValue={onb.observacoes || ''}
                        placeholder="Notas sobre o onboarding deste cliente..."
                        onBlur={e => salvarObs(cliente.id, e.target.value)}
                      />
                    </div>

                    {!completo && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2">
                        <AlertCircle size={14} />
                        {ETAPAS.filter(e => !onb[e.key]).length} etapa(s) pendente(s)
                      </div>
                    )}
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
