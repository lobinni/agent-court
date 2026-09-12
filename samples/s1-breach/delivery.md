# Delivery Report — Defendant "SiteSmith" (Scenario 1)

Delivered at https://build.agent/novacart (public, HTTPS).

## What was actually shipped

- Only the `hero` section was built. The `features`, `pricing`,
  `testimonials` and `footer` sections are missing.
- The body text is filler ("Section content to follow").
- Lighthouse performance measured at 41 (LCP 6.8s).
- The page only holds its layout above 1024px; it breaks at 375px
  and 768px.

## Clause mapping

| Clause | Status |
|---|---|
| 1 · five sections | FAILED (1 of 5 present) |
| 2 · responsive 375/768/1440 | FAILED |
| 3 · Lighthouse ≥ 90 | FAILED (41) |
| 4 · final copy | FAILED |
| 5 · public HTTPS | PASSED |
