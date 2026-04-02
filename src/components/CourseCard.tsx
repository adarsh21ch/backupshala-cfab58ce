import { Link } from 'react-router-dom';
import { Star, Clock, BookOpen } from 'lucide-react';
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
    profiles?: {
      full_name: string;
      avatar_url: string | null;
      creator_display_name: string | null;
      creator_slug: string | null;
    };
  };
}

const CourseCard = ({ course }: CourseCardProps) => {
  const creator = course.profiles;
  const creatorName = creator?.creator_display_name || creator?.full_name || 'Creator';
  const creatorSlug = creator?.creator_slug || course.creator_id;
  const commissionAmount = Math.round(course.price * (course.commission_percent / 100));

  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/5">
            <BookOpen className="h-10 w-10 text-primary/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
          {course.category}
        </div>
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
              <p className="text-[10px] text-primary">Refer & earn {formatPrice(commissionAmount)}</p>
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
