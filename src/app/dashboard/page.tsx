import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import {
  differenceInDays, parseISO, addDays, format,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns'
import ListaTarefas, { type ItemLista } from '@/components/home/ListaTarefas'
import AbasHome, { type LinhaDinheiro } from '@/components/home/AbasHome'

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
    supabase.from('posts').select('id, titulo, tipo, data_publicacao, status_interno, clientes(nome, cor)')
      .gte('data_publicacao', iniMesISO).lte('data_publicacao', fimMesISO + 'T23:59:59'),
    supabase.from('duvidas_clientes').select('id, pergunta, clientes(nome, cor)').eq('respondida', false),
    supabase.from('eventos').select('id, titulo, data_inicio, tipo, clientes(nome, cor)').eq('status', 'pendente'),
  ])

  const nomesAtivos = new Set((clientes || []).map((c: any) => c.nome))
  const so = (arr: any[] | null) => (arr || []).filter((x: any) => !x.clientes?.nome || nomesAtivos.has(x.clientes.nome))
  const abertos = so(posts).filter((p: any) => !FINALIZADOS.includes(p.status_interno))
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
  ;so(posts).filter((p: any) => p.status_interno === 'alteracao' || p.status_cliente === 'reprovado').forEach((p: any) =>
    add({ key: 'a' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, titulo: nome(p) + ' · ' + p.titulo, quando: 'Cliente pediu ajuste', area: 'Conteúdo', grupo: 'today' }))
  ;so(posts).filter((p: any) => p.status_interno === 'aprovado' && dia(p) <= daqui7).forEach((p: any) =>
    add({ key: 'ap' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, titulo: nome(p) + ' · ' + p.titulo, quando: 'Aprovado, pode agendar', area: 'Conteúdo', grupo: 'week' }))
  ;so(posts).filter((p: any) => ['aguardando_cliente', 'aprovacao_arte'].includes(p.status_interno)).forEach((p: any) =>
    add({ key: 'w' + p.id, href: '/dashboard/kanban', cor: p.clientes?.cor, titulo: nome(p) + ' · ' + p.titulo, quando: 'Esperando a cliente', area: 'Aprovação', grupo: 'wait' }))
  ;so(docs).forEach((d: any) => {
    const t = (d.clientes?.nome ? d.clientes.nome + ' · ' : '') + d.titulo
    if (d.status_aprovacao === 'aguardando') add({ key: 'd' + d.id, href: '/dashboard/docs', cor: d.clientes?.cor, titulo: t, quando: dias(d.updated_at) + ' dia(s) esperando aprovação', area: 'Docs', grupo: 'wait' })
    if (d.status_aprovacao === 'reprovado') add({ key: 'dr' + d.id, href: '/dashboard/docs', cor: d.clientes?.cor, titulo: t, quando: 'Reprovado, precisa de ajuste', area: 'Docs', grupo: 'today' })
    if (d.status_aprovacao === 'rascunho' && d.cliente_id) add({ key: 'dd' + d.id, href: '/dashboard/docs', cor: d.clientes?.cor, titulo: t, quando: 'Rascunho ainda não enviado', area: 'Docs', grupo: 'week' })
  })

  // Dinheiro
  ;so(pagamentos).forEach((p: any) => {
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
  ;so(tarefasAbertas).forEach((t: any) => {
    const p = t.prazo ? String(t.prazo).slice(0, 10) : null
    const grupo: ItemLista['grupo'] = !p ? 'wait' : p < hoje ? 'late' : p === hoje ? 'today' : p <= daqui7 ? 'week' : 'wait'
    add({
      key: 't' + t.id, tarefaId: t.id, cor: t.clientes?.cor, grupo,
      titulo: (t.clientes?.nome ? t.clientes.nome + ' · ' : '') + t.titulo,
      quando: p ? formatDate(p, 'dd/MM') : 'Sem prazo', area: 'Tarefa',
    })
  })

  itens.sort((a, b) => ORDEM[a.grupo] - ORDEM[b.grupo])
  const concluidas: ItemLista[] = so(tarefasFeitas).map((t: any) => ({
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
  const postsDoDia = (d: Date) => so(postsMes).filter((p: any) => String(p.data_publicacao).slice(0, 10) === format(d, 'yyyy-MM-dd'))
  const clientesLegenda = (clientes || [])

  const dinheiro: LinhaDinheiro[] = itens.filter(i => i.area === 'Dinheiro').map(i => ({
    key: i.key, titulo: i.titulo, quando: i.quando,
    chip: i.grupo === 'late' ? 'Atrasado' : i.grupo === 'wait' ? 'Aguardando' : 'Pendente',
    cls: i.grupo === 'late' ? 'red' : i.grupo === 'wait' ? 'gry' : 'yel',
  }))
  const curto = (n?: string) => !n ? 'BR MKT' : n.replace(/^Cl[ií]nica\s+/i, '').split(' ')[0]
  const corDe = (p: any) => p.clientes?.cor || '#5A1A2B'
  const ABREV: Record<string, string> = { reels: 'Reel', carrossel: 'Car', feed: 'Est', stories: 'Sto', tiktok: 'Tik' }
  const TIPO: Record<string, string> = { reels: 'Reels', carrossel: 'Carrossel', feed: 'Estático', stories: 'Stories', tiktok: 'TikTok' }
  const postsSemana = (d: Date) => so(posts).filter((p: any) => String(p.data_publicacao).slice(0, 10) === format(d, 'yyyy-MM-dd') && !['publicado', 'postado'].includes(p.status_interno))
  const tarefasSemana = (d: Date) => so(tarefasAbertas).filter((t: any) => t.prazo && String(t.prazo).slice(0, 10) === format(d, 'yyyy-MM-dd'))
  const listaMes = so(postsMes).filter((p: any) => String(p.data_publicacao).slice(0, 7) === ym).sort((x: any, y: any) => String(x.data_publicacao).localeCompare(String(y.data_publicacao)))
  const docsEsperando = so(docs).filter((d: any) => d.status_aprovacao === 'aguardando')

  const CSS = [
    '.hm{font-family:"Bricolage Grotesque",sans-serif;color:#2B1218}',
    '.hm a{color:#5A1A2B}.hm a:hover{color:#B0546E}',
    '.hm-card{background:#FBF6EC;border-radius:22px;padding:28px;box-sizing:border-box}',
    '.hm-chip{display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:500;line-height:1.4;white-space:nowrap}',
    '.hm-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid #E3D3B6}',
    '.hm-h2{font-size:34px;line-height:1.1;margin:0 0 4px;color:#5A1A2B;font-weight:400}',
    '.hm-sub{margin:0 0 18px;font-size:14px;color:#6B4A52}',
    '.hm .red{background:#F8D7D3;color:#8A1F1F}.hm .yel{background:#F6E7A8;color:#5E4B00}.hm .grn{background:#D7E9C5;color:#2E5314}.hm .pnk{background:#F5CFC8;color:#5A1A2B}.hm .lim{background:#D4F25A;color:#2B3A00}.hm .gry{background:#E9DCC4;color:#4A3A3F}.hm .vin{background:#5A1A2B;color:#F1E6D2}.hm .ros{background:#B0546E;color:#fff}',
    '.hm-day{min-height:96px;padding:6px;border-radius:10px;background:#F1E6D2;font-size:12px;box-sizing:border-box;min-width:0}',
    '.hm-dh{font-size:12px;color:#6B4A52;text-align:center}',
    '.hm-tabbtn{padding:10px 22px;border-radius:999px;font-size:15px;font-weight:500;border:1px solid #D9C7A6;font-family:inherit;cursor:pointer;min-height:44px}',
    '.hm-chk{width:26px;height:26px;border-radius:8px;border:2px solid #B0546E;background:#fff;cursor:pointer;flex:none;padding:0;color:#2E5314;font-weight:700;font-size:14px;font-family:inherit}',
    '.hm-sec{border-radius:18px;overflow:hidden;background:#fff;border:1px solid #EADBBE;text-decoration:none;color:#2B1218;display:block}',
    '.hm-sec .lab{padding:14px 18px;font-size:15px;font-weight:500}',
    '@media(max-width:640px){.hm-card{padding:18px}.hm-h2{font-size:28px}.hm-day{min-height:56px;padding:3px;font-size:11px}.hm-cellchip{font-size:9px!important;padding:1px 3px!important;white-space:normal!important;line-height:1.25!important}}',
  ].join('\n')

  const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const dataExtenso = cap1(formatDate(new Date().toISOString(), "EEEE, d 'de' MMMM"))
  const faixaSemana = formatDate(hojeD, 'd') + ' a ' + formatDate(addDays(hojeD, 6), "d 'de' MMMM")

  return (
    <div className="hm">
      <style>{CSS}</style>

      <section className="px-4 lg:px-12 pt-6 lg:pt-10 pb-[56px] lg:pb-[72px]" style={{ background: '#5A1A2B', color: '#F1E6D2', borderRadius: '0 0 40px 40px' }}>
        <p style={{ margin: '0 0 8px', fontSize: 15, color: '#F5CFC8', textAlign: 'center' }}>{dataExtenso}</p>
        <h1 className="font-display text-[44px] lg:text-[76px] text-center" style={{ margin: '0 0 22px', lineHeight: 1, fontWeight: 400 }}>
          Oi, Brenda.<br /><span style={{ color: '#F5CFC8', fontStyle: 'italic' }}>Esse é o seu dia.</span>
        </h1>
        <div className="grid grid-cols-4 gap-2 lg:gap-3.5 max-w-[720px] mx-auto">
          {[
            { n: nLate, t: 'atrasadas', st: { background: '#8A1F2E' } },
            { n: nToday, t: 'para hoje', st: { background: '#B0546E' } },
            { n: nWeek, t: 'nesta semana', st: { background: '#F5CFC8', color: '#5A1A2B' } },
            { n: concluidas.length, t: 'concluídas', st: { background: '#D4F25A', color: '#2B3A00' } },
          ].map(c => (
            <div key={c.t} className="rounded-[14px] lg:rounded-[18px] px-1.5 py-3 lg:px-[26px] lg:py-[18px] text-center" style={c.st}>
              <div className="font-display text-[30px] lg:text-[48px]" style={{ lineHeight: 1 }}>{c.n}</div>
              <div className="text-[11px] lg:text-sm" style={{ marginTop: 4 }}>{c.t}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5 lg:px-12" style={{ marginTop: -36 }}>
        <div id="tarefas" style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div className="hm-card" style={{ flex: '1 1 480px', minWidth: 0 }}>
            <h2 className="hm-h2 font-display">O que tem que fazer</h2>
            <p className="hm-sub">Tarefas, posts, prazos e o que falta produzir, numa lista só. Clique no quadradinho pra marcar como feito.</p>
            <ListaTarefas itens={itens} concluidas={concluidas} />
          </div>

          <div className="hm-card" style={{ flex: '1 1 480px', minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h2 className="hm-h2 font-display">Agenda da semana</h2>
              <Link href="/dashboard/minha-agenda" className="hm-chip lim" style={{ textDecoration: 'none' }}>Abrir agenda</Link>
            </div>
            <p className="hm-sub">{faixaSemana} · reuniões, posts e prazos. Toque num item pra abrir.</p>
            <div className="md:hidden">
              {semana.map(d => {
                const k = format(d, 'yyyy-MM-dd')
                const ev = eventosDoDia(d), ps = postsSemana(d), ts = tarefasSemana(d)
                const vazio = ev.length + ps.length + ts.length === 0
                const cp = { whiteSpace: 'normal', textDecoration: 'none', display: 'block', marginBottom: 4, borderRadius: 10 } as const
                return (
                  <div key={k} style={{ display: 'flex', gap: 12, padding: '10px 8px', borderTop: '1px solid #E3D3B6', borderRadius: 10, background: k === hoje ? '#F5CFC8' : 'transparent' }}>
                    <div style={{ width: 54, flex: 'none', fontSize: 13, color: '#6B4A52' }}>{DIAS[d.getDay()]} {format(d, 'd')}{k === hoje ? <div style={{ fontSize: 11, color: '#5A1A2B', fontWeight: 700 }}>hoje</div> : null}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {vazio && <span style={{ fontSize: 13, color: '#9a8088' }}>livre</span>}
                      {ev.map((e: any) => <Link key={e.id} href="/dashboard/minha-agenda" className="hm-chip lim" style={cp}>{e.titulo}</Link>)}
                      {ps.map((p: any) => <Link key={p.id} href="/dashboard/calendario" className="hm-chip pnk" style={cp}>{curto(p.clientes?.nome)} · {TIPO[p.tipo] || 'post'} · {p.titulo}</Link>)}
                      {ts.map((t: any) => <Link key={t.id} href="/dashboard/tarefas" className="hm-chip gry" style={cp}>{t.titulo}</Link>)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hidden md:block">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
              {semana.map(d => <div key={'h' + d.toISOString()} className="hm-dh">{DIAS[d.getDay()]} {format(d, 'd')}</div>)}
              {semana.map(d => {
                const hojeCel = format(d, 'yyyy-MM-dd') === hoje
                const chip = { fontSize: 11, padding: '1px 6px', marginBottom: 3, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' } as const
                return (
                  <div key={d.toISOString()} className="hm-day" style={{ minHeight: 220, ...(hojeCel ? { background: '#F5CFC8' } : {}) }}>
                    {eventosDoDia(d).map((e: any) => (
                      <div key={e.id} className="hm-chip lim" style={chip}>{e.titulo}</div>
                    ))}
                    {postsSemana(d).map((p: any) => (
                      <div key={p.id} className="hm-chip pnk" style={chip}>Post {curto(p.clientes?.nome)}</div>
                    ))}
                    {tarefasSemana(d).map((t: any) => (
                      <div key={t.id} className="hm-chip gry" style={chip}>{t.titulo}</div>
                    ))}
                  </div>
                )
              })}
            </div>
            </div>
          </div>
        </div>

        <div className="hm-card" id="conteudo" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h2 className="hm-h2 font-display">Meu conteúdo · calendário geral</h2>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className="hm-chip vin">BR MKT</span>
              {clientesLegenda.map((c: any) => (
                <span key={c.id} className="hm-chip" style={{ background: c.cor || '#B0546E', color: '#fff' }}>{curto(c.nome)}</span>
              ))}
            </span>
          </div>
          <p className="hm-sub">{cap1(formatDate(hojeD, "MMMM 'de' yyyy"))} · tudo que vai ser postado, da Brenda Rosa Marketing e dos clientes.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
            {DIAS.map(d => <div key={d} className="hm-dh">{d}</div>)}
            {diasMes.map(d => {
              const k = format(d, 'yyyy-MM-dd')
              const fora = d.getMonth() !== hojeD.getMonth()
              return (
                <div key={k} className="hm-day" style={{ ...(k === hoje ? { background: '#F5CFC8' } : {}), ...(fora ? { opacity: 0.45 } : {}) }}>
                  {fora ? '' : format(d, 'd')}
                  {postsDoDia(d).map((p: any) => {
                    const pub = ['publicado', 'postado'].includes(p.status_interno)
                    return (
                      <Link key={p.id} href="/dashboard/calendario" title={p.titulo}
                        className="hm-chip hm-cellchip"
                        style={{ fontSize: 11, padding: '1px 6px', marginTop: 3, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none', background: corDe(p), color: '#fff', opacity: pub ? 0.6 : 1 }}>
                        <span className="hidden sm:inline">{curto(p.clientes?.nome)} · {pub ? 'publicado' : (TIPO[p.tipo] || p.tipo || 'post')}</span>
                        <span className="sm:hidden">{curto(p.clientes?.nome).slice(0, 4)} {pub ? '✓' : (ABREV[p.tipo] || 'post')}</span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <details style={{ marginTop: 14 }}>
            <summary className="hm-tabbtn" style={{ display: 'inline-block', fontSize: 13, color: '#5A1A2B' }}>Ver lista do mês ({listaMes.length})</summary>
            {listaMes.length === 0 && <p className="hm-sub" style={{ margin: '12px 0 0' }}>Nada marcado neste mês.</p>}
            {listaMes.map((p: any) => (
              <div key={p.id} className="hm-row">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 99, background: corDe(p), flex: 'none' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{p.titulo}</div>
                    <div style={{ fontSize: 13, color: '#6B4A52' }}>{formatDate(String(p.data_publicacao).slice(0, 10), 'dd/MM')} · {curto(p.clientes?.nome)} · {TIPO[p.tipo] || p.tipo || 'post'}</div>
                  </div>
                </div>
                <span className={'hm-chip ' + (['publicado', 'postado'].includes(p.status_interno) ? 'grn' : 'gry')}>{['publicado', 'postado'].includes(p.status_interno) ? 'Publicado' : 'A postar'}</span>
              </div>
            ))}
          </details>
        </div>

        <div className="hm-card" id="inbox" style={{ marginTop: 24, background: '#F5CFC8' }}>
          <h2 className="hm-h2 font-display">Caixa de entrada</h2>
          <p className="hm-sub" style={{ color: '#5A1A2B' }}>O que os clientes mandaram e está esperando você.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Link href="/dashboard/minha-agenda" style={{ background: '#FBF6EC', borderRadius: 16, padding: 20, textDecoration: 'none', color: '#2B1218', display: 'block' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Pedidos novos</div>
              <div style={{ fontSize: 14, color: '#6B4A52' }}>Reunião ou captação pedida pela cliente. Você aprova ou recusa.</div>
              <span className={'hm-chip ' + (so(pedidos).length ? 'yel' : 'gry')} style={{ marginTop: 12 }}>{so(pedidos).length ? so(pedidos).length + ' novo(s)' : 'nenhum agora'}</span>
              {so(pedidos).slice(0, 3).map((p: any) => <div key={p.id} style={{ fontSize: 13, color: '#6B4A52', marginTop: 6 }}>{curto(p.clientes?.nome)} · {p.titulo}</div>)}
            </Link>
            <Link href="/dashboard/duvidas" style={{ background: '#FBF6EC', borderRadius: 16, padding: 20, textDecoration: 'none', color: '#2B1218', display: 'block' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Dúvidas abertas</div>
              <div style={{ fontSize: 14, color: '#6B4A52' }}>A cliente pergunta pelo formulário. Você responde e marca como respondida.</div>
              <span className={'hm-chip ' + (so(duvidas).length ? 'yel' : 'gry')} style={{ marginTop: 12 }}>{so(duvidas).length ? so(duvidas).length + ' aberta(s)' : 'nenhuma agora'}</span>
              {so(duvidas).slice(0, 3).map((d: any) => <div key={d.id} style={{ fontSize: 13, color: '#6B4A52', marginTop: 6 }}>{curto(d.clientes?.nome)} · {d.pergunta}</div>)}
            </Link>
            <Link href="/dashboard/docs" style={{ background: '#FBF6EC', borderRadius: 16, padding: 20, textDecoration: 'none', color: '#2B1218', display: 'block' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Documentos aguardando aprovação</div>
              <div style={{ fontSize: 14, color: '#6B4A52' }}>{docsEsperando[0] ? (docsEsperando[0] as any).titulo : 'Calendários e planejamentos enviados que a cliente ainda não aprovou.'}</div>
              <span className={'hm-chip ' + (docsEsperando.length ? 'yel' : 'gry')} style={{ marginTop: 12 }}>{docsEsperando.length ? docsEsperando.length + ' aguardando' : 'nenhum agora'}</span>
            </Link>
          </div>
        </div>

        <AbasHome
          dinheiro={dinheiro}
          alerta='Faltando 15 dias para o último post do ciclo, o calendário do próximo precisa estar pronto. O alerta aparece aqui e em "O que tem que fazer" sozinho.'
        />
      </div>
    </div>
  )
}
