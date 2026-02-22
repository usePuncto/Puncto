'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryCTA?: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  variant?: 'default' | 'gradient' | 'dark';
}

export default function CTASection({
  title = 'Pronto para transformar seu negócio?',
  description = 'Comece gratuitamente e veja como o Puncto pode simplificar sua gestão.',
  primaryCTA = { text: 'Começar Grátis', href: '/auth/signup' },
  secondaryCTA = { text: 'Falar com Vendas', href: '/contact' },
  variant = 'gradient',
}: CTASectionProps) {
  const bgClasses = {
    default: 'bg-white',
    gradient: 'bg-gradient-to-r from-primary-600 to-primary-700',
    dark: 'bg-slate-900',
  };

  const textClasses = {
    default: 'text-slate-900',
    gradient: 'text-white',
    dark: 'text-white',
  };

  const descClasses = {
    default: 'text-slate-600',
    gradient: '!text-white',
    dark: '!text-white',
  };

  return (
    <section className={`section ${bgClasses[variant]} relative overflow-hidden`}>
      {/* Background decoration for gradient variant */}
      {variant === 'gradient' && (
        <>
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl" />
        </>
      )}

      <div className="container-marketing relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className={`heading-lg mb-4 ${textClasses[variant]}`}>{title}</h2>
          <p className={`body-lg mb-8 ${descClasses[variant]}`}>{description}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryCTA.href}
              className={`btn btn-lg w-full sm:w-auto ${
                variant === 'gradient' || variant === 'dark'
                  ? 'bg-white text-primary-600 hover:bg-slate-100 shadow-lg'
                  : 'btn-primary'
              }`}
            >
              {primaryCTA.text}
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
            <Link
              href={secondaryCTA.href}
              className={`btn btn-lg w-full sm:w-auto ${
                variant === 'gradient' || variant === 'dark'
                  ? 'bg-transparent text-white border-2 border-white/30 hover:bg-white/10'
                  : 'btn-secondary'
              }`}
            >
              {secondaryCTA.text}
            </Link>
          </div>

          {/* Trust badges */}
          <div className={`flex flex-wrap items-center justify-center gap-6 mt-8 text-sm ${descClasses[variant]}`}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Seguro e compatível com LGPD
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Suporte em horário comercial
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
