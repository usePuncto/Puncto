import type { StudentModality } from '@/types/booking';

export type { StudentModality };

export const STUDENT_MODALITY_OPTIONS: { value: StudentModality; label: string }[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'vip', label: 'VIP' },
  { value: 'bolsista', label: 'Bolsista' },
  { value: 'aula_avulsa', label: 'Aula Avulsa' },
];

export function studentModalityLabel(modality?: string | null): string {
  return STUDENT_MODALITY_OPTIONS.find((o) => o.value === modality)?.label ?? '—';
}

export function modalityBadgeClass(modality?: string | null): string {
  switch (modality) {
    case 'presencial':
      return 'bg-blue-100 text-blue-800';
    case 'online':
      return 'bg-purple-100 text-purple-800';
    case 'vip':
      return 'bg-amber-100 text-amber-900';
    case 'bolsista':
      return 'bg-emerald-100 text-emerald-800';
    case 'aula_avulsa':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}
