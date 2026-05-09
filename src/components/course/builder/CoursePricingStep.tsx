import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PriceInput, { validatePrice } from "@/components/course/PriceInput";
import CreatorEarningsBreakdown from "@/components/course/CreatorEarningsBreakdown";

interface Props {
  price: string;
  setPrice: (v: string) => void;
  originalPrice: string;
  setOriginalPrice: (v: string) => void;
  showOriginalPrice: boolean;
  setShowOriginalPrice: (v: boolean) => void;
  isPro: boolean;
  status: string;
  saving: boolean;
  onSave: () => void;
}

const CoursePricingStep = ({
  price,
  setPrice,
  originalPrice,
  setOriginalPrice,
  showOriginalPrice,
  setShowOriginalPrice,
  isPro,
  status,
  saving,
  onSave,
}: Props) => {
  const priceNum = Number(price) || 0;
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      {status === "published" && (
        <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-accent">
            This course is live. Changing the price will set status back to pending review.
          </p>
        </div>
      )}

      <PriceInput
        price={price}
        setPrice={setPrice}
        originalPrice={originalPrice}
        setOriginalPrice={setOriginalPrice}
        showOriginalPrice={showOriginalPrice}
        setShowOriginalPrice={setShowOriginalPrice}
      />

      <CreatorEarningsBreakdown price={priceNum} isPro={isPro} />

      <Button
        onClick={onSave}
        disabled={saving || !!validatePrice(price)}
        className="rounded-md bg-primary hover:bg-primary/90"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Pricing"}
      </Button>
    </div>
  );
};

export default CoursePricingStep;
