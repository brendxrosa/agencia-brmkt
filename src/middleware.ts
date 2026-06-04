import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rotas públicas — sem verificação
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return response
  }

  // Não logado — redireciona pro login correto
  if (!user) {
    if (pathname.startsWith('/cliente')) {
      return NextResponse.redirect(new URL('/auth/cliente-login', request.url))
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Busca o role do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // CLIENTE tentando acessar dashboard → manda pro portal do cliente
  if (pathname.startsWith('/dashboard') && role === 'cliente') {
    return NextResponse.redirect(new URL('/cliente', request.url))
  }

  // ADMIN/EQUIPE tentando acessar portal do cliente → manda pro dashboard
  if (pathname.startsWith('/cliente') && (role === 'admin' || role === 'equipe')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Usuário sem role reconhecido → desloga e manda pro login
  if (!role) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
