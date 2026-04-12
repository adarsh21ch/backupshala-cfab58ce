import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IndianRupee, TrendingUp, Wallet, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMemo } from 'react';

const CreatorEarnings = () => {
  const { user } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ['creator-courses', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').eq('creator_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['creator-payments', user?.id, courses?.map(c => c.id)],
    queryFn: async () => {
      const courseIds = courses?.map(c => c.id) || [];
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from('payments')
        .select('*, courses(title)')
        .in('course_id', courseIds)
        .eq('status', 'success')
        .order('paid_at', { ascending: false });
      return data || [];
    },
    enabled: !!courses && courses.length > 0,
  });

  const { data: creatorPayouts } = useQuery({
    queryKey: ['creator-payout-totals', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('creator_payouts').select('amount, status').eq('creator_id', user!.id);
      const paid = data?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) || 0;
      const pending = data?.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0) || 0;
      return { paid, pending };
    },
    enabled: !!user,
  });

  const gross = payments?.reduce((s, p) => s + Number(p.amount_total), 0) || 0;
  const platformFees = payments?.reduce((s, p) => s + Number(p.platform_fee_amount), 0) || 0;
  const commissions = payments?.reduce((s, p) => s + Number(p.commission_amount), 0) || 0;
  const net = payments?.reduce((s, p) => s + Number(p.creator_payout_amount), 0) || 0;
  const paidOut = creatorPayouts?.paid || 0;
  const pendingPayout = creatorPayouts?.pending || 0;

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-700">Earnings</h1>
          {pendingPayout >= 500 && (
            <Button asChild className="rounded-md bg-primary hover:bg-primary/90">
              <Link to="/creator/payouts">Request Payout</Link>
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: IndianRupee, label: 'Gross Revenue', value: formatPrice(gross), color: 'text-foreground' },
            { icon: Receipt, label: 'Platform Fees', value: formatPrice(platformFees), color: 'text-destructive' },
            { icon: TrendingUp, label: 'Commissions Paid', value: formatPrice(commissions), color: 'text-accent' },
            { icon: Wallet, label: 'Net Earnings', value: formatPrice(net), color: 'text-primary' },
            { icon: IndianRupee, label: 'Paid Out', value: formatPrice(paidOut), color: 'text-primary' },
            { icon: Wallet, label: 'Pending Payout', value: formatPrice(pendingPayout), color: 'text-accent' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
              <p className={`font-heading text-lg font-700 ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Monthly Earnings Chart */}
        {payments && payments.length > 0 && (() => {
          const monthlyData = useMemo(() => {
            const map: Record<string, number> = {};
            payments.forEach(p => {
              if (!p.paid_at) return;
              const d = new Date(p.paid_at);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              map[key] = (map[key] || 0) + Number(p.creator_payout_amount);
            });
            return Object.entries(map)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-6)
              .map(([month, amount]) => ({
                month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                amount: Math.round(amount),
              }));
          }, [payments]);

          return monthlyData.length > 1 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-heading text-base font-600 mb-4">Monthly Earnings</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v}`, 'Earnings']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null;
        })()}

        {/* Self-referral tip */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary mb-1">💡 Pro Tip: Maximize Your Income</p>
          <p className="text-xs text-muted-foreground">
            When you personally share your course with someone, tell them to enter YOUR email when they sign up on Backupshala. 
            You'll earn both your creator payout AND the referral commission — maximizing your income per enrollment.
          </p>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="font-heading text-base font-600 mb-4">Transaction History</h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : payments && payments.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Course</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Gross</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Fee</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Commission</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-3 text-xs">{(p as any).courses?.title}</td>
                        <td className="px-4 py-3 text-xs">{formatPrice(p.amount_total)}</td>
                        <td className="px-4 py-3 text-xs text-destructive">-{formatPrice(p.platform_fee_amount)}</td>
                        <td className="px-4 py-3 text-xs text-accent">-{formatPrice(p.commission_amount)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-primary">{formatPrice(p.creator_payout_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border">
                {payments.map(p => (
                  <div key={p.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{(p as any).courses?.title}</p>
                      <span className="text-sm font-semibold text-primary">{formatPrice(p.creator_payout_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}</span>
                      <span>Gross: {formatPrice(p.amount_total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <IndianRupee className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            </div>
          )}
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorEarnings;
