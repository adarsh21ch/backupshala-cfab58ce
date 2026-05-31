import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Play, Loader2, CalendarClock } from 'lucide-react';
import PayoutSheet from '@/components/admin/PayoutSheet';
import ReconciliationCard from '@/components/admin/ReconciliationCard';

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-primary/20 text-primary';
    case 'running': return 'bg-blue-100 text-blue-700';
    case 'failed': return 'bg-destructive/20 text-destructive';
    default: return 'bg-accent/20 text-accent';
  }
};

const AdminPayoutRuns = () => {
  const qc = useQueryClient();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['admin-payout-runs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payout_runs')
        .select('*')
        .order('started_at', { ascending: false });
      return data || [];
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('run-weekly-payouts', {
        body: { force: true },
      });
      if (error) {
        let msg = error.message;
        try {
          const parsed = JSON.parse((error as any).context?.body || '{}');
          if (parsed?.error) msg = parsed.error;
        } catch {}
        throw new Error(msg || 'Run failed');
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (data) => {
      if (data?.skipped) {
        toast.info(`Skipped: ${data.reason}`);
      } else {
        toast.success(`Run complete — ${data?.users_processed ?? 0} users, ${formatINR(data?.total_amount ?? 0)} queued`);
      }
      qc.invalidateQueries({ queryKey: ['admin-payout-runs'] });
      qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Payout Runs
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Weekly automatic payout runs. Each run creates pending payout requests for eligible users — you still approve &amp; send the money from the Payouts queue.
            </p>
          </div>
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending} className="bg-primary hover:bg-primary/90 shrink-0">
            {runNow.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run now
          </Button>
        </div>

        <PayoutSheet compact />



        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users Paid</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : (runs || []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payout runs yet. Click "Run now" to trigger this week.</TableCell></TableRow>
                ) : (runs || []).map((r: any) => {
                  const errCount = Array.isArray(r.errors) ? r.errors.length : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium font-mono text-xs">{r.run_key}</TableCell>
                      <TableCell><Badge variant="secondary" className={`border-0 ${statusBadge(r.status)}`}>{r.status}</Badge></TableCell>
                      <TableCell>{r.users_processed}</TableCell>
                      <TableCell className="font-semibold">{formatINR(r.total_amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.triggered_by}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.started_at), 'dd MMM, HH:mm')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.finished_at ? format(new Date(r.finished_at), 'dd MMM, HH:mm') : '—'}</TableCell>
                      <TableCell>
                        {errCount > 0
                          ? <Badge variant="secondary" className="border-0 bg-destructive/20 text-destructive">{errCount}</Badge>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPayoutRuns;
