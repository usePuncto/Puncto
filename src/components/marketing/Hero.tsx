'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute top-20 -left-20 w-60 h-60 bg-secondary-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-200 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="container-marketing relative">
        <div className="py-16 md:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                Plataforma SaaS + Desenvolvimento Customizado
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="heading-xl text-slate-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Transforme processos manuais em{' '}
              <span className="text-gradient">inteligência e lucro</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="body-lg max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Seja com nossa plataforma de gestão pronta ou com desenvolvimento exclusivo para grandes indústrias, 
              entregamos a solução exata que a sua operação exige
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Link WhatsApp Business */}
              <Link href="https://wa.me/5541991626161" target="_blank" className="btn-primary btn-lg w-full sm:w-auto">
                Agendar Diagnóstico Gratuito
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
              <Link href="#solucoes" className="btn-secondary btn-lg w-full sm:w-auto">
                Ver Soluções
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Atendimento Humanizado
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Projetos Exclusivos
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Foco em Resultado
              </div>
            </motion.div>
          </div>

          {/* Hero Image/Mockup */}
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <div className="relative max-w-5xl mx-auto">
              <div className="bg-slate-900 rounded-t-2xl p-3 flex items-center gap-2">
                 <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                {/* Endereço fake */}
                <div className="flex-1 flex justify-center">
                  <div className="bg-slate-800 rounded-lg px-4 py-1.5 text-slate-400 text-sm">
                    Painel Administrativo Puncto
                  </div>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-b-2xl aspect-[16/9] flex items-center justify-center shadow-2xl border border-slate-200 overflow-hidden">
                <Image
                  src="/dashboardImage.png"
                  alt="Painel Administrativo Puncto - Gestão completa do seu negócio em um só lugar"
                  fill
                  className="object-cover object-top"
                />
              </div>
              
              {/* Card flutuante 1 */}
              <div className="absolute -left-8 top-1/4 bg-white rounded-xl shadow-soft-lg p-4 hidden lg:block animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Relatório Gerado</p>
                    <p className="text-xs text-slate-500">Automação concluída</p>
                  </div>
                </div>
              </div>

              {/* Card flutuante 2 */}
              <div className="absolute -right-8 bottom-1/4 bg-white rounded-xl shadow-soft-lg p-4 hidden lg:block animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Venda Registrada</p>
                    <p className="text-xs text-slate-500">+R$ 2.450,00</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}