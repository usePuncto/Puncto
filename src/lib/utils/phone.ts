/** Normalize phone to digits-only (e.g. 5511999999999). */
export function phoneToId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
  if (!withoutLeadingZero.startsWith('55')) {
    return `55${withoutLeadingZero}`;
  }
  return withoutLeadingZero;
}

export function formatDisplayPhone(phoneId: string): string {
  return `+${phoneId}`;
}
