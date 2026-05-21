'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PaymentGuardProps {
  children: React.ReactNode;
  businessId: string;
}

export default function PaymentGuard({ children, businessId }: PaymentGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'active' | 'pending_payment' | 'suspended' | null>(null);

  useEffect(() => {
    async function checkPaymentStatus() {
      if (authLoading) return;

      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        // Fetch business subscription status
        const businessRef = doc(db, 'businesses', businessId);
        const businessSnap = await getDoc(businessRef);

        if (!businessSnap.exists()) {
          console.error('Business not found');
          setLoading(false);
          return;
        }

        const businessData = businessSnap.data();
        const subscriptionStatus = businessData?.subscription?.status;

        setPaymentStatus(subscriptionStatus);

        // Redirect if payment is pending
        if (subscriptionStatus === 'pending_payment') {
          const checkoutSessionId = businessData?.subscription?.stripeCheckoutSessionId;

          // Redirect back to payment flow
          router.push(`/onboarding/payment?businessId=${businessId}&sessionId=${checkoutSessionId}`);
          return;
        }

        if (subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled') {
          const params = new URLSearchParams({ subscriptionEnded: '1', subdomain: businessId });
          params.set('app', 'gestao');
          router.push(`/auth/login?${params.toString()}`);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking payment status:', error);
        setLoading(false);
      }
    }

    checkPaymentStatus();
  }, [user, authLoading, businessId, router]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Verificando status do pagamento...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'pending_payment' || paymentStatus === 'suspended') {
    return null; // Will redirect
  }

  return <>{children}</>;
}
