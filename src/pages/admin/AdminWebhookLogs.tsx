import { Fragment, useMemo, useState } from 'react';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Download, RefreshCw, Webhook } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const csvEscape = (v: any) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
};

const AdminWebhookLogs = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-webhook-logs', statusFilter, eventFilter, from, to],
    queryFn: async () => {
      let q = (supabase as any)
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (eventFilter.trim()) q = q.ilike('event_type', `%${eventFilter.trim()}%`);
      if (from) q = q.gte('created_at', new Date(from).toISOString());
      if (to) q = q.lte('created_at', new Date(`${to}T23:59:59`).toISOString());
      const { data } = await q;
      return data || [];
    },
  });

  const qc = useQueryClient();
  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await supabase.functions.invoke('webhook-retry', { body: { log_id: logId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.handled ? `Replayed: ${data.action}` : (data?.reason || 'Skipped'));
      qc.invalidateQueries({ queryKey: ['admin-webhook-logs'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Retry failed'),
  });

  const statusColor = (s: string) => {
    if (s === 'processed') return 'bg-primary/10 text-primary';
    if (s === 'verified') return 'bg-blue-500/10 text-blue-400';
    if (s === 'invalid_signature') return 'bg-destructive/10 text-destructive';
    return 'bg-secondary text-muted-foreground';
  };

  const exportCsv = () => {
    if (!logs?.length) { toast.error('Nothing to export'); return; }
    const headers = ['created_at', 'event_type', 'status', 'payload'];
    const rows = logs.map((l: any) => headers.map((h) => csvEscape(l[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-logs-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${logs.length} events`);
  };

  const count = useMemo(() => logs?.length ?? 0, [logs]);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-700">Webhook Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">Events received from payment & external integrations.</p>
          </div>
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={!count}>
            <Download className="h-4 w-4 mr-2" /> Export CSV ({count})
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="received">received</SelectItem>
                <SelectItem value="verified">verified</SelectItem>
                <SelectItem value="processed">processed</SelectItem>
                <SelectItem value="invalid_signature">invalid_signature</SelectItem>
                <SelectItem value="error">error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Event type contains</Label>
            <Input placeholder="e.g. payment, refund" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !logs || logs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Webhook className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No webhook events match the current filters.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground w-8"></th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Event Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log: any) => {
                  const isOpen = !!expanded[log.id];
                  const canRetry = log.event_type === 'payment.captured' || log.event_type === 'payment.failed';
                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-secondary/30 cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [log.id]: !p[log.id] }))}>
                        <td className="px-4 py-3">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{log.event_type}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canRetry || retryMutation.isPending}
                            onClick={() => retryMutation.mutate(log.id)}
                            title={canRetry ? 'Re-process this webhook' : 'Retry not supported for this event type'}
                          >
                            <RefreshCw className={`h-3 w-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-secondary/20">
                          <td></td>
                          <td colSpan={4} className="px-4 py-3">
                            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto rounded-md bg-background p-3 border border-border">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminWebhookLogs;
