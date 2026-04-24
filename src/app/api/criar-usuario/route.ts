import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, senha, nome, role, cargo, modulos, cliente_id } = body

    if (!email || !senha || !nome || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    // Usa a service role key — só disponível no servidor
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Cria o usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Usuário não criado')

    const userId = authData.user.id

    // Cria o profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId, email, nome, role,
      ...(cliente_id ? { cliente_id } : {})
    })
    if (profileError) throw profileError

    // Se for equipe, cria registro na tabela equipe
    if (role === 'equipe' || role === 'admin') {
      await supabaseAdmin.from('equipe').insert({
        profile_id: userId,
        cargo: cargo || '',
        modulos_acesso: modulos || ['clientes','kanban','calendario','tarefas'],
        ativo: true
      })
    }

    return NextResponse.json({ success: true, userId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
