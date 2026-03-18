import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Imprensa e Media Kit',
  description: 'Recursos para imprensa, logos, materiais de marca e informações sobre o Puncto.',
};

// Press releases will be added when available
const pressReleases: Array<{ date: string; title: string; excerpt: string }> = [];

const mediaAssets = [
  {
    name: 'Logo Principal (SVG)',
    description: 'Logo em cores primárias para uso em fundos claros',
    format: 'SVG',
    size: '12 KB',
    url: '/brand/logo-primary.svg',
  },
  {
    name: 'Logo Branco (SVG)',
    description: 'Logo em branco para uso em fundos escuros ou coloridos',
    format: 'SVG',
    size: '12 KB',
    url: '/brand/logo-white.svg',
  },
  {
    name: 'Ícone (PNG)',
    description: 'Ícone do Puncto em alta resolução',
    format: 'PNG',
    size: '48 KB',
    url: '/brand/icon.png',
  },
  {
    name: 'Kit de Logos (ZIP)',
    description: 'Todos os logos em diversos formatos e tamanhos',
    format: 'ZIP',
    size: '2.4 MB',
    url: '/brand/puncto-logos.zip',
  },
  {
    name: 'Screenshots do Produto',
    description: 'Capturas de tela do dashboard e funcionalidades',
    format: 'ZIP',
    size: '8.7 MB',
    url: '/brand/screenshots.zip',
  },
  {
    name: 'Guia de Marca',
    description: 'Diretrizes completas de uso da marca Puncto',
    format: 'PDF',
    size: '1.2 MB',
    url: '/brand/brand-guidelines.pdf',
  },
];

const companyFacts = [
  { label: 'Fundação', value: '2023' },
  { label: 'País', value: 'Brasil' },
];

export default function PressPage() {
  return (
    <>
      {/* Hero */}
      <section className="section bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-sm font-medium mb-6">
              Imprensa
            </span>
            <h1 className="heading-xl text-white mb-6">
              Media Kit e Recursos para Imprensa
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Encontre logos, materiais de marca e informações sobre o Puncto
              para sua matéria ou publicação.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/brand/puncto-media-kit.zip" className="btn-primary btn-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Media Kit
              </a>
              <a href="mailto:imprensa@puncto.com.br" className="btn bg-white/10 text-white hover:bg-white/20">
                Contato para Imprensa
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="heading-lg text-slate-900 mb-6">Sobre o Puncto</h2>
              <div className="prose prose-slate max-w-none">
                <p>
                  O Puncto é uma plataforma completa de gestão para negócios de
                  serviços, incluindo salões de beleza, restaurantes, clínicas e
                  outros estabelecimentos que dependem de agendamentos e atendimento
                  presencial.
                </p>
                <p>
                  Fundado em 2023, o Puncto nasceu da necessidade de pequenos e
                  médios negócios brasileiros por uma solução integrada que
                  substituísse múltiplas ferramentas fragmentadas. A plataforma
                  oferece agendamento online, pagamentos, gestão de equipe,
                  controle de estoque e muito mais em uma única solução.
                </p>
                <p>
                  O Puncto está transformando a forma como pequenos negócios 
                  brasileiros operam, oferecendo uma solução integrada que reduz 
                  no-shows, aumenta receita e melhora a experiência dos clientes.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-6">Dados da Empresa</h3>
              <div className="grid grid-cols-2 gap-4">
                {companyFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="bg-slate-50 rounded-xl p-4"
                  >
                    <p className="text-sm text-slate-500">{fact.label}</p>
                    <p className="text-xl font-bold text-slate-900">{fact.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-primary-50 rounded-xl">
                <h3 className="font-semibold text-primary-900 mb-2">
                  Contato para Imprensa
                </h3>
                <p className="text-primary-700 mb-4">
                  Para entrevistas, informações ou acesso antecipado a novidades:
                </p>
                <p className="font-medium text-primary-900">
                  suporte@puncto.com.br
                </p>
                <p className="text-primary-700 text-sm mt-2">
                  Respondemos em até 24 horas úteis
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Media Assets */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <div className="text-center mb-12">
            <h2 className="heading-lg text-slate-900 mb-4">
              Materiais para Download
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Logos, screenshots e materiais de marca para uso em publicações.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaAssets.map((asset) => (
              <div
                key={asset.name}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-soft transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {asset.format}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{asset.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{asset.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{asset.size}</span>
                  <a
                    href={asset.url}
                    download
                    className="text-primary-600 font-medium text-sm hover:text-primary-700"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Guidelines Preview */}
      <section className="section bg-white">
        <div className="container-marketing">
          <div className="text-center mb-12">
            <h2 className="heading-lg text-slate-900 mb-4">
              Diretrizes de Marca
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Por favor, siga estas diretrizes ao usar nossa marca.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Logo usage */}
            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="font-semibold text-slate-900 mb-6">Uso do Logo</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                  <div className="text-2xl font-bold text-primary-600">Puncto</div>
                </div>
                <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-center">
                  <div className="text-2xl font-bold text-white">Puncto</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Use o logo em sua forma original
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mantenha espaço livre ao redor
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Não distorça ou altere as cores
                </li>
              </ul>
            </div>

            {/* Colors */}
            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="font-semibold text-slate-900 mb-6">Cores da Marca</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-600 rounded-xl" />
                  <div>
                    <p className="font-medium text-slate-900">Primary Blue</p>
                    <p className="text-sm text-slate-500">#0284c7</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-secondary-500 rounded-xl" />
                  <div>
                    <p className="font-medium text-slate-900">Secondary Green</p>
                    <p className="text-sm text-slate-500">#22c55e</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-accent-500 rounded-xl" />
                  <div>
                    <p className="font-medium text-slate-900">Accent Orange</p>
                    <p className="text-sm text-slate-500">#f97316</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="section bg-slate-50">
        <div className="container-marketing">
          <div className="text-center mb-12">
            <h2 className="heading-lg text-slate-900 mb-4">
              Comunicados de Imprensa
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Últimas notícias e anúncios oficiais do Puncto.
            </p>
          </div>

          {pressReleases.length > 0 ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {pressReleases.map((release) => (
                <div
                  key={release.date}
                  className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-soft transition-shadow"
                >
                  <time className="text-sm text-slate-500">
                    {new Date(release.date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                  <h3 className="font-semibold text-slate-900 mt-2 mb-2">
                    {release.title}
                  </h3>
                  <p className="text-slate-600 text-sm">{release.excerpt}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto text-center py-12">
              <p className="text-slate-600 mb-4">
                Comunicados de imprensa serão publicados aqui quando disponíveis.
              </p>
              <p className="text-sm text-slate-500">
                Para solicitações de imprensa, entre em contato através do email abaixo.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section bg-primary-600 text-white">
        <div className="container-marketing text-center">
          <h2 className="heading-lg text-white mb-4">
            Precisa de mais informações?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Nossa equipe de comunicação está disponível para entrevistas,
            dados exclusivos e acesso antecipado a novidades.
          </p>
          <a
            href="mailto:suporte@puncto.com.br"
            className="btn bg-white text-primary-600 hover:bg-primary-50"
          >
            Entrar em Contato
          </a>
        </div>
      </section>
    </>
  );
}
