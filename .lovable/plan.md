## Redesign the Backupshala logo (v2)

Build a cleaner, more scalable mark that fixes the v1 issues (too many elements, three competing colors, weak at favicon size) while keeping the brand DNA: education + growth + security, in saffron + green.

### The new mark — concept

A single integrated symbol instead of three stacked objects:

- **Outer form:** a soft-rounded shield (security / "backup")
- **Inside:** a graduation cap whose tassel doubles as an upward arrow / growth tick
- **Two colors only:** saffron `#F97316` (cap + tassel-arrow) and forest green `#16A34A` (shield) — black/white auto-adapts via theme
- **Negative space:** the cap's underside cuts cleanly into the shield so the whole thing reads as one shape, not three
- **Geometry:** built on a 24-unit grid, 2px stroke, rounded joins — survives down to 16px favicon

This drops v1's bar-chart (redundant with the tassel-arrow) and the black outline (replaced by clean color blocks), giving a 2-color, single-silhouette mark that ages better.

### Wordmark

Keep current Space Grotesk Bold, "Backup" in foreground + "shala" in saffron — already working, no change.

### How it'll be generated

Use Nano Banana Pro (`google/gemini-3-pro-image-preview`) with a precise prompt for a flat vector-style icon on transparent background, 1024×1024, then derive every size we need.

### Files that will be regenerated

All from the single new master PNG:

- `src/assets/backupshala-icon.png` — full color master
- `src/assets/backupshala-icon-orange.png` — saffron layer only (cap + arrow)
- `src/assets/backupshala-icon-navy.png` — shield layer as alpha mask (so it follows `text-foreground` → dark in light mode, cream in dark mode, exactly like today)
- `public/icons/icon-192.png`, `icon-512.png` (PWA, "any" purpose)
- `public/icons/icon-192-maskable.png`, `icon-512-maskable.png` (with safe-zone padding for Android adaptive icons)
- `public/apple-touch-icon.png` (180×180, white background, rounded by iOS)
- `public/favicon.png`, `favicon-32.png`, `favicon-16.png`, `favicon.ico` (multi-size)

### No code changes needed

`src/components/Logo.tsx`, `index.html`, and `public/manifest.json` already point at the right paths — swapping the asset files is enough. The two-layer mask trick keeps theme-aware recoloring working automatically.

### QA before delivery

1. Render the master at 512px, 192px, 32px, 16px and visually inspect — must stay legible at favicon size.
2. Inspect the in-app `<Logo />` in both light and dark mode previews.
3. Confirm the maskable variants have ≥10% safe-zone padding (Android crops aggressively).
4. Re-run if the mark loses detail at 16px or the two colors muddy together.

### What stays the same

- Wordmark, font, color tokens
- Logo component API and all imports
- Manifest, theme-color, all routes
