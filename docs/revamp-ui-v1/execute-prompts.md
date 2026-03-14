# Execute Prompts (Per Phase)

> Use these prompts to run each implementation phase.
> Core rule: UI-only changes, with no business logic, API, or route changes.

## Phase 1 Prompt

```text
Execute Phase 1 based on docs/revamp-ui-v1/phase-1-foundation.md.
Scope is limited to UI foundation work: typography tokens, responsive base rules, dashboard shell behavior, and sidebar baseline improvements.
Do not modify business logic, API request/response behavior, or route structure.
Maintain a mobile-first approach starting from 320px and keep the existing dark-first visual direction.
Update CHANGELOG.md to record all Phase 1 documentation and implementation updates.

Required output:
1) list of changed files,
2) implementation summary mapped to each Phase 1 task,
3) validation evidence for every Phase 1 acceptance criterion.
```

## Phase 2 Prompt

```text
Execute Phase 2 based on docs/revamp-ui-v1/phase-2-screen-refactor.md.
Refactor all dashboard screens for responsive and mobile-friendly behavior, aligned with the Phase 1 foundation.
Focus only on layout, spacing, typography hierarchy, touch targets, and modal/toast responsiveness.
Do not modify business logic, API behavior, payload shapes, or route paths.
Update CHANGELOG.md to record all Phase 2 implementation updates.

Required output:
1) list of changed files grouped by workstream,
2) key UI changes per page (Profile, Post, Trends, Generate),
3) proof that all Phase 2 acceptance criteria are met.
```

## Phase 3 Prompt

```text
Execute Phase 3 based on docs/revamp-ui-v1/phase-3-qa-stabilization.md.
Run responsive QA using the defined viewport matrix, fix any remaining UI issues, and validate all core regression flows.
Do not modify business logic, API behavior, or route structure.
Create the final report at docs/revamp-ui-v1-report.md including:
1) viewport QA summary,
2) list of fixed issues,
3) remaining known issues (if any),
4) recommended V2 improvements.
Update CHANGELOG.md to record all Phase 3 QA, fixes, and report updates.
```
