# Stage 6 — Responsive QA and Spillover Updates

## Goal

Validate all previous stage changes across the full dashboard — `profile`, `post`, `trends`, and `generate` — at the key mobile breakpoints. Apply targeted, minimal corrections to `post`, `trends`, and `generate` pages where the new mobile rules from Stages 1–5 expose residual inconsistencies (card spacing, button sizing, text overflow). Fix regressions without rewriting business logic. Ship nothing that hasn't been tested at 320px, 375px, 390px, and 430px.

## Components / Files Likely Affected

- `app/dashboard/post/page.tsx` — validate sticky CTA, toast, form spacing applied in Stage 4 & 5
- `app/dashboard/trends/page.tsx` — apply card spacing and button sizing from Stages 1 & 2
- `app/dashboard/generate/_components/InputSection.tsx` — validate field spacing and button sizing from Stage 1 & 3
- `app/dashboard/generate/_components/TweetCard.tsx` — validate badge wrapping and card spacing
- `app/dashboard/generate/_components/PreviewModal.tsx` — validate bottom sheet behavior from Stage 5
- `app/dashboard/profile/page.tsx` — regression check on all changes from Stages 1–5
- `components/ui/button.tsx` — confirm no regression from Stage 1 size changes
- `app/globals.css` — confirm all tokens, utilities, and layering rules are clean and used

## UI Problems Being Solved

This stage is a verification and correction stage, not a new-feature stage. The problems being addressed are:

1. Secondary pages (`post`, `trends`, `generate`) have not been refactored in previous stages. After the global changes in Stage 1 (button sizing, spacing tokens, header), these pages may have visual regressions or inconsistencies that need targeted fixes.
2. The `trends` page card list and segmented control have not been aligned with the new mobile spacing system — cards may still use desktop-centric `p-5`/`p-6` padding and the segmented control buttons may now be oversized due to the `h-11` default.
3. The `generate` page `InputSection.tsx` has stacked form controls and pill buttons that need validation against the new field spacing rules.
4. The `generate` page `TweetCard.tsx` has badge elements that can wrap in unexpected patterns on narrow screens.
5. Any horizontal overflow, text collision, or z-index conflict introduced by the previous stages needs to be identified and corrected here.

## Proposed UI Changes

These are corrective, minimal changes — not redesigns.

### `app/dashboard/post/page.tsx`
- Confirm sticky footer from Stage 4 is working correctly
- Confirm toast positioning from Stage 5 is working correctly
- Fix any field spacing inconsistency compared to the profile form (should match the `gap-4` between fields, `gap-1.5` within field groups)
- Confirm the post textarea has sufficient visible height on mobile (at least 4 rows)
- Confirm character counter is right-aligned and does not overflow

### `app/dashboard/trends/page.tsx`
- Apply `--card-px` (16px) card padding to each trend card (replace any `p-5`/`p-6` on mobile)
- Confirm the segmented control (if present) renders correctly at `h-11` button height — if `h-11` makes the segmented control feel oversized, scope the override with a `size="sm"` prop or a local `h-9` override specific to this control
- Ensure trend cards do not overflow horizontally at 320px
- Ensure hashtag/keyword text in trend cards truncates or wraps cleanly

### `app/dashboard/generate/_components/InputSection.tsx`
- Confirm all form fields use `h-11` inputs (from Stage 1 button normalization + Stage 3 form patterns)
- Confirm pill-style buttons inside this section do not become oversized at `h-11` — if pill buttons are decorative selectors (tone, style, etc.), they may use `h-9` with a code comment
- Confirm field spacing uses `gap-4` between fields
- Confirm the primary generate CTA button is `h-11` and full-width on mobile

### `app/dashboard/generate/_components/TweetCard.tsx`
- Confirm badges wrap cleanly using `flex flex-wrap gap-1.5` — no badge overflow at 320px
- Confirm the card padding on mobile is 16px (using `--card-px`)
- Confirm CTA buttons at the card bottom (e.g., "Use This", "Edit") are `h-11` on mobile
- Confirm tweet text inside the card uses `break-words` and does not overflow

### `app/dashboard/profile/page.tsx` — Regression Check
- Verify all Stage 1–5 changes are present and correct
- Verify no accidental removal of data fetching, save handlers, or error state handling
- Verify the sticky footer does not interfere with the form, and the page bottom padding offsets correctly

### `app/globals.css` — Cleanup Audit
- Confirm all tokens introduced in Stage 1 are used (no orphaned custom properties)
- Confirm all utility classes from Stage 1 are correctly referenced in components
- Confirm the z-index layering comment block and custom properties are present
- Remove any old/overridden CSS rules that are now made redundant by Stage 1 tokens

## Layout / Responsive Rules

- All dashboard pages must be free of horizontal overflow at 320px through 430px
- Button heights: primary CTAs = `h-11`, secondary/pill/filter = `h-9` acceptable with documentation
- Card padding: `p-4` on mobile (16px), `sm:p-5` on larger screens
- Field spacing: `gap-4` between fields, `gap-1.5` within field groups
- Sticky header: present and functional on all dashboard pages (inherited from Stage 1)
- Toast positioning: consistent across all pages (below header on mobile)
- No page should require horizontal scrolling to view any content

## Implementation Tasks

- [ ] Load `post/page.tsx` on mobile emulator — audit sticky CTA, toast, form spacing, textarea rows
- [ ] Fix any field spacing or textarea height inconsistency in `post/page.tsx`
- [ ] Load `trends/page.tsx` on mobile emulator — audit card padding, segmented control, text overflow
- [ ] Apply `p-4 sm:p-5` to trend cards in `trends/page.tsx` if currently using `p-5`/`p-6`
- [ ] Fix any text overflow in trend hashtag/keyword labels
- [ ] Load `generate` page on mobile emulator — audit `InputSection.tsx` and `TweetCard.tsx`
- [ ] Confirm `InputSection.tsx` pill buttons use appropriate size (`h-9` acceptable if decorative)
- [ ] Confirm `TweetCard.tsx` badges use `flex flex-wrap gap-1.5` and do not overflow
- [ ] Confirm `TweetCard.tsx` CTA buttons are `h-11`
- [ ] Confirm `PreviewModal.tsx` bottom-sheet behavior (from Stage 5) at 375px and 390px
- [ ] Reload `profile/page.tsx` — full regression audit of Stages 1–5 changes
- [ ] Audit `app/globals.css` — remove orphaned rules, confirm all tokens are used
- [ ] Run horizontal overflow check on all pages at 320px (use browser devtools overflow detection)
- [ ] Run dark mode check on all pages
- [ ] Run landscape mode check on iPhone SE and iPhone 14 form factors

## Acceptance Criteria

- All dashboard pages (profile, post, trends, generate) are free of horizontal overflow at 320px
- All primary CTA buttons across all pages meet the `h-11` (44px) touch target
- Card padding is 16px on mobile across all pages using the shared token
- Toast placement is consistent across `profile`, `post`, and `generate`
- `trends` page cards and segmented control render cleanly at 320px, 375px, 390px, 430px
- `generate` page TweetCard badges wrap without overflow at all tested widths
- `PreviewModal` bottom sheet behavior verified on mobile (from Stage 5)
- `profile` page shows no regression from all previous stage changes
- `app/globals.css` contains no orphaned custom properties or unused utilities
- Dark mode passes on all pages
- Landscape mode is usable on all pages (no critical UI elements hidden or inaccessible)

## Edge Cases

- 320px width (iPhone SE smallest supported): the most constrained layout — badge wrapping, button widths, and card padding are most likely to fail here
- Landscape iPhone SE (568×320 effective): sticky header and footer consume proportionally more height — verify all content between them is still reachable
- Very long trend hashtag (30+ characters): must truncate or wrap without overflowing the card
- TweetCard with no badges: card should still maintain proper internal spacing
- Generate page with many tone/style pill options: pill buttons must not overflow the container width, they must wrap
- Post page with very long tweet text (280 chars): textarea must remain usable and scroll correctly within the textarea

## QA Checklist

**All pages — 320px, 375px, 390px, 430px:**
- [ ] No horizontal scrollbar or overflow visible
- [ ] Mobile sticky header present and functional
- [ ] Primary CTA buttons visually meet 44px height
- [ ] Card padding consistent at 16px

**Profile page:**
- [ ] Preview card, stats grid, metadata, form card, sticky footer all present and correct
- [ ] Toast appears below header after save action
- [ ] Unsaved changes indicator shows/hides correctly

**Post page:**
- [ ] Sticky submit footer present
- [ ] Toast below header on post success/error
- [ ] Textarea has sufficient rows for editing
- [ ] Character counter right-aligned

**Trends page:**
- [ ] Trend cards use 16px padding
- [ ] No text overflow in trend labels
- [ ] Segmented control functional and sized appropriately

**Generate page:**
- [ ] InputSection fields spaced correctly
- [ ] Pill buttons wrap cleanly at narrow widths
- [ ] TweetCard badges wrap without overflow
- [ ] TweetCard CTA buttons are 44px
- [ ] PreviewModal bottom sheet usable on mobile

**Dark mode (all pages):**
- [ ] Card borders visible
- [ ] Muted text readable
- [ ] Button states distinguishable

**Landscape (iPhone SE and iPhone 14):**
- [ ] All pages usable
- [ ] Sticky header not consuming excessive height
- [ ] Drawers and sheets fit in reduced vertical space

## Risks

- Discovering regressions in secondary pages (post, trends, generate) that require changes larger than targeted corrections — if a page requires substantial refactoring, scope it as a new stage rather than expanding this one
- The `h-11` normalization from Stage 1 may make filter/pill buttons in `InputSection.tsx` feel too large for their context — use `h-9` with a documented exception rather than reverting Stage 1 changes
- Removing "orphaned" CSS rules from `app/globals.css` may break styling in edge cases — only remove rules that are clearly superseded by the new token system, and test after each removal

## Notes for Coding Agent

- This stage is read-audit-fix, not redesign — keep all changes minimal and targeted
- Do not change any API contracts, data fetching logic, or business logic on any page
- Do not refactor component structure on post, trends, or generate pages — only apply targeted CSS/className corrections
- If a fix requires more than 10–15 lines of change on a secondary page, flag it as a separate task rather than expanding this stage
- The acceptance criteria and QA checklist items are the definition of done — do not mark the stage complete until all checklist items pass
- Use browser devtools "Inspect" with mobile emulation for the overflow checks — enable "Show scroll overflow" in Chrome devtools
- Test dark mode using the browser devtools `prefers-color-scheme: dark` emulation rather than manually toggling the app theme
- Document any exceptions made to the Stage 1 button sizing rule (e.g., pill buttons using `h-9`) with a code comment so future developers understand the intentional exception
