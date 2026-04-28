import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Percent } from 'lucide-react';
import { computeCommission, inputsFromSettings } from '@/lib/commissionModel';
import { formatPrice } from '@/lib/format';

interface Props {
  values: Record<string, string>;
  setVal: (key: string, value: string) => void;
  errors: Record<string, string>;
}

const PctInput = ({
  k, label, hint, values, setVal, errors,
}: { k: string; label: string; hint?: string } & Props) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        value={values[k] ?? ''}
        onChange={e => setVal(k, e.target.value)}
        className={`bg-secondary border-border pr-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors[k] ? 'border-destructive' : ''}`}
      />
      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const CommissionStructureCard = ({ values, setVal, errors }: Props) => {
  // ----- Validation: each model must sum to 100% -----
  const platformSum =
    Number(values.platform_course_platform_fee_percent || 25) +
    Number(values.platform_course_affiliate_percent || 75);
  const creatorSum =
    Number(values.creator_course_platform_fee_percent || 10) +
    Number(values.creator_course_creator_fee_percent || 15) +
    Number(values.creator_course_affiliate_percent || 75);

  // ----- Live previews -----
  const platformExample = useMemo(
    () => computeCommission(inputsFromSettings(6999, true, values)),
    [values],
  );
  const creatorExample = useMemo(
    () => computeCommission(inputsFromSettings(3000, false, values)),
    [values],
  );

  return (
    <>
      {/* Platform course splits */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Backupshala Platform Courses</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Courses created by Backupshala. No external creator. The split applies to <strong>net amount</strong> (after GST and gateway fee).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <PctInput
              k="platform_course_platform_fee_percent"
              label="Platform fee"
              hint="Backupshala keeps this % on every sale"
              values={values} setVal={setVal} errors={errors}
            />
            <PctInput
              k="platform_course_affiliate_percent"
              label="Affiliate commission"
              hint="Enrolled referrer earns this % of net"
              values={values} setVal={setVal} errors={errors}
            />
          </div>
          {platformSum !== 100 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Platform + Affiliate must equal 100%. Current total: {platformSum}%.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-xs space-y-1">
            <p className="text-muted-foreground font-medium mb-2">Example on a ₹6,999 platform course:</p>
            <Row label={`GST (${values.gst_rate_percent || 18}%)`} value={`−${formatPrice(platformExample.gst)}`} muted />
            <Row label={`Gateway (${values.gateway_fee_percent || 2}%)`} value={`−${formatPrice(platformExample.gatewayFee)}`} muted />
            <Row label="Net amount" value={formatPrice(platformExample.net)} bold />
            <div className="my-1 border-t border-border" />
            <Row label="With referral → Platform keeps" value={formatPrice(platformExample.withReferral.platform)} />
            <Row label="With referral → Affiliate earns" value={formatPrice(platformExample.withReferral.affiliate)} accent />
            <Row label="No referral → Platform keeps" value={formatPrice(platformExample.withoutReferral.platform)} />
          </div>
        </CardContent>
      </Card>

      {/* Creator course splits */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Creator Courses</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Courses uploaded by independent creators. Creator <strong>always</strong> receives their share, even with no referral.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <PctInput
              k="creator_course_platform_fee_percent"
              label="Platform fee"
              hint="Backupshala keeps"
              values={values} setVal={setVal} errors={errors}
            />
            <PctInput
              k="creator_course_creator_fee_percent"
              label="Creator fee"
              hint="Creator always gets this"
              values={values} setVal={setVal} errors={errors}
            />
            <PctInput
              k="creator_course_affiliate_percent"
              label="Affiliate commission"
              hint="Referrer (or creator if no ref)"
              values={values} setVal={setVal} errors={errors}
            />
          </div>
          {creatorSum !== 100 ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Platform + Creator + Affiliate must equal 100%. Current total: {creatorSum}%.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Creator always receives their {values.creator_course_creator_fee_percent || 15}% regardless of referrals.
                The {values.creator_course_affiliate_percent || 75}% affiliate share goes to the referrer if referred,
                or back to the creator if not referred.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-xs space-y-1">
            <p className="text-muted-foreground font-medium mb-2">Example on a ₹3,000 creator course:</p>
            <Row label={`GST (${values.gst_rate_percent || 18}%)`} value={`−${formatPrice(creatorExample.gst)}`} muted />
            <Row label={`Gateway (${values.gateway_fee_percent || 2}%)`} value={`−${formatPrice(creatorExample.gatewayFee)}`} muted />
            <Row label="Net amount" value={formatPrice(creatorExample.net)} bold />
            <div className="my-1 border-t border-border" />
            <p className="text-muted-foreground font-medium mt-2">With referral:</p>
            <Row label="Platform keeps" value={formatPrice(creatorExample.withReferral.platform)} />
            <Row label="Creator earns" value={formatPrice(creatorExample.withReferral.creator)} />
            <Row label="Affiliate earns" value={formatPrice(creatorExample.withReferral.affiliate)} accent />
            <p className="text-muted-foreground font-medium mt-2">No referral:</p>
            <Row label="Platform keeps" value={formatPrice(creatorExample.withoutReferral.platform)} />
            <Row label="Creator earns (15% + 75%)" value={formatPrice(creatorExample.withoutReferral.creator)} accent />
          </div>
        </CardContent>
      </Card>

      {/* GST + Gateway */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">GST &amp; Gateway</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <PctInput k="gst_rate_percent" label="GST rate" hint="Standard: 18%" values={values} setVal={setVal} errors={errors} />
            <PctInput k="gateway_fee_percent" label="Razorpay gateway fee" hint="Typical: 2%" values={values} setVal={setVal} errors={errors} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium">GST extraction enabled</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When on, GST is extracted from price before computing splits.</p>
            </div>
            <Switch
              checked={values.gst_enabled === 'true'}
              onCheckedChange={v => setVal('gst_enabled', v ? 'true' : 'false')}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};

const Row = ({
  label, value, accent, muted, bold,
}: { label: string; value: string; accent?: boolean; muted?: boolean; bold?: boolean }) => (
  <div className="flex justify-between font-mono">
    <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
    <span className={`tabular-nums ${accent ? 'text-primary font-semibold' : ''} ${bold ? 'font-semibold' : ''}`}>
      {value}
    </span>
  </div>
);

export default CommissionStructureCard;
