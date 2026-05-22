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

/** Máscara BR para input: (00) 0000-0000 ou (00) 00000-0000 */
export function formatPhoneInput(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
