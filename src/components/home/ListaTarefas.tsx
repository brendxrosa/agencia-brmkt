'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type ItemLista = {
  key: string
  titulo: string
  quando: string
  area: string
  grupo: 'late' | 'today' | 'week' | 'wait'
  href?: string
  tarefaId?: string
  cor?: string
}

const CHIP: Record<ItemLista['grupo'], { txt: string; cls: string }> = {
  late: { txt: 'Atrasada', cls: 'red' },
  today: { txt: 'Hoje', cls: 'yel' },
  week: { txt: 'Esta semana', cls: 'gry' },
  wait: { txt: 'Em espera', cls: 'gry' },
}

export default function ListaTarefas({ itens, concluidas }: { itens: ItemLista[]; concluidas: ItemLista[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [verConcluidas, setVerConcluidas] = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)

  async function marcar(id: string, feito: boolean) {
    setSalvando(id)
    await supabase.from('tarefas').update({ status: feito ? 'concluida' : 'pendente' }).eq('id', id)
    setSalvando(null)
    router.refresh()
  }

  function clicar(i: ItemLista, feito: boolean) {
    if (i.tarefaId) marcar(i.tarefaId, !feito)
    else if (i.href) router.push(i.href) // itens vindos de posts, docs e dinheiro se resolvem na página deles
  }

  const Linha = ({ i, feito }: { i: ItemLista; feito?: boolean }) => (
    <div className="hm-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <button className="hm-chk" disabled={salvando === i.tarefaId}
          onClick={() => clicar(i, !!feito)}
          aria-label={feito ? 'Reabrir tarefa' : i.tarefaId ? 'Marcar como feito' : 'Abrir para resolver'}
          title={feito ? 'Reabrir' : i.tarefaId ? 'Marcar como feito' : 'Abrir para resolver'}>
          {feito ? '✓' : ''}
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, ...(feito ? { textDecoration: 'line-through', color: '#6B4A52' } : {}) }}>{i.titulo}</div>
          <div style={{ fontSize: 13, color: '#6B4A52' }}>{i.quando} · {i.area}</div>
        </div>
      </div>
      <span className={'hm-chip ' + (feito ? 'grn' : CHIP[i.grupo].cls)}>{feito ? 'Feito' : CHIP[i.grupo].txt}</span>
    </div>
  )

  return (
    <div>
      {itens.length === 0 && <p className="hm-sub" style={{ margin: 0 }}>Nada pendente. Tudo em dia.</p>}
      {itens.map(i => <Linha key={i.key} i={i} />)}

      <div style={{ marginTop: 12 }}>
        <button className="hm-tabbtn" style={{ background: 'transparent', color: '#6B4A52', fontSize: 13 }}
          onClick={() => setVerConcluidas(v => !v)}>
          {verConcluidas ? 'Esconder concluídas' : 'Ver concluídas'} ({concluidas.length})
        </button>
      </div>
      {verConcluidas && concluidas.map(i => <Linha key={i.key} i={i} feito />)}
    </div>
  )
}
