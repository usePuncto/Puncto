'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const legalPages = [
  { href: '/legal/terms', label: 'Termos de Uso' },
  { href: '/legal/privacy', label: 'Privacidade' },
  { href: '/legal/lgpd', label: 'LGPD' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/accessibility', label: 'Acessibilidade' },
];

interface LegalPageLayoutProps {
  title: string;
  updated?: string;
  description?: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({
  title,
  updated,
  description,
  children,
}: LegalPageLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="legal-page">
      <div className="legal-page-container">
        {/* Navigation to other legal pages */}
        <nav className="legal-nav" aria-label="Documentos legais">
          {legalPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className={`legal-nav-link ${pathname === page.href ? 'active' : ''}`}
            >
              {page.label}
            </Link>
          ))}
        </nav>

        {/* Page header */}
        <header className="legal-page-header">
          <h1 className="legal-page-title">{title}</h1>
          {updated && (
            <p className="legal-page-updated">Última atualização: {updated}</p>
          )}
          {description && (
            <p className="text-slate-600 mt-4 max-w-2xl">{description}</p>
          )}
        </header>

        {/* Content with consistent section styling */}
        <article className="legal-section space-y-10">
          {children}
        </article>

        {/* Related documents */}
        <div className="legal-related">
          <h3>Documentos relacionados</h3>
          <ul>
            {legalPages
              .filter((page) => page.href !== pathname)
              .map((page) => (
                <li key={page.href}>
                  <Link href={page.href}>{page.label}</Link>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
