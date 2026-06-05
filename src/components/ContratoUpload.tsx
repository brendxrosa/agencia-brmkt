'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Upload, FileText, Sparkles, Check, AlertCircle, X, RefreshCw } from 'lucide-react'

interface DadosContrato {
  nome?: string
  email?: string
  telefone?: string
  empresa?: string
  data_inicio_contrato?: string
  data_fim_contrato?: string
  plano?: string
  valor_mensal?: number
  dia_vencimento?: number
  forma_pagamento?: string
  servicos_contratados?: string
  observacoes?: string
}

interface Props {
  clienteId: string
  onExtraido?: (dados: DadosContrato) => void
}

export default function ContratoUpload({ clienteId, onExtraido }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [extraindo, setExtraindo] = useState(false)
  const [dados, setDados] = useState<DadosContrato | null>(null)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [contratoUrl, setContratoUrl] = useState('')

  async function handleArquivo(file: File) {
    setArquivo(file)
    setErro('')
    setDados(null)
    setSalvo(false)
  }

  async function uploadEExtrair() {
    if (!arquivo) return
    setUploading(true)
    setErro('')

    // 1. Upload no Supabase Storage
    const path = `contratos/${clienteId}/${Date.now()}-${arquivo.name}`
    const { error: uploadError } = await supabase.storage
      .from('docs').upload(path, arquivo, { upsert: true })

    if (uploadError) {
      setErro('Erro ao fazer upload. Tente novamente.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('docs').getPublicUrl(path)
    setContratoUrl(publicUrl)
    setUploading(false)
    setExtraindo(true)

    // 2. Ler conteúdo do arquivo como base64
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(arquivo)
      })

      const isPdf = arquivo.type === 'application/pdf'
      const isDoc = arquivo.name.endsWith('.docx') || arquivo.name.endsWith('.doc')

      // 3. Chamar Claude via API para extrair dados
      const prompt = `Você é um assistente que extrai dados estruturados de contratos de prestação de serviços de marketing.

Analise o contrato abaixo e extraia APENAS os dados disponíveis. Retorne SOMENTE um JSON válido, sem markdown, sem explicação.

Estrutura esperada:
{
  "nome": "nome completo do contratante",
  "email": "email",
  "telefone": "telefone com DDD",
  "empresa": "nome da empresa/razão social se houver",
  "data_inicio_contrato": "AAAA-MM-DD",
  "data_fim_contrato": "AAAA-MM-DD",
  "plano": "nome do plano/pacote",
  "valor_mensal": 0000.00,
  "dia_vencimento": 10,
  "forma_pagamento": "pix/boleto/cartão/etc",
  "servicos_contratados": "lista resumida dos serviços incluídos",
  "observacoes": "cláusulas importantes ou observações relevantes"
}

Se algum campo não estiver no contrato, omita-o do JSON. Datas sempre no formato AAAA-MM-DD.`

      const body: any = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: isPdf ? [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: prompt }
          ] : [
            { type: 'text', text: prompt + '\n\n[Arquivo: ' + arquivo.name + ' — cole o conteúdo textual aqui se disponível]' }
          ]
        }]
      }

      const res = await fetch('/api/claude-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Falha na extração')

      const result = await res.json()
      const texto = result.content?.[0]?.text || ''
      const clean = texto.replace(/```json|```/g, '').trim()
      const extracted: DadosContrato = JSON.parse(clean)
      setDados(extracted)
    } catch (e) {
      setErro('Não foi possível extrair automaticamente. Você pode preencher os campos manualmente.')
    }

    setExtraindo(false)
  }

  async function salvarDados() {
    if (!dados) return
    const update: any = {
      contrato_url: contratoUrl,
      contrato_nome: arquivo?.name,
      contrato_extraido_em: new Date().toISOString(),
    }
    if (dados.nome) update.nome = dados.nome
    if (dados.email) update.email = dados.email
    if (dados.telefone) update.telefone = dados.telefone
    if (dados.empresa) update.empresa = dados.empresa
    if (dados.data_inicio_contrato) update.data_inicio_contrato = dados.data_inicio_contrato
    if (dados.data_fim_contrato) update.data_fim_contrato = dados.data_fim_contrato
    if (dados.plano) update.plano = dados.plano
    if (dados.valor_mensal) update.valor_mensal = dados.valor_mensal
    if (dados.dia_vencimento) update.dia_vencimento = dados.dia_vencimento
    if (dados.forma_pagamento) update.forma_pagamento = dados.forma_pagamento
    if (dados.servicos_contratados) update.servicos_contratados = dados.servicos_contratados
    if (dados.observacoes) update.observacoes = (dados.observacoes || '')

    await supabase.from('clientes').update(update).eq('id', clienteId)
    setSalvo(true)
    onExtraido?.(dados)
  }

  const formatarChave = (k: string) => ({
    nome: 'Nome', email: 'Email', telefone: 'Telefone', empresa: 'Empresa',
    data_inicio_contrato: 'Início', data_fim_contrato: 'Fim', plano: 'Plano',
    valor_mensal: 'Valor mensal', dia_vencimento: 'Dia vencimento',
    forma_pagamento: 'Forma de pagamento', servicos_contratados: 'Serviços',
    observacoes: 'Observações'
  }[k] || k)

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!arquivo && (
        <div
          className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-vinho/40 hover:bg-rosa-pale/10 transition-all"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleArquivo(f) }}>
          <Upload size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">
            Arraste o contrato ou <span className="text-vinho font-medium">clique para selecionar</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF ou Word (.docx)</p>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleArquivo(f) }} />
        </div>
      )}

      {/* Arquivo selecionado */}
      {arquivo && !dados && (
        <div className="flex items-center gap-3 p-4 bg-creme rounded-xl">
          <FileText size={20} className="text-vinho flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{arquivo.name}</p>
            <p className="text-xs text-gray-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={() => { setArquivo(null); setErro('') }} className="text-gray-400 hover:text-red-500">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Botão extrair */}
      {arquivo && !dados && !extraindo && !uploading && (
        <button onClick={uploadEExtrair}
          className="w-full flex items-center justify-center gap-2 bg-vinho text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-vinho/90 transition-all">
          <Sparkles size={16} /> Fazer upload e extrair dados com IA
        </button>
      )}

      {/* Loading */}
      {(uploading || extraindo) && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
          <RefreshCw size={16} className="text-blue-500 animate-spin flex-shrink-0" />
          <p className="text-sm text-blue-700">{uploading ? 'Fazendo upload...' : 'Extraindo dados com IA...'}</p>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {/* Dados extraídos */}
      {dados && !salvo && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles size={12} className="text-vinho" /> Dados extraídos — revise antes de salvar
          </p>
          <div className="bg-creme rounded-xl divide-y divide-gray-100">
            {Object.entries(dados).map(([k, v]) => v && (
              <div key={k} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">{formatarChave(k)}</span>
                <span className="text-sm text-gray-800 flex-1">{String(v)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setDados(null); setArquivo(null) }}
              className="flex-1 btn-secondary text-sm py-2.5">
              Descartar
            </button>
            <button onClick={salvarDados}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-all">
              <Check size={15} /> Confirmar e salvar
            </button>
          </div>
        </div>
      )}

      {salvo && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-4 py-3">
          <Check size={15} /> Dados do contrato salvos com sucesso!
        </div>
      )}
    </div>
  )
}
