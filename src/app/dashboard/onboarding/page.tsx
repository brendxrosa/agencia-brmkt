'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Plus, X, CheckCircle, Clock, ChevronDown, ChevronUp, FileText, Users, Calendar, Key, Video, Send } from 'lucide-react'

const ETAPAS = [
  { numero: 1, titulo: 'Contrato', descricao: 'Envio e assinatura do contrato', icon: FileText },
  { numero: 2, titulo: 'Briefing', descricao: 'Preenchimento dos briefings', icon: FileText },
  { numero: 3, titulo: 'Acesso às redes', descricao: 'Login e acesso às redes sociais', icon: Key },
  { numero: 4, titulo: 'Reunião de kickoff', descricao: 'Primeira reunião de alinhamento', icon: Video },
  { numero: 5, titulo: 'Calendário editorial', descricao: 'Aprovação do primeiro calendário', icon: Calendar },
]

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {children}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const supabase = createClient()
  const [onboardings, setOnboardings] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [briefings, setBriefings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalBriefing, setModalBriefing] = useState(false)
  const [onboardingAtual, setOnboardingAtual] = useState<any>(null)
  const [abertos, setAbertos] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    cliente_id: '',
    briefings_atribuidos: [] as string[],
    observacoes: ''
  })

  async function carregar() {
    const [{ data: o }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('onboarding').select('*, clientes(nome, cor, status)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome'),
      supabase.from('briefings').select('id, nome').eq('ativo', true).order('nome')
    ])
    setOnboardings(o || [])
    setClientes(c || [])
    setBriefings(b || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarOnboarding() {
    if (!form.cliente_id) return alert('Selecione um cliente!')
    setSalvando(true)
    await supabase.from('onboarding').insert({
      cliente_id: form.cliente_id,
      briefings_atribuidos: form.briefings_atribuidos,
      briefings_concluidos: [],
      etapa_atual: 1,
      status: 'em_andamento',
      contrato_enviado: false,
      contrato_assinado: false,
      briefing_preenchido: false,
      acesso_redes: false,
      reuniao_realizada: false,
      calendario_aprovado: false,
    })
    setSalvando(false)
    setModalAberto(false)
    setForm({ cliente_id: '', briefings_atribuidos: [], observacoes: '' })
    carregar()
  }

  async function atualizarEtapa(onboardingId: string, campo: string, valor: boolean) {
    setSalvando(true)
    const onboarding = onboardings.find(o => o.id === onboardingId)
    if (!onboarding) return

    const updates: Record<string, any> = { [campo]: valor }

    // Avança etapa automaticamente
    const etapaMap: Record<string, number> = {
      contrato_assinado: 2,
      briefing_preenchido: 3,
      acesso_redes: 4,
      reuniao_realizada: 5,
      calendario_aprovado: 5,
    }

    if (valor && etapaMap[campo]) {
      updates.etapa_atual = etapaMap[campo]
    }

    // Verifica se concluiu tudo
    const tudo = {
      contrato_assinado: onboarding.contrato_assinado,
      briefing_preenchido: onboarding.briefing_preenchido,
      acesso_redes: onboarding.acesso_redes,
      reuniao_realizada: onboarding.reuniao_realizada,
      calendario_aprovado: onboarding.calendario_aprovado,
      [campo]: valor
    }

    if (Object.values(tudo).every(Boolean)) {
      updates.status = 'concluido'
      // Converte cliente pra ativo se ainda não for
      await supabase.from('clientes').update({ status: 'ativo' }).eq('id', onboarding.cliente_id)
    }

    await supabase.from('onboarding').update(updates).eq('id', onboardingId)
    setSalvando(false)
    carregar()
  }

  async function atribuirBriefings() {
    if (!onboardingAtual) return
    setSalvando(true)
    await supabase.from('onboarding').update({
      briefings_atribuidos: onboardingAtual.briefings_atribuidos || []
    }).eq('id', onboardingAtual.id)
    setSalvando(false)
    setModalBriefing(false)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este onboarding?')) return
    await supabase.from('onboarding').delete().eq('id', id)
    carregar()
  }

  const toggleAberto = (id: string) =>
    setAbertos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const progresso = (o: any) => {
    const campos = ['contrato_enviado', 'contrato_assinado', 'briefing_preenchido', 'acesso_redes', 'reuniao_realizada', 'calendario_aprovado']
    const concluidos = campos.filter(c => o[c]).length
    return Math.round((concluidos / campos.length) * 100)
  }

  const emAndamento = onboardings.filter(o => o.status !== 'concluido').length
  const concluidos = onboardings.filter(o => o.status === 'concluido').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Onboarding</h1>
          <p className="text-gray-500 text-sm mt-1">{emAndamento} em andamento · {concluidos} concluído(s)</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo onboarding
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card h-32 animate-pulse bg-creme" />)}</div>
      ) : onboardings.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum onboarding ativo</p>
          <button onClick={() => setModalAberto(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Iniciar onboarding
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {onboardings.map(o => {
            const pct = progresso(o)
            const aberto = abertos.includes(o.id)
            const concluido = o.status === 'concluido'

            return (
              <div key={o.id} className={cn('card', concluido && 'border-l-4 border-l-emerald-400')}>
                <button onClick={() => toggleAberto(o.id)} className="w-full flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: o.clientes?.cor || '#6B0F2A' }}>
                    {o.clientes?.nome?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{o.clientes?.nome}</p>
                      {concluido && <span className="badge bg-emerald-100 text-emerald-700 text-xs">✓ Concluído</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-vinho transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                    </div>
                  </div>
                  {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {aberto && (
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-4 animate-fade-in">
                    {/* Etapas */}
                    <div className="space-y-2">
                      {[
                        { campo: 'contrato_enviado', label: 'Contrato enviado', icon: FileText },
                        { campo: 'contrato_assinado', label: 'Contrato assinado', icon: FileText },
                        { campo: 'briefing_preenchido', label: 'Briefing preenchido', icon: FileText },
                        { campo: 'acesso_redes', label: 'Acesso às redes concedido', icon: Key },
                        { campo: 'reuniao_realizada', label: 'Reunião de kickoff realizada', icon: Video },
                        { campo: 'calendario_aprovado', label: 'Calendário editorial aprovado', icon: Calendar },
                      ].map(({ campo, label, icon: Icon }) => (
                        <div key={campo} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-creme transition-all">
                          <button onClick={() => atualizarEtapa(o.id, campo, !o[campo])} disabled={salvando}
                            className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              o[campo] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-vinho')}>
                            {o[campo] && <CheckCircle size={14} className="text-white" />}
                          </button>
                          <Icon size={14} className={o[campo] ? 'text-emerald-500' : 'text-gray-400'} />
                          <span className={cn('text-sm flex-1', o[campo] ? 'text-gray-400 line-through' : 'text-gray-700')}>
                            {label}
                          </span>
                          {!o[campo] && <Clock size={14} className="text-gray-300" />}
                        </div>
                      ))}
                    </div>

                    {/* Briefings atribuídos */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-500">Briefings atribuídos</p>
                        <button onClick={() => { setOnboardingAtual({ ...o }); setModalBriefing(true) }}
                          className="text-xs text-vinho hover:underline">Editar</button>
                      </div>
                      {(o.briefings_atribuidos || []).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nenhum briefing atribuído</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(o.briefings_atribuidos || []).map((bId: string) => {
                            const b = briefings.find(x => x.id === bId)
                            return b ? <span key={bId} className="badge bg-purple-100 text-purple-700 text-xs">{b.nome}</span> : null
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      {concluido && (
                        <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                          <p className="text-xs font-medium text-emerald-700">🎉 Onboarding concluído!</p>
                          <p className="text-xs text-emerald-600">Cliente com acesso completo à plataforma</p>
                        </div>
                      )}
                      <button onClick={() => excluir(o.id)}
                        className="btn-ghost text-red-500 text-xs py-2 px-3">Excluir</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal novo onboarding */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Iniciar onboarding</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Selecione o cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Briefings a preencher</label>
              <p className="text-xs text-gray-400 mb-2">Selecione quais briefings o cliente precisará preencher durante o onboarding</p>
              <div className="flex flex-wrap gap-2">
                {briefings.map(b => (
                  <button key={b.id} onClick={() => setForm(f => ({
                    ...f,
                    briefings_atribuidos: f.briefings_atribuidos.includes(b.id)
                      ? f.briefings_atribuidos.filter(x => x !== b.id)
                      : [...f.briefings_atribuidos, b.id]
                  }))}
                    className={cn('px-3 py-1.5 rounded-xl text-sm transition-all border',
                      form.briefings_atribuidos.includes(b.id) ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                    {b.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-creme rounded-xl p-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Etapas do onboarding:</p>
              {ETAPAS.map(e => (
                <div key={e.numero} className="flex items-center gap-2 py-1">
                  <span className="w-5 h-5 rounded-full bg-vinho/20 text-vinho text-xs font-bold flex items-center justify-center">{e.numero}</span>
                  <span className="text-xs text-gray-600">{e.titulo} — {e.descricao}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarOnboarding} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Criando...' : 'Iniciar onboarding'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal editar briefings */}
      <Modal open={modalBriefing} onClose={() => setModalBriefing(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Briefings do onboarding</h2>
            <button onClick={() => setModalBriefing(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {briefings.map(b => {
                const selecionado = (onboardingAtual?.briefings_atribuidos || []).includes(b.id)
                return (
                  <button key={b.id} onClick={() => setOnboardingAtual((prev: any) => ({
                    ...prev,
                    briefings_atribuidos: selecionado
                      ? prev.briefings_atribuidos.filter((x: string) => x !== b.id)
                      : [...(prev.briefings_atribuidos || []), b.id]
                  }))}
                    className={cn('px-3 py-1.5 rounded-xl text-sm transition-all border',
                      selecionado ? 'bg-vinho text-white border-vinho' : 'bg-white border-gray-200 text-gray-600 hover:bg-creme')}>
                    {b.nome}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalBriefing(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={atribuirBriefings} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
