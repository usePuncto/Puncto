'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { VideoCard, VideoModal } from '@/components/marketing/VideoPlayer';
import CTASection from '@/components/marketing/CTASection';

interface Video {
  id: string;
  videoId: string;
  title: string;
  description: string;
  duration: string;
  category: string;
}

const videoCategories = [
  { id: 'all', name: 'Todos' },
  { id: 'demo', name: 'Demonstrações' },
  { id: 'tutorial', name: 'Tutoriais' },
  { id: 'testimonials', name: 'Depoimentos' },
  { id: 'webinars', name: 'Webinars' },
];

const videos: Video[] = [
  {
    id: '1',
    videoId: 'dQw4w9WgXcQ', // Placeholder - replace with actual video IDs
    title: 'Conheça o Puncto em 3 minutos',
    description: 'Uma visão geral rápida de todas as funcionalidades do Puncto para seu negócio.',
    duration: '3:24',
    category: 'demo',
  },
  {
    id: '2',
    videoId: 'dQw4w9WgXcQ',
    title: 'Como configurar seu primeiro agendamento',
    description: 'Tutorial passo a passo para começar a receber agendamentos online.',
    duration: '8:15',
    category: 'tutorial',
  },
  {
    id: '3',
    videoId: 'dQw4w9WgXcQ',
    title: 'Salão Bela Vista: Como reduzimos 80% dos no-shows',
    description: 'Case de sucesso de um salão de beleza que transformou sua gestão com o Puncto.',
    duration: '5:42',
    category: 'testimonials',
  },
  {
    id: '4',
    videoId: 'dQw4w9WgXcQ',
    title: 'Configurando pagamentos com PIX',
    description: 'Aprenda a configurar recebimentos via PIX instantâneo no seu negócio.',
    duration: '6:30',
    category: 'tutorial',
  },
  {
    id: '5',
    videoId: 'dQw4w9WgXcQ',
    title: 'Restaurante São Pedro: Comanda digital na prática',
    description: 'Veja como um restaurante implementou a comanda digital e melhorou o atendimento.',
    duration: '7:18',
    category: 'testimonials',
  },
  {
    id: '6',
    videoId: 'dQw4w9WgXcQ',
    title: 'Webinar: Tendências de gestão para 2024',
    description: 'Gravação do webinar sobre as principais tendências de gestão para negócios de serviços.',
    duration: '45:00',
    category: 'webinars',
  },
  {
    id: '7',
    videoId: 'dQw4w9WgXcQ',
    title: 'Tour completo pelo dashboard',
    description: 'Navegue por todas as seções do painel administrativo do Puncto.',
    duration: '12:45',
    category: 'demo',
  },
  {
    id: '8',
    videoId: 'dQw4w9WgXcQ',
    title: 'Gestão de equipe e ponto eletrônico',
    description: 'Tutorial sobre controle de presença, turnos e banco de horas.',
    duration: '9:20',
    category: 'tutorial',
  },
  {
    id: '9',
    videoId: 'dQw4w9WgXcQ',
    title: 'Clínica Estética Renove: Depoimento',
    description: 'Como uma clínica de estética organizou sua agenda e aumentou o faturamento.',
    duration: '4:55',
    category: 'testimonials',
  },
];

export default function VideosPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const filteredVideos =
    activeCategory === 'all'
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  const featuredVideo = videos[0];

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
            <span className="badge-primary mb-4">Vídeos</span>
            <h1 className="heading-xl text-slate-900 mb-6">
              Aprenda com nossos vídeos
            </h1>
            <p className="body-lg">
              Tutoriais, demonstrações e cases de sucesso para você aproveitar
              ao máximo o Puncto.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Video */}
      <section className="py-12 bg-white">
        <div className="container-marketing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Video */}
              <div
                className="aspect-video lg:aspect-auto lg:h-full relative cursor-pointer group"
                onClick={() => setSelectedVideo(featuredVideo)}
              >
                <img
                  src={`https://img.youtube.com/vi/${featuredVideo.videoId}/maxresdefault.jpg`}
                  alt={featuredVideo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <span className="text-primary-400 text-sm font-medium mb-2">
                  Em destaque
                </span>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                  {featuredVideo.title}
                </h2>
                <p className="text-slate-300 mb-6">
                  {featuredVideo.description}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedVideo(featuredVideo)}
                    className="btn-primary"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Assistir agora
                  </button>
                  <span className="text-slate-400">{featuredVideo.duration}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b border-slate-200 sticky top-16 md:top-20 z-40">
        <div className="container-marketing">
          <div className="flex flex-wrap justify-center gap-2">
            {videoCategories.map((category) => (
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

      {/* Video Grid */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <VideoCard
                  videoId={video.videoId}
                  title={video.title}
                  description={video.description}
                  duration={video.duration}
                  category={videoCategories.find((c) => c.id === video.category)?.name}
                  onClick={() => setSelectedVideo(video)}
                />
              </motion.div>
            ))}
          </div>

          {filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">
                Nenhum vídeo encontrado nesta categoria.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* YouTube CTA */}
      <section className="section-sm bg-slate-50">
        <div className="container-marketing">
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <h2 className="heading-md text-slate-900 mb-4">
              Inscreva-se no nosso canal
            </h2>
            <p className="body-lg max-w-xl mx-auto mb-8">
              Receba notificações de novos vídeos, tutoriais e dicas para
              crescer seu negócio.
            </p>
            <a
              href="https://www.youtube.com/@usepuncto"
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Inscrever-se no YouTube
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection variant="gradient" />

      {/* Video Modal */}
      <VideoModal
        videoId={selectedVideo?.videoId || ''}
        title={selectedVideo?.title}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
