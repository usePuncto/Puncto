/** Formata entrada de CPF: 000.000.000-00 */
export function formatCpfInput(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  }
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

export function normalizeCpfDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** Validação de dígitos verificadores (CPF utilizável, rejeita vazios e sequência repetida). */
export function isValidCpf(value: string | null | undefined): boolean {
  const cpf = normalizeCpfDigits(value || '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf) || /^0+$/.test(cpf)) return false;

  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}
