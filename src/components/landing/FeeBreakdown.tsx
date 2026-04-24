import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatPrice } from '@/lib/format';

const Row = ({ label, value, strong, neg, accent }: { label: string; value: string; strong?: boolean; neg?: boolean; accent?: boolean }) => (
  <div className={`flex items-center justify-between text-sm ${strong ? 'font-semibold' : ''}`}>
    <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
    <span className={`tabular-nums ${neg ? 'text-destructive' : accent ? 'text-primary font-bold' : 'text-foreground'}`}>{value}</span>
  </div>
);

const FeeBreakdown = () => {
  const { getSetting } = usePlatformSettings();
  const gatewayPct = Number(getSetting('gateway_fee_percent', '2')) || 2;
  const platformPct = Number(getSetting('platform_fee_free', '10')) || 10;

  const [price, setPrice] = useState(499);

  const gateway = Math.round(price * (gatewayPct / 100));
  const net = Math.max(0, price - gateway);
  const platform = Math.round(net * (platformPct / 100));
  const creator = Math.max(0, net - platform);

  return (
    <section id="platform-fee" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-700 md:text-4xl">Simple, Honest Pricing</h2>
          <p className="mt-3 text-muted-foreground">You set your price. We show exactly what you earn.</p>
        </div>

        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium">Try it — set any course price</label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-xl text-muted-foreground">₹</span>
              <Input
                type="number"
                inputMode="numeric"
                min={99}
                max={49999}
                value={price}
                onChange={e => setPrice(Math.max(0, Math.min(49999, Number(e.target.value) || 0)))}
                className="h-14 pl-9 font-heading text-xl font-700 tabular-nums rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2.5 border-t border-border pt-4">
            <Row label="Student pays" value={formatPrice(price)} />
            <Row label={`Gateway fee (${gatewayPct}%)`} value={`-${formatPrice(gateway)}`} neg />
            <Row label="Net amount" value={formatPrice(net)} />
            <Row label={`Platform fee (${platformPct}%)`} value={`-${formatPrice(platform)}`} neg />
            <div className="border-t border-border pt-3">
              <Row label="YOU RECEIVE" value={`${formatPrice(creator)} ✓`} strong accent />
            </div>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          If someone refers a sale, the referral commission comes from the platform fee.
          Your <span className="text-primary font-semibold">{formatPrice(creator)}</span> is always protected — referrals never reduce your earnings.
        </p>
      </div>
    </section>
  );
};

export default FeeBreakdown;
