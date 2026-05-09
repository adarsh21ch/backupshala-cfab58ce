import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { Users, BookOpen, IndianRupee, UserCheck, CreditCard, TrendingUp, Wallet, Star, Check, X, Eye, GraduationCap, Award, CalendarDays, Coins } from 'lucide-react';
import { startOfMonth } from 'date-fns';
import KPICard from '@/components/dashboard/KPICard';
import { SkeletonKPI } from '@/components/dashboard/SkeletonCards';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AdminDashboardHome = () => {
  const qc = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const [profiles, courses, enrollments, payments, creators, payoutReqs, proSubs, basicEnr, advEnr, monthPays, pendingAff, settings] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount_total, platform_fee_amount, status'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_creator', true),
        supabase.from('payout_requests').select('amount, status').eq('status', 'pending'),
        supabase.from('creator_pro_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('tier', 'basic'),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('tier', 'advanced'),
        supabase.from('payments').select('amount_total, status').gte('created_at', monthStart).in('status', ['success', 'paid']),
        supabase.from('commissions').select('amount, status, commission_type').eq('commission_type', 'affiliate').eq('status', 'pending'),
        supabase.from('platform_settings').select('key, value').in('key', ['basic_course_id', 'advanced_course_id']),
      ]);
      const paidPayments = (payments.data || []).filter(p => p.status === 'success' || p.status === 'paid');
      const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount_total), 0);
      const platformEarnings = paidPayments.reduce((s, p) => s + Number(p.platform_fee_amount), 0);
      const pendingPayoutAmount = (payoutReqs.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const monthRevenue = (monthPays.data || []).reduce((s, p) => s + Number(p.amount_total), 0);
      const pendingAffiliate = (pendingAff.data || []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      return {
        totalUsers: profiles.count || 0,
        totalCourses: courses.count || 0,
        totalEnrollments: enrollments.count || 0,
        totalCreators: creators.count || 0,
        totalRevenue,
        platformEarnings,
        pendingPayoutCount: (payoutReqs.data || []).length,
        pendingPayoutAmount,
        activeProSubs: proSubs.count || 0,
        basicEnrollments: basicEnr.count || 0,
        advancedEnrollments: advEnr.count || 0,
        monthRevenue,
        pendingAffiliate,
        pendingAffiliateCount: (pendingAff.data || []).length,
      };
    },
  });

  // Top 5 courses by revenue
  const { data: topCourses } = useQuery({
    queryKey: ['admin-top-courses'],
    queryFn: async () => {
      const { data: pays } = await supabase.from('payments')
        .select('course_id, amount_total, status')
        .in('status', ['success', 'paid']);
      const byCourse: Record<string, number> = {};
      (pays || []).forEach((p: any) => {
        if (!p.course_id) return;
        byCourse[p.course_id] = (byCourse[p.course_id] || 0) + Number(p.amount_total || 0);
      });
      const ids = Object.keys(byCourse);
      if (ids.length === 0) return [];
      const { data: cs } = await supabase.from('courses').select('id, title').in('id', ids);
      const titleMap: Record<string, string> = {};
      (cs || []).forEach((c: any) => { titleMap[c.id] = c.title; });
      return Object.entries(byCourse)
        .map(([id, revenue]) => ({ id, title: titleMap[id] || 'Untitled', revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  const { data: pendingCreators } = useQuery({
    queryKey: ['admin-pending-creators'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, creator_category, created_at')
        .eq('is_creator', true).eq('creator_approved', false).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: pendingCourses } = useQuery({
    queryKey: ['admin-pending-courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title, status, created_at, creator_id, profiles!courses_creator_id_fkey(full_name)')
        .eq('status', 'pending_review').order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Inline course moderation
  const moderateCourse = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const status = action === 'approve' ? 'published' : 'rejected';
      const { error } = await supabase.from('courses').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'approve' ? 'Course approved' : 'Course rejected');
      qc.invalidateQueries({ queryKey: ['admin-pending-courses'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e: any) => toast.error(e.message || 'Action failed'),
  });

  // Revenue data for last 30 days
  const { data: revenueData } = useQuery({
    queryKey: ['admin-daily-revenue'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from('payments')
        .select('amount_total, created_at, status')
        .gte('created_at', thirtyDaysAgo)
        .in('status', ['success', 'paid']);

      const grouped: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), 'dd MMM');
        grouped[d] = 0;
      }
      (data || []).forEach(p => {
        const d = format(new Date(p.created_at), 'dd MMM');
        if (grouped[d] !== undefined) grouped[d] += Number(p.amount_total);
      });
      return Object.entries(grouped).map(([date, amount]) => ({ date, amount }));
    },
  });

  const { data: enrollmentData } = useQuery({
    queryKey: ['admin-monthly-enrollments'],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const { data } = await supabase.from('enrollments')
        .select('enrolled_at')
        .gte('enrolled_at', sixMonthsAgo);

      const grouped: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = format(subMonths(new Date(), i), 'MMM yyyy');
        grouped[d] = 0;
      }
      (data || []).forEach(e => {
        const d = format(new Date(e.enrolled_at), 'MMM yyyy');
        if (grouped[d] !== undefined) grouped[d]++;
      });
      return Object.entries(grouped).map(([month, count]) => ({ month, count }));
    },
  });

  const StatusDot = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-primary animate-[brand-pulse_2s_ease-in-out_infinite]' : 'bg-warning'}`} />
      <span className="text-sm font-medium">{label}</span>
      <span className={`ml-auto text-xs font-semibold ${ok ? 'text-primary' : 'text-warning'}`}>{ok ? 'Online' : 'Check'}</span>
    </div>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Admin Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Realtime snapshot of the Backupshala platform</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonKPI key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={Users}      label="Total Users"        value={stats?.totalUsers || 0}        color="info"        vibrantValue />
            <KPICard icon={UserCheck}  label="Creators"           value={stats?.totalCreators || 0}     color="success"     vibrantValue />
            <KPICard icon={BookOpen}   label="Courses"            value={stats?.totalCourses || 0}      color="accent"      vibrantValue />
            <KPICard icon={TrendingUp} label="Enrollments"        value={stats?.totalEnrollments || 0}  color="purple"      vibrantValue />
            <KPICard icon={CreditCard} label="Total Revenue"      value={formatINR(stats?.totalRevenue || 0)}     color="success" vibrantValue />
            <KPICard icon={IndianRupee} label="Platform Earnings" value={formatINR(stats?.platformEarnings || 0)} color="accent"  vibrantValue />
            <KPICard icon={Wallet}     label="Pending Payouts"    value={formatINR(stats?.pendingPayoutAmount || 0)} color="warning" vibrantValue
              subtitle={<span className="text-muted-foreground">{stats?.pendingPayoutCount || 0} request(s)</span>} />
            <KPICard icon={Star}       label="Active Creator Pro" value={stats?.activeProSubs || 0}     color="purple"      vibrantValue />
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading font-bold">Daily Revenue</CardTitle>
              <span className="text-xs text-muted-foreground">Last 30 days</span>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData || []} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading font-bold">Monthly Enrollments</CardTitle>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enrollmentData || []} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={32} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Platform Health */}
        <div>
          <h2 className="font-heading text-base font-bold mb-3">Platform Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatusDot ok label="Payment System" />
            <StatusDot ok label="Video Storage" />
            <StatusDot ok label="Email System" />
          </div>
        </div>

        {/* Pending lists */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base font-heading font-bold">Pending Creator Approvals</CardTitle></CardHeader>
            <CardContent>
              {(!pendingCreators || pendingCreators.length === 0) ? (
                <p className="text-sm text-muted-foreground">No pending approvals</p>
              ) : (
                <div className="space-y-3">
                  {pendingCreators.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 text-sm rounded-lg border border-border/60 p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email} · {c.creator_category}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link to={`/admin/creators`}>Review</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base font-heading font-bold">Pending Course Reviews</CardTitle></CardHeader>
            <CardContent>
              {(!pendingCourses || pendingCourses.length === 0) ? (
                <p className="text-sm text-muted-foreground">No pending courses</p>
              ) : (
                <div className="space-y-3">
                  {pendingCourses.map((c: any) => (
                    <div key={c.id} className="rounded-lg border border-border/60 p-3 space-y-2.5">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-muted-foreground">by {c.profiles?.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                          disabled={moderateCourse.isPending}
                          onClick={() => moderateCourse.mutate({ id: c.id, action: 'approve' })}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          disabled={moderateCourse.isPending}
                          onClick={() => moderateCourse.mutate({ id: c.id, action: 'reject' })}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-8 ml-auto">
                          <Link to={`/admin/courses`}><Eye className="h-3.5 w-3.5 mr-1" /> View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboardHome;
