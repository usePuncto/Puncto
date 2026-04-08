/**
 * Business type definitions and feature mappings
 * Controls which features are available based on business industry/type
 */

import { Business } from '@/types/business';

/**
 * Business type enum
 * Maps to the `industry` field in Business model
 */
export type BusinessType = 
  | 'salon'           // Beauty salons, barbershops, nail studios
  | 'clinic'          // Medical, dental, aesthetic, dermatology clinics
  | 'restaurant'      // Restaurants, cafes, food service
  | 'bakery'          // Bakeries, confectioneries (custom orders)
  | 'event'           // Event spaces, venues
  | 'general'         // General service businesses
  | 'education';      // Education (schools, courses, training)

/**
 * Feature IDs that can be enabled/disabled
 */
export type FeatureId = 
  // Core features
  | 'scheduling'
  | 'payments'
  | 'crm'
  | 'analytics'
  // Restaurant features
  | 'restaurantMenu'
  | 'tableOrdering'
  | 'virtualTabs'
  | 'thermalPrinting'
  // Inventory/ERP features
  | 'inventoryManagement'
  | 'purchaseOrders'
  | 'costCalculation'
  // Time tracking
  | 'timeClock'
  | 'attendanceReports'
  // Marketing
  | 'campaigns'
  | 'loyaltyPrograms'
  | 'customerSegmentation';

/**
 * Feature mapping by business type
 * Defines which features are RELEVANT for each business type
 * Note: This doesn't enforce access - subscription tier still controls availability
 * This is used to hide/show features in the UI and guide users
 */
export const INDUSTRY_FEATURE_MAP: Record<BusinessType, FeatureId[]> = {
  salon: [
    'scheduling',
    'payments',
    'crm',
    'analytics',
    'campaigns',
    'loyaltyPrograms',
    'customerSegmentation',
  ],
  clinic: [
    'scheduling',
    'payments',
    'crm',
    'analytics',
    'campaigns',
    'customerSegmentation',
  ],
  restaurant: [
    'scheduling',
    'payments',
    'restaurantMenu',
    'tableOrdering',
    'virtualTabs',
    'inventoryManagement',
    'purchaseOrders',
    'costCalculation',
    'timeClock',
    'attendanceReports',
    'thermalPrinting',
    'crm',
    'analytics',
    'campaigns',
    'loyaltyPrograms',
  ],
  bakery: [
    'scheduling',
    'payments',
    'inventoryManagement',
    'purchaseOrders',
    'costCalculation',
    'timeClock',
    'crm',
    'analytics',
  ],
  event: [
    'scheduling',
    'payments',
    'crm',
    'analytics',
    'campaigns',
  ],
  general: [
    'scheduling',
    'payments',
    'crm',
    'analytics',
  ],
  education: [
    // Education uses the same "service/business scheduling + CRM" core as general services.
    'scheduling',
    'payments',
    'crm',
    'analytics',
  ],
};

/**
 * Feature names for UI display
 */
/** All platform features - used to list every available feature regardless of industry or plan */
export const ALL_FEATURE_IDS: FeatureId[] = [
  'scheduling',
  'payments',
  'crm',
  'analytics',
  'restaurantMenu',
  'tableOrdering',
  'virtualTabs',
  'thermalPrinting',
  'inventoryManagement',
  'purchaseOrders',
  'costCalculation',
  'timeClock',
  'attendanceReports',
  'campaigns',
  'loyaltyPrograms',
  'customerSegmentation',
];

/**
 * Industry keys used for plan+industry feature mapping.
 * Maps business.industry values to these keys.
 */
export const INDUSTRY_TO_KEY: Record<string, string> = {
  services: 'servicos',
  servicos: 'servicos',
  salon: 'servicos',
  clinic: 'servicos',
  event: 'servicos',
  general: 'servicos',
  education: 'educacao',
  retail: 'comercio',
  varejo: 'comercio',
  comercio: 'comercio',
  restaurant: 'comercio',
  bakery: 'comercio',
  corporate: 'empresas',
  empresas: 'empresas',
  saude: 'saude',
  health: 'saude',
  corporativo: 'corporativo',
};

/** Features included per (industry, plan) - based on planFeaturesByBusinessType */
export const FEATURES_BY_PLAN_AND_INDUSTRY: Record<string, Record<string, FeatureId[]>> = {
  servicos: {
    gratis: ['scheduling', 'crm'],
    starter: ['scheduling', 'payments', 'crm', 'analytics'],
    growth: ['scheduling', 'payments', 'crm', 'analytics', 'campaigns', 'loyaltyPrograms', 'customerSegmentation'],
    pro: ['scheduling', 'payments', 'crm', 'analytics', 'campaigns', 'loyaltyPrograms', 'customerSegmentation', 'inventoryManagement'],
    enterprise: [...ALL_FEATURE_IDS],
  },
  comercio: {
    gratis: ['crm'],
    starter: ['crm', 'analytics', 'inventoryManagement'],
    growth: ['crm', 'analytics', 'inventoryManagement', 'restaurantMenu', 'tableOrdering', 'virtualTabs', 'campaigns', 'loyaltyPrograms', 'payments'],
    pro: ['crm', 'analytics', 'inventoryManagement', 'restaurantMenu', 'tableOrdering', 'virtualTabs', 'campaigns', 'loyaltyPrograms', 'payments', 'timeClock', 'purchaseOrders', 'costCalculation'],
    enterprise: [...ALL_FEATURE_IDS],
  },
  empresas: {
    gratis: ['analytics', 'crm'],
    starter: ['analytics', 'crm', 'inventoryManagement', 'timeClock'],
    growth: ['analytics', 'crm', 'inventoryManagement', 'timeClock', 'purchaseOrders', 'payments'],
    pro: ['analytics', 'crm', 'inventoryManagement', 'timeClock', 'purchaseOrders', 'payments', 'costCalculation'],
    enterprise: [...ALL_FEATURE_IDS],
  },
  saude: {
    gratis: ['scheduling', 'crm'],
    starter: ['scheduling', 'payments', 'crm', 'analytics'],
    growth: ['scheduling', 'payments', 'crm', 'analytics', 'campaigns', 'customerSegmentation'],
    pro: ['scheduling', 'payments', 'crm', 'analytics', 'campaigns', 'customerSegmentation', 'inventoryManagement'],
    enterprise: [...ALL_FEATURE_IDS],
  },
  corporativo: {
    gratis: ['analytics', 'crm'],
    starter: ['analytics', 'crm', 'timeClock'],
    growth: ['analytics', 'crm', 'timeClock', 'payments'],
    pro: ['analytics', 'crm', 'timeClock', 'payments', 'costCalculation'],
    enterprise: [...ALL_FEATURE_IDS],
  },
  educacao: {
    // Por padrão, segue a lógica de "serviços".
    // No plano Pro, liberamos todas as features que aparecem no admin dashboard.
    gratis: ['scheduling', 'crm'],
    starter: ['scheduling', 'payments', 'crm', 'analytics'],
    growth: ['scheduling', 'payments', 'crm', 'analytics', 'campaigns', 'loyaltyPrograms', 'customerSegmentation'],
    pro: [...ALL_FEATURE_IDS],
    enterprise: [...ALL_FEATURE_IDS],
  },
};

/**
 * Get features included in the user's plan for their industry.
 */
export function getIncludedFeaturesForPlanAndIndustry(planId: string, industry: string): FeatureId[] {
  const industryKey = INDUSTRY_TO_KEY[industry] || 'servicos';
  const byIndustry = FEATURES_BY_PLAN_AND_INDUSTRY[industryKey];
  if (!byIndustry) return FEATURES_BY_PLAN_AND_INDUSTRY.servicos?.gratis || [];
  return byIndustry[planId] || byIndustry.gratis || [];
}

export const FEATURE_LABELS: Record<FeatureId, string> = {
  scheduling: 'Agendamento',
  payments: 'Pagamentos',
  crm: 'CRM e Clientes',
  analytics: 'Relatórios e Analytics',
  restaurantMenu: 'Cardápio Digital',
  tableOrdering: 'Pedidos por Mesa',
  virtualTabs: 'Comanda Virtual',
  thermalPrinting: 'Impressão Térmica',
  inventoryManagement: 'Gestão de Estoque',
  purchaseOrders: 'Pedidos de Compra',
  costCalculation: 'Cálculo de Custos',
  timeClock: 'Ponto Eletrônico',
  attendanceReports: 'Relatórios de Presença',
  campaigns: 'Campanhas Marketing',
  loyaltyPrograms: 'Programas de Fidelidade',
  customerSegmentation: 'Segmentação de Clientes',
};

/**
 * Check if a business type has access to a specific feature
 * This checks both business type relevance AND subscription tier
 */
export function isFeatureRelevantForBusinessType(
  businessType: string,
  featureId: FeatureId
): boolean {
  const type = businessType as BusinessType;
  const features = INDUSTRY_FEATURE_MAP[type] || INDUSTRY_FEATURE_MAP.general;
  return features.includes(featureId);
}

/**
 * Get all features relevant for a business type
 */
export function getFeaturesForBusinessType(businessType: string): FeatureId[] {
  const type = businessType as BusinessType;
  return INDUSTRY_FEATURE_MAP[type] || INDUSTRY_FEATURE_MAP.general;
}

/**
 * Map feature flag keys to feature IDs
 * This helps connect Business.features flags to FeatureId
 */
export const FEATURE_FLAG_MAP: Record<string, FeatureId> = {
  restaurantMenu: 'restaurantMenu',
  tableOrdering: 'tableOrdering',
  virtualTabs: 'virtualTabs',
  thermalPrinting: 'thermalPrinting',
  inventoryManagement: 'inventoryManagement',
  purchaseOrders: 'purchaseOrders',
  costCalculation: 'costCalculation',
  timeClock: 'timeClock',
  attendanceReports: 'attendanceReports',
  campaigns: 'campaigns',
  loyaltyPrograms: 'loyaltyPrograms',
  customerSegmentation: 'customerSegmentation',
};

/**
 * Check if a business has access to a feature
 * All features are available regardless of subscription tier or industry.
 * (Tier/industry checks bypassed per product requirement.)
 */
export function hasFeatureAccess(
  _business: Business,
  _featureKey: keyof Business['features']
): boolean {
  return true; // All features enabled - tier and industry do not restrict access
}

/**
 * Get business type display name
 */
export function getBusinessTypeLabel(type: string): string {
  const labels: Record<BusinessType, string> = {
    salon: 'Salão de Beleza',
    clinic: 'Clínica',
    restaurant: 'Restaurante',
    bakery: 'Padaria',
    event: 'Eventos',
    general: 'Serviços Gerais',
    education: 'Educação',
  };
  return labels[type as BusinessType] || type;
}

/**
 * Check if a business type is valid
 */
export function isValidBusinessType(type: string): type is BusinessType {
  return ['salon', 'clinic', 'restaurant', 'bakery', 'event', 'general', 'education'].includes(type);
}
