/*
 * ExitIntentPopup - Temporarily disabled
 * This component will be re-enabled once the login/signup flow is ready.
 */

/*
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface ExitIntentPopupProps {
  delay?: number; // Delay before enabling exit intent detection (ms)
}

const EXIT_POPUP_KEY = 'puncto_exit_popup_shown';

export default function ExitIntentPopup({ delay = 5000 }: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check if popup was already shown in this session
    const alreadyShown = sessionStorage.getItem(EXIT_POPUP_KEY);
    if (alreadyShown) return;

    // Enable exit intent detection after delay
    const timer = setTimeout(() => {
      setEnabled(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves from the top of the page
      if (e.clientY <= 0 && !isVisible) {
        setIsVisible(true);
        sessionStorage.setItem(EXIT_POPUP_KEY, 'true');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [enabled, isVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Newsletter signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop *}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Popup *}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Close button *}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Content *}
              <div className="p-8">
                {!submitted ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                          />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Espere! Temos um presente
                      </h2>
                      <p className="text-slate-600">
                        Receba nosso guia gratuito com{' '}
                        <strong>10 dicas para reduzir no-shows</strong> no seu
                        negócio. Deixe seu email e enviaremos agora!
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="input"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full disabled:opacity-50"
                      >
                        {loading ? 'Enviando...' : 'Quero o Guia Grátis'}
                      </button>
                    </form>

                    <p className="text-xs text-slate-500 text-center mt-4">
                      Sem spam. Você pode cancelar a qualquer momento.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-secondary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      Pronto!
                    </h2>
                    <p className="text-slate-600 mb-6">
                      Verifique seu email para receber o guia.
                    </p>
                    <Link
                      href="/auth/signup"
                      onClick={handleClose}
                      className="btn-primary"
                    >
                      Continuar para o Cadastro
                    </Link>
                  </div>
                )}
              </div>

              {/* Footer *}
              <div className="bg-slate-50 px-8 py-4 text-center">
                <button
                  onClick={handleClose}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Não, obrigado. Talvez depois.
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
*/

export default function ExitIntentPopup() {
  return null;
}
