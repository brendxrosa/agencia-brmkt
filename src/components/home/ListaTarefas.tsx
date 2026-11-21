'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Check, ChevronRight } from 'lucide-react'

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
  late: { txt: 'Atrasada', cls: 'bg-red-100 text-red-800' },
  today: { txt: 'Hoje', cls: 'bg-yellow-100 text-yellow-800' },
  week: { txt: 'Esta semana', cls: 'bg-creme text-tinta' },
  wait: { txt: 'Em espera', cls: 'bg-creme text-tinta' },
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

  const Linha = ({ i, feito }: { i: ItemLista; feito?: boolean }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-t border-creme first:border-t-0">
      <div className="flex items-center gap-3 min-w-0">
        {i.tarefaId ? (
          <button onClick={() => marcar(i.tarefaId!, !feito)} disabled={salvando === i.tarefaId}
            aria-label={feito ? 'Reabrir tarefa' : 'Marcar como feito'}
            className={cn('w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all',
              feito ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-rosa hover:bg-rosa-pale')}>
            {feito && <Check size={16} />}
          </button>
        ) : (
          <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.cor || '#B0546E' }} />
          </span>
        )}
        <div className="min-w-0">
          {i.href && !feito ? (
            <Link href={i.href} className="font-medium text-tinta hover:text-rosa truncate block">{i.titulo}</Link>
          ) : (
            <p className={cn('font-medium truncate', feito ? 'line-through text-gray-400' : 'text-tinta')}>{i.titulo}</p>
          )}
          <p className="text-xs text-gray-500">{i.quando} · {i.area}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('px-3 py-1 rounded-full text-xs font-medium', feito ? 'bg-emerald-100 text-emerald-800' : CHIP[i.grupo].cls)}>
          {feito ? 'Feito' : CHIP[i.grupo].txt}
        </span>
        {i.href && !feito && <ChevronRight size={14} className="text-gray-300" />}
      </div>
    </div>
  )

  return (
    <div>
      {itens.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">Nada pendente. Tudo em dia.</p>
      ) : itens.map(i => <Linha key={i.key} i={i} />)}

      <div className="mt-3">
        <button onClick={() => setVerConcluidas(v => !v)}
          className="text-xs text-gray-500 hover:text-vinho px-3 py-2 rounded-full border border-creme hover:bg-creme/60">
          {verConcluidas ? 'Esconder concluídas' : 'Ver concluídas'} ({concluidas.length})
        </button>
      </div>
      {verConcluidas && (
        <div className="mt-2">
          {concluidas.length === 0 && <p className="text-xs text-gray-400 py-2">Nenhuma concluída nos últimos 14 dias.</p>}
          {concluidas.map(i => <Linha key={i.key} i={i} feito />)}
        </div>
      )}
    </div>
  )
}
