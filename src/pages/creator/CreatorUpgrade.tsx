import { useAuth } from '@/contexts/AuthContext';
import CreatorDashboardLayout from '@/components/dashboard/CreatorDashboardLayout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mic, Users, BarChart3, Bell, Unlock, Star, Check } from 'lucide-react';

const features = [
  { icon: Lock, label: 'Sequential Module Locking', desc: 'Control the order students learn' },
  { icon: Mic, label: 'Audio Notes Between Modules', desc: 'Add personal voice messages for students' },
  { icon: Users, label: 'Mentor Approval Gates', desc: 'Require students to contact you before proceeding' },
  { icon: BarChart3, label: 'Advanced Student Progress Dashboard', desc: 'See exactly where every student is in your course' },
  { icon: Bell, label: 'Push Notifications', desc: 'Get notified instantly when students need approval' },
  { icon: Unlock, label: 'Unlock Request Management', desc: 'Approve or reject student progress with one tap' },
];

const CreatorUpgrade = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription } = useQuery({
    queryKey: ['pro-subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_pro_subscriptions')
        .select('*')
        .eq('creator_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const startTrial = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from('creator_pro_subscriptions').upsert({
        creator_id: user!.id,
        plan: 'trial',
        status: 'active',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'creator_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-subscription'] });
      toast({ title: '⭐ Pro Trial Active!', description: 'Your 14-day Creator Pro trial is now active. Enjoy all Pro features!' });
    },
    onError: () => toast({ title: 'Failed to start trial', variant: 'destructive' }),
  });

  const isPro = subscription && (subscription.plan === 'pro' || subscription.plan === 'trial') && subscription.status === 'active';

  if (isPro) {
    return (
      <CreatorDashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-700">You're on Creator Pro! ⭐</h1>
          <p className="text-sm text-muted-foreground">
            Plan: <span className="font-semibold text-foreground capitalize">{subscription.plan}</span>
            {subscription.plan === 'trial' && subscription.trial_ends_at && (
              <> · Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString()}</>
            )}
          </p>
          <div className="grid gap-3 text-left">
            {features.map(f => (
              <div key={f.label} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CreatorDashboardLayout>
    );
  }

  return (
    <CreatorDashboardLayout>
      <div className="max-w-lg mx-auto py-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mx-auto">
            <Star className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-heading text-2xl font-700">⭐ Creator Pro Plan</h1>
          <p className="text-sm text-muted-foreground">Take your courses to the next level</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-heading text-4xl font-800">₹999</span>
            <span className="text-muted-foreground text-sm">/ month</span>
          </div>
          <p className="text-xs text-muted-foreground">Billed monthly — cancel anytime</p>
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3">
          <p className="text-sm font-semibold">Everything in Free, plus:</p>
          {features.map(f => (
            <div key={f.label} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <f.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border" />

        <div className="text-center space-y-3">
          <Button
            onClick={() => startTrial.mutate()}
            disabled={startTrial.isPending}
            className="w-full rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 text-base"
          >
            Start 14-Day Free Trial →
          </Button>
          <p className="text-xs text-muted-foreground">No credit card needed</p>
        </div>
      </div>
    </CreatorDashboardLayout>
  );
};

export default CreatorUpgrade;
