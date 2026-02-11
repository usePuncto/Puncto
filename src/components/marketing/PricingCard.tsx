'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annually: number;
  };
  customPrice?: string;
  popular?: boolean;
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
    description: 'Para começar. Recursos essenciais de agendamento.',
    price: { monthly: 0, annually: 0 },
    customPrice: 'Grátis',
    features: [
      'Agendamentos limitados',
      'Sincronização de calendário',
      'Histórico de clientes',
      'Suporte por email',
    ],
    cta: {
      text: 'Começar Grátis',
      href: '/auth/signup',
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfeito para crescer. Agendamento completo e confirmações.',
    price: { monthly: 69.9, annually: 55.92 },
    features: [
      'Agendamentos ilimitados',
      'Lembretes WhatsApp/Email',
      'Sincronização de calendário',
      'Histórico de clientes',
      'Suporte por email',
    ],
    cta: {
      text: 'Começar Grátis',
      href: '/auth/signup',
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Pagamentos, cardápio e comanda. Inclui cota de WhatsApp e notas fiscais.',
    price: { monthly: 189.9, annually: 151.92 },
    popular: true,
    features: [
      'Tudo do Starter',
      'Pagamentos PIX e cartão',
      'Cardápio digital e comanda virtual',
      '150 msgs WhatsApp + 30 NFS-e/NFC-e/mês',
      'Suporte prioritário',
    ],
    cta: {
      text: 'Começar Grátis',
      href: '/auth/signup',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Solução completa: estoque, ponto eletrônico e cotas maiores.',
    price: { monthly: 399.9, annually: 319.92 },
    features: [
      'Tudo do Growth',
      'Ponto eletrônico e controle de estoque',
      '300 msgs WhatsApp + 100 NFS-e/NFC-e/mês',
      'Programa de fidelidade e campanhas',
      'API, webhooks e relatórios avançados',
    ],
    cta: {
      text: 'Começar Grátis',
      href: '/auth/signup',
    },
  },
];