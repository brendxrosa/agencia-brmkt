'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Phone, Instagram, Building, Eye, EyeOff, Save, KeyRound, FileCheck, Download, Camera } from 'lucide-react'

export default function ClientePerfilPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [modalSenha, setModalSenha] = useState(false)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
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

  async function uploadFoto(file: File) {
    if (!profile?.id) return
    setUploadandoFoto(true)
    const ext = file.name.split('.').pop()
    const nomeSeguro = `avatar-${profile.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('docs').upload(`avatars/${nomeSeguro}`, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('docs').getPublicUrl(`avatars/${nomeSeguro}`)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
      setProfile((p: any) => ({ ...p, avatar_url: data.publicUrl }))
    }
    setUploadandoFoto(false)
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

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: cliente?.cor || '#6B0F2A' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              : (profile?.nome?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'VC')}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center cursor-pointer hover:bg-creme transition-all shadow-sm">
            {uploadandoFoto
              ? <div className="w-3 h-3 border-2 border-vinho/30 border-t-vinho rounded-full animate-spin" />
              : <Camera size={13} className="text-gray-500" />}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFoto(f) }} />
          </label>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{profile?.nome}</p>
          <p className="text-xs text-gray-400">{cliente?.nome}</p>
        </div>
      </div>
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

      {/* Meu Contrato */}
      {cliente && (cliente.plano || cliente.data_fim_contrato || cliente.contrato_url || cliente.servicos_contratados) && (
        <div className="card border-l-4 border-l-vinho">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-vinho" />
              <h3 className="section-title text-base">Meu contrato</h3>
            </div>
            {cliente.contrato_url && (
              <a href={cliente.contrato_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-vinho hover:underline font-medium">
                <Download size={13} /> Baixar contrato
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {cliente.plano && <div>
              <p className="text-xs text-gray-400">Plano</p>
              <p className="font-medium text-gray-800">{cliente.plano}</p>
            </div>}
            {cliente.valor_mensal && <div>
              <p className="text-xs text-gray-400">Valor mensal</p>
              <p className="font-medium text-gray-800">R$ {cliente.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>}
            {cliente.dia_vencimento && <div>
              <p className="text-xs text-gray-400">Vencimento</p>
              <p className="font-medium text-gray-800">Todo dia {cliente.dia_vencimento}</p>
            </div>}
            {cliente.forma_pagamento && <div>
              <p className="text-xs text-gray-400">Forma de pagamento</p>
              <p className="font-medium text-gray-800 capitalize">{cliente.forma_pagamento}</p>
            </div>}
            {cliente.data_inicio_contrato && <div>
              <p className="text-xs text-gray-400">Início</p>
              <p className="font-medium text-gray-800">{new Date(cliente.data_inicio_contrato + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>}
            {cliente.data_fim_contrato && <div>
              <p className="text-xs text-gray-400">Término</p>
              <p className="font-medium text-gray-800">{new Date(cliente.data_fim_contrato + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>}
          </div>
          {cliente.servicos_contratados && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">Serviços incluídos</p>
              <div className="flex flex-wrap gap-1.5">
                {cliente.servicos_contratados.split(/[,;\n]/).map((s: string, i: number) => s.trim() && (
                  <span key={i} className="badge bg-vinho/10 text-vinho text-xs">{s.trim()}</span>
                ))}
              </div>
            </div>
          )}
          {cliente.observacoes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Observações</p>
              <p className="text-sm text-gray-500 italic mt-0.5">{cliente.observacoes}</p>
            </div>
          )}
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
