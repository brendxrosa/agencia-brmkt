'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Download, BarChart2, Users, DollarSign, Kanban } from 'lucide-react'

export default function RelatoriosPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [dados, setDados] = useState<any>(null)

  async function carregar() {
    const { data } = await supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    setClientes(data || [])
    if (data && data.length > 0) setClienteSelecionado(data[0].id)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function gerarRelatorio() {
    if (!clienteSelecionado) return
    setGerando(true)

    const [{ data: posts }, { data: pagamentos }, { data: metricas }, { data: tarefas }, { data: cliente }] = await Promise.all([
      supabase.from('posts').select('*').eq('cliente_id', clienteSelecionado).order('created_at', { ascending: false }),
      supabase.from('pagamentos').select('*').eq('cliente_id', clienteSelecionado).order('vencimento', { ascending: false }),
      supabase.from('metricas').select('*').eq('cliente_id', clienteSelecionado).order('mes_referencia', { ascending: false }),
      supabase.from('tarefas').select('*').eq('cliente_id', clienteSelecionado),
      supabase.from('clientes').select('*').eq('id', clienteSelecionado).single()
    ])

    setDados({ posts, pagamentos, metricas, tarefas, cliente })
    setGerando(false)
  }

  useEffect(() => {
    if (clienteSelecionado) gerarRelatorio()
  }, [clienteSelecionado])

  async function exportarPDF() {
    if (!dados) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const cor = [107, 15, 42] as [number, number, number]

    // Cabeçalho
    doc.setFillColor(...cor)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Agência BR MKT', 15, 15)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Relatório — ${dados.cliente?.nome}`, 15, 25)
    doc.setFontSize(9)
    doc.text(`Gerado em ${formatDate(new Date().toISOString())}`, 15, 32)

    let y = 45

    // Info do cliente
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Informações do cliente', 15, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Plano: ${dados.cliente?.plano} | Valor: ${formatCurrency(dados.cliente?.valor_mensal)}`, 15, y)
    y += 6
    doc.text(`Status: ${dados.cliente?.status} | Vencimento: dia ${dados.cliente?.dia_vencimento}`, 15, y)
    y += 12

    // Posts
    if (dados.posts && dados.posts.length > 0) {
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Posts', 15, y)
      y += 6

      const publicados = dados.posts.filter((p: any) => p.status_interno === 'publicado').length
      const aprovados = dados.posts.filter((p: any) => p.status_interno === 'aprovado').length
      const pendentes = dados.posts.filter((p: any) => p.status_cliente === 'pendente').length

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total: ${dados.posts.length} | Publicados: ${publicados} | Aprovados: ${aprovados} | Pendentes: ${pendentes}`, 15, y)
      y += 8

      autoTable(doc, {
        startY: y,
        head: [['Título', 'Tipo', 'Status', 'Data']],
        body: dados.posts.slice(0, 10).map((p: any) => [
          p.titulo,
          p.tipo,
          p.status_interno.replace('_', ' '),
          p.data_publicacao ? formatDate(p.data_publicacao) : '—'
        ]),
        headStyles: { fillColor: cor },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      })
      y = (doc as any).lastAutoTable.finalY + 12
    }

    // Métricas
    if (dados.metricas && dados.metricas.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Métricas', 15, y)
      y += 6

      autoTable(doc, {
        startY: y,
        head: [['Mês', 'Plataforma', 'Seguidores', 'Novos', 'Alcance', 'Engaj.']],
        body: dados.metricas.map((m: any) => [
          m.mes_referencia,
          m.plataforma,
          m.seguidores?.toLocaleString('pt-BR'),
          `+${m.novos_seguidores}`,
          m.alcance?.toLocaleString('pt-BR'),
          `${m.engajamento}%`
        ]),
        headStyles: { fillColor: cor },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      })
      y = (doc as any).lastAutoTable.finalY + 12
    }

    // Financeiro
    if (dados.pagamentos && dados.pagamentos.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Financeiro', 15, y)
      y += 6

      const totalPago = dados.pagamentos.filter((p: any) => p.status === 'pago').reduce((acc: number, p: any) => acc + p.valor, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total recebido: ${formatCurrency(totalPago)}`, 15, y)
      y += 8

      autoTable(doc, {
        startY: y,
        head: [['Mês', 'Valor', 'Vencimento', 'Status']],
        body: dados.pagamentos.map((p: any) => [
          p.mes_referencia || '—',
          formatCurrency(p.valor),
          formatDate(p.vencimento),
          p.status
        ]),
        headStyles: { fillColor: cor },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      })
    }

    // Rodapé
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Agência BR MKT — Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
    }

    doc.save(`relatorio-${dados.cliente?.nome?.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const clienteInfo = clientes.find(c => c.id === clienteSelecionado)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-1">Visão consolidada por cliente</p>
        </div>
        {dados && (
          <button onClick={exportarPDF} className="btn-primary flex items-center gap-2">
            <Download size={16} /> Exportar PDF
          </button>
        )}
      </div>

      {/* Seletor de cliente */}
      <div className="flex gap-2 flex-wrap">
        {clientes.map(c => (
          <button key={c.id} onClick={() => setClienteSelecionado(c.id)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
              clienteSelecionado === c.id ? 'text-white shadow-card' : 'bg-white border border-gray-200 text-gray-600 hover:bg-creme')}
            style={clienteSelecionado === c.id ? { backgroundColor: c.cor } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
            {c.nome}
          </button>
        ))}
      </div>

      {gerando ? (
        <div className="card text-center py-16">
          <div className="w-8 h-8 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Gerando relatório...</p>
        </div>
      ) : dados ? (
        <div className="space-y-5">
          {/* Cards resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="w-10 h-10 bg-vinho/10 rounded-xl flex items-center justify-center mb-3">
                <Kanban size={18} className="text-vinho" />
              </div>
              <p className="text-2xl font-display font-bold text-vinho">{dados.posts?.length || 0}</p>
              <p className="text-xs text-gray-500">Posts totais</p>
            </div>
            <div className="card">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                <Kanban size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-display font-bold text-emerald-700">
                {dados.posts?.filter((p: any) => p.status_interno === 'publicado').length || 0}
              </p>
              <p className="text-xs text-gray-500">Publicados</p>
            </div>
            <div className="card">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <BarChart2 size={18} className="text-blue-600" />
              </div>
              <p className="text-2xl font-display font-bold text-blue-700">
                {dados.metricas?.[0]?.seguidores?.toLocaleString('pt-BR') || '—'}
              </p>
              <p className="text-xs text-gray-500">Seguidores</p>
            </div>
            <div className="card">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-display font-bold text-emerald-700">
                {formatCurrency(dados.pagamentos?.filter((p: any) => p.status === 'pago').reduce((acc: number, p: any) => acc + p.valor, 0) || 0)}
              </p>
              <p className="text-xs text-gray-500">Total recebido</p>
            </div>
          </div>

          {/* Posts */}
          {dados.posts && dados.posts.length > 0 && (
            <div className="card">
              <h3 className="section-title text-sm mb-4">Últimos posts</h3>
              <div className="space-y-2">
                {dados.posts.slice(0, 8).map((post: any) => (
                  <div key={post.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: clienteInfo?.cor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{post.titulo}</p>
                      <p className="text-xs text-gray-400 capitalize">{post.tipo}</p>
                    </div>
                    {post.data_publicacao && <span className="text-xs text-gray-400">{formatDate(post.data_publicacao)}</span>}
                    <span className={cn('badge text-xs', {
                      'bg-emerald-100 text-emerald-700': post.status_interno === 'publicado',
                      'bg-blue-100 text-blue-700': post.status_interno === 'aprovado',
                      'bg-orange-100 text-orange-700': post.status_cliente === 'pendente',
                    })}>
                      {post.status_interno === 'publicado' ? 'Publicado' : post.status_interno === 'aprovado' ? 'Aprovado' : post.status_interno.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Métricas */}
          {dados.metricas && dados.metricas.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="section-title text-sm mb-4">Histórico de métricas</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Mês','Plataforma','Seguidores','Novos','Alcance','Engajamento'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.metricas.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-creme/50">
                      <td className="py-2 pr-4 font-medium">{m.mes_referencia}</td>
                      <td className="py-2 pr-4 text-gray-500">{m.plataforma}</td>
                      <td className="py-2 pr-4">{m.seguidores?.toLocaleString('pt-BR')}</td>
                      <td className="py-2 pr-4 text-emerald-600">+{m.novos_seguidores}</td>
                      <td className="py-2 pr-4">{m.alcance?.toLocaleString('pt-BR')}</td>
                      <td className="py-2 pr-4">{m.engajamento}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financeiro */}
          {dados.pagamentos && dados.pagamentos.length > 0 && (
            <div className="card">
              <h3 className="section-title text-sm mb-4">Histórico financeiro</h3>
              <div className="space-y-2">
                {dados.pagamentos.map((pag: any) => (
                  <div key={pag.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{pag.mes_referencia || 'Pagamento'}</p>
                      <p className="text-xs text-gray-400">Vence {formatDate(pag.vencimento)}</p>
                    </div>
                    <p className="text-sm font-semibold text-vinho">{formatCurrency(pag.valor)}</p>
                    <span className={cn('badge text-xs', {
                      'bg-emerald-100 text-emerald-700': pag.status === 'pago',
                      'bg-orange-100 text-orange-700': pag.status === 'pendente',
                      'bg-red-100 text-red-700': pag.status === 'atrasado',
                    })}>
                      {pag.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Selecione um cliente para gerar o relatório</p>
        </div>
      )}
    </div>
  )
}
