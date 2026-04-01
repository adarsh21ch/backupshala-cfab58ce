import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';

const AdminPayments = () => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments')
        .select('*, courses(title), profiles!payments_student_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Payments</h1>
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Creator Payout</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : (payments || []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.profiles?.full_name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">{p.courses?.title}</TableCell>
                    <TableCell>{formatINR(p.amount_total)}</TableCell>
                    <TableCell>{formatINR(p.platform_fee_amount)}</TableCell>
                    <TableCell>{formatINR(p.creator_payout_amount)}</TableCell>
                    <TableCell>{formatINR(p.commission_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`border-0 ${p.status === 'paid' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
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

export default AdminPayments;
