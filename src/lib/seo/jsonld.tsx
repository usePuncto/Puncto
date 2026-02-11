// JSON-LD Structured Data generators for SEO

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Puncto',
    url: 'https://puncto.com.br',
    logo: 'https://puncto.com.br/logo.svg',
    description:
      'Plataforma SaaS completa para salões, restaurantes, clínicas e desenvolvimento customizado para grandes empresas e indústrias.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Portuguese', 'English'],
    },
    sameAs: [
      'https://discord.gg/GGX2mBejDf',
      'https://www.facebook.com/people/Puncto/61587093252643/',
      'https://www.instagram.com/usepuncto',
      'https://x.com/usepuncto',
      'https://www.tiktok.com/@usepuncto',
      'https://www.youtube.com/@usepuncto',
    ],
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Puncto',
    url: 'https://puncto.com.br',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://puncto.com.br/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Puncto',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '99',
      priceCurrency: 'BRL',
    },
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    image: article.imageUrl,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Puncto',
      logo: {
        '@type': 'ImageObject',
        url: 'https://puncto.com.br/logo.svg',
      },
    },
  };
}

export function generateLocalBusinessSchema(business: {
  name: string;
  type: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  phone: string;
  priceRange: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': business.type,
    name: business.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.postalCode,
      addressCountry: 'BR',
    },
    telephone: business.phone,
    priceRange: business.priceRange,
  };
}

// Component to inject JSON-LD into the page
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
