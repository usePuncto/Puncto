/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://puncto.com.br',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  
  // Exclude certain paths
  exclude: [
    '/api/*',
    '/tenant/*',
    '/auth/*',
    '/platform/*',
    '/404',
    '/500',
    '/blog', // Commented out until we have blog content
    '/blog/*', // Commented out until we have blog content
  ],
  
  // Custom transformations
  transform: async (config, path) => {
    // Set priority based on path
    let priority = 0.7;
    let changefreq = 'weekly';
    
    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/pricing' || path === '/features') {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path.startsWith('/industries/')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.startsWith('/blog/')) {
      priority = 0.6;
      changefreq = 'monthly';
    } else if (path.startsWith('/legal/')) {
      priority = 0.3;
      changefreq = 'monthly';
    }
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
  
  // Additional paths to include
  additionalPaths: async (config) => {
    const paths = [];
    
    // Add industry pages (must match `src/content/industries.ts` slugs)
    const industries = ['servicos', 'varejo', 'empresas', 'saude', 'corporativo', 'educacao'];
    industries.forEach((industry) => {
      paths.push({
        loc: `/industries/${industry}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: new Date().toISOString(),
      });
    });
    
    return paths;
  },
  
  // Robots.txt options
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/tenant/',
          '/auth/',
          '/platform/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
    ],
    additionalSitemaps: [
      'https://puncto.com.br/sitemap.xml',
    ],
  },
};
