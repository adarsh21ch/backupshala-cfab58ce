import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, ChevronRight, Users, IndianRupee, Lock, Unlock, Plus } from 'lucide-react';

type Tier = 'basic' | 'advanced' | 'premium';

const TIER_CONFIG: Record<Tier, {
  label: string; color: string; bg: string; border: string; icon: string; description: string; priceKey: string;
}> = {
  basic: {
    label: 'Basic', color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900',
    icon: '📘', description: 'Entry-level digital skills course', priceKey: 'basic_price',
  },
  advanced: {
    label: 'Advanced', color: 'text-orange-700', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-900',
    icon: '📙', description: 'Full digital skills — includes Basic access', priceKey: 'advanced_price',
  },
  premium: {
    label: 'Premium', color: 'text-purple-700', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-900',
    icon: '📕', description: 'All-access tier — includes Basic + Advanced', priceKey: 'premium_price',
  },
};

const AdminPlatformCourses = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['platform-settings-prices'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      return Object.fromEntries((data ?? []).map((s) => [s.key, s.value])) as Record<string, string>;
    },
    staleTime: 60_000,
  });

  const { data: courses } = useQuery({
    queryKey: ['admin-platform-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, status, course_level, price, enrollments(count)')
        .eq('is_platform_course', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ courseId, enabled }: { courseId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('courses')
        .update({ status: enabled ? 'published' : 'draft' })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: (_d, { enabled }) => {
      qc.invalidateQueries({ queryKey: ['admin-platform-courses'] });
      toast.success(enabled
        ? 'Course enabled — now visible to students'
        : 'Course hidden from listings. Existing students still have access.');
    },
    onError: () => toast.error('Failed to update course status'),
  });

  const getCourseForTier = (tier: Tier) => courses?.find((c) => c.course_level === tier);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Platform Courses</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Manage the three Backupshala learning tiers. Each tier maps to one platform course. Disabling a tier
            hides it from new students — existing enrolled students keep full access.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {(['basic', 'advanced', 'premium'] as Tier[]).map((tier) => {
            const config = TIER_CONFIG[tier];
            const course = getCourseForTier(tier);
            const price = settings?.[config.priceKey] ?? course?.price ?? '—';
            const enrollments = (course as { enrollments?: { count: number }[] } | undefined)?.enrollments?.[0]?.count ?? 0;
            const isEnabled = course?.status === 'published';

            return (
              <div key={tier} className={`rounded-xl border-2 ${config.border} ${config.bg} p-5 flex flex-col gap-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                      <h2 className={`font-heading text-lg font-bold ${config.color}`}>{config.label}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={isEnabled
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                    : 'bg-muted text-muted-foreground'}>
                    {isEnabled ? 'Live' : course ? 'Hidden' : 'Empty'}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-1">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold font-heading">
                    {Number(price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">incl. GST</span>
                </div>

                {course ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{enrollments.toLocaleString('en-IN')} enrolled</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span className="truncate">{course.title}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No course assigned yet</p>
                )}

                {course && (
                  <div className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      {isEnabled
                        ? <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                        : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>{isEnabled ? 'Visible to students' : 'Hidden from listings'}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ courseId: course.id, enabled: checked })}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => course
                    ? navigate(`/creator/courses/${course.id}/edit`)
                    : navigate(`/admin/courses/new-platform?tier=${tier}`)}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    course
                      ? 'bg-card border border-border text-foreground hover:bg-muted'
                      : 'bg-accent text-accent-foreground hover:bg-accent/90'
                  }`}
                >
                  {course ? (<>Edit Course & Modules <ChevronRight className="h-4 w-4" /></>)
                          : (<><Plus className="h-4 w-4" /> Create {config.label} Course</>)}
                </button>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <h3 className="font-semibold text-sm mb-2">Tier Access Rules</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong className="text-foreground">Basic:</strong> Access to Basic course only</li>
            <li><strong className="text-foreground">Advanced:</strong> Access to Basic + Advanced courses</li>
            <li><strong className="text-foreground">Premium:</strong> Access to Basic + Advanced + Premium courses</li>
            <li>Disabling a tier hides it from the marketplace but never removes existing student access</li>
          </ul>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPlatformCourses;
