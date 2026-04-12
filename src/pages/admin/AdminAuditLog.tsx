import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Shield } from 'lucide-react';
import EmptyState from '@/components/dashboard/EmptyState';

const AdminAuditLog = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-800">Audit Log</h1>
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
                    <EmptyState icon={Shield} title="No audit logs yet" description="Admin actions will appear here once performed." />
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
