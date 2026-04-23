import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const Row = ({ label, value, strong, neg, accent }: { label: string; value: string; strong?: boolean; neg?: boolean; accent?: boolean }) => (
  <div className={`flex items-center justify-between text-sm ${strong ? 'font-semibold' : ''}`}>
    <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
    <span className={`tabular-nums ${neg ? 'text-destructive' : accent ? 'text-primary font-bold' : 'text-foreground'}`}>{value}</span>
  </div>
);

const FeeBreakdown = () => {
  const { data: settings } = usePlatformSettings();

  const basicPrice = settings.basic_price;
  const advancedPrice = settings.advanced_price;
  const gatewayPct = Number((settings as any).platform_fee_percent ? 2 : 2); // legacy fallback
  const platformPct = settings.platform_fee_percent;

  // Match server-side calc: gateway from price, platform fee from net
  const calc = (price: number) => {
    const gateway = Math.round(price * (gatewayPct / 100));
    const net = price - gateway;
    const platform = Math.round(net * (platformPct / 100));
    const creator = net - platform;
    return { gateway, net, platform, creator };
  };

  const basic = calc(basicPrice);
  const advanced = calc(advancedPrice);

  const fmt = (n: number) => `₹${n}`;

  return (
    <section id="platform-fee" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-700 md:text-4xl">Simple, Honest Pricing</h2>
          <p className="mt-3 text-muted-foreground">Here is exactly what happens on every sale</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {[
            { label: 'Basic Course Sale', price: basicPrice, c: basic },
            { label: 'Advanced Course Sale', price: advancedPrice, c: advanced },
          ].map(({ label, price, c }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
                <span className="font-heading text-xl font-700">{fmt(price)}</span>
              </div>
              <Row label="Student pays" value={fmt(price)} />
              <Row label={`Gateway fee (${gatewayPct}%)`} value={`-${fmt(c.gateway)}`} neg />
              <Row label="Net amount" value={fmt(c.net)} />
              <Row label={`Platform fee (${platformPct}%)`} value={`-${fmt(c.platform)}`} neg />
              <div className="border-t border-border pt-3">
                <Row label="YOU RECEIVE" value={`${fmt(c.creator)} ✓`} strong accent />
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          If someone referred this sale, the referral commission comes from the platform fee.
          Your <span className="text-primary font-semibold">{fmt(basic.creator)}</span> or <span className="text-primary font-semibold">{fmt(advanced.creator)}</span> is always protected — referrals never reduce your earnings.
        </p>
      </div>
    </section>
  );
};

export default FeeBreakdown;
