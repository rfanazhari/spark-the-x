# Phase 3 - QA and Stabilization

> Goal: Validate, polish, and document readiness after UI refactor.

## Objective

Perform final responsive QA and fix remaining UI regressions so Revamp UI V1 is stable for daily use.

## In Scope

1. Cross-viewport QA pass.
2. Workflow regression validation.
3. Visual polish fixes.
4. Final report documentation.

## QA Matrix

Validate each route at these widths:

1. 320px
2. 375px
3. 390px
4. 768px
5. 1024px
6. 1280px

Routes to validate:

1. `/dashboard/profile`
2. `/dashboard/post`
3. `/dashboard/trends`
4. `/dashboard/generate`

## Critical Test Scenarios

1. Open/close mobile drawer and navigate between all dashboard pages.
2. Trigger toasts on Profile, Post, and Generate flows.
3. Open generate preview modal and verify scroll, close, and action states.
4. Confirm no overlap between drawer, modal, and toast layers.
5. Confirm no horizontal overflow in any route.

## Functional Regression Checks

1. Profile fetch and update still work.
2. Tweet posting still works and history still updates.
3. Trends fetching and trend-to-generate navigation still work.
4. Generate flow still returns options and post-from-modal still works.

## Visual Polish Checklist

1. Typography hierarchy remains consistent across pages.
2. Spacing rhythm is consistent between sections/cards.
3. Button/input touch targets are comfortable on mobile.
4. Empty/loading/error states remain readable and aligned.

## Bug Severity Guide

1. P0: Flow blocked or unusable major UI break.
2. P1: High friction on common path (mobile interaction failure, clipped modal action).
3. P2: Minor visual issue with acceptable workaround.
4. P3: Cosmetic inconsistency.

## Exit Criteria (Phase 3)

1. All P0 and P1 issues resolved.
2. No horizontal overflow remains.
3. Core workflows pass functional checks.
4. UI consistency checklist passes.
5. Final report file created.

## Final Report Requirement

Create:

1. `/Users/rfanazhari/Projects/personal/automation/x/docs/revamp-ui-v1-report.md`

Include:

1. Summary of implemented UI updates.
2. Viewport QA results.
3. Remaining known issues (if any).
4. Suggested V2 improvements.

## Vibe Coding Prompt (Phase 3)

Use this prompt for implementation run:

"Execute Phase 3 from docs/revamp-ui-v1/phase-3-qa-stabilization.md. Perform responsive QA across defined viewport matrix, fix remaining UI issues only, and verify all core dashboard flows still work. Do not change business logic or API behavior. Produce docs/revamp-ui-v1-report.md with QA results, fixed items, and remaining risks."
