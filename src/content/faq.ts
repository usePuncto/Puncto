export const faqItems = [
  {
    question: 'Como funciona o modelo da Puncto?',
    answer:
      'Somos um ERP modular customizado. Você escolhe os módulos que precisa — agendamento, estoque, ponto, fiscal, CRM e outros — e nós adaptamos cada implementação aos seus processos e regras de negócio. Não vendemos um sistema pronto de prateleira: o sistema se adapta a você, não o contrário.',
  },
  {
    question: 'Quantos módulos posso escolher em cada plano?',
    answer:
      'No plano Grátis você escolhe até 2 módulos. No Starter, até 8. No Growth, até 10. No Pro, até 12. Alguns módulos avançados — como emissão fiscal, estoque, ponto eletrônico e automação — só ficam disponíveis a partir do plano Growth. Integrações/API e Produção (KDS) são exclusivos do Pro.',
  },
  {
    question: 'O que está incluído em pequenas customizações?',
    answer:
      'Pequenas customizações estão incluídas para os módulos contratados no seu plano: ajustes de interface, nomenclatura de campos, adaptações visuais leves e configurações do sistema. O limite é de até 2 horas técnicas de desenvolvimento por mês calendário, sem acúmulo de horas não utilizadas.',
  },
  {
    question: 'E se eu precisar de algo além das 2 horas mensais?',
    answer:
      'Novas regras de negócio, integrações complexas, relatórios avançados não previstos no sistema original ou qualquer demanda que ultrapasse o limite mensal são tratadas como Desenvolvimento Específico, com análise técnica, orçamento separado e aprovação prévia.',
  },
  {
    question: 'Como funciona o suporte técnico?',
    answer:
      'O suporte é realizado por e-mail, WhatsApp e telefone, em dias úteis das 09h às 18h. O prazo de resposta (SLA) é de até 3 horas úteis, conforme a criticidade da solicitação.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer:
      'No momento aceitamos somente cartões de crédito (Visa, Mastercard, Elo, Amex). Para assinatura da Puncto, você pode pagar mensalmente ou anualmente (com desconto). Para receber pagamentos dos seus clientes, oferecemos PIX instantâneo e todas as bandeiras de cartão via Stripe.',
  },
  {
    question: 'O sistema emite nota fiscal?',
    answer:
      'Sim! Nos planos Growth e Pro, você pode emitir NFS-e (serviços) e NFC-e (produtos) com uma cota por mês correspondente ao seu plano. Temos integração com os principais sistemas de emissão de nota fiscal do Brasil.',
  },
  {
    question: 'Posso usar o Puncto em mais de uma unidade?',
    answer:
      'Sim! O Puncto foi desenvolvido para multi-unidades e franquias. A partir do plano Pro, você pode gerenciar todas as suas unidades em um único lugar, com visão consolidada ou individual, e controle de acesso por localidade.',
  },
  {
    question: 'Como funcionam as integrações com WhatsApp?',
    answer:
      'Usamos a API oficial do WhatsApp Business Platform para enviar lembretes de agendamento, confirmações e campanhas de marketing. É necessário ter uma conta no WhatsApp Business verificada. Ajudamos na configuração inicial.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'Absolutamente! Utilizamos criptografia de ponta (TLS 1.3), armazenamento em nuvem com redundância (Firebase/Google Cloud), e somos totalmente compatíveis com a LGPD. Realizamos backups automáticos diários e temos certificação de segurança.',
  },
  {
    question: 'Posso migrar dados de outro sistema?',
    answer:
      'Sim! Nossa equipe de suporte pode ajudar a migrar seus dados de clientes, serviços e histórico de outros sistemas. Para o planos Pro, oferecemos migração assistida sem custo adicional.',
  },
  {
    question: 'Existe contrato de fidelidade?',
    answer:
      'Não! Nossos planos são mensais e você pode cancelar a qualquer momento sem multa. Acreditamos que a qualidade do nosso produto deve ser o motivo para você ficar, não um contrato.',
  },
  {
    question: 'O Puncto funciona offline?',
    answer:
      'Sim! O Puncto é um PWA (Progressive Web App) que continua funcionando mesmo sem internet. Você pode visualizar a agenda, fazer marcações e registrar vendas. Quando a conexão voltar, tudo é sincronizado automaticamente.',
  },
];

export type FAQItem = (typeof faqItems)[0];
