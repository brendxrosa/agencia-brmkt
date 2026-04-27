'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Plus, X, Users, Shield, User, Crown, Camera, Save, Edit2, Power, KeyRound, Eye, EyeOff } from 'lucide-react'

const MODULOS = ['clientes','kanban','calendario','agenda','tarefas','prospeccao','financeiro','metricas','docs','relatorios','onboarding']
const MODULOS_LABELS: Record<string, string> = {
  clientes: 'Clientes', kanban: 'Kanban', calendario: 'Calendário',
  agenda: 'Agenda', tarefas: 'Tarefas', prospeccao: 'Prospecção',
  financeiro: 'Financeiro', metricas: 'Métricas', docs: 'Docs',
  relatorios: 'Relatórios', onboarding: 'Onboarding'
}
const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Crown, cor: 'bg-vinho text-white' },
  equipe: { label: 'Equipe', icon: Users, cor: 'bg-blue-100 text-blue-700' },
  cliente: { label: 'Cliente', icon: User, cor: 'bg-gray-100 text-gray-700' },
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default function EquipePage() {
  const supabase = createClient()
  const [membros, setMembros] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalSenha, setModalSenha] = useState(false)
  const [membroEditando, setMembroEditando] = useState<any>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nome: '', email: '', senha: '', cargo: '',
    role: 'equipe' as 'equipe' | 'admin',
    modulos: ['clientes','kanban','calendario','tarefas'] as string[]
  })
  const [formEditar, setFormEditar] = useState({
    nome: '', cargo: '', role: 'equipe' as string,
    modulos: [] as string[], avatar_url: ''
  })
  const [formCliente, setFormCliente] = useState({ cliente_id: '', email: '', senha: '' })

  async function carregar() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*, equipe(id, cargo, modulos_acesso, ativo)').in('role', ['admin','equipe']),
      supabase.from('clientes').select('id, nome, cor').eq('status', 'ativo').order('nome')
    ])
    setMembros(p || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function chamarAPI(body: any) {
    const res = await fetch('/api/gerenciar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  }

  async function toggleAtivo(membro: any) {
    const ativo = membro.ativo !== false
    if (!confirm(`${ativo ? 'Desativar' : 'Ativar'} acesso de ${membro.nome}?`)) return
    try {
      await chamarAPI({ action: ativo ? 'desativar' : 'ativar', userId: membro.id })
      setSucesso(`Acesso de ${membro.nome} ${ativo ? 'desativado' : 'ativado'}!`)
      setTimeout(() => setSucesso(''), 3000)
      carregar()
    } catch (err: any) {
      setErro(err.message)
      setTimeout(() => setErro(''), 3000)
    }
  }

  async function resetarSenha() {
    if (!novaSenha || novaSenha.length < 6) return setErro('Senha deve ter no mínimo 6 caracteres')
    setSalvando(true)
    try {
      await chamarAPI({ action: 'resetar_senha', userId: membroEditando.id, senha: novaSenha })
      setSucesso('Senha alterada com sucesso!')
      setModalSenha(false)
      setNovaSenha('')
      setTimeout(() => setSucesso(''), 3000)
    } catch (err: any) {
      setErro(err.message)
    }
    setSalvando(false)
  }

  async function uploadAvatar(file: File, membroId: string) {
    const ext = file.name.split('.').pop()
    const path = `avatars/${membroId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !membroEditando) return
    try {
      const url = await uploadAvatar(file, membroEditando.id)
      setFormEditar(f => ({ ...f, avatar_url: url }))
    } catch (err: any) {
      setErro('Erro ao fazer upload: ' + err.message)
    }
  }

  function abrirEditar(membro: any) {
    const equipeInfo = membro.equipe?.[0]
    setMembroEditando(membro)
    setFormEditar({
      nome: membro.nome, cargo: equipeInfo?.cargo || '',
      role: membro.role, modulos: equipeInfo?.modulos_acesso || [],
      avatar_url: membro.avatar_url || ''
    })
    setErro('')
    setModalEditar(true)
  }

  async function salvarEdicao() {
    if (!membroEditando) return
    setSalvando(true)
    setErro('')
    try {
      await supabase.from('profiles').update({
        nome: formEditar.nome, role: formEditar.role,
        avatar_url: formEditar.avatar_url || null
      }).eq('id', membroEditando.id)

      const equipeInfo = membroEditando.equipe?.[0]
      if (equipeInfo) {
        await supabase.from('equipe').update({
          cargo: formEditar.cargo, modulos_acesso: formEditar.modulos
        }).eq('id', equipeInfo.id)
      } else {
        await supabase.from('equipe').insert({
          profile_id: membroEditando.id, cargo: formEditar.cargo,
          modulos_acesso: formEditar.modulos, ativo: true
        })
      }
      setModalEditar(false)
      carregar()
    } catch (err: any) {
      setErro(err.message)
    }
    setSalvando(false)
  }

  async function criarMembro() {
    if (!form.nome || !form.email || !form.senha) return setErro('Nome, e-mail e senha são obrigatórios!')
    if (form.senha.length < 6) return setErro('Senha deve ter no mínimo 6 caracteres')
    setCriando(true)
    setErro('')
    try {
      const res = await fetch('/api/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, senha: form.senha, nome: form.nome, role: form.role, cargo: form.cargo, modulos: form.modulos })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModalNovo(false)
      setForm({ nome: '', email: '', senha: '', cargo: '', role: 'equipe', modulos: ['clientes','kanban','calendario','tarefas'] })
      carregar()
    } catch (err: any) {
      setErro(err.message)
    }
    setCriando(false)
  }

  async function criarAcessoCliente() {
    if (!formCliente.cliente_id || !formCliente.email || !formCliente.senha) return setErro('Todos os campos são obrigatórios!')
    if (formCliente.senha.length < 6) return setErro('Senha deve ter no mínimo 6 caracteres')
    setCriando(true)
    setErro('')
    try {
      const res = await fetch('/api/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formCliente.email, senha: formCliente.senha,
          nome: clientes.find(c => c.id === formCliente.cliente_id)?.nome || 'Cliente',
          role: 'cliente', cliente_id: formCliente.cliente_id
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModalCliente(false)
      setFormCliente({ cliente_id: '', email: '', senha: '' })
      alert('Acesso criado! Cliente acessa em: agencia-brmkt.vercel.app/auth/cliente-login')
    } catch (err: any) {
      setErro(err.message)
    }
    setCriando(false)
  }

  const toggleModulo = (modulo: string, tipo: 'form' | 'editar') => {
    if (tipo === 'form') {
      setForm(f => ({ ...f, modulos: f.modulos.includes(modulo) ? f.modulos.filter(m => m !== modulo) : [...f.modulos, modulo] }))
    } else {
      setFormEditar(f => ({ ...f, modulos: f.modulos.includes(modulo) ? f.modulos.filter(m => m !== modulo) : [...f.modulos, modulo] }))
    }
  }

  const Avatar = ({ membro, size = 'md' }: { membro: any, size?: 'sm' | 'md' }) => {
    const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-lg' }
    return membro.avatar_url ? (
      <img src={membro.avatar_url} alt={membro.nome} className={cn(sizes[size], 'rounded-2xl object-cover flex-shrink-0')} />
    ) : (
      <div className={cn(sizes[size], 'rounded-2xl bg-vinho flex items-center justify-center text-white font-display font-bold flex-shrink-0')}>
        {getInitials(membro.nome)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Equipe & Acessos</h1>
          <p className="text-gray-500 text-sm mt-1">{membros.length} membro(s) na equipe</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setErro(''); setModalCliente(true) }} className="btn-secondary flex items-center gap-2">
            <User size={16} /> Acesso para cliente
          </button>
          <button onClick={() => { setErro(''); setModalNovo(true) }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo membro
          </button>
        </div>
      </div>

      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
          ✅ {sucesso}
        </div>
      )}
      {erro && !modalEditar && !modalNovo && !modalCliente && !modalSenha && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          ❌ {erro}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="card h-40 animate-pulse bg-creme" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {membros.map(membro => {
            const roleKey = membro.role as keyof typeof ROLE_CONFIG
            const role = ROLE_CONFIG[roleKey] || ROLE_CONFIG.equipe
            const Icon = role.icon
            const equipeInfo = membro.equipe?.[0]
            const ativo = membro.ativo !== false

            return (
              <div key={membro.id} className={cn('card group', !ativo && 'opacity-60')}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Avatar membro={membro} />
                    {!ativo && (
                      <div className="absolute inset-0 rounded-2xl bg-gray-500/40 flex items-center justify-center">
                        <Power size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{membro.nome}</p>
                      {!ativo && <span className="badge bg-gray-100 text-gray-500 text-xs">Inativo</span>}
                    </div>
                    <p className="text-xs text-gray-400">{membro.email}</p>
                    {equipeInfo?.cargo && <p className="text-xs text-gray-400">{equipeInfo.cargo}</p>}
                  </div>
                  <span className={cn('badge text-xs flex items-center gap-1', role.cor)}>
                    <Icon size={11} /> {role.label}
                  </span>
                </div>

                {equipeInfo?.modulos_acesso && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                      <Shield size={11} /> Módulos com acesso
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {equipeInfo.modulos_acesso.map((m: string) => (
                        <span key={m} className="badge bg-creme text-gray-600 text-xs">{MODULOS_LABELS[m] || m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => abrirEditar(membro)}
                    className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1.5">
                    <Edit2 size={13} /> Editar
                  </button>
                  <button onClick={() => { setMembroEditando(membro); setNovaSenha(''); setErro(''); setModalSenha(true) }}
                    className="flex-1 btn-ghost text-xs py-1.5 flex items-center justify-center gap-1.5">
                    <KeyRound size={13} /> Senha
                  </button>
                  <button onClick={() => toggleAtivo(membro)}
                    className={cn('flex-1 text-xs py-1.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all',
                      ativo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}>
                    <Power size={13} /> {ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card border-l-4 border-l-rosa bg-rosa-pale/20">
        <h3 className="section-title text-sm mb-2">Portal do cliente</h3>
        <p className="text-sm text-gray-600">
          Link: <span className="font-mono text-xs bg-white px-2 py-1 rounded-lg border">agencia-brmkt.vercel.app/auth/cliente-login</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Para desativar um cliente, edite o status dele em Clientes → Encerrado.</p>
      </div>

      {/* Modal resetar senha */}
      <Modal open={modalSenha} onClose={() => setModalSenha(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Redefinir senha</h2>
            <button onClick={() => setModalSenha(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          {membroEditando && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-creme rounded-xl">
                <Avatar membro={membroEditando} size="sm" />
                <div>
                  <p className="text-sm font-medium">{membroEditando.nome}</p>
                  <p className="text-xs text-gray-400">{membroEditando.email}</p>
                </div>
              </div>
              <div>
                <label className="label">Nova senha *</label>
                <div className="relative">
                  <input className="input pr-10" type={mostrarSenha ? 'text' : 'password'}
                    value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres" />
                  <button onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalSenha(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={resetarSenha} disabled={salvando} className="btn-primary flex-1 justify-center">
                  {salvando ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal editar */}
      <Modal open={modalEditar} onClose={() => setModalEditar(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Editar perfil</h2>
            <button onClick={() => setModalEditar(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          {membroEditando && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {formEditar.avatar_url ? (
                    <img src={formEditar.avatar_url} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-vinho flex items-center justify-center text-white font-display font-bold text-2xl">
                      {getInitials(formEditar.nome || membroEditando.nome)}
                    </div>
                  )}
                  <button onClick={() => avatarRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-vinho rounded-full flex items-center justify-center shadow-lg">
                    <Camera size={13} className="text-white" />
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="text-xs text-gray-400">Clique na câmera para alterar</p>
              </div>
              <div>
                <label className="label">Nome</label>
                <input className="input" value={formEditar.nome} onChange={e => setFormEditar(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input className="input" value={formEditar.cargo} onChange={e => setFormEditar(f => ({ ...f, cargo: e.target.value }))} />
              </div>
              <div>
                <label className="label">Perfil</label>
                <div className="flex gap-2">
                  {(['equipe','admin'] as const).map(r => (
                    <button key={r} onClick={() => setFormEditar(f => ({ ...f, role: r }))}
                      className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                        formEditar.role === r ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                      {r === 'admin' ? '👑 Admin' : '👥 Equipe'}
                    </button>
                  ))}
                </div>
              </div>
              {formEditar.role === 'equipe' && (
                <div>
                  <label className="label">Módulos com acesso</label>
                  <div className="flex flex-wrap gap-2">
                    {MODULOS.map(m => (
                      <button key={m} onClick={() => toggleModulo(m, 'editar')}
                        className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                          formEditar.modulos.includes(m) ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                        {MODULOS_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalEditar(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={salvarEdicao} disabled={salvando} className="btn-primary flex-1 justify-center flex items-center gap-2">
                  <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal novo membro */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Novo membro</h2>
            <button onClick={() => setModalNovo(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Nome *</label><input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><label className="label">Cargo</label><input className="input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Copywriter" /></div>
            </div>
            <div><label className="label">E-mail *</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Senha *</label><input className="input" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
            <div>
              <label className="label">Perfil</label>
              <div className="flex gap-2">
                {(['equipe','admin'] as const).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all', form.role === r ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                    {r === 'admin' ? '👑 Admin' : '👥 Equipe'}
                  </button>
                ))}
              </div>
            </div>
            {form.role === 'equipe' && (
              <div>
                <label className="label">Módulos</label>
                <div className="flex flex-wrap gap-2">
                  {MODULOS.map(m => (
                    <button key={m} onClick={() => toggleModulo(m, 'form')}
                      className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all', form.modulos.includes(m) ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                      {MODULOS_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalNovo(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarMembro} disabled={criando} className="btn-primary flex-1 justify-center">{criando ? 'Criando...' : 'Criar membro'}</button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal acesso cliente */}
      <Modal open={modalCliente} onClose={() => setModalCliente(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Criar acesso para cliente</h2>
            <button onClick={() => setModalCliente(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div><label className="label">Cliente *</label>
              <select className="input" value={formCliente.cliente_id} onChange={e => setFormCliente(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div><label className="label">E-mail *</label><input className="input" type="email" value={formCliente.email} onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Senha *</label><input className="input" type="password" value={formCliente.senha} onChange={e => setFormCliente(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
            <div className="bg-creme rounded-xl p-3 text-xs text-gray-500">
              Cliente acessa em: <strong>agencia-brmkt.vercel.app/auth/cliente-login</strong>
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalCliente(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarAcessoCliente} disabled={criando} className="btn-primary flex-1 justify-center">{criando ? 'Criando...' : 'Criar acesso'}</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
