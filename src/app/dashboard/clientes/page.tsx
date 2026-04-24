'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Cliente, CORES_CLIENTES } from '@/lib/utils'
import { formatCurrency, getInitials, cn } from '@/lib/utils'
import { Plus, Search, Users, MoreVertical, Instagram, Phone, Mail, X } from 'lucide-react'

const SEGMENTOS = ['Saúde', 'Beleza', 'Moda', 'Esporte', 'Alimentação', 'Educação', 'Tecnologia', 'Imobiliário', 'Jurídico', 'Outro']
const PLANOS = ['Básico', 'Intermediário', 'Premium', 'Personalizado']

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {children}
      </div>
    </div>
  )
}

function ClienteForm({ inicial, onSave, onClose }: {
  inicial?: Partial<Cliente>
  onSave: (data: Partial<Cliente>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Cliente>>({
    nome: '', email: '', telefone: '', instagram: '', empresa: '',
    segmento: '', plano: 'Básico', valor_mensal: 0, dia_vencimento: 10,
    status: 'ativo', cor: CORES_CLIENTES[0], persona: '', tom_de_voz: '', objetivo: '', observacoes: '',
    ...inicial
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-vinho">
          {inicial?.id ? 'Editar cliente' : 'Novo cliente'}
        </h2>
        <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
      </div>

      <div className="space-y-5">
        {/* Cor */}
        <div>
          <label className="label">Cor do cliente</label>
          <div className="flex gap-2 flex-wrap">
            {CORES_CLIENTES.map(cor => (
              <button key={cor} onClick={() => set('cor', cor)}
                className={cn('w-7 h-7 rounded-full border-2 transition-all', form.cor === cor ? 'border-gray-800 scale-110' : 'border-transparent')}
                style={{ backgroundColor: cor }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input className="input" value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Nome da empresa" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">E-mail *</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@cliente.com" />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(71) 99999-9999" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Instagram</label>
            <input className="input" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@cliente" />
          </div>
          <div>
            <label className="label">Segmento</label>
            <select className="input" value={form.segmento} onChange={e => set('segmento', e.target.value)}>
              <option value="">Selecione</option>
              {SEGMENTOS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Plano</label>
            <select className="input" value={form.plano} onChange={e => set('plano', e.target.value)}>
              {PLANOS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Valor mensal (R$)</label>
            <input className="input" type="number" value={form.valor_mensal} onChange={e => set('valor_mensal', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Dia vencimento</label>
            <input className="input" type="number" min={1} max={31} value={form.dia_vencimento} onChange={e => set('dia_vencimento', Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="label">Status</label>
          <div className="flex gap-2">
            {(['ativo', 'pausado', 'encerrado'] as const).map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                  form.status === s ? 'bg-vinho text-white' : 'bg-creme text-gray-600 hover:bg-rosa-pale')}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Persona / Público-alvo</label>
          <textarea className="input resize-none" rows={2} value={form.persona} onChange={e => set('persona', e.target.value)} placeholder="Descreva o público-alvo..." />
        </div>

        <div>
          <label className="label">Tom de voz</label>
          <input className="input" value={form.tom_de_voz} onChange={e => set('tom_de_voz', e.target.value)} placeholder="Ex: Descontraído, técnico, inspiracional..." />
        </div>

        <div>
          <label className="label">Objetivo</label>
          <input className="input" value={form.objetivo} onChange={e => set('objetivo', e.target.value)} placeholder="Ex: Aumentar seguidores, gerar leads..." />
        </div>

        <div>
          <label className="label">Observações</label>
          <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1 justify-center">
            {inicial?.id ? 'Salvar alterações' : 'Cadastrar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  async function carregar() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar(form: Partial<Cliente>) {
    if (!form.nome || !form.email) return alert('Nome e e-mail são obrigatórios!')

    if (editando?.id) {
      await supabase.from('clientes').update(form).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert(form)
    }

    setModalAberto(false)
    setEditando(null)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    carregar()
  }

  const filtrados = clientes.filter(c => {
    const buscaOk = c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase())
    const statusOk = filtroStatus === 'todos' || c.status === filtroStatus
    return buscaOk && statusOk
  })

  const ativos = clientes.filter(c => c.status === 'ativo').length
  const receitaMensal = clientes.filter(c => c.status === 'ativo').reduce((acc, c) => acc + c.valor_mensal, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{ativos} ativos · {formatCurrency(receitaMensal)}/mês</p>
        </div>
        <button onClick={() => { setEditando(null); setModalAberto(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[['todos', 'Todos'], ['ativo', 'Ativos'], ['pausado', 'Pausados'], ['encerrado', 'Encerrados']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroStatus(v)}
              className={cn('px-3 py-2 rounded-xl text-sm font-medium transition-all',
                filtroStatus === v ? 'bg-vinho text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-creme')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-creme" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre seu primeiro cliente!</p>
          <button onClick={() => setModalAberto(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Cadastrar cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(cliente => (
            <div key={cliente.id} className="card-hover group relative">
              {/* Menu */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button className="btn-ghost p-1.5" onClick={(e) => {
                    e.stopPropagation()
                    const menu = document.getElementById(`menu-${cliente.id}`)
                    if (menu) menu.classList.toggle('hidden')
                  }}>
                    <MoreVertical size={16} />
                  </button>
                  <div id={`menu-${cliente.id}`} className="hidden absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-card-hover z-10 py-1 min-w-32">
                    <button onClick={() => { setEditando(cliente); setModalAberto(true) }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-creme transition-colors">Editar</button>
                    <button onClick={() => excluir(cliente.id)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                  </div>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: cliente.cor }}>
                  {getInitials(cliente.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{cliente.nome}</p>
                  {cliente.empresa && <p className="text-xs text-gray-400 truncate">{cliente.empresa}</p>}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 mb-4">
                {cliente.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail size={12} /> <span className="truncate">{cliente.email}</span>
                  </div>
                )}
                {cliente.instagram && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Instagram size={12} /> <span>{cliente.instagram}</span>
                  </div>
                )}
                {cliente.telefone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={12} /> <span>{cliente.telefone}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-vinho">{formatCurrency(cliente.valor_mensal)}</p>
                  <p className="text-xs text-gray-400">{cliente.plano}</p>
                </div>
                <span className={cn('badge text-xs', {
                  'bg-emerald-100 text-emerald-700': cliente.status === 'ativo',
                  'bg-yellow-100 text-yellow-700': cliente.status === 'pausado',
                  'bg-red-100 text-red-700': cliente.status === 'encerrado',
                })}>
                  {cliente.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalAberto} onClose={() => { setModalAberto(false); setEditando(null) }}>
        <ClienteForm
          inicial={editando || undefined}
          onSave={salvar}
          onClose={() => { setModalAberto(false); setEditando(null) }}
        />
      </Modal>
    </div>
  )
}
