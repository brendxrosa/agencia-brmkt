'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  clienteId: string
  clienteNome: string
  valor: number
  vencimento: string
}

export default function BotaoCobranca({ clienteId, clienteNome, valor, vencimento }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviarCobranca() {
    if (!confirm(`Enviar cobrança para ${clienteNome} via chat?`)) return
    setEnviando(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', user.id).single()

    await supabase.from('mensagens').insert({
      cliente_id: clienteId,
      autor_id: user.id,
      autor_nome: profile?.nome || 'Agência BR MKT',
      autor_role: 'admin',
      conteudo: `Olá, ${clienteNome}! 👋 Passando para lembrar que há um pagamento em aberto no valor de ${formatCurrency(valor)}, com vencimento em ${formatDate(vencimento)}. Por favor, entre em contato para regularizar. Qualquer dúvida, estamos à disposição! 🙏`,
      assunto: 'Pagamento / Financeiro',
      lida: false,
    })

    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) return <span className="text-xs text-emerald-600 font-medium">✓ Cobrança enviada</span>

  return (
    <button onClick={enviarCobranca} disabled={enviando}
      className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors underline">
      {enviando ? 'Enviando...' : '💬 Enviar cobrança'}
    </button>
  )
}
