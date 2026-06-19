'use client';

import { motion } from 'framer-motion';

import { getServiceTermsForPlan } from '@/content/serviceTerms';
import { PLAN_LABELS, type PlanId } from '@/content/modules';

interface ServiceTermsSectionProps {
  planId?: PlanId;
  variant?: 'default' | 'compact';
  className?: string;
  id?: string;
}

export default function ServiceTermsSection({
  planId,
  variant = 'default',
  className = '',
  id = 'termos-servico',
}: ServiceTermsSectionProps) {
  const items = getServiceTermsForPlan(planId);
  const isCompact = variant === 'compact';

  return (
    <section id={id} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={isCompact ? 'mb-6' : 'text-center mb-10 md:mb-12'}
      >
        {!isCompact && <span className="badge-primary mb-4">Transparência</span>}
        <h2 className={isCompact ? 'heading-sm text-slate-900 mb-2' : 'heading-lg text-slate-900 mb-4'}>
          {planId
            ? `O que está incluído no plano ${PLAN_LABELS[planId]}`
            : 'Disponibilidade, suporte, customizações e atualizações'}
        </h2>
        <p className={isCompact ? 'text-slate-600 text-sm' : 'body-lg max-w-2xl mx-auto'}>
          {planId
            ? 'Regras claras sobre o que está coberto na sua assinatura e o que é tratado como desenvolvimento específico.'
            : 'Entenda exatamente o que está incluído na sua assinatura e como funcionam as customizações do seu ERP.'}
        </p>
      </motion.div>

      <div
        className={
          isCompact
            ? 'grid gap-4'
            : 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
        }
      >
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-2xl border border-slate-200 ${
              isCompact ? 'p-5' : 'p-6 shadow-soft'
            } ${item.id === 'new-features' && !isCompact ? 'md:col-span-2 lg:col-span-1' : ''}`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 leading-snug pt-1.5">{item.title}</h3>
            </div>
            <ul className="space-y-2">
              {item.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                  <svg
                    className="w-4 h-4 text-secondary-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
