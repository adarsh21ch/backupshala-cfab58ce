import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export const useUpgradeFlow = (courseId: string | undefined, onSuccess?: () => void) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);

  const startUpgrade = useCallback(async () => {
    if (!user || !courseId) return;
    setPaying(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load payment gateway');

      const { data: orderData, error: orderErr } = await supabase.functions.invoke(
        'create-upgrade-order',
        { body: { course_id: courseId } },
      );
      if (orderErr || orderData?.error) {
        throw new Error(orderData?.error || orderErr?.message || 'Could not create upgrade order');
      }

      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Backupshala',
        description: `Upgrade: ${orderData.course_title}`,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email || '',
          contact: profile?.phone || '',
        },
        theme: { color: '#16a34a' },
        handler: async (response: any) => {
          try {
            const { data: verify, error: vErr } = await supabase.functions.invoke(
              'verify-upgrade-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  course_id: courseId,
                },
              },
            );
            if (vErr || !verify?.success) throw new Error(verify?.error || 'Verification failed');
            toast({ title: 'Upgrade complete! 🎉', description: 'All advanced modules unlocked.' });
            onSuccess?.();
          } catch (err: any) {
            toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast({ title: 'Payment failed', description: resp.error?.description || 'Try again', variant: 'destructive' });
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setPaying(false);
    }
  }, [user, courseId, profile, toast, onSuccess]);

  return { startUpgrade, paying };
};
