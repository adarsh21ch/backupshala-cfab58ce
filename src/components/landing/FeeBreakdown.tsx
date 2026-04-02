import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

const FeeBreakdown = () => {
  const [price, setPrice] = useState(249);
  const [commission, setCommission] = useState(30);
  const platformFee = 15;
  const maxCommission = 100 - platformFee;

  const platformAmount = Math.round(price * platformFee / 100);
  const commissionAmount = Math.round(price * commission / 100);
  const creatorReceives = price - platformAmount - commissionAmount;
  const creatorPercent = 100 - platformFee - commission;

  return (
    <section id="platform-fee" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-700">Transparent Pricing — No Surprises</h2>
          <p className="mt-2 text-muted-foreground">Here's exactly how money is split on every enrollment</p>
        </div>
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 md:p-8">
          {/* Price input */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Course price (₹)</label>
            <Input
              type="number"
              min={99}
              max={9999}
              value={price}
              onChange={(e) => setPrice(Math.max(99, Math.min(9999, Number(e.target.value) || 99)))}
            />
          </div>

          {/* Commission slider */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Referral commission</label>
              <span className="text-sm font-bold text-accent">{commission}%</span>
            </div>
            <Slider
              min={0}
              max={maxCommission}
              step={1}
              value={[commission]}
              onValueChange={(v) => setCommission(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>{maxCommission}%</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <span>Student pays</span>
              <span className="font-semibold">₹{price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Platform fee ({platformFee}%)</span>
              <span className="text-muted-foreground">-₹{platformAmount} <span className="text-xs">→ Backupshala</span></span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Referrer earns ({commission}%)</span>
              <span className="text-muted-foreground">-₹{commissionAmount} <span className="text-xs">→ Referrer</span></span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-border pt-3">
              <span>Creator receives ({creatorPercent}%)</span>
              <span className="text-primary">₹{creatorReceives}</span>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground max-w-lg mx-auto">
          Commission % and pricing is set by each creator. Creators can set commission from 0% to {maxCommission}%. The higher the commission, the more motivated referrers are to promote your course.
        </p>
      </div>
    </section>
  );
};

export default FeeBreakdown;
