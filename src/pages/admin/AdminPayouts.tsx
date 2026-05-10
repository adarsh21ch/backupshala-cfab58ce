import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useState } from 'react';

const AdminPayouts = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [completeModal, setCompleteModal] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-payout-requests'],
    queryFn: async () => {
      const { data } = await supabase.from('payout_requests')
        .select('*, profiles!payout_requests_user_id_fkey(full_name, email, is_creator)')
        .order('requested_at', { ascending: false });
      return data || [];
    },
  });

  // All admin payout transitions go through the secure edge function:
  //   - server-side admin role check
  //   - atomic state transition via RPC (only flips from allowed previous status)
  //   - prevents double-click / two-admin races (second caller gets 409)
  //   - wallet update + audit log happen inside the same RPC/transaction
  const invokeAction = async (
    action: 'set_processing' | 'complete' | 'reject',
    payload: Record<string, unknown>,
  ) => {
    const { data, error } = await supabase.functions.invoke('admin-payout-action', {
      body: { action, ...payload },
    });
    if (error) {
      // Edge functions return non-2xx as error.context.body
      let msg = error.message;
      try {
        const parsed = JSON.parse((error as any).context?.body || '{}');
        if (parsed?.error) msg = parsed.error;
      } catch {}
      throw new Error(msg || 'Action failed');
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const completeMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!utrNumber.trim()) throw new Error('UTR number is required');
      return invokeAction('complete', {
        payout_id: id, utr: utrNumber.trim(), admin_note: adminNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Payout marked as completed');
      qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
      setCompleteModal(null);
      setUtrNumber('');
      setAdminNote('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!rejectReason.trim()) throw new Error('Rejection reason is required');
      return invokeAction('reject', { payout_id: id, reason: rejectReason.trim() });
    },
    onSuccess: () => {
      toast.success('Payout rejected and amount reversed');
      qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
      setRejectModal(null);
      setRejectReason('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkProcess = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        Array.from(selected).map((id) => invokeAction('set_processing', { payout_id: id })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) throw new Error(`${failed} of ${selected.size} could not be marked as processing`);
    },
    onSuccess: () => {
      toast.success(`${selected.size} requests marked as processing`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filterByStatus = (status: string) => (requests || []).filter((r: any) => {
    if (status === 'all') return true;
    if (status === 'pending') return r.status === 'pending' || r.status === 'processing';
    return r.status === status;
  });

  const getUserType = (r: any) => {
    if (r.profiles?.is_creator) return 'Creator';
    if (r.request_type === 'wallet_withdrawal') return 'Student';
    return 'Student';
  };

  const maskAccount = (acc: string) => acc ? `XXXX${acc.slice(-4)}` : '';

  const exportCSV = () => {
    const rows = (requests || []).map((r: any) => [
      format(new Date(r.requested_at), 'dd/MM/yyyy'),
      r.profiles?.full_name,
      r.amount,
      r.upi_id || `${r.bank_name} ${maskAccount(r.account_number)}`,
      r.status,
    ]);
    const csv = 'Date,Name,Amount,Method,Status\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payouts.csv';
    a.click();
  };

  const pendingItems = filterByStatus('pending');

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Payout Requests</h1>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button size="sm" variant="outline" onClick={() => bulkProcess.mutate()}>
                Mark {selected.size} as Processing
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingItems.length})</TabsTrigger>
            <TabsTrigger value="paid">Completed ({filterByStatus('paid').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({filterByStatus('rejected').length})</TabsTrigger>
            <TabsTrigger value="all">All ({(requests || []).length})</TabsTrigger>
          </TabsList>
          {['pending', 'paid', 'rejected', 'all'].map(status => (
            <TabsContent key={status} value={status}>
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {status === 'pending' && <TableHead className="w-10"><Checkbox checked={selected.size === pendingItems.length && pendingItems.length > 0} onCheckedChange={(c) => setSelected(c ? new Set(pendingItems.map((r: any) => r.id)) : new Set())} /></TableHead>}
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterByStatus(status).length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No requests</TableCell></TableRow>
                      ) : filterByStatus(status).map((r: any) => (
                        <TableRow key={r.id}>
                          {status === 'pending' && (
                            <TableCell>
                              <Checkbox checked={selected.has(r.id)} onCheckedChange={(c) => {
                                const next = new Set(selected);
                                c ? next.add(r.id) : next.delete(r.id);
                                setSelected(next);
                              }} />
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="border-0">{getUserType(r)}</Badge></TableCell>
                          <TableCell className="font-semibold">{formatINR(r.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.upi_id ? `UPI: ${r.upi_id}` : `Bank: ${r.bank_name} / ${maskAccount(r.account_number || '')}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`border-0 ${
                              r.status === 'paid' ? 'bg-primary/20 text-primary' :
                              r.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                              r.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-accent/20 text-accent'
                            }`}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{format(new Date(r.requested_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">
                            {(r.status === 'pending' || r.status === 'processing') && (
                              <div className="flex gap-2 justify-end">
                                {r.status === 'pending' && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                                    await supabase.from('payout_requests').update({ status: 'processing' }).eq('id', r.id);
                                    qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
                                    toast.success('Marked as processing');
                                  }}>
                                    <Clock className="h-3 w-3 mr-1" /> Processing
                                  </Button>
                                )}
                                <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90" onClick={() => setCompleteModal(r)}>
                                  <CheckCircle className="h-3 w-3 mr-1" /> Complete
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setRejectModal(r)}>
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                            {r.admin_note && <p className="text-xs text-muted-foreground mt-1">Note: {r.admin_note}</p>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Complete Modal */}
        <Dialog open={!!completeModal} onOpenChange={() => setCompleteModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Payout for {completeModal?.profiles?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <p>Amount: <span className="font-semibold">{formatINR(completeModal?.amount || 0)}</span></p>
                <p>Method: {completeModal?.upi_id ? `UPI: ${completeModal.upi_id}` : `Bank: ${completeModal?.bank_name}`}</p>
              </div>
              <div>
                <Label>Transaction Reference / UTR Number *</Label>
                <Input value={utrNumber} onChange={e => setUtrNumber(e.target.value)} placeholder="Enter UTR number" className="mt-1" />
              </div>
              <div>
                <Label>Admin Note (optional)</Label>
                <Input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Optional note" className="mt-1" />
              </div>
              <Button
                onClick={() => completeMutation.mutate({ id: completeModal.id, userId: completeModal.user_id, amount: completeModal.amount })}
                disabled={completeMutation.isPending || !utrNumber.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {completeMutation.isPending ? <span className="animate-spin">⏳</span> : 'Confirm Completion'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payout Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <p>Amount: <span className="font-semibold">{formatINR(rejectModal?.amount || 0)}</span></p>
                <p>User: {rejectModal?.profiles?.full_name}</p>
              </div>
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="This reason will be shown to the user" className="mt-1" rows={3} />
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                <p className="text-xs text-muted-foreground">The full amount will be returned to the user's wallet.</p>
              </div>
              <Button
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, userId: rejectModal.user_id, amount: rejectModal.amount })}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                variant="destructive"
                className="w-full"
              >
                {rejectMutation.isPending ? <span className="animate-spin">⏳</span> : 'Reject & Return Funds'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPayouts;
