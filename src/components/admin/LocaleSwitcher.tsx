'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';

export function LocaleSwitcher() {
  const { business } = useBusiness();
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState<'pt-BR' | 'en-US' | 'es-ES'>(
    (business?.settings?.locale as 'pt-BR' | 'en-US' | 'es-ES') || 'pt-BR'
  );

  useEffect(() => {
    if (business?.settings?.locale) {
      setCurrentLocale(business.settings.locale as 'pt-BR' | 'en-US' | 'es-ES');
    }
  }, [business]);

  const handleLocaleChange = async (newLocale: 'pt-BR' | 'en-US' | 'es-ES') => {
    try {
      // Update business locale in database
      const response = await fetch(`/api/settings?businessId=${business?.id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          settings: {
            ...business?.settings,
            locale: newLocale,
          },
        }),
      });

      if (response.ok) {
        setCurrentLocale(newLocale);
        // Reload page to apply new locale
        router.refresh();
      }
    } catch (error) {
      console.error('Error updating locale:', error);
    }
  };

  const locales = [
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  ] as const;

  return (
    <div className="relative">
      <select
        value={currentLocale}
        onChange={(e) => handleLocaleChange(e.target.value as 'pt-BR' | 'en-US' | 'es-ES')}
        className="appearance-none bg-white border border-neutral-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.flag} {locale.label}
          </option>
        ))}
      </select>
    </div>
  );
}
