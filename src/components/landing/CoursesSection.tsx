import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CourseCard from '@/components/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CoursesSection = () => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, profiles(full_name, avatar_url, creator_display_name, creator_slug)')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('total_students', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  return (
    <section id="courses" className="border-t border-border bg-secondary/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-700 md:text-4xl">Featured Courses</h2>
          <p className="mt-2 text-muted-foreground">Learn from India's best creators across digital skills</p>
        </div>
        <div className="mt-12">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">Courses coming soon! Creators are building amazing content.</p>
            </div>
          )}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline" size="lg" className="rounded-pill px-8">
            <Link to="/explore">Browse All Courses →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
