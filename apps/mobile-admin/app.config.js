/**
 * Variáveis: crie `apps/mobile-admin/.env` com EXPO_PUBLIC_* (mesmos valores do Firebase web do Next).
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(typeof config.extra === 'object' && config.extra !== null ? config.extra : {}),
    webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://www.puncto.com.br',
    defaultSubdomain: (process.env.EXPO_PUBLIC_TENANT_SUBDOMAIN || '').trim(),
    appGestao: ['1', 'true', 'yes'].includes(String(process.env.EXPO_PUBLIC_APP_GESTAO || '').toLowerCase()),
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    },
  },
});
