# Stage 1 — Layout Foundation Cleanup

## Goal

Establish the shared mobile infrastructure that every subsequent stage depends on. This stage does not touch page content — it only normalizes the global CSS tokens, dashboard shell scroll behavior, mobile header stickiness, and button touch targets. All later stages build on top of what is defined here.

## Components / Files Likely Affected

- `app/globals.css` — add safe-area utilities, mobile spacing tokens, shared section/card utility classes
- `app/dashboard/layout.tsx` — fix scroll container behavior on mobile browsers
- `components/sidebar.tsx` — make mobile header sticky, add safe-area top padding, refine drawer spacing
- `components/ui/button.tsx` — redefine size scale to meet 44px+ touch target baseline

## UI Problems Being Solved

1. The dashboard shell uses `overflow-y-auto` on the `main` element inside a flex container, which behaves erratically when the mobile address bar or software keyboard changes viewport height.
2. The mobile header rendered by `components/sidebar.tsx` is not sticky — it scrolls away, leaving the user without navigation context.
3. The mobile header has no `env(safe-area-inset-top)` padding, so content can collide with the device notch or status bar on notched phones.
4. Button sizes `h-6` through `h-9` (24px–36px) are below the 44px minimum touch target. The global `app/globals.css` only patches native `button` elements with `min-height: 44px`, leaving the shared `Button` component unsynchronized.
5. There are no reusable CSS utilities for mobile page padding, section gaps, card padding, or sticky footer offsets — each page reinvents the spacing independently.

## Proposed UI Changes

### `app/globals.css`
- Add CSS custom properties for the mobile spacing system:
  - `--page-px: 1rem` (16px page horizontal padding on mobile)
  - `--section-gap: 1rem` (16px between major sections)
  - `--card-px: 1rem` (16px card internal padding on mobile)
  - `--field-gap: 0.75rem` (12px between label, helper, and input within one field group)
  - `--field-row-gap: 1rem` (16px between adjacent fields)
- Add utility classes:
  - `.mobile-page-padding` → `padding-inline: var(--page-px)`
  - `.mobile-section-gap` → `margin-top: var(--section-gap)`
  - `.safe-top` → `padding-top: env(safe-area-inset-top, 0px)`
  - `.safe-bottom` → `padding-bottom: env(safe-area-inset-bottom, 0px)`
  - `.sticky-footer-offset` → `padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px))` (space below content when a sticky action area is present)
- Ensure `min-h-[100dvh]` (dynamic viewport height) is used where scroll containers are defined rather than `100vh`

### `app/dashboard/layout.tsx`
- Remove or relax the `overflow-y-auto` constraint on the `main` wrapper on mobile — let the browser handle natural document scroll instead of a scroll-trapped container
- Apply `min-h-[100dvh]` to the root shell instead of `min-h-screen` so the layout respects the shrinking address bar on mobile browsers
- Ensure the `main` area does not have a fixed height that clips content when the keyboard opens

### `components/sidebar.tsx` — mobile header
- Add `position: sticky; top: 0; z-index: 50` to the mobile header element so it stays visible during scroll
- Add `.safe-top` padding to the mobile header so its top edge clears the device notch/status bar
- Ensure the header height is explicit (e.g., `h-14`) and consistent so page content can calculate offsets correctly

### `components/sidebar.tsx` — mobile drawer
- Add `env(safe-area-inset-bottom)` padding to the bottom of the drawer nav list so the last nav item is never cut off on iPhones
- Increase nav link hit areas to at least 44px height (use `min-h-11 py-3` or equivalent)
- Ensure drawer backdrop click dismisses the drawer correctly

### `components/ui/button.tsx`
- Redefine the size variants to ensure mobile-default heights meet 44px:
  - `sm` → `h-9` (36px, acceptable for secondary/icon buttons at smaller use cases — document this)
  - `default` → `h-11` (44px, the new mobile-safe default)
  - `lg` → `h-12` (48px)
  - `icon` → `h-11 w-11` (44×44px)
- Do not change button variant colors, border-radius, or font styles — only height and corresponding vertical padding

## Layout / Responsive Rules

- Mobile header must be `position: sticky; top: env(safe-area-inset-top, 0)` so it accounts for notched devices
- Dashboard `main` must scroll naturally on the document root — avoid scroll-trapped flex children on mobile
- All spacing tokens are mobile-first; `sm:` and `md:` breakpoints may override them upward in later stages
- Button height changes affect all pages — validate visually on `post`, `trends`, and `generate` after this stage

## Implementation Tasks

- [ ] Add `--page-px`, `--section-gap`, `--card-px`, `--field-gap`, `--field-row-gap` CSS custom properties to `:root` in `app/globals.css`
- [ ] Add `.mobile-page-padding`, `.mobile-section-gap`, `.safe-top`, `.safe-bottom`, `.sticky-footer-offset` utility classes in `app/globals.css`
- [ ] Replace any `min-h-screen` with `min-h-[100dvh]` in `app/dashboard/layout.tsx`
- [ ] Remove or scope the `overflow-y-auto` on the dashboard `main` to non-mobile breakpoints
- [ ] Add `sticky top-0 z-50` and `.safe-top` to the mobile header in `components/sidebar.tsx`
- [ ] Add `env(safe-area-inset-bottom)` padding to the drawer nav list bottom in `components/sidebar.tsx`
- [ ] Increase drawer nav link minimum height to `min-h-11` in `components/sidebar.tsx`
- [ ] Redefine button size tokens in `components/ui/button.tsx` — `default` → `h-11`, `lg` → `h-12`, `icon` → `h-11 w-11`
- [ ] Keep `sm` at `h-9` but add a code comment noting it is below 44px and should only be used in non-primary contexts
- [ ] Audit all pages for horizontal overflow after spacing token addition (look for elements with fixed widths that exceed mobile viewport)

## Acceptance Criteria

- The mobile header is visible and sticky at the top of the screen throughout all scroll positions
- The mobile header does not overlap device notch or status bar on iPhone 12/13/14/15 (notched devices)
- The drawer bottom nav list is fully visible on iPhone SE (375px) without overflow
- All drawer nav links have a visible tap area of at least 44px height
- Default and large `Button` components render at 44px+ height on mobile
- The dashboard shell does not produce a double scroll situation (one inside the shell, one on the document)
- No horizontal overflow appears on any dashboard page at 375px width
- `min-h-[100dvh]` is used on the root shell container

## Edge Cases

- iPhone SE (375px width, 667px viewport height): compact screen where the sticky header consumes meaningful vertical space — verify content below header is still reachable
- Notched devices (iPhone 12–15): `safe-area-inset-top` varies from 44px to 59px — verify the header does not appear doubled or shifted
- Landscape mode on iPhone: header height should not consume more than 20% of the available viewport height
- Android Chrome: address bar shrink/expand behavior with `100dvh` — verify layout does not jump when address bar collapses
- Browsers that do not support `env()` (older WebKit): safe-area values should fall back to `0px` gracefully

## QA Checklist

- [ ] 375px (iPhone SE): mobile header sticky, drawer bottom nav visible, button heights correct
- [ ] 390px (iPhone 14): safe-area top padding clears notch, no content clipping
- [ ] 430px (iPhone 14 Pro Max): header/drawer/buttons all proportionate
- [ ] 360px (common Android): no horizontal overflow, header sticky
- [ ] Landscape 375×667: header height acceptable, drawer usable
- [ ] Drawer open → scroll list → close: no scroll bleed to document
- [ ] Tap nav links in drawer: all register on first tap without needing to tap a precise inner text area
- [ ] All `Button` variants in all pages: no visible layout regression from height changes

## Risks

- Changing `overflow-y-auto` on the dashboard shell may reveal previously hidden overflow in page content — audit carefully
- Increasing button heights changes the visual density of button-heavy pages (`generate`, `post`); review after changes
- `env(safe-area-inset-top)` with sticky positioning: some older iOS WebKit versions handle stacked `position: sticky` + `env()` inconsistently — test on real device or BrowserStack

## Notes for Coding Agent

- Do not modify any API routes, data fetching logic, or business logic in this stage
- Do not change button colors, border-radius, font sizes, or variants — only height and corresponding `py-*` padding values
- Add CSS custom properties to `:root` — do not create a separate CSS module
- Prefer Tailwind utility classes for layout changes; use raw CSS only for `env(safe-area-inset-*)` values which Tailwind does not support natively
- When updating `components/sidebar.tsx`, preserve all existing state management (drawer open/close, active link detection) without modification
- Changes to `components/ui/button.tsx` are global — scan all dashboard pages visually after applying to catch unexpected density shifts
- This stage lays the groundwork; resist the urge to also fix page-level layout issues — those belong in later stages
