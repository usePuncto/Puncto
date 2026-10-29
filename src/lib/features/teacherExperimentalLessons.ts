/**
 * Pilot: teachers (professionals) may schedule experimental lessons
 * only for these education businesses.
 */
export const TEACHER_EXPERIMENTAL_LESSONS_BUSINESS_IDS = new Set<string>([
  'Z30cuko6DhVhnDGxJQ6w', // Yoga Spanda
  'QmujrWL6Jj8BQoUL46HR',
]);

export function teachersCanScheduleExperimentalLessons(
  business: { id?: string; industry?: string } | null | undefined
): boolean {
  if (!business?.id) return false;
  if (business.industry !== 'education') return false;
  return TEACHER_EXPERIMENTAL_LESSONS_BUSINESS_IDS.has(business.id);
}
