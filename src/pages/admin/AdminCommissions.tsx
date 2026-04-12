import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { useState } from 'react';

const AdminCommissions = () => {
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: async () => {
      const { data } = await supabase.from('commissions')
        .select('*, courses(title)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtered = (commissions || []).filter((c: any) => {
    if (typeFilter === 'all') return true;
    return (c.commission_type || 'referral') === typeFilter;
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Commissions</h1>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="referral">Student Referral</TabsTrigger>
            <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.referrer_email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.courses?.title}</TableCell>
                    <TableCell>{formatINR(c.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="border-0 capitalize">
                        {c.commission_type || 'referral'}
                      </Badge>
                    </TableCell>
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
