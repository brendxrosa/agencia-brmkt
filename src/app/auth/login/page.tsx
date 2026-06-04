'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
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

    if (profile?.role === 'cliente') {
      // Cliente tentou logar aqui — manda pro portal dele
      router.push('/cliente')
    } else {
      router.push('/dashboard')
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
          <p className="text-white/60 text-sm mt-1">Área da equipe</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-8 shadow-2xl space-y-5">
          <h2 className="font-display text-xl font-semibold text-gray-800">Entrar na plataforma</h2>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="label">Senha</label>
            <input className="input" type="password" value={senha}
              onChange={e => setSenha(e.target.value)} required />
          </div>

          <button type="submit" disabled={carregando}
            className="btn-primary w-full justify-center py-3">
            {carregando ? '⏳ Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Sou cliente →{' '}
            <Link href="/auth/cliente-login" className="text-vinho hover:underline">
              acessar minha área
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
