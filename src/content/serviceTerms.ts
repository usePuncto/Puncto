import { type PlanId, PLAN_MODULE_LIMITS } from '@/content/modules';

export const serviceTermsItems = [
  {
    id: 'customizations',
    title: 'Pequenas customizações',
    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
    points: (moduleLimit?: number) => [
      moduleLimit
        ? `Incluídas para os ${moduleLimit} módulos contratados no seu plano.`
        : 'Incluídas para os módulos contratados no seu plano.',
      'Ajustes de interface, nomenclatura de campos, adaptações visuais leves e configurações do sistema.',
      'Limite de até 2 horas técnicas de desenvolvimento por mês calendário.',
      'Horas não utilizadas não acumulam para os meses seguintes.',
    ],
  },
  {
    id: 'new-features',
    title: 'Novas funcionalidades',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    points: () => [
      'Criação de novas regras de negócio, integrações complexas com APIs de terceiros ou relatórios avançados não previstos no sistema original.',
      'Qualquer customização que ultrapasse o limite de 2 horas mensais da cláusula de pequenas customizações.',
      'Classificadas como Desenvolvimento Específico, com análise técnica, orçamento e faturamento separado.',
      'Dependem de aprovação prévia do cliente antes do início dos trabalhos.',
    ],
  },
  {
    id: 'availability',
    title: 'Disponibilidade',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    points: () => [
      'Empenhamos os melhores esforços para manter a plataforma disponível de forma contínua.',
      'Manutenções programadas podem ocorrer, com comunicação prévia sempre que possível.',
      'Interrupções por casos fortuitos ou força maior estão fora do nosso controle direto.',
    ],
  },
  {
    id: 'support',
    title: 'Suporte técnico',
    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
    points: () => [
      'Atendimento por e-mail, WhatsApp e telefone.',
      'Horário: dias úteis, das 09h às 18h.',
      'SLA de resposta de até 3 horas úteis, conforme a criticidade da solicitação.',
    ],
  },
  {
    id: 'updates',
    title: 'Atualizações e manutenção',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    points: () => [
      'Atualizações de versão, correção de bugs e melhorias de segurança incluídas.',
      'Sem custo adicional para o cliente.',
    ],
  },
] as const;

export function getServiceTermsForPlan(planId?: PlanId) {
  const moduleLimit = planId ? PLAN_MODULE_LIMITS[planId] : undefined;
  return serviceTermsItems.map((item) => ({
    ...item,
    points: item.points(moduleLimit),
  }));
}
