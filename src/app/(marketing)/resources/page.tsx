'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import CTASection from '@/components/marketing/CTASection';

const resources = [
  {
    id: 'ebook-no-shows',
    type: 'ebook',
    title: '10 Estratégias para Reduzir No-Shows',
    description:
      'Guia completo com técnicas comprovadas para reduzir faltas e aumentar a ocupação do seu negócio.',
    image: null,
    downloadUrl: '/downloads/ebook-no-shows.pdf',
    featured: true,
  },
  {
    id: 'checklist-abertura',
    type: 'checklist',
    title: 'Checklist: Abrindo seu Salão de Beleza',
    description:
      'Lista completa com tudo que você precisa para abrir e organizar seu salão do zero.',
    image: null,
    downloadUrl: '/downloads/checklist-salao.pdf',
    featured: false,
  },
  {
    id: 'template-precificacao',
    type: 'template',
    title: 'Planilha de Precificação de Serviços',
    description:
      'Template para calcular custos e definir preços justos para seus serviços.',
    image: null,
    downloadUrl: '/downloads/template-precificacao.xlsx',
    featured: false,
  },
  {
    id: 'guia-marketing',
    type: 'guide',
    title: 'Guia de Marketing Digital para Negócios Locais',
    description:
      'Aprenda a atrair mais clientes usando Instagram, Google e WhatsApp.',
    image: null,
    downloadUrl: '/downloads/guia-marketing.pdf',
    featured: true,
  },
  {
    id: 'ebook-gestao-equipe',
    type: 'ebook',
    title: 'Gestão de Equipe em Salões e Clínicas',
    description:
      'Como montar, treinar e manter uma equipe engajada no seu negócio.',
    image: null,
    downloadUrl: '/downloads/ebook-gestao-equipe.pdf',
    featured: false,
  },
  {
    id: 'webinar-crescimento',
    type: 'webinar',
    title: 'Webinar: Escale seu Negócio sem Perder Qualidade',
    description:
      'Gravação do webinar com dicas práticas de crescimento sustentável.',
    image: null,
    downloadUrl: '/downloads/webinar-crescimento.mp4',
    featured: false,
  },
];

const resourceTypes = [
  { id: 'all', label: 'Todos' },
  { id: 'ebook', label: 'E-books' },
  { id: 'guide', label: 'Guias' },
  { id: 'template', label: 'Templates' },
  { id: 'checklist', label: 'Checklists' },
  { id: 'webinar', label: 'Webinars' },
];

const typeIcons: Record<string, string> = {
  ebook: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  guide: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  template: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  checklist: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  webinar: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
};

export default function ResourcesPage() {
  const [filter, setFilter] = useState('all');
  const [downloadModal, setDownloadModal] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const filteredResources =
    filter === 'all'
      ? resources
      : resources.filter((r) => r.type === filter);

  const handleDownload = async (resourceId: string) => {
    if (!email) return;

    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, page: `/resources/${resourceId}` }),
      });

      // Track download
      // trackEvent('resource_download', 'lead', resourceId);

      setSubmitted(true);

      // In a real app, you would trigger the actual download here
      const resource = resources.find((r) => r.id === resourceId);
      if (resource) {
        // window.open(resource.downloadUrl, '_blank');
        setTimeout(() => {
          setDownloadModal(null);
          setSubmitted(false);
          setEmail('');
        }, 2000);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

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
            <span className="badge-primary mb-4">Recursos Gratuitos</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Materiais para impulsionar seu negócio
            </h1>
            <p className="body-lg">
              E-books, templates, guias e webinars gratuitos para ajudar você a
              crescer.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="container-marketing">
          <div className="flex flex-wrap justify-center gap-2">
            {resourceTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setFilter(type.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all text-sm ${
                  filter === type.id
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`card-hover p-6 ${
                  resource.featured ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {resource.featured && (
                  <span className="badge-accent text-xs mb-4">Destaque</span>
                )}

                <div className="flex items-start gap-4 mb-4">
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
                        d={typeIcons[resource.type]}
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">
                      {resourceTypes.find((t) => t.id === resource.type)?.label}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {resource.title}
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  {resource.description}
                </p>

                <button
                  onClick={() => setDownloadModal(resource.id)}
                  className="btn-primary btn-sm w-full"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Baixar Grátis
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Modal */}
      {downloadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <button
              onClick={() => {
                setDownloadModal(null);
                setSubmitted(false);
                setEmail('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {!submitted ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Baixar material gratuito
                </h3>
                <p className="text-slate-600 mb-6">
                  Insira seu email para receber o link de download.
                </p>

                <div className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="input"
                  />
                  <button
                    onClick={() => handleDownload(downloadModal)}
                    disabled={!email}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    Baixar Agora
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center mt-4">
                  Você também receberá dicas e novidades por email.
                </p>
              </>
            ) : (
              <div className="text-center">
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Download iniciado!
                </h3>
                <p className="text-slate-600">
                  Verifique seu email para o link de download.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* CTA */}
      <CTASection
        title="Quer mais do que materiais gratuitos?"
        description="Experimente o Puncto gratuitamente e transforme seu negócio."
        variant="gradient"
      />
    </>
  );
}
