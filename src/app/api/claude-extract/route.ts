import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Só usuários logados podem usar a chave da Anthropic
  const supabase = createClient()
  let { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (token) user = (await supabase.auth.getUser(token)).data.user
  }
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const seguro = {
      model: typeof body.model === 'string' && body.model.startsWith('claude-') ? body.model : 'claude-sonnet-4-20250514',
      max_tokens: Math.min(Number(body.max_tokens) || 1000, 8000),
      messages: body.messages,
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(seguro),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Falha na extração' }, { status: 500 })
  }
}
