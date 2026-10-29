'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { features, iconComponents } from '@/content/features';
import CTASection from '@/components/marketing/CTASection';

const featureCategories = [
  { id: 'all', name: 'Todos' },
  { id: 'scheduling', name: 'Agendamento' },
  { id: 'payments', name: 'Financeiro' },
  { id: 'restaurant', name: 'Cardápio e pedidos' },
  { id: 'timeClock', name: 'Ponto' },
  { id: 'inventory', name: 'Estoque' },
  { id: 'crm', name: 'Clientes' },
  { id: 'api', name: 'Integrações' },
  { id: 'analytics', name: 'Relatórios' },
];

export default function FeaturesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const filteredFeatures =
    activeCategory === 'all'
      ? features
      : features.filter((f) => f.categories.includes(activeCategory));

  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-50 to-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="badge-primary mb-4">O que o sistema cobre</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Tudo que você precisa para gerenciar seu negócio
            </h1>
            <p className="body-lg">
              Áreas de gestão que combinamos e ajustamos conforme a necessidade
              do seu negócio. O sistema se adapta a você — não o contrário.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-8 bg-white sticky top-16 md:top-20 z-40 border-b border-slate-200">
        <div className="container-marketing">
          <div className="flex flex-wrap justify-center gap-2">
            {featureCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all text-sm ${
                  activeCategory === category.id
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="space-y-8">
            {filteredFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                id={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow"
              >
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Content */}
                  <div className="p-8 lg:p-12">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={iconComponents[feature.icon]}
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="heading-md text-slate-900">{feature.title}</h2>
                      </div>
                    </div>

                    <p className="body-lg mb-6">{feature.description}</p>

                    <h3 className="font-semibold text-slate-900 mb-4">
                      Principais benefícios:
                    </h3>
                    <ul className="space-y-3 mb-8">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5"
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
                          <span className="text-slate-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex gap-4">
                      <Link href="/industries" className="btn-primary btn-sm">
                        Experimentar grátis
                      </Link>
                      <Link href="/demo" className="btn-ghost btn-sm">
                        Ver demonstração
                      </Link>
                    </div>
                  </div>

                  {/* Visual */}
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 lg:p-12 flex items-center justify-center min-h-[300px] lg:min-h-0">
                    <div className="text-center text-slate-400">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="font-medium">Screenshot do {feature.title}</p>
                      <p className="text-sm">Imagem será adicionada</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How we price reminder */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h3 className="heading-md text-slate-900 mb-4">
              Valores sob medida, após o diagnóstico
            </h3>
            <p className="body-lg mb-6">
              Não publicamos tabelas de preço no site. No diagnóstico gratuito
              entendemos o que você precisa organizar e, na demonstração,
              mostramos o sistema na sua realidade — a proposta com valores
              vem depois.
            </p>
            <Link href="/demo" className="btn-primary">
              Agendar diagnóstico gratuito
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-secondary mb-4">Integrações</span>
            <h2 className="heading-lg text-slate-900 mb-4">
              Conecte com suas ferramentas favoritas
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              O Puncto se integra com os principais serviços do mercado para uma
              operação ainda mais eficiente.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: 'WhatsApp', category: 'Comunicação' },
              { name: 'Stripe', category: 'Pagamentos' },
              { name: 'Google Calendar', category: 'Calendário' },
              { name: 'PIX', category: 'Pagamentos' },
              { name: 'iFood', category: 'Delivery' },
              { name: 'XML / DANFE', category: 'Gestão fiscal' },
              { name: 'ZeptoMail', category: 'Email' },
              { name: 'Twilio', category: 'SMS' },
              { name: 'Firebase', category: 'Infraestrutura' },
              { name: 'Sentry', category: 'Monitoramento' },
              { name: 'Zapier', category: 'Automação' },
              { name: 'API', category: 'Customização' },
            ].map((integration, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-6 text-center shadow-soft border border-slate-100 hover:shadow-soft-lg hover:border-primary-200 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-slate-400">
                    {integration.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {integration.name}
                </h3>
                <p className="text-xs text-slate-500">{integration.category}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section id="api" className="section bg-slate-900 text-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="badge bg-primary-500/20 text-primary-300 mb-4">
                Integrações
              </span>
              <h2 className="heading-lg text-white mb-4">
                Conecte com o que sua empresa já usa
              </h2>
              <p className="text-slate-300 text-lg mb-6">
                Quando precisar, a Puncto pode se ligar a outras ferramentas do
                seu dia a dia — calendários, pagamentos, WhatsApp e sistemas
                internos. No diagnóstico, alinhamos o que faz sentido.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Lembretes e mensagens no WhatsApp',
                  'Pagamentos e PIX',
                  'Sincronização com calendários',
                  'Conexão com outras ferramentas quando necessário',
                  'Documentação clara para quem cuida da tecnologia',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-secondary-400"
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
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-4">
                <Link
                  href="/demo"
                  className="btn bg-white text-slate-900 hover:bg-slate-100"
                >
                  Agendar diagnóstico
                </Link>
                <Link
                  href="/contact"
                  className="btn bg-transparent text-white border border-slate-600 hover:bg-slate-800"
                >
                  Falar sobre integrações
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-slate-800 rounded-xl p-6 font-mono text-sm overflow-x-auto"
            >
              <div className="flex items-center gap-2 mb-4 text-slate-400">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="ml-2">api-example.ts</span>
              </div>
              <pre className="text-slate-300">
                <code>{`// Exemplo de uso da API REST
const response = await fetch(
  '/api/bookings',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceId: 'svc_123',
      professionalId: 'pro_456',
      customerId: 'cus_789',
      startAt: '2024-03-15T10:00:00Z'
    })
  }
);

const booking = await response.json();
console.log('Agendamento criado:', booking.id);`}</code>
              </pre>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Pronto para ver isso na sua empresa?"
        description="Agende um diagnóstico gratuito e descubra o que faz sentido organizar na sua operação."
        primaryCTA={{ text: 'Agendar diagnóstico gratuito', href: '/demo' }}
        secondaryCTA={{ text: 'Falar conosco', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
