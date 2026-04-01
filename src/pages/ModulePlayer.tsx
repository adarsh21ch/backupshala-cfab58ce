import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const ModulePlayer = () => {
  const { id: courseId, moduleId } = useParams<{ id: string; moduleId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('id', courseId!).single();
      if (data?.modules) data.modules.sort((a: any, b: any) => a.order_index - b.order_index);
      return data;
    },
    enabled: !!courseId,
  });

  const { data: completions } = useQuery({
    queryKey: ['completions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('*').eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('is_published', true);
      return data || [];
    },
  });

  const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
  const modules = course?.modules || [];
  const currentIndex = modules.findIndex((m: any) => m.id === moduleId);
  const currentModule = modules[currentIndex];
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
  const isCompleted = moduleId ? completedModuleIds.has(moduleId) : false;

  const markComplete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('module_completions').insert({
        user_id: user!.id,
        module_id: moduleId!,
      });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['completions'] });
      toast({ title: 'Module completed! ✅' });

      // Check if all courses are complete
      const totalModules = allCourses?.reduce((sum, c) => sum + (c.modules?.length || 0), 0) || 0;
      const newCompletedCount = (completions?.length || 0) + 1;
      if (newCompletedCount >= totalModules) {
        setShowCelebration(true);
        // Call certificate edge function
        try {
          await supabase.functions.invoke('check-and-issue-certificate', {
            body: { user_id: user!.id },
          });
        } catch {}
        setTimeout(() => navigate('/certificate'), 4000);
      }
    },
    onError: () => {
      toast({ title: 'Failed to mark complete', variant: 'destructive' });
    },
  });

  if (!currentModule) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></DashboardLayout>;

  if (showCelebration) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Trophy className="h-20 w-20 text-accent mb-4 animate-bounce" />
          <h1 className="font-heading text-3xl font-800 text-primary">🏆 Congratulations!</h1>
          <p className="mt-2 text-lg text-muted-foreground">You've completed all courses!</p>
          <p className="mt-1 text-sm text-muted-foreground">Your certificate is being generated…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to {course?.title}
        </Link>

        {/* Video */}
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-card">
          <iframe
            src={currentModule.video_url}
            title={currentModule.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Module info */}
        <div>
          <h1 className="font-heading text-xl font-700">{currentModule.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{currentModule.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">{currentModule.duration_minutes} minutes</p>
        </div>

        {/* Mark complete */}
        {isCompleted ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Module completed!</span>
          </div>
        ) : (
          <Button
            onClick={() => markComplete.mutate()}
            disabled={markComplete.isPending}
            className="rounded-pill bg-primary hover:bg-primary/90 font-semibold"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Complete ✓
          </Button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {prevModule ? (
            <Button asChild variant="outline" size="sm" className="rounded-pill">
              <Link to={`/courses/${courseId}/module/${prevModule.id}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Link>
            </Button>
          ) : <div />}
          {nextModule && (
            <Button asChild size="sm" className="rounded-pill bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to={`/courses/${courseId}/module/${nextModule.id}`}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ModulePlayer;
