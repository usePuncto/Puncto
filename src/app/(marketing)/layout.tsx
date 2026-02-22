import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';
import CookieConsent from '@/components/marketing/CookieConsent';
// import ExitIntentPopup from '@/components/marketing/ExitIntentPopup'; // Temporarily disabled
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import FacebookPixel from '@/components/analytics/FacebookPixel';
import HotjarAnalytics, { ClarityAnalytics } from '@/components/analytics/HotjarAnalytics';
import LinkedInInsightTag from '@/components/analytics/LinkedInInsightTag';
import { JsonLd, generateOrganizationSchema, generateWebsiteSchema } from '@/lib/seo/jsonld';

export const metadata = {
  title: {
    default: 'Puncto - Plataforma Completa de Gestão para seu Negócio',
    template: '%s | Puncto',
  },
  description:
    'Simplifique agendamentos, pagamentos, gestão de equipe e muito mais. Tudo em uma única plataforma para salões, restaurantes, clínicas e mais.',
  keywords: [
    'agendamento online',
    'gestão de salão',
    'sistema para restaurante',
    'controle de ponto',
    'pagamentos',
    'PIX',
    'gestão de negócios',
    'SaaS Brasil',
  ],
  authors: [{ name: 'Puncto' }],
  creator: 'Puncto',
  publisher: 'Puncto',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://puncto.com.br'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Puncto - Plataforma Completa de Gestão para seu Negócio',
    description:
      'Simplifique agendamentos, pagamentos, gestão de equipe e muito mais. Tudo em uma única plataforma.',
    url: 'https://puncto.com.br',
    siteName: 'Puncto',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Puncto - Gestão Simplificada',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Puncto - Plataforma Completa de Gestão',
    description: 'Simplifique agendamentos, pagamentos e gestão de equipe.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Analytics */}
      <GoogleAnalytics />
      <FacebookPixel />
      <HotjarAnalytics />
      <ClarityAnalytics />
      <LinkedInInsightTag />
      
      {/* JSON-LD Structured Data */}
      <JsonLd data={generateOrganizationSchema()} />
      <JsonLd data={generateWebsiteSchema()} />
      
      <Header />
      <main className="flex-1 pt-16 md:pt-20">{children}</main>
      <Footer />
      
      {/* Cookie Consent Banner */}
      <CookieConsent />
      
      {/* Exit Intent Popup - Temporarily disabled */}
      {/* <ExitIntentPopup /> */}
    </div>
  );
}
