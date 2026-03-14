# Mobile UI Revamp Plan

## Project Context

This project uses the Next.js App Router and already has a working dashboard UI for profile management, posting, trends, and AI content generation. The mobile revamp should be incremental: keep the current business logic, data fetching, API contracts, and route structure intact while improving how the existing dashboard behaves on small screens.

The primary mobile reference flow is the profile/edit-profile experience in `app/dashboard/profile/page.tsx`, supported by the shared dashboard shell in `app/dashboard/layout.tsx`, the navigation system in `components/sidebar.tsx`, the shared button primitive in `components/ui/button.tsx`, and layout utilities in `app/globals.css`.

There is no `pages/`, `features/`, or `layouts/` directory in the current repository. The UI is concentrated in `app/` and `components/`.

## Current Mobile UX Problems

1. The dashboard shell is still desktop-led.
- `app/dashboard/layout.tsx` keeps `main` scrollable inside a flex shell with `overflow-y-auto`, which can feel awkward on mobile browsers when the address bar and on-screen keyboard change viewport height.
- `components/sidebar.tsx` swaps the desktop sidebar for a mobile header and drawer, but the mobile header is not sticky, has no safe-area padding, and creates a separate shell header above each page header.

2. The profile page is stacked, but not truly mobile-first.
- `app/dashboard/profile/page.tsx` places the preview card and form in a simple vertical flow, but the sections still feel like desktop blocks placed inside a narrow column rather than a purpose-built mobile sequence.
- The form is not wrapped in its own card/container, so the visual rhythm between preview, metadata, and editable controls is weak.
- The primary CTA sits at the bottom of the form only; on long forms this can force extra scrolling and becomes less accessible when the keyboard is open.

3. Touch targets are inconsistent.
- `components/ui/button.tsx` defines button sizes as `h-6`, `h-7`, `h-8`, and `h-9`, which are below the 44px mobile target baseline for many buttons.
- The codebase adds a global 44px minimum only to native `button` and submit inputs in `app/globals.css`, but the shared button component should still be normalized so mobile sizing is explicit and dependable.

4. Spacing rhythm is tuned more for tablet/desktop than phones.
- Most cards use `p-5` / `p-6`, which is fine in isolation but becomes dense when multiple bordered panels stack on a narrow viewport.
- Section headers, helper text, counters, and field groups do not yet follow a reusable mobile spacing scale.

5. Text and metadata handling can break down under real content.
- Long names and usernames in `ProfileDisplay` do not explicitly truncate.
- Long URLs use `break-all`, which prevents overflow but can create visually noisy line breaks.
- Stats are presented inline with wrapping, so metric groupings may split unpredictably on narrow screens.
- Empty profile fields simply disappear, which can make the card feel structurally inconsistent.

6. Form ergonomics are only partially mobile-safe.
- Inputs do not use an explicit mobile field sizing standard.
- The bio field is only `rows={3}`, which is tight on smaller devices.
- Labels are present, but most are not explicitly connected with `htmlFor` / `id` pairs.
- There is no sticky action bar, draft state indication, or “unsaved changes” treatment.

7. Feedback UI can collide with mobile chrome.
- Toasts on profile/post pages are fixed to `top-4 left-4 right-4`; they can compete with the mobile header and device safe areas.
- The generate flow uses bottom toasts, while profile/post use top toasts, so mobile feedback patterns are inconsistent.

8. Modal behavior needs better mobile handling.
- `app/dashboard/generate/_components/PreviewModal.tsx` centers a modal at `max-h-[90vh]`, which is reasonable for desktop but can become cramped with the mobile keyboard open.
- The project has no shared safe-area or viewport utility for drawers, sticky CTAs, or modals.

## Files and Components Involved

| File | Responsibility | Mobile relevance |
|---|---|---|
| `app/dashboard/profile/page.tsx` | Profile preview, edit form, save flow, toast state | Primary revamp target |
| `app/dashboard/layout.tsx` | Shared dashboard shell | Affects scrolling, viewport behavior, mobile shell layout |
| `components/sidebar.tsx` | Desktop sidebar, mobile header, mobile drawer | Affects top navigation, touch targets, drawer behavior |
| `components/ui/button.tsx` | Shared button sizing and variants | Needs mobile touch-target normalization |
| `app/globals.css` | Theme tokens, typography, container spacing, utilities | Best place for mobile spacing and safe-area utilities |
| `app/layout.tsx` | Root app layout and metadata | May need viewport/mobile metadata follow-up during implementation |
| `app/dashboard/post/page.tsx` | Mobile composer pattern and top toast | Good secondary validation target for shared form/CTA rules |
| `app/dashboard/trends/page.tsx` | Card list and segmented control pattern | Good secondary validation target for card stacking |
| `app/dashboard/generate/_components/InputSection.tsx` | Form controls, pill buttons, CTA grouping | Useful for standardizing stacked mobile fields |
| `app/dashboard/generate/_components/TweetCard.tsx` | Reusable card pattern with badges and CTA | Useful for mobile card spacing and badge wrapping |
| `app/dashboard/generate/_components/PreviewModal.tsx` | Modal editing and confirmation flow | Useful for keyboard-safe mobile modal rules |

## Mobile-First Design Strategy

1. Treat mobile as the default layout.
- Start from a single-column flow optimized for 320px-430px widths.
- Add larger-screen enhancements with `sm`/`md` only after the mobile layout is stable.
- Avoid “desktop card shrunk down” patterns.

2. Establish one primary mobile reading order.
- Mobile header
- Page title/subtitle
- Profile preview card
- Stats section
- Metadata section
- Edit profile form
- Sticky action area

3. Reduce visual ambiguity by separating read-only and editable content.
- Keep the profile preview as a self-contained card.
- Break stats and metadata into distinct mobile sections instead of letting them wrap inline inside one mixed block.
- Wrap the edit form in its own card/surface so users can clearly distinguish “current state” from “editable state.”

4. Standardize a compact mobile spacing system.
- Page horizontal padding: 16px on mobile.
- Vertical section gaps: 16px between major sections.
- Card padding: 16px on mobile, 20px+ on larger breakpoints.
- Field spacing: 12px between label/help/input within one field, 16px between fields.
- Sticky footer safe padding: include bottom inset support.

5. Make actions persistent and thumb-friendly.
- Use a sticky bottom action area on mobile for the main save action.
- Keep the primary CTA full width on phones.
- Support a secondary state such as “Saved”, “Saving…”, or “Unsaved changes” without shifting layout.

6. Normalize small-screen text behavior.
- Use truncation for single-line identifiers like display name/username where appropriate.
- Use balanced wrapping for bios and metadata.
- Prefer `break-words` or truncated display labels with full-value access, rather than aggressive `break-all`, for URLs.

7. Add safe viewport rules.
- Respect top and bottom safe areas for header, drawers, toasts, and sticky actions.
- Prefer `min-h-[100dvh]` style behavior during implementation for mobile browser chrome changes.
- Avoid centered modal layouts that become inaccessible when the keyboard opens; use sheet-like behavior on small screens.

## Proposed Component Changes

| Component/Page | Responsibility | Current issue | Suggested improvement |
|---|---|---|---|
| `app/dashboard/profile/page.tsx` | Whole profile/edit experience | Flow is functional but visually desktop-oriented; save CTA only appears at the form bottom | Recompose into mobile-first sections with preview card, stats block, metadata block, form card, sticky action footer |
| `ProfileDisplay` inside `app/dashboard/profile/page.tsx` | Shows avatar, identity, bio, metadata, metrics | Long text can crowd the layout; stats and metadata wrap loosely | Split into clearer sub-sections, add truncation/wrapping rules, convert metrics to small grid or 3-up stat tiles |
| Form fields inside `app/dashboard/profile/page.tsx` | Edit profile details | Labels are not fully associated; field rhythm is inconsistent; bio height is tight | Add explicit `id/htmlFor`, helper/counter alignment, larger textarea, clear error/help states, mobile-first field spacing |
| Save button inside `app/dashboard/profile/page.tsx` | Primary submit action | Can scroll off-screen during long-form editing and keyboard usage | Move primary save action into a sticky mobile action area with safe-area padding |
| Toast UI in `app/dashboard/profile/page.tsx` and `app/dashboard/post/page.tsx` | Feedback after save/post | Top-fixed toast can collide with header; patterns differ by page | Standardize a mobile toast placement strategy, likely below header or at bottom with inset-aware spacing |
| `components/sidebar.tsx` mobile header | Global dashboard navigation on phones | Not sticky, lacks safe-area top handling, drawer feels shell-level not mobile-native | Make header sticky, add inset padding, consider page title slot support, refine drawer spacing and hit targets |
| `components/sidebar.tsx` drawer nav | Navigation list | Functional, but fixed-width drawer and dense vertical rhythm may feel tight on smaller devices | Add better spacing, clearer section affordances, safe-area bottom padding, and more robust active-state clarity |
| `components/ui/button.tsx` | Shared CTA sizing | Size tokens are below recommended mobile tap size | Redefine size scale so mobile-default buttons meet 44px+ touch targets |
| `app/globals.css` | Global layout utilities | No safe-area helpers, no mobile spacing tokens, generic container only | Introduce mobile spacing tokens/utilities, safe-area helpers, and shared section/card utilities |
| `app/dashboard/generate/_components/PreviewModal.tsx` | Mobile modal interaction | Centered dialog is less keyboard-friendly on phones | Use a bottom-sheet behavior on mobile and preserve dialog behavior on larger screens |
| `app/dashboard/trends/page.tsx` | Card-list mobile pattern | Good baseline, but card spacing and segmented control should align with new mobile rules | Use as a secondary screen for applying shared mobile section spacing and button sizing |
| `app/dashboard/post/page.tsx` | Single-form mobile page | Similar CTA and toast issues as profile | Use as a follow-up validation target after profile conventions are defined |

## Revamp Phases

### Phase 1. Layout foundation cleanup
- Audit and normalize mobile spacing tokens in `app/globals.css`.
- Add utilities for safe-area top/bottom padding and sticky action offsets.
- Revisit `app/dashboard/layout.tsx` and `components/sidebar.tsx` so the shell behaves predictably on mobile.
- Define reusable mobile section/card/container patterns before changing page internals.

### Phase 2. Profile preview card refactor
- Refactor the profile preview into a stronger mobile card hierarchy.
- Separate identity, bio, stats, and metadata for more reliable stacking.
- Improve long-text handling for name, bio, location, and URL.
- Make empty-state rendering intentional so the card never feels visually broken.

### Phase 3. Form UX improvements
- Wrap the edit form in a dedicated card.
- Standardize field spacing, field height, and helper text behavior.
- Improve bio editing height and char-count placement.
- Introduce explicit mobile-friendly validation and status messaging.

### Phase 4. Mobile action area
- Add a sticky bottom save area for mobile.
- Include disabled, loading, and success-ready states without layout jump.
- Ensure keyboard opening does not hide the CTA or final fields.

### Phase 5. Feedback and overlay polish
- Unify toast placement across pages.
- Improve mobile drawer behavior and any modal/sheet interactions.
- Align overlay layering and dismissal rules with safe-area handling.

### Phase 6. Responsive QA and spillover updates
- Validate shared button sizing and card spacing on `post`, `trends`, and `generate` pages.
- Apply the new mobile rules only where needed, without rewriting business logic.
- Fix regressions in text wrapping, card heights, and action placement.

## Responsive Rules

1. Layout rules
- Mobile default: single column.
- Keep page content within a readable max width, but do not rely on desktop-style large gutters.
- Use `min-w-0` on text containers that share rows with icons or media.

2. Stacking strategy
- Read-only preview content should stack before editable fields.
- Stats should use a stable grid or evenly distributed row instead of unstructured wrapping.
- Metadata items should stack vertically on very narrow screens and only become inline groups when space permits.

3. Spacing system
- 16px page padding on mobile.
- 16px vertical gap between major sections.
- 12px gap between label, helper text, and field content.
- 16px card padding for mobile surfaces.

4. Card usage
- Use cards for clearly distinct content types: preview, stats, metadata, edit form.
- Avoid one oversized card doing every job.
- Keep borders/radii consistent across all stacked mobile surfaces.

5. Form layout rules
- One field per row on mobile.
- Counters and helper text should align cleanly without wrapping awkwardly into the input below.
- Textareas should be tall enough for editing without immediate scrolling.
- Primary CTA should be full width on phones.

6. Text truncation rules
- Name and username: allow truncation or balanced wrapping, depending on final visual direction.
- Bio: wrap naturally, preserve readability, cap preview lines only if needed.
- URL display: shorten the visible label while preserving the full href.
- Stat labels: never let values and labels split in confusing ways.

7. CTA placement
- Mobile primary action belongs in a sticky footer or persistent action rail.
- Secondary actions should remain visible but lower emphasis.
- Avoid placing the only primary action after a long scroll when the keyboard is open.

8. Safe mobile viewport behavior
- Header, drawer, toast, and sticky footer must account for `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Prefer dynamic viewport height handling for scroll containers.
- Modal interactions on mobile should favor bottom-sheet ergonomics over centered desktop dialogs.

## Edge Cases

1. Long names
- Handle names that wrap to 2+ lines without pushing avatar/stats into unstable positions.

2. Long bios
- Ensure the preview card can contain multi-line bios gracefully.
- Ensure the edit textarea remains comfortable to edit when near the 160-character limit.

3. Long URLs
- Display a shortened visual label while preserving tap/copy behavior.
- Prevent long URLs from creating excessively jagged line breaks.

4. Empty fields
- Show clean placeholders or omit sections intentionally so blank location/URL/bio states still look designed.

5. Mobile keyboard open
- Keep the active field visible.
- Keep the save CTA reachable or clearly recoverable.
- Prevent centered overlays from being cut off by the keyboard.

6. Narrow screens
- Validate 320px width specifically.
- Ensure counters, badges, icons, and labels do not collide.

7. Landscape mode
- Ensure sticky headers/footers do not consume too much height.
- Verify drawers and overlays still fit within reduced vertical space.

8. Large text / accessibility settings
- Validate increased browser text size and iOS text zoom behavior.
- Ensure labels, counters, and buttons still wrap cleanly.

## QA Checklist

- Verify the profile page feels intentionally designed at 320px, 360px, 390px, and 430px widths.
- Verify the mobile header remains usable while scrolling.
- Verify drawer open/close behavior, backdrop dismissal, and body scroll locking.
- Verify all interactive targets meet mobile touch-size expectations.
- Verify the profile preview card does not overflow with long names, bios, locations, or URLs.
- Verify empty profile fields still produce a balanced card layout.
- Verify the edit form remains readable and operable with the software keyboard open.
- Verify the sticky save action does not cover inputs or helper text.
- Verify success/error toasts do not collide with header, notch, or sticky footer.
- Verify no horizontal scrolling appears anywhere in the profile flow.
- Verify landscape mode remains usable on iPhone-sized widths.
- Verify shared button size changes do not break `trends`, `post`, or `generate` layouts.
- Verify the generate preview overlay behaves appropriately on mobile after shared overlay changes.
- Verify dark theme contrast remains acceptable after spacing/card updates.

## Suggested Implementation Order

1. Update shared mobile foundations in `app/globals.css`, `components/ui/button.tsx`, `app/dashboard/layout.tsx`, and `components/sidebar.tsx`.
2. Refactor the profile page structure in `app/dashboard/profile/page.tsx` without changing fetch/update logic.
3. Introduce the sticky mobile action area and normalize toast placement.
4. Tighten text overflow and empty-state handling in the profile preview sections.
5. Re-test and lightly align `app/dashboard/post/page.tsx`, `app/dashboard/trends/page.tsx`, and `app/dashboard/generate/_components/PreviewModal.tsx` with the new mobile rules.
6. Run responsive QA across narrow widths, keyboard scenarios, and landscape mode before any larger visual pass.
