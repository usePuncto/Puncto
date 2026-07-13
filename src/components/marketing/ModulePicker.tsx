'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import {
  type PlanId,
  PLAN_LABELS,
  PLAN_MODULE_LIMITS,
  getModulesForIndustry,
  isModuleAvailableForPlan,
  buildModuleSelectionMessage,
  buildModuleSelectionSubject,
} from '@/content/modules';

interface ModulePickerProps {
  planId: PlanId;
  industry?: string;
  billing?: 'monthly' | 'annual';
}

export default function ModulePicker({ planId, industry, billing }: ModulePickerProps) {
  const industrySlug = industry || 'servicos';
  const [selected, setSelected] = useState<string[]>([]);
  const limit = PLAN_MODULE_LIMITS[planId];
  const modules = getModulesForIndustry(industrySlug);

  const contactHref = useMemo(() => {
    if (selected.length === 0) return null;
    const params = new URLSearchParams({
      plan: planId,
      modules: selected.join(','),
      subject: buildModuleSelectionSubject(planId, selected),
      message: buildModuleSelectionMessage(planId, selected),
    });
    if (industry) params.set('industry', industry);
    if (billing) params.set('billing', billing);
    return `/contact?${params.toString()}`;
  }, [planId, selected, industry, billing]);

  const toggleModule = (moduleId: string) => {
    if (!isModuleAvailableForPlan(industrySlug, moduleId, planId)) return;

    setSelected((current) => {
      if (current.includes(moduleId)) {
        return current.filter((id) => id !== moduleId);
      }
      if (current.length >= limit) return current;
      return [...current, moduleId];
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-slate-500 mb-1">Plano selecionado</p>
          <h2 className="text-2xl font-bold text-slate-900">{PLAN_LABELS[planId]}</h2>
          <p className="text-slate-600 text-sm mt-1">
            {planId === 'gratis' ? (
              <>
                O plano Grátis inclui os <strong>2 primeiros módulos</strong> do catálogo do seu segmento.
              </>
            ) : (
              <>
                Selecione até <strong>{limit} módulos</strong> do catálogo do seu segmento.
              </>
            )}
          </p>
        </div>
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-5 py-3 text-center sm:text-right">
          <div className="text-2xl font-bold text-primary-600">
            {selected.length}/{limit}
          </div>
          <div className="text-xs text-primary-700">módulos selecionados</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {modules.map((module, index) => {
          const available = isModuleAvailableForPlan(industrySlug, module.id, planId);
          const isSelected = selected.includes(module.id);
          const isFull = selected.length >= limit && !isSelected;
          const isFreeIncluded = planId === 'gratis' && index < PLAN_MODULE_LIMITS.gratis;

          return (
            <motion.button
              key={module.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => available && !isFull && toggleModule(module.id)}
              disabled={!available || isFull}
              className={`text-left rounded-xl border p-5 transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/30'
                  : available && !isFull
                    ? 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-sm cursor-pointer'
                    : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                  {module.name}
                </h3>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    isSelected
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed mb-3">{module.description}</p>
              {!available && (
                <span className="inline-flex text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  A partir do Starter
                </span>
              )}
              {isFreeIncluded && (
                <span className="inline-flex text-xs font-medium px-2 py-1 rounded-full bg-secondary-100 text-secondary-800">
                  Incluído no Grátis
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {selected.length >= limit && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-6">
          Você atingiu o limite de {limit} módulos do plano {PLAN_LABELS[planId]}.
          Desmarque um módulo para escolher outro, ou considere um plano superior.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-200 pt-6">
        <Link href="/pricing" className="text-slate-600 hover:text-primary-600 text-sm font-medium">
          ← Voltar aos planos
        </Link>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {planId !== 'pro' && (
            <Link
              href={`/pricing/choose-modules?plan=${
                planId === 'gratis' ? 'starter' : planId === 'starter' ? 'growth' : 'pro'
              }${industry ? `&industry=${industry}` : ''}`}
              className="btn-secondary text-center"
            >
              Ver plano superior
            </Link>
          )}
          {contactHref ? (
            <Link href={contactHref} className="btn-primary text-center">
              Continuar com {selected.length} módulo{selected.length !== 1 ? 's' : ''}
            </Link>
          ) : (
            <button type="button" disabled className="btn-primary opacity-50 cursor-not-allowed">
              Selecione pelo menos 1 módulo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
