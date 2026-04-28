import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KPICard from '@/components/dashboard/KPICard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Download, IndianRupee, Users, CheckCircle2, Clock } from 'lucide-react';

const AdminCommissions = () => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'referral' | 'affiliate'>('all');
  const [courseTypeFilter, setCourseTypeFilter] = useState<'all' | 'platform' | 'creator'>('all');

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: async () => {
      const { data } = await supabase.from('commissions')
        .select('*, courses(title, is_platform_course)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return (commissions || []).filter((c: any) => {
      if (typeFilter !== 'all' && (c.commission_type || 'referral') !== typeFilter) return false;
      if (courseTypeFilter !== 'all') {
        const ct = c.course_type || (c.courses?.is_platform_course ? 'platform' : 'creator');
        if (ct !== courseTypeFilter) return false;
      }
      return true;
    });
  }, [commissions, typeFilter, courseTypeFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const total = filtered.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const available = filtered.reduce((s: number, c: any) => {
      const t = c.available_after ? new Date(c.available_after).getTime() : new Date(c.created_at).getTime();
      return t <= now ? s + Number(c.amount) : s;
    }, 0);
    const pending = total - available;
    const uniqueReferrers = new Set(filtered.map((c: any) => c.referrer_email)).size;
    return { total, available, pending, count: filtered.length, uniqueReferrers };
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Referrer Email', 'Course', 'Course Type', 'Commission Type', 'Amount (INR)', 'Status', 'Available After'],
      ...filtered.map((c: any) => [
        format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
        c.referrer_email,
        (c.courses?.title || '').replace(/"/g, '""'),
        c.course_type || (c.courses?.is_platform_course ? 'platform' : 'creator'),
        c.commission_type || 'referral',
        Number(c.amount).toFixed(2),
        c.status,
        c.available_after ? format(new Date(c.available_after), 'yyyy-MM-dd') : '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-heading font-bold">Commissions</h1>
          <Button onClick={exportCsv} variant="outline" size="sm" className="gap-2" disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KPICard label="Total Paid Out" value={formatINR(stats.total)} icon={IndianRupee} color="primary" />
          <KPICard label="Available Now" value={formatINR(stats.available)} icon={CheckCircle2} color="accent" />
          <KPICard label="Pending (Hold)" value={formatINR(stats.pending)} icon={Clock} color="warning" />
          <KPICard label="Unique Referrers" value={String(stats.uniqueReferrers)} icon={Users} color="info" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All Types</TabsTrigger>
              <TabsTrigger value="referral">Student Referral</TabsTrigger>
              <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={courseTypeFilter} onValueChange={(v) => setCourseTypeFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Course type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="platform">Platform Courses</SelectItem>
              <SelectItem value="creator">Creator Courses</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Course Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No commissions match these filters.</TableCell></TableRow>
                ) : filtered.map((c: any) => {
                  const ct = c.course_type || (c.courses?.is_platform_course ? 'platform' : 'creator');
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.referrer_email}</TableCell>
                      <TableCell className="text-muted-foreground">{c.courses?.title || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{ct}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">{formatINR(c.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="border-0 capitalize">
                          {c.commission_type || 'referral'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="border-0 bg-primary/20 text-primary capitalize">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminCommissions;
