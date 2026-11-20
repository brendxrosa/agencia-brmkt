'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, STATUS_POST_LABELS, STATUS_POST_CORES } from '@/lib/utils'
import { ChevronLeft, ChevronRight, X, Clock, MapPin, Link as LinkIcon, Paperclip, Video, Layout, Image as ImageIcon, Instagram, ImageOff, Pencil } from 'lucide-react'
import PostModal from '@/components/PostModal'
import FeedPreview, { capaDoPost } from '@/components/FeedPreview'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_LISTA = ['copy', 'aguardando_cliente', 'design', 'captacao', 'edicao', 'aprovacao_arte', 'aprovado', 'publicado']
const PRECISA_ARTE = ['aguardando_cliente', 'aprovacao_arte', 'aprovado', 'publicado']

function Modal({ open, onClose, children, largo }: { open: boolean; onClose: () => void; children: React.ReactNode; largo?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-3xl shadow-modal w-full max-h-[90vh] overflow-y-auto', largo ? 'max-w-3xl' : 'max-w-xl')}>{children}</div>
    </div>
  )
}

function IconeTipo({ tipo }: { tipo?: string }) {
  if (tipo === 'reels') return <Video size={11} />
  if (tipo === 'carrossel') return <Layout size={11} />
  return <ImageIcon size={11} />
}

export default function CalendarioPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [mes, setMes] = useState(new Date())
  const [dia, setDia] = useState<Date>(new Date())
  const [vista, setVista] = useState<'mes' | 'lista'>('mes')
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [post, setPost] = useState<any>(null)
  const [linkArte, setLinkArte] = useState('')
  const [salvandoLink, setSalvandoLink] = useState(false)
  const [evento, setEvento] = useState<any>(null)
  const [postCompleto, setPostCompleto] = useState<any>(null)
  const [feedAberto, setFeedAberto] = useState(false)
  const [feedCliente, setFeedCliente] = useState('')
  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: pf } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
      setUserName(pf?.nome || 'Brenda')
    }
    const inicio = format(startOfWeek(startOfMonth(mes)), 'yyyy-MM-dd')
    const fim = format(endOfWeek(endOfMonth(mes)), 'yyyy-MM-dd')
    const [{ data: p }, { data: e }, { data: c }] = await Promise.all([
      supabase.from('posts').select('*, clientes(nome, cor, instagram)').gte('data_publicacao', inicio).lte('data_publicacao', fim).order('data_publicacao'),
      supabase.from('eventos').select('*, clientes(nome, cor)').gte('data_inicio', inicio).lte('data_inicio', fim + 'T23:59:59').order('data_inicio'),
      supabase.from('clientes').select('id, nome, cor, instagram').order('nome'),
    ])
    setPosts(p || []); setEventos(e || []); setClientes(c || [])
  }
  useEffect(() => { carregar() }, [mes])

  const pf = posts.filter(p => filtroCliente === 'todos' || p.cliente_id === filtroCliente)
  const ef = eventos.filter(e => filtroCliente === 'todos' || e.cliente_id === filtroCliente)
  const postsDo = (d: Date) => pf.filter(p => p.data_publicacao && isSameDay(parseISO(p.data_publicacao), d))
  const eventosDo = (d: Date) => ef.filter(e => isSameDay(parseISO(e.data_inicio), d))
  const semArte = (p: any) => PRECISA_ARTE.includes(p.status_interno) && !capaDoPost(p) && !p.link_externo && !(p.midias_urls || []).length

  const dias = eachDayOfInterval({ start: startOfWeek(startOfMonth(mes)), end: endOfWeek(endOfMonth(mes)) })

  function abrirPost(p: any) { setPost(p); setLinkArte(p.link_externo || '') }

  async function mudarStatus(id: string, status: string) {
    await supabase.from('posts').update({ status_interno: status }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status_interno: status } : p))
    setPost((p: any) => p && p.id === id ? { ...p, status_interno: status } : p)
  }

  async function salvarLink() {
    if (!post) return
    setSalvandoLink(true)
    const link = linkArte.trim() || null
    await supabase.from('posts').update({ link_externo: link }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, link_externo: link } : p))
    setPost({ ...post, link_externo: link })
    setSalvandoLink(false)
  }

  async function abrirFeed(clienteId: string) {
    const id = clienteId || clientes[0]?.id || ''
    setFeedCliente(id); setFeedAberto(true)
    if (!id) return
    const { data } = await supabase.from('posts').select('*').eq('cliente_id', id).not('data_publicacao', 'is', null).order('data_publicacao', { ascending: false }).limit(60)
    setFeedPosts(data || [])
  }

  const clienteFeed = clientes.find(c => c.id === feedCliente)
  const doMes = pf.filter(p => p.data_publicacao && isSameMonth(parseISO(p.data_publicacao), mes))
  const diasComPosts = Array.from(new Set(doMes.map(p => String(p.data_publicacao).slice(0, 10)))).sort()

  const Chip = ({ p }: { p: any }) => (
    <div onClick={ev => { ev.stopPropagation(); abrirPost(p) }}
      className="hidden sm:flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-tight cursor-pointer truncate hover:brightness-95"
      style={{ backgroundColor: (p.clientes?.cor || '#C2185B') + '26', borderLeft: '3px solid ' + (p.clientes?.cor || '#C2185B') }}>
      <IconeTipo tipo={p.tipo} />
      <span className="truncate text-gray-800">{p.titulo}</span>
      {semArte(p) && <ImageOff size={10} className="text-orange-500 flex-shrink-0" />}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Calendário</h1>
          <p className="text-gray-500 text-sm mt-1">{doMes.length} posts em {format(mes, 'MMMM', { locale: ptBR })}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select className="input text-sm py-1.5 w-auto" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="todos">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button onClick={() => abrirFeed(filtroCliente === 'todos' ? '' : filtroCliente)} className="btn-secondary text-sm flex items-center gap-2">
            <Instagram size={15} /> Prévia do feed
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setMes(m => subMonths(m, 1))} className="btn-ghost p-2"><ChevronLeft size={18} /></button>
            <button onClick={() => setMes(m => addMonths(m, 1))} className="btn-ghost p-2"><ChevronRight size={18} /></button>
            <button onClick={() => { setMes(new Date()); setDia(new Date()) }} className="btn-secondary text-xs px-3 py-1.5 ml-1">Hoje</button>
          </div>
          <h2 className="font-display text-lg font-semibold text-gray-800 capitalize">{format(mes, 'MMMM yyyy', { locale: ptBR })}</h2>
          <div className="flex gap-1 bg-creme rounded-xl p-1">
            {([['mes', 'Mês'], ['lista', 'Lista']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setVista(v)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', vista === v ? 'bg-white shadow-card text-vinho' : 'text-gray-500')}>{l}</button>
            ))}
          </div>
        </div>

        {vista === 'mes' ? (
          <>
            <div className="grid grid-cols-7 mb-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {dias.map(d => {
                const ps = postsDo(d); const es = eventosDo(d)
                return (
                  <div key={d.toISOString()} onClick={() => setDia(d)}
                    className={cn('bg-white min-h-16 sm:min-h-28 p-1 cursor-pointer hover:bg-creme/40', !isSameMonth(d, mes) && 'bg-gray-50', isSameDay(d, dia) && 'ring-2 ring-inset ring-vinho/60')}>
                    <div className={cn('text-xs w-6 h-6 flex items-center justify-center rounded-full mb-0.5', isToday(d) ? 'bg-vinho text-white' : isSameMonth(d, mes) ? 'text-gray-700' : 'text-gray-300')}>{format(d, 'd')}</div>
                    <div className="space-y-0.5">
                      {ps.slice(0, 3).map(p => <Chip key={p.id} p={p} />)}
                      {ps.length > 3 && <p className="hidden sm:block text-[11px] text-gray-400 px-1">+{ps.length - 3} mais</p>}
                      <div className="flex sm:hidden gap-0.5 flex-wrap justify-center">
                        {ps.slice(0, 4).map(p => <span key={p.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.clientes?.cor || '#C2185B' }} />)}
                      </div>
                      {es.slice(0, 1).map(e => <div key={e.id} className="hidden sm:block text-[11px] truncate rounded px-1 bg-vinho text-white">{e.titulo}</div>)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {diasComPosts.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum post neste mês.</p>}
            {diasComPosts.map(ds => (
              <div key={ds}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1 capitalize">{format(parseISO(ds), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                <div className="space-y-1">
                  {doMes.filter(p => String(p.data_publicacao).slice(0, 10) === ds).map(p => (
                    <button key={p.id} onClick={() => abrirPost(p)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-creme/50 text-left border-l-4" style={{ borderLeftColor: p.clientes?.cor || '#C2185B' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.titulo}</p>
                        <p className="text-xs text-gray-400">{p.clientes?.nome} · {p.tipo}</p>
                      </div>
                      {semArte(p) && <ImageOff size={14} className="text-orange-500" />}
                      <span className={cn('badge text-xs', STATUS_POST_CORES[p.status_interno])}>{STATUS_POST_LABELS[p.status_interno]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1"><ImageOff size={11} className="text-orange-500" /> = post sem arte/link ainda</p>
      </div>

      <div className="card">
        <h3 className="section-title text-sm mb-3 capitalize">{format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3>
        {postsDo(dia).length === 0 && eventosDo(dia).length === 0 ? <p className="text-sm text-gray-400">Nada neste dia.</p> : (
          <div className="space-y-2">
            {eventosDo(dia).map(e => (
              <button key={e.id} onClick={() => setEvento(e)} className="w-full p-2.5 rounded-xl bg-vinho/5 border border-vinho/10 text-left hover:bg-vinho/10">
                <p className="text-sm font-medium text-gray-800">{e.titulo}</p>
                {!e.dia_todo && <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{format(parseISO(e.data_inicio), 'HH:mm')}</p>}
              </button>
            ))}
            {postsDo(dia).map(p => (
              <button key={p.id} onClick={() => abrirPost(p)} className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:shadow-card text-left border-l-4" style={{ borderLeftColor: p.clientes?.cor || '#C2185B' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.titulo}</p>
                  <p className="text-xs text-gray-400">{p.clientes?.nome} · {p.tipo}</p>
                </div>
                {semArte(p) && <ImageOff size={14} className="text-orange-500" />}
                <span className={cn('badge text-xs', STATUS_POST_CORES[p.status_interno])}>{STATUS_POST_LABELS[p.status_interno]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!post} onClose={() => setPost(null)}>
        {post && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: post.clientes?.cor }} /><span className="text-sm text-gray-500">{post.clientes?.nome}</span></div>
              <button onClick={() => setPost(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-800">{post.titulo}</h2>
              <p className="text-xs text-gray-400 mt-1 capitalize">{post.tipo}{post.data_publicacao ? ' · ' + formatDate(post.data_publicacao) : ''}</p>
            </div>
            <select value={post.status_interno} onChange={e => mudarStatus(post.id, e.target.value)}
              className={cn('text-xs rounded-lg px-2 py-1.5 border-0 font-medium w-full', STATUS_POST_CORES[post.status_interno])}>
              {STATUS_LISTA.map(s => <option key={s} value={s}>{STATUS_POST_LABELS[s]}</option>)}
            </select>

            <div className={cn('rounded-xl p-3 border', semArte(post) ? 'bg-orange-50 border-orange-200' : 'bg-creme/50 border-transparent')}>
              <label className="label flex items-center gap-1.5"><Paperclip size={13} /> Link da arte (Drive, Canva ou imagem)</label>
              <div className="flex gap-2">
                <input className="input flex-1" value={linkArte} onChange={e => setLinkArte(e.target.value)} placeholder="Cole o link aqui quando a arte ficar pronta" />
                <button onClick={salvarLink} disabled={salvandoLink || linkArte.trim() === (post.link_externo || '')} className="btn-primary text-sm">{salvandoLink ? '...' : 'Salvar'}</button>
              </div>
              {semArte(post) && <p className="text-xs text-orange-600 mt-1">Esse post já está em fase de entrega e ainda não tem arte linkada.</p>}
              {post.link_externo && <a href={post.link_externo} target="_blank" rel="noopener noreferrer" className="text-xs text-vinho underline mt-1 inline-block">Abrir link</a>}
            </div>

            {post.tema && <div><p className="label">Tema</p><p className="text-sm text-gray-700">{post.tema}</p></div>}
            {post.legenda && <div className="bg-creme rounded-xl p-3"><p className="label">Legenda</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{post.legenda}</p></div>}

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setPostCompleto(post); setPost(null) }} className="btn-secondary text-sm flex items-center gap-1.5"><Pencil size={14} /> Editar e conversa</button>
              <button onClick={() => { const c = post.cliente_id; setPost(null); abrirFeed(c) }} className="btn-secondary text-sm flex items-center gap-1.5"><Instagram size={14} /> Ver no feed</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!evento} onClose={() => setEvento(null)}>
        {evento && (
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-gray-800">{evento.titulo}</h2><button onClick={() => setEvento(null)} className="btn-ghost p-2"><X size={18} /></button></div>
            <p className="text-sm text-gray-600 flex items-center gap-2"><Clock size={14} />{evento.dia_todo ? 'Dia todo' : format(parseISO(evento.data_inicio), "dd/MM 'às' HH:mm")}</p>
            {evento.local && <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin size={14} />{evento.local}</p>}
            {evento.link_online && <a href={evento.link_online} target="_blank" rel="noopener noreferrer" className="text-sm text-vinho flex items-center gap-2"><LinkIcon size={14} /> Entrar na reunião</a>}
            {evento.descricao && <p className="text-sm text-gray-600">{evento.descricao}</p>}
          </div>
        )}
      </Modal>

      <Modal open={feedAberto} onClose={() => setFeedAberto(false)} largo>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-vinho">Prévia do feed</h2>
            <select className="input text-sm py-1.5 w-auto" value={feedCliente} onChange={e => abrirFeed(e.target.value)}>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button onClick={() => setFeedAberto(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <p className="text-xs text-gray-400">É assim que o cliente vê o perfil. Posts futuros aparecem com a data. Toque num post pra abrir.</p>
          {clienteFeed && <FeedPreview nome={clienteFeed.nome} usuario={clienteFeed.instagram} cor={clienteFeed.cor} posts={feedPosts}
            onSelect={p => { setFeedAberto(false); abrirPost({ ...p, clientes: clienteFeed }) }} />}
        </div>
      </Modal>

      {postCompleto && (
        <PostModal post={postCompleto} userId={userId} userName={userName} role="admin"
          onClose={() => setPostCompleto(null)} onAtualizado={() => { carregar(); setPostCompleto(null) }} />
      )}
    </div>
  )
}
