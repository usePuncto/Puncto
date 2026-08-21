'use client';

import { ModuleMockup } from '@/components/admin/ModuleMockup';

export default function ESignaturesMockPage() {
  return (
    <ModuleMockup
      moduleId="assinatura_eletronica"
      title="Assinatura eletrônica"
      subtitle="Colete e arquive assinaturas em termos, consentimentos e documentos clínicos. Mockup — sem provedor de assinatura conectado."
      primaryAction="Novo documento"
      upcoming={[
        'Upload de PDF / templates de termo de consentimento',
        'Envio de link de assinatura ao paciente',
        'Registro de IP, data/hora e aceite (trilha de auditoria)',
        'Integração opcional com ICP-Brasil / provedores externos',
        'Uso conjunto com prescrição eletrônica e espelho de ponto',
      ]}
      stats={[
        { label: 'Documentos (exemplo)', value: '36' },
        { label: 'Assinados', value: '29' },
        { label: 'Aguardando', value: '7' },
      ]}
      columns={['Documento', 'Paciente', 'Enviado em', 'Status']}
      rows={[
        {
          cells: ['Termo de consentimento', 'Ana Souza', '01/08/2026', 'Assinado'],
          badge: 'Assinado',
          badgeTone: 'green',
        },
        {
          cells: ['LGPD — tratamento de dados', 'Carlos Lima', '03/08/2026', 'Aguardando'],
          badge: 'Aguardando',
          badgeTone: 'amber',
        },
        {
          cells: ['Autorização de procedimento', 'Marina Costa', '04/08/2026', 'Rascunho'],
          badge: 'Rascunho',
          badgeTone: 'neutral',
        },
      ]}
    />
  );
}
