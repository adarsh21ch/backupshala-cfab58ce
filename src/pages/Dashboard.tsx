import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Award, IndianRupee, Clock } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/format';
import CommunityDashboardCard from '@/components/module/CommunityDashboardCard';
import KPICard from '@/components/dashboard/KPICard';
import EmptyState from '@/components/dashboard/EmptyState';
import { SkeletonKPI, SkeletonCourseCard } from '@/components/dashboard/SkeletonCards';
import LearningStreak from '@/components/dashboard/LearningStreak';

const Dashboard = () => {
  const { user, profile } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('*, courses(title, slug, thumbnail_url, total_modules, creator_id, profiles:creator_id(creator_slug), modules(id, module_tier))')
        .eq('student_id', user!.id)
        .order('enrolled_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ['my-wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: completions } = useQuery({
    queryKey: ['all-completions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('course_id, module_id').eq('student_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: certificates } = useQuery({
    queryKey: ['my-certificates-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('student_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentNotifications } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const completionsByCourse = completions?.reduce((acc: Record<string, number>, c) => {
    acc[c.course_id] = (acc[c.course_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const totalModulesCompleted = completions?.length || 0;
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const inProgressEnrollments = enrollments?.filter(e => {
    const total = (e as any).courses?.total_modules || 0;
    const done = completionsByCourse[e.course_id] || 0;
    return !e.is_completed && done < total;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-800 md:text-3xl">{greeting}, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your learning dashboard</p>
        </div>

        {/* KPI Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KPICard icon={BookOpen} label="Enrolled" value={enrollments?.length || 0} color="primary" />
            <KPICard icon={CheckCircle} label="Modules Done" value={totalModulesCompleted} color="primary" />
            <KPICard icon={Award} label="Certificates" value={certificates || 0} color="accent" />
            <Link to="/dashboard/wallet"><KPICard icon={IndianRupee} label="Wallet" value={formatPrice(wallet?.balance || 0)} color="accent" /></Link>
          </div>
        )}

        {enrollments && enrollments.length > 0 && <CommunityDashboardCard />}
        
        {/* Learning Streak */}
        <LearningStreak />

        {/* Continue Learning */}
        {inProgressEnrollments.length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-700 mb-4">Continue Learning</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inProgressEnrollments.slice(0, 3).map((enrollment: any) => {
                const course = enrollment.courses;
                const totalModules = course?.total_modules || 0;
                const completedModules = completionsByCourse[enrollment.course_id] || 0;
                const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
                return (
                  <div key={enrollment.id} className="rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:-translate-y-0.5">
                    {course?.thumbnail_url && (
                      <img src={course.thumbnail_url} alt={course?.title} className="mb-3 h-32 w-full rounded-lg object-cover" />
                    )}
                    <h3 className="font-heading text-sm font-700 line-clamp-2">{course?.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{completedModules} of {totalModules} modules</p>
                    <Progress value={progress} className="mt-2 h-1.5" />
                    <Button asChild size="sm" className="mt-4 w-full rounded-lg">
                      <Link to={`/courses/${enrollment.course_id}`}>Continue →</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-700">My Courses</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/courses">View All</Link></Button>
          </div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <SkeletonCourseCard key={i} />)}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.slice(0, 6).map((enrollment: any) => {
                const course = enrollment.courses;
                const totalModules = course?.total_modules || 0;
                const completedModules = completionsByCourse[enrollment.course_id] || 0;
                const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
                const tier = enrollment.tier || 'basic';
                const advancedCount = (course?.modules || []).filter((m: any) => m.module_tier === 'advanced').length;
                const canUpgrade = tier === 'basic' && advancedCount > 0;
                const creatorSlug = course?.profiles?.creator_slug || course?.creator_id;
                return (
                  <div key={enrollment.id} className="rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-sm font-700 line-clamp-2 flex-1">{course?.title}</h3>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        tier === 'advanced' ? 'bg-info/15 text-info' : 'bg-primary/15 text-primary'
                      }`}>
                        {tier}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{completedModules} of {totalModules} modules</p>
                    <Progress value={progress} className="mt-2 h-1.5" />
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enrollment.is_completed ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {enrollment.is_completed ? '✓ Completed' : `${progress}%`}
                      </span>
                    </div>
                    <Button asChild size="sm" className="mt-3 w-full rounded-lg" variant={progress > 0 ? 'default' : 'outline'}>
                      <Link to={`/courses/${enrollment.course_id}`}>{progress === 100 ? 'Review' : progress > 0 ? 'Continue' : 'Start'}</Link>
                    </Button>
                    {canUpgrade && (
                      <Button asChild size="sm" variant="ghost" className="mt-1.5 w-full rounded-lg text-accent hover:text-accent hover:bg-accent/10 text-xs h-8">
                        <Link to={`/c/${creatorSlug}/${course.slug}`}>✨ Upgrade — unlock {advancedCount} more</Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="You haven't enrolled in any courses yet. Explore and start learning!"
              actionLabel="Explore Courses"
              actionTo="/explore"
            />
          )}
        </div>

        {/* Recent Activity */}
        {recentNotifications && recentNotifications.length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-700 mb-4">Recent Activity</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {recentNotifications.slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-3 p-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-700">Explore More</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/explore">Browse All</Link></Button>
          </div>
          <p className="text-sm text-muted-foreground">Discover new courses on the <Link to="/explore" className="text-primary hover:underline">Explore page</Link>.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
