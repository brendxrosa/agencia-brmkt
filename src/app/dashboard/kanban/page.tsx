'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Post } from '@/types'
import { STATUS_POST_LABELS, STATUS_POST_CORES, cn, formatDate } from '@/lib/utils'
import { Plus, X, Calendar, Instagram, Video, Image, Layout, Paperclip, Edit2, Save, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'

const COLUNAS = [
  'copy', 'aguardando_cliente', 'design', 'captacao',
  'edicao', 'aprovacao_arte', 'aprovado', 'publicado'
] as const

const TIPO_ICONS: Record<string, React.ReactNode> = {
  reels: <Video size={12} />,
  carrossel: <Layout size={12} />,
  feed: <Image size={12} />,
  stories: <Instagram size={12} />,
}

const TIPO_MIDIA = [
  { key: 'link', label: 'Link externo' },
  { key: 'drive', label: 'Google Drive' },
  { key: 'canva', label: 'Canva' },
  { key: 'wetransfer', label: 'WeTransfer' },
  { key: 'outro', label: 'Outro' },
]

// Normaliza o formato do tipo de post vindo do CSV
function normalizarTipo(valor: string): Post['tipo'] {
  const v = valor?.toLowerCase().trim()
  if (v.includes('reels') || v.includes('reel')) return 'reels'
  if (v.includes('carrossel') || v.includes('carousel')) return 'carrossel'
  if (v.includes('stories') || v.includes('story')) return 'stories'
  if (v.includes('tiktok')) return 'tiktok'
  return 'feed'
}

// Normaliza data DD/MM/AAAA → AAAA-MM-DD
function normalizarData(valor: string): string {
  if (!valor?.trim()) return ''
  const partes = valor.trim().split('/')
  if (partes.length === 3) {
    const [d, m, a] = partes
    return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return valor.trim()
}

// Parseia CSV respeitando campos entre aspas com quebras de linha
function parseCSV(texto: string): Record<string, string>[] {
  const linhas: string[] = []
  let atual = ''
  let dentroAspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '"') { dentroAspas = !dentroAspas; atual += c }
    else if (c === '\n' && !dentroAspas) { linhas.push(atual); atual = '' }
    else { atual += c }
  }
  if (atual.trim()) linhas.push(atual)

  if (linhas.length < 2) return []

  const parseLinha = (linha: string): string[] => {
    const campos: string[] = []
    let campo = ''
    let aspas = false
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i]
      if (c === '"' && !aspas) { aspas = true }
      else if (c === '"' && aspas && linha[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"' && aspas) { aspas = false }
      else if (c === ',' && !aspas) { campos.push(campo.trim()); campo = '' }
      else { campo += c }
    }
    campos.push(campo.trim())
    return campos
  }

  const cabecalho = parseLinha(linhas[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
  return linhas.slice(1)
    .filter(l => l.trim())
    .map(l => {
      const valores = parseLinha(l)
      const obj: Record<string, string> = {}
      cabecalho.forEach((h, i) => { obj[h] = (valores[i] || '').replace(/^"|"$/g, '').trim() })
      return obj
    })
    .filter(r => Object.values(r).some(v => v))
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {children}
      </div>
    </div>
  )
}

type FormPost = {
  cliente_id: string; titulo: string; tipo: Post['tipo']
  data_publicacao: string; tema: string; copy: string
  legenda: string; direcionamento: string; link_midia: string; tipo_midia: string; link_externo: string; midias_urls: string[]
  status_interno: Post['status_interno']
}

const formVazio: FormPost = {
  cliente_id: '', titulo: '', tipo: 'reels', data_publicacao: '',
  tema: '', copy: '', legenda: '', direcionamento: '',
  link_midia: '', tipo_midia: 'link', link_externo: '', midias_urls: [], status_interno: 'copy'
}

type PostImportado = {
  titulo: string; tipo: Post['tipo']; data_publicacao: string
  tema: string; copy: string; legenda: string; direcionamento: string
  hora: string; ok: boolean; erro?: string
}

// ─── CamposPost movido para fora do componente pai (evita perda de foco) ───
function CamposPost({ f, set, showStatus = false, clientes, STATUS_POST_LABELS, COLUNAS, TIPO_MIDIA, onUploadMidia, uploadandoForm }: {
  f: FormPost
  set: (k: keyof FormPost, v: any) => void
  showStatus?: boolean
  clientes: any[]
  STATUS_POST_LABELS: Record<string, string>
  COLUNAS: readonly string[]
  TIPO_MIDIA: { key: string; label: string }[]
  onUploadMidia?: (file: File, set: (k: any, v: any) => void, currentUrls?: string[]) => void
  uploadandoForm?: boolean
}) {
  return (
    <div className="space-y-4">
      {!showStatus && (
        <div>
          <label className="label">Cliente *</label>
          <select className="input" value={f.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">Título *</label>
        <input className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Dicas de fisioterapia pós-lesão" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={f.tipo} onChange={e => set('tipo', e.target.value as FormPost['tipo'])}>
            <option value="reels">Reels</option>
            <option value="carrossel">Carrossel</option>
            <option value="feed">Feed</option>
            <option value="stories">Stories</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <div>
          <label className="label">Data de publicação</label>
          <input className="input" type="date" value={f.data_publicacao} onChange={e => set('data_publicacao', e.target.value)} />
        </div>
      </div>
      {showStatus && (
        <div>
          <label className="label">Status</label>
          <select className="input" value={f.status_interno} onChange={e => set('status_interno', e.target.value as FormPost['status_interno'])}>
            {COLUNAS.map(c => <option key={c} value={c}>{STATUS_POST_LABELS[c]}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">Tema</label>
        <input className="input" value={f.tema} onChange={e => set('tema', e.target.value)} placeholder="Ex: Educação, Bastidores..." />
      </div>
      <div>
        <label className="label">Direcionamento</label>
        <textarea className="input resize-none" rows={2} value={f.direcionamento} onChange={e => set('direcionamento', e.target.value)} placeholder="Instruções para a equipe..." />
      </div>
      <div>
        <label className="label">Copy / Roteiro</label>
        <textarea className="input resize-none" rows={3} value={f.copy} onChange={e => set('copy', e.target.value)} placeholder="Texto do post ou roteiro do vídeo..." />
      </div>
      <div>
        <label className="label">Legenda</label>
        <textarea className="input resize-none" rows={2} value={f.legenda} onChange={e => set('legenda', e.target.value)} placeholder="Legenda para o Instagram..." />
      </div>
      {/* Link externo separado */}
      <div>
        <label className="label flex items-center gap-1.5"><Paperclip size={13} /> Link externo</label>
        <input className="input" value={(f as any).link_externo || ''} onChange={e => set('link_externo', e.target.value)}
          placeholder="https://drive.google.com/... ou YouTube, etc" />
        <p className="text-xs text-gray-400 mt-1">Drive, YouTube, Canva, WeTransfer ou qualquer link</p>
      </div>

      {/* Upload de arquivos — múltiplos */}
      <div>
        <label className="label flex items-center gap-1.5"><Upload size={13} /> Arquivos (imagens, vídeos, docs)</label>
        {/* Galeria de uploads existentes */}
        {((f as any).midias_urls || []).length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {((f as any).midias_urls as string[]).map((url: string, i: number) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                {/\.(mp4|mov|webm)$/i.test(url) ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : /\.(pdf|doc|docx)$/i.test(url) ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                ) : (
                  <img src={url} alt={`Mídia ${i+1}`} className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => set('midias_urls', ((f as any).midias_urls as string[]).filter((_: string, idx: number) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  ×
                </button>
                <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white rounded px-1">{i+1}</span>
              </div>
            ))}
          </div>
        )}
        {/* Botão de upload */}
        {onUploadMidia && (
          <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-vinho/40 hover:bg-rosa-pale/10 transition-all">
            {uploadandoForm
              ? <div className="w-4 h-4 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
              : <Upload size={16} className="text-gray-400" />}
            <span className="text-sm text-gray-400">
              {uploadandoForm ? 'Enviando...' : `Adicionar arquivo${((f as any).midias_urls || []).length > 0 ? ' (pode adicionar mais)' : ''}`}
            </span>
            <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden"
              onChange={e => { const fi = e.target.files?.[0]; if (fi) onUploadMidia(fi, set, (f as any).midias_urls || []) }} />
          </label>
        )}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalImportar, setModalImportar] = useState(false)
  const [postDetalhes, setPostDetalhes] = useState<any>(null)
  const [modoEditar, setModoEditar] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [ordenacao, setOrdenacao] = useState<'data_asc'|'data_desc'|'criacao'|'az'|'za'>('data_asc')
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [form, setForm] = useState<FormPost>(formVazio)
  const [formEditar, setFormEditar] = useState<FormPost>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [uploadandoMidia, setUploadandoMidia] = useState<string | null>(null)
  const [uploadandoForm, setUploadandoForm] = useState(false)

  // Estado do modal de importação
  const [importCliente, setImportCliente] = useState('')
  const [importPosts, setImportPosts] = useState<PostImportado[]>([])
  const [importando, setImportando] = useState(false)
  const [importSucesso, setImportSucesso] = useState(false)
  const [importErro, setImportErro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('posts').select('*, clientes(nome, cor)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setPosts(p || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirDetalhes(post: any) {
    setPostDetalhes(post)
    setFormEditar({
      cliente_id: post.cliente_id || '',
      titulo: post.titulo || '',
      tipo: post.tipo || 'reels',
      data_publicacao: post.data_publicacao || '',
      tema: post.tema || '',
      copy: post.copy || '',
      legenda: post.legenda || '',
      direcionamento: post.direcionamento || '',
      link_midia: post.link_midia || '',
      tipo_midia: post.tipo_midia || 'link',
      link_externo: post.link_externo || '',
      midias_urls: post.midias_urls || [],
      status_interno: post.status_interno || 'briefing',
    })
    setModoEditar(false)
  }

  async function criarPost() {
    if (!form.cliente_id || !form.titulo) return alert('Cliente e título são obrigatórios!')
    await supabase.from('posts').insert({ ...form, status_cliente: 'pendente' })
    setModalNovo(false)
    setForm(formVazio)
    carregar()
  }

  async function salvarEdicao() {
    if (!postDetalhes?.id) return
    setSalvando(true)
    await supabase.from('posts').update({ ...formEditar, midias_urls: formEditar.midias_urls || [], link_externo: formEditar.link_externo || null }).eq('id', postDetalhes.id)
    setSalvando(false)
    setModoEditar(false)
    const atualizado = { ...postDetalhes, ...formEditar, clientes: postDetalhes.clientes }
    setPostDetalhes(atualizado)
    carregar()
  }

  async function moverPost(postId: string, novoStatus: string) {
    const update: any = { status_interno: novoStatus }
    // Ao reenviar pro cliente: reseta status_cliente pra não duplicar no histórico
    if (novoStatus === 'aguardando_cliente') {
      update.status_cliente = 'pendente'
      update.etiqueta_cliente = null
      update.data_aprovacao = null
      // Registra na linha do tempo de comentários
      await supabase.from('aprovacao_comentarios').insert({
        doc_id: postId,
        autor_nome: 'Agência BR MKT',
        autor_role: 'admin',
        conteudo: '🔄 Conteúdo revisado e reenviado para aprovação.',
      })
    }
    await supabase.from('posts').update(update).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...update } : p))
  }

  async function uploadMidiaForm(file: File, set: (k: any, v: any) => void, currentUrls: string[] = []) {
    setUploadandoForm(true)
    const ext = file.name.split('.').pop()
    const nome = `midia-form-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('docs').upload(`midias/${nome}`, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('docs').getPublicUrl(`midias/${nome}`)
      // Adiciona ao array de mídias
      set('midias_urls', [...currentUrls, data.publicUrl])
      // Mantém link_midia com a primeira mídia por compatibilidade
      if (currentUrls.length === 0) {
        set('link_midia', data.publicUrl)
        set('tipo_midia', file.type.startsWith('video') ? 'video' : 'imagem')
      }
    }
    setUploadandoForm(false)
  }

  async function uploadMidia(postId: string, file: File) {
    setUploadandoMidia(postId)
    const ext = file.name.split('.').pop()
    const nome = `midia-${postId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('docs').upload(`midias/${nome}`, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('docs').getPublicUrl(`midias/${nome}`)
      const tipoMidia = file.type.startsWith('video') ? 'video' : 'imagem'
      const post = posts.find(p => p.id === postId)
      const novasMidias = [...(post?.midias_urls || []), data.publicUrl]
      await supabase.from('posts').update({ 
        link_midia: post?.link_midia || data.publicUrl, 
        tipo_midia: tipoMidia,
        midias_urls: novasMidias
      }).eq('id', postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, link_midia: p.link_midia || data.publicUrl, tipo_midia: tipoMidia, midias_urls: novasMidias } : p))
      if (postDetalhes?.id === postId) setPostDetalhes((p: any) => ({ ...p, midias_urls: novasMidias }))
    }
    setUploadandoMidia(null)
  }

  async function excluirPost(id: string) {
    if (!confirm('Excluir este post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPostDetalhes(null)
    carregar()
  }

  // ── Importação CSV ──────────────────────────────────────────

  function handleArquivoCSV(file: File) {
    setImportErro('')
    setImportSucesso(false)
    setImportPosts([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const texto = e.target?.result as string
        const linhas = parseCSV(texto)

        if (linhas.length === 0) {
          setImportErro('Arquivo vazio ou sem dados. Verifique o formato.')
          return
        }

        const postsParsados: PostImportado[] = linhas.map((linha, i) => {
          const titulo = linha['tema'] || linha['título'] || linha['titulo'] || ''
          const dataRaw = linha['data'] || ''
          const data = normalizarData(dataRaw)

          const erros: string[] = []
          if (!titulo) erros.push('título/tema obrigatório')
          if (!data) erros.push('data obrigatória')

          return {
            titulo: titulo || `Post ${i + 1}`,
            tipo: normalizarTipo(linha['formato'] || ''),
            data_publicacao: data,
            tema: titulo,
            copy: linha['copy'] || linha['roteiro'] || '',
            legenda: linha['legenda'] || '',
            direcionamento: linha['direcionamento'] || '',
            hora: linha['hora'] || '',
            ok: erros.length === 0,
            erro: erros.join(', '),
          }
        })

        setImportPosts(postsParsados)
      } catch (err) {
        setImportErro('Erro ao ler o arquivo. Certifique-se que é um CSV válido.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function confirmarImportacao() {
    if (!importCliente) { setImportErro('Selecione um cliente.'); return }
    const validos = importPosts.filter(p => p.ok)
    if (validos.length === 0) { setImportErro('Nenhum post válido para importar.'); return }

    setImportando(true)
    const inserts = validos.map(p => ({
      cliente_id: importCliente,
      titulo: p.titulo,
      tipo: p.tipo,
      data_publicacao: p.data_publicacao || null,
      tema: p.tema,
      copy: p.copy,
      legenda: p.legenda,
      direcionamento: p.direcionamento,
      status_interno: 'aguardando_cliente' as Post['status_interno'],
      status_cliente: 'pendente',
    }))

    const { error } = await supabase.from('posts').insert(inserts)
    setImportando(false)

    if (error) {
      setImportErro('Erro ao salvar os posts. Tente novamente.')
    } else {
      setImportSucesso(true)
      carregar()
      setTimeout(() => {
        setModalImportar(false)
        setImportPosts([])
        setImportCliente('')
        setImportSucesso(false)
        setImportErro('')
      }, 2000)
    }
  }

  function fecharImportar() {
    setModalImportar(false)
    setImportPosts([])
    setImportCliente('')
    setImportSucesso(false)
    setImportErro('')
  }

  // ────────────────────────────────────────────────────────────

  const postsFiltrados = filtroCliente === 'todos' ? posts : posts.filter(p => p.cliente_id === filtroCliente)

  function ordenarPosts(lista: any[]) {
    return [...lista].sort((a, b) => {
      if (ordenacao === 'az') return (a.titulo || '').localeCompare(b.titulo || '')
      if (ordenacao === 'za') return (b.titulo || '').localeCompare(a.titulo || '')
      if (ordenacao === 'criacao') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (ordenacao === 'data_desc') {
        if (!a.data_publicacao) return 1
        if (!b.data_publicacao) return -1
        return new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime()
      }
      // data_asc (padrão)
      if (!a.data_publicacao) return 1
      if (!b.data_publicacao) return -1
      return new Date(a.data_publicacao).getTime() - new Date(b.data_publicacao).getTime()
    })
  }

  const postsPorColuna = (status: string) => ordenarPosts(postsFiltrados.filter(p => p.status_interno === status))

  const setF = (k: keyof FormPost, v: any) => setForm(f => ({ ...f, [k]: v }))
  const setFE = (k: keyof FormPost, v: any) => setFormEditar(f => ({ ...f, [k]: v }))


  const validosCount = importPosts.filter(p => p.ok).length
  const invalidsCount = importPosts.filter(p => !p.ok).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Kanban Editorial</h1>
          <p className="text-gray-500 text-sm mt-1">{posts.length} posts no pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input text-sm py-1.5 pr-8 w-auto"
            value={ordenacao}
            onChange={e => setOrdenacao(e.target.value as any)}>
            <option value="data_asc">Data ↑</option>
            <option value="data_desc">Data ↓</option>
            <option value="criacao">Mais recentes</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
          <button onClick={() => setModalImportar(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={15} /> Importar CSV
          </button>
          <button onClick={() => setModalNovo(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo post
          </button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroCliente('todos')}
          className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
            filtroCliente === 'todos' ? 'bg-vinho text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-creme')}>
          Todos
        </button>
        {clientes.map(c => (
          <button key={c.id} onClick={() => setFiltroCliente(c.id)}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5',
              filtroCliente === c.id ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-creme')}
            style={filtroCliente === c.id ? { backgroundColor: c.cor } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
            {c.nome}
          </button>
        ))}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map(c => <div key={c} className="w-64 flex-shrink-0 h-96 bg-creme rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {COLUNAS.map(coluna => (
            <div key={coluna} className="w-64 flex-shrink-0 bg-creme/50 rounded-2xl"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const postId = e.dataTransfer.getData('postId')
                if (postId) moverPost(postId, coluna)
                setArrastando(null)
              }}>
              <div className="p-3 flex items-center gap-2">
                <span className={cn('badge text-xs', STATUS_POST_CORES[coluna])}>{STATUS_POST_LABELS[coluna]}</span>
                <span className="text-xs text-gray-400 font-medium">{postsPorColuna(coluna).length}</span>
              </div>

              <div className="px-3 pb-3 space-y-2 min-h-24">
                {postsPorColuna(coluna).map(post => (
                  <div key={post.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('postId', post.id); setArrastando(post.id) }}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => abrirDetalhes(post)}
                    className={cn('bg-white rounded-xl shadow-card cursor-pointer group transition-all hover:shadow-card-hover overflow-hidden',
                      arrastando === post.id && 'opacity-40')}>

                    {/* CAPA de mídia — estilo Trello */}
                    {post.link_midia && post.tipo_midia === 'imagem' && (
                      <div className="w-full h-28 overflow-hidden relative">
                        <img src={post.link_midia} alt={post.titulo}
                          className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    )}
                    {post.link_midia && post.tipo_midia === 'video' && (
                      <div className="w-full h-28 overflow-hidden relative bg-gray-900 flex items-center justify-center">
                        <video src={post.link_midia} className="w-full h-full object-cover opacity-70" muted />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                            <Video size={14} className="text-gray-800 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                    {post.link_externo && (
                      <div className="w-full px-3 pt-2">
                        <a href={post.link_externo} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-vinho hover:underline truncate">
                          <Paperclip size={11} /> {post.link_externo.replace(/^https?:\/\//, '').slice(0,35)}
                        </a>
                      </div>
                    )}
                    {(post.midias_urls || []).length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-lg px-1.5 py-0.5">
                        {post.midias_urls.length} arquivos
                      </div>
                    )}

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: post.clientes?.cor || '#6B0F2A' }} />
                          <span className="text-xs text-gray-400 truncate max-w-28">{post.clientes?.nome}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {/* Upload rápido de mídia */}
                          <label onClick={e => e.stopPropagation()} title="Adicionar mídia" className="cursor-pointer text-gray-300 hover:text-vinho transition-colors">
                            {uploadandoMidia === post.id
                              ? <div className="w-3 h-3 border border-vinho/30 border-t-vinho rounded-full animate-spin" />
                              : <Upload size={12} />}
                            <input type="file" accept="image/*,video/*" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadMidia(post.id, f) }} />
                          </label>
                          <button onClick={e => { e.stopPropagation(); excluirPost(post.id) }}
                            className="text-gray-300 hover:text-red-500 transition-all">
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-gray-800 leading-tight mb-2">{post.titulo}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gray-400">
                          {TIPO_ICONS[post.tipo]}
                          <span className="text-xs capitalize">{post.tipo}</span>
                        </div>
                        {post.data_publicacao && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Calendar size={11} />
                            <span className="text-xs">{formatDate(post.data_publicacao, 'dd/MM')}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all">
                        <div className="flex flex-wrap gap-1">
                          {COLUNAS.filter(c => c !== coluna).slice(0, 3).map(c => (
                            <button key={c} onClick={e => { e.stopPropagation(); moverPost(post.id, c) }}
                              className="text-xs px-2 py-0.5 rounded-lg bg-creme hover:bg-rosa-pale text-gray-600 transition-colors">
                              {STATUS_POST_LABELS[c]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {postsPorColuna(coluna).length === 0 && (
                  <div className="text-center py-6 text-gray-300 text-xs">Nenhum post aqui</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Importar CSV ── */}
      <Modal open={modalImportar} onClose={fecharImportar}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-vinho">Importar calendário</h2>
              <p className="text-sm text-gray-400 mt-0.5">Upload de CSV → posts criados automaticamente</p>
            </div>
            <button onClick={fecharImportar} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          {importSucesso ? (
            <div className="text-center py-10">
              <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
              <p className="font-semibold text-gray-800">{validosCount} post(s) importados com sucesso!</p>
              <p className="text-sm text-gray-400 mt-1">Eles já estão no Kanban na coluna "Aguardando cliente".</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Cliente */}
              <div>
                <label className="label">Cliente *</label>
                <select className="input" value={importCliente} onChange={e => setImportCliente(e.target.value)}>
                  <option value="">Selecione o cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Upload */}
              <div>
                <label className="label">Arquivo CSV *</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-vinho/40 hover:bg-rosa-pale/10 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleArquivoCSV(f) }}>
                  <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Arraste o CSV aqui ou <span className="text-vinho font-medium">clique para selecionar</span></p>
                  <p className="text-xs text-gray-400 mt-1">Colunas esperadas: data, hora, formato, tema, abordagem, legenda, copy, direcionamento</p>
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleArquivoCSV(f) }} />
                </div>
              </div>

              {importErro && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="flex-shrink-0" /> {importErro}
                </div>
              )}

              {/* Preview dos posts parseados */}
              {importPosts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="label">{importPosts.length} linha(s) encontradas</p>
                    <div className="flex items-center gap-3 text-xs">
                      {validosCount > 0 && <span className="text-emerald-600 font-medium">✓ {validosCount} válidas</span>}
                      {invalidsCount > 0 && <span className="text-red-500 font-medium">✗ {invalidsCount} com erro</span>}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {importPosts.map((p, i) => (
                      <div key={i} className={cn('rounded-xl px-3 py-2.5 border text-sm flex items-start gap-3',
                        p.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
                        <div className="flex-shrink-0 mt-0.5">
                          {p.ok
                            ? <CheckCircle size={14} className="text-emerald-500" />
                            : <AlertCircle size={14} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium truncate', p.ok ? 'text-emerald-800' : 'text-red-800')}>{p.titulo}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                            {p.data_publicacao && <span>📅 {p.data_publicacao}</span>}
                            {p.hora && <span>🕐 {p.hora}</span>}
                            <span className="capitalize">{p.tipo}</span>
                            {!p.ok && <span className="text-red-500">• {p.erro}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nota sobre arte */}
              {importPosts.length > 0 && validosCount > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                  <FileText size={13} className="flex-shrink-0 mt-0.5" />
                  <span>Os posts serão criados na coluna <strong>Aguardando cliente</strong>. O link da arte pode ser adicionado depois em cada card, no campo Mídia/Arquivo.</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={fecharImportar} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={confirmarImportacao}
                  disabled={importando || validosCount === 0 || !importCliente}
                  className="btn-primary flex-1 justify-center flex items-center gap-2">
                  <Upload size={15} />
                  {importando ? 'Importando...' : `Importar ${validosCount > 0 ? validosCount : ''} post(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal detalhes/edição */}
      <Modal open={!!postDetalhes} onClose={() => { setPostDetalhes(null); setModoEditar(false) }}>
        {postDetalhes && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: postDetalhes.clientes?.cor }} />
                <span className="text-sm text-gray-500">{postDetalhes.clientes?.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                {!modoEditar ? (
                  <button onClick={() => setModoEditar(true)} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5">
                    <Edit2 size={14} /> Editar
                  </button>
                ) : (
                  <>
                    <button onClick={salvarEdicao} disabled={salvando} className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
                      <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setModoEditar(false)} className="btn-ghost text-sm py-1.5">Cancelar</button>
                  </>
                )}
                <button onClick={() => { setPostDetalhes(null); setModoEditar(false) }} className="btn-ghost p-2">
                  <X size={18} />
                </button>
              </div>
            </div>

            {modoEditar ? (
              <CamposPost f={formEditar} set={setFE} showStatus={true} clientes={clientes} STATUS_POST_LABELS={STATUS_POST_LABELS} COLUNAS={COLUNAS} TIPO_MIDIA={TIPO_MIDIA} onUploadMidia={uploadMidiaForm} uploadandoForm={uploadandoForm} />
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-gray-800">{postDetalhes.titulo}</h2>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={cn('badge text-xs', STATUS_POST_CORES[postDetalhes.status_interno])}>
                      {STATUS_POST_LABELS[postDetalhes.status_interno]}
                    </span>
                    <span className="badge bg-creme text-gray-600 text-xs capitalize">{postDetalhes.tipo}</span>
                    {postDetalhes.data_publicacao && (
                      <span className="text-xs text-gray-400">📅 {formatDate(postDetalhes.data_publicacao)}</span>
                    )}
                    {postDetalhes.status_cliente && (
                      <span className={cn('badge text-xs', {
                        'bg-emerald-100 text-emerald-700': postDetalhes.status_cliente === 'aprovado',
                        'bg-red-100 text-red-700': postDetalhes.status_cliente === 'reprovado',
                        'bg-orange-100 text-orange-700': postDetalhes.status_cliente === 'pendente',
                      })}>
                        Cliente: {postDetalhes.status_cliente}
                      </span>
                    )}
                  </div>
                </div>

                {postDetalhes.tema && <div><p className="label">Tema</p><p className="text-sm text-gray-700">{postDetalhes.tema}</p></div>}
                {postDetalhes.direcionamento && <div><p className="label">Direcionamento</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{postDetalhes.direcionamento}</p></div>}
                {postDetalhes.copy && (
                  <div className="bg-creme rounded-xl p-3">
                    <p className="label">Copy / Roteiro</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{postDetalhes.copy}</p>
                  </div>
                )}
                {postDetalhes.legenda && (
                  <div className="bg-creme rounded-xl p-3">
                    <p className="label">Legenda</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{postDetalhes.legenda}</p>
                  </div>
                )}
                {postDetalhes.link_midia && (
                  <div>
                    <p className="label">Mídia</p>
                    <a href={postDetalhes.link_midia} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-vinho hover:text-rosa transition-colors">
                      <Paperclip size={14} />
                      {postDetalhes.tipo_midia}: {postDetalhes.link_midia}
                    </a>
                  </div>
                )}
                {postDetalhes.feedback_cliente && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <p className="label text-orange-600">Feedback do cliente</p>
                    <p className="text-sm text-orange-700">{postDetalhes.feedback_cliente}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => excluirPost(postDetalhes.id)} className="btn-danger flex-1 justify-center">Excluir</button>
                  <button onClick={() => { setPostDetalhes(null); setModoEditar(false) }} className="btn-secondary flex-1">Fechar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal novo post */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo post</h2>
            <button onClick={() => setModalNovo(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <CamposPost f={form} set={setF} clientes={clientes} STATUS_POST_LABELS={STATUS_POST_LABELS} COLUNAS={COLUNAS} TIPO_MIDIA={TIPO_MIDIA} onUploadMidia={uploadMidiaForm} uploadandoForm={uploadandoForm} />
          <div className="flex gap-3 pt-4">
            <button onClick={() => setModalNovo(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={criarPost} className="btn-primary flex-1 justify-center">Criar post</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
