import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/**
 * One-click checkout for a live pricing tier.
 * Resolves the platform course linked to the tier slug, then opens Razorpay
 * directly. The server resolves the real price from pricing_tiers.
 */
export const useTierCheckout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const enroll = useCallback(async (tierSlug: string) => {
    if (!user) {
      navigate(`/signup?redirect=/pricing`);
      return;
    }
    setPendingSlug(tierSlug);
    try {
      // Find the published platform course linked to this tier.
      const { data: course } = await supabase
        .from('courses')
        .select('id, title, slug, creator_id')
        .eq('tier_slug', tierSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (!course) {
        toast({ title: 'Not available yet', description: 'This tier has no course assigned yet.', variant: 'destructive' });
        return;
      }

      // Already enrolled?
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();
      if (existing) { navigate('/courses'); return; }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load payment gateway');

      const { getStoredRef } = await import('@/lib/referralTracking');
      const refUsername = getStoredRef();

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { course_id: course.id, ref_username: refUsername || undefined },
      });
      if (orderError || orderData?.error) {
        throw new Error(orderData?.error || orderError?.message || 'Failed to create order');
      }

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Backupshala',
        description: orderData.course_title,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#16a34a' },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                course_id: course.id,
              },
            });
            if (verifyError || !verifyData?.success) throw new Error(verifyData?.error || 'Verification failed');
            toast({ title: 'Enrollment confirmed!', description: 'Redirecting to your courses…' });
            setTimeout(() => navigate('/courses'), 1500);
          } catch (err: any) {
            toast({ title: 'Payment verification failed', description: err.message, variant: 'destructive' });
          } finally {
            setPendingSlug(null);
          }
        },
        modal: { ondismiss: () => setPendingSlug(null) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast({ title: 'Payment failed', description: resp.error?.description || 'Please try again.', variant: 'destructive' });
        setPendingSlug(null);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setPendingSlug(null);
    }
  }, [user, profile, navigate, toast]);

  return { enroll, pendingSlug };
};
