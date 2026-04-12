import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseReviewModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  userId: string;
}

const CourseReviewModal = ({ open, onClose, courseId, courseName, userId }: CourseReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('course_reviews').insert({
        course_id: courseId,
        student_id: userId,
        rating,
        review_text: reviewText.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Review submitted! 🎉', description: 'Thank you for your feedback.' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed to submit', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">You completed {courseName}! 🎉</DialogTitle>
          <DialogDescription>Rate your experience</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${(hoverRating || rating) >= n ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your thoughts about this course (optional)"
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseReviewModal;
