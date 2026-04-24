'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Plus, X, Users, Shield, User, Crown, Camera, Save, Edit2 } from 'lucide-react'

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
  const [membroEditando, setMembroEditando] = useState<any>(null)
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
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

  function abrirEditar(membro: any) {
    const equipeInfo = membro.equipe?.[0]
    setMembroEditando(membro)
    setFormEditar({
      nome: membro.nome,
      cargo: equipeInfo?.cargo || '',
      role: membro.role,
      modulos: equipeInfo?.modulos_acesso || [],
      avatar_url: membro.avatar_url || ''
    })
    setErro('')
    setModalEditar(true)
  }

  async function uploadAvatar(file: File, membroId: string) {
    const ext = file.name.split('.').pop()
    const path = `avatars/${membroId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function salvarEdicao() {
    if (!membroEditando) return
    setSalvando(true)
    setErro('')
    try {
      // Atualiza profile
      await supabase.from('profiles').update({
        nome: formEditar.nome,
        role: formEditar.role,
        avatar_url: formEditar.avatar_url || null
      }).eq('id', membroEditando.id)

      // Atualiza ou insere equipe
      const equipeInfo = membroEditando.equipe?.[0]
      if (equipeInfo) {
        await supabase.from('equipe').update({
          cargo: formEditar.cargo,
          modulos_acesso: formEditar.modulos
        }).eq('id', equipeInfo.id)
      } else {
        await supabase.from('equipe').insert({
          profile_id: membroEditando.id,
          cargo: formEditar.cargo,
          modulos_acesso: formEditar.modulos,
          ativo: true
        })
      }

      setModalEditar(false)
      carregar()
    } catch (err: any) {
      setErro(err.message)
    }
    setSalvando(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !membroEditando) return
    try {
      const url = await uploadAvatar(file, membroEditando.id)
      setFormEditar(f => ({ ...f, avatar_url: url }))
    } catch (err: any) {
      setErro('Erro ao fazer upload da foto: ' + err.message)
    }
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
        body: JSON.stringify({
          email: form.email, senha: form.senha, nome: form.nome,
          role: form.role, cargo: form.cargo, modulos: form.modulos
        })
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
      alert('Acesso criado! Cliente pode logar em: agencia-brmkt.vercel.app/auth/cliente-login')
    } catch (err: any) {
      setErro(err.message)
    }
    setCriando(false)
  }

  const toggleModulo = (modulo: string, tipo: 'form' | 'editar') => {
    if (tipo === 'form') {
      setForm(f => ({
        ...f,
        modulos: f.modulos.includes(modulo) ? f.modulos.filter(m => m !== modulo) : [...f.modulos, modulo]
      }))
    } else {
      setFormEditar(f => ({
        ...f,
        modulos: f.modulos.includes(modulo) ? f.modulos.filter(m => m !== modulo) : [...f.modulos, modulo]
      }))
    }
  }

  const Avatar = ({ membro, size = 'md' }: { membro: any, size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-lg', lg: 'w-20 h-20 text-2xl' }
    return membro.avatar_url ? (
      <img src={membro.avatar_url} alt={membro.nome}
        className={cn(sizes[size], 'rounded-2xl object-cover flex-shrink-0')} />
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="card h-40 animate-pulse bg-creme" />)}
        </div>
      ) : membros.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum membro cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {membros.map(membro => {
            const roleKey = membro.role as keyof typeof ROLE_CONFIG
            const role = ROLE_CONFIG[roleKey] || ROLE_CONFIG.equipe
            const Icon = role.icon
            const equipeInfo = membro.equipe?.[0]
            return (
              <div key={membro.id} className="card group">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar membro={membro} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{membro.nome}</p>
                    <p className="text-xs text-gray-400">{membro.email}</p>
                    {equipeInfo?.cargo && <p className="text-xs text-gray-400">{equipeInfo.cargo}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('badge text-xs flex items-center gap-1', role.cor)}>
                      <Icon size={11} /> {role.label}
                    </span>
                    <button onClick={() => abrirEditar(membro)}
                      className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 transition-all">
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                {equipeInfo?.modulos_acesso && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Shield size={11} /> Módulos com acesso
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {equipeInfo.modulos_acesso.map((m: string) => (
                        <span key={m} className="badge bg-creme text-gray-600 text-xs">
                          {MODULOS_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="card border-l-4 border-l-rosa bg-rosa-pale/20">
        <h3 className="section-title text-sm mb-2">Portal do cliente</h3>
        <p className="text-sm text-gray-600">
          Link de acesso: <span className="font-mono text-xs bg-white px-2 py-1 rounded-lg border">agencia-brmkt.vercel.app/auth/cliente-login</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">Cada cliente acessa apenas seu próprio painel.</p>
      </div>

      {/* Modal editar membro */}
      <Modal open={modalEditar} onClose={() => setModalEditar(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-vinho">Editar perfil</h2>
            <button onClick={() => setModalEditar(false)} className="btn-ghost p-2"><X size={18} /></button>
          </div>

          {membroEditando && (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {formEditar.avatar_url ? (
                    <img src={formEditar.avatar_url} alt="Avatar"
                      className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-vinho flex items-center justify-center text-white font-display font-bold text-2xl">
                      {getInitials(formEditar.nome || membroEditando.nome)}
                    </div>
                  )}
                  <button onClick={() => avatarRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-vinho rounded-full flex items-center justify-center shadow-lg hover:bg-vinho-light transition-colors">
                    <Camera size={13} className="text-white" />
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="text-xs text-gray-400">Clique na câmera para alterar a foto</p>
              </div>

              <div>
                <label className="label">Nome</label>
                <input className="input" value={formEditar.nome} onChange={e => setFormEditar(f => ({ ...f, nome: e.target.value }))} />
              </div>

              <div>
                <label className="label">Cargo</label>
                <input className="input" value={formEditar.cargo} onChange={e => setFormEditar(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Copywriter, Designer..." />
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
                  <Save size={14} />
                  {salvando ? 'Salvando...' : 'Salvar'}
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
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input className="input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Copywriter..." />
              </div>
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Senha *</label>
              <input className="input" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label">Perfil</label>
              <div className="flex gap-2">
                {(['equipe','admin'] as const).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                      form.role === r ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                    {r === 'admin' ? '👑 Admin' : '👥 Equipe'}
                  </button>
                ))}
              </div>
            </div>
            {form.role === 'equipe' && (
              <div>
                <label className="label">Módulos com acesso</label>
                <div className="flex flex-wrap gap-2">
                  {MODULOS.map(m => (
                    <button key={m} onClick={() => toggleModulo(m, 'form')}
                      className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                        form.modulos.includes(m) ? 'bg-vinho text-white' : 'bg-creme text-gray-600')}>
                      {MODULOS_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalNovo(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarMembro} disabled={criando} className="btn-primary flex-1 justify-center">
                {criando ? 'Criando...' : 'Criar membro'}
              </button>
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
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={formCliente.cliente_id} onChange={e => setFormCliente(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Selecione o cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input className="input" type="email" value={formCliente.email} onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Senha *</label>
              <input className="input" type="password" value={formCliente.senha} onChange={e => setFormCliente(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="bg-creme rounded-xl p-3 text-xs text-gray-500">
              Cliente acessa em: <strong>agencia-brmkt.vercel.app/auth/cliente-login</strong>
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalCliente(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarAcessoCliente} disabled={criando} className="btn-primary flex-1 justify-center">
                {criando ? 'Criando...' : 'Criar acesso'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
