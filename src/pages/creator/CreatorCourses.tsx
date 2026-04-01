import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format';
import { useState } from 'react';

const statusTabs = ['all', 'draft', 'pending_review', 'published', 'suspended'] as const;
const statusLabels: Record<string, string> = { all: 'All', draft: 'Draft', pending_review: 'Pending', published: 'Published', suspended: 'Suspended' };

const CreatorCourses = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>('all');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['creator-courses', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = filter === 'all' ? courses : courses?.filter(c => c.status === filter);

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-2xl font-700">My Courses</h1>
          <Button asChild className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link to="/creator/courses/new"><Plus className="h-4 w-4 mr-1" /> Create Course</Link>
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {statusTabs.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {statusLabels[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(course => (
              <div key={course.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="h-32 w-full object-cover" />}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base font-600 line-clamp-2">{course.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      course.status === 'published' ? 'bg-primary/10 text-primary' :
                      course.status === 'pending_review' ? 'bg-accent/10 text-accent' :
                      course.status === 'suspended' ? 'bg-destructive/10 text-destructive' :
                      'bg-secondary text-muted-foreground'
                    }`}>{course.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{course.total_students || 0} students</span>
                    <span className="font-semibold text-foreground">{formatPrice(course.price)}</span>
                  </div>
                  {course.rejection_reason && (
                    <p className="text-xs text-destructive bg-destructive/5 rounded-md px-2 py-1">Rejected: {course.rejection_reason}</p>
                  )}
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1 rounded-md">
                      <Link to={`/creator/courses/${course.id}/edit`}>Edit</Link>
                    </Button>
                    {course.status === 'published' && (
                      <Button asChild size="sm" variant="ghost" className="rounded-md">
                        <a href={`/c/${course.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{filter !== 'all' ? 'No courses with this status.' : 'Create your first course.'}</p>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorCourses;
