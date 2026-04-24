import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { formatPrice } from '@/lib/format';
import { Sparkles } from 'lucide-react';

interface Props {
  price: number;
  isPro?: boolean;
  showVolumePreview?: boolean;
  compact?: boolean;
}

/**
 * Live earnings breakdown for creator courses.
 * Mirrors the server-side calculation in verify-razorpay-payment.
 */
const CreatorEarningsBreakdown = ({ price, isPro, showVolumePreview = true, compact = false }: Props) => {
  const { getSetting } = usePlatformSettings();

  const gatewayPct = Number(getSetting('gateway_fee_percent', '2')) || 2;
  const platformFreePct = Number(getSetting('platform_fee_free', '10')) || 10;
  const platformProPct = Number(getSetting('platform_fee_pro', '10')) || 10;
  const platformPct = isPro ? platformProPct : platformFreePct;

  const safePrice = Math.max(0, Math.floor(price || 0));
  const gatewayFee = Math.round(safePrice * (gatewayPct / 100));
  const netAfterGateway = safePrice - gatewayFee;
  const platformFee = Math.round(netAfterGateway * (platformPct / 100));
  const earn = Math.max(0, netAfterGateway - platformFee);

  if (compact) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">You earn per sale</span>
          <span className="font-bold text-primary">{formatPrice(earn)}</span>
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
          <span className="text-muted-foreground">Student pays</span>
          <span className="tabular-nums">{formatPrice(safePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Razorpay gateway fee ({gatewayPct}%)</span>
          <span className="text-destructive tabular-nums">−{formatPrice(gatewayFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform fee ({platformPct}%)</span>
          <span className="text-destructive tabular-nums">−{formatPrice(platformFee)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-bold text-primary">YOU RECEIVE PER SALE</span>
          <span className="font-bold text-primary tabular-nums">{formatPrice(earn)} ✓</span>
        </div>
      </div>

      {showVolumePreview && safePrice >= 99 && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          {[10, 50, 100].map(n => (
            <div key={n} className="rounded-lg bg-secondary/40 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{n} sales</p>
              <p className="font-heading text-sm font-700 text-accent tabular-nums">{formatPrice(earn * n)}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        💰 Earnings credit to your Backupshala wallet within 3 days. Minimum withdrawal: ₹500.
      </p>
    </div>
  );
};

export default CreatorEarningsBreakdown;
