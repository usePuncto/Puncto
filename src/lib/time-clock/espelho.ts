/**
 * Espelho de Ponto — monthly individual report for employee access + electronic signature.
 */

export type EspelhoDay = {
  date: string;
  marks: { type: string; time: string; nsr?: number }[];
  adjustments: { kind: string; notes?: string }[];
  workedMinutes: number;
  overtimeMinutes: number;
};

export type EspelhoReport = {
  businessId: string;
  businessName: string;
  businessTaxId: string;
  userId: string;
  employeeName: string;
  employeeCpf: string;
  month: string;
  days: EspelhoDay[];
  totals: {
    workedHours: string;
    overtimeHours: string;
    daysWorked: number;
  };
  retentionYears: 5;
  employeeSignedAt?: string | null;
  employeeSignatureMethod?: string | null;
};

export function buildEspelhoText(report: EspelhoReport): string {
  const lines: string[] = [
    'ESPELHO DE PONTO',
    `Empregador: ${report.businessName} — ${report.businessTaxId}`,
    `Colaborador: ${report.employeeName} — CPF ${report.employeeCpf || 'não informado'}`,
    `Competência: ${report.month}`,
    '',
  ];

  for (const day of report.days) {
    lines.push(`--- ${day.date} ---`);
    for (const m of day.marks) {
      lines.push(`  ${m.type} ${m.time}${m.nsr ? ` (NSR ${m.nsr})` : ''}`);
    }
    for (const a of day.adjustments) {
      lines.push(`  [Tratamento] ${a.kind}${a.notes ? `: ${a.notes}` : ''}`);
    }
    lines.push(
      `  Trabalhadas: ${(day.workedMinutes / 60).toFixed(2)}h | Extras: ${(day.overtimeMinutes / 60).toFixed(2)}h`
    );
    lines.push('');
  }

  lines.push(
    `TOTAL: ${report.totals.workedHours}h trabalhadas | ${report.totals.overtimeHours}h extras | ${report.totals.daysWorked} dias`
  );
  lines.push('Retenção mínima: 5 anos (Portaria 671/2021).');
  if (report.employeeSignedAt) {
    lines.push(
      `Assinatura do colaborador: ${report.employeeSignedAt} (${report.employeeSignatureMethod || 'eletrônica'})`
    );
  } else {
    lines.push('Assinatura do colaborador: pendente');
  }

  return lines.join('\n');
}
