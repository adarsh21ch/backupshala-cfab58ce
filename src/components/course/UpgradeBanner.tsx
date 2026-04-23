import { Star, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';

interface Props {
  upgradePrice: number;
  basicCount: number;
  advancedCount: number;
  onUpgrade: () => void;
  loading?: boolean;
}

const UpgradeBanner = ({ upgradePrice, basicCount, advancedCount, onUpgrade, loading }: Props) => {
  if (advancedCount === 0) return null;
  return (
    <div className="rounded-xl border-2 border-accent/40 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            You have <span className="text-primary">Basic access</span>. Unlock {advancedCount} more advanced module{advancedCount > 1 ? 's' : ''}.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            One-time payment. Instant access. No subscription.
          </p>
        </div>
        <Button
          onClick={onUpgrade}
          disabled={loading}
          className="rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold w-full sm:w-auto"
        >
          {loading ? 'Loading…' : (
            <>
              Upgrade — {formatPrice(upgradePrice)} <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UpgradeBanner;
