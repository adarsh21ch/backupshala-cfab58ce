import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Award, IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';

const Dashboard = () => {
  const { user, profile } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('*, courses(title, slug, thumbnail_url, total_modules, modules(id)), module_completions:module_completions(module_id)')
        .eq('student_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: certificates } = useQuery({
    queryKey: ['my-certificates', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('certificates').select('id').eq('student_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-700 md:text-3xl">{greeting}, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your learning dashboard</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: BookOpen, label: 'Enrolled', value: enrollments?.length || 0, color: 'text-primary' },
            { icon: CheckCircle, label: 'Completed', value: enrollments?.filter((e: any) => e.is_completed).length || 0, color: 'text-primary' },
            { icon: Award, label: 'Certificates', value: certificates?.length || 0, color: 'text-accent' },
            { icon: IndianRupee, label: 'Wallet', value: formatPrice(profile?.wallet_balance || 0), color: 'text-primary' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="font-heading text-xl font-700">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-600">My Courses</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/explore">Browse More</Link></Button>
          </div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment: any) => {
                const course = enrollment.courses;
                const totalModules = course?.total_modules || 0;
                const completedModules = enrollment.module_completions?.length || 0;
                const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
                return (
                  <div key={enrollment.id} className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-heading text-sm font-600 line-clamp-2">{course?.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{completedModules} of {totalModules} modules</p>
                    <Progress value={progress} className="mt-2 h-1.5" />
                    <Button asChild size="sm" className="mt-4 w-full rounded-md" variant={progress > 0 ? 'default' : 'outline'}>
                      <Link to={`/courses/${enrollment.course_id}`}>{progress === 100 ? 'Review' : progress > 0 ? 'Continue' : 'Start'}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">You haven't enrolled in any courses yet.</p>
              <Button asChild className="mt-4 rounded-md"><Link to="/explore">Explore Courses</Link></Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
