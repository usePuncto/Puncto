'use client';

import { motion } from 'framer-motion';

import LeadCaptureForm from '@/components/marketing/LeadCaptureForm';
import { testimonials } from '@/components/marketing/TestimonialCard';

export default function DemoPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="badge-primary mb-4">Demonstração gratuita</span>
              <h1 className="heading-xl text-slate-900 mb-6">
                Veja o Puncto em ação
              </h1>
              <p className="body-lg mb-8">
                Agende uma demonstração personalizada e descubra como o Puncto
                pode transformar a gestão do seu negócio. Nossa equipe vai
                mostrar as funcionalidades mais relevantes para você.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Demonstração ao vivo de 30 minutos',
                  'Personalizada para seu tipo de negócio',
                  'Tire todas as suas dúvidas',
                  'Sem compromisso',
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

              {/* Testimonial - Commented out until we have real testimonials
              <div className="bg-white rounded-xl p-6 shadow-soft border border-slate-100">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 text-accent-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-slate-700 mb-4">
                  &ldquo;{testimonials[0].quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-primary-600">
                      {testimonials[0].author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {testimonials[0].author}
                    </p>
                    <p className="text-sm text-slate-500">
                      {testimonials[0].role} @ {testimonials[0].company}
                    </p>
                  </div>
                </div>
              </div>
              */}
            </motion.div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-soft-lg border border-slate-200 p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Agende sua demonstração
              </h2>
              <p className="text-slate-600 mb-6">
                Preencha o formulário e entraremos em contato para agendar.
              </p>

              <LeadCaptureForm variant="demo" />
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
              O que esperar da demonstração
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Entendemos seu negócio',
                description:
                  'Conversamos sobre suas necessidades, desafios e objetivos para personalizar a demonstração.',
              },
              {
                step: '2',
                title: 'Mostramos as funcionalidades',
                description:
                  'Navegamos pela plataforma mostrando os recursos mais relevantes para seu tipo de negócio.',
              },
              {
                step: '3',
                title: 'Respondemos suas dúvidas',
                description:
                  'Tiramos todas as suas dúvidas sobre funcionalidades, preços, migração e suporte.',
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
      <section className="section bg-slate-50">
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
                q: 'A demonstração é gratuita?',
                a: 'Sim! A demonstração é totalmente gratuita e sem compromisso.',
              },
              {
                q: 'Quanto tempo dura a demonstração?',
                a: 'Aproximadamente 30 minutos, mas podemos estender se necessário.',
              },
              {
                q: 'Preciso de algum software ou instalação?',
                a: 'Não! A demonstração acontece por videoconferência (Google Meet ou Zoom).',
              },
              {
                q: 'Posso convidar minha equipe?',
                a: 'Claro! Quanto mais pessoas participarem, melhor para alinhar expectativas.',
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
