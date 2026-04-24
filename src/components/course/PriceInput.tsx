import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/format';

export const MIN_PRICE = 99;
export const MAX_PRICE = 49999;

interface Props {
  price: string;
  setPrice: (v: string) => void;
  originalPrice: string;
  setOriginalPrice: (v: string) => void;
  showOriginalPrice: boolean;
  setShowOriginalPrice: (v: boolean) => void;
  showSuggestions?: boolean;
}

const SUGGESTIONS: { value: number; label: string }[] = [
  { value: 299, label: 'Great for starter courses' },
  { value: 499, label: 'Most popular price point' },
  { value: 999, label: 'For in-depth courses' },
];

export const validatePrice = (raw: string): string | null => {
  const n = Number(raw);
  if (!raw.trim()) return 'Set a price';
  if (!Number.isFinite(n) || isNaN(n)) return 'Enter a valid number';
  if (!Number.isInteger(n)) return 'Use a whole number — no decimals';
  if (n < MIN_PRICE) return `Minimum ₹${MIN_PRICE}`;
  if (n > MAX_PRICE) return `Maximum ₹${MAX_PRICE.toLocaleString('en-IN')}`;
  return null;
};

const PriceInput = ({ price, setPrice, originalPrice, setOriginalPrice, showOriginalPrice, setShowOriginalPrice, showSuggestions = true }: Props) => {
  const [touched, setTouched] = useState(false);
  const error = touched ? validatePrice(price) : null;
  const priceNum = Number(price) || 0;

  const origNum = Number(originalPrice) || 0;
  const origError = showOriginalPrice && origNum > 0 && origNum <= priceNum
    ? `Original price must be more than ₹${priceNum}`
    : null;

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-base font-heading font-600">What will you charge students for this course?</Label>
        <p className="text-sm text-muted-foreground mt-1">
          You set your own price. Backupshala only takes a small platform fee per sale.
        </p>
      </div>

      <div>
        <Label className="text-sm">Course Price *</Label>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-2xl text-muted-foreground">₹</span>
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={1}
            value={price}
            onChange={e => { setPrice(e.target.value); setTouched(true); }}
            onBlur={() => setTouched(true)}
            placeholder="499"
            className={`h-16 pl-10 font-heading text-2xl font-700 tabular-nums rounded-xl ${error ? 'border-destructive' : ''}`}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive mt-1.5">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1.5">
            💡 Most courses on Backupshala sell well between ₹249 and ₹999. Min ₹{MIN_PRICE} · Max ₹{MAX_PRICE.toLocaleString('en-IN')}.
          </p>
        )}
      </div>

      {showSuggestions && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Not sure what to charge? Try one of these:</p>
          <div className="grid grid-cols-3 gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setPrice(String(s.value)); setTouched(true); }}
                className={`rounded-lg border p-2.5 text-left transition-colors min-h-[60px] ${
                  priceNum === s.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-card hover:border-accent/40 text-foreground'
                }`}
              >
                <p className="font-heading text-sm font-700">{formatPrice(s.value)}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={showOriginalPrice} onCheckedChange={setShowOriginalPrice} />
          <div>
            <p className="text-sm font-medium">Show a crossed-out original price</p>
            <p className="text-xs text-muted-foreground">Adds urgency — e.g. <span className="line-through">₹999</span> ₹499</p>
          </div>
        </div>
        {showOriginalPrice && (
          <>
            <Input
              type="number"
              inputMode="numeric"
              value={originalPrice}
              onChange={e => setOriginalPrice(e.target.value)}
              placeholder={`Must be more than ₹${priceNum || MIN_PRICE}`}
              className={`rounded-lg ${origError ? 'border-destructive' : ''}`}
            />
            {origError && <p className="text-xs text-destructive">{origError}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default PriceInput;
