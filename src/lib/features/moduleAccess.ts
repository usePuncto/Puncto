import type { Business } from '@/types/business';
import {
  getModulesForIndustry,
  isModuleEnabled,
  tierToPlanId,
} from '@/content/businessModules';
import {
  getIncludedFeaturesForPlanAndIndustry,
  hasFeatureAccess,
  type FeatureId,
} from '@/lib/features/businessTypeFeatures';

/**
 * Check if a specific catalog module is enabled for this business.
 * Modules not in the business industry catalog are ignored (return true).
 */
export function hasModuleAccess(
  business: Pick<Business, 'industry' | 'enabledModules'>,
  moduleId: string
): boolean {
  const catalog = getModulesForIndustry(business.industry || 'general');
  if (!catalog.some((m) => m.id === moduleId)) return true;
  return isModuleEnabled(business.enabledModules, moduleId);
}

/**
 * True if at least one of the given module IDs is enabled for this business.
 * If none of the IDs belong to this industry catalog, returns true (no-op).
 */
export function hasAnyModuleAccess(
  business: Pick<Business, 'industry' | 'enabledModules'>,
  moduleIds: string[]
): boolean {
  if (!moduleIds.length) return true;
  const catalogIds = new Set(
    getModulesForIndustry(business.industry || 'general').map((m) => m.id)
  );
  const relevant = moduleIds.filter((id) => catalogIds.has(id));
  if (!relevant.length) return true;
  return relevant.some((id) => hasModuleAccess(business, id));
}

export type AdminNavCapability = {
  /** Always visible (dashboard, settings, notifications) */
  always?: boolean;
  /** Requires enterprise/pro commercial plan */
  enterprise?: boolean;
  /** FeatureId from plan×industry matrix + hasFeatureAccess */
  feature?: FeatureId;
  /** At least one of these platform modules must be ON */
  modules?: string[];
};

/**
 * Resolve commercial plan for gating (prefer planId over legacy tier).
 */
export function getBusinessPlanId(business: Pick<Business, 'subscription'>): string {
  return tierToPlanId(business.subscription?.tier, business.subscription?.planId);
}

/**
 * Unified gate used by tenant admin nav and route guards.
 * Platform `enabledModules` is the source of truth when set.
 * Legacy businesses without enabledModules fall back to plan×industry.
 */
export function canAccessAdminCapability(
  business: Business,
  capability: AdminNavCapability
): boolean {
  if (capability.always) return true;

  const planId = getBusinessPlanId(business);

  if (capability.enterprise) {
    return planId === 'enterprise' || planId === 'pro';
  }

  if (capability.modules?.length) {
    if (!hasAnyModuleAccess(business, capability.modules)) return false;
    // Explicit per-business module config → module toggle wins
    if (business.enabledModules) return true;
  }

  if (capability.feature) {
    const planForMatrix = planId === 'enterprise' ? 'pro' : planId;
    const included = getIncludedFeaturesForPlanAndIndustry(
      planForMatrix,
      business.industry || 'general'
    );
    if (!included.includes(capability.feature)) return false;

    return hasFeatureAccess(
      business,
      capability.feature as unknown as keyof Business['features']
    );
  }

  // modules-only and already passed (or no relevant modules in catalog)
  if (capability.modules?.length) return true;

  return true;
}

/**
 * Map admin path → capability for redirect guards.
 */
export const ADMIN_ROUTE_CAPABILITIES: Array<{
  match: string;
  capability: AdminNavCapability;
}> = [
  // Education-specific
  {
    match: '/tenant/admin/aulas-experimentais',
    capability: { modules: ['agendamento_aulas'], feature: 'scheduling' },
  },
  {
    match: '/tenant/admin/turmas',
    capability: { modules: ['gestao_turmas'] },
  },
  {
    match: '/tenant/admin/attendance',
    capability: { modules: ['lista_presenca'], feature: 'attendanceReports' },
  },
  {
    match: '/tenant/admin/eventos',
    capability: { modules: ['coleta_eventos'] },
  },
  // Shared
  {
    match: '/tenant/admin/bookings',
    capability: {
      modules: ['agendamento_online', 'agendamento_aulas', 'agendamento_reunioes'],
      feature: 'scheduling',
    },
  },
  {
    match: '/tenant/admin/services',
    capability: { modules: ['agendamento_online', 'pacote_servicos'], feature: 'scheduling' },
  },
  {
    match: '/tenant/admin/professionals',
    capability: {
      modules: ['equipes', 'agendamento_online', 'agendamento_aulas'],
      feature: 'scheduling',
    },
  },
  {
    match: '/tenant/admin/customers',
    capability: {
      modules: ['cadastro_clientes', 'cadastro_alunos'],
      feature: 'crm',
    },
  },
  {
    match: '/tenant/admin/payments',
    capability: {
      modules: ['pagamentos', 'pagamentos_mensalidades'],
      feature: 'payments',
    },
  },
  {
    match: '/tenant/admin/financial',
    capability: { modules: ['relatorio_financeiro'], feature: 'analytics' },
  },
  {
    match: '/tenant/admin/menu',
    capability: { modules: ['vitrine_digital'], feature: 'restaurantMenu' },
  },
  {
    match: '/tenant/admin/orders',
    capability: { feature: 'tableOrdering' },
  },
  {
    match: '/tenant/admin/tables',
    capability: { feature: 'virtualTabs' },
  },
  {
    match: '/tenant/admin/inventory',
    capability: { modules: ['controle_estoque'], feature: 'inventoryManagement' },
  },
  {
    match: '/tenant/admin/purchases',
    capability: { modules: ['fornecedores_compras'], feature: 'purchaseOrders' },
  },
  {
    match: '/tenant/admin/time-clock',
    capability: { modules: ['ponto_eletronico'], feature: 'timeClock' },
  },
  {
    match: '/tenant/admin/loyalty',
    capability: {
      modules: ['programa_fidelidade', 'cupons_desconto', 'campanhas'],
      feature: 'loyaltyPrograms',
    },
  },
  {
    match: '/tenant/admin/whatsapp',
    capability: { modules: ['whatsapp_automatico'] },
  },
  {
    match: '/tenant/admin/franchise',
    capability: { enterprise: true },
  },
];

export function getCapabilityForAdminPath(pathname: string | null): AdminNavCapability | null {
  if (!pathname) return null;
  const hit = ADMIN_ROUTE_CAPABILITIES.find(
    (r) => pathname === r.match || pathname.startsWith(r.match + '/')
  );
  return hit?.capability ?? null;
}

export function canAccessAdminPath(business: Business, pathname: string | null): boolean {
  if (!pathname) return true;
  // Core pages always allowed
  if (
    pathname === '/tenant/admin/dashboard' ||
    pathname.startsWith('/tenant/admin/dashboard/') ||
    pathname === '/tenant/admin/settings' ||
    pathname.startsWith('/tenant/admin/settings/') ||
    pathname === '/tenant/admin/notifications' ||
    pathname.startsWith('/tenant/admin/notifications/')
  ) {
    return true;
  }
  const capability = getCapabilityForAdminPath(pathname);
  if (!capability) return true;
  return canAccessAdminCapability(business, capability);
}
