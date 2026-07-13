/**
 * Plan intros and add-on copy for industry marketing pages.
 * Module catalogs/descriptions live in businessModules.ts (tiersModulos.txt).
 */
export type AddOnContent = { title: string; description: string };
export type PlanIntro = { intro: string };

export const addOnContentByIndustry: Record<string, AddOnContent> = {
  servicos: {
    title: 'Personalize a Puncto do seu jeito',
    description:
      'Cada negócio é único — por isso customizamos cada implementação. Escolha os módulos do catálogo de prestadores de serviço e nós adaptamos fluxos, telas e regras à sua operação.',
  },
  varejo: {
    title: 'O melhor dos dois mundos',
    description:
      'Seu negócio é híbrido? Sem problemas. Combine módulos de comércio e varejo e customizamos tudo para a sua operação — loja, delivery ou qualquer modelo que não cabe em um sistema engessado.',
  },
  saude: {
    title: 'Sua clínica, suas regras',
    description:
      'Escolha os módulos do catálogo de saúde e nós adaptamos agendamentos, documentos e fluxos à forma como sua equipe realmente trabalha.',
  },
  educacao: {
    title: 'Seu processo de ensino, do seu jeito',
    description:
      'Combine módulos de gestão acadêmica, financeira e operacional e customizamos para o seu modelo de ensino — sem forçar sua equipe a mudar a rotina.',
  },
  corporativo: {
    title: 'Um sistema que se molda à sua empresa',
    description:
      'Escolha os módulos certos do catálogo corporativo — reuniões, contratos, propostas, portal do cliente — e nós adaptamos cada detalhe para unificar sua operação.',
  },
};

/** Short intro text used on plan cards per industry */
export const planIntrosByIndustry: Record<string, Record<string, PlanIntro>> = {
  servicos: {
    gratis: { intro: 'Inclui os 2 primeiros módulos do catálogo de prestadores de serviço.' },
    starter: { intro: 'Até 8 módulos para organizar agenda, clientes e operação.' },
    growth: { intro: 'Até 10 módulos, incluindo automação, pagamentos e fiscal.' },
    pro: { intro: 'Catálogo completo: até 12 módulos do segmento de serviços.' },
  },
  varejo: {
    gratis: { intro: 'Inclui os 2 primeiros módulos do catálogo de comércio e varejo.' },
    starter: { intro: 'Até 8 módulos para vitrine, clientes, estoque e vendas.' },
    growth: { intro: 'Até 10 módulos, incluindo fidelidade, cupons e fiscal.' },
    pro: { intro: 'Catálogo completo: até 12 módulos de comércio e varejo.' },
  },
  saude: {
    gratis: { intro: 'Inclui os 2 primeiros módulos do catálogo de saúde.' },
    starter: { intro: 'Até 8 módulos para agenda, pacientes e operação clínica.' },
    growth: { intro: 'Até 10 módulos, incluindo prescrição, assinatura e fiscal.' },
    pro: { intro: 'Catálogo completo: até 12 módulos do segmento de saúde.' },
  },
  educacao: {
    gratis: { intro: 'Inclui os 2 primeiros módulos do catálogo de educação.' },
    starter: { intro: 'Até 8 módulos para turmas, alunos e rotina pedagógica.' },
    growth: { intro: 'Até 10 módulos, incluindo portal, mensalidades e fiscal.' },
    pro: { intro: 'Catálogo completo: até 12 módulos do segmento de educação.' },
  },
  corporativo: {
    gratis: { intro: 'Inclui os 2 primeiros módulos do catálogo de gestão corporativa.' },
    starter: { intro: 'Até 8 módulos para reuniões, equipes e financeiro.' },
    growth: { intro: 'Até 10 módulos, incluindo contratos, propostas e fiscal.' },
    pro: { intro: 'Catálogo completo: até 12 módulos de gestão corporativa.' },
  },
};

/** @deprecated Use getModulesForIndustry + planIntrosByIndustry */
export const featureDetailsByIndustry = planIntrosByIndustry;
