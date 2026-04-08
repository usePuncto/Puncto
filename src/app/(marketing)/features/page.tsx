'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { features, iconComponents } from '@/content/features';
import CTASection from '@/components/marketing/CTASection';

const featureCategories = [
  { id: 'all', name: 'Todos' },
  { id: 'scheduling', name: 'Agendamento' },
  { id: 'payments', name: 'Pagamentos' },
  { id: 'restaurant', name: 'Restaurante' },
  { id: 'timeClock', name: 'Ponto' },
  { id: 'inventory', name: 'Estoque' },
  { id: 'crm', name: 'CRM' },
  { id: 'api', name: 'API' },
  { id: 'analytics', name: 'Analytics' },
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
            <span className="badge-primary mb-4">Funcionalidades</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Tudo que você precisa para gerenciar seu negócio
            </h1>
            <p className="body-lg">
              Explore todas as funcionalidades que fazem do Puncto a plataforma
              mais completa para negócios de serviços.
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

      {/* Pay As You Go / Transparency Section */}
      <section className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-xl mb-4">
                📋 Transparência: Entenda os limites do seu plano
              </h3>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Nós crescemos junto com a sua empresa. Nossos planos possuem cotas desenhadas para atender diferentes estágios do seu negócio, garantindo que você só pague por aquilo que realmente precisa.
              </p>
              <div className="space-y-5 mb-5">
                <div className="bg-white/80 rounded-xl p-4 border border-slate-200/60">
                  <p className="text-slate-800 font-semibold text-sm mb-2">👥 Limite de Colaboradores (Usuários no sistema)</p>
                  <ul className="text-sm text-slate-600 space-y-1 ml-4">
                    <li><strong>Starter:</strong> Até 10 colaboradores.</li>
                    <li><strong>Growth:</strong> Até 20 colaboradores.</li>
                    <li><strong>Pro:</strong> Até 30 colaboradores.</li>
                  </ul>
                  <p className="text-sm text-slate-500 italic mt-2">
                    (Sua operação é maior? Fale com nosso time de vendas para montarmos um plano personalizado para o seu tamanho!)
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 border border-slate-200/60">
                  <p className="text-slate-800 font-semibold text-sm mb-2">🚀 Cotas de Automação (WhatsApp e Notas Fiscais)</p>
                  <p className="text-slate-600 text-sm mb-2">Disponíveis nos planos mais avançados para turbinar sua operação mensalmente:</p>
                  <ul className="text-sm text-slate-600 space-y-1 ml-4">
                    <li><strong>Growth:</strong> 150 mensagens de WhatsApp automáticas e 30 Notas Fiscais.</li>
                    <li><strong>Pro:</strong> 300 mensagens de WhatsApp automáticas e 100 Notas Fiscais.</li>
                  </ul>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-slate-800 font-semibold text-sm mb-1">💡 E se eu ultrapassar a minha cota no mês?</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Fique tranquilo, o Puncto não vai travar a sua operação! Nós trabalhamos com o modelo Pay As You Go (pague pelo que usar). Se você tiver um mês de pico de vendas e precisar emitir mais notas ou enviar mais mensagens automáticas, o sistema continuará funcionando normalmente. O uso excedente será cobrado de forma avulsa apenas na sua próxima fatura, com valores super acessíveis.
                </p>
              </div>
            </div>
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
              { name: 'TecnoSpeed', category: 'Fiscal' },
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
                Para Desenvolvedores
              </span>
              <h2 className="heading-lg text-white mb-4">
                API completa e bem documentada
              </h2>
              <p className="text-slate-300 text-lg mb-6">
                Integre o Puncto com seus sistemas existentes ou construa soluções
                personalizadas usando nossa API REST e GraphQL.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'API REST com OpenAPI/Swagger',
                  'GraphQL para consultas flexíveis',
                  'Webhooks para eventos em tempo real',
                  'SDKs para JavaScript e Python (em breve)',
                  'Rate limiting generoso',
                  'Documentação interativa',
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
                  href="/contact"
                  className="btn bg-white text-slate-900 hover:bg-slate-100"
                >
                  Solicitar Acesso à API
                </Link>
                <Link
                  href="/pricing"
                  className="btn bg-transparent text-white border border-slate-600 hover:bg-slate-800"
                >
                  Ver Planos com API
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
        title="Pronto para explorar?"
        description="Comece gratuitamente e descubra como o Puncto pode simplificar a gestão do seu negócio."
        primaryCTA={{ text: 'Começar Grátis', href: '/contact' }}
        variant="gradient"
      />
    </>
  );
}
