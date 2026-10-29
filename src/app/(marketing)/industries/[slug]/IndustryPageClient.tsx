'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { Industry, industryIcons } from '@/content/industries';
import { getModulesForIndustry } from '@/content/businessModules';
import CTASection from '@/components/marketing/CTASection';

interface IndustryPageClientProps {
  industry: Industry;
}

export default function IndustryPageClient({ industry }: IndustryPageClientProps) {
  const segmentModules = getModulesForIndustry(industry.slug);

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
                <Link href="/demo" className="btn-primary btn-lg">
                  Agendar diagnóstico gratuito
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
                <a href="#solucoes" className="btn-secondary btn-lg">
                  Ver o que dá para organizar
                </a>
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
      <section id="solucoes" className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              O que dá para organizar
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Áreas pensadas para as necessidades de{' '}
              {industry.name.toLowerCase()}. No diagnóstico, mostramos o que faz
              sentido para a sua rotina.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {segmentModules.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                >
                  <h5 className="font-semibold text-slate-800 text-base mb-2">
                    {mod.name}
                  </h5>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {mod.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/demo" className="btn-primary">
                Agendar diagnóstico gratuito
              </Link>
              <p className="text-sm text-slate-500 mt-3">
                Valores são apresentados após a demonstração personalizada.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section bg-slate-50">
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

      <CTASection
        title={`Pronto para ver a Puncto no seu ${industry.shortName.toLowerCase()}?`}
        description="Agende um diagnóstico gratuito e veja uma demonstração próxima da sua realidade."
        primaryCTA={{ text: 'Agendar diagnóstico gratuito', href: '/demo' }}
        secondaryCTA={{ text: 'Falar conosco', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
