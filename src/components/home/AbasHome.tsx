'use client'

import Link from 'next/link'
import { useState } from 'react'

export type LinhaDinheiro = { key: string; titulo: string; quando: string; chip: string; cls: string }

type Props = {
  dinheiro: LinhaDinheiro[]
  alerta: string
}

const MODELOS = [
  { t: 'Fatura', href: '/dashboard/docs' },
  { t: 'Recibo', href: '/dashboard/docs' },
  { t: 'Nota fiscal (NIBS)', href: '/dashboard/financeiro' },
  { t: 'Cobrança amigável', href: '/dashboard/docs' },
  { t: 'Envio de documentos', href: '/dashboard/docs' },
  { t: 'E-mails', href: '/dashboard/clientes' },
]

export default function AbasHome({ dinheiro, alerta }: Props) {
  const [aba, setAba] = useState<'conteudo' | 'dinheiro' | 'prompts'>('conteudo')
  const on = { background: '#5A1A2B', color: '#F1E6D2', borderColor: '#5A1A2B' }
  const off = { background: 'transparent', color: '#5A1A2B' }
  const st = (a: string) => (aba === a ? on : off)

  return (
    <div id="abas" style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <button className="hm-tabbtn" style={st('conteudo')} onClick={() => setAba('conteudo')}>Estratégia BR MKT</button>
        <button className="hm-tabbtn" style={st('dinheiro')} onClick={() => setAba('dinheiro')}>Dinheiro</button>
        <button className="hm-tabbtn" style={st('prompts')} onClick={() => setAba('prompts')}>Prompts e modelos</button>
      </div>

      {aba === 'conteudo' && (
        <div className="hm-card">
          <h2 className="hm-h2 font-display">Estratégia BR MKT</h2>
          <p className="hm-sub">Marketing de conteúdo da própria agência. Cada item abre a página de estratégia, onde você edita e anexa tudo.</p>
          <div className="hm-row" style={{ borderTop: 0 }}><Link href="/dashboard/docs" style={{ fontWeight: 500 }}>Linha editorial</Link><span className="hm-chip grn">Pronta</span></div>
          <div className="hm-row"><Link href="/dashboard/docs" style={{ fontWeight: 500 }}>Calendário editorial do próximo ciclo</Link><span className="hm-chip red">Falta produzir</span></div>
          <div className="hm-row"><Link href="/dashboard/docs" style={{ fontWeight: 500 }}>Ciclos completos · links do Drive e dos vídeos</Link><span className="hm-chip gry">Anexar publicações</span></div>
          <div style={{ background: '#8A1F2E', color: '#fff', borderRadius: 16, padding: '18px 20px', marginTop: 16, fontSize: 15, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="hm-chip" style={{ background: '#F6E7A8', color: '#5E4B00' }}>ALERTA</span>
            <span>{alerta}</span>
          </div>
        </div>
      )}

      {aba === 'dinheiro' && (
        <div className="hm-card">
          <h2 className="hm-h2 font-display">Dinheiro</h2>
          <p className="hm-sub">A receber e a pagar, na ordem do vencimento.</p>
          {dinheiro.length === 0 && <p className="hm-sub" style={{ margin: 0 }}>Nada vencendo nos próximos dias.</p>}
          {dinheiro.map((d, n) => (
            <div key={d.key} className="hm-row" style={n === 0 ? { borderTop: 0 } : undefined}>
              <div><div style={{ fontWeight: 500 }}>{d.titulo}</div><div style={{ fontSize: 13, color: '#6B4A52' }}>{d.quando}</div></div>
              <span className={'hm-chip ' + d.cls}>{d.chip}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}><Link href="/dashboard/financeiro" style={{ fontWeight: 500 }}>Abrir financeiro completo</Link></div>
        </div>
      )}

      {aba === 'prompts' && (
        <div className="hm-card">
          <h2 className="hm-h2 font-display">Prompts e modelos</h2>
          <p className="hm-sub">Fatura, recibo, nota, cobrança, envio de documentos e e-mails.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
            {MODELOS.map(m => <Link key={m.t} className="hm-sec" href={m.href}><div className="lab">{m.t}</div></Link>)}
          </div>
        </div>
      )}
    </div>
  )
}
