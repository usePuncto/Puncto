'use client';

import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

import LeadCaptureForm from '@/components/marketing/LeadCaptureForm';

function ContactContent() {
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject') || undefined;
  const plan = searchParams.get('plan') || undefined;

  return (
    <>
      {/* Hero Section */}
      <section className="section-sm bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <span className="badge-primary mb-4">Contato</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Fale conosco
            </h1>
            <p className="body-lg">
              Estamos aqui para ajudar. Envie sua mensagem e nossa equipe
              responderá em até 24 horas úteis.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <h2 className="heading-md text-slate-900 mb-6">
                Outras formas de contato
              </h2>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Email</h3>
                    <p className="text-slate-600">suporte@puncto.com.br</p>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-secondary-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">WhatsApp</h3>
                    <a 
                      href="https://wa.me/5541991626161" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Entre em contato via WhatsApp
                    </a>
                    <p className="text-sm text-slate-500 mt-1">
                      Seg-Sex, 9h às 18h
                    </p>
                  </div>
                </div>

                
              </div>

              {/* Quick Links */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Links úteis
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/demo"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Agendar Demonstração
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Ver Planos e Preços
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/features"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Funcionalidades
                    </Link>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8"
            >
              {plan === 'enterprise' && (
                <div className="bg-primary-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-primary-900">
                    Interessado no plano Enterprise
                  </h3>
                  <p className="text-primary-700 text-sm">
                    Nossa equipe comercial entrará em contato para entender suas
                    necessidades e apresentar uma proposta personalizada.
                  </p>
                </div>
              )}

              <LeadCaptureForm
                variant="contact"
                subject={subject || (plan ? `Interesse no plano ${plan}` : undefined)}
              />
            </motion.div>
          </div>
        </div>
      </section>

      
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ContactContent />
    </Suspense>
  );
}
