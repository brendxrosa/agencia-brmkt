'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { FileText, Download, ExternalLink, BookOpen, CreditCard, FileCheck, ChevronDown, ChevronUp } from 'lucide-react'

const TIPO_CONFIG: Record<string, { label: string; icon: any; cor: string }> = {
  briefing: { label: 'Briefing', icon: BookOpen, cor: 'bg-blue-100 text-blue-700' },
  estrategia: { label: 'Estratégia', icon: FileText, cor: 'bg-purple-100 text-purple-700' },
  referencia: { label: 'Referência', icon: FileText, cor: 'bg-orange-100 text-orange-700' },
  nota: { label: 'Nota', icon: FileText, cor: 'bg-gray-100 text-gray-700' },
  outro: { label: 'Outro', icon: FileText, cor: 'bg-pink-100 text-pink-700' },
}

export default function ClienteDocsPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<any[]>([])
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [clienteInfo, setClienteInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [docAberto, setDocAberto] = useState<string | null>(null)
  const [aba, setAba] = useState('documentos')

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('cliente_id').eq('id', user.id).single()
    if (!profile?.cliente_id) return

    const [{ data: d }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('docs').select('*')
        .eq('cliente_id', profile.cliente_id)
        .order('updated_at', { ascending: false }),
      supabase.from('pagamentos').select('*')
        .eq('cliente_id', profile.cliente_id)
        .order('vencimento', { ascending: false }),
      supabase.from('clientes').select('*').eq('id', profile.cliente_id).single()
    ])

    setDocs(d || [])
    setPagamentos(p || [])
    setClienteInfo(c)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const tipoConfig = (tipo: string) => TIPO_CONFIG[tipo] || TIPO_CONFIG.outro

  const pagosMes = pagamentos.filter(p => p.status === 'pago')
  const pendentes = pagamentos.filter(p => p.status === 'pendente' || p.status === 'atrasado')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Meus Documentos</h1>
        <p className="text-gray-500 text-sm mt-1">Contratos, estratégias e comprovantes</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-creme rounded-xl p-1">
        {[
          ['documentos', 'Documentos', FileText],
          ['financeiro', 'Financeiro', CreditCard],
        ].map(([v, l, Icon]: any) => (
          <button key={v} onClick={() => setAba(v)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              aba === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={14} />
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}</div>
      ) : (
        <>
          {/* ABA DOCUMENTOS */}
          {aba === 'documentos' && (
            <div className="space-y-4">
              {/* Info do contrato */}
              {clienteInfo && (
                <div className="card border-l-4 border-l-vinho">
                  <div className="flex items-center gap-3 mb-3">
                    <FileCheck size={20} className="text-vinho" />
                    <h3 className="section-title text-base">Informações do contrato</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Plano contratado</p>
                      <p className="font-medium text-gray-800">{clienteInfo.plano}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Valor mensal</p>
                      <p className="font-medium text-gray-800">
                        R$ {clienteInfo.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Vencimento mensal</p>
                      <p className="font-medium text-gray-800">Todo dia {clienteInfo.dia_vencimento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <span className={cn('badge text-xs', {
                        'bg-emerald-100 text-emerald-700': clienteInfo.status === 'ativo',
                        'bg-yellow-100 text-yellow-700': clienteInfo.status === 'pausado',
                        'bg-red-100 text-red-700': clienteInfo.status === 'encerrado',
                      })}>
                        {clienteInfo.status}
                      </span>
                    </div>
                  </div>
                  {clienteInfo.objetivo && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">Objetivo</p>
                      <p className="text-sm text-gray-700 mt-0.5">{clienteInfo.objetivo}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Docs */}
              {docs.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-500 text-sm">Nenhum documento disponível ainda</p>
                  <p className="text-gray-400 text-xs mt-1">A agência irá adicionar seus documentos aqui</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="section-title text-sm">Documentos compartilhados</h3>
                  {docs.map(doc => {
                    const config = tipoConfig(doc.tipo)
                    const Icon = config.icon
                    const aberto = docAberto === doc.id
                    return (
                      <div key={doc.id} className="card">
                        <button onClick={() => setDocAberto(aberto ? null : doc.id)}
                          className="w-full flex items-center gap-3 text-left">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.cor.replace('text-', 'text-').split(' ')[0])}>
                            <Icon size={16} className={config.cor.split(' ')[1]} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{doc.titulo}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('badge text-xs', config.cor)}>{config.label}</span>
                              <span className="text-xs text-gray-400">
                                Atualizado {formatDate(doc.updated_at, "dd/MM/yyyy")}
                              </span>
                            </div>
                          </div>
                          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>

                        {aberto && doc.conteudo && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="bg-creme rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                              {doc.conteudo}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Drive */}
              <div className="card border border-dashed border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <ExternalLink size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Google Drive</p>
                    <p className="text-xs text-gray-400">Arquivos compartilhados pela agência</p>
                  </div>
                  {clienteInfo?.drive_url ? (
                    <a href={clienteInfo.drive_url} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                      <ExternalLink size={12} /> Acessar
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Link não configurado</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA FINANCEIRO */}
          {aba === 'financeiro' && (
            <div className="space-y-4">
              {pendentes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="section-title text-sm text-orange-600">⚠️ Pendente de pagamento</h3>
                  {pendentes.map(pag => (
                    <div key={pag.id} className="card border-l-4 border-l-orange-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{pag.mes_referencia || 'Pagamento'}</p>
                          <p className="text-xs text-gray-400">Vence {formatDate(pag.vencimento)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-display font-bold text-vinho">
                            R$ {pag.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={cn('badge text-xs', {
                            'bg-orange-100 text-orange-700': pag.status === 'pendente',
                            'bg-red-100 text-red-700': pag.status === 'atrasado',
                          })}>
                            {pag.status === 'atrasado' ? '🔴 Atrasado' : '🟡 Pendente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pagosMes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="section-title text-sm">Histórico de pagamentos</h3>
                  {pagosMes.map(pag => (
                    <div key={pag.id} className="card flex items-center gap-4">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileCheck size={14} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{pag.mes_referencia || 'Pagamento'}</p>
                        {pag.data_pagamento && (
                          <p className="text-xs text-gray-400">Pago em {formatDate(pag.data_pagamento)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700">
                          R$ {pag.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="badge bg-emerald-100 text-emerald-700 text-xs">Pago ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pagamentos.length === 0 && (
                <div className="card text-center py-12">
                  <CreditCard size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-500 text-sm">Nenhum registro financeiro ainda</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
