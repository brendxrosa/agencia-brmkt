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
    if (!tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=token_invalido`)
    }

    // Pega email do Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const userInfo = await userInfoRes.json()

    // Salva com service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Tenta pelo email do Google
    let updated = false
    if (userInfo.email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id').eq('email', userInfo.email).single()
      
      if (profile) {
        const { error } = await supabaseAdmin.from('profiles').update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token || null,
          google_token_expiry: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
        }).eq('id', profile.id)
        
        if (!error) updated = true
      }
    }

    // Se não achou pelo email, salva em todos os admins
    if (!updated) {
      await supabaseAdmin.from('profiles').update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
      }).eq('role', 'admin')
    }

    return NextResponse.redirect(`${appUrl}/dashboard/agenda?google=conectado`)
  } catch (err) {
    console.error('Google OAuth erro:', err)
    return NextResponse.redirect(`${appUrl}/dashboard/agenda?erro=falha`)
  }
}
