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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export const STATUS_POST_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  copy: 'Copy',
  design: 'Design',
  edicao: 'Edição',
  revisao_interna: 'Revisão Interna',
  aguardando_cliente: 'Aguardando Cliente',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  reprovado: 'Reprovado',
}

export const STATUS_POST_CORES: Record<string, string> = {
  briefing: 'bg-gray-100 text-gray-700',
  copy: 'bg-blue-100 text-blue-700',
  design: 'bg-purple-100 text-purple-700',
  edicao: 'bg-orange-100 text-orange-700',
  revisao_interna: 'bg-yellow-100 text-yellow-700',
  aguardando_cliente: 'bg-pink-100 text-pink-700',
  aprovado: 'bg-green-100 text-green-700',
  publicado: 'bg-emerald-100 text-emerald-700',
  reprovado: 'bg-red-100 text-red-700',
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
