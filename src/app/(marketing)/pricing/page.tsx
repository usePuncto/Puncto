'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import PricingCard, { pricingPlans } from '@/components/marketing/PricingCard';
import FAQAccordion from '@/components/marketing/FAQAccordion';
import CTASection from '@/components/marketing/CTASection';
import {
  businessTypeOptions,
  planFeaturesByBusinessType,
  type BusinessTypeKey,
} from '@/content/pricingByBusinessType';
import { featureDetailsByIndustry } from '@/content/featureDetailsByIndustry';

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
    question: 'Tenho direito a suporte no plano Grátis?',
    answer:
      'Claro! Mesmo no plano Grátis você tem acesso ao nosso suporte em horário comercial. Nossa equipe está disponível para ajudar na configuração inicial e tirar todas as dúvidas.',
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeKey>('servicos');

  const featureComparisonForType = useMemo(() => {
    const planOrder = ['gratis', 'starter', 'growth', 'pro'] as const;
    type PlanId = (typeof planOrder)[number];

    const rawByPlan = planFeaturesByBusinessType[selectedBusinessType] as Record<PlanId, string[]>;

    // Expandimos "Tudo do ..." para montar o conjunto real de recursos efetivamente incluídos por plano.
    const includedByPlan: Record<PlanId, Set<string>> = {
      gratis: new Set(),
      starter: new Set(),
      growth: new Set(),
      pro: new Set(),
    };

    const orderedFeatures: string[] = [];
    const includedSoFar = new Set<string>();
    const isSummary = (value: string) => value.startsWith('Tudo do ');

    for (const planId of planOrder) {
      const extras = (rawByPlan[planId] ?? []).filter((value) => !isSummary(value));

      for (const featureName of extras) {
        if (!includedSoFar.has(featureName)) {
          includedSoFar.add(featureName);
          orderedFeatures.push(featureName);
        }
      }

      // snapshot acumulado até este plano
      includedByPlan[planId] = new Set(includedSoFar);
    }

    return [
      {
        category: 'Recursos incluídos',
        features: orderedFeatures.map((name) => ({
          name,
          gratis: includedByPlan.gratis.has(name),
          starter: includedByPlan.starter.has(name),
          growth: includedByPlan.growth.has(name),
          pro: includedByPlan.pro.has(name),
        })),
      },
    ];
  }, [selectedBusinessType]);

  const industrySlug = businessTypeToIndustrySlug[selectedBusinessType];
  const detailsForBusinessType = featureDetailsByIndustry[industrySlug];

  const plansWithFeaturesForType = pricingPlans.map((plan) => {
    const planDetails = detailsForBusinessType?.[plan.id];
    return {
      ...plan,
      description: planDetails?.intro ?? plan.description,
      features:
        plan.id in planFeaturesByBusinessType[selectedBusinessType]
          ? planFeaturesByBusinessType[selectedBusinessType][plan.id as 'gratis' | 'starter' | 'growth' | 'pro']
          : plan.features,
      cta: {
        ...plan.cta,
        href: `/industries/${industrySlug}`,
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
            <span className="badge-primary mb-4">Preços transparentes</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Planos para cada fase do seu negócio
            </h1>
            <p className="body-lg mb-6">
              Comece no plano Grátis ou escolha Starter, Growth ou Pro. Nos planos pagos,
              cotas de WhatsApp e notas fiscais estão incluídas; uso acima da cota é
              faturado automaticamente (Pay-As-You-Go).
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

      {/* Feature Comparison Table */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Compare todos os recursos
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Veja exatamente o que está incluído em cada plano.
            </p>
          </motion.div>

          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 bg-slate-50 border-b border-slate-200">
              <div className="p-4 font-semibold text-slate-900">Recurso</div>
              <div className="p-4 text-center font-semibold text-slate-900">Grátis</div>
              <div className="p-4 text-center font-semibold text-slate-900">Starter</div>
              <div className="p-4 text-center font-semibold text-slate-900">Growth</div>
              <div className="p-4 text-center font-semibold text-slate-900">Pro</div>
            </div>

            {/* Feature rows */}
            {featureComparisonForType.map((category, catIndex) => (
              <div key={catIndex}>
                {/* Category header */}
                <div className="grid grid-cols-5 bg-slate-100 border-b border-slate-200">
                  <div className="col-span-5 p-3 font-semibold text-primary-600">
                    {category.category}
                  </div>
                </div>
                {/* Features */}
                {category.features.map((feature, featIndex) => (
                  <div
                    key={featIndex}
                    className="grid grid-cols-5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-4 text-slate-700 text-sm">{feature.name}</div>
                    <div className="p-4 flex justify-center">
                      {feature.gratis ? (
                        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="p-4 flex justify-center">
                      {feature.starter ? (
                        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="p-4 flex justify-center">
                      {feature.growth ? (
                        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="p-4 flex justify-center">
                      {feature.pro ? (
                        <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
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

      {/* Enterprise CTA */}
      <section className="section-sm bg-slate-900 text-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-lg text-white mb-4">
                Desenvolvimento Customizado
              </h2>
              <p className="text-slate-300 text-lg mb-6">
                Para indústrias, fábricas e grandes empresas, desenvolvemos sistemas 
                sob medida que se integram aos seus processos existentes e resolvem 
                desafios específicos do seu negócio.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Sistemas desenvolvidos sob medida',
                  'Integração com sistemas legados',
                  'Automação de processos industriais',
                  'Dashboards e relatórios personalizados',
                  'Suporte e evolução contínua',
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
                Solicitar Orçamento
              </Link>
            </div>
            <div className="bg-slate-800 rounded-2xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Customizado</h3>
                <p className="text-slate-400 mb-6">
                  Desenvolvimento sob medida para indústrias e grandes empresas
                </p>
                <div className="text-4xl font-bold text-white mb-2">Sob Medida</div>
                <p className="text-slate-400 text-sm">
                  Orçamento baseado no escopo do projeto
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Comece sua transformação hoje"
        description="Comece grátis ou escolha o plano ideal para o seu negócio."
        primaryCTA={{ text: 'Começar Grátis', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
