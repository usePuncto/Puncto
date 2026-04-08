'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { Industry, industryIcons } from '@/content/industries';
import { features } from '@/content/features';
import { featureDetailsByIndustry, addOnContentByIndustry } from '@/content/featureDetailsByIndustry';
import PricingCard, { pricingPlans } from '@/components/marketing/PricingCard';
import type { PricingPlan } from '@/components/marketing/PricingCard';
import TestimonialCard, { testimonials } from '@/components/marketing/TestimonialCard';
import CTASection from '@/components/marketing/CTASection';

interface IndustryPageClientProps {
  industry: Industry;
}

// Map industries to relevant features
const industryFeatureMap: Record<string, string[]> = {
  services: ['scheduling', 'payments', 'crm', 'analytics'],
  retail: ['restaurant', 'payments', 'inventory', 'timeClock'],
  corporate: ['scheduling', 'payments', 'crm', 'analytics'],
  health: ['scheduling', 'payments', 'crm', 'analytics'],
  corporativo: ['scheduling', 'payments', 'crm', 'analytics'],
  education: ['scheduling', 'payments', 'crm', 'analytics'],
};

const planIds = ['gratis', 'starter', 'growth', 'pro'] as const;

export default function IndustryPageClient({ industry }: IndustryPageClientProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const relevantFeatureIds = industryFeatureMap[industry.id] || [];
  const relevantFeatures = features.filter((f) =>
    relevantFeatureIds.includes(f.id)
  );

  const detailsForIndustry = featureDetailsByIndustry[industry.slug];
  const billingParam = isAnnual ? 'annual' : 'monthly';
  const plansForIndustry: PricingPlan[] = pricingPlans.map((plan) => {
    const details = detailsForIndustry?.[plan.id];
    const checkoutUrl = `/checkout?plan=${plan.id}&industry=${industry.slug}&billing=${billingParam}`;
    return {
      ...plan,
      description: details?.intro ?? plan.description,
      features:
        'planFeatures' in industry && industry.planFeatures
          ? industry.planFeatures[plan.id as keyof typeof industry.planFeatures]
          : plan.features,
      cta: {
        text: plan.id === 'gratis' ? 'Começar Grátis' : 'Começar agora',
        href: checkoutUrl,
      },
    };
  });

  // Get a relevant testimonial (in real app, filter by industry)
  const relevantTestimonial = testimonials[0];

  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-secondary-200 rounded-full opacity-20 blur-3xl" />
        </div>

        <div className="container-marketing relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link
                href="/industries"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Todos os setores
              </Link>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={industryIcons[industry.icon]}
                    />
                  </svg>
                </div>
                <span className="badge-primary">Para {industry.shortName}</span>
              </div>

              <h1 className="heading-xl text-slate-900 mb-6">
                Puncto para {industry.name}
              </h1>

              <p className="body-lg mb-8">{industry.longDescription}</p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a href="#precos" className="btn-primary btn-lg">
                  Começar Grátis
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
                <Link href="/demo" className="btn-secondary btn-lg">
                  Ver Demonstração
                </Link>
              </div>

              <div className="flex gap-8">
                <div>
                  <div className="text-3xl font-bold text-primary-600">
                    {industry.stats.reduction}
                  </div>
                  <div className="text-sm text-slate-600">
                    {industry.stats.reductionLabel}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-secondary-600">
                    {industry.stats.increase}
                  </div>
                  <div className="text-sm text-slate-600">
                    {industry.stats.increaseLabel}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-soft-lg border border-slate-100 p-8"
            >
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl aspect-video flex items-center justify-center mb-6">
                <div className="text-center text-slate-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="font-medium">Vídeo demonstrativo</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 text-center">
                Veja como o Puncto funciona para {industry.name.toLowerCase()}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Benefícios para seu negócio
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Funcionalidades pensadas especificamente para as necessidades de{' '}
              {industry.name.toLowerCase()}.
            </p>
          </motion.div>

          {/* Detailed feature descriptions - BEFORE plan cards */}
          {detailsForIndustry && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h3 className="heading-md text-slate-900 mb-6 text-center">
                Detalhes de cada funcionalidade
              </h3>
              <p className="body-md text-slate-600 text-center max-w-2xl mx-auto mb-8">
                Entenda em profundidade o que cada plano oferece para {industry.name.toLowerCase()}.
              </p>
              <div className="space-y-6">
                {planIds.map((planId) => {
                  const planDetails = detailsForIndustry[planId];
                  if (!planDetails) return null;
                  const planLabels: Record<string, string> = {
                    gratis: 'Grátis',
                    starter: 'Starter',
                    growth: 'Growth',
                    pro: 'Pro',
                  };
                  const planColors: Record<string, string> = {
                    gratis: 'from-slate-50 to-slate-100 border-slate-200',
                    starter: 'from-primary-50 to-primary-100/50 border-primary-200',
                    growth: 'from-secondary-50 to-secondary-100/50 border-secondary-200',
                    pro: 'from-amber-50 to-amber-100/50 border-amber-200',
                  };
                  return (
                    <motion.div
                      key={planId}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className={`rounded-2xl border bg-gradient-to-br ${planColors[planId]} p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <h4 className="font-bold text-slate-900 text-lg mb-2">
                        Plano {planLabels[planId]}
                      </h4>
                      <p className="text-slate-600 text-sm mb-6">
                        {planDetails.intro}
                      </p>
                      <div className="space-y-4">
                        {planDetails.features.map((feat, i) => (
                          <div key={i} className="bg-white/90 rounded-xl p-4 shadow-sm border border-slate-100">
                            <h5 className="font-semibold text-slate-800 text-base mb-2">
                              {feat.title}
                            </h5>
                            <p className="text-slate-600 text-sm leading-relaxed">
                              {feat.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Plan cards - same style as index page */}
          {'planFeatures' in industry && industry.planFeatures && (
            <motion.div
              id="precos"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 scroll-mt-24"
            >
              <h3 className="heading-md text-slate-900 mb-6 text-center">
                O que está incluído em cada plano
              </h3>

              {/* Billing toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-4 bg-white rounded-full p-1 shadow-soft border border-slate-200">
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      !isAnnual
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isAnnual
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Anual
                    <span className="ml-2 text-xs bg-secondary-500 text-white px-2 py-0.5 rounded-full">
                      -20%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plansForIndustry.map((plan, index) => (
                  <PricingCard
                    key={plan.id}
                    plan={plan}
                    isAnnual={isAnnual}
                    index={index}
                  />
                ))}
              </div>

              {addOnContentByIndustry[industry.slug] && (
                <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary-50 via-secondary-50/30 to-primary-50/50 border border-primary-200/80 p-6 md:p-8 shadow-sm">
                  <h4 className="font-bold text-slate-900 text-lg mb-3">
                    {addOnContentByIndustry[industry.slug].title}
                  </h4>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {addOnContentByIndustry[industry.slug].description}
                  </p>
                </div>
              )}

              {/* Transparency info box */}
              <div className="mt-8 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-900 text-lg mb-4">
                  📋 Transparência: Entenda os limites do seu plano
                </h4>
                <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                  Nós crescemos junto com a sua empresa. Nossos planos possuem cotas desenhadas para atender diferentes estágios do seu negócio, garantindo que você só pague por aquilo que realmente precisa.
                </p>
                <div className="space-y-5 mb-5">
                  <div className="bg-white/80 rounded-xl p-4 border border-slate-200/60">
                    <p className="text-slate-800 font-semibold text-sm mb-2">👥 Limite de Colaboradores (Usuários no sistema)</p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      <li><strong>Starter:</strong> Até 10 colaboradores.</li>
                      <li><strong>Growth:</strong> Até 20 colaboradores.</li>
                      <li><strong>Pro:</strong> Até 30 colaboradores.</li>
                    </ul>
                    <p className="text-sm text-slate-500 italic mt-2">
                      (Sua operação é maior? Fale com nosso time de vendas para montarmos um plano personalizado para o seu tamanho!)
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-4 border border-slate-200/60">
                    <p className="text-slate-800 font-semibold text-sm mb-2">🚀 Cotas de Automação (WhatsApp e Notas Fiscais)</p>
                    <p className="text-slate-600 text-sm mb-2">Disponíveis nos planos mais avançados para turbinar sua operação mensalmente:</p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      <li><strong>Growth:</strong> 150 mensagens de WhatsApp automáticas e 30 Notas Fiscais.</li>
                      <li><strong>Pro:</strong> 300 mensagens de WhatsApp automáticas e 100 Notas Fiscais.</li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-slate-800 font-semibold text-sm mb-1">💡 E se eu ultrapassar a minha cota no mês?</p>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Fique tranquilo, o Puncto não vai travar a sua operação! Nós trabalhamos com o modelo Pay As You Go (pague pelo que usar). Se você tiver um mês de pico de vendas e precisar emitir mais notas ou enviar mais mensagens automáticas, o sistema continuará funcionando normalmente. O uso excedente será cobrado de forma avulsa apenas na sua próxima fatura, com valores super acessíveis.
                  </p>
                </div>
              </div>

            </motion.div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industry.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-soft-lg transition-shadow"
              >
                <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-secondary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-slate-700 font-medium">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Relevant Features */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Funcionalidades principais
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              As ferramentas mais utilizadas por {industry.name.toLowerCase()}.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {relevantFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <h3 className="heading-sm text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="body-md mb-4">{feature.description}</p>
                <Link
                  href={`/features#${feature.id}`}
                  className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-1"
                >
                  Saiba mais
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/features" className="btn-secondary">
              Ver todas as funcionalidades
            </Link>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Ideal para
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4">
            {industry.useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-100 rounded-full px-6 py-3 text-slate-700 font-medium"
              >
                {useCase}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial - Commented out until we have real testimonials
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <TestimonialCard testimonial={relevantTestimonial} />
          </motion.div>
        </div>
      </section>
      */}

      {/* CTA */}
      <CTASection
        title={`Pronto para transformar seu ${industry.shortName.toLowerCase()}?`}
        description="Comece gratuitamente e veja os resultados em poucos dias."
        primaryCTA={{ text: 'Começar Grátis', href: '#precos' }}
        variant="gradient"
      />
    </>
  );
}
