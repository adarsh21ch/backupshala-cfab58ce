import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Scale, SlidersHorizontal, ShieldCheck, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatPrice } from '@/lib/format';
import { computeCommission, inputsFromSettings } from '@/lib/commissionModel';

const benefits = [
  { icon: Upload, title: 'Video or Resource Courses', desc: 'Upload video lessons OR curate links, podcasts, and articles. Both formats supported.' },
  { icon: Scale, title: 'GST-Compliant Payments', desc: 'Razorpay handles every enrollment. GST invoices auto-generated. Fully compliant.' },
  { icon: SlidersHorizontal, title: 'Set Your Own Price', desc: 'You decide what your course is worth. Free or premium — it’s your call.' },
];

const ForCreators = () => {
  const { user, profile } = useAuth();
  const { raw, data } = usePlatformSettings();

  const ctaHref = user && profile?.is_creator && profile?.creator_approved
    ? '/creator/dashboard'
    : user ? '/creator/onboarding' : '/signup';

  // Free-input price calculator
  const [examplePrice, setExamplePrice] = useState(499);
  const [salesPerMonth, setSalesPerMonth] = useState(50);

  const breakdown = useMemo(
    () => computeCommission(inputsFromSettings(examplePrice, false, raw)),
    [examplePrice, raw],
  );
  const perSaleNoRef = breakdown.creatorEarningWithoutReferral; // 90% of net
  const perSaleWithRef = breakdown.creatorEarningWithReferral;  // 15% of net guaranteed
  const affiliateShare = breakdown.affiliateEarning;            // 75% to referrer
  const creatorKeepPct = Math.round((perSaleNoRef / Math.max(1, examplePrice)) * 100);

  const monthly = perSaleNoRef * salesPerMonth;
  const yearly = monthly * 12;

  return (
    <section id="for-creators" className="bg-secondary/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-accent mb-1">FOR CREATORS</p>
          <h2 className="font-heading text-3xl font-700">Teach on Backupshala. Set your price. Keep up to {creatorKeepPct}% of every sale.</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            You decide your course price. We show you exactly what you earn. No monthly fee. No hidden charges.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid gap-6 sm:grid-cols-3">
          {benefits.map((b, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <b.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading text-base font-600">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Interactive earnings calculator */}
        <div className="mt-12 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-lg font-700">How much can you earn?</h3>
          </div>

          {/* Free price input */}
          <div className="space-y-2 mb-5">
            <label className="text-sm font-medium">If you price your course at</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-2xl text-muted-foreground">₹</span>
              <Input
                type="number"
                inputMode="numeric"
                min={99}
                max={49999}
                value={examplePrice}
                onChange={e => setExamplePrice(Math.max(0, Math.min(49999, Number(e.target.value) || 0)))}
                className="h-14 pl-10 font-heading text-2xl font-700 tabular-nums rounded-xl"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[199, 499, 999, 1999].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setExamplePrice(p)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors min-h-[40px] ${
                  examplePrice === p ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                ₹{p}
              </button>
            ))}
          </div>

          {/* Live breakdown */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2 text-sm font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">Student pays (incl. GST)</span><span>{formatPrice(breakdown.gross)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="text-destructive">−{formatPrice(breakdown.gst)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Razorpay gateway</span><span className="text-destructive">−{formatPrice(breakdown.gatewayFee)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-bold">
              <span className="text-primary">YOU EARN (no referral)</span>
              <span className="text-primary">{formatPrice(perSaleNoRef)} ✓</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">With a referral · you keep</span>
              <span className="tabular-nums">{formatPrice(perSaleWithRef)} <span className="text-muted-foreground">+ referrer earns {formatPrice(affiliateShare)}</span></span>
            </div>
          </div>

          {/* Monthly volume slider */}
          <div className="space-y-2 mt-5">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium">Monthly sales</label>
              <span className="font-heading text-base font-700">{salesPerMonth}</span>
            </div>
            <Slider
              value={[salesPerMonth]}
              onValueChange={(v) => setSalesPerMonth(v[0])}
              min={5}
              max={500}
              step={5}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Per month</p>
              <p className="font-heading text-2xl font-800 text-primary">{formatPrice(monthly)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Per year</p>
              <p className="font-heading text-2xl font-800 text-accent">{formatPrice(yearly)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground text-center">
            Estimates only. Actual earnings depend on volume, refunds, and pricing changes.
          </p>
        </div>

        {/* Zero upfront cost section */}
        <div className="mt-10 mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-base font-700">Zero upfront cost. Always.</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Free to create an account</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Free to upload and publish courses</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Keep 15% guaranteed + 75% when you sell directly</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Withdraw your earnings anytime (min ₹{data.min_payout_amount})</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            <strong>Creator Pro</strong> is an optional upgrade with reduced fees and advanced tools. It is never required to sell on Backupshala.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-md bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 min-h-[44px]">
            <Link to={ctaHref}>Apply to Become a Creator →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ForCreators;
