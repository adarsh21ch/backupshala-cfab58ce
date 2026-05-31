import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Wallet as WalletIcon, Info } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/format';
import BackButton from '@/components/BackButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';
import AutoPayoutCard from '@/components/wallet/AutoPayoutCard';

const Wallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [filter, setFilter] = useState('all');

  const { data: wallet } = useQuery({
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

  // Authoritative withdrawable balance (single source of truth, shared with
  // the payout backend). Held money is excluded by the RPC.
  const { data: rpcAvailable } = useQuery({
    queryKey: ['withdrawable-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('wallet_available_balance', { _user_id: user!.id });
      return Number(data) || 0;
    },
    enabled: !!user,
  });

  // Held (pending) credits — shown separately so users understand the gap
  // between current balance and what is actually withdrawable.
  const now = new Date();
  const pendingCredits = transactions?.filter(t =>
    t.type === 'credit' && t.status === 'completed' &&
    t.available_after && new Date(t.available_after) > now
  ).reduce((s, t) => s + Number(t.amount), 0) || 0;

  const actualAvailable = Math.max(0, Number(rpcAvailable) || 0);
  const canWithdraw = actualAvailable >= 500;

  const filteredTx = transactions?.filter(t => {
    if (filter === 'credits') return t.type === 'credit';
    if (filter === 'withdrawals') return t.type === 'debit' || t.type === 'withdrawal';
    return true;
  }) || [];

  const submitWithdrawal = useMutation({
    mutationFn: async (payload: any) => {
      const amt = Number(payload.amount);
      if (!amt || amt < 500) throw new Error('Minimum withdrawal is ₹500');
      if (amt > actualAvailable) throw new Error('Amount exceeds available balance');

      const reqBody: any = {
        request_type: 'wallet_withdrawal',
        amount: amt,
        method: payload.method,
      };

      if (payload.method === 'upi') {
        if (!payload.upiId?.trim()) throw new Error('UPI ID is required');
        reqBody.upi_id = payload.upiId.trim();
      } else {
        if (!payload.bankName?.trim() || !payload.accountHolder?.trim() || !payload.accountNumber?.trim() || !payload.ifscCode?.trim()) {
          throw new Error('All bank details required');
        }
        if (payload.accountNumber !== payload.confirmAccount) throw new Error('Account numbers do not match');
        reqBody.bank_name = payload.bankName.trim();
        reqBody.account_holder_name = payload.accountHolder.trim();
        reqBody.account_number = payload.accountNumber.trim();
        reqBody.ifsc_code = payload.ifscCode.trim().toUpperCase();
      }

      const { data, error } = await supabase.functions.invoke('create-payout-request', { body: reqBody });
      if (error) throw new Error(error.message || 'Failed to create payout request');
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: 'Withdrawal request submitted! 🎉', description: 'We\'ll process it within 3-5 business days.' });
      setShowWithdraw(false);
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const formContent = (
    <WithdrawalForm
      availableBalance={actualAvailable}
      onSubmit={(payload) => submitWithdrawal.mutate(payload)}
      onCancel={() => setShowWithdraw(false)}
      submitting={submitWithdrawal.isPending}
    />
  );

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
            className="mt-4 w-full sm:w-auto rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold min-h-[44px]"
            disabled={!canWithdraw}
            onClick={() => setShowWithdraw(true)}
          >
            {canWithdraw ? 'Withdraw' : `Minimum ₹500 (you have ₹${Math.round(actualAvailable)})`}
          </Button>
        </div>

        {/* Automatic weekly payout */}
        <AutoPayoutCard />

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

        {/* Responsive Withdrawal: Drawer on mobile, Dialog on desktop */}
        {isMobile ? (
          <Drawer open={showWithdraw} onOpenChange={setShowWithdraw}>
            <DrawerContent className="max-h-[90vh]">
              <DrawerHeader className="text-left">
                <DrawerTitle>Request Withdrawal</DrawerTitle>
                <DrawerDescription>Available Balance: {formatPrice(actualAvailable)}</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6 overflow-y-auto">{formContent}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>Available Balance: {formatPrice(actualAvailable)}</DialogDescription>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
