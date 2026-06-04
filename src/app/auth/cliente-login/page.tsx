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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'equipe') {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/cliente'
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-rosa to-vinho flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{
                width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)'
              }} />
          ))}
        </div>
        <div className="relative text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur">
            <span className="font-display font-bold text-3xl">BR</span>
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">Agência BR MKT</h1>
          <p className="text-white/70 text-lg mb-8">Seu portal exclusivo</p>
          <div className="space-y-3 text-left">
            {['Aprove conteúdos', 'Acompanhe seu calendário', 'Acesse seus documentos', 'Fale com a equipe'].map(item => (
              <div key={item} className="flex items-center gap-3 text-white/80">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-offwhite p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-rosa rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-display font-bold text-xl">BR</span>
            </div>
            <h1 className="font-display text-xl font-bold text-vinho">Agência BR MKT</h1>
          </div>

          <div className="mb-8">
            <span className="badge bg-rosa/10 text-rosa text-xs font-semibold px-3 py-1 rounded-full">
              🧑‍💼 Portal do Cliente
            </span>
            <h2 className="font-display text-2xl font-bold text-gray-800 mt-3">Acessar minha área</h2>
            <p className="text-gray-500 text-sm mt-1">Entre com suas credenciais de acesso</p>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="seu@email.com" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input className="input" type="password" value={senha}
                onChange={e => setSenha(e.target.value)} required
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={carregando}
              className="w-full bg-rosa text-white font-semibold py-3 rounded-xl hover:bg-rosa/90 transition-all mt-2">
              {carregando ? '⏳ Entrando...' : 'Entrar →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Sou da equipe →{' '}
            <Link href="/auth/login" className="text-vinho hover:underline font-medium">
              área da agência
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
