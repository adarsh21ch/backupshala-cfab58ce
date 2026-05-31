import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Scale, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

// Monday 00:00 → next Monday 00:00 (local) for the week containing `d`.
const weekBounds = (d: Date) => {
  const start = new Date(d);
  const day = (start.getDay() + 6) % 7; // Mon=0
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const toInputValue = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Weekly reconciliation: did the money math stay consistent?
 *  - Total payouts marked `paid` in the week (sum + count)
 *  - Sum of matching completed withdrawal debits (what actually left wallets)
 *  - Delta — should be ₹0
 *  - Any payout stuck in `processing` older than 3 days
 */
const ReconciliationCard = () => {
  const [weekDate, setWeekDate] = useState(() => toInputValue(new Date()));
  const { start, end } = useMemo(() => weekBounds(new Date(weekDate + 'T00:00:00')), [weekDate]);

  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation', start.toISOString(), end.toISOString()],
    queryFn: async () => {
      // 1. Payouts marked paid in the selected week.
      const { data: paid } = await supabase
        .from('payout_requests')
        .select('id, amount, processed_at, user_id')
        .eq('status', 'paid')
        .gte('processed_at', start.toISOString())
        .lt('processed_at', end.toISOString());

      const paidRows = paid || [];
      const paidTotal = paidRows.reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const paidIds = paidRows.map((r: any) => r.id);

      // 2. Completed withdrawal debits for those same payouts (money that
      //    actually left the wallets). These must equal the paid total.
      let withdrawnTotal = 0;
      if (paidIds.length > 0) {
        const { data: debits } = await supabase
          .from('wallet_transactions')
          .select('amount, reference_id, type, status')
          .in('reference_id', paidIds)
          .in('type', ['debit', 'withdrawal'])
          .eq('status', 'completed');
        withdrawnTotal = (debits || []).reduce((s, t: any) => s + Number(t.amount || 0), 0);
      }

      // 3. Payouts stuck in processing older than 3 days.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const { data: stuck } = await supabase
        .from('payout_requests')
        .select('id, amount, user_id, requested_at, processed_at, profiles!payout_requests_user_id_fkey(full_name, email)')
        .eq('status', 'processing')
        .lt('requested_at', threeDaysAgo)
        .order('requested_at', { ascending: true });

      return {
        paidCount: paidRows.length,
        paidTotal,
        withdrawnTotal,
        delta: paidTotal - withdrawnTotal,
        stuck: stuck || [],
      };
    },
  });

  const delta = data?.delta ?? 0;
  const balanced = Math.abs(delta) < 0.5;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" /> Weekly reconciliation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Did the money math stay consistent? Delta should always be ₹0.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Week of</span>
            <Input
              type="date"
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              className="h-8 w-[150px] text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid out</p>
                <p className="text-xl font-bold">{formatINR(data?.paidTotal ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{data?.paidCount ?? 0} payouts</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Left wallets</p>
                <p className="text-xl font-bold">{formatINR(data?.withdrawnTotal ?? 0)}</p>
                <p className="text-xs text-muted-foreground">completed debits</p>
              </div>
              <div className={`rounded-lg border p-3 ${balanced ? 'border-primary/30 bg-primary/5' : 'border-destructive/40 bg-destructive/10'}`}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  Delta
                  {balanced
                    ? <CheckCircle2 className="h-3 w-3 text-primary" />
                    : <AlertTriangle className="h-3 w-3 text-destructive" />}
                </p>
                <p className={`text-xl font-bold ${balanced ? 'text-primary' : 'text-destructive'}`}>
                  {formatINR(delta)}
                </p>
                <p className="text-xs text-muted-foreground">{balanced ? 'balanced ✓' : 'needs review'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Clock className="h-4 w-4 text-accent" />
                Stuck in processing &gt; 3 days
              </h3>
              {(data?.stuck?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">None — nothing left hanging 🎉</p>
              ) : (
                <div className="space-y-2">
                  {data!.stuck.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-muted-foreground truncate">{s.profiles?.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatINR(s.amount)}</p>
                        <p className="text-muted-foreground">since {format(new Date(s.requested_at), 'dd MMM')}</p>
                      </div>
                      <Badge variant="secondary" className="border-0 bg-destructive/15 text-destructive ml-2 shrink-0">processing</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReconciliationCard;
