import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';

const AdminCommissions = () => {
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: async () => {
      const { data } = await supabase.from('commissions')
        .select('*, courses(title)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Commissions</h1>
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : (commissions || []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.referrer_email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.courses?.title}</TableCell>
                    <TableCell>{formatINR(c.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="border-0 bg-primary/20 text-primary">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
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

export default AdminCommissions;
