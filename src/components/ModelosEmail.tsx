'use client'

import { useMemo, useState } from 'react'
import { Mail, Copy } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

export default function ModelosEmail({ cliente, pagamentos }: { cliente: any; pagamentos?: any[] }) {
  const [modelo, setModelo] = useState('aprovacao')
  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  const [editado, setEditado] = useState(false)

  const base = useMemo(() => {
    const nome = String(cliente?.nome || '').split(' ')[0] || 'tudo bem'
    const hoje = new Date()
    const mes = MESES[hoje.getMonth()]
    const aberto = (pagamentos || []).filter(p => p.status !== 'pago' && p.status !== 'cancelado')
      .sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)))[0]
    const pago = (pagamentos || []).filter(p => p.status === 'pago')
      .sort((a, b) => String(b.data_pagamento || b.vencimento).localeCompare(String(a.data_pagamento || a.vencimento)))[0]
    const portal = typeof window !== 'undefined' ? window.location.origin : 'https://agencia-brmkt.vercel.app'
    const assinatura = '\n\nUm abraço,\nBrenda Rosa\nBrenda Rosa Marketing · @brendarosa.mkt'
    const refAberto = aberto?.mes_referencia || mes
    const valAberto = aberto ? formatCurrency(aberto.valor) : formatCurrency(cliente?.valor_mensal || 0)
    const venc = aberto ? formatDate(aberto.vencimento) : 'dia ' + (cliente?.dia_vencimento || 10)
    const refPago = pago?.mes_referencia || mes
    const valPago = pago ? formatCurrency(pago.valor) : formatCurrency(cliente?.valor_mensal || 0)
    const fim = cliente?.data_fim_contrato ? formatDate(cliente.data_fim_contrato) : ''
    return {
      aprovacao: {
        rotulo: 'Posts pra aprovar',
        assunto: 'Seus posts de ' + mes + ' estão prontos pra aprovação',
        corpo: 'Oi, ' + nome + '! Tudo bem?\n\nOs conteúdos de ' + mes + ' já estão no seu portal esperando o seu olhar. Dá pra aprovar ou pedir ajuste em cada post, direto por lá: ' + portal + '\n\nQuanto antes eu tiver o seu retorno, mais tranquilo fica o cronograma de publicação.' + assinatura,
      },
      fatura: {
        rotulo: 'Fatura / cobrança',
        assunto: 'Fatura de ' + refAberto + ' · Brenda Rosa Marketing',
        corpo: 'Oi, ' + nome + '! Tudo bem?\n\nSegue em anexo a fatura de ' + refAberto + ', no valor de ' + valAberto + ', com vencimento em ' + venc + '.\n\nO pagamento pode ser feito por PIX (CNPJ 56.076.817/0001-06). Se preferir boleto ou link de pagamento, é só me avisar que eu envio.\n\nQualquer dúvida, estou por aqui!' + assinatura,
      },
      recibo: {
        rotulo: 'Recibo de pagamento',
        assunto: 'Recibo de pagamento · ' + refPago,
        corpo: 'Oi, ' + nome + '! Tudo bem?\n\nConfirmando o recebimento do pagamento de ' + refPago + ' (' + valPago + '). Obrigada! O recibo segue em anexo.' + assinatura,
      },
      contrato: {
        rotulo: 'Contrato vencendo',
        assunto: 'Seu contrato com a Brenda Rosa Marketing',
        corpo: 'Oi, ' + nome + '! Tudo bem?\n\nPassando pra avisar que o nosso contrato vai até ' + (fim || 'o fim do período') + '. Queria marcar uma conversa rápida pra gente olhar os resultados até aqui e decidir juntas os próximos passos. Qual horário fica bom pra você essa semana?' + assinatura,
      },
    } as Record<string, { rotulo: string; assunto: string; corpo: string }>
  }, [cliente, pagamentos])

  const atual = base[modelo]
  const assuntoFinal = editado ? assunto : atual.assunto
  const corpoFinal = editado ? corpo : atual.corpo

  function escolher(v: string) { setModelo(v); setEditado(false) }
  function editar(a: string, c: string) { setAssunto(a); setCorpo(c); setEditado(true) }

  async function copiar() {
    const texto = 'Assunto: ' + assuntoFinal + '\n\n' + corpoFinal
    try { await navigator.clipboard.writeText(texto); alert('Copiado!') } catch { window.prompt('Copie o texto:', texto) }
  }
  function abrir() {
    if (!cliente?.email) return alert('Esse cliente está sem e-mail cadastrado.')
    window.location.href = 'mailto:' + cliente.email + '?subject=' + encodeURIComponent(assuntoFinal) + '&body=' + encodeURIComponent(corpoFinal)
  }

  return (
    <div className="space-y-2">
      <p className="label">Modelos de e-mail</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(base).map(([k, m]) => (
          <button key={k} onClick={() => escolher(k)}
            className={'text-xs px-3 py-1.5 rounded-full border transition-all ' + (modelo === k ? 'bg-vinho text-white border-vinho' : 'bg-papel text-gray-600 border-vinho/15 hover:bg-rosa-pale')}>
            {m.rotulo}
          </button>
        ))}
      </div>
      <input className="input" value={assuntoFinal} onChange={e => editar(e.target.value, corpoFinal)} />
      <textarea className="input" rows={9} value={corpoFinal} onChange={e => editar(assuntoFinal, e.target.value)} />
      <div className="flex gap-2">
        <button onClick={abrir} className="btn-primary text-sm flex items-center gap-1.5"><Mail size={14} /> Abrir no e-mail{cliente?.email ? '' : ' (sem e-mail)'}</button>
        <button onClick={copiar} className="btn-secondary text-sm flex items-center gap-1.5"><Copy size={14} /> Copiar</button>
      </div>
      <p className="text-xs text-gray-400">O anexo (fatura ou recibo em PDF) você coloca na hora de enviar.</p>
    </div>
  )
}
