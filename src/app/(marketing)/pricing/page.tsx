'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import PricingCard, { pricingPlans } from '@/components/marketing/PricingCard';
import FAQAccordion from '@/components/marketing/FAQAccordion';
import CTASection from '@/components/marketing/CTASection';
import {
  businessTypeOptions,
  type BusinessTypeKey,
} from '@/content/pricingByBusinessType';
import {
  erpModules,
  getMinPlanLabel,
  isModuleAvailableForPlan,
  PLAN_LABELS,
  PLAN_MODULE_LIMITS,
  type PlanId,
} from '@/content/modules';
import ServiceTermsSection from '@/components/marketing/ServiceTermsSection';

const businessTypeToIndustrySlug: Record<BusinessTypeKey, string> = {
  servicos: 'servicos',
  comercio: 'varejo',
  empresas: 'empresas',
  saude: 'saude',
  corporativo: 'corporativo',
  educacao: 'educacao',
};

const pricingFAQ = [
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
      'Novas regras de negócio, integrações complexas com APIs de terceiros, relatórios avançados não previstos no sistema original ou qualquer demanda que ultrapasse o limite mensal são tratadas como Desenvolvimento Específico. Fazemos análise técnica, orçamento separado e só iniciamos após sua aprovação prévia.',
  },
  {
    question: 'Como funciona o suporte técnico?',
    answer:
      'O suporte é realizado por e-mail, WhatsApp e telefone, em dias úteis das 09h às 18h. O prazo de resposta (SLA) é de até 3 horas úteis, conforme a criticidade da solicitação.',
  },
  {
    question: 'Atualizações e correções têm custo extra?',
    answer:
      'Não. Atualizações de versão, correção de bugs e melhorias de segurança estão incluídas na assinatura, sem custo adicional.',
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
    question: 'Tenho direito a suporte no plano Grátis?',
    answer:
      'Claro! Mesmo no plano Grátis você tem acesso ao nosso suporte em horário comercial. Nossa equipe está disponível para ajudar na configuração inicial e tirar todas as dúvidas.',
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeKey>('servicos');

  const industrySlug = businessTypeToIndustrySlug[selectedBusinessType];
  const planIds: PlanId[] = ['gratis', 'starter', 'growth', 'pro'];

  const plansWithFeaturesForType = pricingPlans.map((plan) => {
    const billingParam = isAnnual ? 'annual' : 'monthly';
    return {
      ...plan,
      cta: {
        ...plan.cta,
        href: `/pricing/choose-modules?plan=${plan.id}&industry=${industrySlug}&billing=${billingParam}`,
      },
    };
  });

  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="badge-primary mb-4">Investimento</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Pacotes modulares de referência
            </h1>
            <p className="body-lg mb-6">
              Escolha o plano, selecione os módulos que fazem sentido para sua operação
              e receba uma implementação customizada.
            </p>

            {/* Business type selector */}
            <p className="text-sm text-slate-600 mb-2">Recursos mostrados para:</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {businessTypeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedBusinessType(option.id)}
                  className={`px-4 py-2 rounded-full font-medium transition-all text-sm ${
                    selectedBusinessType === option.id
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 bg-white rounded-full p-1.5 shadow-soft border border-slate-200">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  !isAnnual
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
                  isAnnual
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anual
                <span className="text-xs bg-secondary-500 text-white px-2 py-0.5 rounded-full">
                  Economize 20%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section-sm bg-white -mt-8">
        <div className="container-marketing">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 max-w-6xl mx-auto">
            {plansWithFeaturesForType.map((plan, index) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnual}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Module Comparison Table */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Módulos disponíveis por plano
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Cada plano define quantos módulos você pode escolher e quais ficam
              disponíveis para seleção.
            </p>
          </motion.div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-5 min-w-[720px] bg-slate-50 border-b border-slate-200">
              <div className="p-4 font-semibold text-slate-900">Módulo</div>
              {planIds.map((planId) => (
                <div key={planId} className="p-4 text-center font-semibold text-slate-900">
                  {PLAN_LABELS[planId]}
                  <div className="text-xs font-normal text-slate-500 mt-1">
                    até {PLAN_MODULE_LIMITS[planId]} módulos
                  </div>
                </div>
              ))}
            </div>

            {erpModules.map((module) => (
              <div
                key={module.id}
                className="grid grid-cols-5 min-w-[720px] border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="p-4">
                  <div className="text-sm font-medium text-slate-900">{module.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{getMinPlanLabel(module.minPlan)}</div>
                </div>
                {planIds.map((planId) => {
                  const available = isModuleAvailableForPlan(module, planId);
                  return (
                    <div key={planId} className="p-4 flex justify-center items-center">
                      {available ? (
                        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service terms */}
      <section className="section bg-white border-t border-slate-100">
        <div className="container-marketing">
          <ServiceTermsSection />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Dúvidas sobre preços
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Respostas para as perguntas mais comuns sobre nossos planos.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <FAQAccordion items={pricingFAQ} />
          </div>
        </div>
      </section>

      {/* Custom Project CTA */}
      <section className="section-sm bg-slate-900 text-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-lg text-white mb-4">
                Cada projeto é único
              </h2>
              <p className="text-slate-300 text-lg mb-6">
                Os pacotes acima são referências. Na prática, cada implementação 
                é customizada para os processos, integrações e regras de negócio 
                do seu cliente. É assim que garantimos que o sistema se adapta 
                à operação — e não o contrário.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Módulos escolhidos conforme a necessidade',
                  'Fluxos e telas adaptados ao seu processo',
                  'Integração com sistemas que você já usa',
                  'Evolução contínua conforme o negócio cresce',
                  'Suporte dedicado em horário comercial',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="https://wa.me/5541991626161" target="_blank" className="btn bg-white text-slate-900 hover:bg-slate-100">
                Agendar Diagnóstico Gratuito
              </Link>
            </div>
            <div className="bg-slate-800 rounded-2xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sob Medida</h3>
                <p className="text-slate-400 mb-6">
                  ERP modular customizado para a sua operação
                </p>
                <div className="text-4xl font-bold text-white mb-2">Proposta Personalizada</div>
                <p className="text-slate-400 text-sm">
                  Orçamento baseado nos módulos e customizações do seu projeto
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Pronto para montar seu ERP?"
        description="Agende um diagnóstico gratuito e receba uma proposta customizada para a sua operação."
        primaryCTA={{ text: 'Agendar Diagnóstico', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
