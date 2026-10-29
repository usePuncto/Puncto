'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ORGANIZE_OPTIONS = [
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'crm', label: 'Clientes / CRM' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'ponto', label: 'Ponto' },
  { id: 'automacoes', label: 'Automações' },
  { id: 'relatorios', label: 'Relatórios / indicadores' },
  { id: 'outro', label: 'Outro' },
] as const;

const TEAM_SIZE_OPTIONS = [
  { value: '1-5', label: '1 a 5 pessoas' },
  { value: '6-15', label: '6 a 15 pessoas' },
  { value: '16-50', label: '16 a 50 pessoas' },
  { value: '50+', label: 'Mais de 50 pessoas' },
] as const;

const HOW_FOUND_OPTIONS = [
  { value: 'google', label: 'Google' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'contato_puncto', label: 'Contato da Puncto' },
  { value: 'outro', label: 'Outro' },
] as const;

const contactSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  businessType: z.string().optional(),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  subject: z.string().optional(),
});

const diagnosisSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  company: z.string().min(2, 'Nome da empresa é obrigatório'),
  businessType: z.string().min(1, 'Informe o segmento da empresa'),
  teamSize: z.string().min(1, 'Selecione o tamanho da equipe'),
  organizeAreas: z.array(z.string()).min(1, 'Selecione ao menos uma área'),
  currentTools: z.string().min(5, 'Conte brevemente como fazem isso hoje'),
  mainDifficulty: z.string().min(5, 'Descreva a principal dificuldade'),
  desiredFeature: z.string().optional(),
  phone: z.string().min(8, 'WhatsApp é obrigatório'),
  email: z.string().email('Email inválido'),
  howFound: z.string().min(1, 'Conte como conheceu a Puncto'),
});

type ContactFormData = z.infer<typeof contactSchema>;
type DiagnosisFormData = z.infer<typeof diagnosisSchema>;

interface LeadCaptureFormProps {
  variant?: 'contact' | 'demo' | 'compact' | 'diagnosis';
  subject?: string;
  defaultMessage?: string;
  plan?: string;
  modules?: string[];
  industry?: string;
  billing?: 'monthly' | 'annual';
  page?: string;
  leadType?: 'contact' | 'demo_request' | 'webinar' | 'module_interest' | 'enterprise' | 'pre_diagnosis';
  onSuccess?: () => void;
}

export default function LeadCaptureForm({
  variant = 'contact',
  subject,
  defaultMessage,
  plan,
  modules,
  industry,
  billing,
  page,
  leadType,
  onSuccess,
}: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizeAreas, setOrganizeAreas] = useState<string[]>([]);

  const isDiagnosis = variant === 'diagnosis';

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: subject || '',
      message: defaultMessage || '',
    },
  });

  const diagnosisForm = useForm<DiagnosisFormData>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      organizeAreas: [],
      desiredFeature: '',
    },
  });

  const toggleOrganizeArea = (id: string) => {
    setOrganizeAreas((prev) => {
      const next = prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id];
      diagnosisForm.setValue('organizeAreas', next, { shouldValidate: true });
      return next;
    });
  };

  const submitLead = async (payload: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = variant === 'demo' || isDiagnosis ? '/api/demo-request' : '/api/contact';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          plan: plan || undefined,
          modules: modules?.length ? modules : undefined,
          industry: industry || undefined,
          billing: billing || undefined,
          page: page || (isDiagnosis ? '/demo' : variant === 'demo' ? '/demo' : '/contact'),
          leadType:
            leadType ||
            (isDiagnosis
              ? 'pre_diagnosis'
              : variant === 'demo'
                ? 'demo_request'
                : plan === 'enterprise'
                  ? 'enterprise'
                  : plan && modules?.length
                    ? 'module_interest'
                    : undefined),
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      setSubmitted(true);
      if (isDiagnosis) {
        diagnosisForm.reset();
        setOrganizeAreas([]);
      } else {
        contactForm.reset();
      }
      onSuccess?.();
    } catch {
      setError('Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitContact = async (data: ContactFormData) => {
    await submitLead(data);
  };

  const onSubmitDiagnosis = async (data: DiagnosisFormData) => {
    const areasLabels = data.organizeAreas
      .map((id) => ORGANIZE_OPTIONS.find((o) => o.id === id)?.label || id)
      .join(', ');

    const message = [
      `Áreas para organizar: ${areasLabels}`,
      `Como fazem hoje: ${data.currentTools}`,
      `Principal dificuldade: ${data.mainDifficulty}`,
      data.desiredFeature ? `Funcionalidade desejada: ${data.desiredFeature}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    await submitLead({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      businessType: data.businessType,
      teamSize: data.teamSize,
      organizeAreas: data.organizeAreas,
      currentTools: data.currentTools,
      mainDifficulty: data.mainDifficulty,
      desiredFeature: data.desiredFeature || null,
      howFound: data.howFound,
      message,
      subject: 'Pré-diagnóstico gratuito',
    });
  };

  if (submitted) {
    return (
      <div className="bg-secondary-50 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-secondary-600"
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
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Solicitação enviada!
        </h3>
        <p className="text-slate-600">
          {isDiagnosis || variant === 'demo'
            ? 'Recebemos suas informações. Em breve entraremos em contato para agendar o diagnóstico gratuito e a demonstração personalizada.'
            : 'Recebemos sua mensagem e retornaremos em breve.'}
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-primary-600 font-medium hover:text-primary-700"
        >
          Enviar outra solicitação
        </button>
      </div>
    );
  }

  if (isDiagnosis) {
    const {
      register,
      handleSubmit,
      formState: { errors },
    } = diagnosisForm;

    return (
      <form onSubmit={handleSubmit(onSubmitDiagnosis)} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="label">
              Seu nome *
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="Seu nome"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="company" className="label">
              Nome da empresa *
            </label>
            <input
              id="company"
              type="text"
              {...register('company')}
              className={`input ${errors.company ? 'input-error' : ''}`}
              placeholder="Nome da sua empresa"
            />
            {errors.company && (
              <p className="mt-1 text-sm text-red-500">{errors.company.message}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="businessType" className="label">
              Segmento / área de atuação *
            </label>
            <input
              id="businessType"
              type="text"
              {...register('businessType')}
              className={`input ${errors.businessType ? 'input-error' : ''}`}
              placeholder="Ex.: clínica, comércio, serviços..."
            />
            {errors.businessType && (
              <p className="mt-1 text-sm text-red-500">{errors.businessType.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="teamSize" className="label">
              Quantas pessoas trabalham na empresa? *
            </label>
            <select
              id="teamSize"
              {...register('teamSize')}
              className={`input ${errors.teamSize ? 'input-error' : ''}`}
            >
              <option value="">Selecione...</option>
              {TEAM_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.teamSize && (
              <p className="mt-1 text-sm text-red-500">{errors.teamSize.message}</p>
            )}
          </div>
        </div>

        <div>
          <p className="label mb-3">O que você gostaria de organizar ou melhorar? *</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {ORGANIZE_OPTIONS.map((opt) => {
              const checked = organizeAreas.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOrganizeArea(opt.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {errors.organizeAreas && (
            <p className="mt-1 text-sm text-red-500">{errors.organizeAreas.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="currentTools" className="label">
            Como vocês fazem isso hoje? *
          </label>
          <textarea
            id="currentTools"
            {...register('currentTools')}
            rows={3}
            className={`input resize-none ${errors.currentTools ? 'input-error' : ''}`}
            placeholder="Quais sistemas, planilhas, aplicativos ou processos usam atualmente?"
          />
          {errors.currentTools && (
            <p className="mt-1 text-sm text-red-500">{errors.currentTools.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="mainDifficulty" className="label">
            Qual é a principal dificuldade nessa gestão hoje? *
          </label>
          <textarea
            id="mainDifficulty"
            {...register('mainDifficulty')}
            rows={3}
            className={`input resize-none ${errors.mainDifficulty ? 'input-error' : ''}`}
            placeholder="Ex.: informação espalhada, falta de controle, retrabalho..."
          />
          {errors.mainDifficulty && (
            <p className="mt-1 text-sm text-red-500">{errors.mainDifficulty.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="desiredFeature" className="label">
            Existe alguma funcionalidade específica que você gostaria?{' '}
            <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            id="desiredFeature"
            type="text"
            {...register('desiredFeature')}
            className="input"
            placeholder="Algo que o sistema ideal deveria ter"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone" className="label">
              WhatsApp *
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className={`input ${errors.phone ? 'input-error' : ''}`}
              placeholder="(11) 99999-9999"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="label">
              E-mail *
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="howFound" className="label">
            Como conheceu a Puncto? *
          </label>
          <select
            id="howFound"
            {...register('howFound')}
            className={`input ${errors.howFound ? 'input-error' : ''}`}
          >
            <option value="">Selecione...</option>
            {HOW_FOUND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.howFound && (
            <p className="mt-1 text-sm text-red-500">{errors.howFound.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Agendar diagnóstico gratuito'}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Ao enviar, você concorda com nossa{' '}
          <a href="/legal/privacy" className="text-primary-600 hover:underline">
            Política de Privacidade
          </a>
          . Sem compromisso.
        </p>
      </form>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = contactForm;

  return (
    <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="label">
            Nome completo *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="Seu nome"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email *
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="seu@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
      </div>

      {variant !== 'compact' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone" className="label">
              Telefone / WhatsApp
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className="input"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label htmlFor="company" className="label">
              Nome do negócio
            </label>
            <input
              id="company"
              type="text"
              {...register('company')}
              className="input"
              placeholder="Nome da sua empresa"
            />
          </div>
        </div>
      )}

      {variant !== 'compact' && (
        <div>
          <label htmlFor="businessType" className="label">
            Tipo de negócio
          </label>
          <select
            id="businessType"
            {...register('businessType')}
            className="input"
          >
            <option value="">Selecione...</option>
            <option value="salon">Salão de Beleza / Barbearia</option>
            <option value="restaurant">Restaurante / Café</option>
            <option value="clinic">Clínica / Consultório</option>
            <option value="bakery">Padaria / Confeitaria</option>
            <option value="other">Outro</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="message" className="label">
          {variant === 'demo' ? 'Como podemos ajudar?' : 'Mensagem *'}
        </label>
        <textarea
          id="message"
          {...register('message')}
          rows={variant === 'compact' ? 3 : 5}
          className={`input resize-none ${errors.message ? 'input-error' : ''}`}
          placeholder={
            variant === 'demo'
              ? 'Conte-nos sobre seu negócio e o que gostaria de organizar...'
              : 'Como podemos ajudar você?'
          }
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Enviando...
          </>
        ) : variant === 'demo' ? (
          'Agendar demonstração'
        ) : (
          'Enviar mensagem'
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Ao enviar, você concorda com nossa{' '}
        <a href="/legal/privacy" className="text-primary-600 hover:underline">
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  );
}
