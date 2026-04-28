import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatPrice } from '@/lib/format';
import { Sparkles, TrendingUp } from 'lucide-react';
import { computeCommission, inputsFromSettings } from '@/lib/commissionModel';

interface Props {
  price: number;
  isPro?: boolean;
  showVolumePreview?: boolean;
  compact?: boolean;
}

/**
 * Live earnings breakdown for creator courses (new commission model).
 * - Creator gets 15% guaranteed of net.
 * - Without referral, creator keeps 15% + 75% = 90% of net.
 * - With a referral by someone else, creator keeps 15%; affiliate earns 75%.
 * - Self-referral by the creator: creator gets the full 90% (15% + 75%).
 */
const CreatorEarningsBreakdown = ({ price, showVolumePreview = true, compact = false }: Props) => {
  const { raw } = usePlatformSettings();
  const safePrice = Math.max(0, Math.floor(price || 0));
  const c = computeCommission(inputsFromSettings(safePrice, false, raw));

  const without = c.creatorEarningWithoutReferral; // 90% of net
  const withRef = c.creatorEarningWithReferral;    // 15% of net (guaranteed)
  const affiliate = c.affiliateEarning;            // 75% of net to referrer

  if (compact) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">You earn (no referral)</span>
          <span className="font-bold text-primary">{formatPrice(without)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">You earn (with referral)</span>
          <span className="font-semibold">{formatPrice(withRef)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="font-heading text-sm font-700">Your Earnings Breakdown</h3>
      </div>

      <div className="space-y-2 text-sm font-mono">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Student pays (incl. GST)</span>
          <span className="tabular-nums">{formatPrice(c.gross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">GST ({Math.round((c.gst / Math.max(1, c.base)) * 100)}%)</span>
          <span className="text-destructive tabular-nums">−{formatPrice(c.gst)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Razorpay gateway fee</span>
          <span className="text-destructive tabular-nums">−{formatPrice(c.gatewayFee)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2">
          <span className="text-muted-foreground">Net amount</span>
          <span className="tabular-nums">{formatPrice(c.net)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">No referral</p>
          <p className="font-heading text-lg font-800 text-primary tabular-nums">{formatPrice(without)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">15% + 75%</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">With referral</p>
          <p className="font-heading text-lg font-800 tabular-nums">{formatPrice(withRef)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">15% guaranteed · referrer gets {formatPrice(affiliate)}</p>
        </div>
      </div>

      {showVolumePreview && safePrice >= 99 && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          {[10, 50, 100].map(n => (
            <div key={n} className="rounded-lg bg-secondary/40 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{n} sales (no ref)</p>
              <p className="font-heading text-sm font-700 text-accent tabular-nums">{formatPrice(without * n)}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
        <TrendingUp className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
        Referrals never reduce your guaranteed 15%. Earnings credit to your wallet within 3 days.
      </p>
    </div>
  );
};

export default CreatorEarningsBreakdown;
