'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

import ModulePicker from '@/components/marketing/ModulePicker';
import ServiceTermsSection from '@/components/marketing/ServiceTermsSection';
import { type PlanId, PLAN_LABELS, PLAN_MODULE_LIMITS } from '@/content/modules';

const VALID_PLANS: PlanId[] = ['gratis', 'starter', 'growth', 'pro'];

function ChooseModulesContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'starter';
  const planId = VALID_PLANS.includes(planParam as PlanId) ? (planParam as PlanId) : 'starter';
  const industry = searchParams.get('industry') || undefined;
  const billing = searchParams.get('billing') === 'annual' ? 'annual' : 'monthly';

  return (
    <>
      <section className="section-sm bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar aos planos
            </Link>
            <span className="badge-primary mb-4">Monte seu ERP</span>
            <h1 className="heading-xl text-slate-900 mb-4">
              Escolha os módulos do plano {PLAN_LABELS[planId]}
            </h1>
            <p className="body-lg">
              Antes de selecionar seus módulos, aqui estão as condições de customização, suporte e
              atualizações abaixo. Depois, escolha até {PLAN_MODULE_LIMITS[planId]} módulos para
              a sua operação.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section bg-slate-50 border-b border-slate-100">
        <div className="container-marketing max-w-5xl">
          <ServiceTermsSection planId={planId} />
        </div>
      </section>

      <section className="section bg-white">
        <div className="container-marketing max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="heading-md text-slate-900 mb-2">Selecione seus módulos</h2>
            <p className="text-slate-600 text-sm">
              Módulos marcados como &quot;A partir do Growth&quot; ou &quot;Apenas no Pro&quot;
              exigem um plano superior.
            </p>
          </motion.div>
          <ModulePicker planId={planId} industry={industry} billing={billing} />
        </div>
      </section>
    </>
  );
}

export default function ChooseModulesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ChooseModulesContent />
    </Suspense>
  );
}
