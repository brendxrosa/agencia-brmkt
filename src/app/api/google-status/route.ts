import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ conectado: false })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('google_access_token')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ conectado: !!data?.google_access_token })
  } catch {
    return NextResponse.json({ conectado: false })
  }
}
