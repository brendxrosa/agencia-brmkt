'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Pagamento } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Plus, X, DollarSign, AlertCircle, CheckCircle, Clock, Send, TrendingUp, TrendingDown } from 'lucide-react'

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function FinanceiroPage() {
  const supabase = createClient()
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [cobrando, setCobrando] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [periodo, setPeriodo] = useState('mes')
  const [mesSel, setMesSel] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }).slice(0, 7))
  const [nibs, setNibs] = useState<any[]>([])
  const [form, setForm] = useState({
    cliente_id: '', valor: '', mes_referencia: '',
    vencimento: '', status: 'pendente' as Pagamento['status'], observacoes: ''
  })

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
      if (profile) setUserName(profile.nome)
    }
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('pagamentos').select('*, clientes(nome, cor, id)').order('vencimento', { ascending: false }),
      supabase.from('clientes').select('id, nome, valor_mensal, dia_vencimento').eq('status', 'ativo').order('nome')
    ])
    setPagamentos(p || [])
    const { data: rm } = await supabase.from('rotinas_mensais').select('*').eq('rotina', 'nibs')
    setNibs(rm || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.cliente_id || !form.valor || !form.vencimento) return alert('Cliente, valor e vencimento são obrigatórios!')
    setSalvando(true)
    await supabase.from('pagamentos').insert({
      cliente_id: form.cliente_id,
      valor: Number(form.valor),
      mes_referencia: form.mes_referencia || null,
      vencimento: form.vencimento,
      status: form.status,
      observacoes: form.observacoes || null,
    })
    setSalvando(false)
    setModalAberto(false)
    setForm({ cliente_id: '', valor: '', mes_referencia: '', vencimento: '', status: 'pendente', observacoes: '' })
    carregar()
  }

  async function marcarPago(id: string) {
    await supabase.from('pagamentos').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    carregar()
  }

  async function marcarAtrasado(id: string) {
    await supabase.from('pagamentos').update({ status: 'atrasado' }).eq('id', id)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este pagamento?')) return
    await supabase.from('pagamentos').delete().eq('id', id)
    carregar()
  }

  async function enviarCobranca(pagamento: any) {
    if (!pagamento.clientes?.id) return
    setCobrando(pagamento.id)
    const msg = `Olá! 👋 Passando para lembrar que o pagamento referente a *${pagamento.mes_referencia || 'sua mensalidade'}* no valor de *${formatCurrency(pagamento.valor)}* está em aberto. Vencimento: ${formatDate(pagamento.vencimento)}. Qualquer dúvida, estou à disposição! 😊`
    await supabase.from('mensagens').insert({
      cliente_id: pagamento.clientes.id, autor_id: userId,
      autor_nome: userName || 'Agência BR MKT', autor_role: 'admin',
      conteudo: msg, assunto: 'Pagamento / Financeiro', lida: false,
    })
    setCobrando(null)
    alert(`Cobrança enviada para ${pagamento.clientes.nome} via chat! ✅`)
  }

  function chaveMes() { const h = new Date(); return MESES[h.getMonth()] + ' ' + h.getFullYear() }
  function faltandoMes() {
    const mes = chaveMes()
    return clientes.filter(c => (c.valor_mensal || 0) > 0 && !pagamentos.some(p => p.cliente_id === c.id && p.mes_referencia === mes))
  }

  async function gerarPagamentosMes() {
    const hoje = new Date()
    const mes = chaveMes()
    const novos = faltandoMes()
    if (novos.length === 0) return alert('Todas as mensalidades de ' + mes + ' já existem.')
    const pad = (n: number) => String(n).padStart(2, '0')
    const linhas = novos.map(c => ({
      cliente_id: c.id, valor: c.valor_mensal, mes_referencia: mes,
      vencimento: hoje.getFullYear() + '-' + pad(hoje.getMonth() + 1) + '-' + pad(Math.min(c.dia_vencimento || 10, 28)),
      status: 'pendente',
    }))
    await supabase.from('pagamentos').insert(linhas)
    await carregar()
    alert(novos.length + ' mensalidade(s) criada(s) para ' + mes + ', já com o vencimento de cada contrato.')
  }

  async function copiarCobranca(pag: any) {
    const msg = 'Oi, ' + (pag.clientes?.nome || '') + '! Tudo bem? Passando pra lembrar da mensalidade de ' + (pag.mes_referencia || 'este mês') + ', no valor de ' + formatCurrency(pag.valor) + ', com vencimento em ' + formatDate(pag.vencimento) + '. Qualquer dúvida é só me chamar!'
    try { await navigator.clipboard.writeText(msg); alert('Mensagem copiada. É só colar no WhatsApp.') }
    catch { window.prompt('Copie a mensagem:', msg) }
  }

  const hojeStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' })
  const efetivo = (p: any) => (p.status === 'pendente' && p.vencimento && String(p.vencimento).slice(0, 10) < hojeStr) ? 'atrasado' : p.status
  const ymHoje = hojeStr.slice(0, 7)
  const somaMes = (ym: string, n: number) => { const [a, m] = ym.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
  const ini = periodo === 'tudo' ? '0000-00' : periodo === '3m' ? somaMes(ymHoje, -2) : periodo === '12m' ? somaMes(ymHoje, -11) : periodo === 'custom' ? mesSel : ymHoje
  const fim = periodo === 'custom' ? mesSel : ymHoje
  const noPeriodo = (d: any) => { const m = String(d || '').slice(0, 7); return !!m && m >= ini && m <= fim }
  const rotuloPeriodo = periodo === 'mes' ? 'este mês' : periodo === '3m' ? 'últimos 3 meses' : periodo === '12m' ? 'últimos 12 meses' : periodo === 'tudo' ? 'todo o período' : 'o mês escolhido'
  const dataRecebido = (p: any) => p.data_pagamento || p.vencimento
  const nibsPagos = nibs.filter(r => r.pago && noPeriodo(r.data_pagamento || (r.mes + '-15')))
  const filtrados = pagamentos
    .filter(p => noPeriodo(p.vencimento) || efetivo(p) === 'atrasado')
    .filter(p => filtroStatus === 'todos' || efetivo(p) === filtroStatus)
  const totalPendente = pagamentos.filter(p => efetivo(p) === 'pendente' && noPeriodo(p.vencimento)).reduce((s, p) => s + (p.valor || 0), 0)
  const totalAtrasado = pagamentos.filter(p => efetivo(p) === 'atrasado').reduce((s, p) => s + (p.valor || 0), 0)
  const recebidoClientes = pagamentos.filter(p => p.status === 'pago' && noPeriodo(dataRecebido(p))).reduce((s, p) => s + (p.valor || 0), 0)
  const recebidoNibs = nibsPagos.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  const totalPago = recebidoClientes + recebidoNibs

  // ---- NIBS (gestão interna) ----
  const contratoNibs = nibs.find(r => r.mes === 'config')?.obs || ''
  const mesesNibs = [0, -1, -2, -3, -4, -5].map(n => somaMes(ymHoje, n))
  const rowNibs = (ym: string) => nibs.find(r => r.mes === ym) || { mes: ym, valor: 2000, nf_gerada: false, nf_enviada: false, pago: false }
  async function salvarNibs(ym: string, campos: any) {
    const atual = rowNibs(ym)
    const base = { rotina: 'nibs', mes: ym, valor: atual.valor ?? 2000, nf_gerada: !!atual.nf_gerada, nf_enviada: !!atual.nf_enviada, pago: !!atual.pago, data_pagamento: atual.data_pagamento || null }
    const { error } = await supabase.from('rotinas_mensais').upsert({ ...base, ...campos }, { onConflict: 'rotina,mes' })
    if (error) return alert('Não consegui salvar: ' + error.message)
    carregar()
  }
  function alternarNibs(ym: string, campo: 'nf_gerada' | 'nf_enviada' | 'pago') {
    const r: any = rowNibs(ym)
    const novo = !r[campo]
    const extra: any = campo === 'pago' ? { data_pagamento: novo ? hojeStr : null } : {}
    if (campo === 'nf_enviada' && novo) extra.nf_gerada = true
    if (campo === 'pago' && novo) { extra.nf_gerada = true; extra.nf_enviada = true }
    salvarNibs(ym, { [campo]: novo, ...extra })
  }
  function editarValorNibs(ym: string) {
    const r: any = rowNibs(ym)
    const v = window.prompt('Valor da NIBS em ' + ym + ':', String(r.valor ?? 2000))
    if (v === null) return
    const n = Number(v.replace(',', '.'))
    if (!isNaN(n)) salvarNibs(ym, { valor: n })
  }
  function definirContratoNibs() {
    const v = window.prompt('Link do contrato da NIBS (Drive):', contratoNibs)
    if (v === null) return
    supabase.from('rotinas_mensais').upsert({ rotina: 'nibs', mes: 'config', obs: v.trim() || null }, { onConflict: 'rotina,mes' }).then(() => carregar())
  }
  function quintoDecimoQuintoUtil(ym: string) {
    const [a, m] = ym.split('-').map(Number)
    let c = 0
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(a, m - 1, d)
      if (dt.getMonth() !== m - 1) break
      const w = dt.getDay()
      if (w !== 0 && w !== 6) { c++; if (c === 15) return a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0') }
    }
    return ''
  }
  function dicaNibs(ym: string) {
    const r: any = rowNibs(ym)
    if (r.pago) return 'Tudo certo, pago ✓'
    const limNF = ym + '-15'
    const limPag = quintoDecimoQuintoUtil(ym)
    if (!r.nf_gerada) return hojeStr > limNF && ym <= ymHoje ? 'Nota ainda não gerada (o ideal era antes do dia 15)' : 'Gerar a nota nos dias 11 e 12'
    if (!r.nf_enviada) return hojeStr > limNF && ym <= ymHoje ? 'Nota gerada, mas ainda não enviada (ideal antes do dia 15)' : 'Falta enviar a nota (antes do dia 15)'
    return limPag ? 'Aguardando pagamento até ' + formatDate(limPag) + ' (15º dia útil)' : 'Aguardando pagamento'
  }

  const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: any }> = {
    pendente: { label: 'Pendente', cor: 'bg-orange-100 text-orange-700', icon: Clock },
    pago: { label: 'Pago', cor: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    atrasado: { label: 'Atrasado', cor: 'bg-red-100 text-red-700', icon: AlertCircle },
    cancelado: { label: 'Cancelado', cor: 'bg-gray-100 text-gray-600', icon: X },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">{pagamentos.length} lançamento(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarPagamentosMes} className="btn-secondary flex items-center gap-2 text-sm">
            <TrendingUp size={15} /> Gerar mês
          </button>
          <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Período */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-creme rounded-xl p-1 w-fit">
          {[['mes','Este mês'],['3m','3 meses'],['12m','12 meses'],['tudo','Tudo'],['custom','Escolher mês']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriodo(v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                periodo === v ? 'bg-papel shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <input type="month" className="input w-auto" value={mesSel} onChange={e => e.target.value && setMesSel(e.target.value)} />
        )}
        <span className="text-xs text-gray-400">Mostrando {rotuloPeriodo}. Atrasados aparecem sempre.</span>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'A receber', valor: totalPendente, cor: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Atrasado', valor: totalAtrasado, cor: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Recebido', valor: totalPago, cor: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, valor, cor, bg }) => (
          <div key={label} className={cn('card text-center', bg)}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={cn('text-lg font-bold font-display', cor)}>{formatCurrency(valor)}</p>
          </div>
        ))}
      </div>

      {/* NIBS: gestão interna */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="section-title">NIBS · nota e pagamento</h2>
            <p className="text-xs text-gray-500">Só pra você: emitir a nota (dias 11 e 12), enviar antes do dia 15 e acompanhar o pagamento (até o 15º dia útil).</p>
          </div>
          <div className="flex gap-2">
            {contratoNibs && <a href={contratoNibs} target="_blank" rel="noreferrer" className="btn-secondary text-sm">Abrir contrato</a>}
            <button onClick={definirContratoNibs} className="btn-ghost text-sm">{contratoNibs ? 'Trocar link do contrato' : 'Colocar link do contrato'}</button>
          </div>
        </div>
        <div className="space-y-2">
          {mesesNibs.map((ym, i) => {
            const r: any = rowNibs(ym)
            const [a, m] = ym.split('-').map(Number)
            const Pill = ({ campo, rotulo }: { campo: 'nf_gerada' | 'nf_enviada' | 'pago'; rotulo: string }) => (
              <button onClick={() => alternarNibs(ym, campo)}
                className={cn('text-xs px-2.5 py-1.5 rounded-full border transition-all',
                  r[campo] ? 'bg-lima text-vinho border-vinho/30 font-semibold' : 'bg-papel text-gray-500 border-vinho/15 hover:bg-rosa-pale')}>
                {r[campo] ? '✓ ' : ''}{rotulo}
              </button>
            )
            return (
              <div key={ym} className={cn('flex items-center gap-3 flex-wrap rounded-xl px-3 py-2', i === 0 ? 'bg-creme' : '')}>
                <div className="w-28">
                  <p className="font-semibold text-sm text-vinho">{MESES[m - 1]} {a}</p>
                  <button onClick={() => editarValorNibs(ym)} className="text-xs text-gray-500 hover:underline">{formatCurrency(Number(r.valor ?? 2000))}</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Pill campo="nf_gerada" rotulo="Nota gerada" />
                  <Pill campo="nf_enviada" rotulo="Nota enviada" />
                  <Pill campo="pago" rotulo="Pago" />
                </div>
                <p className="text-xs text-gray-500 flex-1 min-w-40">{dicaNibs(ym)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {!loading && faltandoMes().length > 0 && (
        <div className="card flex items-center gap-3 border-l-4 border-l-vinho flex-wrap">
          <p className="text-sm text-gray-700 flex-1 min-w-48">
            {faltandoMes().length} cliente(s) ainda sem a mensalidade de {chaveMes()}: {faltandoMes().map(c => c.nome).join(', ')}.
          </p>
          <button onClick={gerarPagamentosMes} className="btn-primary text-sm">Gerar agora</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 bg-creme rounded-xl p-1 w-fit">
        {[['todos','Todos'],['pendente','Pendentes'],['atrasado','Atrasados'],['pago','Pagos']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltroStatus(v)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filtroStatus === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-creme" />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <DollarSign size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(pag => {
            const config = STATUS_CONFIG[efetivo(pag)] || STATUS_CONFIG.pendente
            const Icon = config.icon
            return (
              <div key={pag.id} className="card flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (pag.clientes?.cor || '#6B0F2A') + '20' }}>
                  <DollarSign size={18} style={{ color: pag.clientes?.cor || '#6B0F2A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{pag.clientes?.nome || 'Cliente'}</p>
                    <span className={cn('badge text-xs flex items-center gap-1', config.cor)}>
                      <Icon size={10} /> {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pag.mes_referencia && `${pag.mes_referencia} · `}
                    Vence {formatDate(pag.vencimento)}
                    {pag.observacoes && ` · ${pag.observacoes}`}
                  </p>
                </div>
                <p className="font-bold text-gray-800 flex-shrink-0">{formatCurrency(pag.valor)}</p>
                <div className="flex gap-1 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                  {pag.status !== 'pago' && (
                    <button onClick={() => copiarCobranca(pag)}
                      className="text-xs bg-creme text-gray-700 px-2.5 py-1.5 rounded-xl hover:bg-rosa-pale transition-all">
                      Copiar cobrança
                    </button>
                  )}
                  {pag.status !== 'pago' && (
                    <button onClick={() => marcarPago(pag.id)}
                      className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-all">
                      Pago ✓
                    </button>
                  )}
                  {pag.status === 'pendente' && (
                    <button onClick={() => enviarCobranca(pag)} disabled={cobrando === pag.id}
                      className="btn-ghost p-1.5" title="Enviar cobrança">
                      <Send size={14} />
                    </button>
                  )}
                  <button onClick={() => excluir(pag.id)} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo lançamento</h2>
            <button onClick={() => setModalAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => {
                const c = clientes.find(x => x.id === e.target.value)
                setForm(f => ({ ...f, cliente_id: e.target.value, valor: c?.valor_mensal?.toString() || '' }))
              }}>
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Valor *</label>
                <input className="input" type="number" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Vencimento *</label>
                <input className="input" type="date" value={form.vencimento}
                  onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Mês de referência</label>
              <input className="input" value={form.mes_referencia}
                onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))}
                placeholder="Ex: Junho 2026" />
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2">
                {(['pendente','pago','atrasado'] as const).map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                      form.status === s ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <input className="input" value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Nota fiscal, parcela, etc..." />
            </div>
            <div className="flex gap-3 pt-2 pb-2">
              <button onClick={() => setModalAberto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
