import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Play } from 'lucide-react';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: course } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('id', id!).single();
      if (data?.modules) data.modules.sort((a: any, b: any) => a.order_index - b.order_index);
      return data;
    },
    enabled: !!id,
  });

  const { data: completions } = useQuery({
    queryKey: ['completions-course', user?.id, id],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('*').eq('student_id', user!.id).eq('course_id', id!);
      return data || [];
    },
    enabled: !!user && !!id,
  });

  const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
  const modules = course?.modules || [];
  const completedCount = modules.filter((m: any) => completedModuleIds.has(m.id)).length;
  const progress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const nextModule = modules.find((m: any) => !completedModuleIds.has(m.id));

  if (!course) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-700">{course.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{course.short_description}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Course Progress</span>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">{completedCount} of {modules.length} modules completed</p>
          {nextModule && (
            <Button asChild size="sm" className="mt-4 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to={`/courses/${course.id}/module/${nextModule.id}`}>Continue Learning →</Link>
            </Button>
          )}
        </div>

        {course.what_you_learn && course.what_you_learn.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-base font-600 mb-3">What You'll Learn</h2>
            <ul className="space-y-2">
              {course.what_you_learn.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-heading text-lg font-600 mb-4">Modules</h2>
          <div className="space-y-2">
            {modules.map((m: any, i: number) => {
              const isCompleted = completedModuleIds.has(m.id);
              return (
                <Link key={m.id} to={`/courses/${course.id}/module/${m.id}`}
                  className={`flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 ${isCompleted ? 'opacity-80' : ''}`}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.duration_minutes} min</p>
                  </div>
                  {isCompleted ? <CheckCircle className="h-5 w-5 shrink-0 text-primary" /> : <Play className="h-5 w-5 shrink-0 text-muted-foreground" />}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetail;
