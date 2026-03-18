'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/marketing/Logo';

export default function SignupPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Logo / Brand */}
          <div className="mb-8 flex justify-center">
            <Logo variant="light" />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-slate-600 mb-10"
          >
            Acesse sua conta ou explore nossas soluções
          </motion.p>

          {/* Primary CTA - Login */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Link
              href="/auth/login"
              className="group flex items-center justify-center gap-3 w-full rounded-2xl bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/25 transition-all duration-200 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5"
            >
              <span>Entrar na minha conta</span>
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4 my-8"
          >
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </motion.div>

          {/* Secondary - Explore Industries */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <p className="text-sm text-slate-500 mb-4">
              Ainda não está registrado?
            </p>
            <Link
              href="/industries"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
            >
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Explore nossas indústrias
            </Link>
          </motion.div>

          {/* Back to home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Voltar ao início
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
