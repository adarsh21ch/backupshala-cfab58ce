import { useMemo, useState } from 'react';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Download, Shield } from 'lucide-react';
import EmptyState from '@/components/dashboard/EmptyState';
import { toast } from 'sonner';

const csvEscape = (v: any) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
};

const AdminAuditLog = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-log', from, to, actionFilter],
    queryFn: async () => {
      let q = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (from) q = q.gte('created_at', new Date(from).toISOString());
      if (to) q = q.lte('created_at', new Date(`${to}T23:59:59`).toISOString());
      if (actionFilter.trim()) q = q.ilike('action', `%${actionFilter.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const exportCsv = () => {
    if (!logs || logs.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const headers = ['created_at', 'admin_id', 'action', 'target_type', 'target_id', 'details'];
    const rows = logs.map((l: any) => headers.map((h) => csvEscape(l[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${logs.length} entries`);
  };

  const count = useMemo(() => logs?.length ?? 0, [logs]);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-heading font-800">Audit Log</h1>
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={!count}>
            <Download className="h-4 w-4 mr-2" /> Export CSV ({count})
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Action contains</Label>
              <Input placeholder="e.g. refund, payout" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : !logs || logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8">
                    <EmptyState icon={Shield} title="No audit logs" description="No entries match the current filters." />
                  </TableCell></TableRow>
                ) : logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">{log.target_type}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.target_id?.slice(0, 8) || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminAuditLog;
