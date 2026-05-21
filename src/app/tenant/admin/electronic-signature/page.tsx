'use client';

import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useTranslations } from 'next-intl';
import {
  isHealthIndustryForElectronicSignature,
  supportsElectronicSignatureTab,
} from '@/lib/features/electronicSignature';

export default function AdminElectronicSignaturePage() {
  const { business } = useBusiness();
  const t = useTranslations('electronicSignature');
  const industry = business?.industry;
  const isHealth = isHealthIndustryForElectronicSignature(industry);

  if (!supportsElectronicSignatureTab(industry)) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <p className="text-sm text-yellow-800">{t('unavailable')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-2 text-neutral-600">{t('subtitle')}</p>
      </div>

      <div className="space-y-6">
        {isHealth ? (
          <>
            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-neutral-900">{t('health.patientTitle')}</h2>
              <p className="mt-2 text-sm text-neutral-600">{t('health.patientDescription')}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
                <li>{t('health.patientBullet1')}</li>
                <li>{t('health.patientBullet2')}</li>
                <li>{t('health.patientBullet3')}</li>
              </ul>
              <Link
                href="/tenant/admin/customers"
                className="mt-4 inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {t('health.openPatients')}
              </Link>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-neutral-900">{t('health.professionalTitle')}</h2>
              <p className="mt-2 text-sm text-neutral-600">{t('health.professionalDescription')}</p>
              <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                {t('health.professionalNote')}
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-neutral-900">{t('admin.documentsTitle')}</h2>
              <p className="mt-2 text-sm text-neutral-600">{t('admin.documentsDescription')}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
                <li>{t('admin.documentsBullet1')}</li>
                <li>{t('admin.documentsBullet2')}</li>
                <li>{t('admin.documentsBullet3')}</li>
              </ul>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-neutral-900">{t('admin.certificateTitle')}</h2>
              <p className="mt-2 text-sm text-neutral-600">{t('admin.certificateDescription')}</p>
              <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                {t('admin.certificateNote')}
              </p>
            </section>
          </>
        )}

        <section className="rounded-lg border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-sm font-semibold text-blue-900">{t('compliance.title')}</h2>
          <p className="mt-2 text-sm text-blue-800">{t('compliance.description')}</p>
        </section>
      </div>
    </div>
  );
}
