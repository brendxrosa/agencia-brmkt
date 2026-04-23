export type Role = 'admin' | 'equipe' | 'cliente'

export interface Profile {
  id: string
  email: string
  nome: string
  role: Role
  avatar_url?: string
  cliente_id?: string
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  empresa?: string
  email: string
  telefone?: string
  instagram?: string
  segmento?: string
  plano: string
  valor_mensal: number
  dia_vencimento: number
  status: 'ativo' | 'pausado' | 'encerrado'
  cor: string
  persona?: string
  tom_de_voz?: string
  objetivo?: string
  observacoes?: string
  created_at: string
}

export interface Post {
  id: string
  cliente_id: string
  titulo: string
  tipo: 'reels' | 'carrossel' | 'feed' | 'stories' | 'tiktok'
  plataforma: string[]
  status_interno: 'briefing' | 'copy' | 'design' | 'edicao' | 'revisao_interna' | 'aguardando_cliente' | 'aprovado' | 'publicado' | 'reprovado'
  status_cliente?: 'pendente' | 'aprovado' | 'reprovado'
  feedback_cliente?: string
  data_publicacao?: string
  tema?: string
  direcionamento?: string
  copy?: string
  legenda?: string
  responsavel_id?: string
  created_at: string
}

export interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  cliente_id?: string
  responsavel_id?: string
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'pendente' | 'em_progresso' | 'concluida'
  prazo?: string
  created_at: string
}

export interface Evento {
  id: string
  titulo: string
  descricao?: string
  tipo: 'reuniao' | 'captacao' | 'entrega' | 'pagamento' | 'outro'
  cliente_id?: string
  participantes?: string[]
  data_inicio: string
  data_fim?: string
  dia_todo: boolean
  visivel_cliente: boolean
  status: 'confirmado' | 'pendente' | 'cancelado'
  solicitado_por?: string
  created_at: string
}

export interface Prospecto {
  id: string
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  instagram?: string
  segmento?: string
  origem?: string
  status: 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'perdido'
  valor_estimado?: number
  observacoes?: string
  created_at: string
}

export interface Pagamento {
  id: string
  cliente_id: string
  valor: number
  mes_referencia: string
  vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
  data_pagamento?: string
  observacoes?: string
  created_at: string
}

export interface Mensagem {
  id: string
  cliente_id: string
  autor_id: string
  autor_nome: string
  autor_role: Role
  conteudo: string
  lida: boolean
  created_at: string
}

export interface Doc {
  id: string
  cliente_id: string
  titulo: string
  conteudo: string
  tipo: 'briefing' | 'estrategia' | 'referencia' | 'nota' | 'outro'
  created_at: string
  updated_at: string
}

export interface FAQ {
  id: string
  pergunta: string
  resposta: string
  categoria: string
  ordem: number
  ativo: boolean
}

export interface DuvidaCliente {
  id: string
  cliente_id: string
  pergunta: string
  respondida: boolean
  resposta?: string
  created_at: string
}

export interface MetricasMes {
  id: string
  cliente_id: string
  plataforma: string
  mes_referencia: string
  seguidores: number
  alcance: number
  impressoes: number
  engajamento: number
  novos_seguidores: number
  posts_publicados: number
  created_at: string
}
