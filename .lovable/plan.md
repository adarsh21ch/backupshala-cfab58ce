## Goal
Wire prices/commissions to `usePlatformSettings()` and align fallback defaults with current DB values. No layout/design changes.

---

## File 1 — `src/hooks/usePlatformSettings.ts`

Update the `defaults` object only:

```ts
const defaults: PlatformSettings = {
  platform_name: 'Backupshala',
  platform_fee_percent: 5,              // was 10
  default_commission_percent: 75,       // was 70
  min_payout_amount: 500,
  support_email: 'support@backupshala.com',
  razorpay_enabled: true,
  maintenance_mode: false,
  basic_price: 449,                     // was 249
  advanced_price: 4449,                 // was 499
  upgrade_price: 4000,                  // was 250
};
```

Note: the `parsed.upgrade_price` is computed as `advanced_price - basic_price`, so it will naturally be `4000` when DB values match; the `defaults.upgrade_price = 4000` is the sane fallback if either price is missing.

---

## File 2 — `src/pages/About.tsx`

1. Add hook + dynamic label:
   ```tsx
   import { usePlatformSettings } from '@/hooks/usePlatformSettings';
   import { formatINR } from '@/lib/format';
   ```
   Convert `About` from arrow-const expression to a function body so we can call the hook:
   ```tsx
   const About = () => {
     const { data } = usePlatformSettings();
     const priceLabel = formatINR(data.basic_price);
     return (
       // ...existing JSX
     );
   };
   ```
2. Line 24 — replace `For just ₹249,` with `For just {priceLabel},`.
3. Line 54 — replace `Start Learning for ₹249` with `Start Learning for {priceLabel}`.

(If `formatINR` doesn't exist in `@/lib/format`, fall back to `` `₹${data.basic_price}` ``. I'll check at implementation time and pick whichever is exported.)

---

## File 3 — `src/components/landing/FAQ.tsx`

Convert the static `faqs` array into a function of settings so values inject at render:

```tsx
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const buildFaqs = (minPayout: number, platformFee: number, creatorMax: number) => [
  // ...same items, but the two hardcoded ₹500s become `₹${minPayout}`
  // and "anywhere from 0% to 85%. The remaining 15% is Backupshala's platform fee"
  // becomes `anywhere from 0% to ${creatorMax}%. The remaining ${platformFee}% is Backupshala's platform fee.`
  // and "Backupshala charges a 15% platform fee" becomes `Backupshala charges a ${platformFee}% platform fee`
];

const FAQ = () => {
  const { data } = usePlatformSettings();
  const platformFee = data.platform_fee_percent;     // 5
  const creatorMax = 100 - platformFee;              // 95
  const faqs = buildFaqs(data.min_payout_amount, platformFee, creatorMax);
  // existing JSX unchanged
};
```

Specifically replace, in the FAQ strings:
- `Minimum payout threshold is ₹500.` → `` `Minimum payout threshold is ₹${minPayout}.` ``
- `wallet balance reaches ₹500 or more` → `` `wallet balance reaches ₹${minPayout} or more` ``
- `anywhere from 0% to 85%. The remaining 15% is Backupshala's platform fee.` → `` `anywhere from 0% to ${creatorMax}%. The remaining ${platformFee}% is Backupshala's platform fee.` ``
- `Backupshala charges a 15% platform fee` → `` `Backupshala charges a ${platformFee}% platform fee` ``

The "₹99 to ₹9,999" range stays unchanged per your instruction.

---

## File 4 — `src/components/landing/ForCreators.tsx`

1. Reuse the existing `usePlatformSettings()` import — already pulled as `{ raw }`. Add `data` to the destructure:
   ```tsx
   const { raw, data } = usePlatformSettings();
   ```
2. Line 162 — replace `Withdraw your earnings anytime (min ₹500)` with:
   ```tsx
   <li className="flex items-start gap-2"><span className="text-primary">✓</span> Withdraw your earnings anytime (min ₹{data.min_payout_amount})</li>
   ```

No other changes in this file.

---

## Verification

After edits I'll print the relevant sections of each file (the `defaults` object, the About hook block + 2 swapped strings, the new FAQ builder + hook, and the ForCreators line 162) so you can confirm.

No build/typecheck needed beyond what the harness runs automatically.
