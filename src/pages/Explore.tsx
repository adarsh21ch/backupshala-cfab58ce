import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LandingNavbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import CourseCard from '@/components/CourseCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/lib/format';

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['All', 'English', 'Hindi', 'Hinglish'];
const RATINGS = [
  { label: 'All Ratings', value: 0 },
  { label: '3★ & above', value: 3 },
  { label: '4★ & above', value: 4 },
];
const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
];

const BUNDLE_SLUG = 'backupshala-standard-bundle';

const Explore = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [language, setLanguage] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [courseType, setCourseType] = useState('All');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['explore-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, profiles(full_name, avatar_url, creator_display_name, creator_slug), modules(module_type)')
        .eq('status', 'published');
      return data || [];
    },
  });

  const filtered = courses
    ?.filter(c => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.short_description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== 'All' && c.category !== category) return false;
      if (level !== 'All' && c.level !== level) return false;
      if (language !== 'All' && c.language !== language) return false;
      if (minRating > 0 && (c.rating || 0) < minRating) return false;
      if (courseType === 'Standard Bundle' && c.slug !== BUNDLE_SLUG) return false;
      if (courseType === 'Resource Bundles' && !(c as any).modules?.some((m: any) => m.module_type === 'resource')) return false;
      if (courseType === 'Video Courses' && (c as any).modules?.every((m: any) => m.module_type !== 'video')) return false;
      return true;
    })
    .sort((a, b) => {
      // Pin Standard Bundle first
      const aBundle = a.slug === BUNDLE_SLUG ? 1 : 0;
      const bBundle = b.slug === BUNDLE_SLUG ? 1 : 0;
      if (aBundle !== bBundle) return bBundle - aBundle;
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      return (b.total_students || 0) - (a.total_students || 0);
    }) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-700">Explore Courses</h1>
          <p className="mt-1 text-muted-foreground">Browse courses from expert creators across India</p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="md:hidden rounded-md" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
            </Button>
            <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className={`shrink-0 w-56 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">CATEGORY</p>
              <div className="space-y-1">
                {['All', ...CATEGORIES].map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`block w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${category === c ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">LEVEL</p>
              <div className="space-y-1">
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`block w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${level === l ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">LANGUAGE</p>
              <div className="space-y-1">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`block w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${language === l ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">RATING</p>
              <div className="space-y-1">
                {RATINGS.map(r => (
                  <button key={r.value} onClick={() => setMinRating(r.value)}
                    className={`block w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${minRating === r.value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">COURSE TYPE</p>
              <div className="space-y-1">
                {['All', 'Video Courses', 'Resource Bundles', 'Standard Bundle'].map(t => (
                  <button key={t} onClick={() => setCourseType(t)}
                    className={`block w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${courseType === t ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">No courses found matching your filters.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((course: any) => (
                  <CourseCard key={course.id} course={course} isPlatformCourse={course.slug === BUNDLE_SLUG} pinned={course.slug === BUNDLE_SLUG} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Explore;
