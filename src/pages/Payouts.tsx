import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Wallet, Loader2, IndianRupee } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import BackButton from '@/components/BackButton';

const Payouts = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const walletBalance = profile?.wallet_balance || 0;
  const canRequest = walletBalance >= 500;

  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'upi'>('upi');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['my-payouts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user!.id)
        .eq('request_type', 'student_commission')
        .order('requested_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const submitPayout = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt < 500) throw new Error('Minimum payout is ₹500');
      if (amt > walletBalance) throw new Error('Amount exceeds wallet balance');

      const record: any = {
        user_id: user!.id,
        request_type: 'student_commission',
        amount: amt,
      };

      if (paymentMethod === 'upi') {
        if (!upiId.trim()) throw new Error('UPI ID is required');
        record.upi_id = upiId.trim();
      } else {
        if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) {
          throw new Error('All bank details are required');
        }
        record.bank_name = bankName.trim();
        record.account_holder_name = accountHolder.trim();
        record.account_number = accountNumber.trim();
        record.ifsc_code = ifscCode.trim();
      }

      const { error } = await supabase.from('payout_requests').insert(record);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Payout request submitted! 🎉' });
      queryClient.invalidateQueries({ queryKey: ['my-payouts'] });
      refreshProfile();
      setAmount('');
      setUpiId('');
      setBankName('');
      setAccountHolder('');
      setAccountNumber('');
      setIfscCode('');
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent/10 text-accent';
      case 'approved': case 'processing': return 'bg-blue-500/10 text-blue-400';
      case 'paid': return 'bg-primary/10 text-primary';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <BackButton fallback="/dashboard" />
        <h1 className="font-heading text-2xl font-700">Payout Requests</h1>

        {/* Wallet Balance */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="font-heading text-3xl font-800 text-primary">{formatPrice(walletBalance)}</p>
          {!canRequest && (
            <p className="mt-2 text-xs text-muted-foreground">Minimum payout: ₹500. You need {formatPrice(500 - walletBalance)} more.</p>
          )}
        </div>

        {/* Payout Form */}
        {canRequest && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-heading text-base font-600">Request Payout</h2>

            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Max ${walletBalance}`}
                min={500}
                max={walletBalance}
                className="mt-1 rounded-lg"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${paymentMethod === 'upi' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                >
                  UPI
                </button>
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${paymentMethod === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                >
                  Bank Transfer
                </button>
              </div>
            </div>

            {paymentMethod === 'upi' ? (
              <div>
                <Label>UPI ID</Label>
                <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="mt-1 rounded-lg" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Bank Name</Label>
                  <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="State Bank of India" className="mt-1 rounded-lg" />
                </div>
                <div>
                  <Label>Account Holder Name</Label>
                  <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="Full name" className="mt-1 rounded-lg" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" className="mt-1 rounded-lg" />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} placeholder="SBIN0001234" className="mt-1 rounded-lg" />
                </div>
              </div>
            )}

            <Button
              onClick={() => submitPayout.mutate()}
              disabled={submitPayout.isPending}
              className="w-full rounded-md bg-primary hover:bg-primary/90 font-semibold"
            >
              {submitPayout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Payout Request'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Payouts processed within 3-5 business days.</p>
          </div>
        )}

        {/* Payout History */}
        <div>
          <h2 className="font-heading text-base font-600 mb-4">Payout History</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : payouts && payouts.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Method</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payouts.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-xs">{new Date(p.requested_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{formatPrice(p.amount)}</td>
                        <td className="px-4 py-3 text-xs">{p.upi_id ? 'UPI' : 'Bank'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{p.processed_at ? new Date(p.processed_at).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border">
                {payouts.map(p => (
                  <div key={p.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{formatPrice(p.amount)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.upi_id ? 'UPI' : 'Bank Transfer'}</span>
                      <span>{new Date(p.requested_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No payout requests yet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Payouts;
