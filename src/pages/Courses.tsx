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

  const { data: courses } = useQuery({
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

  const filteredCourses = courses?.filter(c => {
    const mods = c.modules || [];
    const completed = mods.filter((m: any) => completedModuleIds.has(m.id)).length;
    if (filter === 'progress') return completed > 0 && completed < mods.length;
    if (filter === 'completed') return completed === mods.length && mods.length > 0;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-700">Courses</h1>
          <div className="flex gap-2">
            {(['all', 'progress', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f === 'progress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses?.map(course => {
            const mods = course.modules || [];
            const completed = mods.filter((m: any) => completedModuleIds.has(m.id)).length;
            const progress = mods.length > 0 ? Math.round((completed / mods.length) * 100) : 0;

            return (
              <div key={course.id} className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-base font-600">{course.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{completed} of {mods.length} modules</p>
                <Progress value={progress} className="mt-2 h-1.5" />
                <Button asChild size="sm" className="mt-4 w-full rounded-pill" variant={completed > 0 ? 'default' : 'outline'}>
                  <Link to={`/courses/${course.id}`}>{progress === 100 ? 'Review' : completed > 0 ? 'Continue' : 'Start'}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Courses;
