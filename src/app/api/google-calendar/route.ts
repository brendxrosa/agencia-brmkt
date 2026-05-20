import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshToken(refreshToken: string) {
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('google_access_token, google_refresh_token, google_token_expiry').eq('id', user.id).single()

    if (!profile?.google_access_token) {
      return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 })
    }

    let accessToken = profile.google_access_token

    // Renova token se expirado
    if (profile.google_token_expiry && new Date(profile.google_token_expiry) < new Date()) {
      if (profile.google_refresh_token) {
        const novos = await refreshToken(profile.google_refresh_token)
        if (novos.access_token) {
          accessToken = novos.access_token
          await supabase.from('profiles').update({
            google_access_token: novos.access_token,
            google_token_expiry: new Date(Date.now() + novos.expires_in * 1000).toISOString()
          }).eq('id', user.id)
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
        conferenceData: evento.link_online ? undefined : undefined,
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
        // Salva o ID do evento do Google no Supabase
        await supabase.from('eventos').update({ google_event_id: data.id })
          .eq('id', evento.id)
        return NextResponse.json({ success: true, googleEventId: data.id, link: data.htmlLink })
      }

      return NextResponse.json({ error: data.error?.message || 'Erro ao criar evento' }, { status: 400 })
    }

    if (action === 'deletar') {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${evento.google_event_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'listar') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=20&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      return NextResponse.json({ eventos: data.items || [] })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
