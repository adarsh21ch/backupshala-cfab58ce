import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Navigate, Link } from 'react-router-dom';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';

const LEGAL = {
  entity: 'Nevorai Technologies',
  gstin: '23CBCPC3986J1ZN',
  state: 'Madhya Pradesh, India',
  email: 'support@backupshala.com',
  site: 'backupshala.com',
  hsn: '999293',
};

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
  const paidDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Pending';

  // GST split — CGST 9% + SGST 9% (intra-state, MP)
  const total = Number(payment.amount_total) || 0;
  const base = Number(payment.base_amount) || +(total / 1.18).toFixed(2);
  const gst = Number(payment.gst_amount) || +(total - base).toFixed(2);
  const cgst = +(gst / 2).toFixed(2);
  const sgst = +(gst / 2).toFixed(2);

  const invoiceYear = payment.paid_at ? new Date(payment.paid_at).getFullYear() : new Date().getFullYear();
  const invoiceNumber = payment.invoice_number || `BSH-${invoiceYear}-${payment.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
        </Button>
        <Button size="sm" onClick={() => window.print()} className="bg-accent hover:bg-accent/90">
          <Printer className="h-4 w-4 mr-2" /> Download Invoice
        </Button>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 print:py-4 print:px-0 overflow-x-auto">
        <div className="rounded-xl border border-border bg-card p-8 shadow-warm print:shadow-none print:border-0 print:bg-white print:text-black min-w-[480px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="font-heading text-2xl font-800">
                <span className="text-primary print:text-green-600">Backup</span>
                <span className="text-accent print:text-orange-500">shala</span>
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1 print:text-gray-600">
                A product of {LEGAL.entity}
              </p>
              <div className="text-[11px] text-muted-foreground mt-2 leading-snug print:text-gray-600">
                <p className="font-semibold text-foreground print:text-black">{LEGAL.entity}</p>
                <p>GSTIN: {LEGAL.gstin}</p>
                <p>{LEGAL.state}</p>
                <p>{LEGAL.email}</p>
                <p>{LEGAL.site}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground print:text-gray-700">TAX INVOICE</p>
              <p className="font-heading font-700 text-sm mt-1">{invoiceNumber}</p>
              <p className="text-[11px] text-muted-foreground mt-1 print:text-gray-600">Date: {paidDate}</p>
              {payment.razorpay_payment_id && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono print:text-gray-600">
                  Pay ID: {payment.razorpay_payment_id}
                </p>
              )}
            </div>
          </div>

          <hr className="border-border mb-5 print:border-gray-300" />

          {/* Buyer */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 print:text-gray-500">Billed To</p>
            <p className="font-semibold text-sm">{profile?.full_name || 'Student'}</p>
            <p className="text-sm text-muted-foreground print:text-gray-600">{profile?.email}</p>
            {profile?.phone && <p className="text-sm text-muted-foreground print:text-gray-600">{profile.phone}</p>}
          </div>

          {/* Item */}
          <div className="rounded-lg border border-border p-4 mb-5 print:border-gray-300">
            <div className="flex justify-between items-start gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{course?.title || 'Course Enrollment'}</p>
                <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">
                  {upgrade
                    ? `Tier upgrade: ${upgrade.from_tier} → ${upgrade.to_tier}`
                    : course?.course_tier === 'advanced'
                      ? 'Advanced tier enrollment'
                      : course?.course_tier === 'basic'
                        ? 'Basic tier enrollment'
                        : 'Digital course enrollment'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 print:text-gray-600">
                  HSN/SAC: <span className="font-mono">{LEGAL.hsn}</span> · Online educational content delivery services
                </p>
              </div>
              <p className="font-heading font-700 whitespace-nowrap">{formatPrice(total)}</p>
            </div>
          </div>

          {/* Tax breakdown */}
          <div className="space-y-1.5 mb-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">Base Amount (excl. GST)</span>
              <span>{formatPrice(base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">CGST @ 9%</span>
              <span>{formatPrice(cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">SGST @ 9%</span>
              <span>{formatPrice(sgst)}</span>
            </div>
            <hr className="border-border my-2 print:border-gray-300" />
            <div className="flex justify-between font-heading font-700 text-base">
              <span>Total Amount Paid</span>
              <span className="text-primary print:text-green-600">{formatPrice(total)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground text-right mt-1 print:text-gray-500">
              Place of supply: {LEGAL.state} (Intra-state — CGST + SGST)
            </p>
          </div>

          {/* Payment meta */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 print:bg-gray-50">
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">Order ID</span>
              <span className="font-mono">{payment.razorpay_order_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">Currency</span>
              <span>{payment.currency || 'INR'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">Payment Status</span>
              <span className={payment.status === 'paid' ? 'text-primary font-semibold print:text-green-600' : 'text-accent'}>
                {payment.status === 'paid' ? 'PAID ✓' : payment.status}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-[11px] text-muted-foreground print:text-gray-500 space-y-1">
            <p className="font-semibold text-foreground print:text-black">Backupshala is a product of {LEGAL.entity}</p>
            <p>GSTIN: {LEGAL.gstin} · {LEGAL.state}</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p className="pt-2">Thank you for learning with Backupshala! 🎓</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
