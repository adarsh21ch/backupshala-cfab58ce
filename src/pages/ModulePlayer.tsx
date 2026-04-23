import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, ChevronLeft, ChevronRight, Trophy, Play, BookOpen, Users, Lock, MessageSquare, StickyNote, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';
import ResourceModuleView from '@/components/module/ResourceModuleView';
import CommunityModuleView from '@/components/module/CommunityModuleView';
import { SequentialLockScreen, MentorGateScreen, WaitingMentorScreen } from '@/components/module/GateScreens';
import AudioNotePlayer from '@/components/module/AudioNotePlayer';
import CourseDiscussions from '@/components/course/CourseDiscussions';
import ModuleNotes from '@/components/module/ModuleNotes';
import ModuleQuiz from '@/components/module/ModuleQuiz';
import UpgradeBanner from '@/components/course/UpgradeBanner';
import UpgradeModal from '@/components/course/UpgradeModal';
import { useUpgradeFlow } from '@/hooks/useUpgradeFlow';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Sparkles } from 'lucide-react';

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
  const [showMentorGate, setShowMentorGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { data: platformSettings } = usePlatformSettings();
  const { startUpgrade, paying: upgradePaying } = useUpgradeFlow(courseId, () => {
    queryClient.invalidateQueries({ queryKey: ['enrollment-tier'] });
    queryClient.invalidateQueries({ queryKey: ['enrollment-drip'] });
    setShowUpgradeModal(false);
  });

  // Check module access (gate system)
  const { data: accessCheck, isLoading: accessLoading } = useQuery({
    queryKey: ['module-access', moduleId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-module-access', {
        body: { module_id: moduleId, course_id: courseId },
      });
      if (error) return { canAccess: true }; // fail open
      return data;
    },
    enabled: !!moduleId && !!courseId && !!user,
    staleTime: 30000,
  });

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*, modules(*)').eq('id', courseId!).single();
      if (data?.modules) data.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment-tier', user?.id, courseId],
    queryFn: async () => {
      const { data } = await supabase.from('enrollments').select('enrolled_at, tier').eq('student_id', user!.id).eq('course_id', courseId!).maybeSingle();
      return data;
    },
    enabled: !!user && !!courseId,
  });

  const studentTier = (enrollment as any)?.tier || 'basic';

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

  const handleMentorContact = useCallback(async (method: string) => {
    if (!moduleId || !courseId || !currentModule) return;
    const prevMod = currentIndex > 0 ? modules[currentIndex - 1] : null;
    await supabase.functions.invoke('request-module-unlock', {
      body: {
        module_id: moduleId,
        completed_module_id: prevMod?.id || moduleId,
        course_id: courseId,
        contact_method: method,
      },
    });
    queryClient.invalidateQueries({ queryKey: ['module-access', moduleId] });
  }, [moduleId, courseId, currentIndex, modules, queryClient, currentModule]);

  const handleAlreadyContacted = useCallback(async () => {
    await handleMentorContact('manual');
  }, [handleMentorContact]);

  if (courseLoading || accessLoading) return (
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

  // Drip content check
  const dripUnlockDate = (() => {
    if (!currentModule || !enrollment?.enrolled_at) return null;
    const releaseDays = (currentModule as any).release_after_days || 0;
    if (releaseDays <= 0) return null;
    const unlock = new Date(enrollment.enrolled_at);
    unlock.setDate(unlock.getDate() + releaseDays);
    return unlock > new Date() ? unlock : null;
  })();

  if (dripUnlockDate) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-accent" />
          </div>
          <h2 className="font-heading text-xl font-700">Module Locked</h2>
          <p className="text-sm text-muted-foreground">
            "{currentModule.title}" unlocks on <span className="font-semibold text-foreground">{dripUnlockDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </p>
          <p className="text-xs text-muted-foreground">This module is released {(currentModule as any).release_after_days} days after enrollment.</p>
          <Button asChild variant="outline" className="rounded-md">
            <Link to={`/courses/${courseId}`}><ChevronLeft className="h-4 w-4 mr-1" /> Back to Course</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Tier lock — basic enrollee trying to access advanced module
  const isTierLocked = studentTier === 'basic' && (currentModule as any)?.module_tier === 'advanced';
  if (isTierLocked) {
    const upgradePrice = platformSettings?.upgrade_price ?? 250;
    const advancedCount = modules.filter((m: any) => m.module_tier === 'advanced').length;
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to {course?.title}
          </Link>
          <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-accent/15 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Advanced Module</p>
              <h2 className="font-heading text-2xl font-extrabold mt-1">{currentModule?.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This module is part of the <span className="font-semibold text-foreground">Advanced</span> tier. Upgrade once to unlock {advancedCount} advanced module{advancedCount > 1 ? 's' : ''} in this course.
            </p>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Upgrade for ₹{upgradePrice}
            </Button>
          </div>
        </div>
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onConfirm={startUpgrade}
          upgradePrice={upgradePrice}
          modules={modules as any}
          paying={upgradePaying}
          courseTitle={course?.title || ''}
        />
      </DashboardLayout>
    );
  }

  if (accessCheck && !accessCheck.canAccess) {
    const gateInfo = accessCheck.gateInfo;

    if (accessCheck.reason === 'previous_incomplete') {
      return (
        <DashboardLayout>
          <div className="max-w-2xl mx-auto">
            <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="h-4 w-4" /> Back to {course?.title}
            </Link>
            <SequentialLockScreen
              previousModuleTitle={gateInfo?.previousModuleTitle || 'Previous Module'}
              previousModuleId={gateInfo?.previousModuleId || ''}
              courseId={courseId!}
              currentModuleIndex={currentIndex}
              totalModules={modules.length}
            />
          </div>
        </DashboardLayout>
      );
    }

    if (accessCheck.reason === 'mentor_approval_needed') {
      return (
        <DashboardLayout>
          <div className="max-w-2xl mx-auto">
            <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="h-4 w-4" /> Back to {course?.title}
            </Link>
            <MentorGateScreen
              mentorName={gateInfo?.mentorName}
              mentorPhone={gateInfo?.mentorPhone}
              mentorEmail={gateInfo?.mentorEmail || ''}
              gateMessage={gateInfo?.message || ''}
              contactType={gateInfo?.contactType || 'whatsapp'}
              zoomLink={gateInfo?.zoomLink}
              onContact={handleMentorContact}
              onAlreadyContacted={handleAlreadyContacted}
            />
          </div>
        </DashboardLayout>
      );
    }

    if (accessCheck.reason === 'waiting_mentor') {
      return (
        <DashboardLayout>
          <div className="max-w-2xl mx-auto">
            <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="h-4 w-4" /> Back to {course?.title}
            </Link>
            <WaitingMentorScreen
              moduleName={currentModule?.title || 'Module'}
              status={gateInfo?.status || 'waiting'}
              contactedAt={gateInfo?.contactedAt}
              courseId={courseId!}
            />
          </div>
        </DashboardLayout>
      );
    }
  }

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

          {/* Audio note — before video */}
          {accessCheck?.hasAudioNote && accessCheck?.audioPosition === 'before' && accessCheck?.audioR2Key && (
            <AudioNotePlayer
              label={accessCheck.audioLabel || 'Message from your mentor'}
              audioUrl={accessCheck.audioR2Key}
              duration={accessCheck.audioDuration || 0}
              position="before"
            />
          )}

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

              {/* Quiz */}
              {moduleType === 'video' && moduleId && courseId && (
                <ModuleQuiz moduleId={moduleId} courseId={courseId} onPass={() => !isCompleted && markComplete.mutate()} />
              )}

              {/* Tabs: Notes & Discussion */}
              <Tabs defaultValue="notes" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-4">
                  <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2 gap-1">
                    <StickyNote className="h-3 w-3" /> Notes
                  </TabsTrigger>
                  <TabsTrigger value="discussion" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0 pb-2 gap-1">
                    <MessageSquare className="h-3 w-3" /> Discussion
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="mt-4">
                  {moduleId && <ModuleNotes moduleId={moduleId} />}
                </TabsContent>
                <TabsContent value="discussion" className="mt-4">
                  {courseId && <CourseDiscussions courseId={courseId} moduleId={moduleId} creatorId={course?.creator_id || ''} />}
                </TabsContent>
              </Tabs>
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
                const relDays = m.release_after_days || 0;
                const isDripLocked = relDays > 0 && enrollment?.enrolled_at
                  ? new Date(new Date(enrollment.enrolled_at).getTime() + relDays * 86400000) > new Date()
                  : false;
                return (
                  <Link
                    key={m.id}
                    to={`/courses/${courseId}/module/${m.id}`}
                    className={`flex items-center gap-3 p-3 text-xs transition-colors hover:bg-secondary/50 ${isCurrent ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${done ? 'bg-primary/20 text-primary' : isDripLocked ? 'bg-muted text-muted-foreground' : m.is_gated && !done && i > 0 && !completedModuleIds.has(modules[i-1]?.id) ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                      {done ? '✓' : isDripLocked ? <Calendar className="h-3 w-3" /> : m.is_gated && !done && i > 0 && !completedModuleIds.has(modules[i-1]?.id) ? <Lock className="h-3 w-3" /> : moduleTypeIcon(mType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate font-medium ${isCurrent ? 'text-primary' : isDripLocked ? 'text-muted-foreground' : ''}`}>{m.title}</p>
                      <p className="text-muted-foreground">
                        {isDripLocked ? `Unlocks in ${relDays}d` : mType === 'resource' ? '📚 Resources' : mType === 'community' ? '👥 Community' : `${m.duration_minutes}m`}
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
