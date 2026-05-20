import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Pega token direto pelo service role — sem depender de sessão
    const authHeader = request.headers.get('authorization')
    let userId = ''

    // Tenta pegar pelo JWT do Supabase
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data } = await supabaseAdmin.auth.getUser(token)
      userId = data.user?.id || ''
    }

    // Se não tem userId, pega o admin
    let profile: any = null
    if (userId) {
      const { data } = await supabaseAdmin.from('profiles')
        .select('google_access_token, google_refresh_token, google_token_expiry')
        .eq('id', userId).single()
      profile = data
    } else {
      const { data } = await supabaseAdmin.from('profiles')
        .select('google_access_token, google_refresh_token, google_token_expiry')
        .eq('role', 'admin')
        .not('google_access_token', 'is', null)
        .single()
      profile = data
    }

    if (!profile?.google_access_token) {
      return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 })
    }

    let accessToken = profile.google_access_token

    // Renova token só se tiver expirado E tiver refresh token
    if (profile.google_token_expiry && profile.google_refresh_token) {
      if (new Date(profile.google_token_expiry) < new Date()) {
        const novos = await refreshAccessToken(profile.google_refresh_token)
        if (novos.access_token) {
          accessToken = novos.access_token
          await supabaseAdmin.from('profiles').update({
            google_access_token: novos.access_token,
            google_token_expiry: new Date(Date.now() + novos.expires_in * 1000).toISOString()
          }).eq('role', 'admin')
        }
      }
    }

    const body = await request.json()
    const { action, evento } = body

    if (action === 'criar') {
      const googleEvento = {
        summary: evento.titulo,
        description: evento.descricao || '',
        location: evento.local || '',
        start: evento.dia_todo
          ? { date: evento.data_inicio.split('T')[0] }
          : { dateTime: evento.data_inicio, timeZone: 'America/Bahia' },
        end: evento.dia_todo
          ? { date: (evento.data_fim || evento.data_inicio).split('T')[0] }
          : { dateTime: evento.data_fim || evento.data_inicio, timeZone: 'America/Bahia' },
      }

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvento),
      })

      const data = await res.json()
      if (data.id) {
        if (evento.id) {
          await supabaseAdmin.from('eventos').update({ google_event_id: data.id }).eq('id', evento.id)
        }
        return NextResponse.json({ success: true, googleEventId: data.id, link: data.htmlLink })
      }
      return NextResponse.json({ error: data.error?.message || 'Erro ao criar evento' }, { status: 400 })
    }

    if (action === 'deletar') {
      if (evento.google_event_id) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${evento.google_event_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'listar') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=50&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      return NextResponse.json({ eventos: data.items || [], total: data.items?.length || 0 })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    console.error('Google Calendar erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
