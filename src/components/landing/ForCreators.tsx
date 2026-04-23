import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Scale, SlidersHorizontal, ShieldCheck, Sparkles } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatPrice } from '@/lib/format';

const benefits = [
  { icon: Upload, title: 'Video or Resource Courses', desc: 'Upload video lessons OR curate links, podcasts, and articles. Both formats supported.' },
  { icon: Scale, title: 'GST-Compliant Payments', desc: 'Razorpay handles every enrollment. GST invoices auto-generated. Fully compliant.' },
  { icon: SlidersHorizontal, title: 'Set Your Own Tiers', desc: 'Pick Basic or Advanced. Backupshala manages pricing, you focus on teaching.' },
];

const calcEarning = (price: number, gatewayPct: number, platformPct: number) => {
  const afterGateway = price * (1 - gatewayPct / 100);
  return Math.floor(afterGateway * (1 - platformPct / 100));
};

const ForCreators = () => {
  const { user, profile } = useAuth();
  const { data: settings, getSetting } = usePlatformSettings();

  const basicPrice = settings.basic_price;
  const advancedPrice = settings.advanced_price;
  const platformFeePct = Number(getSetting('platform_fee_free', '10')) || 10;
  const gatewayFeePct = Number(getSetting('gateway_fee_percent', '2')) || 2;

  const basicEarning = useMemo(() => calcEarning(basicPrice, gatewayFeePct, platformFeePct), [basicPrice, gatewayFeePct, platformFeePct]);
  const advancedEarning = useMemo(() => calcEarning(advancedPrice, gatewayFeePct, platformFeePct), [advancedPrice, gatewayFeePct, platformFeePct]);

  const ctaHref = user && profile?.is_creator && profile?.creator_approved
    ? '/creator/dashboard'
    : user ? '/creator/onboarding' : '/signup';

  // Calculator state
  const [calcTier, setCalcTier] = useState<'basic' | 'advanced'>('basic');
  const [salesPerMonth, setSalesPerMonth] = useState(50);

  const perSale = calcTier === 'basic' ? basicEarning : advancedEarning;
  const monthly = perSale * salesPerMonth;
  const yearly = monthly * 12;

  // Breakdown for accordion
  const breakdownPrice = basicPrice;
  const breakdownGateway = Math.round(breakdownPrice * (gatewayFeePct / 100));
  const breakdownAfterGateway = breakdownPrice - breakdownGateway;
  const breakdownPlatformFee = Math.round(breakdownAfterGateway * (platformFeePct / 100));
  const breakdownEarn = breakdownAfterGateway - breakdownPlatformFee;

  return (
    <section id="for-creators" className="bg-secondary/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-accent mb-1">FOR CREATORS</p>
          <h2 className="font-heading text-3xl font-700">Join free. Upload your course. Keep {100 - platformFeePct}% of every sale.</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            We only take {platformFeePct}% — nothing else. No monthly fee. No hidden charges. Pay nothing until you earn.
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

        {/* Live earning cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Basic Course</p>
            <p className="mt-1 font-heading text-2xl font-800">{formatPrice(basicPrice)}</p>
            <p className="mt-3 text-sm text-muted-foreground">You earn per sale</p>
            <p className="font-heading text-3xl font-800 text-primary">{formatPrice(basicEarning)}</p>
          </div>
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Advanced Course</p>
            <p className="mt-1 font-heading text-2xl font-800">{formatPrice(advancedPrice)}</p>
            <p className="mt-3 text-sm text-muted-foreground">You earn per sale</p>
            <p className="font-heading text-3xl font-800 text-accent">{formatPrice(advancedEarning)}</p>
          </div>
        </div>

        {/* Earnings calculator */}
        <div className="mt-10 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-lg font-700">How much can you earn?</h3>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCalcTier('basic')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] ${calcTier === 'basic' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              Basic ({formatPrice(basicPrice)})
            </button>
            <button
              onClick={() => setCalcTier('advanced')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] ${calcTier === 'advanced' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              Advanced ({formatPrice(advancedPrice)})
            </button>
          </div>

          <div className="space-y-2">
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

          <div className="mt-6 grid grid-cols-2 gap-3 text-center">
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

        {/* Fee breakdown accordion */}
        <div className="mt-8 mx-auto max-w-2xl">
          <Accordion type="single" collapsible>
            <AccordionItem value="bd" className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="font-heading text-sm font-600">
                Why do I earn {formatPrice(basicEarning)} on a {formatPrice(basicPrice)} course?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1.5 text-sm font-mono">
                  <div className="flex justify-between"><span className="text-muted-foreground">Student pays</span><span>{formatPrice(breakdownPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payment gateway ({gatewayFeePct}%)</span><span className="text-destructive">−{formatPrice(breakdownGateway)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Platform fee ({platformFeePct}%)</span><span className="text-destructive">−{formatPrice(breakdownPlatformFee)}</span></div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-bold text-primary">
                    <span>You receive</span><span>{formatPrice(breakdownEarn)}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Only {platformFeePct}% platform fee when you make a sale</li>
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
