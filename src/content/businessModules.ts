import type { PlanId } from '@/types/business';

export type BusinessModuleSegment =
  | 'educacao'
  | 'servicos'
  | 'saude'
  | 'comercio'
  | 'corporativo';

export interface BusinessModule {
  id: string;
  name: string;
  /** Short marketing description for industry/pricing pages */
  description: string;
  /** Feature flag keys this module controls (when toggled off, these become false) */
  featureKeys?: string[];
}

export const PLAN_OPTIONS: { id: PlanId; label: string; tier: 'free' | 'basic' | 'pro' | 'enterprise' }[] = [
  { id: 'gratis', label: 'Grátis', tier: 'free' },
  { id: 'starter', label: 'Starter', tier: 'basic' },
  { id: 'growth', label: 'Growth', tier: 'pro' },
  { id: 'pro', label: 'Pro', tier: 'pro' },
];

export const PLAN_LABELS: Record<PlanId, string> = {
  gratis: 'Grátis',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

/** Map legacy subscription.tier → commercial planId */
export function tierToPlanId(tier?: string, planId?: PlanId): PlanId {
  if (planId && PLAN_OPTIONS.some((p) => p.id === planId)) return planId;
  if (tier === 'free') return 'gratis';
  if (tier === 'basic') return 'starter';
  if (tier === 'enterprise') return 'pro';
  if (tier === 'pro') return 'growth';
  return 'gratis';
}

export function planIdToTier(planId: PlanId): 'free' | 'basic' | 'pro' | 'enterprise' {
  return PLAN_OPTIONS.find((p) => p.id === planId)?.tier ?? 'free';
}

export const SEGMENT_LABELS: Record<BusinessModuleSegment, string> = {
  educacao: 'Educação',
  servicos: 'Prestadores de serviço',
  saude: 'Saúde',
  comercio: 'Comércio e varejo',
  corporativo: 'Gestão corporativa',
};

/** Map business.industry / marketing slug → module segment (tiersModulos.txt groups) */
export function industryToModuleSegment(industry: string): BusinessModuleSegment {
  const map: Record<string, BusinessModuleSegment> = {
    education: 'educacao',
    educacao: 'educacao',
    clinic: 'saude',
    saude: 'saude',
    health: 'saude',
    restaurant: 'comercio',
    bakery: 'comercio',
    retail: 'comercio',
    varejo: 'comercio',
    comercio: 'comercio',
    corporativo: 'corporativo',
    empresas: 'corporativo',
    corporate: 'corporativo',
    salon: 'servicos',
    event: 'servicos',
    general: 'servicos',
    services: 'servicos',
    servicos: 'servicos',
  };
  return map[industry] || 'servicos';
}

/**
 * Modules per segment from public/tiersModulos.txt
 */
export const MODULES_BY_SEGMENT: Record<BusinessModuleSegment, BusinessModule[]> = {
  educacao: [
    {
      id: 'agendamento_aulas',
      name: 'Agendamento de aulas experimentais',
      description: 'Agenda online para aulas experimentais e demonstrações, com horários livres e confirmação.',
      featureKeys: ['scheduling'],
    },
    {
      id: 'cadastro_alunos',
      name: 'Cadastro e histórico de alunos',
      description: 'Base de alunos com histórico de turmas, contatos e acompanhamento ao longo do tempo.',
      featureKeys: ['crm'],
    },
    {
      id: 'gestao_turmas',
      name: 'Gestão de turmas',
      description: 'Organize turmas, vagas, horários e alocação de professores em um só lugar.',
    },
    {
      id: 'lista_presenca',
      name: 'Lista de presença',
      description: 'Controle de frequência por aula ou turma, com registros claros para a equipe.',
      featureKeys: ['attendanceReports'],
    },
    {
      id: 'equipes',
      name: 'Equipes',
      description: 'Permissões e organização da equipe pedagógica e administrativa.',
    },
    {
      id: 'relatorio_financeiro',
      name: 'Relatório financeiro',
      description: 'Visão de receitas, mensalidades e indicadores financeiros da operação.',
      featureKeys: ['advancedReports'],
    },
    {
      id: 'ponto_eletronico',
      name: 'Ponto eletrônico',
      description: 'Registro de jornada da equipe com controle de entrada, saída e pausas.',
      featureKeys: ['timeClock'],
    },
    {
      id: 'coleta_eventos',
      name: 'Coleta de cadastro em eventos',
      description: 'Capture leads e cadastros em feiras, open days e eventos presenciais.',
    },
    {
      id: 'whatsapp_automatico',
      name: 'WhatsApp automático',
      description: 'Lembretes e confirmações automáticas por WhatsApp para reduzir faltas.',
      featureKeys: ['whatsappReminders'],
    },
    {
      id: 'emissao_nf',
      name: 'Emissão de NF',
      description: 'Emissão de notas fiscais integrada aos pagamentos e matrículas.',
      featureKeys: ['nfceGeneration'],
    },
    {
      id: 'portal_aluno',
      name: 'Portal do aluno',
      description: 'Área do aluno para acompanhar horários, materiais e informações da escola.',
    },
    {
      id: 'pagamentos_mensalidades',
      name: 'Links de pagamento, boletos e mensalidades',
      description: 'Cobrança de mensalidades com links, boletos e acompanhamento de inadimplência.',
      featureKeys: ['payments'],
    },
  ],
  servicos: [
    {
      id: 'agendamento_online',
      name: 'Agendamento online ilimitado',
      description: 'Link de agenda online para clientes marcarem horários sem troca de mensagens.',
      featureKeys: ['scheduling'],
    },
    {
      id: 'cadastro_clientes',
      name: 'Cadastro e histórico de clientes',
      description: 'Histórico de atendimentos, preferências e contatos em uma base organizada.',
      featureKeys: ['crm'],
    },
    {
      id: 'lembrete_agendamento',
      name: 'Lembrete de agendamento',
      description: 'Lembretes por e-mail e mensagens prontas para reduzir faltas (no-show).',
      featureKeys: ['emailReminders'],
    },
    {
      id: 'whatsapp_automatico',
      name: 'WhatsApp automático',
      description: 'Confirmações e lembretes enviados automaticamente pelo WhatsApp.',
      featureKeys: ['whatsappReminders'],
    },
    {
      id: 'relatorio_financeiro',
      name: 'Relatório financeiro',
      description: 'Acompanhe faturamento, serviços mais rentáveis e o caixa do negócio.',
      featureKeys: ['advancedReports'],
    },
    {
      id: 'equipes',
      name: 'Equipes',
      description: 'Multi-agendas, comissões e permissões por profissional.',
    },
    {
      id: 'ponto_eletronico',
      name: 'Ponto eletrônico',
      description: 'Controle de jornada da equipe com registros digitais de ponto.',
      featureKeys: ['timeClock'],
    },
    {
      id: 'controle_estoque',
      name: 'Controle de estoque',
      description: 'Baixa de produtos e insumos usados nos atendimentos, com alertas de reposição.',
      featureKeys: ['inventoryManagement'],
    },
    {
      id: 'lista_espera',
      name: 'Lista de espera inteligente',
      description: 'Preencha horários cancelados com clientes interessados naquele dia.',
    },
    {
      id: 'pacote_servicos',
      name: 'Pacote de serviços',
      description: 'Venda e controle pacotes, sessões e créditos de serviços.',
    },
    {
      id: 'pagamentos',
      name: 'Pagamentos via PIX, boleto e cartão',
      description: 'Receba pagamentos dos clientes com PIX, boleto e cartão integrados.',
      featureKeys: ['payments'],
    },
    {
      id: 'emissao_nf',
      name: 'Emissão de NF',
      description: 'Emissão de notas fiscais de serviço ligada aos atendimentos e pagamentos.',
      featureKeys: ['nfceGeneration'],
    },
  ],
  saude: [
    {
      id: 'agendamento_online',
      name: 'Agendamento online ilimitado',
      description: 'Agenda online para pacientes solicitarem consultas e procedimentos.',
      featureKeys: ['scheduling'],
    },
    {
      id: 'cadastro_clientes',
      name: 'Cadastro e histórico de clientes',
      description: 'Cadastro de pacientes com histórico de consultas e dados de contato.',
      featureKeys: ['crm'],
    },
    {
      id: 'lembrete_agendamento',
      name: 'Lembrete de agendamento',
      description: 'Lembretes de consulta por e-mail e mensagens prontas para o WhatsApp.',
      featureKeys: ['emailReminders'],
    },
    {
      id: 'whatsapp_automatico',
      name: 'WhatsApp automático',
      description: 'Confirmações e lembretes automáticos para reduzir faltas na agenda.',
      featureKeys: ['whatsappReminders'],
    },
    {
      id: 'relatorio_financeiro',
      name: 'Relatório financeiro',
      description: 'Controle de receitas, procedimentos e indicadores do consultório.',
      featureKeys: ['advancedReports'],
    },
    {
      id: 'equipes',
      name: 'Equipes',
      description: 'Multi-agendas e permissões para profissionais e recepção.',
    },
    {
      id: 'prescricao_eletronica',
      name: 'Prescrição eletrônica',
      description: 'Prescrições digitais integradas ao fluxo de atendimento.',
      featureKeys: ['healthRecords'],
    },
    {
      id: 'controle_estoque',
      name: 'Controle de estoque',
      description: 'Controle de medicamentos, materiais e insumos da clínica.',
      featureKeys: ['inventoryManagement'],
    },
    {
      id: 'lista_espera',
      name: 'Lista de espera inteligente',
      description: 'Reaproveite cancelamentos com pacientes na lista de espera.',
    },
    {
      id: 'assinatura_eletronica',
      name: 'Assinatura eletrônica',
      description: 'Assinatura digital de documentos, termos e consentimentos.',
    },
    {
      id: 'pagamentos',
      name: 'Pagamentos via PIX, boleto e cartão',
      description: 'Recebimento de consultas e procedimentos com meios de pagamento integrados.',
      featureKeys: ['payments'],
    },
    {
      id: 'emissao_nf',
      name: 'Emissão de NF',
      description: 'Emissão de notas fiscais de serviço para o consultório ou clínica.',
      featureKeys: ['nfceGeneration'],
    },
  ],
  comercio: [
    {
      id: 'vitrine_digital',
      name: 'Vitrine digital',
      description: 'Catálogo online com produtos e serviços para divulgação e vendas.',
      featureKeys: ['restaurantMenu'],
    },
    {
      id: 'cadastro_clientes',
      name: 'Cadastro e histórico de clientes',
      description: 'Histórico de compras e contatos para relacionamento e recompra.',
      featureKeys: ['crm'],
    },
    {
      id: 'fornecedores_compras',
      name: 'Gestão de fornecedores e ordens de compra',
      description: 'Cadastro de fornecedores e controle de pedidos de compra.',
      featureKeys: ['purchaseOrders'],
    },
    {
      id: 'whatsapp_automatico',
      name: 'WhatsApp automático',
      description: 'Mensagens automáticas para pedidos, status e relacionamento.',
      featureKeys: ['whatsappReminders'],
    },
    {
      id: 'relatorio_financeiro',
      name: 'Relatório financeiro',
      description: 'Acompanhe vendas, margem e o desempenho financeiro do negócio.',
      featureKeys: ['advancedReports'],
    },
    {
      id: 'cupons_desconto',
      name: 'Gestão de cupons de desconto',
      description: 'Crie e controle cupons promocionais para impulsionar vendas.',
      featureKeys: ['campaigns'],
    },
    {
      id: 'trocas_devolucoes',
      name: 'Gestão de trocas e devoluções',
      description: 'Registre trocas e devoluções com histórico e impacto no estoque.',
    },
    {
      id: 'controle_estoque',
      name: 'Controle de estoque',
      description: 'Entrada, saída e alertas de reposição de produtos e insumos.',
      featureKeys: ['inventoryManagement'],
    },
    {
      id: 'programa_fidelidade',
      name: 'Programa de fidelidade',
      description: 'Pontos, benefícios e retenção de clientes recorrentes.',
      featureKeys: ['loyaltyPrograms'],
    },
    {
      id: 'ponto_eletronico',
      name: 'Ponto eletrônico',
      description: 'Controle de jornada da equipe da loja ou operação.',
      featureKeys: ['timeClock'],
    },
    {
      id: 'pagamentos',
      name: 'Pagamentos via PIX, boleto e cartão',
      description: 'Receba vendas com PIX, boleto e cartão de forma integrada.',
      featureKeys: ['payments'],
    },
    {
      id: 'emissao_nf',
      name: 'Emissão de NF',
      description: 'Emissão de notas fiscais de produto ou serviço conforme a operação.',
      featureKeys: ['nfceGeneration'],
    },
  ],
  corporativo: [
    {
      id: 'agendamento_reunioes',
      name: 'Agendamento de reuniões',
      description: 'Agenda de salas e reuniões com horários e participantes organizados.',
      featureKeys: ['scheduling'],
    },
    {
      id: 'cadastro_clientes',
      name: 'Cadastro e histórico de clientes',
      description: 'Base de clientes e contatos com histórico de relacionamento comercial.',
      featureKeys: ['crm'],
    },
    {
      id: 'equipes',
      name: 'Equipes',
      description: 'Organização de times, permissões e colaboração entre áreas.',
    },
    {
      id: 'ponto_eletronico',
      name: 'Ponto eletrônico',
      description: 'Registro de jornada, banco de horas e controle de presença.',
      featureKeys: ['timeClock'],
    },
    {
      id: 'relatorio_financeiro',
      name: 'Relatório financeiro',
      description: 'Indicadores financeiros e visão consolidada da operação.',
      featureKeys: ['advancedReports'],
    },
    {
      id: 'propostas_comerciais',
      name: 'Emissão de propostas comerciais',
      description: 'Crie e acompanhe propostas e orçamentos comerciais.',
      featureKeys: ['budgets'],
    },
    {
      id: 'portal_cliente',
      name: 'Portal do cliente',
      description: 'Área do cliente para acompanhar propostas, contratos e documentos.',
    },
    {
      id: 'gestao_contratos',
      name: 'Gestão de contratos',
      description: 'Controle de vigências, renovações e status de contratos.',
    },
    {
      id: 'assinatura_eletronica',
      name: 'Assinatura eletrônica',
      description: 'Assinatura digital de contratos e documentos com rastreabilidade.',
    },
    {
      id: 'whatsapp_automatico',
      name: 'WhatsApp automático',
      description: 'Comunicações automáticas com clientes e equipe via WhatsApp.',
      featureKeys: ['whatsappReminders'],
    },
    {
      id: 'pagamentos',
      name: 'Pagamentos via PIX, boleto e cartão',
      description: 'Cobranças e recebimentos com PIX, boleto e cartão.',
      featureKeys: ['payments'],
    },
    {
      id: 'emissao_nf',
      name: 'Emissão de NF',
      description: 'Emissão de notas fiscais integrada ao fluxo comercial.',
      featureKeys: ['nfceGeneration'],
    },
  ],
};

export function getModulesForIndustry(industry: string): BusinessModule[] {
  return MODULES_BY_SEGMENT[industryToModuleSegment(industry)];
}

export function getModuleById(id: string): BusinessModule | undefined {
  for (const modules of Object.values(MODULES_BY_SEGMENT)) {
    const found = modules.find((m) => m.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Default: all modules ON when enabledModules is missing (backwards compatible) */
export function isModuleEnabled(
  enabledModules: Record<string, boolean> | undefined,
  moduleId: string
): boolean {
  if (!enabledModules || !(moduleId in enabledModules)) return true;
  return enabledModules[moduleId] === true;
}

/**
 * Build FeatureFlags patch from enabled module toggles for a given industry.
 * Modules that are OFF turn their featureKeys to false; ON leaves them true.
 */
export function featuresFromEnabledModules(
  industry: string,
  enabledModules: Record<string, boolean>,
  baseFeatures: Record<string, unknown>
): Record<string, unknown> {
  const modules = getModulesForIndustry(industry);
  const next = { ...baseFeatures };

  for (const mod of modules) {
    if (!mod.featureKeys?.length) continue;
    const on = isModuleEnabled(enabledModules, mod.id);
    for (const key of mod.featureKeys) {
      next[key] = on;
    }
  }

  return next;
}

/** Initialize enabledModules map with all modules for industry set to true */
export function defaultEnabledModules(industry: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const mod of getModulesForIndustry(industry)) {
    result[mod.id] = true;
  }
  return result;
}
