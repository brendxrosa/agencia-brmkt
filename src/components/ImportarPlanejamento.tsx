'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { X, Upload, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'

type Item = {
  incluir: boolean; titulo: string; tipo: string; data: string; hora?: string
  tema?: string; abordagem?: string; copy?: string; legenda?: string; direcionamento?: string; links: string[]
}

const COLUNAS_DESTINO: [string, string][] = [
  ['aguardando_cliente', 'Aguardando cliente'], ['copy', 'Copy'], ['design', 'Design'], ['aprovado', 'Aprovado'],
]

function htmlParaTexto(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,noscript').forEach(n => n.remove())
  doc.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || ''
    if (href.startsWith('http')) a.appendChild(doc.createTextNode(' [link: ' + href + ']'))
  })
  doc.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,tr,section,article').forEach(n => n.appendChild(doc.createTextNode('\n')))
  doc.querySelectorAll('br').forEach(n => n.replaceWith(doc.createTextNode('\n')))
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

function dividir(texto: string, max = 9000): string[] {
  const partes: string[] = []
  let atual = ''
  for (const par of texto.split(/\n\s*\n/)) {
    if ((atual + '\n\n' + par).length > max && atual) { partes.push(atual); atual = par } else atual = atual ? atual + '\n\n' + par : par
  }
  if (atual) partes.push(atual)
  return partes
}

function lerJson(txt: string): any[] {
  const limpo = txt.replace(/\x60\x60\x60json|\x60\x60\x60/g, '').trim()
  const i = limpo.indexOf('['); if (i < 0) return []
  let f = limpo.lastIndexOf(']')
  const tenta = (s: string) => { try { const r = JSON.parse(s); return Array.isArray(r) ? r : [] } catch { return null } }
  let r = f > i ? tenta(limpo.slice(i, f + 1)) : null
  if (r) return r
  const corte = limpo.lastIndexOf('},')
  if (corte > i) { r = tenta(limpo.slice(i, corte + 1) + ']'); if (r) return r }
  return []
}

export default function ImportarPlanejamento({ open, onClose, clientes, onConcluido }: {
  open: boolean; onClose: () => void; clientes: any[]; onConcluido: () => void
}) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [cliente, setCliente] = useState('')
  const [destino, setDestino] = useState('aguardando_cliente')
  const [texto, setTexto] = useState('')
  const [pdf, setPdf] = useState<{ nome: string; base64: string } | null>(null)
  const [nomeArq, setNomeArq] = useState('')
  const [itens, setItens] = useState<Item[]>([])
  const [lendo, setLendo] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  function reset() { setTexto(''); setPdf(null); setNomeArq(''); setItens([]); setErro(''); setOk(false); setProgresso('') }
  function fechar() { reset(); onClose() }

  async function lerArquivo(f: File) {
    setErro(''); setItens([]); setNomeArq(f.name)
    const nome = f.name.toLowerCase()
    if (nome.endsWith('.pdf')) {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f) })
      setPdf({ nome: f.name, base64: b64 }); setTexto(''); return
    }
    if (nome.endsWith('.docx') || nome.endsWith('.doc')) { setErro('Word não dá pra ler aqui. Abra no Google Docs e baixe como HTML ou PDF, ou cole o texto abaixo.'); return }
    const t = await f.text()
    setPdf(null)
    setTexto(nome.endsWith('.html') || nome.endsWith('.htm') ? htmlParaTexto(t) : t)
  }

  async function chamar(conteudo: any[]): Promise<any[]> {
    const res = await fetch('/api/claude-extract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 6000, messages: [{ role: 'user', content: conteudo }] }),
    })
    if (!res.ok) throw new Error('A leitura falhou (' + res.status + ').')
    const j = await res.json()
    return lerJson(j.content?.[0]?.text || '')
  }

  function prompt(): string {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' })
    return 'Você extrai posts de redes sociais de um calendário editorial. Hoje é ' + hoje + '. Se a data não trouxer o ano, use o ano mais provável a partir de hoje. ' +
      'Devolva SOMENTE um array JSON (sem markdown, sem explicação). Cada item: {"titulo": tema/título curto do post, "tipo": "reels"|"carrossel"|"feed"|"stories", "data": "AAAA-MM-DD", "hora": "HH:MM" ou omitir, ' +
      '"tema": área ou pilar, "abordagem": abordagem/ângulo, "copy": roteiro ou texto das páginas/arte COMPLETO como está no documento, "legenda": legenda COMPLETA, "direcionamento": notas visuais, CTA ou instruções, "links": [urls citadas para esse post]}. ' +
      'Copie os textos como estão, sem resumir e sem inventar. Omita campos que não existirem. Estático ou imagem única = "feed".'
  }

  async function ler() {
    setErro(''); setItens([]); setLendo(true)
    try {
      let todos: any[] = []
      if (pdf) {
        setProgresso('Lendo o PDF...')
        todos = await chamar([{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.base64 } }, { type: 'text', text: prompt() }])
      } else {
        const partes = dividir(texto)
        for (let i = 0; i < partes.length; i++) {
          setProgresso('Lendo parte ' + (i + 1) + ' de ' + partes.length + '...')
          const r = await chamar([{ type: 'text', text: prompt() + '\n\n--- DOCUMENTO (parte ' + (i + 1) + ' de ' + partes.length + ') ---\n' + partes[i] }])
          todos = todos.concat(r)
        }
      }
      const vistos = new Set<string>()
      const lista: Item[] = []
      for (const p of todos) {
        if (!p || !p.titulo) continue
        const chave = (p.data || '') + '|' + String(p.titulo).toLowerCase().slice(0, 40)
        if (vistos.has(chave)) continue
        vistos.add(chave)
        const tipo = ['reels', 'carrossel', 'feed', 'stories', 'tiktok'].includes(p.tipo) ? p.tipo : 'feed'
        lista.push({ incluir: true, titulo: String(p.titulo), tipo, data: /^\d{4}-\d{2}-\d{2}$/.test(p.data || '') ? p.data : '', hora: p.hora, tema: p.tema, abordagem: p.abordagem, copy: p.copy, legenda: p.legenda, direcionamento: p.direcionamento, links: Array.isArray(p.links) ? p.links.filter((l: any) => typeof l === 'string' && l.startsWith('http')) : [] })
      }
      lista.sort((a, b) => (a.data || '9').localeCompare(b.data || '9'))
      if (lista.length === 0) setErro('Não achei posts nesse documento. Confere se é o calendário certo.')
      setItens(lista)
    } catch (e: any) {
      setErro(e?.message || 'Não consegui ler o documento.')
    }
    setLendo(false); setProgresso('')
  }

  function mudar(i: number, campo: keyof Item, valor: any) { setItens(prev => prev.map((x, k) => k === i ? { ...x, [campo]: valor } : x)) }

  async function importar() {
    if (!cliente) return setErro('Escolha o cliente.')
    const validos = itens.filter(x => x.incluir && x.titulo)
    if (validos.length === 0) return setErro('Nenhum post marcado.')
    setSalvando(true); setErro('')
    const linhas = validos.map(x => ({
      cliente_id: cliente, titulo: x.titulo, tipo: x.tipo, data_publicacao: x.data || null,
      tema: x.tema || null, abordagem: x.abordagem || null, copy: x.copy || null, legenda: x.legenda || null, direcionamento: x.direcionamento || null,
      link_externo: x.links[0] || null, midias_urls: x.links, link_midia: x.links[0] || null,
      status_interno: destino, status_cliente: 'pendente',
    }))
    const { error } = await supabase.from('posts').insert(linhas)
    setSalvando(false)
    if (error) return setErro('Erro ao salvar: ' + error.message)
    setOk(true); onConcluido()
    setTimeout(fechar, 1800)
  }

  if (!open) return null
  const marcados = itens.filter(x => x.incluir).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={fechar} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-vinho flex items-center gap-2"><Sparkles size={18} /> Importar planejamento</h2>
            <p className="text-xs text-gray-400">Suba o calendário (HTML, PDF, texto) ou cole aqui. A IA separa os posts e você confere antes de entrar no Kanban.</p>
          </div>
          <button onClick={fechar} className="btn-ghost p-2"><X size={18} /></button>
        </div>

        {ok ? (
          <div className="text-center py-10"><CheckCircle size={44} className="mx-auto text-emerald-500 mb-2" /><p className="font-semibold">{marcados} post(s) importados!</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Cliente *</label>
                <select className="input" value={cliente} onChange={e => setCliente(e.target.value)}>
                  <option value="">Selecione</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select></div>
              <div><label className="label">Entrar em qual coluna?</label>
                <select className="input" value={destino} onChange={e => setDestino(e.target.value)}>
                  {COLUNAS_DESTINO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer hover:border-vinho/40"
              onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) lerArquivo(f) }}>
              <Upload size={20} className="mx-auto mb-1 text-gray-300" />
              <p className="text-sm text-gray-500">{nomeArq || 'Arraste o arquivo ou clique pra escolher'} <span className="text-xs text-gray-400">(.html, .pdf, .txt, .md, .csv)</span></p>
              <input ref={fileRef} type="file" accept=".html,.htm,.pdf,.txt,.md,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) lerArquivo(f) }} />
            </div>
            <textarea className="input resize-none text-sm" rows={4} value={texto} onChange={e => { setTexto(e.target.value); setPdf(null) }}
              placeholder="Ou cole aqui o texto do calendário (pode copiar direto do Google Docs)" />

            <button onClick={ler} disabled={lendo || (!texto.trim() && !pdf)} className="btn-primary flex items-center gap-2">
              <Sparkles size={15} /> {lendo ? (progresso || 'Lendo...') : 'Ler documento'}
            </button>

            {erro && <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3"><AlertCircle size={15} /> {erro}</div>}

            {itens.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{itens.length} post(s) encontrados. Confira e desmarque o que não quiser.</p>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {itens.map((x, i) => (
                    <div key={i} className={cn('rounded-xl border p-2.5 space-y-1.5', x.incluir ? 'border-gray-200' : 'border-gray-100 opacity-50')}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={x.incluir} onChange={e => mudar(i, 'incluir', e.target.checked)} />
                        <input className="input text-sm py-1 flex-1" value={x.titulo} onChange={e => mudar(i, 'titulo', e.target.value)} />
                      </div>
                      <div className="flex gap-2 flex-wrap pl-6">
                        <input type="date" className={cn('input text-xs py-1 w-auto', !x.data && 'border-red-300')} value={x.data} onChange={e => mudar(i, 'data', e.target.value)} />
                        <select className="input text-xs py-1 w-auto" value={x.tipo} onChange={e => mudar(i, 'tipo', e.target.value)}>
                          <option value="reels">Reels</option><option value="carrossel">Carrossel</option><option value="feed">Feed</option><option value="stories">Stories</option><option value="tiktok">TikTok</option>
                        </select>
                        <span className="text-xs text-gray-400 self-center">
                          {x.copy ? 'copy ✓' : 'sem copy'} · {x.legenda ? 'legenda ✓' : 'sem legenda'}{x.links.length ? ' · ' + x.links.length + ' link(s)' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={fechar} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={importar} disabled={salvando || marcados === 0} className="btn-primary flex-1 justify-center">{salvando ? 'Importando...' : 'Importar ' + marcados + ' post(s)'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
