/**
 * Feature summary per plan, by business type.
 * Module lists come from public/tiersModulos.txt via businessModules.
 */
import {
  MODULES_BY_SEGMENT,
  type BusinessModuleSegment,
} from '@/content/businessModules';
import { PLAN_MODULE_LIMITS, type PlanId } from '@/content/modules';

export type BusinessTypeKey = 'servicos' | 'comercio' | 'saude' | 'corporativo' | 'educacao';

export const businessTypeLabels: Record<BusinessTypeKey, string> = {
  servicos: 'Serviços',
  comercio: 'Comércio',
  saude: 'Saúde',
  corporativo: 'Corporativo',
  educacao: 'Educação',
};

export const businessTypeOptions: { id: BusinessTypeKey; label: string }[] = [
  { id: 'servicos', label: 'Serviços' },
  { id: 'comercio', label: 'Comércio' },
  { id: 'saude', label: 'Saúde' },
  { id: 'corporativo', label: 'Corporativo' },
  { id: 'educacao', label: 'Educação' },
];

const businessTypeToSegment: Record<BusinessTypeKey, BusinessModuleSegment> = {
  servicos: 'servicos',
  comercio: 'comercio',
  saude: 'saude',
  corporativo: 'corporativo',
  educacao: 'educacao',
};

/** Module names available for a business type (from tiersModulos.txt) */
export function getModuleNamesForBusinessType(type: BusinessTypeKey): string[] {
  return MODULES_BY_SEGMENT[businessTypeToSegment[type]].map((m) => m.name);
}

/**
 * Plan card bullets: module limit + sample of segment modules.
 * Plans differ by how many modules you can pick, not by a separate catalog.
 */
export const planFeaturesByBusinessType: Record<
  BusinessTypeKey,
  Record<PlanId, string[]>
> = (Object.keys(businessTypeToSegment) as BusinessTypeKey[]).reduce(
  (acc, type) => {
    const names = getModuleNamesForBusinessType(type);
    acc[type] = {
      gratis: [
        `Inclui os ${PLAN_MODULE_LIMITS.gratis} primeiros módulos do catálogo`,
        ...names.slice(0, PLAN_MODULE_LIMITS.gratis),
      ],
      starter: [
        `Escolha até ${PLAN_MODULE_LIMITS.starter} módulos`,
        ...names.slice(0, 4),
      ],
      growth: [
        `Escolha até ${PLAN_MODULE_LIMITS.growth} módulos`,
        ...names.slice(0, 5),
      ],
      pro: [
        `Escolha até ${PLAN_MODULE_LIMITS.pro} módulos (catálogo completo)`,
        ...names.slice(0, 5),
      ],
    };
    return acc;
  },
  {} as Record<BusinessTypeKey, Record<PlanId, string[]>>
);
