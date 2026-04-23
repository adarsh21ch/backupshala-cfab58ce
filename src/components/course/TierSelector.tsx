import { Check, Star, Zap } from 'lucide-react';
import { calculateSaleSplit, type CommissionConfig } from '@/lib/tierPricing';
import { formatPrice } from '@/lib/format';

interface Props {
  selected: 'basic' | 'advanced' | null;
  onChange: (tier: 'basic' | 'advanced') => void;
  basicPrice: number;
  advancedPrice: number;
  commissionConfig: CommissionConfig;
  isPro?: boolean;
  disabled?: boolean;
}

const TierSelector = ({ selected, onChange, basicPrice, advancedPrice, commissionConfig, isPro, disabled }: Props) => {
  const basicSplit = calculateSaleSplit(basicPrice, commissionConfig, isPro);
  const advancedSplit = calculateSaleSplit(advancedPrice, commissionConfig, isPro);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-base font-semibold">Choose Course Tier *</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Pricing is set platform-wide to keep things simple and trustworthy. You always keep {100 - commissionConfig.platformFeePct}% of every sale.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Basic */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('basic')}
          className={`text-left rounded-xl border-2 p-5 transition-all ${
            selected === 'basic'
              ? 'border-accent bg-accent/5 shadow-sm'
              : 'border-border bg-card hover:border-accent/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              <Zap className="h-3 w-3" /> BASIC
            </span>
            {selected === 'basic' && <Check className="h-4 w-4 text-accent" />}
          </div>
          <p className="font-heading text-2xl font-extrabold">{formatPrice(basicPrice)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Entry-level course • For beginners</p>
          <div className="mt-3 rounded-lg bg-secondary/40 p-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">You earn</span>
              <span className="font-semibold text-primary">{formatPrice(basicSplit.creatorShare)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              per sale (after gateway + platform fee)
            </div>
          </div>
        </button>

        {/* Advanced */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('advanced')}
          className={`relative text-left rounded-xl border-2 p-5 transition-all ${
            selected === 'advanced'
              ? 'border-accent bg-accent/5 shadow-sm'
              : 'border-border bg-card hover:border-accent/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
            Popular
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-info/10 px-2 py-0.5 text-xs font-bold text-info">
              <Star className="h-3 w-3" /> ADVANCED
            </span>
            {selected === 'advanced' && <Check className="h-4 w-4 text-accent" />}
          </div>
          <p className="font-heading text-2xl font-extrabold">{formatPrice(advancedPrice)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">In-depth • For serious learners</p>
          <div className="mt-3 rounded-lg bg-secondary/40 p-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">You earn</span>
              <span className="font-semibold text-primary">{formatPrice(advancedSplit.creatorShare)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              per sale (after gateway + platform fee)
            </div>
          </div>
        </button>
      </div>
      {selected && (
        <p className="text-[11px] text-muted-foreground">
          ✓ Price is fixed by Backupshala for consistency. You keep <strong>{100 - commissionConfig.platformFeePct}%</strong> of every sale, paid to your wallet within 3 days.
        </p>
      )}
    </div>
  );
};

export default TierSelector;
