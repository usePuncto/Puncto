/**
 * Feature summary per plan, by business type.
 * Used on index and pricing pages to show plan features relevant to each segment.
 */
export type BusinessTypeKey = 'servicos' | 'comercio' | 'empresas' | 'saude' | 'corporativo' | 'educacao';

export const businessTypeLabels: Record<BusinessTypeKey, string> = {
  servicos: 'Serviços',
  comercio: 'Comércio',
  empresas: 'Empresas',
  saude: 'Saúde',
  corporativo: 'Corporativo',
  educacao: 'Educação',
};

export const businessTypeOptions: { id: BusinessTypeKey; label: string }[] = [
  { id: 'servicos', label: 'Serviços' },
  { id: 'comercio', label: 'Comércio' },
  { id: 'empresas', label: 'Indústria' },
  { id: 'saude', label: 'Saúde' },
  { id: 'corporativo', label: 'Corporativo' },
  { id: 'educacao', label: 'Educação' },
];

type PlanId = 'gratis' | 'starter' | 'growth' | 'pro';

export const planFeaturesByBusinessType: Record<
  BusinessTypeKey,
  Record<PlanId, string[]>
> = {
  servicos: {
    gratis: [
      'Agendamentos digitais ilimitados (Link na Bio)',
      'Cadastro e histórico de clientes',
    ],
    starter: [
      'Tudo do Grátis',
      'Lembretes automáticos por e-mail + manuais por WhatsApp',
      'Relatório financeiro',
    ],
    growth: [
      'Tudo do Starter',
      'Lista de espera',
      'WhatsApp Automático',
      'CRM (Aniversário/Retenção)',
      'Emissão de NFS-e',
    ],
    pro: [
      'Tudo do Growth',
      'Multi-agendas (Equipes)',
      'DRE Gerencial + Metas',
      'Ponto eletrônico',
      'Controle de estoque completo',
    ],
  },
  comercio: {
    gratis: [
      'Vitrine digital (Link na Bio)',
      'Cadastro e histórico de clientes',
    ],
    starter: [
      'Tudo do Grátis',
      'Controle de estoque simples',
      'Relatório financeiro',
    ],
    growth: [
      'Tudo do Starter',
      'Cardápio/Catálogo QR Code + Pedidos',
      'WhatsApp Automático',
      'Pagamentos PIX e cartão',
      'Emissão NFC-e/NFE',
    ],
    pro: [
      'Tudo do Growth',
      'Multi-estoque/Depósitos',
      'Ponto eletrônico',
      'DRE Gerencial + Metas',
      'Controle de estoque completo',
    ],
  },
  empresas: {
    gratis: [
      'Relatórios simples',
      'Cadastro de funcionários',
    ],
    starter: [
      'Tudo do Grátis',
      'Controle de estoque simples',
      'Ponto eletrônico',
    ],
    growth: [
      'Tudo do Starter',
      'Gestão de contratos',
      'Ordem de produção automática',
      'Banco de horas',
      'Emissão NFC-e/NFE',
    ],
    pro: [
      'Tudo do Growth',
      'Multi-estoque/Depósitos',
      'Integração com outras plataformas',
      'Relatório financeiro completo',
      'Controle de estoque completo',
    ],
  },
  saude: {
    gratis: [
      'Agendamentos digitais ilimitados (Link na Bio)',
      'Cadastro e histórico de pacientes',
    ],
    starter: [
      'Tudo do Grátis',
      'Lembretes automáticos por e-mail + manuais por WhatsApp',
      'Relatório financeiro',
    ],
    growth: [
      'Tudo do Starter',
      'Lista de espera',
      'WhatsApp Automático',
      'Pagamentos PIX e cartão',
      'Emissão de NFS-e',
    ],
    pro: [
      'Tudo do Growth',
      'Multi-agendas (Equipes)',
      'DRE Gerencial + Metas',
      'CRM (Aniversário/Retenção)',
      'Controle de estoque completo',
    ],
  },
  corporativo: {
    gratis: [
      'Relatórios simples',
      'Cadastro de funcionários',
    ],
    starter: [
      'Tudo do Grátis',
      'Contatos automáticos por e-mail + manuais por WhatsApp',
      'Ponto eletrônico',
    ],
    growth: [
      'Tudo do Starter',
      'Gestão de contratos',
      'WhatsApp Automático',
      'Banco de horas',
      'Emissão NFC-e/NFE',
    ],
    pro: [
      'Tudo do Growth',
      'DRE Gerencial + Metas',
      'Integração com outras plataformas',
      'Centros de Custo',
      'Gestão de Franquia',
    ],
  },
  educacao: {
    gratis: [
      'Agendamentos e solicitações (Link na Bio)',
      'Cadastro e histórico de alunos',
    ],
    starter: [
      'Tudo do Grátis',
      'Lembretes automáticos por e-mail + manuais por WhatsApp',
      'Relatório financeiro',
    ],
    growth: [
      'Tudo do Starter',
      'Lista de espera',
      'WhatsApp Automático',
      'Pagamentos PIX e cartão',
      'Emissão de NFS-e',
    ],
    pro: [
      'Tudo do Growth',
      'Rematrícula automática (CRM)',
      'DRE Gerencial + Metas',
      'CRM (Retenção e Reengajamento)',
      'Controle de estoque/insumos completo',
    ],
  },
};
