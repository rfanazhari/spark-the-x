# Revamp UI V1 - Phase Docs

> Date: March 14, 2026
> Purpose: Detailed implementation guides for phased vibe-coding execution.

## How To Use This Folder

1. Execute phases in order: Phase 1 -> Phase 2 -> Phase 3.
2. Treat each phase file as the source of truth during implementation.
3. Do not introduce business logic/API changes while implementing UI revamp.
4. Close each phase only after all acceptance criteria are met.

## Phase Files

1. [Phase 1 - Foundation](/Users/rfanazhari/Projects/personal/automation/x/docs/revamp-ui-v1/phase-1-foundation.md)
2. [Phase 2 - Screen Refactor](/Users/rfanazhari/Projects/personal/automation/x/docs/revamp-ui-v1/phase-2-screen-refactor.md)
3. [Phase 3 - QA and Stabilization](/Users/rfanazhari/Projects/personal/automation/x/docs/revamp-ui-v1/phase-3-qa-stabilization.md)

## Global Rules (All Phases)

1. UI-only changes.
2. Keep existing feature behavior unchanged.
3. Keep route structure unchanged.
4. Preserve existing dark-first style direction for V1.
5. Prioritize mobile-first responsive behavior.

## Done Criteria (Project Level)

1. No horizontal overflow across all dashboard pages.
2. Pages are usable from 320px width.
3. Typography feels intentional and readable.
4. Sidebar, modals, and toasts do not conflict on mobile.
5. Core user flows still work exactly as before.
