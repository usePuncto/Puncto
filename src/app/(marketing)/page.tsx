'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import Hero from '@/components/marketing/Hero';
import FeatureCard from '@/components/marketing/FeatureCard';
import FAQAccordion from '@/components/marketing/FAQAccordion';
import CTASection from '@/components/marketing/CTASection';
import PricingCard, { pricingPlans } from '@/components/marketing/PricingCard';

import { features } from '@/content/features';
import { faqItems } from '@/content/faq';
import { industries, industryIcons } from '@/content/industries';
import { featureDetailsByIndustry } from '@/content/featureDetailsByIndustry';
import {
  businessTypeOptions,
  planFeaturesByBusinessType,
  type BusinessTypeKey,
} from '@/content/pricingByBusinessType';

const businessTypeToIndustrySlug: Record<BusinessTypeKey, string> = {
  servicos: 'servicos',
  comercio: 'varejo',
  empresas: 'empresas',
  saude: 'saude',
  corporativo: 'corporativo',
};

export default function HomePage() {
  // Redirect to platform admin login when ?subdomain=primazia (fallback when middleware doesn't run on localhost)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('subdomain') === 'admin' || params.get('subdomain') === 'primazia') {
      window.location.replace('/auth/platform/login?subdomain=primazia&returnUrl=/platform/dashboard');
    }
  }, []);

  const [selectedIndustry, setSelectedIndustry] = useState(industries[0].id);
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeKey>('servicos');

  const activeIndustry = industries.find((i) => i.id === selectedIndustry) || industries[0];

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
      <Hero />

      {/* Features Section */}
      <section id="solucoes" className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <span className="badge-primary mb-4">Funcionalidades</span>
            <h2 className="heading-lg text-slate-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Plataforma SaaS completa para pequenos negócios ou desenvolvimento 
              customizado para grandes empresas. Soluções que se adaptam ao seu negócio.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.slice(0, 8).map((feature, index) => (
              <FeatureCard key={feature.id} feature={feature} index={index} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/features" className="btn-secondary">
              Ver todas as funcionalidades
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
            </Link>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-secondary mb-4">Setores</span>
            <h2 className="heading-lg text-slate-900 mb-4">
              Feito para o seu tipo de negócio
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Funcionalidades específicas para cada setor, desenvolvidas com base
              nas necessidades reais do mercado brasileiro.
            </p>
          </motion.div>

          {/* Industry tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedIndustry === industry.id
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {industry.shortName}
              </button>
            ))}
          </div>

          {/* Active industry content */}
          <motion.div
            key={activeIndustry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-2 gap-8 items-center"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={industryIcons[activeIndustry.icon]}
                    />
                  </svg>
                </div>
                <h3 className="heading-md text-slate-900">{activeIndustry.name}</h3>
              </div>
              <p className="body-lg mb-6">{activeIndustry.longDescription}</p>

              <ul className="space-y-3 mb-8">
                {activeIndustry.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5"
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
                    <span className="text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-4">
                <Link href={`/industries/${activeIndustry.slug}`} className="btn-primary">
                  Saiba mais
                </Link>
                <Link href="/demo" className="btn-secondary">
                  Ver demo
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-soft-lg border border-slate-100">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-primary-50 rounded-xl">
                  <div className="text-3xl font-bold text-primary-600 mb-1">
                    {activeIndustry.stats.reduction}
                  </div>
                  <div className="text-sm text-slate-600">
                    {activeIndustry.stats.reductionLabel}
                  </div>
                </div>
                <div className="text-center p-4 bg-secondary-50 rounded-xl">
                  <div className="text-3xl font-bold text-secondary-600 mb-1">
                    {activeIndustry.stats.increase}
                  </div>
                  <div className="text-sm text-slate-600">
                    {activeIndustry.stats.increaseLabel}
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-3">Ideal para:</p>
                <div className="flex flex-wrap gap-2">
                  {activeIndustry.useCases.map((useCase, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Custom Development Section */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-primary mb-4">Desenvolvimento Customizado</span>
            <h2 className="heading-lg text-slate-900 mb-4">
              Soluções sob medida para grandes empresas
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Para indústrias, fábricas e grandes corporações, desenvolvemos sistemas 
              personalizados que se integram aos seus processos existentes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-8 border border-primary-100"
            >
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="heading-sm text-slate-900 mb-4">
                Plataforma SaaS
              </h3>
              <p className="text-slate-600 mb-6">
                Ideal para salões, restaurantes, clínicas e pequenos negócios. 
                Comece grátis ou com planos a partir de R$ 69,90/mês.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Ativação imediata</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sem necessidade de desenvolvimento</span>
                </li>
                <li className="flex items-start gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Atualizações automáticas</span>
                </li>
              </ul>
              <Link href="/pricing" className="btn-primary w-full text-center">
                Ver Planos SaaS
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white"
            >
              <div className="w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 className="heading-sm text-white mb-4">
                Desenvolvimento Customizado
              </h3>
              <p className="text-slate-300 mb-6">
                Para indústrias, fábricas e grandes empresas. Sistemas sob medida 
                que resolvem desafios específicos do seu negócio.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-secondary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Desenvolvimento sob medida</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-secondary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Integração com sistemas legados</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-secondary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Suporte e evolução contínua</span>
                </li>
              </ul>
              <Link href="https://wa.me/5541991626161" target="_blank" className="btn bg-white text-slate-900 hover:bg-slate-100 w-full text-center">
                Solicitar Orçamento
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-primary mb-4">Planos</span>
            <h2 className="heading-lg text-slate-900 mb-4">
              Escolha o plano ideal para você
            </h2>
            <p className="body-lg max-w-2xl mx-auto mb-6">
              Selecione seu tipo de negócio para ver os recursos de cada plano.
            </p>

            {/* Business type selector */}
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
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plansWithFeaturesForType.map((plan, index) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isAnnual={isAnnual}
                index={index}
              />
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing" className="link">
              Comparar todos os recursos dos planos
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="badge-primary mb-4">FAQ</span>
              <h2 className="heading-lg text-slate-900 mb-4">
                Perguntas frequentes
              </h2>
              <p className="body-lg mb-8">
                Não encontrou sua resposta? Entre em contato com nossa equipe.
              </p>
              <Link href="/contact" className="btn-secondary">
                Falar com suporte
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <FAQAccordion items={faqItems.slice(0, 6)} />
              <div className="mt-4 text-center">
                <Link href="/pricing#faq" className="link text-sm">
                  Ver todas as perguntas
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <CTASection
        title="Pronto para transformar seu negócio?"
        description="Comece gratuitamente e descubra como o Puncto pode simplificar a gestão do seu negócio."
        primaryCTA={{ text: 'Começar Grátis', href: '/contact' }}
        secondaryCTA={{ text: 'Agendar Demonstração', href: '/demo' }}
        variant="gradient"
      />
    </>
  );
}
