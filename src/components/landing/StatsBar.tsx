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
      const courseCount = coursesRes.count || 0;
      const enrollmentCount = enrollmentsRes.count || 0;
      return { courseCount, enrollmentCount };
    },
  });

  const items = [
    {
      icon: BookOpen,
      value: stats ? (stats.courseCount > 10 ? `${stats.courseCount}+` : '10+') : '…',
      label: 'Courses Available',
    },
    {
      icon: Users,
      value: stats ? (stats.enrollmentCount > 500 ? `${stats.enrollmentCount}+` : '500+') : '…',
      label: 'Learners Enrolled',
    },
    {
      icon: GraduationCap,
      value: '100%',
      label: 'GST Compliant',
    },
  ];

  return (
    <section className="border-y border-border bg-card py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <item.icon className="h-5 w-5 text-primary mb-1" />
              <p className="font-heading text-2xl font-800 md:text-3xl">{item.value}</p>
              <p className="text-xs text-muted-foreground md:text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
