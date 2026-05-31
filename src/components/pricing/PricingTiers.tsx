import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Sparkles, Bell } from 'lucide-react';
import { usePricingTiers, type PricingTier } from '@/hooks/usePricingTiers';
import { useTierCheckout } from '@/hooks/useTierCheckout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TierCard = ({ tier }: { tier: PricingTier }) => {
  const { user, profile } = useAuth();
  const { enroll, pendingSlug } = useTierCheckout();
  const [email, setEmail] = useState('');
  const [showNotify, setShowNotify] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const isLive = tier.status === 'live';
  const loading = pendingSlug === tier.slug;

  const handleNotify = async () => {
    const target = (user ? profile?.email || user.email : email)?.trim();
    if (!target || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
      toast.error('Enter a valid email');
      return;
    }
    setJoining(true);
    const { error } = await supabase.from('tier_waitlist').insert({
      tier_slug: tier.slug, email: target, user_id: user?.id ?? null,
    });
    setJoining(false);
    if (error && (error as any).code !== '23505') {
      toast.error('Could not join the waitlist');
      return;
    }
    setJoined(true);
    toast.success(`You're on the ${tier.name} waitlist!`);
  };

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
      tier.highlight
        ? 'border-accent/50 bg-accent/[0.04] shadow-lg md:scale-[1.03]'
        : 'border-border bg-card'
    } ${!isLive ? 'opacity-95' : ''}`}>
      {tier.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow">
          {tier.badge}
        </span>
      )}
      {!isLive && (
        <span className="absolute right-4 top-4 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">
          Coming Soon
        </span>
      )}

      <h3 className="font-heading text-xl font-700">{tier.name}</h3>
      {tier.tagline && <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>}

      <div className="mt-4">
        <span className="font-heading text-4xl font-800">{fmt(tier.price)}</span>
        <p className="mt-0.5 text-xs text-muted-foreground">GST included · one-time payment</p>
      </div>

      {tier.features.length > 0 && (
        <ul className="mt-5 space-y-2.5 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {isLive ? (
          <Button
            onClick={() => enroll(tier.slug)}
            disabled={loading}
            className="w-full rounded-md bg-primary hover:bg-primary/90 font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Processing…' : 'Enroll Now'}
          </Button>
        ) : joined ? (
          <Button disabled variant="outline" className="w-full rounded-md">
            <Check className="h-4 w-4 mr-1.5" /> You're on the list
          </Button>
        ) : showNotify && !user ? (
          <div className="space-y-2">
            <Input
              type="email" placeholder="you@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Button onClick={handleNotify} disabled={joining} className="w-full rounded-md" variant="secondary">
              {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-1.5" />}
              Notify me
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => (user ? handleNotify() : setShowNotify(true))}
            disabled={joining}
            variant="outline"
            className="w-full rounded-md"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-1.5" />}
            Notify me
          </Button>
        )}
      </div>
    </div>
  );
};

const PricingTiers = ({ heading = true }: { heading?: boolean }) => {
  const { data: tiers, isLoading } = usePricingTiers();
  const visible = (tiers || []).filter(t => t.status !== 'hidden');

  return (
    <section id="pricing" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        {heading && (
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-accent font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Pricing
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-800">Choose your plan</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Simple, transparent pricing. Every price is final and GST-inclusive — no surprise fees.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
            {visible.map(t => <TierCard key={t.id} tier={t} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingTiers;
