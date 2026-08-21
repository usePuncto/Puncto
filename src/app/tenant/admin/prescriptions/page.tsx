'use client';

import { ModuleMockup } from '@/components/admin/ModuleMockup';

export default function PrescriptionsMockPage() {
  return (
    <ModuleMockup
      moduleId="prescricao_eletronica"
      title="Prescrição eletrônica"
      subtitle="Elabore e acompanhe prescrições vinculadas ao paciente e ao atendimento. Mockup visual — sem integração com receita digital oficial ainda."
      primaryAction="Nova prescrição"
      upcoming={[
        'Editor de medicamentos com posologia e duração',
        'Vínculo com paciente, profissional e agendamento',
        'PDF para impressão / envio ao paciente',
        'Assinatura do prescritor (módulo de assinatura eletrônica)',
        'Histórico clínico por paciente',
      ]}
      stats={[
        { label: 'Prescrições (exemplo)', value: '42' },
        { label: 'Este mês', value: '11' },
        { label: 'Pendentes de assinatura', value: '2' },
      ]}
      columns={['Paciente', 'Profissional', 'Data', 'Status']}
      rows={[
        {
          cells: ['Ana Souza', 'Dra. Helena', '02/08/2026', 'Assinada'],
          badge: 'Assinada',
          badgeTone: 'green',
        },
        {
          cells: ['Pedro Alves', 'Dr. Ricardo', '04/08/2026', 'Rascunho'],
          badge: 'Rascunho',
          badgeTone: 'neutral',
        },
        {
          cells: ['Julia Mendes', 'Dra. Helena', '05/08/2026', 'Aguardando assinatura'],
          badge: 'Pendente',
          badgeTone: 'amber',
        },
      ]}
    />
  );
}
