import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/lib/format';
import { Users, BookOpen, IndianRupee, UserCheck, CreditCard, TrendingUp } from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import { SkeletonKPI } from '@/components/dashboard/SkeletonCards';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const AdminDashboardHome = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profiles, courses, enrollments, payments, creators, payoutReqs] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount_total, platform_fee_amount, status'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_creator', true),
        supabase.from('payout_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      const paidPayments = (payments.data || []).filter(p => p.status === 'success');
      const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount_total), 0);
      const platformEarnings = paidPayments.reduce((s, p) => s + Number(p.platform_fee_amount), 0);
      return {
        totalUsers: profiles.count || 0,
        totalCourses: courses.count || 0,
        totalEnrollments: enrollments.count || 0,
        totalCreators: creators.count || 0,
        totalRevenue,
        platformEarnings,
        pendingPayouts: payoutReqs.count || 0,
      };
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

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-800">Admin Overview</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonKPI key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="primary" />
            <KPICard icon={UserCheck} label="Creators" value={stats?.totalCreators || 0} color="accent" />
            <KPICard icon={BookOpen} label="Courses" value={stats?.totalCourses || 0} color="info" />
            <KPICard icon={TrendingUp} label="Enrollments" value={stats?.totalEnrollments || 0} color="primary" />
            <KPICard icon={CreditCard} label="Total Revenue" value={formatINR(stats?.totalRevenue || 0)} color="warning" />
            <KPICard icon={IndianRupee} label="Platform Earnings" value={formatINR(stats?.platformEarnings || 0)} color="primary" />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base font-heading font-700">Pending Creator Approvals</CardTitle></CardHeader>
            <CardContent>
              {(!pendingCreators || pendingCreators.length === 0) ? (
                <p className="text-sm text-muted-foreground">No pending approvals</p>
              ) : (
                <div className="space-y-3">
                  {pendingCreators.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">{c.email} · {c.creator_category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base font-heading font-700">Pending Course Reviews</CardTitle></CardHeader>
            <CardContent>
              {(!pendingCourses || pendingCourses.length === 0) ? (
                <p className="text-sm text-muted-foreground">No pending courses</p>
              ) : (
                <div className="space-y-3">
                  {pendingCourses.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">by {c.profiles?.full_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {stats?.pendingPayouts ? (
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4 flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-accent" />
              <p className="text-sm font-medium">{stats.pendingPayouts} pending payout request(s) need attention</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboardHome;
