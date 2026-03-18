'use client';

import { PlatformWhatsAppChat } from '@/components/platform/WhatsAppChat';

export default function PlatformWhatsAppPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">WhatsApp</h1>
      <p className="mb-6 text-gray-600">
        Envie e receba mensagens do WhatsApp pela API em nuvem da Meta.
      </p>
      <PlatformWhatsAppChat />
    </div>
  );
}
