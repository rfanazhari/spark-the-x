# Stage 4 — Mobile Action Area

## Goal

Move the primary save action out of the bottom of the edit form into a persistent sticky footer that remains accessible regardless of how far the user has scrolled or whether the software keyboard is open. The sticky footer must support loading, disabled, and success states without causing layout shift. It must also clear the device safe-area-inset-bottom so it does not overlap the home indicator on iPhones.

## Components / Files Likely Affected

- `app/dashboard/profile/page.tsx` — move the save button out of the form card and into a sticky footer element; introduce unsaved-changes state indicator
- `app/globals.css` — consume `.sticky-footer-offset` and `.safe-bottom` utilities from Stage 1; may add a `.sticky-action-bar` utility class
- `app/dashboard/post/page.tsx` — secondary target: apply the same sticky CTA pattern to the post composer page for consistency

## UI Problems Being Solved

1. The save button sits at the bottom of the edit form — on long-form profiles, this requires the user to scroll to the very bottom to save. On mobile, the software keyboard further pushes the button off-screen.
2. There is no "unsaved changes" indicator — users cannot tell at a glance whether their edits have been applied or are still pending.
3. The current button does not visually distinguish between loading and success states in a way that avoids layout shift (e.g., changing button text causes the button width to reflow).
4. There is no bottom safe-area handling for the action area — on iPhones, the button can render directly behind the home indicator swipe zone.

## Proposed UI Changes

### Sticky Action Bar (mobile only)
- Add a sticky footer element at the bottom of the page with:
  ```
  position: fixed; bottom: 0; left: 0; right: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
  padding-inline: 1rem; (16px horizontal padding)
  padding-top: 0.75rem;
  z-index: 40;
  ```
- On `sm:` breakpoints and above, hide the sticky bar and restore the save button to its inline position inside the form card (use `sm:hidden` on the sticky bar and `hidden sm:block` or `hidden sm:flex` on the inline button)
- This ensures the sticky pattern is mobile-only; larger screens keep the inline button

### Save Button Inside Sticky Bar
- Full width: `w-full`
- Height `h-11` (44px) — inherits from the button size normalization in Stage 1
- States:
  - **Default (unsaved):** Primary button with label "Save Changes" — enabled
  - **Loading:** Primary button with spinner icon + label "Saving…" — disabled
  - **Saved (success):** Brief success state — green or checkmark variant, label "Saved" — auto-revert to default after 2s
  - **Disabled (no changes):** Muted/secondary appearance with "No changes" label — use `disabled` attribute
- Do not change the button width when switching between states — use `w-full` to prevent reflow
- Keep the label text change minimal — "Save Changes" → "Saving…" → "Saved" — short enough to avoid width change on a full-width button

### Unsaved Changes Indicator
- Inside the sticky bar, above the button, show a small status line when there are unsaved changes:
  ```
  <p class="text-xs text-muted-foreground text-center mb-1.5">You have unsaved changes</p>
  ```
- When no changes are pending (form matches saved state), hide this line entirely — do not leave an empty space
- Implement "unsaved" detection by comparing current form values against the last-saved values (use a `isDirty` flag from React Hook Form if the project uses it, otherwise a simple `useEffect` comparison)

### Page Content Offset
- Apply `.sticky-footer-offset` padding to the page scroll container so the sticky bar does not cover the last section of content
- The offset should equal the sticky bar's total height (approximately `4rem` / 64px + safe-area-bottom)
- This padding is already defined as a utility class in Stage 1 — consume it here

### Post Page (secondary target)
- After the profile page sticky bar is confirmed working, apply the same pattern to `app/dashboard/post/page.tsx`:
  - Move the "Post Tweet" submit button to a sticky footer
  - Apply `.sticky-footer-offset` to the post page scroll area
  - Keep the same state pattern: default, loading, and a brief success/error state

## Layout / Responsive Rules

- Sticky bar: `fixed bottom-0 left-0 right-0` on mobile; hidden at `sm:` and above
- Inline button (non-mobile): visible only at `sm:` and above, positioned at the bottom of the form card
- Sticky bar total height: `padding-top: 0.75rem` + `h-11` button + `env(safe-area-inset-bottom)` + optional status line ≈ 64–80px
- Page bottom padding: must be at least equal to the sticky bar height so content is not obscured
- "You have unsaved changes" text: visible only when `isDirty === true`; zero height when hidden (use `hidden` class, not invisible)
- The sticky bar must appear above page content (z-index: 40) but below drawers and toasts (z-index: 50+)

## Implementation Tasks

- [ ] Identify where the save button currently lives inside the form in `app/dashboard/profile/page.tsx`
- [ ] Remove the save button from the inline form card (or hide it at mobile with `sm:block hidden`)
- [ ] Add a sticky footer div with `fixed bottom-0 left-0 right-0 z-40 border-t bg-background px-4 pt-3 pb-[env(safe-area-inset-bottom,0px)]`
- [ ] Move the save `<Button>` into the sticky footer with `w-full h-11`
- [ ] Add `isDirty` detection: compare form values against initial/saved values; set a `hasChanges` boolean
- [ ] Add "You have unsaved changes" status text above the button, conditionally rendered when `hasChanges === true`
- [ ] Implement three button states: default ("Save Changes"), loading ("Saving…" + spinner), success ("Saved" with brief timeout back to default)
- [ ] Add `.sticky-footer-offset` to the profile page scroll container / page wrapper
- [ ] Add `sm:hidden` to the sticky bar (mobile only)
- [ ] Add `hidden sm:block` to the inline fallback button inside the form card (non-mobile)
- [ ] Validate that keyboard open on mobile does not push the sticky footer off-screen (it should stay fixed, not scroll with content)
- [ ] Apply the same sticky footer pattern to `app/dashboard/post/page.tsx`
- [ ] Add `.sticky-footer-offset` to the post page content area

## Acceptance Criteria

- The sticky save bar is visible at the bottom of the screen throughout the entire profile page scroll on mobile
- The save bar does not appear on screens 640px (sm:) and wider
- The save bar clears the home indicator / safe area on iPhone (no button behind the swipe zone)
- The button shows "You have unsaved changes" text above it when form values differ from saved state
- When there are no unsaved changes, the status line is hidden and takes up no vertical space
- Tapping "Save Changes" triggers loading state ("Saving…") and returns to default or shows "Saved" on success
- The button width does not change between states (it is `w-full` and anchored)
- Page content is not hidden behind the sticky bar (`.sticky-footer-offset` padding is applied)
- On `post` page: submit button is also in a sticky footer with the same behavior

## Edge Cases

- Keyboard open on iPhone: sticky footer with `position: fixed` stays at the bottom of the viewport, not the document — this is generally correct behavior, but verify the active input field is not obscured by the footer (the active input should be above the footer when keyboard and footer are both visible)
- Very short screens (e.g., iPhone SE in landscape): sticky footer + keyboard may consume 70%+ of the viewport height — verify the user can still scroll to and edit fields
- Android "resize" behavior: some Android browsers resize the viewport when the keyboard opens, which can reposition `fixed` elements unexpectedly — test on Chrome Android
- User edits, saves, then edits again: `isDirty` flag must reset correctly after a successful save and re-detect changes on the next edit
- User edits, then navigates away without saving: no prompt is required by this stage (browser back navigation without save warning is acceptable for now)
- No JavaScript: the sticky footer falls back to being part of the document flow — acceptable as a no-JS degradation

## QA Checklist

- [ ] 375px: sticky bar visible, save button full-width, clears notch/home indicator
- [ ] 375px with keyboard open: sticky bar still visible, bar does not overlap active input
- [ ] 390px: same as 375px
- [ ] 430px: bar proportionate, no excessive padding
- [ ] 640px (sm breakpoint): sticky bar hidden, inline button visible inside form card
- [ ] Tap "Save Changes": button changes to "Saving…" with spinner, then "Saved", then reverts
- [ ] Edit a field → check status line: "You have unsaved changes" appears
- [ ] Save successfully → check status line: "You have unsaved changes" disappears
- [ ] Scroll to bottom of page: last section of content is fully visible above the sticky bar
- [ ] Post page: submit button in sticky footer, same behavior as profile save
- [ ] Landscape iPhone: bar height acceptable, does not dominate the viewport

## Risks

- `position: fixed` + iOS Safari keyboard: there is a known iOS Safari behavior where `fixed` elements jump when the keyboard opens/closes. If this occurs, the mitigation is to switch to `position: sticky` with the bar as part of the natural document flow, rather than fixed to the viewport.
- `env(safe-area-inset-bottom)` in `padding-bottom` on a `fixed` element: this is the correct pattern and is widely supported since iOS 11 — confirm the `viewport-fit=cover` meta tag is set in `app/layout.tsx` (required for safe-area insets to work)
- `isDirty` detection with complex form state: if the form uses deeply nested objects or arrays, a shallow equality check will miss changes. Use React Hook Form's `formState.isDirty` if available, as it handles this correctly.
- Z-index stacking: the sticky bar at `z-40` must be below drawers (`z-50`) and toasts (`z-50+`) — verify that no drawer or toast gets obscured by the footer

## Notes for Coding Agent

- Do not change the form submission handler, the API call in `handleSave`, or the success/error toast logic
- The loading and success states should be driven by the same state variables already used for the save operation
- The sticky footer is a purely additive change — the form card itself remains intact
- The inline fallback button (for `sm:` and above) may be a simple copy of the current save button, just hidden on mobile with `sm:block hidden`
- Do not implement navigation-away warnings or "are you sure?" prompts — out of scope for this stage
- For `app/dashboard/post/page.tsx`, apply the minimum required changes to establish the sticky pattern — do not refactor the post page's form structure
- Ensure `viewport-fit=cover` is present in the `<meta name="viewport">` tag in `app/layout.tsx` — without this, `env(safe-area-inset-bottom)` returns 0 on iOS
