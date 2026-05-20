'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, Instagram, Building, Eye, EyeOff, Save, KeyRound } from 'lucide-react'

export default function ClientePerfilPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase.from('profiles')
        .select('*, clientes(*)').eq('id', user.id).single()

      setProfile(p)
      setCliente(p?.clientes || null)
      setLoading(false)
    }
    init()
  }, [])

  async function salvarNome() {
    if (!profile) return
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('profiles')
      .update({ nome: profile.nome }).eq('id', profile.id)
    setSalvando(false)
    if (error) setErro('Erro ao salvar')
    else { setSucesso('Nome atualizado!'); setTimeout(() => setSucesso(''), 3000) }
  }

  async function alterarSenha() {
    if (!novaSenha || novaSenha.length < 6) return setErro('Senha deve ter no mínimo 6 caracteres')
    setSalvando(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvando(false)
    if (error) setErro('Erro ao alterar senha: ' + error.message)
    else {
      setSucesso('Senha alterada com sucesso!')
      setModalSenha(false)
      setNovaSenha('')
      setSenhaAtual('')
      setTimeout(() => setSucesso(''), 3000)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Informações da sua conta</p>
      </div>

      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          ✅ {sucesso}
        </div>
      )}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ❌ {erro}
        </div>
      )}

      {/* Dados do perfil */}
      <div className="card space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl flex-shrink-0"
            style={{ backgroundColor: cliente?.cor || '#6B0F2A' }}>
            {profile?.nome?.charAt(0) || 'C'}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{profile?.nome}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            <span className="badge bg-creme text-gray-600 text-xs mt-1">Cliente</span>
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <User size={13} /> Nome de exibição
          </label>
          <div className="flex gap-2">
            <input className="input flex-1" value={profile?.nome || ''}
              onChange={e => setProfile((p: any) => ({ ...p, nome: e.target.value }))} />
            <button onClick={salvarNome} disabled={salvando}
              className="btn-primary px-4 flex items-center gap-1.5">
              <Save size={14} /> {salvando ? '...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Mail size={13} /> E-mail
          </label>
          <input className="input bg-gray-50 text-gray-400 cursor-not-allowed" value={profile?.email || ''} disabled />
          <p className="text-xs text-gray-400 mt-1">Para alterar o e-mail, entre em contato com a agência</p>
        </div>
      </div>

      {/* Dados do cliente */}
      {cliente && (
        <div className="card space-y-3">
          <h3 className="section-title text-base">Dados da conta</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { icon: Building, label: 'Empresa', valor: cliente.empresa },
              { icon: Phone, label: 'Telefone', valor: cliente.telefone },
              { icon: Instagram, label: 'Instagram', valor: cliente.instagram },
              { icon: Mail, label: 'E-mail comercial', valor: cliente.email },
            ].filter(i => i.valor).map(({ icon: Icon, label, valor }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                  <Icon size={11} /> {label}
                </p>
                <p className="font-medium text-gray-800">{valor}</p>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Plano</p>
            <p className="text-sm font-medium text-gray-800">{cliente.plano} · R$ {cliente.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
          </div>
          <p className="text-xs text-gray-400">Para atualizar seus dados cadastrais, entre em contato com a agência.</p>
        </div>
      )}

      {/* Segurança */}
      <div className="card">
        <h3 className="section-title text-base mb-4">Segurança</h3>
        {!modalSenha ? (
          <button onClick={() => setModalSenha(true)}
            className="btn-secondary flex items-center gap-2">
            <KeyRound size={16} /> Alterar minha senha
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Nova senha *</label>
              <div className="relative">
                <input className="input pr-10" type={mostrarSenha ? 'text' : 'password'}
                  value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres" />
                <button onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setModalSenha(false); setNovaSenha('') }}
                className="btn-ghost flex-1">Cancelar</button>
              <button onClick={alterarSenha} disabled={salvando}
                className="btn-primary flex-1 justify-center">
                {salvando ? 'Salvando...' : 'Alterar senha'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
