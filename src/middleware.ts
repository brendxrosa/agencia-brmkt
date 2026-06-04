import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options ?? {})
          )
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

  // Não logado
  if (!user) {
    if (pathname.startsWith('/cliente')) {
      return NextResponse.redirect(new URL('/auth/cliente-login', request.url))
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Logado — verifica role pelo metadata do token (sem query ao banco)
  // O role é salvo nos metadados quando o usuário é criado
  const userMeta = user.user_metadata
  const role = userMeta?.role

  // Se não tem role no metadata, deixa passar e o layout cuida
  if (!role) return response

  // Cliente tentando acessar dashboard
  if (pathname.startsWith('/dashboard') && role === 'cliente') {
    return NextResponse.redirect(new URL('/cliente', request.url))
  }

  // Admin/equipe tentando acessar portal cliente
  if (pathname.startsWith('/cliente') && (role === 'admin' || role === 'equipe')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
