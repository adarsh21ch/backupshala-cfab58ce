import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users, IndianRupee } from 'lucide-react';

const StatsBar = () => {
  const { data: stats } = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      const [coursesRes, enrollmentsRes, commissionsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('commissions').select('amount'),
      ]);
      const courseCount = coursesRes.count || 0;
      const enrollmentCount = enrollmentsRes.count || 0;
      const totalCommissions = (commissionsRes.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      return { courseCount, enrollmentCount, totalCommissions };
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
      label: 'Students Enrolled',
    },
    {
      icon: IndianRupee,
      value: stats
        ? stats.totalCommissions > 25000
          ? `₹${Math.round(stats.totalCommissions).toLocaleString('en-IN')}+`
          : '₹25,000+'
        : '…',
      label: 'Commissions Paid',
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
