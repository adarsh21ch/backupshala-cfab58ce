import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, ExternalLink, Sparkles } from 'lucide-react';

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  course_level: string | null;
  status: string;
  price: number;
  modules: { count: number }[] | null;
  course_chapters: { count: number }[] | null;
};

const levelMeta: Record<string, { label: string; cls: string }> = {
  basic: { label: 'Standard', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  advanced: { label: 'Advanced', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  specialized: { label: 'Specialized', cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
};

const statusMeta: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  draft: 'bg-muted text-muted-foreground border-border',
  pending_review: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
};

const AdminPlatformCourses = () => {
  const navigate = useNavigate();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-platform-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, course_level, status, price, modules(count), course_chapters(count)')
        .eq('is_platform_course', true)
        .order('course_level', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CourseRow[];
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Platform Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Backupshala-owned courses. Platform keeps 100% of revenue.
            </p>
          </div>
          <Link to="/admin/courses/new-platform">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="h-4 w-4 mr-2" /> New Platform Course
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Course</th>
                  <th className="text-left px-4 py-3 font-semibold">Level</th>
                  <th className="text-left px-4 py-3 font-semibold">Modules</th>
                  <th className="text-left px-4 py-3 font-semibold">Chapters</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                    </tr>
                  ))
                ) : !courses || courses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No platform courses yet. Click "New Platform Course" to create one.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => {
                    const lvl = (c.course_level || 'basic') as keyof typeof levelMeta;
                    const lm = levelMeta[lvl] || levelMeta.basic;
                    const modCount = c.modules?.[0]?.count ?? 0;
                    const chCount = c.course_chapters?.[0]?.count ?? 0;
                    const sm = statusMeta[c.status] || statusMeta.draft;
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{c.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={lm.cls}>{lm.label}</Badge>
                        </td>
                        <td className="px-4 py-3">{modCount}</td>
                        <td className="px-4 py-3">{chCount}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={sm}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/creator/courses/${c.id}/edit`)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                            </Button>
                            <a
                              href={`/courses/${c.slug || c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 flex gap-3">
          <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Standard Bundle (Basic)</strong> and{' '}
              <strong className="text-foreground">Advanced Program</strong> are your two main platform courses.
            </p>
            <p>
              Add a <strong className="text-foreground">Specialized</strong> course to offer premium single-topic
              content at a higher price. Buying Advanced automatically gives students access to Standard Bundle.
            </p>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPlatformCourses;
