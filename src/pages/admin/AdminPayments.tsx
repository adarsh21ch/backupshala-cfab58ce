import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { useState } from 'react';
import { Search, Download } from 'lucide-react';

const AdminPayments = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments')
        .select('*, courses(title), profiles!payments_student_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });
      return data || [];
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
    const headers = ['Student', 'Email', 'Course', 'Total', 'Platform Fee', 'Creator Payout', 'Commission', 'Status', 'Date'];
    const rows = filtered.map((p: any) => [
      p.profiles?.full_name || '',
      p.profiles?.email || '',
      p.courses?.title || '',
      p.amount_total,
      p.platform_fee_amount,
      p.creator_payout_amount,
      p.commission_amount,
      p.status,
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

        {/* Summary cards */}
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

        {/* Search + Filter */}
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
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments found</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">{p.courses?.title}</TableCell>
                    <TableCell>{formatINR(p.amount_total)}</TableCell>
                    <TableCell>{formatINR(p.platform_fee_amount)}</TableCell>
                    <TableCell>{formatINR(p.creator_payout_amount)}</TableCell>
                    <TableCell>{formatINR(p.commission_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`border-0 ${p.status === 'success' ? 'bg-primary/20 text-primary' : p.status === 'pending' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
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
