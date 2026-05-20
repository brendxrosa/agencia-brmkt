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
    const redirectUri = `${appUrl}/api/auth/google/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=token_invalido`)
    }

    // Usa service role pra salvar sem precisar de sessão
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Pega o email do Google pra identificar o usuário
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const userInfo = await userInfoRes.json()

    if (userInfo.email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', userInfo.email)
        .single()

      if (profile) {
        await supabaseAdmin.from('profiles').update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token || null,
          google_token_expiry: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
        }).eq('id', profile.id)
      }
    }

    return NextResponse.redirect(`${appUrl}/dashboard/agenda?google=conectado`)
  } catch (err) {
    console.error('Google OAuth erro:', err)
    return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=falha`)
  }
}
