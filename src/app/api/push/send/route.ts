import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { titulo, mensagem, url, userId } = body

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Busca subscriptions
    let query = supabaseAdmin.from('push_subscriptions').select('*')
    if (userId) query = query.eq('user_id', userId)

    const { data: subs } = await query

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'Nenhuma subscription encontrada' })
    }

    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      'mailto:contatobrendarosa@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const payload = JSON.stringify({ title: titulo, body: mensagem, url })
    const resultados = await Promise.allSettled(
      subs.map(sub =>
        webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
      )
    )

    const enviados = resultados.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ success: true, enviados })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
