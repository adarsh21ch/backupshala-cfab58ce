import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Navigate, Link } from 'react-router-dom';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';

const Receipt = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { user, loading: authLoading } = useAuth();

  const { data: payment, isLoading } = useQuery({
    queryKey: ['receipt', paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, courses(title, slug, course_tier)')
        .eq('id', paymentId!)
        .eq('student_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!paymentId,
  });

  const { data: upgrade } = useQuery({
    queryKey: ['receipt-upgrade', paymentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_upgrades')
        .select('id, from_tier, to_tier, amount_paid')
        .eq('upgrade_payment_id', paymentId!)
        .maybeSingle();
      return data;
    },
    enabled: !!paymentId,
  });

  const { data: profile } = useQuery({
    queryKey: ['receipt-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name, email, phone').eq('id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-700 mb-2">Receipt not found</h1>
          <p className="text-muted-foreground text-sm mb-4">This receipt doesn't exist or you don't have access.</p>
          <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const course = (payment as any).courses;
  const paidDate = payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Pending';

  return (
    <div className="min-h-screen bg-background">
      {/* Print controls - hidden in print */}
      <div className="print:hidden sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
        </Button>
        <Button size="sm" onClick={() => window.print()} className="bg-accent hover:bg-accent/90">
          <Printer className="h-4 w-4 mr-2" /> Download Receipt
        </Button>
      </div>

      {/* Receipt content */}
      <div className="mx-auto max-w-2xl px-4 py-8 print:py-4 print:px-0">
        <div className="rounded-xl border border-border bg-card p-8 shadow-warm print:shadow-none print:border-0 print:bg-white print:text-black">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-heading text-2xl font-800">
                <span className="text-primary print:text-green-600">Backup</span>
                <span className="text-accent print:text-orange-500">shala</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">Digital Skills Education Platform</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground print:text-gray-500">TAX INVOICE</p>
              <p className="font-heading font-700 text-sm mt-1">{payment.invoice_number || `INV-${payment.id.slice(0, 8).toUpperCase()}`}</p>
              <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">{paidDate}</p>
            </div>
          </div>

          <hr className="border-border mb-6 print:border-gray-300" />

          {/* Buyer info */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 print:text-gray-500">Bill To</p>
            <p className="font-semibold text-sm">{profile?.full_name || 'Student'}</p>
            <p className="text-sm text-muted-foreground print:text-gray-500">{profile?.email}</p>
            {profile?.phone && <p className="text-sm text-muted-foreground print:text-gray-500">{profile.phone}</p>}
          </div>

          {/* Course details */}
          <div className="rounded-lg border border-border p-4 mb-6 print:border-gray-300">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 print:text-gray-500">Item</p>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{course?.title || 'Course'}</p>
                <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                  {upgrade
                    ? `Tier upgrade: ${upgrade.from_tier} → ${upgrade.to_tier}`
                    : course?.course_tier === 'advanced'
                      ? 'Advanced tier enrollment'
                      : course?.course_tier === 'basic'
                        ? 'Basic tier enrollment'
                        : 'Digital course enrollment'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {upgrade ? (
                    <span className="rounded-md bg-info/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info print:bg-blue-50 print:text-blue-700">
                      Upgrade
                    </span>
                  ) : course?.course_tier ? (
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      course.course_tier === 'advanced'
                        ? 'bg-info/15 text-info print:bg-blue-50 print:text-blue-700'
                        : 'bg-primary/15 text-primary print:bg-green-50 print:text-green-700'
                    }`}>
                      {course.course_tier}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="font-heading font-700 whitespace-nowrap">{formatPrice(payment.amount_total)}</p>
            </div>
          </div>

          {/* Amount breakdown */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground print:text-gray-500">Base Amount</span>
              <span>{formatPrice(payment.base_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground print:text-gray-500">GST (18%)</span>
              <span>{formatPrice(payment.gst_amount)}</span>
            </div>
            <hr className="border-border print:border-gray-300" />
            <div className="flex justify-between font-heading font-700">
              <span>Total Paid</span>
              <span className="text-primary print:text-green-600">{formatPrice(payment.amount_total)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="rounded-lg bg-muted/50 p-4 text-xs space-y-1 print:bg-gray-50">
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-500">Payment ID</span>
              <span className="font-mono">{payment.razorpay_payment_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-500">Order ID</span>
              <span className="font-mono">{payment.razorpay_order_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-500">Currency</span>
              <span>{payment.currency || 'INR'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-500">Status</span>
              <span className={payment.status === 'paid' ? 'text-primary font-semibold print:text-green-600' : 'text-accent'}>
                {payment.status === 'paid' ? '✓ Paid' : payment.status}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-muted-foreground print:text-gray-400">
            <p>Thank you for your purchase! 🎉</p>
            <p className="mt-1">This is a computer-generated invoice and does not require a signature.</p>
            <p className="mt-1">Backupshala — backupshala.lovable.app</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
