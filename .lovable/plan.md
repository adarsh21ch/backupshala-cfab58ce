## Premium redesign of `/advanced`

Goal: turn the current functional dark page into a high-conversion premium sales page that justifies the ₹4,449 price and feels distinctly more premium than the Standard Bundle page.

### Visual direction

- Keep dark base (`#0b1020`) but layer in depth: radial amber glow behind hero, subtle grid/noise texture, gradient borders on cards.
- Amber (`#f59e0b`) as the single hero accent — used sparingly for impact, not on every element.
- Display font (Space Grotesk) for huge hero number + section headers; DM Sans for body.
- Animations: fade-in on scroll for each section, scale-in for the hero CTA, subtle glow pulse on the price badge.

### New page structure (top → bottom)

1. **Sticky top nav** — keep existing, add scroll-aware shadow.
2. **Hero (revamped)**
   - Animated "Advanced Program" badge with amber glow ring.
   - Headline: "Go from learner to earner" (kept).
   - Subheadline + dual CTA (Enroll / See curriculum — anchor link).
   - Right-side floating price card (instead of centered buttons): ₹4,449 with strike-through "₹X" suggested value, "Includes ₹449 Standard Bundle FREE" pill, trust row (Razorpay · Lifetime · GST invoice).
3. **Trust strip** — student count, average rating, certificates issued (pull from real data if available, else static).
4. **"Includes Standard Bundle free" callout** — keep, polish with gradient border.
5. **Curriculum preview** — accordion of modules/chapters fetched from the advanced course (resolved via `advanced_course_id` setting → `courses` + `chapters` tables). Show module title, lesson count, duration. First module expanded by default.
6. **What you get** — keep 6 feature cards but upgrade with icons, hover lift, and gradient borders.
7. **Basic vs Advanced comparison table** — two columns side by side, checkmarks/crosses, Advanced column highlighted with amber border + "Recommended" tag.
8. **Testimonials** — 3-card grid (avatar, name, role, quote, star rating). Static seed data for now; later wire to a `testimonials` table.
9. **Instructor / Mentor strip** — short "Taught by Backupshala mentors" block with avatars.
10. **FAQ** — accordion with 6–8 common questions (refund, access duration, certificate, mentor sessions, payment, GST).
11. **Money-back guarantee badge** — 7-day refund seal with shield icon.
12. **Final CTA section** — keep, upgrade with bigger gradient panel and countdown-style urgency text ("Join 1,200+ students").
13. **Footer** — keep minimal.
14. **Sticky bottom enroll bar** — appears after scrolling past the hero on all viewports. Shows: course name, price, "Enroll for ₹4,449" button. Hidden on the hero, fades in on scroll, dismissible on mobile.

### Files to create / edit

- **Edit** `src/pages/Advanced.tsx` — full restructure using new section components.
- **Create** `src/components/advanced/` folder:
  - `AdvancedHero.tsx`
  - `AdvancedCurriculum.tsx` (queries advanced course + chapters)
  - `AdvancedComparison.tsx`
  - `AdvancedTestimonials.tsx`
  - `AdvancedFAQ.tsx`
  - `AdvancedStickyBar.tsx` (uses scroll listener + IntersectionObserver on hero)
- **No DB changes** — reuses existing `courses`, `chapters`, `platform_settings`. Testimonials hardcoded in component (clear `// TODO: move to DB later` comment).

### Out of scope (can be follow-ups)

- Real testimonials table + admin UI.
- Real-time student counter.
- Video preview embed in hero.
- A/B testing variants.

### Acceptance

- Page feels visually distinct from Standard Bundle page (premium vs friendly).
- All sections render with real course data where applicable.
- Sticky bar behaves correctly on mobile + desktop, doesn't overlap footer.
- Lighthouse SEO/performance not regressed; meta tags preserved.
