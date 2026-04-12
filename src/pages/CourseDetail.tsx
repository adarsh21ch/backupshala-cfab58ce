import { useAuth } from '@/contexts/AuthContext';
import SEOHead from '@/components/SEOHead';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Play, Lock, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, modules(*), profiles!courses_creator_id_fkey(full_name, creator_display_name, avatar_url)')
        .eq('id', id!)
        .single();
      if (data?.modules) data.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
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

  const { data: reviews } = useQuery({
    queryKey: ['course-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_reviews')
        .select('*, profiles:course_reviews_student_id_fkey(full_name, avatar_url)')
        .eq('course_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Load notes from localStorage
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`course-notes-${id}`);
      if (saved) setNotes(saved);
    }
  }, [id]);

  const saveNotes = (val: string) => {
    setNotes(val);
    if (id) localStorage.setItem(`course-notes-${id}`, val);
  };

  const completedModuleIds = new Set(completions?.map(c => c.module_id) || []);
  const modules = course?.modules || [];
  const completedCount = modules.filter((m: any) => completedModuleIds.has(m.id)).length;
  const progress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const nextModule = modules.find((m: any) => !completedModuleIds.has(m.id));
  const creator = (course as any)?.profiles;

  if (courseLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Course not found</p>
        <Button asChild className="mt-4"><Link to="/courses">Back to Courses</Link></Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SEOHead title={course.title} />
        <BackButton fallback="/courses" />
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-700">{course.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{course.short_description}</p>
          {creator && (
            <p className="mt-1 text-xs text-muted-foreground">
              by <span className="text-foreground font-medium">{creator.creator_display_name || creator.full_name}</span>
            </p>
          )}
        </div>

        {/* Progress Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Course Progress</span>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">{completedCount} of {modules.length} modules completed</p>
          {progress === 100 ? (
            <div className="mt-4 flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Course completed! 🎉</span>
            </div>
          ) : nextModule ? (
            <Button asChild size="sm" className="mt-4 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to={`/courses/${course.id}/module/${nextModule.id}`}>
                {completedCount > 0 ? 'Continue Learning →' : 'Start Learning →'}
              </Link>
            </Button>
          ) : null}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1">
            <TabsTrigger value="modules" className="rounded-md text-xs">Modules</TabsTrigger>
            <TabsTrigger value="learn" className="rounded-md text-xs">What You'll Learn</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-md text-xs">Notes</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-md text-xs">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-4">
            <div className="space-y-2">
              {modules.map((m: any, i: number) => {
                const isCompleted = completedModuleIds.has(m.id);
                return (
                  <Link
                    key={m.id}
                    to={`/courses/${course.id}/module/${m.id}`}
                    className={`flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 ${isCompleted ? 'opacity-80' : ''}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${isCompleted ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.duration_minutes} min</p>
                    </div>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Play className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                  </Link>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="learn" className="mt-4">
            {course.what_you_learn && course.what_you_learn.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <ul className="space-y-2">
                  {course.what_you_learn.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No learning objectives listed.</p>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <textarea
                value={notes}
                onChange={e => saveNotes(e.target.value)}
                placeholder="Write your personal notes here... (saved automatically to your browser)"
                className="w-full min-h-[200px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-y"
              />
              <p className="mt-2 text-[10px] text-muted-foreground">Notes are saved locally in your browser.</p>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            {reviews && reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                        {review.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{review.profiles?.full_name}</p>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.review_text && <p className="text-sm text-muted-foreground">{review.review_text}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetail;
