export type TipoPergunta = 'texto' | 'textarea' | 'opcao' | 'opcoes_multiplas' | 'arquivo'

export interface Pergunta {
  id: string
  categoria: string
  tipo: TipoPergunta
  pergunta: string
  opcoes?: string[]
  obrigatoria?: boolean
}

export const CATEGORIAS: Record<string, string> = {
  negocio: '📌 Sobre o Negócio / Marca',
  publico: '🎯 Sobre o Público-alvo',
  identidade_visual: '🎨 Identidade Visual',
  tom_voz: '✍️ Tom de Voz e Conteúdo',
  objetivos: '🎯 Objetivos e Estratégia',
  gestao_redes: '📲 Gestão de Redes',
  pacote: '💼 Sobre a Parceria',
  audiovisual: '🎬 Audiovisual',
  fotografia: '📸 Fotografia',
  trafego: '📊 Tráfego Pago',
}

export const BANCO_PERGUNTAS: Pergunta[] = [
  // NEGÓCIO
  { id: 'n1', categoria: 'negocio', tipo: 'texto', pergunta: 'Qual o nome da sua marca/empresa?' },
  { id: 'n2', categoria: 'negocio', tipo: 'texto', pergunta: 'Qual é o seu segmento de atuação?' },
  { id: 'n3', categoria: 'negocio', tipo: 'texto', pergunta: 'Há quanto tempo você está no mercado?' },
  { id: 'n4', categoria: 'negocio', tipo: 'textarea', pergunta: 'Qual é a história da sua marca? Como surgiu?' },
  { id: 'n5', categoria: 'negocio', tipo: 'textarea', pergunta: 'Quais são os seus principais produtos ou serviços?' },
  { id: 'n6', categoria: 'negocio', tipo: 'textarea', pergunta: 'Qual é o diferencial da sua marca em relação à concorrência?' },
  { id: 'n7', categoria: 'negocio', tipo: 'textarea', pergunta: 'Quais são os seus principais concorrentes?' },
  { id: 'n8', categoria: 'negocio', tipo: 'texto', pergunta: 'Você tem um site? Se sim, qual?' },
  { id: 'n9', categoria: 'negocio', tipo: 'texto', pergunta: 'Quais outras redes sociais você utiliza além do Instagram?' },
  { id: 'n10', categoria: 'negocio', tipo: 'textarea', pergunta: 'Você já trabalhou com alguma agência antes? Como foi a experiência?' },

  // PÚBLICO
  { id: 'p1', categoria: 'publico', tipo: 'textarea', pergunta: 'Quem é o seu cliente ideal? (idade, gênero, profissão, renda)' },
  { id: 'p2', categoria: 'publico', tipo: 'texto', pergunta: 'Onde seu público costuma estar? (Instagram, TikTok, LinkedIn...)' },
  { id: 'p3', categoria: 'publico', tipo: 'textarea', pergunta: 'Quais são as principais dores do seu cliente?' },
  { id: 'p4', categoria: 'publico', tipo: 'texto', pergunta: 'Qual é o ticket médio do seu produto/serviço?' },
  { id: 'p5', categoria: 'publico', tipo: 'opcao', pergunta: 'Seu público é:', opcoes: ['Local (cidade/região)', 'Nacional', 'Internacional', 'Misto'] },
  { id: 'p6', categoria: 'publico', tipo: 'textarea', pergunta: 'Quais influenciadores ou referências seu público segue?' },

  // IDENTIDADE VISUAL
  { id: 'iv1', categoria: 'identidade_visual', tipo: 'opcao', pergunta: 'Como está sua identidade visual atualmente?', opcoes: ['Tenho identidade visual completa', 'Tenho logo mas sem manual', 'Estou fazendo do zero', 'Quero uma repaginação'] },
  { id: 'iv2', categoria: 'identidade_visual', tipo: 'texto', pergunta: 'Quais são as cores da sua marca? (cole os códigos hex se souber)' },
  { id: 'iv3', categoria: 'identidade_visual', tipo: 'arquivo', pergunta: 'Você tem manual de marca ou brandbook? Se sim, anexe aqui.' },
  { id: 'iv4', categoria: 'identidade_visual', tipo: 'opcoes_multiplas', pergunta: 'Como você descreveria o visual ideal da sua marca?', opcoes: ['Moderno e minimalista', 'Clássico e elegante', 'Descolado e jovem', 'Colorido e vibrante', 'Sóbrio e corporativo', 'Natural e orgânico', 'Luxuoso e premium', 'Divertido e lúdico'] },
  { id: 'iv5', categoria: 'identidade_visual', tipo: 'arquivo', pergunta: 'Envie referências visuais de marcas que inspiram sua marca.' },
  { id: 'iv6', categoria: 'identidade_visual', tipo: 'textarea', pergunta: 'Quais marcas você admira visualmente e por quê?' },
  { id: 'iv7', categoria: 'identidade_visual', tipo: 'textarea', pergunta: 'Tem algum estilo visual que você NÃO quer de forma alguma? Explique.' },
  { id: 'iv8', categoria: 'identidade_visual', tipo: 'opcoes_multiplas', pergunta: 'Que tipo de tipografia combina com sua marca?', opcoes: ['Serif (clássica, elegante)', 'Sans-serif (moderna, clean)', 'Script (manuscrita, feminina)', 'Display (impactante, criativa)', 'Sem preferência'] },
  { id: 'iv9', categoria: 'identidade_visual', tipo: 'arquivo', pergunta: 'Envie referências de fontes ou títulos que você gosta.' },
  { id: 'iv10', categoria: 'identidade_visual', tipo: 'opcao', pergunta: 'Você tem fotos/vídeos próprios disponíveis para uso?', opcoes: ['Sim, tenho bastante material', 'Sim, mas pouco material', 'Não tenho nada ainda', 'Vamos produzir juntos'] },
  { id: 'iv11', categoria: 'identidade_visual', tipo: 'textarea', pergunta: 'Descreva o "feeling" que sua marca deve transmitir ao primeiro olhar.' },
  { id: 'iv12', categoria: 'identidade_visual', tipo: 'arquivo', pergunta: 'Envie sua logo atual (se tiver).' },

  // TOM DE VOZ
  { id: 'tv1', categoria: 'tom_voz', tipo: 'textarea', pergunta: 'Como você se comunica com seus clientes hoje?' },
  { id: 'tv2', categoria: 'tom_voz', tipo: 'opcoes_multiplas', pergunta: 'Como você descreveria o tom da sua marca?', opcoes: ['Formal', 'Informal e descontraído', 'Técnico e especialista', 'Divertido e irreverente', 'Inspiracional e motivador', 'Empático e acolhedor', 'Direto e objetivo', 'Sofisticado e refinado'] },
  { id: 'tv3', categoria: 'tom_voz', tipo: 'opcoes_multiplas', pergunta: 'Que tipo de conteúdo mais faz sentido para sua marca?', opcoes: ['Educativo (dicas, tutoriais)', 'Inspiracional', 'Bastidores e rotina', 'Cases e resultados', 'Promocional', 'Depoimentos de clientes', 'Tendências do nicho', 'Entretenimento'] },
  { id: 'tv4', categoria: 'tom_voz', tipo: 'textarea', pergunta: 'Tem algum assunto que você NÃO quer no seu conteúdo?' },
  { id: 'tv5', categoria: 'tom_voz', tipo: 'textarea', pergunta: 'Você tem opinião sobre algum tema do seu nicho que gostaria de compartilhar?' },
  { id: 'tv6', categoria: 'tom_voz', tipo: 'opcao', pergunta: 'Você aparece nas redes ou prefere não aparecer?', opcoes: ['Apareço e tenho facilidade', 'Apareço mas tenho resistência', 'Prefiro não aparecer', 'Ainda estou decidindo'] },
  { id: 'tv7', categoria: 'tom_voz', tipo: 'opcao', pergunta: 'Você tem facilidade para gravar vídeos?', opcoes: ['Sim, gravo com facilidade', 'Gravo mas prefiro roteiro pronto', 'Tenho dificuldade mas quero melhorar', 'Prefiro conteúdo estático'] },
  { id: 'tv8', categoria: 'tom_voz', tipo: 'textarea', pergunta: 'Você tem histórias ou cases de clientes que podemos usar?' },
  { id: 'tv9', categoria: 'tom_voz', tipo: 'textarea', pergunta: 'Liste 3 palavras que definem a personalidade da sua marca.' },
  { id: 'tv10', categoria: 'tom_voz', tipo: 'textarea', pergunta: 'Liste 3 palavras que sua marca NUNCA deve transmitir.' },

  // OBJETIVOS
  { id: 'o1', categoria: 'objetivos', tipo: 'opcoes_multiplas', pergunta: 'Qual é o principal objetivo das suas redes sociais agora?', opcoes: ['Aumentar reconhecimento de marca', 'Gerar vendas diretas', 'Aumentar engajamento', 'Construir autoridade no nicho', 'Atrair novos seguidores', 'Fidelizar clientes atuais', 'Lançar um produto/serviço'] },
  { id: 'o2', categoria: 'objetivos', tipo: 'texto', pergunta: 'Você tem metas numéricas de seguidores ou alcance?' },
  { id: 'o3', categoria: 'objetivos', tipo: 'texto', pergunta: 'Em quanto tempo você espera ver os primeiros resultados?' },
  { id: 'o4', categoria: 'objetivos', tipo: 'textarea', pergunta: 'Você tem alguma data importante próxima? (lançamento, evento, campanha)' },
  { id: 'o5', categoria: 'objetivos', tipo: 'opcao', pergunta: 'Você vende:', opcoes: ['Somente online', 'Somente presencial', 'Online e presencial', 'Ainda estou definindo'] },
  { id: 'o6', categoria: 'objetivos', tipo: 'textarea', pergunta: 'Como os clientes chegam até você hoje?' },
  { id: 'o7', categoria: 'objetivos', tipo: 'opcao', pergunta: 'Você investe em tráfego pago atualmente?', opcoes: ['Sim, regularmente', 'Já investi mas parei', 'Nunca investi mas quero', 'Não tenho interesse agora'] },
  { id: 'o8', categoria: 'objetivos', tipo: 'textarea', pergunta: 'Qual é o maior desafio que sua marca enfrenta hoje nas redes sociais?' },
  { id: 'o9', categoria: 'objetivos', tipo: 'textarea', pergunta: 'O que você considera um resultado de sucesso após 3 meses juntos?' },
  { id: 'o10', categoria: 'objetivos', tipo: 'textarea', pergunta: 'Você tem alguma campanha ou ação planejada para os próximos meses?' },

  // GESTÃO DE REDES
  { id: 'gr1', categoria: 'gestao_redes', tipo: 'opcoes_multiplas', pergunta: 'Quais formatos de conteúdo você prefere?', opcoes: ['Reels', 'Carrossel', 'Feed estático', 'Stories', 'TikTok', 'YouTube Shorts', 'Sem preferência'] },
  { id: 'gr2', categoria: 'gestao_redes', tipo: 'texto', pergunta: 'Você tem alguma restrição de horário ou dia para postagem?' },
  { id: 'gr3', categoria: 'gestao_redes', tipo: 'opcao', pergunta: 'Com que frequência você responde comentários e DMs?', opcoes: ['Diariamente', 'A cada 2-3 dias', 'Semanalmente', 'Raramente / Preciso de ajuda'] },
  { id: 'gr4', categoria: 'gestao_redes', tipo: 'texto', pergunta: 'Quem aprova os conteúdos antes de publicar?' },
  { id: 'gr5', categoria: 'gestao_redes', tipo: 'opcao', pergunta: 'Qual o prazo mínimo para aprovar um conteúdo?', opcoes: ['24 horas', '48 horas', '72 horas', 'Até 1 semana'] },
  { id: 'gr6', categoria: 'gestao_redes', tipo: 'textarea', pergunta: 'Tem algum conteúdo que já funcionou muito bem na sua marca?' },
  { id: 'gr7', categoria: 'gestao_redes', tipo: 'textarea', pergunta: 'Tem algum conteúdo que foi mal recebido pelo seu público?' },
  { id: 'gr8', categoria: 'gestao_redes', tipo: 'opcoes_multiplas', pergunta: 'Como prefere receber e aprovar os conteúdos?', opcoes: ['Pela plataforma da agência', 'Por WhatsApp', 'Por e-mail', 'Em reunião semanal'] },

  // PACOTE
  { id: 'pc1', categoria: 'pacote', tipo: 'opcao', pergunta: 'Você prefere reuniões:', opcoes: ['Online (Google Meet/Zoom)', 'Presenciais', 'Ambas dependendo da pauta', 'Só quando necessário'] },
  { id: 'pc2', categoria: 'pacote', tipo: 'opcoes_multiplas', pergunta: 'Qual a melhor forma de contato no dia a dia?', opcoes: ['WhatsApp', 'E-mail', 'Pela plataforma da agência', 'Ligação'] },
  { id: 'pc3', categoria: 'pacote', tipo: 'texto', pergunta: 'Quais são seus horários disponíveis para reuniões?' },
  { id: 'pc4', categoria: 'pacote', tipo: 'textarea', pergunta: 'Você tem alguma expectativa específica sobre nossa parceria?' },
  { id: 'pc5', categoria: 'pacote', tipo: 'textarea', pergunta: 'Tem algo que uma agência anterior fez que você não quer que se repita?' },
  { id: 'pc6', categoria: 'pacote', tipo: 'textarea', pergunta: 'O que é fundamental para uma parceria de longo prazo dar certo?' },
  { id: 'pc7', categoria: 'pacote', tipo: 'opcao', pergunta: 'Como você prefere receber relatórios de desempenho?', opcoes: ['Mensalmente pela plataforma', 'Em reunião mensal', 'Por e-mail', 'Quinzenalmente'] },

  // AUDIOVISUAL
  { id: 'av1', categoria: 'audiovisual', tipo: 'opcao', pergunta: 'Qual o objetivo principal dos vídeos?', opcoes: ['Institucional / marca', 'Produtos / serviços', 'Conteúdo para redes sociais', 'Campanha publicitária', 'Eventos', 'Treinamentos'] },
  { id: 'av2', categoria: 'audiovisual', tipo: 'textarea', pergunta: 'Descreva o estilo de vídeo que você imagina. (referências são bem-vindas)' },
  { id: 'av3', categoria: 'audiovisual', tipo: 'opcao', pergunta: 'Você vai aparecer nos vídeos?', opcoes: ['Sim, serei o protagonista', 'Sim, mas prefiro aparecer pouco', 'Não, prefiro product/lifestyle', 'Misto'] },
  { id: 'av4', categoria: 'audiovisual', tipo: 'texto', pergunta: 'Qual será a locação principal das gravações?' },
  { id: 'av5', categoria: 'audiovisual', tipo: 'opcao', pergunta: 'Você tem local para as gravações?', opcoes: ['Sim, tenho espaço próprio', 'Preciso alugar locação', 'Estúdio da agência', 'Locação externa / rua'] },
  { id: 'av6', categoria: 'audiovisual', tipo: 'arquivo', pergunta: 'Você tem referências de vídeos que gostaria como inspiração?' },
  { id: 'av7', categoria: 'audiovisual', tipo: 'opcao', pergunta: 'Formato predominante dos vídeos:', opcoes: ['Vertical (9:16 — Reels/TikTok)', 'Horizontal (16:9 — YouTube)', 'Quadrado (1:1 — Feed)', 'Todos os formatos'] },
  { id: 'av8', categoria: 'audiovisual', tipo: 'textarea', pergunta: 'Você tem preferência de trilha sonora ou mood de áudio?' },
  { id: 'av9', categoria: 'audiovisual', tipo: 'opcao', pergunta: 'Precisa de legenda nos vídeos?', opcoes: ['Sim, sempre', 'Só para redes sociais', 'Não é necessário', 'Depende do vídeo'] },

  // FOTOGRAFIA
  { id: 'ft1', categoria: 'fotografia', tipo: 'opcoes_multiplas', pergunta: 'Que tipo de ensaio você precisa?', opcoes: ['Produto', 'Pessoal / marca pessoal', 'Lifestyle', 'Institucional / equipe', 'Evento', 'Gastronomia', 'Moda / editorial'] },
  { id: 'ft2', categoria: 'fotografia', tipo: 'arquivo', pergunta: 'Envie referências visuais de fotos que você ama.' },
  { id: 'ft3', categoria: 'fotografia', tipo: 'opcao', pergunta: 'Qual o mood das fotos?', opcoes: ['Claro e aéreo (bright & airy)', 'Escuro e dramático (moody)', 'Natural e espontâneo', 'Editorial e produzido', 'Colorido e vibrante'] },
  { id: 'ft4', categoria: 'fotografia', tipo: 'texto', pergunta: 'Onde serão feitas as fotos?' },
  { id: 'ft5', categoria: 'fotografia', tipo: 'textarea', pergunta: 'Você tem preferência de paleta de cores ou cenário para o ensaio?' },
  { id: 'ft6', categoria: 'fotografia', tipo: 'opcao', pergunta: 'As fotos serão usadas principalmente em:', opcoes: ['Redes sociais', 'Site', 'Material impresso', 'Todos os meios'] },

  // TRÁFEGO
  { id: 'tf1', categoria: 'trafego', tipo: 'opcao', pergunta: 'Você já usou tráfego pago antes?', opcoes: ['Sim, com bons resultados', 'Sim, mas sem resultados claros', 'Nunca usei', 'Parei de usar'] },
  { id: 'tf2', categoria: 'trafego', tipo: 'opcoes_multiplas', pergunta: 'Em quais plataformas quer anunciar?', opcoes: ['Meta Ads (Instagram/Facebook)', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'YouTube Ads', 'Ainda não sei'] },
  { id: 'tf3', categoria: 'trafego', tipo: 'texto', pergunta: 'Qual é o investimento mensal disponível para anúncios?' },
  { id: 'tf4', categoria: 'trafego', tipo: 'opcoes_multiplas', pergunta: 'Qual é o objetivo dos anúncios?', opcoes: ['Gerar leads', 'Aumentar vendas diretas', 'Aumentar seguidores', 'Divulgar evento ou lançamento', 'Aumentar alcance', 'Remarketing'] },
  { id: 'tf5', categoria: 'trafego', tipo: 'texto', pergunta: 'Qual produto/serviço será o foco dos anúncios?' },
  { id: 'tf6', categoria: 'trafego', tipo: 'texto', pergunta: 'Qual é a página de destino dos anúncios? (site, WhatsApp, landing page...)' },
  { id: 'tf7', categoria: 'trafego', tipo: 'textarea', pergunta: 'Você tem criativos prontos ou precisamos produzir?' },
  { id: 'tf8', categoria: 'trafego', tipo: 'opcao', pergunta: 'Você tem pixel do Meta instalado no seu site?', opcoes: ['Sim', 'Não', 'Não sei o que é isso'] },
]

// Merge inteligente: une perguntas de múltiplos pacotes removendo duplicatas por ID
export function mergePerguntasPorPacotes(categoriasLista: string[][]): Pergunta[] {
  const todasCategorias = [...new Set(categoriasLista.flat())]
  const idsVistos = new Set<string>()
  return BANCO_PERGUNTAS.filter(p => {
    if (!todasCategorias.includes(p.categoria)) return false
    if (idsVistos.has(p.id)) return false
    idsVistos.add(p.id)
    return true
  })
}
