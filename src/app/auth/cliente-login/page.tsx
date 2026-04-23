'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ClienteLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos. Entre em contato com a agência.')
      setLoading(false)
      return
    }

    router.push('/cliente/calendario')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #4A0A1E 0%, #6B0F2A 50%, #8B1535 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 border border-white/20">
            <span className="text-white font-display font-bold text-xl">BR</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Agência BR MKT</h1>
          <p className="text-white/60 mt-1 text-sm">Área do cliente</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <h2 className="font-display text-xl font-semibold text-white mb-6">Acessar minha área</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
              />
            </div>

            {erro && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-3 py-2 rounded-xl">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-vinho font-semibold py-3 rounded-xl hover:bg-offwhite transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <a href="/auth/login" className="text-xs text-white/40 hover:text-white/70 transition-colors">
              Sou da equipe → área da agência
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
