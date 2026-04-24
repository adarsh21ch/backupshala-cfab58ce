import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Determines whether the current user is allowed to refer a specific course.
 * Eligible if: admin, course creator, or actively enrolled.
 */
export function useCourseReferralEligibility(courseId?: string) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['referral-eligibility', user?.id, courseId],
    enabled: !!user && !!courseId,
    queryFn: async () => {
      if (!user || !courseId) return { eligible: false, reason: 'not_logged_in' as const };

      // Admin always eligible
      if (profile?.is_admin) return { eligible: true, reason: 'admin' as const };

      // Own course?
      const { data: course } = await supabase
        .from('courses')
        .select('creator_id')
        .eq('id', courseId)
        .maybeSingle();
      if (course?.creator_id === user.id) return { eligible: true, reason: 'creator' as const };

      // Enrolled?
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      if (enrollment) return { eligible: true, reason: 'enrolled' as const };

      return { eligible: false, reason: 'not_enrolled' as const };
    },
  });
}

/** Lists all courses the user can refer (enrolled + own creator courses). */
export function useReferableCourses() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['referable-courses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // Enrolled course IDs
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);
      const enrolledIds = (enrollments || []).map(e => e.course_id);

      // Own courses if creator
      let ownIds: string[] = [];
      if (profile?.is_creator) {
        const { data: own } = await supabase
          .from('courses')
          .select('id')
          .eq('creator_id', user.id)
          .eq('status', 'published');
        ownIds = (own || []).map(c => c.id);
      }

      const allIds = Array.from(new Set([...enrolledIds, ...ownIds]));
      if (allIds.length === 0) return [];

      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, slug, price, thumbnail_url, short_description, profiles!courses_creator_id_fkey(creator_slug, creator_display_name, full_name)')
        .in('id', allIds)
        .eq('status', 'published');
      return courses || [];
    },
  });
}
