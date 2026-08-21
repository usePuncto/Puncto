'use client';

import { ModuleMockup } from '@/components/admin/ModuleMockup';

export default function WaitlistMockPage() {
  return (
    <ModuleMockup
      moduleId="lista_espera"
      title="Lista de espera"
      subtitle="Organize pacientes aguardando vaga quando a agenda estiver cheia, com prioridade e contato rápido."
      primaryAction="Adicionar à lista"
      upcoming={[
        'Entrada manual ou automática ao tentar horário indisponível',
        'Prioridade, preferência de profissional e janela de horários',
        'Notificação quando surgir encaixe',
        'Conversão da espera em agendamento confirmado',
      ]}
      stats={[
        { label: 'Na fila (exemplo)', value: '7' },
        { label: 'Contatados hoje', value: '2' },
        { label: 'Convertidos no mês', value: '15' },
      ]}
      columns={['Paciente', 'Preferência', 'Desde', 'Prioridade']}
      rows={[
        {
          cells: ['Fernanda Dias', 'Dra. Helena · manhã', '01/08', 'Alta'],
          badge: 'Alta',
          badgeTone: 'amber',
        },
        {
          cells: ['Roberto Nunes', 'Qualquer · tarde', '03/08', 'Normal'],
          badge: 'Normal',
          badgeTone: 'blue',
        },
        {
          cells: ['Lia Prado', 'Dr. Ricardo · sexta', '04/08', 'Normal'],
          badge: 'Normal',
          badgeTone: 'blue',
        },
      ]}
    />
  );
}
