import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, ChevronLeft, ChevronRight, Trophy, Play, BookOpen, Users, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';
import ResourceModuleView from '@/components/module/ResourceModuleView';
import CommunityModuleView from '@/components/module/CommunityModuleView';
import { SequentialLockScreen, MentorGateScreen, WaitingMentorScreen } from '@/components/module/GateScreens';
import AudioNotePlayer from '@/components/module/AudioNotePlayer';

const moduleTypeIcon = (type: string) => {
  if (type === 'resource') return <BookOpen className="h-3 w-3" />;
  if (type === 'community') return <Users className="h-3 w-3" />;
  return <Play className="h-3 w-3" />;
};

const ModulePlayer = () => {
  const { id: courseId, moduleId } = useParams<{ id: string; moduleId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('id', courseId!).single();
      if (data?.modules) data.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      return data;
    },
    enabled: !!courseId,
  });

  const { data: completions } = useQuery({
    queryKey: ['completions-course', user?.id, courseId],
    queryFn: async () => {
      const { data } = await supabase.from('module_completions').select('*').eq('student_id', user!.id).eq('course_id', courseId!);
      return data || [];
    },
    enabled: !!user && !!courseId,
  });

  const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
  const modules = course?.modules || [];
  const currentIndex = modules.findIndex((m: any) => m.id === moduleId);
  const currentModule = modules[currentIndex] as any;
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;
  const isCompleted = moduleId ? completedModuleIds.has(moduleId) : false;
  const completedCount = modules.filter((m: any) => completedModuleIds.has(m.id)).length;
  const overallProgress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  const markComplete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('module_completions').insert({
        student_id: user!.id,
        module_id: moduleId!,
        course_id: courseId!,
      });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['completions-course'] });
      await queryClient.invalidateQueries({ queryKey: ['all-completions'] });
      toast({ title: 'Module completed! ✅' });
      const newCompletedCount = completedCount + 1;
      if (newCompletedCount >= modules.length) {
        setShowCelebration(true);
        try {
          await supabase.functions.invoke('check-and-issue-certificate', {
            body: { student_id: user!.id, course_id: courseId! },
          });
        } catch {}
        setTimeout(() => navigate('/dashboard/certificates'), 4000);
      } else if (nextModule) {
        setTimeout(() => navigate(`/courses/${courseId}/module/${(nextModule as any).id}`), 1500);
      }
    },
    onError: () => toast({ title: 'Failed to mark complete', variant: 'destructive' }),
  });

  const handleAutoComplete = useCallback(() => {
    if (!isCompleted && !markComplete.isPending) {
      markComplete.mutate();
    }
  }, [isCompleted, markComplete]);

  if (courseLoading) return (
    <DashboardLayout>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    </DashboardLayout>
  );

  if (!currentModule) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Module not found</p>
        <Button asChild className="mt-4"><Link to={`/courses/${courseId}`}>Back to Course</Link></Button>
      </div>
    </DashboardLayout>
  );

  if (showCelebration) return (
    <DashboardLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Trophy className="h-20 w-20 text-accent mb-4 animate-bounce" />
        <h1 className="font-heading text-3xl font-800 text-primary">🏆 Congratulations!</h1>
        <p className="mt-2 text-lg text-muted-foreground">You've completed this course!</p>
        <p className="mt-1 text-sm text-muted-foreground">Your certificate is being generated…</p>
      </div>
    </DashboardLayout>
  );

  const moduleType = (currentModule as any).module_type || 'video';
  const resources = (currentModule as any).resources || [];

  return (
    <DashboardLayout>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to {course?.title}
          </Link>

          <div className="flex items-center gap-3">
            <Progress value={overallProgress} className="h-1.5 flex-1" />
            <span className="text-xs font-medium text-muted-foreground">{overallProgress}%</span>
          </div>

          {/* Content based on module type */}
          {moduleType === 'resource' ? (
            <ResourceModuleView
              title={currentModule.title}
              description={currentModule.description}
              resources={resources}
              onAutoComplete={handleAutoComplete}
              isCompleted={isCompleted}
            />
          ) : moduleType === 'community' ? (
            <CommunityModuleView
              title={currentModule.title}
              description={currentModule.description}
              resources={resources}
              onAutoComplete={handleAutoComplete}
              isCompleted={isCompleted}
            />
          ) : (
            <>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-card">
                <iframe
                  src={currentModule.video_url}
                  title={currentModule.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div>
                <h1 className="font-heading text-xl font-700">{currentModule.title}</h1>
                {currentModule.description && <p className="mt-2 text-sm text-muted-foreground">{currentModule.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{currentModule.duration_minutes} minutes</p>
              </div>
              {isCompleted ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Module completed!</span>
                </div>
              ) : (
                <Button onClick={() => markComplete.mutate()} disabled={markComplete.isPending} className="rounded-md bg-primary hover:bg-primary/90 font-semibold">
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Complete ✓
                </Button>
              )}
            </>
          )}

          {/* Completed badge for resource/community */}
          {moduleType !== 'video' && isCompleted && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Module completed!</span>
            </div>
          )}

          {/* Prev / Next */}
          <div className="flex items-center justify-between pt-2">
            {prevModule ? (
              <Button asChild variant="outline" size="sm" className="rounded-md">
                <Link to={`/courses/${courseId}/module/${(prevModule as any).id}`}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Link>
              </Button>
            ) : <div />}
            {nextModule && (
              <Button asChild size="sm" className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to={`/courses/${courseId}/module/${(nextModule as any).id}`}>Next <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="font-heading text-sm font-600">Course Content</h3>
              <p className="text-xs text-muted-foreground mt-1">{completedCount}/{modules.length} completed</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {modules.map((m: any, i: number) => {
                const done = completedModuleIds.has(m.id);
                const isCurrent = m.id === moduleId;
                const mType = m.module_type || 'video';
                return (
                  <Link
                    key={m.id}
                    to={`/courses/${courseId}/module/${m.id}`}
                    className={`flex items-center gap-3 p-3 text-xs transition-colors hover:bg-secondary/50 ${isCurrent ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${done ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {done ? '✓' : moduleTypeIcon(mType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate font-medium ${isCurrent ? 'text-primary' : ''}`}>{m.title}</p>
                      <p className="text-muted-foreground">
                        {mType === 'resource' ? '📚 Resources' : mType === 'community' ? '👥 Community' : `${m.duration_minutes}m`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ModulePlayer;
