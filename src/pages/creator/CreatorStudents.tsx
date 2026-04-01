import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const CreatorStudents = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: courses } = useQuery({
    queryKey: ['creator-courses', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').eq('creator_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['creator-students', user?.id, courses?.map(c => c.id)],
    queryFn: async () => {
      const courseIds = courses?.map(c => c.id) || [];
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from('enrollments')
        .select('*, courses(title), profiles:enrollments_student_id_fkey(full_name, email)')
        .in('course_id', courseIds)
        .order('enrolled_at', { ascending: false });
      return data || [];
    },
    enabled: !!courses && courses.length > 0,
  });

  const { data: completionCounts } = useQuery({
    queryKey: ['creator-completion-counts', user?.id],
    queryFn: async () => {
      const courseIds = courses?.map(c => c.id) || [];
      if (courseIds.length === 0) return {};
      const { data } = await supabase.from('module_completions').select('student_id, course_id').in('course_id', courseIds);
      const counts: Record<string, number> = {};
      data?.forEach(d => { const key = `${d.student_id}_${d.course_id}`; counts[key] = (counts[key] || 0) + 1; });
      return counts;
    },
    enabled: !!courses && courses.length > 0,
  });

  const moduleCounts = courses?.reduce((acc: Record<string, number>, c: any) => {
    // We don't have total_modules in the select, so we'll use the course data
    return acc;
  }, {}) || {};

  const filtered = enrollments?.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    const profile = (e as any).profiles;
    return profile?.full_name?.toLowerCase().includes(s) || (e as any).courses?.title?.toLowerCase().includes(s);
  });

  const getStudentName = (e: any) => {
    const name = e.profiles?.full_name || '';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    return parts[0] || 'Student';
  };

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-700">Students</h1>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or course..."
          className="w-full max-w-sm rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : filtered && filtered.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Course</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Enrolled</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Completed</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Referrer</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((e: any) => {
                    const completionKey = `${e.student_id}_${e.course_id}`;
                    const completed = completionCounts?.[completionKey] || 0;
                    return (
                      <tr key={e.id}>
                        <td className="px-4 py-3 text-xs font-medium">{getStudentName(e)}</td>
                        <td className="px-4 py-3 text-xs">{e.courses?.title}</td>
                        <td className="px-4 py-3 text-xs">{new Date(e.enrolled_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.is_completed ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            {e.is_completed ? 'Yes' : `${completed} modules`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{e.referrer_email}</td>
                        <td className="px-4 py-3 text-xs font-semibold">₹{e.amount_paid}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((e: any) => (
                <div key={e.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{getStudentName(e)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.is_completed ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {e.is_completed ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.courses?.title}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(e.enrolled_at).toLocaleDateString('en-IN')}</span>
                    <span className="font-semibold text-foreground">₹{e.amount_paid}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No students yet.</p>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorStudents;
