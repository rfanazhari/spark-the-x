# Phase 2 - Screen Refactor

> Goal: Refactor each dashboard screen to fully align with responsive and typography foundation.

## Objective

Apply Phase 1 foundation to every dashboard page so mobile and desktop UX are consistent, readable, and touch-friendly.

## In Scope

1. Shared page container rhythm.
2. Profile page responsive cleanup.
3. Post page responsive cleanup.
4. Trends page responsive cleanup.
5. Generate page responsive cleanup (including modal and toast behavior).

## Primary Files To Touch

1. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/profile/page.tsx`
2. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/post/page.tsx`
3. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/trends/page.tsx`
4. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/generate/page.tsx`
5. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/generate/_components/GenerateContent.tsx`
6. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/generate/_components/InputSection.tsx`
7. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/generate/_components/ResultsSection.tsx`
8. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/generate/_components/TweetCard.tsx`
9. `/Users/rfanazhari/Projects/personal/automation/x/app/dashboard/generate/_components/PreviewModal.tsx`

## Workstream A - Shared Page Rhythm

1. Standardize outer page padding (`mobile -> tablet -> desktop`).
2. Normalize section gaps and card spacing.
3. Ensure headings and subheadings follow the new type hierarchy.
4. Ensure toast placements do not clip on small viewports.

## Workstream B - Profile Page

### Tasks

1. Make header section stack naturally on small widths.
2. Ensure profile identity block does not squeeze avatar/text.
3. Wrap metrics row without visual breakage.
4. Improve form spacing and counter readability on mobile.
5. Ensure submit CTA remains accessible and not compressed.

### Acceptance

1. No cramped text/input labels at 320px.
2. Metrics are readable and wrapped cleanly.
3. Toast remains fully visible on mobile.

## Workstream C - Post Page

### Tasks

1. Make composer card layout mobile-first and uncluttered.
2. Allow char-counter and action button row to wrap gracefully.
3. Ensure post history cards remain readable with long text.
4. Improve spacing for vertical thumb scrolling.

### Acceptance

1. Composer and CTA are easy to use one-handed.
2. No overlap between counter and button.
3. History cards do not overflow horizontally.

## Workstream D - Trends Page

### Tasks

1. Keep 1-column cards on mobile with clear vertical rhythm.
2. Make location toggle responsive and non-overflowing.
3. Ensure card metadata and CTA align consistently.
4. Keep action controls touch-friendly.

### Acceptance

1. Toggle fits at 320px without clipping.
2. Grid transitions cleanly at `sm` and `lg`.
3. Trend cards preserve hierarchy and readability.

## Workstream E - Generate Page

### Tasks

1. Make model selection cards stack on narrow screens.
2. Ensure generate/regenerate buttons wrap predictably.
3. Improve results header responsiveness (title, badge, time).
4. Ensure tweet card badges and buttons do not collide.
5. Make preview modal fully mobile-safe (height, footer actions, close behavior).
6. Make toast stack responsive and non-obstructive.

### Acceptance

1. All generate interactions are usable at 320px.
2. Modal is scroll-safe and action buttons remain reachable.
3. No badge/button clipping in tweet cards.

## Regression Guardrails

1. No change to existing API requests and payload shapes.
2. No change to posting/generation logic.
3. No change to route paths and navigation behavior.

## QA Checklist (Phase 2)

1. Run manual UI pass at 320/375/390/768/1024/1280.
2. Test profile update flow visually and functionally.
3. Test posting flow and history rendering.
4. Test trend selection -> navigate -> generate flow.
5. Test generate -> preview -> post flow with modal and toasts.

## Suggested Commit Scope

1. Shared page rhythm and typography alignment.
2. Profile and Post responsive updates.
3. Trends and Generate responsive updates.
4. Modal/toast mobile behavior updates.

## Vibe Coding Prompt (Phase 2)

Use this prompt for implementation run:

"Implement Phase 2 from docs/revamp-ui-v1/phase-2-screen-refactor.md. Refactor dashboard screens for responsive and mobile-first behavior using the Phase 1 foundation. Keep all business logic, API behavior, and routes unchanged. Focus only on layout, spacing, typography hierarchy, and interaction safety on small screens. Return changed files and proof against each workstream acceptance criterion."
