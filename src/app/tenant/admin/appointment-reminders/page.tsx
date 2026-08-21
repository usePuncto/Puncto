'use client';

import { ModuleMockup } from '@/components/admin/ModuleMockup';

export default function AppointmentRemindersMockPage() {
  return (
    <ModuleMockup
      moduleId="lembrete_agendamento"
      title="Lembrete de agendamento"
      subtitle="Configure lembretes automáticos por e-mail e modelos prontos para WhatsApp antes de cada consulta ou procedimento."
      primaryAction="Novo lembrete"
      upcoming={[
        'Regras por serviço e profissional (ex.: 24h e 2h antes)',
        'Canais: e-mail, WhatsApp e SMS',
        'Templates editáveis com variáveis do paciente/agendamento',
        'Histórico de envios e taxa de confirmação',
      ]}
      stats={[
        { label: 'Lembretes (exemplo)', value: '128' },
        { label: 'Confirmados', value: '91' },
        { label: 'Falhas de envio', value: '3' },
      ]}
      columns={['Paciente / horário', 'Canal', 'Quando', 'Status']}
      rows={[
        {
          cells: ['Ana Souza · 06/08 14:00', 'WhatsApp', '24h antes', 'Enviado'],
          badge: 'Enviado',
          badgeTone: 'green',
        },
        {
          cells: ['Carlos Lima · 06/08 15:30', 'E-mail', '2h antes', 'Agendado'],
          badge: 'Agendado',
          badgeTone: 'blue',
        },
        {
          cells: ['Marina Costa · 07/08 09:00', 'WhatsApp', '24h antes', 'Falhou'],
          badge: 'Falhou',
          badgeTone: 'amber',
        },
      ]}
    />
  );
}
