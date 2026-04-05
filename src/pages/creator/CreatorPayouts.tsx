import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';

const CreatorPayouts = () => {
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
    queryKey: ['creator-payouts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user!.id)
        .eq('request_type', 'creator_earnings')
        .order('requested_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const submitPayout = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt < 500) throw new Error('Minimum payout is ₹500');
      if (amt > walletBalance) throw new Error('Amount exceeds balance');
      const record: any = { user_id: user!.id, request_type: 'creator_earnings', amount: amt };
      if (paymentMethod === 'upi') {
        if (!upiId.trim()) throw new Error('UPI ID required');
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upiId.trim())) throw new Error('Invalid UPI ID format (e.g. name@bank)');
        record.upi_id = upiId.trim();
      } else {
        if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) throw new Error('All bank details required');
        if (!/^\d{9,18}$/.test(accountNumber.trim())) throw new Error('Account number must be 9-18 digits');
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim())) throw new Error('Invalid IFSC code format (e.g. SBIN0001234)');
        record.bank_name = bankName.trim(); record.account_holder_name = accountHolder.trim();
        record.account_number = accountNumber.trim(); record.ifsc_code = ifscCode.trim();
      }
      const { error } = await supabase.from('payout_requests').insert(record);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Payout request submitted! 🎉' });
      queryClient.invalidateQueries({ queryKey: ['creator-payouts'] });
      refreshProfile();
      setAmount(''); setUpiId(''); setBankName(''); setAccountHolder(''); setAccountNumber(''); setIfscCode('');
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
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
    <CreatorDashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-heading text-2xl font-700">Creator Payouts</h1>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
          <p className="text-xs text-muted-foreground">Available Creator Earnings</p>
          <p className="font-heading text-3xl font-800 text-accent">{formatPrice(walletBalance)}</p>
          {!canRequest && <p className="mt-2 text-xs text-muted-foreground">Min ₹500. Need {formatPrice(500 - walletBalance)} more.</p>}
        </div>

        {canRequest && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-heading text-base font-600">Request Payout</h2>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={500} max={walletBalance} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <div className="flex gap-2 mt-1">
                {(['upi', 'bank'] as const).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${paymentMethod === m ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {m === 'upi' ? 'UPI' : 'Bank Transfer'}
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod === 'upi' ? (
              <div><Label>UPI ID</Label><Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="mt-1 rounded-lg" /></div>
            ) : (
              <div className="space-y-3">
                <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1 rounded-lg" /></div>
                <div><Label>Account Holder</Label><Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="mt-1 rounded-lg" /></div>
                <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1 rounded-lg" /></div>
                <div><Label>IFSC Code</Label><Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} className="mt-1 rounded-lg" /></div>
              </div>
            )}
            <Button onClick={() => submitPayout.mutate()} disabled={submitPayout.isPending} className="w-full rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              {submitPayout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Processed within 3-5 business days.</p>
          </div>
        )}

        <div>
          <h2 className="font-heading text-base font-600 mb-4">Payout History</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" /></div>
          ) : payouts && payouts.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {payouts.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{formatPrice(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString('en-IN')} • {p.upi_id ? 'UPI' : 'Bank'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No payout requests yet.</p>
            </div>
          )}
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorPayouts;
