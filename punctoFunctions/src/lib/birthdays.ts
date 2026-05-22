/**
 * Birthday matching (yyyy-MM-dd), aligned with src/lib/utils/birthdays.ts
 */
export function isBirthdayToday(birthDate?: string): boolean {
  if (!birthDate) return false;
  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
}

/** Resolves birthDate from customer document (field or legacy customFields.birthday). */
export function resolveCustomerBirthDate(customer: {
  birthDate?: string;
  customFields?: { birthday?: string };
}): string | undefined {
  if (customer.birthDate) return customer.birthDate;
  const legacy = customer.customFields?.birthday;
  if (!legacy) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(legacy)) return legacy;
  const parsed = new Date(legacy);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
