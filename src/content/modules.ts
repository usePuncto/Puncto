import {
  getModuleById as getBusinessModuleById,
  getModulesForIndustry,
  type BusinessModule,
} from '@/content/businessModules';

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

/** @deprecated Prefer getModulesForIndustry — kept for any legacy references */
export type ErpModule = BusinessModule & { minPlan?: PlanId };

export function getModuleById(id: string): BusinessModule | undefined {
  return getBusinessModuleById(id);
}

/** Free plan includes only the first N modules of the segment catalog (tiersModulos order). */
export function isModuleAvailableForPlan(
  industry: string,
  moduleId: string,
  planId: PlanId
): boolean {
  const modules = getModulesForIndustry(industry);
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index === -1) return false;
  if (planId === 'gratis') return index < PLAN_MODULE_LIMITS.gratis;
  return true;
}

export function getModulesAvailableForPlan(industry: string, planId: PlanId): BusinessModule[] {
  const modules = getModulesForIndustry(industry);
  if (planId === 'gratis') return modules.slice(0, PLAN_MODULE_LIMITS.gratis);
  return modules;
}

export function getPlanCardHighlights(planId: PlanId): string[] {
  const limit = PLAN_MODULE_LIMITS[planId];

  const highlights: string[] = [
    planId === 'gratis'
      ? 'Inclui os 2 primeiros módulos do catálogo do seu segmento'
      : `Escolha até ${limit} módulos do seu segmento`,
    'Catálogo de módulos alinhado ao seu tipo de negócio',
    'Até 2h/mês de pequenas customizações incluídas',
    'Implementação customizada incluída',
  ];

  if (planId === 'gratis') {
    highlights.push('Demais módulos disponíveis a partir do Starter');
  } else if (planId === 'starter') {
    highlights.push('Mais módulos para organizar a operação');
  } else if (planId === 'growth') {
    highlights.push('Quase todo o catálogo do seu segmento');
  } else {
    highlights.push('Todos os 12 módulos do seu segmento');
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

export { getModulesForIndustry };
