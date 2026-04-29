import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Kanban, CheckSquare, DollarSign, AlertCircle, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { differenceInDays, parseISO } from 'date-fns'
import BotaoCobranca from '@/components/ui/BotaoCobranca'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: totalClientes },
    { data: pagamentosPendentes },
    { data: tarefasUrgentes },
    { data: postsAguardando },
    { data: proximosEventos },
    { data: todosClientes },
    { data: pagamentosAtrasados },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('pagamentos').select('*, clientes(nome)').eq('status', 'pendente').order('vencimento').limit(5),
    supabase.from('tarefas').select('*').eq('status', 'pendente').eq('prioridade', 'urgente').limit(5),
    supabase.from('posts').select('*, clientes(nome, cor)').eq('status_cliente', 'pendente').limit(5),
    supabase.from('eventos').select('*, clientes(nome)').gte('data_inicio', new Date().toISOString()).order('data_inicio').limit(5),
    supabase.from('clientes').select('id, nome, cor, data_fim_contrato').eq('status', 'ativo'),
    supabase.from('pagamentos').select('*, clientes(nome, cor)').eq('status', 'atrasado').order('vencimento'),
  ])

  const hoje = new Date()
  const contratosVencendo = (todosClientes || []).filter((c: any) => {
    if (!c.data_fim_contrato) return false
    const dias = differenceInDays(parseISO(c.data_fim_contrato), hoje)
    return dias >= 0 && dias <= 30
  })

  const cards = [
    { label: 'Clientes ativos', value: totalClientes ?? 0, icon: Users, href: '/dashboard/clientes', cor: 'bg-vinho' },
    { label: 'Posts aguardando aprovação', value: postsAguardando?.length ?? 0, icon: Kanban, href: '/dashboard/kanban', cor: 'bg-rosa' },
    { label: 'Tarefas urgentes', value: tarefasUrgentes?.length ?? 0, icon: CheckSquare, href: '/dashboard/tarefas', cor: 'bg-orange-600' },
    { label: 'Pagamentos pendentes', value: pagamentosPendentes?.length ?? 0, icon: DollarSign, href: '/dashboard/financeiro', cor: 'bg-emerald-700' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Bom dia, Brenda 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{formatDate(new Date().toISOString(), "EEEE, dd 'de' MMMM 'de' yyyy")}</p>
      </div>

      {(contratosVencendo.length > 0 || (pagamentosAtrasados && pagamentosAtrasados.length > 0)) && (
        <div className="space-y-3">
          {contratosVencendo.length > 0 && (
            <div className="card border-l-4 border-l-orange-500 bg-orange-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-orange-500" />
                <h3 className="font-semibold text-orange-700 text-sm">
                  {contratosVencendo.length} contrato(s) vencendo em até 30 dias
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {contratosVencendo.map((c: any) => {
                  const dias = differenceInDays(parseISO(c.data_fim_contrato), hoje)
                  return (
                    <div key={c.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-orange-100">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                      <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                      <span className="text-xs text-orange-600 font-medium">
                        {dias === 0 ? 'Vence hoje!' : `${dias} dia(s)`}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-orange-600 mt-2">Entre em contato para renovar ou encerrar.</p>
            </div>
          )}

          {pagamentosAtrasados && pagamentosAtrasados.length > 0 && (
            <div className="card border-l-4 border-l-red-500 bg-red-50/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-red-500" />
                <h3 className="font-semibold text-red-700 text-sm">
                  {pagamentosAtrasados.length} pagamento(s) atrasado(s)
                </h3>
              </div>
              <div className="space-y-2">
                {pagamentosAtrasados.map((pag: any) => (
                  <div key={pag.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-red-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pag.clientes?.cor }} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{pag.clientes?.nome}</p>
                        <p className="text-xs text-gray-400">Venceu {formatDate(pag.vencimento)}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-sm font-semibold text-red-700">{formatCurrency(pag.valor)}</p>
                      <BotaoCobranca clienteId={pag.cliente_id} clienteNome={pag.clientes?.nome} valor={pag.valor} vencimento={pag.vencimento} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, href, cor }) => (
          <Link key={href} href={href} className="card-hover group">
            <div className={`w-10 h-10 rounded-xl ${cor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-display font-bold text-vinho">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Aguardando aprovação</h3>
            <Link href="/dashboard/kanban" className="text-xs text-vinho hover:underline">Ver todos</Link>
          </div>
          {postsAguardando && postsAguardando.length > 0 ? (
            <div className="space-y-2">
              {postsAguardando.map((post: any) => (
                <div key={post.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: post.clientes?.cor || '#6B0F2A' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                    <p className="text-xs text-gray-400">{post.clientes?.nome}</p>
                  </div>
                  <span className="badge bg-rosa-pale text-rosa text-xs">Pendente</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <CheckSquare size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum post pendente</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Próximos eventos</h3>
            <Link href="/dashboard/agenda" className="text-xs text-vinho hover:underline">Ver agenda</Link>
          </div>
          {proximosEventos && proximosEventos.length > 0 ? (
            <div className="space-y-2">
              {proximosEventos.map((evento: any) => (
                <div key={evento.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-vinho/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} className="text-vinho" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{evento.titulo}</p>
                    <p className="text-xs text-gray-400">{formatDate(evento.data_inicio, "dd/MM 'às' HH:mm")}</p>
                    {evento.clientes?.nome && <p className="text-xs text-gray-400">{evento.clientes.nome}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Clock size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum evento próximo</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Pagamentos pendentes</h3>
            <Link href="/dashboard/financeiro" className="text-xs text-vinho hover:underline">Ver todos</Link>
          </div>
          {pagamentosPendentes && pagamentosPendentes.length > 0 ? (
            <div className="space-y-2">
              {pagamentosPendentes.map((pag: any) => (
                <div key={pag.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <AlertCircle size={16} className="text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{pag.clientes?.nome}</p>
                    <p className="text-xs text-gray-400">Vence {formatDate(pag.vencimento)}</p>
                  </div>
                  <span className="text-sm font-semibold text-vinho">{formatCurrency(pag.valor)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <DollarSign size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum pagamento pendente</p>
            </div>
          )}
        </div>
      </div>

      {tarefasUrgentes && tarefasUrgentes.length > 0 && (
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title text-base flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" /> Tarefas urgentes
            </h3>
            <Link href="/dashboard/tarefas" className="text-xs text-vinho hover:underline">Ver todas</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {tarefasUrgentes.map((t: any) => (
              <span key={t.id} className="badge bg-red-100 text-red-700 text-xs px-3 py-1">{t.titulo}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
