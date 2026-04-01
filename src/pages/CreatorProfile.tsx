import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LandingNavbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import CourseCard from '@/components/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Instagram, Youtube, Users, BookOpen, Star } from 'lucide-react';

const CreatorProfile = () => {
  const { creatorSlug } = useParams<{ creatorSlug: string }>();

  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator', creatorSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('creator_slug', creatorSlug!)
        .eq('is_creator', true)
        .eq('creator_approved', true)
        .single();
      return data;
    },
    enabled: !!creatorSlug,
  });

  const { data: courses } = useQuery({
    queryKey: ['creator-courses', creator?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, profiles(full_name, avatar_url, creator_display_name, creator_slug)')
        .eq('creator_id', creator!.id)
        .eq('status', 'published');
      return data || [];
    },
    enabled: !!creator?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <LandingNavbar />
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-48 rounded-xl mb-6" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen">
        <LandingNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-700">Creator not found</h1>
          <p className="mt-2 text-muted-foreground">This creator profile doesn't exist.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = creator.creator_display_name || creator.full_name;

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <div className="flex-1">
        <div className="bg-primary/5 py-12">
          <div className="container mx-auto px-4 flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden shrink-0">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                displayName[0]
              )}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-700">{displayName}</h1>
              {creator.creator_category && <p className="text-sm text-primary font-medium">{creator.creator_category}</p>}
              {creator.bio && <p className="mt-1 text-sm text-muted-foreground max-w-xl">{creator.bio}</p>}
              <div className="flex items-center gap-3 mt-3">
                {creator.creator_website && (
                  <a href={creator.creator_website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Globe className="h-4 w-4" />
                  </a>
                )}
                {creator.creator_instagram && (
                  <a href={`https://instagram.com/${creator.creator_instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {creator.creator_youtube && (
                  <a href={creator.creator_youtube} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h2 className="font-heading text-xl font-600 mb-6">Courses by {displayName}</h2>
          {courses && courses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No published courses yet.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CreatorProfile;
