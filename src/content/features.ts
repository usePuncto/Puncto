export const features = [
  {
    id: 'scheduling',
    icon: 'calendar',
    title: 'Agendamento Inteligente e Multi-agendas',
    description:
      'Gerencie sua disponibilidade e da sua equipe em um só lugar. Permita que seus clientes reservem horários online 24 horas por dia, sem burocracia.',
    benefits: [
      'Link de agendamento na bio',
      'Gestão de agendas da equipe',
      'Redução drástica de faltas (no-shows)',
      'Sincronização com calendários',
    ],
    categories: ['scheduling'],
  },
  {
    id: 'timeClock',
    icon: 'clock',
    title: 'Ponto Eletrônico e Banco de Horas',
    description:
      'Controle a jornada de trabalho da sua equipe com segurança jurídica. Cálculo automático de horas extras, faltas e banco de horas integrado.',
    benefits: [
      'Registro via celular ou tablet',
      'Banco de horas automático',
      'Gestão de pausas e intervalos',
      'Conformidade com a legislação',
    ],
    categories: ['timeClock'],
  },
  {
    id: 'restaurant',
    icon: 'utensils',
    title: 'Catálogo, Cardápio Digital e Pedidos',
    description:
      'Transforme acessos em vendas. Ofereça uma vitrine virtual ou cardápio via QR Code integrados diretamente ao seu estoque e sistema financeiro.',
    benefits: [
      'Autoatendimento via QR Code',
      'Catálogo atualizado em tempo real',
      'Pedidos integrados ao WhatsApp',
      'Redução de filas e erros de anotação',
    ],
    categories: ['restaurant'],
  },
  {
    id: 'production',
    icon: 'chart',
    title: 'Módulo de Produção (KDS) e Qualidade',
    description:
      'Digitalize seu chão de fábrica. Instruções visuais, checklists obrigatórios de qualidade e tradução automática para equipes multiculturais.',
    benefits: [
      'Telas interativas nas bancadas',
      'Checklists visuais anti-erro',
      'Tradução multilíngue automática',
      'Rastreabilidade total de pedidos',
    ],
    categories: ['analytics', 'inventory'],
  },
  {
    id: 'automacao',
    icon: 'clock',
    title: 'Automação de Processos',
    description:
      'Elimine tarefas repetitivas. Lembretes automáticos, confirmações e organização de agenda sem intervenção manual.',
    benefits: [
      'Redução de erro humano',
      'Economia de horas da equipe',
      'Processos padronizados',
      'Lembretes WhatsApp/Email automáticos',
    ],
    categories: ['scheduling', 'analytics'],
  },
  {
    id: 'financeiro',
    icon: 'creditCard',
    title: 'Gestão Financeira Descomplicada',
    description:
      'Tenha clareza total do seu fluxo de caixa. Contas a pagar, receber e emissão de notas fiscais em poucos cliques.',
    benefits: [
      'Visão clara de lucros e gastos',
      'Emissão de NFs automatizada',
      'Conciliação bancária',
      'Relatórios de inadimplência',
    ],
    categories: ['payments'],
  },
  {
    id: 'dashboards',
    icon: 'chart',
    title: 'Dashboards de Decisão',
    description:
      'Pare de decidir no "achismo". Tenha painéis visuais que mostram a saúde do seu negócio em tempo real.',
    benefits: [
      'Indicadores de desempenho (KPIs)',
      'Visualização de metas',
      'Comparativos mensais',
      'Acesso rápido pelo celular',
    ],
    categories: ['analytics'],
  },
  {
    id: 'estoque',
    icon: 'package',
    title: 'Controle de Materiais e Estoque',
    description:
      'Evite desperdícios e compras de última hora. Saiba exatamente o que entra e sai da sua empresa.',
    benefits: [
      'Alertas de estoque baixo',
      'Histórico de compras',
      'Gestão de fornecedores',
      'Cálculo de custo por produto',
    ],
    categories: ['inventory'],
  },
  {
    id: 'crm',
    icon: 'users',
    title: 'Gestão de Clientes (CRM)',
    description:
      'Centralize os dados dos seus clientes. Histórico de compras, preferências e contatos em um só lugar seguro.',
    benefits: [
      'Cadastro centralizado',
      'Histórico de atendimentos',
      'Segmentação de clientes',
      'Pós-venda eficiente',
    ],
    categories: ['crm'],
  },
  {
    id: 'integracao',
    icon: 'code',
    title: 'Integração de Sistemas',
    description:
      'Conecte o Puncto com suas ferramentas favoritas através de API REST, webhooks e integrações prontas.',
    benefits: [
      'API REST e GraphQL',
      'Webhooks para eventos',
      'Integrações com calendários',
      'Segurança da informação',
    ],
    categories: ['api'],
  },
];

export const iconComponents: Record<string, string> = {
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  creditCard:
    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  utensils:
    'M3 3v18h18V3H3zm13 12h-2v-2h2v2zm0-4h-2V7h2v4zM6 15h6v2H6v-2zm0-4h6v2H6v-2zm0-4h6v2H6V7z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  package:
    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  users:
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  chart:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

export type Feature = (typeof features)[0];
