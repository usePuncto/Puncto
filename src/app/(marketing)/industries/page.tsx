'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { industries, industryIcons } from '@/content/industries';
import CTASection from '@/components/marketing/CTASection';

export default function IndustriesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-secondary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="badge-secondary mb-4">Setores</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Soluções específicas para cada tipo de negócio
            </h1>
            <p className="body-lg">
              Plataforma SaaS para pequenos negócios ou desenvolvimento customizado 
              para grandes empresas. Soluções adaptadas às necessidades reais de cada setor.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid md:grid-cols-2 gap-8">
            {industries.map((industry, index) => (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/industries/${industry.slug}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-soft-lg hover:border-primary-200 transition-all group"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500 transition-colors">
                      <svg
                        className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors"
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
                    <div className="flex-1">
                      <h2 className="heading-sm text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {industry.name}
                      </h2>
                      <p className="body-md mb-4">{industry.description}</p>

                      <div className="flex gap-4 mb-4">
                        <div className="bg-primary-50 rounded-lg px-3 py-2 text-center">
                          <div className="text-xl font-bold text-primary-600">
                            {industry.stats.reduction}
                          </div>
                          <div className="text-xs text-slate-600">
                            {industry.stats.reductionLabel}
                          </div>
                        </div>
                        <div className="bg-secondary-50 rounded-lg px-3 py-2 text-center">
                          <div className="text-xl font-bold text-secondary-600">
                            {industry.stats.increase}
                          </div>
                          <div className="text-xs text-slate-600">
                            {industry.stats.increaseLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {industry.useCases.slice(0, 3).map((useCase, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
                          >
                            {useCase}
                          </span>
                        ))}
                        {industry.useCases.length > 3 && (
                          <span className="px-2 py-1 text-primary-600 text-xs font-medium">
                            +{industry.useCases.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-primary-600 font-medium group-hover:text-primary-700">
                      Saiba mais
                    </span>
                    <svg
                      className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform"
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
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Not Found Your Industry */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Não encontrou seu setor?
            </h2>
            <p className="body-lg mb-8">
              Seja através da nossa plataforma SaaS ou desenvolvimento customizado, 
              o Puncto pode ser adaptado para diversos tipos de negócios. Entre em 
              contato e descubra como podemos ajudar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="btn-primary">
                Falar com Especialista
              </Link>
              <Link href="/demo" className="btn-secondary">
                Agendar Demonstração
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        primaryCTA={{ text: 'Começar Grátis', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
