import { useState, useMemo } from 'react';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { format, subMonths, subDays, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, IndianRupee, TrendingUp, CreditCard, Wallet, Star, Sparkles } from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';

const DATE_RANGES = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: '3_months' },
  { label: 'Last 6 Months', value: '6_months' },
  { label: 'All Time', value: 'all' },
];

const AdminRevenue = () => {
  const [range, setRange] = useState('all');
  const [proFilter, setProFilter] = useState('all');

  const getRangeDate = () => {
    const now = new Date();
    if (range === 'this_month') return startOfMonth(now).toISOString();
    if (range === 'last_month') return startOfMonth(subMonths(now, 1)).toISOString();
    if (range === '3_months') return subMonths(now, 3).toISOString();
    if (range === '6_months') return subMonths(now, 6).toISOString();
    return null;
  };

  // Fetch all payments
  const { data: payments } = useQuery({
    queryKey: ['admin-revenue-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('payments')
        .select('*, courses(title), profiles!payments_creator_id_fkey(full_name, is_creator_pro)')
        .eq('status', 'success')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Creator Pro subscriptions
  const { data: proSubs } = useQuery({
    queryKey: ['admin-pro-subs'],
    queryFn: async () => {
      const { data } = await supabase.from('creator_pro_subscriptions')
        .select('*, profiles!creator_pro_subscriptions_creator_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Featured listings
  const { data: featuredListings } = useQuery({
    queryKey: ['admin-featured-listings'],
    queryFn: async () => {
      const { data } = await supabase.from('featured_listings')
        .select('*, courses(title), profiles:creator_id(full_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const rangeDate = getRangeDate();
  const filteredPayments = useMemo(() => {
    let fp = payments || [];
    if (rangeDate) fp = fp.filter(p => p.created_at >= rangeDate);
    return fp;
  }, [payments, rangeDate]);

  const totalGross = filteredPayments.reduce((s, p) => s + Number(p.amount_total), 0);
  const totalPlatformFees = filteredPayments.reduce((s, p) => s + Number(p.platform_fee_amount), 0);
  const totalCreatorPayouts = filteredPayments.reduce((s, p) => s + Number(p.creator_payout_amount), 0);
  const avgFee = filteredPayments.length > 0 ? totalPlatformFees / filteredPayments.length : 0;
  const proRevenue = (proSubs || []).reduce((s, p) => s + Number(p.amount_per_month || 0), 0);
  const featuredRevenue = (featuredListings || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);

  // Monthly stacked bar chart data
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; courseSales: number; proRevenue: number; featuredRevenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const key = format(subMonths(new Date(), i), 'MMM yyyy');
      months[key] = { month: key, courseSales: 0, proRevenue: 0, featuredRevenue: 0 };
    }
    filteredPayments.forEach(p => {
      const key = format(new Date(p.created_at), 'MMM yyyy');
      if (months[key]) months[key].courseSales += Number(p.platform_fee_amount);
    });
    (proSubs || []).forEach(s => {
      if (s.pro_started_at) {
        const key = format(new Date(s.pro_started_at), 'MMM yyyy');
        if (months[key]) months[key].proRevenue += Number(s.amount_per_month || 0);
      }
    });
    (featuredListings || []).forEach(f => {
      const key = format(new Date(f.created_at), 'MMM yyyy');
      if (months[key]) months[key].featuredRevenue += Number(f.amount_paid || 0);
    });
    return Object.values(months);
  }, [filteredPayments, proSubs, featuredListings]);

  // Top earning courses
  const topCourses = useMemo(() => {
    const courseMap: Record<string, { title: string; creator: string; enrollments: number; gross: number; platformFee: number; creatorEarning: number }> = {};
    filteredPayments.forEach(p => {
      const cid = p.course_id;
      if (!courseMap[cid]) {
        courseMap[cid] = { title: (p as any).courses?.title || 'Unknown', creator: (p as any).profiles?.full_name || 'Unknown', enrollments: 0, gross: 0, platformFee: 0, creatorEarning: 0 };
      }
      courseMap[cid].enrollments++;
      courseMap[cid].gross += Number(p.amount_total);
      courseMap[cid].platformFee += Number(p.platform_fee_amount);
      courseMap[cid].creatorEarning += Number(p.creator_payout_amount);
    });
    return Object.values(courseMap).sort((a, b) => b.gross - a.gross).slice(0, 20);
  }, [filteredPayments]);

  // Platform fee analysis by tier
  const tierAnalysis = useMemo(() => {
    const tiers = { Free: { transactions: 0, gross: 0, fees: 0 }, Pro: { transactions: 0, gross: 0, fees: 0 } };
    filteredPayments.forEach(p => {
      const tier = (p as any).profiles?.is_creator_pro ? 'Pro' : 'Free';
      tiers[tier].transactions++;
      tiers[tier].gross += Number(p.amount_total);
      tiers[tier].fees += Number(p.platform_fee_amount);
    });
    return tiers;
  }, [filteredPayments]);

  const filteredProSubs = useMemo(() => {
    let subs = proSubs || [];
    if (proFilter === 'active') subs = subs.filter(s => s.status === 'active');
    if (proFilter === 'expired') subs = subs.filter(s => s.status !== 'active');
    return subs;
  }, [proSubs, proFilter]);

  const exportProCSV = () => {
    const headers = ['Creator', 'Plan', 'Started', 'Expires', 'Status', 'Amount'];
    const rows = filteredProSubs.map(s => [
      (s as any).profiles?.full_name || '', s.plan,
      s.pro_started_at ? format(new Date(s.pro_started_at), 'dd MMM yyyy') : '',
      s.pro_ends_at ? format(new Date(s.pro_ends_at), 'dd MMM yyyy') : '',
      s.status, s.amount_per_month
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `pro-subscriptions-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">Revenue Dashboard</h1>
          <div className="flex gap-2 flex-wrap">
            {DATE_RANGES.map(dr => (
              <button key={dr.value} onClick={() => setRange(dr.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${range === dr.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                {dr.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard icon={CreditCard} label="Gross Revenue" value={formatINR(totalGross)} color="primary" />
          <KPICard icon={IndianRupee} label="Platform Earnings" value={formatINR(totalPlatformFees)} color="accent" />
          <KPICard icon={Wallet} label="Creator Payouts" value={formatINR(totalCreatorPayouts)} color="warning" />
          <KPICard icon={TrendingUp} label="Avg Fee/Txn" value={formatINR(avgFee)} color="info" />
          <KPICard icon={Star} label="Pro Revenue" value={formatINR(proRevenue)} color="primary" />
          <KPICard icon={Sparkles} label="Featured Revenue" value={formatINR(featuredRevenue)} color="accent" />
        </div>

        {/* Revenue Breakdown Chart */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base font-heading">Monthly Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Bar dataKey="courseSales" name="Course Sales" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="proRevenue" name="Creator Pro" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="featuredRevenue" name="Featured" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Fee Analysis */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base font-heading">Platform Fee Analysis by Tier</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Gross Revenue</TableHead>
                  <TableHead>Avg Fee %</TableHead>
                  <TableHead>Platform Fee Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(tierAnalysis).map(([tier, data]) => (
                  <TableRow key={tier}>
                    <TableCell><Badge variant={tier === 'Pro' ? 'default' : 'secondary'} className="border-0">{tier}</Badge></TableCell>
                    <TableCell>{data.transactions}</TableCell>
                    <TableCell>{formatINR(data.gross)}</TableCell>
                    <TableCell>{data.gross > 0 ? ((data.fees / data.gross) * 100).toFixed(1) + '%' : '0%'}</TableCell>
                    <TableCell className="font-semibold">{formatINR(data.fees)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-secondary/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell>{tierAnalysis.Free.transactions + tierAnalysis.Pro.transactions}</TableCell>
                  <TableCell>{formatINR(tierAnalysis.Free.gross + tierAnalysis.Pro.gross)}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{formatINR(tierAnalysis.Free.fees + tierAnalysis.Pro.fees)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Earning Courses */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base font-heading">Top Earning Courses</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Gross Revenue</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Creator Earning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCourses.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                    <TableCell className="text-muted-foreground">{c.creator}</TableCell>
                    <TableCell>{c.enrollments}</TableCell>
                    <TableCell>{formatINR(c.gross)}</TableCell>
                    <TableCell>{formatINR(c.platformFee)}</TableCell>
                    <TableCell>{formatINR(c.creatorEarning)}</TableCell>
                  </TableRow>
                ))}
                {topCourses.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Creator Pro Subscriptions */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-heading">Creator Pro Subscriptions</CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={proFilter} onValueChange={setProFilter}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs">Expired</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={exportProCSV} className="gap-1 h-8">
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProSubs.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{(s as any).profiles?.full_name || '—'}</TableCell>
                    <TableCell className="capitalize">{s.plan}</TableCell>
                    <TableCell className="text-muted-foreground">{s.pro_started_at ? format(new Date(s.pro_started_at), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.pro_ends_at ? format(new Date(s.pro_ends_at), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="border-0">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatINR(s.amount_per_month || 0)}/mo</TableCell>
                  </TableRow>
                ))}
                {filteredProSubs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminRevenue;
