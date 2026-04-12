import { Link } from 'react-router-dom';
import { Star, Clock, BookOpen, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    short_description: string;
    thumbnail_url: string | null;
    category: string;
    level: string;
    price: number;
    commission_percent: number;
    total_modules: number;
    total_duration_minutes: number;
    total_students: number;
    rating: number;
    total_reviews: number;
    creator_id: string;
    is_featured?: boolean;
    profiles?: {
      full_name: string;
      avatar_url: string | null;
      creator_display_name: string | null;
      creator_slug: string | null;
    };
    modules?: any[];
  };
  isPlatformCourse?: boolean;
  pinned?: boolean;
}

const CourseCard = ({ course, isPlatformCourse, pinned }: CourseCardProps) => {
  const creator = course.profiles;
  const creatorName = creator?.creator_display_name || creator?.full_name || 'Creator';
  const creatorSlug = creator?.creator_slug || course.creator_id;
  const commissionAmount = Math.round(course.price * (course.commission_percent / 100));

  // Detect module types from modules array if available
  const mods = course.modules || [];
  const hasResourceModules = mods.some((m: any) => m.module_type === 'resource');
  const hasCommunityModule = mods.some((m: any) => m.module_type === 'community');

  return (
    <div className={`group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md ${pinned ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border hover:border-primary/20'}`}>
      <div className="aspect-video bg-muted relative overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/5">
            <BookOpen className="h-10 w-10 text-primary/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">{course.category}</span>
        </div>
        {pinned && (
          <div className="absolute top-0 left-0 bg-primary text-primary-foreground px-3 py-1 text-[10px] font-bold rounded-br-lg">Start Here</div>
        )}
        {isPlatformCourse && (
          <div className="absolute top-2 right-2 rounded-md bg-accent/90 px-2 py-0.5 text-[10px] font-bold text-accent-foreground backdrop-blur-sm flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Official
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden">
            {creator?.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              creatorName[0]
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">{creatorName}</span>
        </div>
        <h3 className="font-heading text-sm font-600 leading-snug line-clamp-2">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{course.short_description}</p>

        {/* Type badges */}
        <div className="flex flex-wrap gap-1">
          {hasCommunityModule && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" /> Community
            </span>
          )}
          {hasResourceModules && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">📚 Resources</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {course.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {course.rating.toFixed(1)} ({course.total_reviews})
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <BookOpen className="h-3 w-3" />
            {course.total_modules} modules
          </span>
          {course.total_duration_minutes > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {Math.round(course.total_duration_minutes / 60)}h
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="font-heading text-lg font-700 text-accent">{formatPrice(course.price)}</span>
            {commissionAmount > 0 && (
              <Link to="/refer" className="text-[10px] text-primary hover:underline">Referral bonus available</Link>
            )}
          </div>
          <Button asChild size="sm" className="rounded-md text-xs h-8 px-3">
            <Link to={`/c/${creatorSlug}/${course.slug}`}>View Course</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
