export const faqItems = [
  {
    question: 'Preciso pagar para começar a usar?',
    answer:
      'Não. Criamos o Plano Grátis justamente para quem está começando ou organizando a casa. Ele inclui tudo o que você precisa para sair do papel e da planilha. Você só migra para os planos Starter ou Growth quando sua operação estiver madura o suficiente para precisar de recursos avançados, como Ponto Eletrônico, WhatsApp Automático e Emissão Fiscal.',
  },
  {
    question: 'Preciso de conhecimento técnico para usar?',
    answer:
      'Não! A Puncto foi desenvolvida para ser intuitiva e fácil de usar. Nossa equipe oferece suporte completo na configuração inicial e temos tutoriais em vídeo, documentação detalhada e suporte por chat para qualquer dúvida.',
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
