import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, IndianRupee, BookOpen, Wallet, Clock } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/format';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CreatorDashboard = () => {
  const { user, profile } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ['creator-courses', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: enrollmentStats } = useQuery({
    queryKey: ['creator-enrollment-stats', user?.id],
    queryFn: async () => {
      const courseIds = courses?.map(c => c.id) || [];
      if (courseIds.length === 0) return { total: 0, enrollments: [] };
      const { data } = await supabase.from('enrollments').select('*, courses(title)').in('course_id', courseIds).order('enrolled_at', { ascending: false });
      return { total: data?.length || 0, enrollments: data || [] };
    },
    enabled: !!courses && courses.length > 0,
  });

  const { data: payoutData } = useQuery({
    queryKey: ['creator-payouts-summary', user?.id],
    queryFn: async () => {
      const courseIds = courses?.map(c => c.id) || [];
      if (courseIds.length === 0) return { gross: 0, platformFees: 0, commissions: 0, net: 0 };
      const { data: payments } = await supabase.from('payments').select('amount_total, platform_fee_amount, commission_amount, creator_payout_amount').in('course_id', courseIds).eq('status', 'success');
      const gross = payments?.reduce((s, p) => s + Number(p.amount_total), 0) || 0;
      const fees = payments?.reduce((s, p) => s + Number(p.platform_fee_amount), 0) || 0;
      const comms = payments?.reduce((s, p) => s + Number(p.commission_amount), 0) || 0;
      const net = payments?.reduce((s, p) => s + Number(p.creator_payout_amount), 0) || 0;
      return { gross, platformFees: fees, commissions: comms, net };
    },
    enabled: !!courses && courses.length > 0,
  });

  // Pending approval state
  if (profile?.is_creator && !profile?.creator_approved) {
    return (
      <CreatorDashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="h-16 w-16 text-accent mb-4 animate-pulse" />
          <h1 className="font-heading text-2xl font-700">Application Under Review</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Your creator application is being reviewed. We'll notify you within 24-48 hours.
          </p>
        </div>
      </CreatorDashboardLayout>
    );
  }

  const totalStudents = enrollmentStats?.total || 0;
  const grossRevenue = payoutData?.gross || 0;
  const netEarnings = payoutData?.net || 0;
  const recentEnrollments = enrollmentStats?.enrollments?.slice(0, 10) || [];

  return (
    <CreatorDashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-700 md:text-3xl">Creator Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome, {profile?.creator_display_name || profile?.full_name}</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <Users className="h-5 w-5 text-primary mb-2" />
            <p className="font-heading text-xl font-700">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <IndianRupee className="h-5 w-5 text-accent mb-2" />
            <p className="font-heading text-xl font-700">{formatPrice(grossRevenue)}</p>
            <p className="text-xs text-muted-foreground">Gross Revenue</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Wallet className="h-5 w-5 text-primary mb-2" />
            <p className="font-heading text-xl font-700">{formatPrice(netEarnings)}</p>
            <p className="text-xs text-muted-foreground">Net Earnings</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <BookOpen className="h-5 w-5 text-accent mb-2" />
            <p className="font-heading text-xl font-700">{courses?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </div>
        </div>

        {/* Course performance */}
        {courses && courses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-600">Course Performance</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/creator/courses">View All</Link></Button>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Course</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Students</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {courses.slice(0, 5).map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 text-sm font-medium">{c.title}</td>
                        <td className="px-4 py-3 text-sm">{c.total_students || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            c.status === 'published' ? 'bg-primary/10 text-primary' :
                            c.status === 'pending_review' ? 'bg-accent/10 text-accent' :
                            c.status === 'suspended' ? 'bg-destructive/10 text-destructive' :
                            'bg-secondary text-muted-foreground'
                          }`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent enrollments */}
        {recentEnrollments.length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-600 mb-4">Recent Enrollments</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {recentEnrollments.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{(e as any).courses?.title || 'Course'}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(e.enrolled_at)}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{formatPrice(e.amount_paid)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!courses || courses.length === 0) && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <h2 className="font-heading text-lg font-600">No courses yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create your first course to start earning.</p>
            <Button asChild className="mt-4 rounded-md"><Link to="/creator/courses/new">Create Course</Link></Button>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorDashboard;
