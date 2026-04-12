import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Loader2, IndianRupee, Info } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/format';
import BackButton from '@/components/BackButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const Wallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['my-wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate available vs pending
  const now = new Date();
  const availableBalance = transactions?.filter(t =>
    t.type === 'credit' && t.status === 'completed' &&
    (!t.available_after || new Date(t.available_after) <= now)
  ).reduce((s, t) => s + Number(t.amount), 0) || 0;

  const pendingDebits = transactions?.filter(t =>
    (t.type === 'debit' || t.type === 'withdrawal') && t.status === 'pending'
  ).reduce((s, t) => s + Number(t.amount), 0) || 0;

  const totalDebits = transactions?.filter(t =>
    (t.type === 'debit' || t.type === 'withdrawal') && t.status === 'completed'
  ).reduce((s, t) => s + Number(t.amount), 0) || 0;

  const pendingCredits = transactions?.filter(t =>
    t.type === 'credit' && t.status === 'completed' &&
    t.available_after && new Date(t.available_after) > now
  ).reduce((s, t) => s + Number(t.amount), 0) || 0;

  const actualAvailable = Math.max(0, availableBalance - totalDebits - pendingDebits);
  const canWithdraw = actualAvailable >= 500;

  const filteredTx = transactions?.filter(t => {
    if (filter === 'credits') return t.type === 'credit';
    if (filter === 'withdrawals') return t.type === 'debit' || t.type === 'withdrawal';
    return true;
  }) || [];

  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt < 500) throw new Error('Minimum withdrawal is ₹500');
      if (amt > actualAvailable) throw new Error('Amount exceeds available balance');
      if (paymentMethod === 'bank' && accountNumber !== confirmAccount) throw new Error('Account numbers do not match');

      const record: any = {
        user_id: user!.id,
        request_type: 'wallet_withdrawal',
        amount: amt,
      };

      if (paymentMethod === 'upi') {
        if (!upiId.trim()) throw new Error('UPI ID is required');
        record.upi_id = upiId.trim();
      } else {
        if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) throw new Error('All bank details required');
        record.bank_name = bankName.trim();
        record.account_holder_name = accountHolder.trim();
        record.account_number = accountNumber.trim();
        record.ifsc_code = ifscCode.trim();
      }

      const { error } = await supabase.from('payout_requests').insert(record);
      if (error) throw error;

      // Deduct from wallet immediately (reserve)
      if (wallet) {
        await supabase.from('wallets').update({
          balance: Math.max(0, Number(wallet.balance) - amt),
        }).eq('id', wallet.id);

        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          user_id: user!.id,
          type: 'debit',
          amount: amt,
          source: 'withdrawal_processed',
          description: `Withdrawal request of ₹${amt} via ${paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}`,
          status: 'pending',
        });
      }
    },
    onSuccess: () => {
      toast({ title: 'Withdrawal request submitted! 🎉', description: 'We\'ll process it within 3-5 business days.' });
      setShowWithdraw(false);
      setAmount('');
      setUpiId('');
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <BackButton fallback="/dashboard" />
        <h1 className="font-heading text-2xl font-700">My Wallet</h1>

        {/* Balance Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-xs text-muted-foreground">Current Balance</p>
          <p className="font-heading text-3xl font-800 text-primary">{formatPrice(wallet?.balance || 0)}</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Available:</span>
              <span className="font-semibold text-primary">{formatPrice(actualAvailable)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Pending (held):</span>
              <span className="font-semibold text-accent">{formatPrice(pendingCredits)}</span>
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent>This amount is held temporarily and will be available in a few days</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>Total Earned: {formatPrice(wallet?.total_earned || 0)}</span>
            <span>Total Withdrawn: {formatPrice(wallet?.total_withdrawn || 0)}</span>
          </div>
          <Button
            className="mt-4 w-full sm:w-auto rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            disabled={!canWithdraw}
            onClick={() => setShowWithdraw(true)}
          >
            {canWithdraw ? 'Withdraw' : `Minimum ₹500 (you have ₹${Math.round(actualAvailable)})`}
          </Button>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-600">Transaction History</h2>
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>
          </Tabs>

          {txLoading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : filteredTx.length > 0 ? (
            <>
              {/* Desktop */}
              <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTx.map(t => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-xs">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs">{t.description}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.type === 'credit' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs font-semibold text-right ${t.type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                          {t.type === 'credit' ? '+' : '-'}{formatPrice(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.status === 'completed' ? 'bg-primary/10 text-primary' : t.status === 'pending' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2 mt-4">
                {filteredTx.map(t => (
                  <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium line-clamp-1 flex-1">{t.description}</p>
                      <span className={`text-sm font-bold ${t.type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                        {t.type === 'credit' ? '+' : '-'}{formatPrice(t.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{timeAgo(t.created_at)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center mt-4">
              <WalletIcon className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Your wallet is empty. Refer a course to start earning!</p>
            </div>
          )}
        </div>

        {/* Withdrawal Modal */}
        <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
              <DialogDescription>Available Balance: {formatPrice(actualAvailable)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount to withdraw (₹)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Min ₹500, Max ₹${Math.round(actualAvailable)}`}
                  min={500}
                  max={actualAvailable}
                  className="mt-1"
                />
                {Number(amount) > 0 && Number(amount) < 500 && (
                  <p className="text-xs text-destructive mt-1">Minimum withdrawal is ₹500</p>
                )}
              </div>

              <div>
                <Label>Payment Method</Label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setPaymentMethod('upi')} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${paymentMethod === 'upi' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>UPI</button>
                  <button onClick={() => setPaymentMethod('bank')} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${paymentMethod === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>Bank Transfer</button>
                </div>
              </div>

              {paymentMethod === 'upi' ? (
                <div>
                  <Label>UPI ID</Label>
                  <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="mt-1" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div><Label>Account Holder Name</Label><Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="mt-1" /></div>
                  <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1" /></div>
                  <div><Label>Confirm Account Number</Label><Input value={confirmAccount} onChange={e => setConfirmAccount(e.target.value)} className="mt-1" /></div>
                  <div><Label>IFSC Code</Label><Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} className="mt-1" /></div>
                  <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1" /></div>
                </div>
              )}

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                <p className="text-xs text-muted-foreground">
                  Withdrawals are processed within 3-5 business days. You will receive a notification once processed.
                </p>
              </div>

              <Button
                onClick={() => submitWithdrawal.mutate()}
                disabled={submitWithdrawal.isPending || Number(amount) < 500 || Number(amount) > actualAvailable}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                {submitWithdrawal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Withdrawal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
