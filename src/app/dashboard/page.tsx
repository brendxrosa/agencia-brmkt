import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import {
  differenceInDays, parseISO, addDays, format,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns'
import ListaTarefas, { type ItemLista } from '@/components/home/ListaTarefas'

export const dynamic = 'force-dynamic'

const FINALIZADOS = ['aprovado', 'publicado', 'agendado', 'postado', 'concluido']
const ORDEM = { late: 0, today: 1, week: 2, wait: 3 } as const
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function hojeBahia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' })
}

function quinzeUtil(ym: string) {
  const [a, m] = ym.split('-').map(Number)
  let c = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(a, m - 1, d)
    if (dt.getMonth() !== m - 1) break
    const w = dt.getDay()
    if (w !== 0 && w !== 6) { c++; if (c === 15) return ym + '-' + String(d).padStart(2, '0') }
  }
  return ym + '-28'
}

export default async function DashboardPage() {
  const supabase = createClient()
  const hoje = hojeBahia()
  const hojeD = parseISO(hoje)
  const amanha = format(addDays(hojeD, 1), 'yyyy-MM-dd')
  const daqui7 = format(addDays(hojeD, 7), 'yyyy-MM-dd')
  const iniMes = startOfWeek(startOfMonth(hojeD))
  const fimMes = endOfWeek(endOfMonth(hojeD))
  const iniMesISO = format(iniMes, 'yyyy-MM-dd')
  const fimMesISO = format(fimMes, 'yyyy-MM-dd')

  const [
    { data: posts },
    { data: clientes },
    { data: pagamentos },
    { data: eventos },
    { data: docs },
    { data: rotinas },
    { data: tarefasAbertas },
    { data: tarefasFeitas },
    { data: postsMes },
    { data: duvidas },
    { data: pedidos },
  ] = await Promise.all([
    supabase.from('posts').select('id, titulo, tipo, data_publicacao, status_interno, status_cliente, clientes(nome, cor)')
      .not('data_publicacao', 'is', null).lte('data_publicacao', daqui7),
    supabase.from('clientes').select('id, nome, cor, data_fim_contrato').eq('status', 'ativo'),
    supabase.from('pagamentos').select('id, valor, vencimento, status, clientes(nome, cor)')
      .in('status', ['pendente', 'atrasado']).order('vencimento'),
    supabase.from('eventos').select('id, titulo, data_inicio, dia_todo, tipo, status')
      .gte('data_inicio', hoje + 'T00:00:00-03:00').lte('data_inicio', daqui7 + 'T23:59:59-03:00').order('data_inicio'),
    supabase.from('docs').select('id, titulo, status_aprovacao, cliente_id, updated_at, clientes(nome, cor)')
      .in('status_aprovacao', ['rascunho', 'aguardando', 'reprovado']),
    supabase.from('rotinas_mensais').select('rotina, mes, valor, nf_gerada, nf_enviada, pago'),
    supabase.from('tarefas').select('id, titulo, prazo, status, clientes(nome, cor)').neq('status', 'concluida'),
    supabase.from('tarefas').select('id, titulo, prazo, status, clientes(nome, cor)').eq('status', 'concluida').order('created_at', { ascending: false }).limit(20),
    supabase.from('posts').select('id, titulo, data_publicacao, status_interno, clientes(nome, cor)')
      .gte('data_publicacao', iniMesISO).lte('data_publicacao', fimMesISO + 'T23:59:59'),
    supabase.from('duvidas_clientes').select('id, pergunta, clientes(nome, cor)').eq('respondida', false),
    supabase.from('eventos').select('id, titulo, data_inicio, tipo, clientes(nome, cor)').eq('status', 'pendente'),
  ])

  const abertos = (posts || []).filter((p: any) => !FINALIZADOS.includes(p.status_interno))
  const dia = (p: any) => String(p.data_publicacao).slice(0, 10)
  const nome = (p: any) => p.clientes?.nome || ''
  const dias = (iso?: string) => iso ? Math.max(0, differenceInDays(new Date(), new Date(iso))) : 0

  const itens: ItemLista[] = []
  const add = (i: ItemLista) => itens.push(i)

  // Posts
  abertos.forEach((p: any) => {
    const d = dia(p)
    const base = { key: 'p' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, area: 'Conteúdo · ' + p.status_interno }
    const titulo = nome(p) + ' · ' + p.titulo
    if (d < hoje) add({ ...base, titulo, quando: 'Era pra sair ' + formatDate(d, 'dd/MM'), grupo: 'late' })
    else if (d === hoje) add({ ...base, titulo, quando: 'Sai hoje', grupo: 'today' })
    else if (d === amanha) add({ ...base, titulo, quando: 'Sai amanhã', grupo: 'week' })
    else add({ ...base, titulo, quando: 'Sai ' + formatDate(d, 'dd/MM'), grupo: 'week' })
  })
  ;(posts || []).filter((p: any) => p.status_interno === 'alteracao' || p.status_cliente === 'reprovado').forEach((p: any) =>
    add({ key: 'a' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, titulo: nome(p) + ' · ' + p.titulo, quando: 'Cliente pediu ajuste', area: 'Conteúdo', grupo: 'today' }))
  ;(posts || []).filter((p: any) => p.status_interno === 'aprovado' && dia(p) <= daqui7).forEach((p: any) =>
    add({ key: 'ap' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, titulo: nome(p) + ' · ' + p.titulo, quando: 'Aprovado, pode agendar', area: 'Conteúdo', grupo: 'week' }))
  ;(posts || []).filter((p: any) => ['aguardando_cliente', 'aprovacao_arte'].includes(p.status_interno)).forEach((p: any) =>
    add({ key: 'w' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, titulo: nome(p) + ' · ' + p.titulo, quando: 'Esperando a cliente', area: 'Aprovação', grupo: 'wait' }))
  ;(docs || []).forEach((d: any) => {
    const t = (d.clientes?.nome ? d.clientes.nome + ' · ' : '') + d.titulo
    if (d.status_aprovacao === 'aguardando') add({ key: 'd' + d.id, href: '/dashboard/docs', cor: d.clientes?.cor, titulo: t, quando: dias(d.updated_at) + ' dia(s) esperando aprovação', area: 'Docs', grupo: 'wait' })
    if (d.status_aprovacao === 'reprovado') add({ key: 'dr' + d.id, href: '/dashboard/docs', cor: d.clientes?.cor, titulo: t, quando: 'Reprovado, precisa de ajuste', area: 'Docs', grupo: 'today' })
    if (d.status_aprovacao === 'rascunho' && d.cliente_id) add({ key: 'dd' + d.id, href: '/dashboard/docs', cor: d.clientes?.cor, titulo: t, quando: 'Rascunho ainda não enviado', area: 'Docs', grupo: 'week' })
  })

  // Dinheiro
  ;(pagamentos || []).forEach((p: any) => {
    const dd = differenceInDays(parseISO(p.vencimento), new Date())
    if (p.status !== 'atrasado' && dd > 5) return
    add({
      key: 'pg' + p.id, href: '/dashboard/financeiro', cor: p.clientes?.cor,
      titulo: (p.clientes?.nome || 'Cliente') + ' · ' + formatCurrency(p.valor),
      quando: (p.status === 'atrasado' ? 'Atrasado, venceu ' : 'Vence ') + formatDate(p.vencimento, 'dd/MM'),
      area: 'Dinheiro', grupo: p.status === 'atrasado' ? 'late' : 'week',
    })
  })
  const ym = hoje.slice(0, 7)
  const diaMes = Number(hoje.slice(8))
  const nibsRow: any = (rotinas || []).find((r: any) => r.rotina === 'nibs' && r.mes === ym) || {}
  const dasRow: any = (rotinas || []).find((r: any) => r.rotina === 'das' && r.mes === ym) || {}
  const limitePag = quinzeUtil(ym)
  const fin = '/dashboard/financeiro'
  if (!nibsRow.pago) {
    if (!nibsRow.nf_gerada && diaMes >= 11) add({ key: 'n1', href: fin, titulo: 'Gerar a nota da NIBS', quando: diaMes > 15 ? 'Passou do dia 15' : 'Dias 11 e 12', area: 'Dinheiro', grupo: diaMes > 15 ? 'late' : 'today' })
    else if (nibsRow.nf_gerada && !nibsRow.nf_enviada) add({ key: 'n2', href: fin, titulo: 'Enviar a nota da NIBS', quando: diaMes > 15 ? 'Passou do dia 15' : 'Antes do dia 15', area: 'Dinheiro', grupo: diaMes > 15 ? 'late' : 'today' })
    else if (nibsRow.nf_enviada) add({ key: 'n3', href: fin, titulo: hoje > limitePag ? 'NIBS ainda não pagou' : 'Aguardando pagamento da NIBS', quando: 'Até ' + formatDate(limitePag, 'dd/MM'), area: 'Dinheiro', grupo: hoje > limitePag ? 'late' : 'wait' })
  }
  if (!dasRow.pago && diaMes >= 10) add({ key: 'das', href: fin, titulo: 'DAS do MEI', quando: diaMes > 20 ? 'Venceu dia 20' : 'Vence dia 20', area: 'Dinheiro', grupo: diaMes > 20 ? 'late' : 'week' })

  // Contratos
  ;(clientes || []).forEach((c: any) => {
    if (!c.data_fim_contrato) return
    const d = differenceInDays(parseISO(c.data_fim_contrato), new Date())
    if (d >= 0 && d <= 30) add({ key: 'c' + c.id, href: '/dashboard/clientes', cor: c.cor, titulo: 'Contrato de ' + c.nome + ' termina', quando: formatDate(c.data_fim_contrato, 'dd/MM') + ' · ' + d + ' dia(s)', area: 'Clientes', grupo: 'week' })
  })

  // Tarefas cadastradas (essas têm quadradinho)
  ;(tarefasAbertas || []).forEach((t: any) => {
    const p = t.prazo ? String(t.prazo).slice(0, 10) : null
    const grupo: ItemLista['grupo'] = !p ? 'wait' : p < hoje ? 'late' : p === hoje ? 'today' : p <= daqui7 ? 'week' : 'wait'
    add({
      key: 't' + t.id, tarefaId: t.id, cor: t.clientes?.cor, grupo,
      titulo: (t.clientes?.nome ? t.clientes.nome + ' · ' : '') + t.titulo,
      quando: p ? formatDate(p, 'dd/MM') : 'Sem prazo', area: 'Tarefa',
    })
  })

  itens.sort((a, b) => ORDEM[a.grupo] - ORDEM[b.grupo])
  const concluidas: ItemLista[] = (tarefasFeitas || []).map((t: any) => ({
    key: 'tf' + t.id, tarefaId: t.id, cor: t.clientes?.cor, grupo: 'week' as const,
    titulo: (t.clientes?.nome ? t.clientes.nome + ' · ' : '') + t.titulo,
    quando: t.prazo ? formatDate(String(t.prazo).slice(0, 10), 'dd/MM') : 'Sem prazo', area: 'Tarefa',
  }))

  const nLate = itens.filter(i => i.grupo === 'late').length
  const nToday = itens.filter(i => i.grupo === 'today').length
  const nWeek = itens.filter(i => i.grupo === 'week').length

  // Agenda da semana
  const semana = eachDayOfInterval({ start: hojeD, end: addDays(hojeD, 6) })
  const eventosDoDia = (d: Date) => (eventos || []).filter((e: any) =>
    new Date(e.data_inicio).toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }) === format(d, 'yyyy-MM-dd'))

  // Calendário geral do mês
  const diasMes = eachDayOfInterval({ start: iniMes, end: fimMes })
  const postsDoDia = (d: Date) => (postsMes || []).filter((p: any) => String(p.data_publicacao).slice(0, 10) === format(d, 'yyyy-MM-dd'))
  const clientesLegenda = (clientes || [])

  const hora = Number(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Bahia' }))
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const dinheiro = itens.filter(i => i.area === 'Dinheiro').slice(0, 5)
  const docsEsperando = (docs || []).filter((d: any) => d.status_aprovacao === 'aguardando')

  return (
    <div className="space-y-6">
      {/* Capa */}
      <section className="bg-vinho text-offwhite rounded-[32px] px-6 lg:px-10 pt-8 pb-10">
        <p className="text-rosa-pale text-sm capitalize">{formatDate(new Date().toISOString(), "EEEE, dd 'de' MMMM")}</p>
        <h1 className="font-display text-5xl lg:text-7xl leading-none mt-2">
          {saudacao}, Brenda.<br /><span className="italic text-rosa-pale">Esse é o seu dia.</span>
        </h1>
        <div className="flex flex-wrap gap-3 mt-7">
          {[
            { n: nLate, t: 'atrasadas', cls: 'bg-[#8A1F2E] text-white' },
            { n: nToday, t: 'para hoje', cls: 'bg-rosa text-white' },
            { n: nWeek, t: 'nesta semana', cls: 'bg-rosa-pale text-vinho' },
            { n: concluidas.length, t: 'concluídas', cls: 'bg-lima text-tinta' },
          ].map(c => (
            <div key={c.t} className={'rounded-2xl px-6 py-4 min-w-[140px] ' + c.cls}>
              <div className="font-display text-5xl leading-none">{c.n}</div>
              <div className="text-sm mt-1">{c.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tarefas + Agenda */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-papel rounded-3xl p-6 lg:p-7">
          <h2 className="font-display text-3xl text-vinho">O que tem que fazer</h2>
          <p className="text-sm text-gray-500 mb-4">Posts, tarefas, prazos e dinheiro numa lista só. O quadradinho marca como feito.</p>
          <ListaTarefas itens={itens} concluidas={concluidas} />
          <Link href="/dashboard/tarefas" className="inline-block mt-4 text-sm text-rosa font-medium hover:underline">+ Nova tarefa</Link>
        </section>

        <section className="bg-papel rounded-3xl p-6 lg:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-vinho">Agenda da semana</h2>
              <p className="text-sm text-gray-500 mb-4">Próximos 7 dias: reuniões, captações e entregas.</p>
            </div>
            <Link href="/dashboard/minha-agenda" className="text-xs bg-lima text-tinta rounded-full px-3 py-1.5 font-medium whitespace-nowrap">Abrir agenda</Link>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {semana.map(d => (
              <div key={d.toISOString()} className="min-w-0">
                <p className="text-[11px] text-gray-500 text-center mb-1">{DIAS[d.getDay()]} {format(d, 'dd')}</p>
                <div className={'rounded-xl p-1.5 min-h-[180px] space-y-1 ' + (format(d, 'yyyy-MM-dd') === hoje ? 'bg-rosa-pale' : 'bg-offwhite')}>
                  {eventosDoDia(d).map((e: any) => (
                    <Link key={e.id} href="/dashboard/minha-agenda"
                      className="block text-[11px] leading-tight rounded-lg px-1.5 py-1 bg-white text-vinho truncate">{e.titulo}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Calendário geral */}
      <section className="bg-papel rounded-3xl p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-vinho">Calendário de conteúdo</h2>
            <p className="text-sm text-gray-500 mb-4 capitalize">{formatDate(hojeD, 'MMMM yyyy')} · tudo que vai ser postado, cada cliente na sua cor.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {clientesLegenda.map((c: any) => (
              <span key={c.id} className="text-xs rounded-full px-3 py-1 text-white" style={{ backgroundColor: c.cor || '#B0546E' }}>{c.nome}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS.map(d => <div key={d} className="text-[11px] text-gray-500 text-center">{d}</div>)}
          {diasMes.map(d => {
            const k = format(d, 'yyyy-MM-dd')
            const fora = d.getMonth() !== hojeD.getMonth()
            return (
              <div key={k} className={'rounded-xl p-1.5 min-h-[96px] ' + (k === hoje ? 'bg-rosa-pale' : fora ? 'bg-offwhite/50 opacity-60' : 'bg-offwhite')}>
                <p className="text-xs text-gray-600">{format(d, 'd')}</p>
                <div className="space-y-1 mt-1">
                  {postsDoDia(d).map((p: any) => (
                    <Link key={p.id} href="/dashboard/calendario"
                      className={'block text-[11px] leading-tight rounded-md px-1.5 py-1 text-white truncate ' + (p.status_interno === 'publicado' ? 'opacity-60' : '')}
                      style={{ backgroundColor: p.clientes?.cor || '#B0546E' }}
                      title={(p.clientes?.nome || '') + ' · ' + p.titulo}>
                      {p.titulo}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Posts já publicados ficam no calendário com a cor mais clara. Clique pra abrir.</p>
      </section>

      {/* Caixa de entrada */}
      <section className="bg-rosa-pale rounded-3xl p-6 lg:p-7">
        <h2 className="font-display text-3xl text-vinho">Caixa de entrada</h2>
        <p className="text-sm text-vinho/70 mb-4">O que os clientes mandaram e está esperando você.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/dashboard/minha-agenda" className="bg-papel rounded-2xl p-5 block hover:shadow-card-hover transition-all">
            <p className="font-bold text-tinta">Pedidos de reunião e captação</p>
            <p className="text-sm text-gray-500 mt-1">Pedidos que as clientes fizeram pelo portal. Você aprova ou recusa.</p>
            <span className="inline-block mt-3 text-xs rounded-full px-3 py-1 bg-creme">{(pedidos || []).length === 0 ? 'nenhum agora' : (pedidos || []).length + ' novo(s)'}</span>
            {(pedidos || []).slice(0, 3).map((p: any) => <p key={p.id} className="text-xs text-gray-600 mt-2 truncate">{p.clientes?.nome} · {p.titulo}</p>)}
          </Link>
          <Link href="/dashboard/duvidas" className="bg-papel rounded-2xl p-5 block hover:shadow-card-hover transition-all">
            <p className="font-bold text-tinta">Dúvidas abertas</p>
            <p className="text-sm text-gray-500 mt-1">Perguntas das clientes esperando resposta.</p>
            <span className="inline-block mt-3 text-xs rounded-full px-3 py-1 bg-creme">{(duvidas || []).length === 0 ? 'nenhuma agora' : (duvidas || []).length + ' aberta(s)'}</span>
            {(duvidas || []).slice(0, 3).map((d: any) => <p key={d.id} className="text-xs text-gray-600 mt-2 truncate">{d.clientes?.nome} · {d.pergunta}</p>)}
          </Link>
          <Link href="/dashboard/docs" className="bg-papel rounded-2xl p-5 block hover:shadow-card-hover transition-all">
            <p className="font-bold text-tinta">Documentos aguardando aprovação</p>
            <p className="text-sm text-gray-500 mt-1">Calendários e planejamentos enviados que a cliente ainda não aprovou.</p>
            <span className="inline-block mt-3 text-xs rounded-full px-3 py-1 bg-yellow-100 text-yellow-800">{docsEsperando.length === 0 ? 'nenhum agora' : docsEsperando.length + ' aguardando'}</span>
            {docsEsperando.slice(0, 3).map((d: any) => <p key={d.id} className="text-xs text-gray-600 mt-2 truncate">{d.clientes?.nome} · {d.titulo}</p>)}
          </Link>
        </div>
      </section>

      {/* Dinheiro + atalhos */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-papel rounded-3xl p-6 lg:p-7">
          <h2 className="font-display text-3xl text-vinho">Dinheiro</h2>
          <p className="text-sm text-gray-500 mb-3">O que vence ou está atrasado, na ordem.</p>
          {dinheiro.length === 0 && <p className="text-sm text-gray-500">Nada vencendo nos próximos dias.</p>}
          {dinheiro.map(i => (
            <Link key={i.key} href="/dashboard/financeiro" className="flex items-center justify-between gap-3 py-3 border-t border-creme first:border-t-0">
              <div className="min-w-0"><p className="font-medium text-tinta truncate">{i.titulo}</p><p className="text-xs text-gray-500">{i.quando}</p></div>
              <span className={'text-xs rounded-full px-3 py-1 flex-shrink-0 ' + (i.grupo === 'late' ? 'bg-red-100 text-red-800' : 'bg-creme text-tinta')}>{i.grupo === 'late' ? 'Atrasado' : 'A vencer'}</span>
            </Link>
          ))}
          <Link href="/dashboard/financeiro" className="inline-block mt-3 text-sm text-rosa font-medium hover:underline">Abrir financeiro completo</Link>
        </section>

        <section className="bg-papel rounded-3xl p-6 lg:p-7">
          <h2 className="font-display text-3xl text-vinho">Atalhos</h2>
          <p className="text-sm text-gray-500 mb-3">Estratégia, modelos e o resto da gestão.</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/docs" className="rounded-2xl p-4 bg-vinho text-offwhite font-display text-2xl">Estratégia BR MKT</Link>
            <Link href="/dashboard/docs" className="rounded-2xl p-4 bg-rosa text-white font-display text-2xl">Prompts e modelos</Link>
            <Link href="/dashboard/briefings" className="rounded-2xl p-4 bg-rosa-pale text-vinho font-display text-2xl">Briefings</Link>
            <Link href="/dashboard/relatorios" className="rounded-2xl p-4 bg-lima text-tinta font-display text-2xl">Relatórios</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
