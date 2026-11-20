'use client'

import { Play, Layers, Grid3X3 } from 'lucide-react'

// Descobre a imagem de capa de um post (upload, link de imagem ou thumbnail do Drive)
export function capaDoPost(p: any): string | null {
  const urls: string[] = [...(p.midias_urls || []), p.link_midia, p.link_externo].filter(Boolean)
  for (const u of urls) {
    if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(u)) return u
    const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/.*[?&]id=([\w-]+)/)
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w600'
  }
  return null
}

export default function FeedPreview({ nome, usuario, cor, posts, destaqueId, onSelect }: {
  nome: string; usuario?: string; cor?: string; posts: any[]; destaqueId?: string; onSelect?: (p: any) => void
}) {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' })
  const lista = [...posts]
    .filter(p => p.tipo !== 'stories')
    .sort((a, b) => String(b.data_publicacao || '').localeCompare(String(a.data_publicacao || '')))
  const iniciais = nome.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden max-w-md mx-auto">
      <div className="p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
          style={{ backgroundColor: cor || '#6B0F2A' }}>{iniciais}</div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{usuario || nome}</p>
          <p className="text-xs text-gray-500">{lista.length} publicações planejadas</p>
        </div>
      </div>
      <div className="flex justify-center border-t border-gray-100 py-2"><Grid3X3 size={18} className="text-gray-800" /></div>
      <div className="grid grid-cols-3 gap-px bg-gray-100">
        {lista.map(p => {
          const capa = capaDoPost(p)
          const futuro = p.data_publicacao && String(p.data_publicacao).slice(0, 10) > hoje
          return (
            <button key={p.id} onClick={() => onSelect && onSelect(p)}
              className={'relative aspect-[4/5] bg-creme overflow-hidden text-left ' + (destaqueId === p.id ? 'ring-2 ring-inset ring-vinho' : '')}>
              {capa ? (
                <img src={capa} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full p-2 flex flex-col justify-end" style={{ backgroundColor: (cor || '#6B0F2A') + '22' }}>
                  <p className="text-[10px] leading-tight text-gray-600 line-clamp-4">{p.titulo}</p>
                </div>
              )}
              {p.tipo === 'reels' && <Play size={14} className="absolute top-1.5 right-1.5 text-white drop-shadow" fill="white" />}
              {p.tipo === 'carrossel' && <Layers size={14} className="absolute top-1.5 right-1.5 text-white drop-shadow" />}
              {futuro && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white rounded px-1">
                  {String(p.data_publicacao).slice(8, 10) + '/' + String(p.data_publicacao).slice(5, 7)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {lista.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Nenhum post ainda.</p>}
    </div>
  )
}
