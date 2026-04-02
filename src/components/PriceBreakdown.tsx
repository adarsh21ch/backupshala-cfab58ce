import { formatPrice } from '@/lib/format';
import { Info } from 'lucide-react';

interface PriceBreakdownProps {
  price: number;
  platformFeePercent: number;
  commissionPercent: number;
}

const getCommissionMessage = (commission: number, maxCommission: number, commissionAmt: number) => {
  if (commission === 0) {
    return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', text: '💼 Solo Mode — You keep everything after platform fee. Best if you are personally referring all your students yourself.' };
  }
  if (commission >= maxCommission) {
    return { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', text: '🎯 Maximum Referral Mode — You earn ₹0 from this course. Every rupee (after platform fee) goes to whoever refers a student. Use this when your goal is building an audience, not immediate income.' };
  }
  if (commission >= 61) {
    return { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', text: `🚀 High Referral Mode — Strong incentive for your team to promote hard. You earn less per sale but get more enrollments.` };
  }
  if (commission >= 31) {
    return { color: 'bg-primary/10 text-primary border-primary/20', text: `⚡ Balanced Mode — Good incentive for referrers while you still earn a solid amount per enrollment.` };
  }
  return { color: 'bg-muted text-muted-foreground border-border', text: `Referrers earn ${formatPrice(commissionAmt)} per enrollment. Low commission — works best if you are doing most of the promotion yourself.` };
};

const PriceBreakdown = ({ price, platformFeePercent, commissionPercent }: PriceBreakdownProps) => {
  const platformFeeAmt = Math.round(price * (platformFeePercent / 100));
  const commissionAmt = Math.round(price * (commissionPercent / 100));
  const creatorReceives = price - platformFeeAmt - commissionAmt;
  const creatorPercent = Math.round(100 - platformFeePercent - commissionPercent);
  const maxCommission = 100 - platformFeePercent;

  const message = getCommissionMessage(commissionPercent, maxCommission, commissionAmt);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
        <h3 className="text-sm font-medium">Price Breakdown</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Student pays</span>
          <span className="font-semibold">{formatPrice(price)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Platform fee ({platformFeePercent}%)</span>
          <span className="text-destructive">-{formatPrice(platformFeeAmt)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Referrer commission ({commissionPercent}%)</span>
          <span className="text-destructive">-{formatPrice(commissionAmt)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between text-sm">
          <span className="font-medium">You receive</span>
          <span className="font-bold text-primary">{formatPrice(creatorReceives)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Your earnings %</span>
          <span className="text-muted-foreground">{creatorPercent}%</span>
        </div>
      </div>
      <div className={`rounded-lg border p-3 text-xs ${message.color}`}>
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakdown;
