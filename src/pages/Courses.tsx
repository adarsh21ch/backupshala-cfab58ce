import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const Courses = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'progress' | 'completed'>('all');

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('*, courses(id, title, slug, short_description, thumbnail_url, total_modules, creator_id, profiles:creator_id(creator_slug), modules(id, module_tier))')
        .eq('student_id', user!.id)
        .order('enrolled_at', { ascending: false });
      return data || [];
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

  const completionsByCourse = completions?.reduce((acc: Record<string, number>, c) => {
    acc[c.course_id] = (acc[c.course_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const filtered = enrollments?.filter(e => {
    const total = (e as any).courses?.total_modules || 0;
    const completed = completionsByCourse[e.course_id] || 0;
    if (filter === 'progress') return completed > 0 && !e.is_completed;
    if (filter === 'completed') return e.is_completed;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-2xl font-700">My Courses</h1>
          <div className="flex gap-2">
            {(['all', 'progress', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                {f === 'all' ? 'All' : f === 'progress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((enrollment: any) => {
              const course = enrollment.courses;
              const total = course?.total_modules || 0;
              const completed = completionsByCourse[enrollment.course_id] || 0;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              const tier = enrollment.tier || 'basic';
              const advancedCount = (course?.modules || []).filter((m: any) => m.module_tier === 'advanced').length;
              const canUpgrade = tier === 'basic' && advancedCount > 0;
              const creatorSlug = course?.profiles?.creator_slug || course?.creator_id;
              return (
                <div key={enrollment.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                  {course?.thumbnail_url && (
                    <img src={course.thumbnail_url} alt={course?.title} loading="lazy" className="h-36 w-full object-cover" />
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-heading text-base font-600 line-clamp-2 flex-1">{course?.title}</h3>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        tier === 'advanced'
                          ? 'bg-info/15 text-info'
                          : 'bg-primary/15 text-primary'
                      }`}>
                        {tier}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{course?.short_description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{completed} of {total} modules</p>
                    <Progress value={progress} className="mt-2 h-1.5" />
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enrollment.is_completed ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {enrollment.is_completed ? 'Completed' : 'In Progress'}
                      </span>
                      <span className="text-xs font-medium">{progress}%</span>
                    </div>
                    <Button asChild size="sm" className="mt-4 w-full rounded-md" variant={completed > 0 ? 'default' : 'outline'}>
                      <Link to={`/courses/${enrollment.course_id}`}>{progress === 100 ? 'Review' : completed > 0 ? 'Continue' : 'Start'}</Link>
                    </Button>
                    {canUpgrade && (
                      <Button asChild size="sm" variant="ghost" className="mt-2 w-full rounded-md text-accent hover:text-accent hover:bg-accent/10">
                        <Link to={`/c/${creatorSlug}/${course.slug}`}>
                          ✨ Upgrade to Advanced ({advancedCount} more module{advancedCount > 1 ? 's' : ''})
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <h2 className="font-heading text-lg font-600">No courses found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter !== 'all' ? 'Try switching filters.' : "You haven't enrolled in any courses yet."}
            </p>
            <Button asChild className="mt-4 rounded-md"><Link to="/explore">Explore Courses</Link></Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Courses;
