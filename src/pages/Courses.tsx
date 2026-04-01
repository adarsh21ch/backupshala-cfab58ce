import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

const Courses = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'progress' | 'completed'>('all');

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('*, courses(title, slug, short_description, total_modules)')
        .eq('student_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: completions } = useQuery({
    queryKey: ['completions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('*').eq('student_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const completionsByCoure = completions?.reduce((acc: Record<string, number>, c) => {
    acc[c.course_id] = (acc[c.course_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const filtered = enrollments?.filter(e => {
    const total = (e as any).courses?.total_modules || 0;
    const completed = completionsByCoure[e.course_id] || 0;
    if (filter === 'progress') return completed > 0 && completed < total;
    if (filter === 'completed') return e.is_completed;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-700">My Courses</h1>
          <div className="flex gap-2">
            {(['all', 'progress', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                {f === 'all' ? 'All' : f === 'progress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((enrollment: any) => {
            const course = enrollment.courses;
            const total = course?.total_modules || 0;
            const completed = completionsByCoure[enrollment.course_id] || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={enrollment.id} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-base font-600">{course?.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{course?.short_description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{completed} of {total} modules</p>
                <Progress value={progress} className="mt-2 h-1.5" />
                <Button asChild size="sm" className="mt-4 w-full rounded-md" variant={completed > 0 ? 'default' : 'outline'}>
                  <Link to={`/courses/${enrollment.course_id}`}>{progress === 100 ? 'Review' : completed > 0 ? 'Continue' : 'Start'}</Link>
                </Button>
              </div>
            );
          })}
        </div>
        {filtered?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No courses found.</p>
            <Button asChild className="mt-4 rounded-md"><Link to="/explore">Explore Courses</Link></Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Courses;
