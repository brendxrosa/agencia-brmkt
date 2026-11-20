import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AlertTriangle, Clock, CalendarDays, FileText, DollarSign,
  Hourglass, RefreshCcw, CheckCircle2, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { differenceInDays, parseISO, addDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

const FINALIZADOS = ['aprovado', 'publicado', 'agendado', 'postado', 'concluido']

function hojeBahia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }) // YYYY-MM-DD
}

function Secao({ titulo, cor, icon: Icon, itens }: {
  titulo: string; cor: string; icon: any; itens: { key: string; href: string; esquerda: string; titulo: string; direita?: string; ponto?: string }[]
}) {
  if (itens.length === 0) return null
  return (
    <div className={'card border-l-4 ' + cor}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={17} />
        <h3 className="font-semibold text-sm text-gray-800">{titulo}</h3>
        <span className="text-xs text-gray-400">({itens.length})</span>
      </div>
      <div className="space-y-1">
        {itens.slice(0, 6).map(i => (
          <Link key={i.key} href={i.href}
            className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-creme/50 transition-all">
            {i.ponto && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: i.ponto }} />}
            <span className="text-xs text-gray-400 w-14 flex-shrink-0">{i.esquerda}</span>
            <span className="text-sm text-gray-800 truncate flex-1">{i.titulo}</span>
            {i.direita && <span className="text-xs text-gray-500 flex-shrink-0">{i.direita}</span>}
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
          </Link>
        ))}
        {itens.length > 6 && <p className="text-xs text-gray-400 px-2 pt-1">+ {itens.length - 6} outros</p>}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const hoje = hojeBahia()
  const amanha = format(addDays(parseISO(hoje), 1), 'yyyy-MM-dd')

  const [
    { data: posts },
    { data: clientes },
    { data: pagamentos },
    { data: eventos },
  ] = await Promise.all([
    supabase.from('posts').select('id, titulo, tipo, data_publicacao, status_interno, status_cliente, clientes(nome, cor)')
      .not('data_publicacao', 'is', null).lte('data_publicacao', format(addDays(parseISO(hoje), 7), 'yyyy-MM-dd')),
    supabase.from('clientes').select('id, nome, cor, data_fim_contrato').eq('status', 'ativo'),
    supabase.from('pagamentos').select('id, valor, vencimento, status, clientes(nome, cor)')
      .in('status', ['pendente', 'atrasado']).order('vencimento'),
    supabase.from('eventos').select('id, titulo, data_inicio, dia_todo')
      .gte('data_inicio', hoje + 'T00:00:00-03:00').lte('data_inicio', hoje + 'T23:59:59-03:00').order('data_inicio'),
  ])

  const abertos = (posts || []).filter((p: any) => !FINALIZADOS.includes(p.status_interno))
  const dia = (p: any) => String(p.data_publicacao).slice(0, 10)
  const nome = (p: any) => p.clientes?.nome || ''
  const mk = (p: any, direita?: string) => ({
    key: p.id as string, href: '/dashboard/kanban', ponto: p.clientes?.cor as string | undefined,
    esquerda: formatDate(dia(p), 'dd/MM'), titulo: nome(p) + ' · ' + p.titulo, direita,
  })

  const atrasados = abertos.filter((p: any) => dia(p) < hoje).map((p: any) => mk(p, p.status_interno))
  const paraHojeAmanha = abertos.filter((p: any) => dia(p) === hoje || dia(p) === amanha)
    .map((p: any) => mk(p, (dia(p) === hoje ? 'hoje' : 'amanhã') + ' · ' + p.status_interno))
  const alteracoes = (posts || []).filter((p: any) => p.status_interno === 'alteracao' || p.status_cliente === 'reprovado')
    .map((p: any) => mk(p, 'ajuste pedido'))
  const aguardando = (posts || []).filter((p: any) => ['aguardando_cliente', 'aprovacao_arte'].includes(p.status_interno))
    .map((p: any) => mk(p, 'aguarda cliente'))

  const contratos = (clientes || []).filter((c: any) => {
    if (!c.data_fim_contrato) return false
    const d = differenceInDays(parseISO(c.data_fim_contrato), new Date())
    return d >= 0 && d <= 30
  }).map((c: any) => ({
    key: c.id as string, href: '/dashboard/clientes', ponto: c.cor as string | undefined,
    esquerda: formatDate(c.data_fim_contrato, 'dd/MM'), titulo: c.nome as string,
    direita: differenceInDays(parseISO(c.data_fim_contrato), new Date()) + ' dia(s)',
  }))

  const cobrancas = (pagamentos || []).filter((p: any) => {
    if (p.status === 'atrasado') return true
    return differenceInDays(parseISO(p.vencimento), new Date()) <= 5
  }).map((p: any) => ({
    key: p.id as string, href: '/dashboard/financeiro', ponto: p.clientes?.cor as string | undefined,
    esquerda: formatDate(p.vencimento, 'dd/MM'), titulo: (p.clientes?.nome || 'Cliente') as string,
    direita: formatCurrency(p.valor) + (p.status === 'atrasado' ? ' · atrasado' : ''),
  }))

  const agendaHoje = (eventos || []).map((e: any) => ({
    key: e.id as string, href: '/dashboard/agenda',
    esquerda: e.dia_todo ? 'dia todo' : new Date(e.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }),
    titulo: e.titulo as string,
  }))

  const total = atrasados.length + paraHojeAmanha.length + alteracoes.length + aguardando.length + contratos.length + cobrancas.length
  const hora = Number(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Bahia' }))
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">{saudacao}, Brenda 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {formatDate(new Date().toISOString(), "EEEE, dd 'de' MMMM")} ·{' '}
          {total === 0 ? 'nada pegando fogo' : total + ' coisa(s) pedindo atenção'}
        </p>
      </div>

      {total === 0 && agendaHoje.length === 0 && (
        <div className="card flex items-center gap-3 border-l-4 border-l-emerald-500">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <p className="text-sm text-gray-700">Tudo em dia. Bora criar conteúdo novo?</p>
        </div>
      )}

      <Secao titulo="Atrasados — data passou e não foi publicado" cor="border-l-red-500" icon={AlertTriangle} itens={atrasados} />
      <Secao titulo="Hoje e amanhã — ainda não está pronto" cor="border-l-orange-500" icon={Clock} itens={paraHojeAmanha} />
      <Secao titulo="Cliente pediu ajuste" cor="border-l-rose-400" icon={RefreshCcw} itens={alteracoes} />
      <Secao titulo="Aguardando aprovação do cliente" cor="border-l-yellow-400" icon={Hourglass} itens={aguardando} />
      <Secao titulo="Cobranças (vencendo em até 5 dias ou atrasadas)" cor="border-l-emerald-600" icon={DollarSign} itens={cobrancas} />
      <Secao titulo="Contratos terminando em até 30 dias" cor="border-l-purple-400" icon={FileText} itens={contratos} />
      <Secao titulo="Na sua agenda hoje" cor="border-l-blue-400" icon={CalendarDays} itens={agendaHoje} />
    </div>
  )
}
