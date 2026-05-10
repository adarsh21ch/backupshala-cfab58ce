import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { useState } from 'react';
import { Search, Download, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminPayments = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments')
        .select('*, courses(title), profiles!payments_student_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('refund-payment', {
        body: { payment_id: paymentId, reason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Refund processed', description: 'Student notified, enrollment revoked, commissions reversed.' });
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      setRefundTarget(null);
      setRefundReason('');
    },
    onError: (err: any) => {
      toast({ title: 'Refund failed', description: err.message || 'Try again', variant: 'destructive' });
    },
  });

  const filtered = (payments || []).filter((p: any) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = p.profiles?.full_name?.toLowerCase() || '';
      const email = p.profiles?.email?.toLowerCase() || '';
      const course = p.courses?.title?.toLowerCase() || '';
      if (!name.includes(q) && !email.includes(q) && !course.includes(q)) return false;
    }
    return true;
  });

  const totalRevenue = filtered.filter((p: any) => p.status === 'success').reduce((s: number, p: any) => s + Number(p.amount_total), 0);
  const totalPlatformFee = filtered.filter((p: any) => p.status === 'success').reduce((s: number, p: any) => s + Number(p.platform_fee_amount), 0);

  const exportCSV = () => {
    const headers = ['Student', 'Email', 'Course', 'Total', 'Platform Fee', 'Creator Payout', 'Commission', 'Status', 'Refund', 'Date'];
    const rows = filtered.map((p: any) => [
      p.profiles?.full_name || '', p.profiles?.email || '', p.courses?.title || '',
      p.amount_total, p.platform_fee_amount, p.creator_payout_amount, p.commission_amount,
      p.status, p.refund_status || '',
      format(new Date(p.created_at), 'dd MMM yyyy'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Payments</h1>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Revenue (filtered)</p>
              <p className="text-xl font-heading font-bold text-primary">{formatINR(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Platform Earnings (filtered)</p>
              <p className="text-xl font-heading font-bold text-accent">{formatINR(totalPlatformFee)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student, email, course..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="success">Success</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments found</TableCell></TableRow>
                ) : filtered.map((p: any) => {
                  const refunded = p.refund_status === 'processed';
                  const canRefund = (p.status === 'success' || p.status === 'paid') && !refunded && !!p.razorpay_payment_id;
                  return (
                    <TableRow key={p.id} className={refunded ? 'opacity-60' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{p.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">{p.courses?.title}</TableCell>
                      <TableCell>{formatINR(p.amount_total)}</TableCell>
                      <TableCell>
                        {refunded ? (
                          <Badge variant="secondary" className="border-0 bg-destructive/20 text-destructive">refunded</Badge>
                        ) : (
                          <Badge variant="secondary" className={`border-0 ${p.status === 'success' ? 'bg-primary/20 text-primary' : p.status === 'pending' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
                            {p.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {canRefund && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setRefundTarget(p)}>
                            <RotateCcw className="h-3 w-3" /> Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!refundTarget} onOpenChange={o => { if (!o) { setRefundTarget(null); setRefundReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              This will refund {refundTarget && formatINR(refundTarget.amount_total)} to the student via Razorpay,
              revoke their course access, and reverse creator/affiliate commissions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Reason (visible in audit log)</label>
            <Textarea
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="e.g. Student requested refund within 7 days"
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRefundTarget(null); setRefundReason(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={refundMutation.isPending || refundReason.trim().length < 5}
              onClick={() => refundMutation.mutate({ paymentId: refundTarget.id, reason: refundReason.trim() })}
            >
              {refundMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
};

export default AdminPayments;
