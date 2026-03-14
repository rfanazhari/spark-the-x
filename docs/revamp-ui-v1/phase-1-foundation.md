# Phase 1 - Foundation

> Goal: Establish typography system and responsive base layer before page-level refactor.

## Objective

Create a stable UI foundation that all pages can inherit, so later screen refactors are consistent and low-risk.

## In Scope

1. Global typography setup and tokens.
2. Responsive spacing/container conventions.
3. Baseline mobile-safe layout behavior.
4. Shared layer ordering for sidebar, modal, and toast.

## Primary Files To Touch

1. `/Users/rfanazhari/Projects/personal/automation/x/app/layout.tsx`
2. `/Users/rfanazhari/Projects/personal/automation/x/app/globals.css`
3. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/layout.tsx`
4. `/Users/rfanazhari/Projects/personal/automation/x/components/sidebar.tsx`

## Implementation Tasks

### 1. Typography System

1. Replace current default font pairing with selected V1 pairing.
2. Add explicit variables for heading, body, and mono.
3. Map tokens in global theme so utility classes can consume them consistently.
4. Define base type styles for `h1`, `h2`, body, labels, and meta text.

### 2. Global Responsive Rules

1. Ensure root layout prevents accidental horizontal overflow.
2. Standardize base container paddings for mobile/tablet/desktop.
3. Set readable default line-height and letter spacing behavior.
4. Ensure controls and buttons meet minimum touch size on mobile.

### 3. Dashboard Shell Rules

1. Normalize main content width and scroll behavior.
2. Confirm sidebar + content relationship works across breakpoints.
3. Ensure mobile drawer does not cause background scroll conflicts.
4. Define z-index layering standard for drawer, overlay, modal, and toast.

### 4. Sidebar Baseline Improvements

1. Improve mobile header/drawer spacing consistency.
2. Ensure tap targets are comfortable in mobile nav.
3. Validate active state readability with new typography.
4. Confirm drawer open/close interaction feels stable.

## Acceptance Criteria

1. Typography tokens are present and used globally.
2. Base type hierarchy is visually clear on 320px and desktop.
3. No horizontal overflow in dashboard shell.
4. Sidebar works correctly on `md` split behavior and below.
5. No overlapping layering issues among drawer, modals, and toasts.

## QA Checklist (Phase 1)

1. Check 320px, 375px, 390px, 768px, 1024px.
2. Navigate all dashboard routes with mobile drawer open/close.
3. Confirm body scroll lock behavior when overlays appear.
4. Verify typography readability in both dense and sparse screens.

## Out of Scope

1. Page-specific card/form refactors.
2. Content or business logic changes.

## Suggested Commit Scope

1. `layout`: font imports + root class wiring.
2. `globals`: typography/responsive tokens and base styles.
3. `dashboard shell`: container and overflow rules.
4. `sidebar`: mobile spacing and interaction polish.

## Vibe Coding Prompt (Phase 1)

Use this prompt for implementation run:

"Implement Phase 1 from docs/revamp-ui-v1/phase-1-foundation.md. Scope is UI foundation only: typography tokens, responsive base rules, dashboard shell behavior, and sidebar baseline improvements. Do not modify business logic, API calls, or route structure. Ensure mobile-first behavior from 320px and keep dark-first visual direction. Return a concise summary of changed files and how each acceptance criterion was satisfied."
