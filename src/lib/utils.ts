import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = "dd/MM/yyyy") {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export const STATUS_POST_LABELS: Record<string, string> = {
  // Fluxo principal
  copy: 'Copy',
  aguardando_cliente: 'Aguardando Cliente',
  design: 'Design',
  captacao: 'Captação',
  edicao: 'Edição',
  aprovacao_arte: 'Aprovação Final',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  // Legados / compatibilidade
  briefing: 'Briefing',
  revisao_interna: 'Revisão Interna',
  reprovado: 'Reprovado',
  para_captar: 'Para Captar',
  captado: 'Captado',
  pendente_edicao: 'Pendente Edição',
  agendado: 'Agendado',
  postado: 'Postado',
  concluido: 'Concluído',
}

export const STATUS_POST_CORES: Record<string, string> = {
  copy: 'bg-blue-100 text-blue-700',
  aguardando_cliente: 'bg-pink-100 text-pink-700',
  design: 'bg-purple-100 text-purple-700',
  captacao: 'bg-sky-100 text-sky-700',
  edicao: 'bg-orange-100 text-orange-700',
  aprovacao_arte: 'bg-violet-100 text-violet-700',
  aprovado: 'bg-green-100 text-green-700',
  publicado: 'bg-emerald-100 text-emerald-700',
  // Legados
  briefing: 'bg-gray-100 text-gray-600',
  revisao_interna: 'bg-yellow-100 text-yellow-700',
  reprovado: 'bg-red-100 text-red-700',
  para_captar: 'bg-sky-100 text-sky-700',
  captado: 'bg-teal-100 text-teal-700',
  pendente_edicao: 'bg-violet-100 text-violet-700',
  agendado: 'bg-indigo-100 text-indigo-700',
  postado: 'bg-emerald-100 text-emerald-700',
  concluido: 'bg-gray-100 text-gray-400',
}

// Etiquetas de feedback do cliente
export const ETIQUETA_LABELS: Record<string, string> = {
  aprovado: '✓ Aprovado',
  reprovado: '✗ Reprovado',
  ajuste_copy: 'Ajuste na copy',
  ajuste_arte: 'Ajuste na arte',
  ajuste_roteiro: 'Ajuste no roteiro',
  ajuste_data: 'Ajuste na data',
}

export const ETIQUETA_CORES: Record<string, string> = {
  aprovado: 'bg-green-100 text-green-700',
  reprovado: 'bg-red-100 text-red-700',
  ajuste_copy: 'bg-orange-100 text-orange-700',
  ajuste_arte: 'bg-purple-100 text-purple-700',
  ajuste_roteiro: 'bg-blue-100 text-blue-700',
  ajuste_data: 'bg-yellow-100 text-yellow-700',
}

// Status que o cliente pode ver (visíveis no portal)
export const STATUS_CLIENTE_VISIVEL: Record<string, string> = {
  aguardando_cliente: 'Aguardando sua aprovação',
  aprovado: 'Aprovado por você',
  reprovado: 'Reprovado — em ajuste',
  para_captar: 'Material a captar',
  captado: 'Material captado',
  pendente_edicao: 'Em edição',
  agendado: 'Agendado',
  postado: 'Postado',
  concluido: 'Concluído',
}

export const PRIORIDADE_CORES: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
}

export const CORES_CLIENTES = [
  '#6B0F2A', '#C2185B', '#7B1FA2', '#1565C0',
  '#00695C', '#E65100', '#4E342E', '#37474F',
  '#AD1457', '#283593', '#2E7D32', '#F57F17',
]
