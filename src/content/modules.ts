export type PlanId = 'gratis' | 'starter' | 'growth' | 'pro';

export const PLAN_MODULE_LIMITS: Record<PlanId, number> = {
  gratis: 2,
  starter: 8,
  growth: 10,
  pro: 12,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  gratis: 'Grátis',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

const PLAN_RANK: Record<PlanId, number> = {
  gratis: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

export interface ErpModule {
  id: string;
  name: string;
  description: string;
  minPlan: PlanId;
}

export const erpModules: ErpModule[] = [
  {
    id: 'agendamento',
    name: 'Agendamento e Multi-agendas',
    description: 'Agenda online, link na bio e gestão de horários da equipe.',
    minPlan: 'gratis',
  },
  {
    id: 'crm',
    name: 'CRM e Clientes',
    description: 'Cadastro, histórico de atendimentos e relacionamento.',
    minPlan: 'gratis',
  },
  {
    id: 'relatorios',
    name: 'Relatórios e Analytics',
    description: 'Indicadores, DRE gerencial e visão da saúde do negócio.',
    minPlan: 'starter',
  },
  {
    id: 'pagamentos',
    name: 'Pagamentos',
    description: 'PIX, cartão e conciliação financeira integrada.',
    minPlan: 'starter',
  },
  {
    id: 'financeiro',
    name: 'Gestão Financeira',
    description: 'Contas a pagar/receber, fluxo de caixa e inadimplência.',
    minPlan: 'starter',
  },
  {
    id: 'vitrine',
    name: 'Vitrine Digital',
    description: 'Catálogo online, link na bio e vitrine de serviços/produtos.',
    minPlan: 'starter',
  },
  {
    id: 'equipe',
    name: 'Gestão de Equipe',
    description: 'Comissões, permissões e controle por colaborador.',
    minPlan: 'starter',
  },
  {
    id: 'automacao',
    name: 'Automação (WhatsApp/Email)',
    description: 'Lembretes, confirmações e mensagens automáticas.',
    minPlan: 'growth',
  },
  {
    id: 'cardapio',
    name: 'Cardápio e Pedidos',
    description: 'Cardápio QR Code, comanda virtual e pedidos integrados.',
    minPlan: 'growth',
  },
  {
    id: 'estoque',
    name: 'Controle de Estoque',
    description: 'Entrada/saída, alertas de reposição e multi-depósitos.',
    minPlan: 'growth',
  },
  {
    id: 'ponto',
    name: 'Ponto Eletrônico',
    description: 'Registro de jornada, banco de horas e relatórios de RH.',
    minPlan: 'growth',
  },
  {
    id: 'fiscal',
    name: 'Emissão Fiscal',
    description: 'NFS-e, NFC-e e integração com emissores fiscais.',
    minPlan: 'growth',
  },
  {
    id: 'campanhas',
    name: 'Campanhas e Fidelidade',
    description: 'Marketing, segmentação e programas de retenção.',
    minPlan: 'growth',
  },
  {
    id: 'integracao',
    name: 'Integrações e API',
    description: 'API REST, webhooks e conexão com outros sistemas.',
    minPlan: 'pro',
  },
  {
    id: 'producao',
    name: 'Produção (KDS)',
    description: 'Telas de produção, checklists e rastreabilidade industrial.',
    minPlan: 'pro',
  },
];

export function isModuleAvailableForPlan(module: ErpModule, planId: PlanId): boolean {
  return PLAN_RANK[planId] >= PLAN_RANK[module.minPlan];
}

export function getModulesForPlan(planId: PlanId): ErpModule[] {
  return erpModules.filter((module) => isModuleAvailableForPlan(module, planId));
}

export function getGrowthOnlyModules(): ErpModule[] {
  return erpModules.filter((module) => module.minPlan === 'growth');
}

export function getProOnlyModules(): ErpModule[] {
  return erpModules.filter((module) => module.minPlan === 'pro');
}

export function getModuleById(id: string): ErpModule | undefined {
  return erpModules.find((module) => module.id === id);
}

export function getMinPlanLabel(minPlan: PlanId): string {
  if (minPlan === 'growth') return 'A partir do Growth';
  if (minPlan === 'pro') return 'Apenas no Pro';
  if (minPlan === 'starter') return 'A partir do Starter';
  return 'Disponível no Grátis';
}

export function getPlanCardHighlights(planId: PlanId): string[] {
  const limit = PLAN_MODULE_LIMITS[planId];
  const available = getModulesForPlan(planId).length;

  const highlights: string[] = [
    `Escolha até ${limit} módulos`,
    `${available} módulos disponíveis para seleção`,
    'Até 2h/mês de pequenas customizações incluídas',
    'Implementação customizada incluída',
  ];

  if (planId === 'gratis') {
    highlights.push('Módulos essenciais: agendamento e CRM');
  } else if (planId === 'starter') {
    highlights.push('Inclui pagamentos, financeiro e vitrine');
  } else if (planId === 'growth') {
    highlights.push('Módulos avançados: fiscal, estoque, ponto e automação');
  } else {
    highlights.push('Todos os módulos + integrações e produção (KDS)');
  }

  return highlights;
}

export function buildModuleSelectionSubject(planId: PlanId, moduleIds: string[]): string {
  const names = moduleIds
    .map((id) => getModuleById(id)?.name)
    .filter(Boolean)
    .join(', ');
  return `Plano ${PLAN_LABELS[planId]} — Módulos: ${names}`;
}

export function buildModuleSelectionMessage(planId: PlanId, moduleIds: string[]): string {
  const names = moduleIds
    .map((id) => getModuleById(id)?.name)
    .filter(Boolean)
    .join('\n- ');
  return `Olá! Tenho interesse no plano ${PLAN_LABELS[planId]} e gostaria de montar meu ERP com os seguintes módulos:\n\n- ${names}\n\nAguardo contato para o diagnóstico e customização.`;
}
