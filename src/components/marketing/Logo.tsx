'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LogoProps {
  variant?: 'light' | 'dark';
  showText?: boolean;
  className?: string;
}

export default function Logo({
  variant = 'light',
  showText = true,
  className = '',
}: LogoProps) {
  const isDark = variant === 'dark';
  const primaryLogoSrc = isDark ? '/logo-white.svg' : '/logo.svg';
  const fallbackLogoSrc = '/logo.svg';
  const [logoSrc, setLogoSrc] = useState(primaryLogoSrc);

  return (
    <Link
      href="/"
      className={`flex items-center ${className}`}
      aria-label="Puncto - Página inicial"
    >
      <img
        src={logoSrc}
        alt="Puncto"
        className="h-12 w-auto object-contain"
        onError={() => setLogoSrc(fallbackLogoSrc)}
      />
    </Link>
  );
}
