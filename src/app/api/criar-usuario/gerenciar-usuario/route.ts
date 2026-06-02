import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'ativar') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await supabaseAdmin.from('profiles').update({ ativo: true }).eq('id', userId)
      return NextResponse.json({ success: true })
    }

    if (action === 'desativar') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '87600h' })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await supabaseAdmin.from('profiles').update({ ativo: false }).eq('id', userId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
