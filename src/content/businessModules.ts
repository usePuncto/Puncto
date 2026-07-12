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

/** Map business.industry → module segment (tiersModulos.txt groups) */
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
    { id: 'agendamento_aulas', name: 'Agendamento de aulas experimentais', featureKeys: ['scheduling'] },
    { id: 'cadastro_alunos', name: 'Cadastro e histórico de alunos', featureKeys: ['crm'] },
    { id: 'gestao_turmas', name: 'Gestão de turmas' },
    { id: 'lista_presenca', name: 'Lista de presença', featureKeys: ['attendanceReports'] },
    { id: 'equipes', name: 'Equipes' },
    { id: 'relatorio_financeiro', name: 'Relatório financeiro', featureKeys: ['advancedReports'] },
    { id: 'ponto_eletronico', name: 'Ponto eletrônico', featureKeys: ['timeClock'] },
    { id: 'coleta_eventos', name: 'Coleta de cadastro em eventos' },
    { id: 'whatsapp_automatico', name: 'WhatsApp automático', featureKeys: ['whatsappReminders'] },
    { id: 'emissao_nf', name: 'Emissão de NF', featureKeys: ['nfceGeneration'] },
    { id: 'portal_aluno', name: 'Portal do aluno' },
    { id: 'pagamentos_mensalidades', name: 'Links de pagamento, boletos e mensalidades', featureKeys: ['payments'] },
  ],
  servicos: [
    { id: 'agendamento_online', name: 'Agendamento online ilimitado', featureKeys: ['scheduling'] },
    { id: 'cadastro_clientes', name: 'Cadastro e histórico de clientes', featureKeys: ['crm'] },
    { id: 'lembrete_agendamento', name: 'Lembrete de agendamento', featureKeys: ['emailReminders'] },
    { id: 'whatsapp_automatico', name: 'WhatsApp automático', featureKeys: ['whatsappReminders'] },
    { id: 'relatorio_financeiro', name: 'Relatório financeiro', featureKeys: ['advancedReports'] },
    { id: 'equipes', name: 'Equipes' },
    { id: 'ponto_eletronico', name: 'Ponto eletrônico', featureKeys: ['timeClock'] },
    { id: 'controle_estoque', name: 'Controle de estoque', featureKeys: ['inventoryManagement'] },
    { id: 'lista_espera', name: 'Lista de espera inteligente' },
    { id: 'pacote_servicos', name: 'Pacote de serviços' },
    { id: 'pagamentos', name: 'Pagamentos via PIX, boleto e cartão', featureKeys: ['payments'] },
    { id: 'emissao_nf', name: 'Emissão de NF', featureKeys: ['nfceGeneration'] },
  ],
  saude: [
    { id: 'agendamento_online', name: 'Agendamento online ilimitado', featureKeys: ['scheduling'] },
    { id: 'cadastro_clientes', name: 'Cadastro e histórico de clientes', featureKeys: ['crm'] },
    { id: 'lembrete_agendamento', name: 'Lembrete de agendamento', featureKeys: ['emailReminders'] },
    { id: 'whatsapp_automatico', name: 'WhatsApp automático', featureKeys: ['whatsappReminders'] },
    { id: 'relatorio_financeiro', name: 'Relatório financeiro', featureKeys: ['advancedReports'] },
    { id: 'equipes', name: 'Equipes' },
    { id: 'prescricao_eletronica', name: 'Prescrição eletrônica', featureKeys: ['healthRecords'] },
    { id: 'controle_estoque', name: 'Controle de estoque', featureKeys: ['inventoryManagement'] },
    { id: 'lista_espera', name: 'Lista de espera inteligente' },
    { id: 'assinatura_eletronica', name: 'Assinatura eletrônica' },
    { id: 'pagamentos', name: 'Pagamentos via PIX, boleto e cartão', featureKeys: ['payments'] },
    { id: 'emissao_nf', name: 'Emissão de NF', featureKeys: ['nfceGeneration'] },
  ],
  comercio: [
    { id: 'vitrine_digital', name: 'Vitrine digital', featureKeys: ['restaurantMenu'] },
    { id: 'cadastro_clientes', name: 'Cadastro e histórico de clientes', featureKeys: ['crm'] },
    { id: 'fornecedores_compras', name: 'Gestão de fornecedores e ordens de compra', featureKeys: ['purchaseOrders'] },
    { id: 'whatsapp_automatico', name: 'WhatsApp automático', featureKeys: ['whatsappReminders'] },
    { id: 'relatorio_financeiro', name: 'Relatório financeiro', featureKeys: ['advancedReports'] },
    { id: 'cupons_desconto', name: 'Gestão de cupons de desconto', featureKeys: ['campaigns'] },
    { id: 'trocas_devolucoes', name: 'Gestão de trocas e devoluções' },
    { id: 'controle_estoque', name: 'Controle de estoque', featureKeys: ['inventoryManagement'] },
    { id: 'programa_fidelidade', name: 'Programa de fidelidade', featureKeys: ['loyaltyPrograms'] },
    { id: 'ponto_eletronico', name: 'Ponto eletrônico', featureKeys: ['timeClock'] },
    { id: 'pagamentos', name: 'Pagamentos via PIX, boleto e cartão', featureKeys: ['payments'] },
    { id: 'emissao_nf', name: 'Emissão de NF', featureKeys: ['nfceGeneration'] },
  ],
  corporativo: [
    { id: 'agendamento_reunioes', name: 'Agendamento de reuniões', featureKeys: ['scheduling'] },
    { id: 'cadastro_clientes', name: 'Cadastro e histórico de clientes', featureKeys: ['crm'] },
    { id: 'equipes', name: 'Equipes' },
    { id: 'ponto_eletronico', name: 'Ponto eletrônico', featureKeys: ['timeClock'] },
    { id: 'relatorio_financeiro', name: 'Relatório financeiro', featureKeys: ['advancedReports'] },
    { id: 'propostas_comerciais', name: 'Emissão de propostas comerciais', featureKeys: ['budgets'] },
    { id: 'portal_cliente', name: 'Portal do cliente' },
    { id: 'gestao_contratos', name: 'Gestão de contratos' },
    { id: 'assinatura_eletronica', name: 'Assinatura eletrônica' },
    { id: 'whatsapp_automatico', name: 'WhatsApp automático', featureKeys: ['whatsappReminders'] },
    { id: 'pagamentos', name: 'Pagamentos via PIX, boleto e cartão', featureKeys: ['payments'] },
    { id: 'emissao_nf', name: 'Emissão de NF', featureKeys: ['nfceGeneration'] },
  ],
};

export function getModulesForIndustry(industry: string): BusinessModule[] {
  return MODULES_BY_SEGMENT[industryToModuleSegment(industry)];
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
