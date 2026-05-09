import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Pencil, Users, Layers, IndianRupee, Sparkles, Award } from 'lucide-react';

type Tier = 'basic' | 'advanced';

const tierMeta: Record<Tier, { label: string; settingKey: string; icon: any; gradient: string }> = {
  basic: {
    label: 'Standard Bundle (Basic)',
    settingKey: 'basic_course_id',
    icon: BookOpen,
    gradient: 'from-emerald-500/15 to-emerald-500/0 border-emerald-500/30',
  },
  advanced: {
    label: 'Advanced Program',
    settingKey: 'advanced_course_id',
    icon: Award,
    gradient: 'from-amber-500/15 to-amber-500/0 border-amber-500/30',
  },
};

const TierCard = ({ tier }: { tier: Tier }) => {
  const meta = tierMeta[tier];
  const Icon = meta.icon;

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tier-course', tier],
    queryFn: async () => {
      const { data: setting } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', meta.settingKey)
        .maybeSingle();

      const courseId = setting?.value;
      if (!courseId) return null;

      const { data: course } = await supabase
        .from('courses')
        .select('id, title, price, total_students, status, course_level, total_modules')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) return null;

      const { count: chaptersCount } = await supabase
        .from('course_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);

      return { ...course, chaptersCount: chaptersCount || 0 };
    },
  });

  return (
    <Card className={`bg-gradient-to-br ${meta.gradient} border`}>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="rounded-xl bg-background/50 p-2.5 border border-border">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{meta.label}</CardTitle>
          <p className="text-xs text-muted-foreground capitalize">course_level = {tier}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : !data ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No platform course configured for this tier yet. Create one and the platform will use it
              for {tier === 'basic' ? 'the Standard Bundle' : 'the Advanced program'}.
            </p>
            <Link to="/admin/courses/new-platform">
              <Button size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Create {meta.label}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-base leading-snug">{data.title}</p>
              <span className="inline-block mt-1 text-[10px] uppercase tracking-wide rounded-full bg-background/60 border border-border px-2 py-0.5">
                {data.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-background/50 border border-border p-2">
                <IndianRupee className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold mt-0.5">₹{Number(data.price).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground">Price</p>
              </div>
              <div className="rounded-lg bg-background/50 border border-border p-2">
                <Layers className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold mt-0.5">{data.total_modules || 0}</p>
                <p className="text-[10px] text-muted-foreground">Modules</p>
              </div>
              <div className="rounded-lg bg-background/50 border border-border p-2">
                <Sparkles className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold mt-0.5">{data.chaptersCount}</p>
                <p className="text-[10px] text-muted-foreground">Chapters</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {data.total_students || 0} enrolled students
            </div>

            <div className="flex gap-2 pt-1">
              <Link to={`/creator/courses/${data.id}/edit`} className="flex-1">
                <Button size="sm" variant="default" className="w-full">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit course
                </Button>
              </Link>
              <Link to={`/courses/${data.id}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  View
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminPlatformCourses = () => {
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Platform Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Backupshala-owned courses. 100% revenue retained — no creator or referral commission.
            </p>
          </div>
          <Link to="/admin/courses/new-platform">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New platform course
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TierCard tier="basic" />
          <TierCard tier="advanced" />
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminPlatformCourses;
