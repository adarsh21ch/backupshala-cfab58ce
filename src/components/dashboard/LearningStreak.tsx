import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame } from 'lucide-react';

const LearningStreak = () => {
  const { user } = useAuth();

  const { data: streakData } = useQuery({
    queryKey: ['learning-streak', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('learning_streaks')
        .select('streak_date, modules_completed')
        .eq('user_id', user!.id)
        .order('streak_date', { ascending: false })
        .limit(30);

      if (!data || data.length === 0) return { current: 0, total: 0 };

      // Calculate current streak
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < data.length; i++) {
        const d = new Date(data[i].streak_date);
        d.setHours(0, 0, 0, 0);
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);

        if (d.getTime() === expected.getTime()) {
          streak++;
        } else {
          break;
        }
      }

      const total = data.reduce((sum, d) => sum + d.modules_completed, 0);
      return { current: streak, total };
    },
    enabled: !!user,
  });

  const streak = streakData?.current || 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${streak > 0 ? 'bg-warning/10' : 'bg-secondary'}`}>
          <Flame className={`h-6 w-6 ${streak > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
        </div>
        <div>
          {streak > 0 ? (
            <>
              <p className="font-heading text-lg font-700">🔥 {streak} day streak!</p>
              <p className="text-xs text-muted-foreground">Keep going — complete a module today!</p>
            </>
          ) : (
            <>
              <p className="font-heading text-sm font-600">Start your streak today</p>
              <p className="text-xs text-muted-foreground">Complete 1 module to begin 🔥</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningStreak;
