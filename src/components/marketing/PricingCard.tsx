'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  type PlanId,
  getPlanCardHighlights,
  PLAN_MODULE_LIMITS,
} from '@/content/modules';

export interface PricingPlan {
  id: PlanId;
  name: string;
  description: string;
  price: {
    monthly: number;
    annually: number;
  };
  customPrice?: string;
  popular?: boolean;
  moduleLimit: number;
  features: string[];
  limitations?: string[];
  cta: {
    text: string;
    href: string;
  };
}

interface PricingCardProps {
  plan: PricingPlan;
  isAnnual: boolean;
  index?: number;
}

function formatPrice(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export default function PricingCard({ plan, isAnnual, index = 0 }: PricingCardProps) {
  const rawPrice = isAnnual ? plan.price.annually : plan.price.monthly;
  const priceDisplay = plan.customPrice 
    ? plan.customPrice 
    : formatPrice(rawPrice);

  const showCurrency = !plan.customPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative rounded-2xl p-6 md:p-8 flex flex-col h-full ${
        plan.popular
          ? 'bg-primary-600 text-white ring-4 ring-primary-600 ring-offset-4'
          : 'bg-white border border-slate-200'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-accent-500 text-white text-sm font-semibold px-4 py-1 rounded-full shadow-lg">
            Recomendado
          </span>
        </div>
      )}

      <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
        {plan.name}
      </h3>

      <p className={`text-sm mb-6 ${plan.popular ? 'text-primary-100' : 'text-slate-500'}`}>
        {plan.description}
      </p>

      <div className="mb-4">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
            plan.popular ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          Até {plan.moduleLimit} módulos
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          {showCurrency && (
            <span className={`text-sm ${plan.popular ? 'text-primary-200' : 'text-slate-500'}`}>
              R$
            </span>
          )}
          <span className={`text-3xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
            {priceDisplay}
          </span>
          {showCurrency && (
            <span className={`text-sm ${plan.popular ? 'text-primary-200' : 'text-slate-500'}`}>
              /mês
            </span>
          )}
        </div>
      </div>

      {/* Botão */}
      <Link
        href={plan.cta.href}
        className={`btn w-full mb-6 text-center ${
          plan.popular
            ? 'bg-white text-primary-600 hover:bg-slate-100'
            : 'btn-primary'
        }`}
      >
        {plan.cta.text}
      </Link>

      <ul className="space-y-3 mt-auto">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                plan.popular ? 'text-secondary-300' : 'text-secondary-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-sm ${plan.popular ? 'text-primary-100' : 'text-slate-600'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'gratis',
    name: 'Grátis',
    description: 'Para começar montando seu ERP com os módulos essenciais.',
    price: { monthly: 0, annually: 0 },
    customPrice: 'Grátis',
    moduleLimit: PLAN_MODULE_LIMITS.gratis,
    features: getPlanCardHighlights('gratis'),
    cta: {
      text: 'Escolher Módulos',
      href: '/pricing/choose-modules?plan=gratis',
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Para operações em crescimento com mais módulos disponíveis.',
    price: { monthly: 69.9, annually: 55.92 },
    moduleLimit: PLAN_MODULE_LIMITS.starter,
    features: getPlanCardHighlights('starter'),
    cta: {
      text: 'Escolher Módulos',
      href: '/pricing/choose-modules?plan=starter',
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Módulos avançados: fiscal, estoque, ponto e automação.',
    price: { monthly: 189.9, annually: 151.92 },
    popular: true,
    moduleLimit: PLAN_MODULE_LIMITS.growth,
    features: getPlanCardHighlights('growth'),
    cta: {
      text: 'Escolher Módulos',
      href: '/pricing/choose-modules?plan=growth',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Máximo de módulos, incluindo integrações e produção (KDS).',
    price: { monthly: 399.9, annually: 319.92 },
    moduleLimit: PLAN_MODULE_LIMITS.pro,
    features: getPlanCardHighlights('pro'),
    cta: {
      text: 'Escolher Módulos',
      href: '/pricing/choose-modules?plan=pro',
    },
  },
];