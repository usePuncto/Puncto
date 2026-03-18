'use client';

import { useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { Branding } from '@/types/business';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { business } = useBusiness();
  const branding = business?.branding || { gallery: [] };

  useEffect(() => {
    if (!branding) return;

    // Apply CSS variables for colors (public booking page uses these)
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor || '#171717');
    root.style.setProperty('--brand-secondary', branding.secondaryColor || '#525252');

    // Inject custom CSS (white-label)
    const styleId = 'puncto-custom-branding';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    if (branding.customCSS) {
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = branding.customCSS;
    } else if (styleElement) {
      styleElement.textContent = '';
    }

    // Update favicon
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }

    // Cleanup
    return () => {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
    };
  }, [branding]);

  return <>{children}</>;
}

export function PunctoBranding({ branding }: { branding?: Branding }) {
  if (branding?.hidePunctoBranding) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 text-xs text-neutral-400 z-10">
      Powered by{' '}
      <a href="https://puncto.app" target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-neutral-900">
        Puncto
      </a>
    </div>
  );
}
