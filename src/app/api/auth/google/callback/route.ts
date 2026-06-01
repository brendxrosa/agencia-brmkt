import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=sem_codigo`)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    // Se não tem token, redireciona com erro detalhado
    if (!tokens.access_token) {
      const erro = encodeURIComponent(JSON.stringify(tokens))
      return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=${erro}`)
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Atualiza TODOS os admins com o token
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
      })
      .eq('role', 'admin')

    if (error) {
      return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=db_${error.message}`)
    }

    return NextResponse.redirect(`${appUrl}/dashboard/agenda?google=conectado`)
  } catch (err: any) {
    return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=catch_${err.message}`)
  }
}
