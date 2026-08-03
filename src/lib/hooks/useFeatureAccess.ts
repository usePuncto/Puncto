'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { hasFeatureAccess } from '@/lib/features/businessTypeFeatures';
import { hasModuleAccess } from '@/lib/features/moduleAccess';
import { Business } from '@/types/business';

/**
 * Hook to check if current business has access to a feature
 */
export function useFeatureAccess(feature: keyof Business['features']): boolean {
  const { business } = useBusiness();

  if (!business) {
    return false;
  }

  return hasFeatureAccess(business, feature);
}

/**
 * Hook to check if a platform module is enabled for the current business
 */
export function useModuleAccess(moduleId: string): boolean {
  const { business } = useBusiness();
  if (!business) return false;
  return hasModuleAccess(business, moduleId);
}

/**
 * Hook to check multiple features at once
 */
export function useFeatureAccessMultiple(
  features: Array<keyof Business['features']>
): Record<string, boolean> {
  const { business } = useBusiness();

  if (!business) {
    return features.reduce((acc, f) => ({ ...acc, [f]: false }), {});
  }

  return features.reduce((acc, feature) => ({
    ...acc,
    [feature]: hasFeatureAccess(business, feature),
  }), {});
}
