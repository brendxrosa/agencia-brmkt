'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ClienteLoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos')
      setCarregando(false)
      return
    }

    // Verifica o role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'equipe') {
      // Equipe tentou logar aqui — manda pro dashboard
      router.push('/dashboard')
    } else {
      router.push('/cliente')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-vinho flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-display font-bold text-xl">BR</span>
          </div>
          <h1 className="text-white font-display text-2xl font-bold">Agência BR MKT</h1>
          <p className="text-white/60 text-sm mt-1">Área do cliente</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur rounded-3xl p-8 shadow-2xl space-y-5 border border-white/20">
          <h2 className="font-display text-xl font-semibold text-white">Acessar minha área</h2>

          {erro && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">E-mail</label>
            <input className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
              type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">Senha</label>
            <input className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
              type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
          </div>

          <button type="submit" disabled={carregando}
            className="w-full bg-white text-vinho font-semibold py-3 rounded-xl hover:bg-white/90 transition-all">
            {carregando ? '⏳ Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-xs text-white/40">
            Sou da equipe →{' '}
            <Link href="/auth/login" className="text-white/70 hover:text-white hover:underline">
              área da agência
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
