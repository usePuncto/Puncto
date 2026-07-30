'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import LeadCaptureForm from '@/components/marketing/LeadCaptureForm';
import CTASection from '@/components/marketing/CTASection';

interface Webinar {
  id: string;
  title: string;
  description: string;
  speaker: {
    name: string;
    role: string;
    avatar?: string;
  };
  date: string;
  time: string;
  duration: string;
  status: 'upcoming' | 'live' | 'recorded';
  topics: string[];
  registrationUrl?: string;
  videoId?: string;
}

const webinars: Webinar[] = [
  {
    id: '1',
    title: 'Tendências de Gestão para Negócios de Serviços em 2024',
    description:
      'Descubra as principais tendências que vão moldar a gestão de salões, restaurantes e clínicas no próximo ano.',
    speaker: {
      name: 'Maria Santos',
      role: 'CEO & Co-fundadora, Puncto',
    },
    date: '2024-02-15',
    time: '15:00',
    duration: '60 min',
    status: 'upcoming',
    topics: [
      'Automação de processos',
      'Experiência do cliente',
      'Pagamentos digitais',
      'Gestão de equipe remota',
    ],
  },
  {
    id: '2',
    title: 'Como Reduzir No-Shows em até 80%',
    description:
      'Estratégias práticas e ferramentas para diminuir faltas e aumentar a ocupação do seu negócio.',
    speaker: {
      name: 'João Silva',
      role: 'CTO & Co-fundador, Puncto',
    },
    date: '2024-02-01',
    time: '14:00',
    duration: '45 min',
    status: 'upcoming',
    topics: [
      'Lembretes automatizados',
      'Política de cancelamento',
      'Lista de espera',
      'Depósitos e garantias',
    ],
  },
  {
    id: '3',
    title: 'Masterclass: Cardápio Digital e Comanda Virtual',
    description:
      'Aprenda a implementar um sistema de pedidos digital no seu restaurante ou café.',
    speaker: {
      name: 'Ana Costa',
      role: 'Head de Produto, Puncto',
    },
    date: '2024-01-20',
    time: '16:00',
    duration: '75 min',
    status: 'recorded',
    videoId: 'dQw4w9WgXcQ',
    topics: [
      'Configuração do cardápio',
      'QR Code por mesa',
      'Integração com cozinha',
      'Divisão de conta',
    ],
  },
  {
    id: '4',
    title: 'Fidelização de Clientes: Programas de Pontos que Funcionam',
    description:
      'Cases reais e estratégias para criar programas de fidelidade que aumentam a retenção.',
    speaker: {
      name: 'Carlos Oliveira',
      role: 'Head de Vendas, Puncto',
    },
    date: '2024-01-10',
    time: '11:00',
    duration: '50 min',
    status: 'recorded',
    videoId: 'dQw4w9WgXcQ',
    topics: [
      'Tipos de programas',
      'Gamificação',
      'ROI de fidelização',
      'Casos de sucesso',
    ],
  },
];

export default function WebinarsPage() {
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const upcomingWebinars = webinars.filter((w) => w.status === 'upcoming');
  const recordedWebinars = webinars.filter((w) => w.status === 'recorded');

  const handleRegister = (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    setShowRegistration(true);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="section bg-gradient-to-b from-primary-900 to-primary-800 text-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-sm font-medium mb-6">
              Webinars
            </span>
            <h1 className="heading-xl text-white mb-6">
              Aprenda com especialistas do setor
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Webinars gratuitos sobre gestão, marketing e tecnologia para
              negócios de serviços.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#upcoming" className="btn-primary btn-lg bg-white text-primary-900 hover:bg-primary-50">
                Ver próximos webinars
              </a>
              <a href="#recorded" className="btn bg-white/10 text-white hover:bg-white/20 btn-lg">
                Assistir gravações
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Webinars */}
      <section id="upcoming" className="section bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-primary mb-4">Agenda</span>
            <h2 className="heading-lg text-slate-900 mb-4">Próximos Webinars</h2>
            <p className="body-lg max-w-2xl mx-auto">
              Inscreva-se gratuitamente e receba o link de acesso por email.
            </p>
          </motion.div>

          <div className="space-y-6">
            {upcomingWebinars.map((webinar, index) => (
              <motion.div
                key={webinar.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-primary-50 to-white rounded-2xl p-6 md:p-8 border border-primary-100"
              >
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Date */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl p-6 text-center border border-slate-200 inline-block w-full max-w-[200px]">
                      <p className="text-sm text-primary-600 font-medium mb-1">
                        {new Date(webinar.date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                        })}
                      </p>
                      <p className="text-4xl font-bold text-slate-900">
                        {new Date(webinar.date).getDate()}
                      </p>
                      <p className="text-slate-600">
                        {new Date(webinar.date).toLocaleDateString('pt-BR', {
                          month: 'long',
                        })}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        {webinar.time} • {webinar.duration}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:col-span-2">
                    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full mb-3">
                      Ao vivo
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {webinar.title}
                    </h3>
                    <p className="text-slate-600 mb-4">{webinar.description}</p>

                    {/* Speaker */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-primary-600">
                          {webinar.speaker.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {webinar.speaker.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {webinar.speaker.role}
                        </p>
                      </div>
                    </div>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {webinar.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleRegister(webinar)}
                      className="btn-primary"
                    >
                      Inscrever-se gratuitamente
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recorded Webinars */}
      <section id="recorded" className="section bg-slate-50">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-secondary mb-4">Biblioteca</span>
            <h2 className="heading-lg text-slate-900 mb-4">Webinars Gravados</h2>
            <p className="body-lg max-w-2xl mx-auto">
              Assista às gravações dos nossos webinars anteriores quando quiser.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {recordedWebinars.map((webinar, index) => (
              <motion.div
                key={webinar.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-soft-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-900">
                  <img
                    src={`https://img.youtube.com/vi/${webinar.videoId}/mqdefault.jpg`}
                    alt={webinar.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                      <svg
                        className="w-6 h-6 text-white ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <span className="absolute top-3 right-3 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {webinar.duration}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-sm text-slate-500 mb-2">
                    {new Date(webinar.date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <h3 className="font-bold text-slate-900 mb-2">{webinar.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{webinar.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-600">
                          {webinar.speaker.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-slate-600">
                        {webinar.speaker.name}
                      </span>
                    </div>
                    <Link
                      href={`/videos?id=${webinar.videoId}`}
                      className="text-primary-600 font-medium text-sm hover:text-primary-700"
                    >
                      Assistir →
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="section-sm bg-primary-600 text-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="heading-md text-white mb-4">
                Não perca nenhum webinar
              </h2>
              <p className="text-primary-100">
                Cadastre-se para receber notificações sobre novos webinars e
                conteúdos exclusivos.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                className="btn bg-white text-primary-600 hover:bg-primary-50 whitespace-nowrap"
              >
                Inscrever-se
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection variant="gradient" />

      {/* Registration Modal */}
      {showRegistration && selectedWebinar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRegistration(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
          >
            <button
              onClick={() => setShowRegistration(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Inscrição para Webinar
            </h3>
            <p className="text-slate-600 mb-6">{selectedWebinar.title}</p>

            <LeadCaptureForm
              variant="compact"
              subject={`Inscrição Webinar: ${selectedWebinar.title}`}
              page="/webinars"
              leadType="webinar"
              onSuccess={() => {
                setShowRegistration(false);
                alert('Inscrição realizada com sucesso! Você receberá o link de acesso por email.');
              }}
            />
          </motion.div>
        </div>
      )}
    </>
  );
}
