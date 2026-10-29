'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import LeadCaptureForm from '@/components/marketing/LeadCaptureForm';

export default function DemoPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="badge-primary mb-4">Diagnóstico gratuito</span>
              <h1 className="heading-xl text-slate-900 mb-6">
                Veja como a Puncto pode funcionar na realidade da sua empresa
              </h1>
              <p className="body-lg mb-8">
                Antes da reunião, entendemos um pouco da sua operação para preparar
                uma demonstração mais próxima do que você realmente precisa.
                Sem compromisso — e sem valores na página: a proposta vem depois
                do diagnóstico.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Formulário rápido para entendermos seu contexto',
                  'Conversa de diagnóstico gratuita',
                  'Demonstração personalizada para o seu negócio',
                  'Proposta com valores só depois de alinharmos a necessidade',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-secondary-600"
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
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-500">
                Prefere falar direto?{' '}
                <a
                  href="https://wa.me/5541991626161"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Chame no WhatsApp
                </a>
                {' '}ou{' '}
                <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-medium">
                  envie uma mensagem
                </Link>
                .
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-soft-lg border border-slate-200 p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Formulário de pré-diagnóstico
              </h2>
              <p className="text-slate-600 mb-6">
                Quanto mais contexto você compartilhar, mais útil será a conversa.
              </p>

              <LeadCaptureForm
                variant="diagnosis"
                page="/demo"
                leadType="pre_diagnosis"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* What to expect */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              O que acontece depois do formulário
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Entendemos seu negócio',
                description:
                  'Lemos o que você compartilhou e, se precisar, esclarecemos detalhes antes da reunião.',
              },
              {
                step: '2',
                title: 'Mostramos o sistema no seu contexto',
                description:
                  'Preparamos uma demonstração próxima da sua rotina — com as áreas que fazem sentido para você.',
              },
              {
                step: '3',
                title: 'Alinhamos próximos passos',
                description:
                  'Tiramos dúvidas e, se fizer sentido, apresentamos uma proposta com valores sob medida.',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="heading-lg text-slate-900 mb-4">
              Perguntas frequentes
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-4">
            {[
              {
                q: 'O diagnóstico é gratuito?',
                a: 'Sim. A conversa de diagnóstico e a demonstração são gratuitas e sem compromisso.',
              },
              {
                q: 'Por que não vejo preços no site?',
                a: 'Porque cada empresa tem necessidades diferentes. Preferimos entender sua operação e só então apresentar valores em uma proposta personalizada.',
              },
              {
                q: 'Quanto tempo dura a reunião?',
                a: 'Em geral cerca de 30 a 45 minutos, mas podemos ajustar conforme a necessidade.',
              },
              {
                q: 'Preciso instalar algum programa?',
                a: 'Não. A conversa acontece por videoconferência (Google Meet ou Zoom).',
              },
              {
                q: 'Posso convidar minha equipe?',
                a: 'Claro. Quanto mais pessoas relevantes participarem, melhor para alinhar expectativas.',
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-soft border border-slate-100"
              >
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
