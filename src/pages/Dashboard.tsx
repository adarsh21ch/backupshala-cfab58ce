import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const { user, profile } = useAuth();

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('is_published', true).order('order_index');
      return data || [];
    },
  });

  const { data: completions } = useQuery({
    queryKey: ['completions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('*').eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
  const totalModules = courses?.reduce((sum, c) => sum + (c.modules?.length || 0), 0) || 0;
  const totalCompleted = completions?.length || 0;
  const overallProgress = totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0;
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const daysSinceEnrolled = profile?.enrolled_at
    ? Math.floor((Date.now() - new Date(profile.enrolled_at).getTime()) / 86400000)
    : profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    : 0;

  const coursesInProgress = courses?.filter(c => {
    const mods = c.modules || [];
    const completed = mods.filter((m: any) => completedModuleIds.has(m.id)).length;
    return completed > 0 && completed < mods.length;
  }).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-700 md:text-3xl">Welcome back, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.enrolled_at ? `Enrolled on ${new Date(profile.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Continue your learning journey'}
          </p>
        </div>

        {/* Overall Progress */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-sm font-600">Overall Progress</p>
            <span className="text-sm font-semibold text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <p className="mt-2 text-xs text-muted-foreground">{totalCompleted} of {totalModules} modules completed</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: CheckCircle, label: 'Completed', value: totalCompleted, color: 'text-primary' },
            { icon: BookOpen, label: 'In Progress', value: coursesInProgress, color: 'text-accent' },
            { icon: Users, label: 'Referral Earnings', value: `₹${profile?.wallet_balance || 0}`, color: 'text-primary' },
            { icon: Clock, label: 'Days Active', value: daysSinceEnrolled, color: 'text-accent' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="font-heading text-xl font-700">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Course Cards */}
        <div>
          <h2 className="font-heading text-lg font-600 mb-4">My Courses</h2>
          {coursesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses?.map(course => {
                const mods = course.modules || [];
                const completed = mods.filter((m: any) => completedModuleIds.has(m.id)).length;
                const progress = mods.length > 0 ? Math.round((completed / mods.length) * 100) : 0;
                const isStarted = completed > 0;

                return (
                  <div key={course.id} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-heading text-base font-600 line-clamp-2">{course.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{completed} of {mods.length} modules</p>
                    <Progress value={progress} className="mt-3 h-1.5" />
                    <Button asChild size="sm" className="mt-4 w-full rounded-pill bg-primary/10 text-primary hover:bg-primary/20" variant="ghost">
                      <Link to={`/courses/${course.id}`}>
                        {isStarted ? 'Continue' : 'Start'}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {completions && completions.length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-600 mb-4">Recent Activity</h2>
            <div className="rounded-2xl border border-border bg-card">
              {completions.slice(-5).reverse().map((c, i) => (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">Module completed</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
