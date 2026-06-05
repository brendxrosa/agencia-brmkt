'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { FileText, ExternalLink, BookOpen, CreditCard, FileCheck, ChevronDown, ChevronUp, FolderOpen, Search, X } from 'lucide-react'

const TIPO_CONFIG: Record<string, { label: string; icon: any; cor: string }> = {
  briefing:    { label: 'Briefing',         icon: BookOpen,  cor: 'bg-blue-100 text-blue-700' },
  estrategia:  { label: 'Estratégia',       icon: FileText,  cor: 'bg-purple-100 text-purple-700' },
  curadoria:   { label: 'Curadoria',        icon: FileText,  cor: 'bg-pink-100 text-pink-700' },
  calendario:  { label: 'Calendário',       icon: FileText,  cor: 'bg-indigo-100 text-indigo-700' },
  contrato:    { label: 'Contrato',         icon: FileCheck, cor: 'bg-emerald-100 text-emerald-700' },
  referencia:  { label: 'Referência',       icon: FileText,  cor: 'bg-orange-100 text-orange-700' },
  nota:        { label: 'Nota',             icon: FileText,  cor: 'bg-gray-100 text-gray-700' },
  planejamento:{ label: 'Planejamento',     icon: FileText,  cor: 'bg-teal-100 text-teal-700' },
  relatorio:   { label: 'Relatório',        icon: FileText,  cor: 'bg-yellow-100 text-yellow-700' },
  outro:       { label: 'Outro',            icon: FileText,  cor: 'bg-rose-100 text-rose-700' },
  boleto:      { label: 'Boleto',           icon: CreditCard, cor: 'bg-yellow-100 text-yellow-700' },
  nota_fiscal: { label: 'Nota Fiscal',      icon: FileCheck,  cor: 'bg-green-100 text-green-700' },
  comprovante: { label: 'Comprovante',      icon: FileCheck,  cor: 'bg-teal-100 text-teal-700' },
}

export default function ClienteDocsPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<any[]>([])
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [clienteInfo, setClienteInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [docAberto, setDocAberto] = useState<string | null>(null)
  const [aba, setAba] = useState('documentos')
  const [busca, setBusca] = useState('')

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

      <div className="flex gap-1 bg-creme rounded-xl p-1">
        {[
          ['documentos', 'Documentos', FileText],
          ['financeiro', 'Financeiro', CreditCard],
        ].map(([v, l, Icon]: any) => (
          <button key={v} onClick={() => setAba(v)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              aba === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={14} /> {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}</div>
      ) : (
        <>
          {aba === 'documentos' && (
            <div className="space-y-4">

              {/* Barra de busca */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9 pr-9 text-sm" placeholder="Pesquisar documentos..."
                  value={busca} onChange={e => setBusca(e.target.value)} />
                {busca && (
                  <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Google Drive */}
              {clienteInfo?.drive_url && (
                <a href={clienteInfo.drive_url} target="_blank" rel="noopener noreferrer"
                  className="card flex items-center gap-3 hover:shadow-card-hover transition-all group">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FolderOpen size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Google Drive</p>
                    <p className="text-xs text-gray-400">Clique para acessar seus arquivos</p>
                  </div>
                  <ExternalLink size={16} className="text-gray-400 group-hover:text-vinho transition-colors" />
                </a>
              )}

              {/* Docs */}
              {docs.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-500 text-sm">Nenhum documento disponível ainda</p>
                  <p className="text-gray-400 text-xs mt-1">A agência irá adicionar seus documentos aqui</p>
                </div>
              ) : (
                <div className="space-y-4">
                                    <div className="space-y-2">
                  <h3 className="section-title text-sm">Documentos compartilhados</h3>
                  {docs.filter(d => !['boleto','nota_fiscal','comprovante'].includes(d.tipo) && (!busca || d.titulo?.toLowerCase().includes(busca.toLowerCase()))).map(doc => {
                    const config = tipoConfig(doc.tipo)
                    const Icon = config.icon
                    const aberto = docAberto === doc.id
                    return (
                      <div key={doc.id} className="card">
                        <button onClick={() => setDocAberto(aberto ? null : doc.id)}
                          className="w-full flex items-center gap-3 text-left">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.cor.split(' ')[0])}>
                            <Icon size={16} className={config.cor.split(' ')[1]} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{doc.titulo}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('badge text-xs', config.cor)}>{config.label}</span>
                              <span className="text-xs text-gray-400">{formatDate(doc.updated_at, "dd/MM/yyyy")}</span>
                            </div>
                          </div>
                          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>

                        {aberto && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                            {doc.conteudo && (
                              <div className="bg-creme rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                                {doc.conteudo}
                              </div>
                            )}
                            {doc.link_arquivo && (
                              /\.pdf$/i.test(doc.link_arquivo) ? (
                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                  <div className="flex items-center justify-between px-3 py-2 bg-creme border-b border-gray-200">
                                    <span className="text-xs font-medium text-gray-600">📄 PDF</span>
                                    <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-vinho hover:underline flex items-center gap-1">
                                      ⬇ Baixar
                                    </a>
                                  </div>
                                  <iframe src={doc.link_arquivo} className="w-full h-64" title={doc.titulo} />
                                </div>
                              ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(doc.link_arquivo) ? (
                                <img src={doc.link_arquivo} alt={doc.titulo}
                                  className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50" />
                              ) : (
                                <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-vinho hover:underline">
                                  ⬇ Baixar arquivo
                                </a>
                              )
                            )}
                            {doc.drive_url && (
                              <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                {doc.drive_url.includes('drive.google') || doc.drive_url.includes('docs.google')
                                  ? '🔗 Abrir no Google Drive'
                                  : '🔗 Acessar link'}
                              </a>
                            )}
                            {!doc.conteudo && !doc.link_arquivo && !doc.drive_url && (
                              <p className="text-xs text-gray-400 text-center py-2">Nenhum arquivo ou conteúdo disponível ainda.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </div>
              )}
            </div>
          )}

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
                        {pag.data_pagamento && <p className="text-xs text-gray-400">Pago em {formatDate(pag.data_pagamento)}</p>}
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

              {/* Docs do tipo financeiro na aba Financeiro */}
              {docs.filter(d => ['boleto','nota_fiscal','comprovante'].includes(d.tipo)).length > 0 && (
                <div className="space-y-2">
                  <h3 className="section-title text-sm">Documentos financeiros</h3>
                  {docs.filter(d => ['boleto','nota_fiscal','comprovante'].includes(d.tipo)).map(doc => {
                    const config = tipoConfig(doc.tipo)
                    const Icon = config.icon
                    const aberto = docAberto === doc.id
                    return (
                      <div key={doc.id} className="card">
                        <button onClick={() => setDocAberto(aberto ? null : doc.id)}
                          className="w-full flex items-center gap-3 text-left">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.cor.split(' ')[0])}>
                            <Icon size={16} className={config.cor.split(' ')[1]} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{doc.titulo}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('badge text-xs', config.cor)}>{config.label}</span>
                              <span className="text-xs text-gray-400">{formatDate(doc.updated_at, "dd/MM/yyyy")}</span>
                            </div>
                          </div>
                          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>
                        {aberto && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                            {doc.conteudo && <div className="bg-creme rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">{doc.conteudo}</div>}
                            {doc.link_arquivo && (/\.pdf$/i.test(doc.link_arquivo) ? (
                              <div className="rounded-xl overflow-hidden border border-gray-200">
                                <div className="flex items-center justify-between px-3 py-2 bg-creme border-b border-gray-200">
                                  <span className="text-xs font-medium">📄 PDF</span>
                                  <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer" className="text-xs text-vinho hover:underline">⬇ Baixar</a>
                                </div>
                                <iframe src={doc.link_arquivo} className="w-full h-52" title={doc.titulo} />
                              </div>
                            ) : <a href={doc.link_arquivo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-vinho hover:underline">⬇ Baixar arquivo</a>)}
                            {doc.drive_url && <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">{doc.drive_url.includes('drive.google') ? '🔗 Abrir no Drive' : '🔗 Acessar link'}</a>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {pagamentos.length === 0 && docs.filter(d => ['boleto','nota_fiscal','comprovante'].includes(d.tipo)).length === 0 && (
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
