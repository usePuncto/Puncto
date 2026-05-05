import Constants from 'expo-constants';

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type AppExtraConfig = {
  webAppUrl: string;
  defaultSubdomain: string | null;
  appGestao: boolean;
  firebase: FirebaseWebConfig;
};

function normalizeWebAppBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function getAppExtraConfig(): AppExtraConfig {
  const extra = Constants.expoConfig?.extra as Partial<AppExtraConfig> | undefined;

  const raw = (extra?.webAppUrl || '').trim() || 'https://www.puncto.com.br';
  const webAppUrl = normalizeWebAppBaseUrl(raw);
  const sub = (extra?.defaultSubdomain || '').trim();
  const fb = extra?.firebase ?? ({} as FirebaseWebConfig);

  return {
    webAppUrl,
    defaultSubdomain: sub.length > 0 ? sub : null,
    appGestao: Boolean(extra?.appGestao),
    firebase: {
      apiKey: fb.apiKey || '',
      authDomain: fb.authDomain || '',
      projectId: fb.projectId || '',
      storageBucket: fb.storageBucket || '',
      messagingSenderId: fb.messagingSenderId || '',
      appId: fb.appId || '',
    },
  };
}
