import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { timeAgo } from '@/lib/format';

const CreatorDiscussions = () => {
  const { user } = useAuth();

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['creator-unanswered', user?.id],
    queryFn: async () => {
      // Get all courses by this creator
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('creator_id', user!.id);

      if (!courses?.length) return [];

      const courseIds = courses.map(c => c.id);
      const courseMap = Object.fromEntries(courses.map(c => [c.id, c.title]));

      // Get top-level questions (no parent_id) that have no creator reply
      const { data: questions } = await supabase
        .from('course_discussions')
        .select('*, profiles(full_name)')
        .in('course_id', courseIds)
        .is('parent_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (!questions?.length) return [];

      // Get all replies by creator to check which are answered
      const { data: replies } = await supabase
        .from('course_discussions')
        .select('parent_id')
        .in('course_id', courseIds)
        .eq('user_id', user!.id)
        .eq('is_deleted', false)
        .not('parent_id', 'is', null);

      const answeredIds = new Set(replies?.map(r => r.parent_id) || []);

      return questions
        .filter(q => !answeredIds.has(q.id))
        .map(q => ({ ...q, courseName: courseMap[q.course_id] || 'Unknown' }));
    },
    enabled: !!user,
  });

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-700">Discussions</h1>
        <p className="text-sm text-muted-foreground">Unanswered questions from your students — oldest first.</p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !discussions?.length ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">All caught up! No unanswered questions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {discussions.map((d: any) => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{(d.profiles as any)?.full_name || 'Student'}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(d.created_at)}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{d.content}</p>
                    <p className="text-[10px] text-accent mt-1">in {d.courseName}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="ml-3 shrink-0 rounded-lg text-xs">
                    <Link to={`/courses/${d.course_id}/module/${d.module_id || ''}`}>Reply</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorDiscussions;
