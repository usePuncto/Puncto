'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  businessType: z.enum(['salon', 'restaurant', 'clinic', 'bakery', 'other', '']).optional(),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  subject: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface LeadCaptureFormProps {
  variant?: 'contact' | 'demo' | 'compact';
  subject?: string;
  defaultMessage?: string;
  onSuccess?: () => void;
}

export default function LeadCaptureForm({
  variant = 'contact',
  subject,
  defaultMessage,
  onSuccess,
}: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: subject || '',
      message: defaultMessage || '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = variant === 'demo' ? '/api/demo-request' : '/api/contact';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      setSubmitted(true);
      reset();
      onSuccess?.();
    } catch (err) {
      setError('Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
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
          Mensagem enviada!
        </h3>
        <p className="text-slate-600">
          {variant === 'demo'
            ? 'Nossa equipe entrará em contato em breve para agendar sua demonstração.'
            : 'Recebemos sua mensagem e retornaremos em breve.'}
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-primary-600 font-medium hover:text-primary-700"
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Name */}
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

        {/* Email */}
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
          {/* Phone */}
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

          {/* Company */}
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

      {/* Message */}
      <div>
        <label htmlFor="message" className="label">
          {variant === 'demo'
            ? 'Como podemos ajudar?'
            : 'Mensagem *'}
        </label>
        <textarea
          id="message"
          {...register('message')}
          rows={variant === 'compact' ? 3 : 5}
          className={`input resize-none ${errors.message ? 'input-error' : ''}`}
          placeholder={
            variant === 'demo'
              ? 'Conte-nos sobre seu negócio e suas necessidades...'
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
          'Agendar Demonstração'
        ) : (
          'Enviar Mensagem'
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
