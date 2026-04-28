import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users, GraduationCap } from 'lucide-react';

const StatsBar = () => {
  const { data: stats } = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
      ]);
      return {
        courseCount: coursesRes.count || 0,
        enrollmentCount: enrollmentsRes.count || 0,
      };
    },
  });

  const items = [
    {
      icon: BookOpen,
      tint: 'bg-primary/10 text-primary',
      value: stats ? (stats.courseCount > 10 ? `${stats.courseCount}+` : '10+') : '…',
      label: 'Courses Available',
      sub: 'Across 8 skill categories',
    },
    {
      icon: Users,
      tint: 'bg-accent/10 text-accent',
      value: stats ? (stats.enrollmentCount > 500 ? `${stats.enrollmentCount}+` : '500+') : '…',
      label: 'Learners Enrolled',
      sub: 'And growing every day',
    },
    {
      icon: GraduationCap,
      tint: 'bg-info/10 text-info',
      value: '100%',
      label: 'GST Compliant',
      sub: 'Invoice on every purchase',
    },
  ];

  return (
    <section className="border-y border-border bg-secondary/40 py-10">
      <div className="container mx-auto px-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="lift-hover rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${item.tint}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
                {item.value}
              </p>
              <p className="mt-1 font-heading text-sm font-semibold text-foreground/90">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
