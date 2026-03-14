# Revamp UI V1 Plan

> Project: monetize-fan
> Date: March 14, 2026
> Scope: Planning document only (no code change in this step)

## Objective

Revamp the dashboard UI so all pages are fully responsive, mobile-friendly, and use a better typography system.

## Goals

1. All pages must support responsive layout behavior.
2. Mobile view (320px+) must be usable, readable, and touch-friendly.
3. Replace current font style with a cleaner and more intentional font system.

## Constraints

1. Do not change business logic, API contracts, or feature flow.
2. Focus on UI layer only (layout, spacing, typography, visual hierarchy).
3. Keep existing dark-first visual language unless explicitly changed later.

## In-Scope Screens

1. `/dashboard/profile`
2. `/dashboard/post`
3. `/dashboard/trends`
4. `/dashboard/generate`
5. Shared layout components (`app/layout.tsx`, `app/dashboard/layout.tsx`, `components/sidebar.tsx`, global styles)

## Out of Scope (V1)

1. New features or route changes
2. Backend/API changes
3. Content generation logic changes
4. Full design system rebrand

## Current Baseline (Quick Audit)

1. App already has mobile drawer sidebar, but some page-level sections are not optimized for very small screens.
2. Several rows are fixed horizontal (`flex` without wrap) and may feel tight on mobile.
3. Toast positions (`top-right` / `bottom-right`) need mobile-safe layout behavior.
4. Typography currently uses `Geist` and feels too generic for brand tone.

## Proposed Typography Direction

### Recommended Font Pairing (Primary)

1. Heading/UI emphasis: `Sora`
2. Body: `Plus Jakarta Sans`
3. Mono (counters/code): `IBM Plex Mono`

### Why This Pairing

1. Better personality than default geometric UI fonts.
2. Strong readability for mixed Bahasa Indonesia + English content.
3. Clean hierarchy on small screens without looking “flat”.

### Fallback Pairing (If Performance/Preference Changes)

1. Heading: `Manrope`
2. Body: `Source Sans 3`
3. Mono: `JetBrains Mono`

## Responsive Strategy

### Breakpoints

Use Tailwind defaults with design QA at:

1. 320px
2. 375px
3. 390px
4. 768px
5. 1024px
6. 1280px

### Global Rules

1. Prevent horizontal scroll on all pages.
2. Use fluid spacing (`p-4` mobile, scale up at `md`/`lg`).
3. Ensure minimum touch target size `44px` for interactive controls.
4. Use wrapping stacks for action rows and metadata rows on small screens.
5. Keep text readable with consistent line-height and mobile-first type scale.

## Page-by-Page Revamp Plan

### 1. Shared Layout + Sidebar

1. Keep desktop sidebar width behavior.
2. Improve mobile drawer interaction spacing and close affordance.
3. Ensure main content uses responsive horizontal padding and safe vertical rhythm.
4. Validate no overlap between drawer, toasts, and modal layers.

### 2. Profile Page

1. Make profile header block stack cleanly on narrow widths.
2. Convert metrics row to wrap naturally on small screens.
3. Ensure form labels/counters do not crowd input fields.
4. Make success/error toast mobile-safe (centered/top with max width).

### 3. Post Page

1. Keep composer card full-width within a responsive container.
2. Make char-counter + CTA row wrap on small screens.
3. Improve post history card spacing for thumb scrolling.
4. Make top toast responsive and avoid edge clipping.

### 4. Trends Page

1. Keep grid as `1 col` on mobile, scale to `2/3 cols` on larger breakpoints.
2. Ensure location toggle does not overflow on small screens.
3. Standardize card height rhythm and CTA alignment.
4. Keep external link affordance visible and touch-friendly.

### 5. Generate Page

1. Make model selector stack vertically on small screens (avoid compressed cards).
2. Ensure action buttons (`Generate`, `Regenerate`) wrap gracefully.
3. Improve results header layout (badge/time placement) for mobile.
4. Ensure tweet cards maintain readable hierarchy and no clipped badges.
5. Make preview modal responsive: proper max-height, safe paddings, and footer button behavior.
6. Reposition toast stack for mobile safety.

## Design Tokens & UI Consistency (V1)

1. Introduce explicit typography tokens (`--font-heading`, `--font-body`, `--font-mono`).
2. Normalize type scale for `h1`, `h2`, body, caption, meta text.
3. Standardize spacing tokens for card padding and section gaps.
4. Keep existing color palette in V1 to reduce risk.

## Implementation Phases

### Phase 1: Foundation

1. Define typography tokens and responsive base rules.
2. Update global layout/container conventions.

### Phase 2: Screen Refactor

1. Refactor shared sidebar/main layout.
2. Refactor Profile + Post pages.
3. Refactor Trends + Generate pages.
4. Refactor shared feedback components (toast/modal behaviors).

### Phase 3: QA & Stabilization

1. Device-width QA pass (320, 375, 390, 768, 1024, 1280).
2. Regression check for all dashboard workflows.
3. Visual polish pass for spacing, hierarchy, and consistency.

## QA Checklist (Definition of Done)

1. No horizontal scroll on any dashboard page.
2. All primary actions are reachable and tappable with one hand on mobile.
3. Typography hierarchy is visually clear (heading/body/meta).
4. No clipped text, overflowing badges, or off-screen toasts/modals.
5. Sidebar drawer is stable and non-blocking in mobile navigation.
6. Existing workflows (profile update, post, trends load, generate, post-from-modal) still work unchanged.

## Risks & Mitigation

1. Risk: Typography change affects layout widths.
   Mitigation: apply font changes early (Phase 1), then page refactor.
2. Risk: Toast/modal z-index conflicts with drawer.
   Mitigation: define overlay layer order and verify all states.
3. Risk: Inconsistent spacing due to incremental edits.
   Mitigation: enforce shared spacing rules and checklist before merge.

## Deliverables

1. Updated responsive UI across all dashboard pages.
2. New typography system replacing current default feel.
3. Short QA evidence summary (device widths + key screenshots) in follow-up doc: `docs/revamp-ui-v1-report.md`.

## Suggested Execution Order

1. Shared layout + typography foundation
2. Profile page
3. Post page
4. Trends page
5. Generate page
6. Final QA + report

---

If approved, next step is implementation following this exact V1 plan with no feature logic changes.
