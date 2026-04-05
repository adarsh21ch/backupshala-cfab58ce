import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

const AdminPayouts = () => {
  const qc = useQueryClient();
  const [adminNote, setAdminNote] = useState('');
  const [activeReqId, setActiveReqId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-payout-requests'],
    queryFn: async () => {
      const { data } = await supabase.from('payout_requests')
        .select('*, profiles!payout_requests_user_id_fkey(full_name, email)')
        .order('requested_at', { ascending: false });
      return data || [];
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, status, note, userId, amount }: { id: string; status: string; note?: string; userId: string; amount: number }) => {
      const update: any = { status, processed_at: new Date().toISOString() };
      if (note) update.admin_note = note;
      const { error } = await supabase.from('payout_requests').update(update).eq('id', id);
      if (error) throw error;

      // Deduct wallet balance on approval
      if (status === 'approved') {
        const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', userId).single();
        if (profile) {
          const newBalance = Math.max(0, Number(profile.wallet_balance) - amount);
          const { error: walletError } = await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
          if (walletError) throw walletError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Payout request processed');
      qc.invalidateQueries({ queryKey: ['admin-payout-requests'] });
      setActiveReqId(null);
      setAdminNote('');
    },
    onError: () => toast.error('Failed to process'),
  });

  const filterByStatus = (status: string) => (requests || []).filter((r: any) => r.status === status);

  const PayoutTable = ({ items }: { items: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
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
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No requests</TableCell></TableRow>
        ) : items.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell>
              <div>
                <p className="font-medium">{r.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
              </div>
            </TableCell>
            <TableCell><Badge variant="secondary" className="border-0">{r.request_type}</Badge></TableCell>
            <TableCell className="font-medium">{formatINR(r.amount)}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {r.upi_id ? `UPI: ${r.upi_id}` : `Bank: ${r.bank_name} / ${r.account_number}`}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className={`border-0 ${r.status === 'approved' ? 'bg-primary/20 text-primary' : r.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-accent/20 text-accent'}`}>
                {r.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{format(new Date(r.requested_at), 'dd MMM yyyy')}</TableCell>
            <TableCell className="text-right">
              {r.status === 'pending' && (
                <div className="flex gap-2 justify-end">
                  <Button size="sm" className="h-8 bg-primary hover:bg-primary/90" onClick={() => processMutation.mutate({ id: r.id, status: 'approved', userId: r.user_id, amount: r.amount })}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  {activeReqId === r.id ? (
                    <div className="flex gap-1">
                      <Input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Note" className="h-8 w-32 text-xs" />
                      <Button size="sm" variant="destructive" className="h-8" onClick={() => processMutation.mutate({ id: r.id, status: 'rejected', note: adminNote, userId: r.user_id, amount: r.amount })}>
                        Send
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setActiveReqId(r.id)}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  )}
                </div>
              )}
              {r.admin_note && <p className="text-xs text-muted-foreground mt-1">Note: {r.admin_note}</p>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Payout Requests</h1>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({filterByStatus('pending').length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({filterByStatus('approved').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({filterByStatus('rejected').length})</TabsTrigger>
          </TabsList>
          {['pending', 'approved', 'rejected'].map(status => (
            <TabsContent key={status} value={status}>
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <PayoutTable items={filterByStatus(status)} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPayouts;
