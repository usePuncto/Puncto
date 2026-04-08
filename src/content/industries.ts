/** Plan IDs used for feature availability */
export type PlanId = 'gratis' | 'starter' | 'growth' | 'pro';

/** Features available per plan for this business type */
export type PlanFeatures = Record<PlanId, string[]>;

export const industries = [
  {
    id: 'services',
    slug: 'servicos',
    name: 'Prestadores de Serviço',
    shortName: 'Serviços',
    icon: 'scissors',
    description:
      'Para quem vende tempo: salões, consultórios, oficinas e profissionais liberais.',
    longDescription:
      'Se o seu negócio depende de agenda, nós automatizamos o processo. Do lembrete automático no WhatsApp até o cálculo de comissão da equipe, tudo feito para você não perder tempo.',
    benefits: [
      'Agenda inteligente e sem conflitos',
      'Confirmação automática (fim dos furos)',
      'Cálculo de comissões automático',
      'Histórico de atendimento do cliente',
      'Integração financeira completa',
    ],
    useCases: [
      'Salões e Barbearias',
      'Clínicas de Estética',
      'Oficinas Mecânicas',
      'Consultorias',
      'Profissionais Autônomos',
    ],
    stats: {
        reduction: 'Tempo',
        reductionLabel: 'ganho na operação',
        increase: 'Lucro',
        increaseLabel: 'previsibilidade de caixa'
    },
    color: 'primary',
    /** Features by subscription plan — everything this segment can access on the platform */
    planFeatures: {
      gratis: [
        'Agendamentos digitais ilimitados (Link na Bio)',
        'Cadastro e histórico de clientes',
      ],
      starter: [
        'Tudo do Grátis',
        'Lembretes automáticos por e-mail + manuais por WhatsApp',
        'Relatório financeiro',
      ],
      growth: [
        'Tudo do Starter',
        'Lista de espera',
        'WhatsApp Automático',
        'Pagamentos PIX e cartão',
        'Emissão de NFS-e',
      ],
      pro: [
        'Tudo do Growth',
        'Multi-agendas (Equipes)',
        'DRE Gerencial + Metas',
        'CRM (Aniversário/Retenção)',
        'Controle de estoque completo',
      ],
    },
    addOnNote:
      'Você pode ativar funcionalidades de outros segmentos na plataforma (como cardápio/pedidos, ponto eletrônico, multi-estoque ou gestão de contratos) através de add-ons pagos, sem precisar mudar de plano.',
  },
  {
    id: 'retail',
    slug: 'varejo',
    name: 'Comércio e Varejo',
    shortName: 'Comércio',
    icon: 'utensils',
    description:
      'Controle total de estoque, vendas e pedidos para quem lida com produtos físicos.',
    longDescription:
      'Acabe com a dor de cabeça do estoque furado. Criamos sistemas que dão baixa automática, avisam quando comprar insumos e mostram qual produto dá mais lucro.',
    benefits: [
      'Controle de estoque em tempo real',
      'Gestão de pedidos e entregas',
      'Curva ABC de produtos',
      'Alertas de reposição',
      'Frente de caixa simplificado',
    ],
    useCases: [
      'Restaurantes e Cafés',
      'Lojas de Roupa',
      'Mercados de Nicho',
      'Distribuidoras',
      'E-commerce',
    ],
    stats: {
        reduction: 'Erros',
        reductionLabel: 'na contagem de estoque',
        increase: 'Controle',
        increaseLabel: 'total dos insumos'
    },
    color: 'secondary',
    planFeatures: {
      gratis: [
        'Vitrine digital (Link na Bio)',
        'Cadastro e histórico de clientes',
      ],
      starter: [
        'Tudo do Grátis',
        'Controle de estoque simples',
        'Relatório financeiro',
      ],
      growth: [
        'Tudo do Starter',
        'Cardápio/Catálogo QR Code + Pedidos',
        'WhatsApp Automático',
        'Pagamentos PIX e cartão',
        'Emissão NFC-e/NFE',
      ],
      pro: [
        'Tudo do Growth',
        'Multi-estoque/Depósitos',
        'Ponto eletrônico',
        'DRE Gerencial + Metas',
        'Controle de estoque completo',
      ],
    },
    addOnNote:
      'Funcionalidades de outros segmentos (agenda com lembretes, lista de espera, CRM e multi-agendas para equipes) podem ser habilitadas como add-ons pagos, permitindo combinar comércio com gestão de serviços.',
  },
  {
    id: 'corporate',
    slug: 'empresas',
    name: 'Grandes Empresas e Indústrias',
    shortName: 'Indústria',
    icon: 'calendar',
    description:
      'Desenvolvimento customizado para indústrias, fábricas e grandes corporações.',
    longDescription:
      'Para empresas que precisam de soluções específicas, desenvolvemos sistemas sob medida que se integram aos processos existentes. Painéis administrativos, automações industriais e sistemas de gestão personalizados.',
    benefits: [
      'Sistemas desenvolvidos sob medida',
      'Integração com sistemas legados',
      'Automação de processos industriais',
      'Dashboards e relatórios personalizados',
      'Suporte e evolução contínua',
    ],
    useCases: [
      'Indústrias e Fábricas',
      'Grandes Corporações',
      'Empresas de Logística',
      'Grupos Empresariais',
      'Operações Complexas',
    ],
    stats: {
        reduction: 'Manual',
        reductionLabel: 'processos automatizados',
        increase: 'Eficiência',
        increaseLabel: 'operacional aumentada'
    },
    color: 'accent',
    planFeatures: {
      gratis: [
        'Relatórios simples',
        'Cadastro de funcionários',
      ],
      starter: [
        'Tudo do Grátis',
        'Controle de estoque simples',
        'Ponto eletrônico',
      ],
      growth: [
        'Tudo do Starter',
        'Gestão de contratos',
        'Ordem de produção automática',
        'Banco de horas',
        'Emissão NFC-e/NFE',
      ],
      pro: [
        'Tudo do Growth',
        'Multi-estoque/Depósitos',
        'Integração com outras plataformas',
        'Relatório financeiro completo',
        'Controle de estoque completo',
      ],
    },
    addOnNote:
      'Recursos de outros segmentos (agendamento, cardápio/pedidos, WhatsApp automático, DRE gerencial e centros de custo) estão disponíveis como add-ons, para adaptar a plataforma ao seu processo industrial.',
  },
  {
    id: 'health',
    slug: 'saude',
    name: 'Saúde',
    shortName: 'Saúde',
    icon: 'stethoscope',
    description:
      'Clínicas, consultórios e operadoras. Agenda, prontuários e conformidade regulatória.',
    longDescription:
      'Soluções para o setor de saúde: agendamento integrado, gestão de pacientes, prontuários eletrônicos e emissão de documentos conforme exigências do setor.',
    benefits: [
      'Agendamento e confirmações automáticas',
      'Gestão de pacientes e histórico',
      'Integração com fluxos clínicos',
      'Conformidade e segurança de dados',
      'Relatórios e indicadores',
    ],
    useCases: [
      'Clínicas e Consultórios',
      'Laboratórios',
      'Clínicas de Estética Médica',
      'Fisioterapia e Reabilitação',
      'Operadoras e Redes',
    ],
    stats: {
        reduction: 'Faltas',
        reductionLabel: 'com lembretes automáticos',
        increase: 'Ocupação',
        increaseLabel: 'e previsibilidade'
    },
    color: 'primary',
    planFeatures: {
      gratis: [
        'Agendamentos digitais ilimitados (Link na Bio)',
        'Cadastro e histórico de pacientes',
      ],
      starter: [
        'Tudo do Grátis',
        'Lembretes automáticos por e-mail + manuais por WhatsApp',
        'Relatório financeiro',
      ],
      growth: [
        'Tudo do Starter',
        'Lista de espera',
        'WhatsApp Automático',
        'Pagamentos PIX e cartão',
        'Emissão de NFS-e',
      ],
      pro: [
        'Tudo do Growth',
        'Multi-agendas (Equipes)',
        'DRE Gerencial + Metas',
        'CRM (Aniversário/Retenção)',
        'Controle de estoque completo',
      ],
    },
    addOnNote:
      'É possível incluir ferramentas de outros segmentos (controle de estoque avançado, ponto eletrônico, gestão de contratos ou centros de custo) mediante add-ons pagos, mantendo o foco em saúde.',
  },
  {
    id: 'education',
    slug: 'educacao',
    name: 'Educação',
    shortName: 'Educação',
    icon: 'calendar',
    description:
      'Para escolas, cursos e treinamentos que precisam de matrículas, agenda e acompanhamento de alunos com menos fricção.',
    longDescription:
      'Transforme as matrículas e a rotina pedagógica em um fluxo mais organizado. Com a Puncto, você automatiza confirmações, acompanha alunos, gerencia turmas e reduz faltas e desistências com comunicações inteligentes.',
    benefits: [
      'Matrículas e agenda sem conflitos',
      'Confirmações automáticas para reduzir faltas',
      'Histórico de alunos e comunicação direcionada',
      'Organização financeira para mensalidades e cobranças'
    ],
    useCases: [
      'Escolas e colégios',
      'Cursos e aulas particulares',
      'Treinamentos corporativos',
      'Academias de idiomas',
      'Formações técnicas'
    ],
    stats: {
      reduction: 'Faltas',
      reductionLabel: 'com menos desistências',
      increase: 'Matrículas',
      increaseLabel: 'mais previsibilidade'
    },
    color: 'accent',
    planFeatures: {
      gratis: [
        'Agendamentos e solicitações (Link na Bio)',
        'Cadastro e histórico de alunos',
      ],
      starter: [
        'Tudo do Grátis',
        'Lembretes automáticos por e-mail + manuais por WhatsApp',
        'Relatório financeiro',
      ],
      growth: [
        'Tudo do Starter',
        'Lista de espera',
        'WhatsApp Automático',
        'Pagamentos PIX e cartão',
        'Emissão de NFS-e',
      ],
      pro: [
        'Tudo do Growth',
        'Rematrícula automática',
        'DRE Gerencial + Metas',
        'CRM (Retenção e Reengajamento)',
        'Controle de estoque/insumos completo',
      ],
    },
    addOnNote:
      'Você pode ativar recursos de outros segmentos como add-ons pagos (por exemplo: controles avançados de estoque, ponto eletrônico e gestão de contratos) para adaptar a Puncto ao seu processo educacional.',
  },
  {
    id: 'corporativo',
    slug: 'corporativo',
    name: 'Gestão Corporativa',
    shortName: 'Escritório',
    icon: 'calendar',
    description:
      'Back-office, múltiplas unidades e gestão centralizada para grupos e redes.',
    longDescription:
      'Controle centralizado de múltiplas unidades, relatórios consolidados, ponto eletrônico e gestão financeira para redes e franquias.',
    benefits: [
      'Múltiplas unidades e consolidação',
      'Ponto eletrônico e jornada',
      'Relatórios e dashboards centralizados',
      'Gestão de franquias',
      'API e integrações',
    ],
    useCases: [
      'Redes e Franquias',
      'Grupos com múltiplas unidades',
      'Gestão de back-office',
      'Controladoria e financeiro',
      'RH e folha de pagamento',
    ],
    stats: {
        reduction: 'Custos',
        reductionLabel: 'operacionais',
        increase: 'Controle',
        increaseLabel: 'centralizado'
    },
    color: 'secondary',
    planFeatures: {
      gratis: [
        'Relatórios simples',
        'Cadastro de funcionários',
      ],
      starter: [
        'Tudo do Grátis',
        'Contatos automáticos por e-mail + manuais por WhatsApp',
        'Ponto eletrônico',
      ],
      growth: [
        'Tudo do Starter',
        'Gestão de contratos',
        'WhatsApp Automático',
        'Banco de horas',
        'Emissão NFC-e/NFE',
      ],
      pro: [
        'Tudo do Growth',
        'DRE Gerencial + Metas',
        'Integração com outras plataformas',
        'Centros de Custo',
        'Gestão de Franquia',
      ],
    },
    addOnNote:
      'Você pode adicionar funcionalidades de outros segmentos (agenda com lembretes, lista de espera, controle de estoque, cardápio/pedidos ou CRM) através de add-ons com valor acessível, unificando operações em um só lugar.',
  },
];

export const industryIcons: Record<string, string> = {
  scissors: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  utensils: 'M3 3v18h18V3H3zm13 12h-2v-2h2v2zm0-4h-2V7h2v4zM6 15h6v2H6v-2zm0-4h6v2H6v-2zm0-4h6v2H6V7z',
  stethoscope: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  cake: 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

export type Industry = (typeof industries)[0];