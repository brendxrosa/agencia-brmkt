import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, userId, senha } = body

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (action === 'resetar_senha') {
      if (!senha || senha.length < 6) {
        return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: senha })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'ativar') {
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      await supabaseAdmin.from('profiles').update({ ativo: true }).eq('id', userId)
      return NextResponse.json({ success: true })
    }

    if (action === 'desativar') {
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
      await supabaseAdmin.from('profiles').update({ ativo: false }).eq('id', userId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
