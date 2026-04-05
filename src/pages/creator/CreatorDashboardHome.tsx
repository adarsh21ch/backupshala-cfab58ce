import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, IndianRupee, BookOpen, Wallet, Clock } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/format';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/dashboard/KPICard';
import EmptyState from '@/components/dashboard/EmptyState';
import { SkeletonKPI } from '@/components/dashboard/SkeletonCards';

const CreatorDashboard = () => {
  const { user, profile } = useAuth();

  const { data: courses, isLoading: coursesLoading } = useQuery({
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

  if (profile?.is_creator && !profile?.creator_approved) {
    return (
      <CreatorDashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Clock className="h-8 w-8 text-accent animate-pulse" />
          </div>
          <h1 className="font-heading text-2xl font-800">Application Under Review</h1>
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
          <h1 className="font-heading text-2xl font-800 md:text-3xl">Creator Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome, {profile?.creator_display_name || profile?.full_name}</p>
        </div>

        {coursesLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KPICard icon={Users} label="Total Students" value={totalStudents} color="primary" />
            <KPICard icon={IndianRupee} label="Gross Revenue" value={formatPrice(grossRevenue)} color="accent" />
            <KPICard icon={Wallet} label="Net Earnings" value={formatPrice(netEarnings)} color="primary" />
            <KPICard icon={BookOpen} label="Courses" value={courses?.length || 0} color="accent" />
          </div>
        )}

        {/* Course performance */}
        {courses && courses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-700">Course Performance</h2>
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
                      <tr key={c.id} className="transition-colors hover:bg-muted/5">
                        <td className="px-4 py-3 text-sm font-medium">{c.title}</td>
                        <td className="px-4 py-3 text-sm">{c.total_students || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            c.status === 'published' ? 'bg-primary/10 text-primary' :
                            c.status === 'pending_review' ? 'bg-accent/10 text-accent' :
                            c.status === 'suspended' ? 'bg-destructive/10 text-destructive' :
                            'bg-secondary text-muted-foreground'
                          }`}>{(c.status || 'draft').replace('_', ' ')}</span>
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
            <h2 className="font-heading text-lg font-700 mb-4">Recent Enrollments</h2>
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

        {(!courses || courses.length === 0) && !coursesLoading && (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Create your first course to start earning."
            actionLabel="Create Course"
            actionTo="/creator/courses/new"
          />
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorDashboard;
