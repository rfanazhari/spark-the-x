# Stage 5 — Feedback and Overlay Polish

## Goal

Unify toast/notification placement across all dashboard pages so feedback does not collide with the sticky header, device notch, or sticky action bar. Improve the mobile behavior of the generate preview modal by shifting it from a centered dialog to a bottom-sheet layout on small screens. Establish consistent z-index layering and safe-area handling for all overlays (toasts, drawers, modals).

## Components / Files Likely Affected

- `app/dashboard/profile/page.tsx` — currently uses top-fixed toast; adjust positioning
- `app/dashboard/post/page.tsx` — uses top-fixed toast; align with profile pattern
- `app/dashboard/generate/_components/PreviewModal.tsx` — centered dialog; convert to bottom sheet on mobile
- `components/sidebar.tsx` — drawer overlay; verify z-index and safe-area handling
- `app/globals.css` — may add a shared `@layer utilities` entry for toast and overlay positioning rules

## UI Problems Being Solved

1. Toasts on `profile` and `post` pages are fixed to `top-4 left-4 right-4`. After Stage 1 makes the mobile header sticky at the top, these toasts will collide directly with the header, rendering both unreadable.
2. The `generate` page uses bottom toasts while `profile` and `post` use top toasts — inconsistent feedback patterns across the same dashboard create a disorienting UX.
3. `app/dashboard/generate/_components/PreviewModal.tsx` uses a centered modal with `max-h-[90vh]`. On small screens with the software keyboard open, centered modals are frequently cut off at the top or bottom, making content inaccessible.
4. There is no shared overlay layering strategy. Drawers, toasts, and modals each define their own `z-index` independently, risking stacking conflicts as the UI grows.
5. No shared overlay accounts for `env(safe-area-inset-bottom)` in a consistent, documented way.

## Proposed UI Changes

### Toast Placement Unification
- Define a single toast placement strategy for all dashboard pages: **below the sticky header on mobile, top-right corner on desktop**
- Mobile: `top: calc(3.5rem + env(safe-area-inset-top, 0px))` — 3.5rem is the mobile header height (56px); this ensures the toast appears directly below the header, not behind or over it
- Desktop (`sm:` and above): standard `top-4 right-4` or the existing shadcn/ui Toaster position
- Update toast positioning in `profile/page.tsx` and `post/page.tsx` — if using a shared `Toaster` component from shadcn/ui, update its `position` prop; if using a custom implementation, adjust the inline `fixed` positioning classes
- If the project uses the shadcn/ui `sonner` Toaster, configure it with `position="top-center"` and an `offset` that accounts for the mobile header height
- Toast z-index: `z-[60]` — above drawer (`z-50`) and sticky footer (`z-40`)

### Z-Index Layering Strategy (document in `app/globals.css` as a comment block)
Define and document the shared z-index scale:
```
10  — Page content overlays (floating labels, popovers)
20  — Sticky cards or inline overlays
40  — Sticky action footer
50  — Mobile header, drawer
60  — Toasts and notifications
70  — Modals and sheets
```
Add this as a CSS comment in `app/globals.css` so all future developers reference the same scale. Add corresponding CSS custom properties:
```css
--z-sticky-footer: 40;
--z-header: 50;
--z-drawer: 50;
--z-toast: 60;
--z-modal: 70;
```

### Generate Preview Modal → Bottom Sheet on Mobile
- `app/dashboard/generate/_components/PreviewModal.tsx` currently renders a Dialog (centered, `max-h-[90vh]`)
- On mobile (`< sm`), change the modal to use a bottom-sheet behavior:
  - Anchor to `bottom: 0`, full width, `rounded-t-2xl`, slide up from bottom
  - `max-h-[85vh]` with an internal scrollable area for the tweet content
  - A drag handle or close button at the top of the sheet
  - Safe-area bottom padding: `padding-bottom: env(safe-area-inset-bottom, 0px)`
- On desktop (`sm:` and above), preserve the existing centered dialog behavior without changes
- Implementation approach: use a conditional render or `useMediaQuery` hook to swap between the Dialog and a Sheet variant (shadcn/ui has a `Sheet` component with `side="bottom"` that provides this behavior out of the box)
- Do not change the modal's internal content (tweet preview, confirm/edit buttons) — only change the container behavior

### Drawer Overlay Verification (sidebar.tsx)
- Confirm the drawer backdrop is at `z-50` (above page content, below toasts)
- Confirm the drawer panel itself is at `z-50`
- Confirm the drawer backdrop applies `overflow: hidden` to `body` to prevent page scroll while the drawer is open (body scroll lock)
- Add `env(safe-area-inset-bottom)` padding to the drawer nav list bottom if not already done in Stage 1

## Layout / Responsive Rules

- Toast position on mobile: `fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-4 right-4`
- Toast position on desktop: `fixed top-4 right-4` (or configured via shadcn/ui Toaster props)
- Bottom sheet on mobile: `fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-card border-t max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]`
- Dialog on desktop: unchanged from current implementation
- Z-index scale: 40 (sticky footer) → 50 (header/drawer) → 60 (toast) → 70 (modal/sheet)

## Implementation Tasks

- [ ] Audit current toast implementation in `profile/page.tsx` and `post/page.tsx` — identify whether it uses shadcn/ui `Toaster`, `sonner`, or a custom element
- [ ] Update toast positioning to appear below the sticky mobile header: adjust `top` offset to account for header height + safe-area-inset-top
- [ ] Align `generate` page toast position with `profile` and `post` (or confirm all use the same shared Toaster)
- [ ] Add z-index custom properties and layering comment block to `app/globals.css`
- [ ] Open `app/dashboard/generate/_components/PreviewModal.tsx`
- [ ] Add a `useMediaQuery` hook or conditional className to detect mobile vs. desktop
- [ ] On mobile: replace centered Dialog container with bottom-sheet layout (`fixed bottom-0`, `rounded-t-2xl`, `max-h-[85vh]`, `safe-bottom` padding)
- [ ] On desktop: preserve existing Dialog behavior without changes
- [ ] Add a visible close/drag affordance at the top of the mobile sheet (a small drag bar or ✕ button)
- [ ] Verify drawer backdrop z-index is `z-50` in `components/sidebar.tsx`
- [ ] Verify drawer body-scroll lock is active when drawer is open
- [ ] Verify drawer nav list has `env(safe-area-inset-bottom)` bottom padding (from Stage 1 — confirm or add)
- [ ] Smoke test all overlay interactions together: drawer open + toast trigger, modal open + keyboard

## Acceptance Criteria

- Toasts on `profile` and `post` pages appear below the sticky mobile header without overlapping it
- Toasts on all dashboard pages use a consistent position strategy (not mixed top/bottom per page)
- The generate PreviewModal renders as a bottom sheet on screens narrower than 640px
- The bottom sheet on mobile has visible safe-area bottom clearance (button/content is above the home indicator)
- The bottom sheet can be dismissed (close button or backdrop tap) on mobile
- On desktop (640px+), the generate PreviewModal remains as a centered dialog — no change to its behavior
- Z-index values across header, drawer, sticky footer, toasts, and modals follow the documented layering scale
- No overlay obscures another overlay (drawer does not cover toast; toast does not cover modal)
- Drawer body scroll lock prevents page content from scrolling while drawer is open

## Edge Cases

- Toast appears while drawer is open: toast (z-60) should render above the drawer (z-50) — verify visually
- Toast appears while modal/sheet is open: modal (z-70) is above toast (z-60) — the modal should not be obscured by the toast
- Bottom sheet + keyboard open: the keyboard pushes the bottom sheet upward; verify sheet content remains scrollable and the close button is still reachable
- Bottom sheet on very short screens (iPhone SE landscape): `max-h-[85vh]` may be very limited (~500px) — verify sheet content is scrollable and usable
- Drawer dismissal while a toast is showing: both should be independently operable
- Multiple toasts queued: the toast library may stack them — verify stacking does not push toasts into the header area

## QA Checklist

- [ ] 375px: trigger a save success — toast appears below header, not overlapping it
- [ ] 375px: open drawer — backdrop covers page, drawer z-index above header, toast above drawer
- [ ] 375px: open PreviewModal in generate page — bottom sheet slides up from bottom
- [ ] 375px with keyboard open: bottom sheet still accessible and scrollable
- [ ] 390px: same toast and sheet checks
- [ ] 640px (sm breakpoint): PreviewModal renders as centered dialog, not sheet
- [ ] Desktop: toast renders top-right, no mobile positioning classes active
- [ ] Drawer scroll lock: open drawer, attempt to scroll page behind it — page should not scroll
- [ ] Back button / backdrop tap: bottom sheet and drawer both dismiss correctly
- [ ] Notched iPhone: toast top edge does not overlap notch/safe-area

## Risks

- If the project uses shadcn/ui `Toaster` with `sonner`, the offset configuration is global — adjusting the offset for mobile will affect all pages. Test across all pages after changing the Toaster config.
- The `useMediaQuery` approach for conditionally rendering Dialog vs. Sheet causes a re-render on resize (resizing past the breakpoint while the modal is open). This is acceptable for this use case.
- shadcn/ui `Sheet` with `side="bottom"` has its own animation and dismissal logic — verify it does not conflict with any existing close handlers in `PreviewModal.tsx`
- Body scroll lock implementation differs across libraries: if the drawer uses a custom implementation, verify it uses the `overflow: hidden` approach on `<html>` or `<body>`, not a padding-based approach that can cause layout shift

## Notes for Coding Agent

- Do not change the business logic inside `PreviewModal.tsx` — only change the container layout (Dialog vs. Sheet) based on screen size
- Do not introduce new toast libraries — work with whatever toast mechanism (`sonner`, shadcn/ui `useToast`, or custom) is already in use
- The z-index comment block in `app/globals.css` is documentation, not functional code — add it as a CSS comment, not as active rules (the custom properties are the active part)
- For the `useMediaQuery` hook, prefer a simple `window.innerWidth` check or a Tailwind-aware hook — do not add a new dependency for this
- If shadcn/ui `Sheet` is not already installed, check whether it is included in the shadcn/ui package before importing — it should be available as part of the standard installation
- Preserve the existing `onOpenChange`, `open`, and content props of `PreviewModal.tsx` — the parent component passes these; changing the internal container must not break the external API
