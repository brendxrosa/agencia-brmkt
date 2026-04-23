-- ============================================================
-- AGÊNCIA BR MKT — Script SQL completo
-- Cole tudo no SQL Editor do Supabase e clique em Run
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (usuários da plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'equipe' CHECK (role IN ('admin', 'equipe', 'cliente')),
  avatar_url TEXT,
  cliente_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa TEXT,
  email TEXT NOT NULL,
  telefone TEXT,
  instagram TEXT,
  segmento TEXT,
  plano TEXT NOT NULL DEFAULT 'basico',
  valor_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  cor TEXT NOT NULL DEFAULT '#6B0F2A',
  persona TEXT,
  tom_de_voz TEXT,
  objetivo TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona FK de profiles -> clientes
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_cliente
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'feed' CHECK (tipo IN ('reels', 'carrossel', 'feed', 'stories', 'tiktok')),
  plataforma TEXT[] DEFAULT ARRAY['Instagram'],
  status_interno TEXT NOT NULL DEFAULT 'briefing'
    CHECK (status_interno IN ('briefing','copy','design','edicao','revisao_interna','aguardando_cliente','aprovado','publicado','reprovado')),
  status_cliente TEXT DEFAULT 'pendente' CHECK (status_cliente IN ('pendente','aprovado','reprovado')),
  feedback_cliente TEXT,
  data_publicacao DATE,
  tema TEXT,
  direcionamento TEXT,
  abordagem TEXT,
  copy TEXT,
  legenda TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAREFAS
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_progresso','concluida')),
  prazo DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EVENTOS / AGENDA
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'reuniao' CHECK (tipo IN ('reuniao','captacao','entrega','pagamento','outro')),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  participantes TEXT[],
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  dia_todo BOOLEAN DEFAULT FALSE,
  visivel_cliente BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado','pendente','cancelado')),
  solicitado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROSPECÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS prospectos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa TEXT,
  email TEXT,
  telefone TEXT,
  instagram TEXT,
  segmento TEXT,
  origem TEXT,
  status TEXT NOT NULL DEFAULT 'contato'
    CHECK (status IN ('contato','proposta','negociacao','fechado','perdido')),
  valor_estimado NUMERIC(10,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAGAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  mes_referencia TEXT NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','atrasado')),
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL,
  autor_role TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCS / NOTAS POR CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS docs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'nota' CHECK (tipo IN ('briefing','estrategia','referencia','nota','outro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÉTRICAS
-- ============================================================
CREATE TABLE IF NOT EXISTS metricas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  plataforma TEXT NOT NULL DEFAULT 'Instagram',
  mes_referencia TEXT NOT NULL,
  seguidores INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  impressoes INTEGER DEFAULT 0,
  engajamento NUMERIC(5,2) DEFAULT 0,
  novos_seguidores INTEGER DEFAULT 0,
  posts_publicados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, plataforma, mes_referencia)
);

-- ============================================================
-- ONBOARDING
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  etapa_atual INTEGER DEFAULT 1,
  contrato_assinado BOOLEAN DEFAULT FALSE,
  briefing_preenchido BOOLEAN DEFAULT FALSE,
  acesso_redes BOOLEAN DEFAULT FALSE,
  reuniao_kick_realizada BOOLEAN DEFAULT FALSE,
  calendario_aprovado BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FAQ (Perguntas frequentes para clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS faq (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DÚVIDAS DOS CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS duvidas_clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  pergunta TEXT NOT NULL,
  respondida BOOLEAN DEFAULT FALSE,
  resposta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EQUIPE / MEMBROS
-- ============================================================
CREATE TABLE IF NOT EXISTS equipe (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cargo TEXT NOT NULL,
  modulos_acesso TEXT[] DEFAULT ARRAY['clientes','kanban','calendario','tarefas'],
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE duvidas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;

-- Policies: equipe/admin vê tudo
CREATE POLICY "equipe_all" ON clientes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_posts" ON posts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_tarefas" ON tarefas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_eventos" ON eventos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_prospectos" ON prospectos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_pagamentos" ON pagamentos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_mensagens" ON mensagens FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_docs" ON docs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_metricas" ON metricas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_onboarding" ON onboarding FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_faq" ON faq FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_duvidas" ON duvidas_clientes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);
CREATE POLICY "equipe_all_equipe" ON equipe FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','equipe'))
);

-- Profiles: todos leem o próprio
CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Cliente: acessa apenas seus dados
CREATE POLICY "cliente_own_posts" ON posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.cliente_id = posts.cliente_id
  )
);
CREATE POLICY "cliente_update_posts" ON posts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.cliente_id = posts.cliente_id
  )
);
CREATE POLICY "cliente_own_eventos" ON eventos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.cliente_id = eventos.cliente_id
  ) AND eventos.visivel_cliente = TRUE
);
CREATE POLICY "cliente_insert_evento" ON eventos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.cliente_id = eventos.cliente_id
  )
);
CREATE POLICY "cliente_own_mensagens" ON mensagens FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.cliente_id = mensagens.cliente_id
  )
);
CREATE POLICY "cliente_faq" ON faq FOR SELECT USING (ativo = TRUE);
CREATE POLICY "cliente_own_duvidas" ON duvidas_clientes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.cliente_id = duvidas_clientes.cliente_id
  )
);

-- ============================================================
-- DADOS INICIAIS — FAQ
-- ============================================================
INSERT INTO faq (pergunta, resposta, categoria, ordem) VALUES
('Como funciona o processo de aprovação de posts?', 'Você recebe uma notificação quando houver posts para aprovar. Acesse a aba "Aprovações", veja o conteúdo e clique em Aprovar ou Reprovar. Caso reprove, deixe um comentário explicando o que precisa ser ajustado.', 'Aprovações', 1),
('Em quanto tempo meu post é ajustado após o feedback?', 'Após o feedback, nossa equipe realiza os ajustes em até 48 horas úteis.', 'Aprovações', 2),
('Como agendar uma reunião com a agência?', 'Acesse a aba "Agenda", clique em "Solicitar reunião" e escolha um horário disponível. Nossa equipe confirma em até 24 horas.', 'Agenda', 3),
('Como envio uma mensagem para a equipe?', 'Acesse a aba "Mensagens" e escreva sua mensagem. Nossa equipe responde em horário comercial (8h-18h, seg-sex).', 'Comunicação', 4),
('Onde vejo o calendário de posts do mês?', 'Acesse a aba "Calendário" para ver todos os posts programados do mês, com status de cada um.', 'Calendário', 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FUNÇÃO: atualiza updated_at automaticamente nos docs
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER docs_updated_at
  BEFORE UPDATE ON docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- Após rodar, vá em Authentication > Users no Supabase
-- e crie seu usuário admin manualmente.
-- Depois rode o insert abaixo substituindo o UUID e email:
--
-- INSERT INTO profiles (id, email, nome, role)
-- VALUES ('SEU_UUID_AQUI', 'seu@email.com', 'Brenda Rosa', 'admin');
-- ============================================================
