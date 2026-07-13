import { getModulesForIndustry } from '@/content/businessModules';
import { PLAN_MODULE_LIMITS, type PlanId } from '@/content/modules';

/** Plan IDs used for feature availability */
export type PlanIdLocal = PlanId;

/** Features available per plan for this business type */
export type PlanFeatures = Record<PlanId, string[]>;

function planFeaturesFromModules(slug: string): PlanFeatures {
  const names = getModulesForIndustry(slug).map((m) => m.name);
  const freeModules = names.slice(0, PLAN_MODULE_LIMITS.gratis);
  return {
    gratis: [
      `Inclui os ${PLAN_MODULE_LIMITS.gratis} primeiros módulos do catálogo`,
      ...freeModules,
    ],
    starter: [`Escolher até ${PLAN_MODULE_LIMITS.starter} módulos do catálogo`, ...names],
    growth: [`Escolher até ${PLAN_MODULE_LIMITS.growth} módulos do catálogo`, ...names],
    pro: [`Escolher até ${PLAN_MODULE_LIMITS.pro} módulos do catálogo`, ...names],
  };
}

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
      'Se o seu negócio depende de agenda, nós automatizamos o processo. Do lembrete no WhatsApp ao controle de pacotes e estoque, escolha os módulos do catálogo de prestadores de serviço e nós customizamos a operação.',
    benefits: getModulesForIndustry('servicos').map((m) => m.name),
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
      increaseLabel: 'previsibilidade de caixa',
    },
    color: 'primary',
    planFeatures: planFeaturesFromModules('servicos'),
    addOnNote:
      'Você escolhe os módulos do catálogo de prestadores de serviço conforme o plano. Nós adaptamos fluxos e regras à sua operação.',
  },
  {
    id: 'retail',
    slug: 'varejo',
    name: 'Comércio e Varejo',
    shortName: 'Comércio',
    icon: 'utensils',
    description:
      'Controle de estoque, vendas, fidelidade e fornecedores para quem lida com produtos físicos.',
    longDescription:
      'Acabe com a dor de cabeça do estoque furado. Monte o ERP com os módulos de comércio e varejo — vitrine, compras, cupons, trocas e fidelidade — e nós adaptamos à sua operação.',
    benefits: getModulesForIndustry('varejo').map((m) => m.name),
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
      increaseLabel: 'total dos insumos',
    },
    color: 'secondary',
    planFeatures: planFeaturesFromModules('varejo'),
    addOnNote:
      'Você escolhe os módulos do catálogo de comércio e varejo conforme o plano. Combinamos e customizamos para o seu modelo de venda.',
  },
  {
    id: 'health',
    slug: 'saude',
    name: 'Saúde',
    shortName: 'Saúde',
    icon: 'stethoscope',
    description:
      'Clínicas e consultórios: agenda, pacientes, prescrição e conformidade.',
    longDescription:
      'Soluções para o setor de saúde com o catálogo dedicado: agendamento, histórico de pacientes, prescrição eletrônica, assinatura e emissão fiscal — customizado para a rotina da sua clínica.',
    benefits: getModulesForIndustry('saude').map((m) => m.name),
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
      increaseLabel: 'e previsibilidade',
    },
    color: 'primary',
    planFeatures: planFeaturesFromModules('saude'),
    addOnNote:
      'Você escolhe os módulos do catálogo de saúde conforme o plano. Adaptamos documentos e fluxos à forma como sua equipe trabalha.',
  },
  {
    id: 'education',
    slug: 'educacao',
    name: 'Educação',
    shortName: 'Educação',
    icon: 'calendar',
    description:
      'Escolas, cursos e treinamentos: turmas, alunos, presença e mensalidades.',
    longDescription:
      'Organize matrículas e a rotina pedagógica com o catálogo de educação: aulas experimentais, turmas, lista de presença, portal do aluno e cobrança de mensalidades.',
    benefits: getModulesForIndustry('educacao').map((m) => m.name),
    useCases: [
      'Escolas e colégios',
      'Cursos e aulas particulares',
      'Treinamentos corporativos',
      'Academias de idiomas',
      'Formações técnicas',
    ],
    stats: {
      reduction: 'Faltas',
      reductionLabel: 'com menos desistências',
      increase: 'Matrículas',
      increaseLabel: 'mais previsibilidade',
    },
    color: 'accent',
    planFeatures: planFeaturesFromModules('educacao'),
    addOnNote:
      'Você escolhe os módulos do catálogo de educação conforme o plano. Customizamos para o seu modelo de ensino.',
  },
  {
    id: 'corporativo',
    slug: 'corporativo',
    name: 'Gestão Corporativa',
    shortName: 'Escritório',
    icon: 'calendar',
    description:
      'Back-office: reuniões, contratos, propostas, ponto e portal do cliente.',
    longDescription:
      'Unifique a operação com o catálogo de gestão corporativa: agendamento de reuniões, propostas comerciais, contratos, assinatura eletrônica e portal do cliente.',
    benefits: getModulesForIndustry('corporativo').map((m) => m.name),
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
      increaseLabel: 'centralizado',
    },
    color: 'secondary',
    planFeatures: planFeaturesFromModules('corporativo'),
    addOnNote:
      'Você escolhe os módulos do catálogo corporativo conforme o plano. Adaptamos fluxos e documentos à sua operação.',
  },
];

export const industryIcons: Record<string, string> = {
  scissors:
    'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  utensils:
    'M3 3v18h18V3H3zm13 12h-2v-2h2v2zm0-4h-2V7h2v4zM6 15h6v2H6v-2zm0-4h6v2H6v-2zm0-4h6v2H6V7z',
  stethoscope:
    'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  cake: 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

export type Industry = (typeof industries)[0];
