# Changelog

All notable changes to this project are documented in this file.

## 2026-03-14

### UI
- Implemented Phase 1 foundation updates: typography tokens, responsive base rules, dashboard shell overflow rules, and sidebar mobile polish.
- Added typography hierarchy for headings, labels, and meta text with mobile-first sizing.
- Established shared z-index tokens for drawer, overlay, modal, and toast layers.
- Introduced standard container padding utility for consistent responsive spacing.
- Implemented Phase 2 screen refactor: responsive layout/spacing updates across Profile, Post, Trends, and Generate dashboards, including modal/toast mobile safety.
- Completed Phase 3 QA stabilization pass across the dashboard routes with viewport matrix coverage and final report documentation.

### Fixed
- Improved `/api/ai/generate` resiliency when `model: "claude"` fails due Anthropic billing/rate-limit errors.
- Added automatic fallback path from Claude to OpenAI when fallback conditions are met and `OPENAI_API_KEY` is available.
- Improved generation response payload to include:
  - `requestedModel`
  - `fallbackReason`
  - actual `model` used
- Prevented potential horizontal overflow from long URLs, trend names, and generated tweet content on small screens.
- Aligned modal and toast z-index layers with shared z-index tokens for consistent overlay ordering.

### Added
- New AI health probe endpoint:
  - `GET /api/health/ai`
  - Supports provider connectivity checks, optional model-level probe, and no-store responses.
  - Query params:
    - `probe=false` to skip provider checks
    - `modelProbe=false` to skip model generation probe
    - `anthropicModel=<model_id>` to probe a specific Anthropic model

- New Anthropic model listing endpoint:
  - `GET /api/health/ai/models`
  - Returns available Anthropic model IDs and related metadata.

- New AI trace endpoint:
  - `GET /api/health/ai/trace`
  - Supports filters:
    - `requestId`
    - `provider` (`anthropic`, `openai`, `system`)
    - `limit`

- New in-memory AI trace store:
  - `lib/ai-trace.ts`
  - Captures trace events from generation and health/model checks.
  - Includes helper for extracting Anthropic request IDs from error messages.

- UI revamp planning documentation:
  - `docs/revamp-ui-v1.md`
  - `docs/revamp-ui-v1/README.md`
  - `docs/revamp-ui-v1/phase-1-foundation.md`
  - `docs/revamp-ui-v1/phase-2-screen-refactor.md`
  - `docs/revamp-ui-v1/phase-3-qa-stabilization.md`
  - `docs/revamp-ui-v1/execute-prompts.md`
  - Includes 1 execution prompt template per phase for vibe coding.

### Security / Safety
- Added error message sanitization in health checks to avoid leaking raw API keys in returned error text.
- Health and trace responses are returned with `Cache-Control: no-store`.

### Updated Files
- `app/api/ai/generate/route.ts`
- `app/api/health/ai/route.ts`
- `app/api/health/ai/models/route.ts`
- `app/api/health/ai/trace/route.ts`
- `lib/ai-trace.ts`
- `app/layout.tsx`
- `app/globals.css`
- `app/dashboard/layout.tsx`
- `components/sidebar.tsx`
- `CHANGELOG.md`
- `docs/revamp-ui-v1.md`
- `docs/revamp-ui-v1/README.md`
- `docs/revamp-ui-v1/phase-1-foundation.md`
- `docs/revamp-ui-v1/phase-2-screen-refactor.md`
- `docs/revamp-ui-v1/phase-3-qa-stabilization.md`
- `docs/revamp-ui-v1/execute-prompts.md`
- `docs/revamp-ui-v1-report.md`
- `app/dashboard/profile/page.tsx`
- `app/dashboard/post/page.tsx`
- `app/dashboard/trends/page.tsx`
- `app/dashboard/generate/page.tsx`
- `app/dashboard/generate/_components/GenerateContent.tsx`
- `app/dashboard/generate/_components/InputSection.tsx`
- `app/dashboard/generate/_components/ResultsSection.tsx`
- `app/dashboard/generate/_components/TweetCard.tsx`
- `app/dashboard/generate/_components/PreviewModal.tsx`

### Notes
- AI trace storage is process-local and in-memory; it resets on server restart/redeploy.
