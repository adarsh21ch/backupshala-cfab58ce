import { useState } from 'react';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, Webhook } from 'lucide-react';

const AdminWebhookLogs = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-webhook-logs'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const statusColor = (s: string) => {
    if (s === 'processed') return 'bg-primary/10 text-primary';
    if (s === 'verified') return 'bg-blue-500/10 text-blue-400';
    if (s === 'invalid_signature') return 'bg-destructive/10 text-destructive';
    return 'bg-secondary text-muted-foreground';
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-700">Webhook Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 200 events received from payment & external integrations.</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !logs || logs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Webhook className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No webhook events yet.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log: any) => {
                  const isOpen = !!expanded[log.id];
                  return (
                    <>
                      <tr key={log.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [log.id]: !p[log.id] }))}>
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
                      </tr>
                      {isOpen && (
                        <tr key={`${log.id}-payload`} className="bg-secondary/20">
                          <td></td>
                          <td colSpan={3} className="px-4 py-3">
                            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto rounded-md bg-background p-3 border border-border">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
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
