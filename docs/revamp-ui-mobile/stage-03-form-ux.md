# Stage 3 — Form UX Improvements

## Goal

Wrap the edit form in a dedicated card surface, normalize field spacing, improve bio textarea height and character counter placement, connect all labels to their inputs with proper `htmlFor/id` pairs, and introduce mobile-first field sizing. This stage focuses only on the form structure and ergonomics — saving behavior and the sticky CTA belong to Stage 4.

## Components / Files Likely Affected

- `app/dashboard/profile/page.tsx` — the edit form JSX block (name, username, bio, location, website fields)
- `app/globals.css` — may consume field spacing tokens from Stage 1

## UI Problems Being Solved

1. The edit form is not visually separated from the read-only preview above it. There is no card wrapper, no section label, and no clear visual signal that this area is editable.
2. Field spacing is inconsistent: some label-to-input gaps are larger than others, and there is no uniform spacing between consecutive fields.
3. The bio textarea is only `rows={3}`, which renders at approximately 72px tall on most browsers — too short to comfortably edit a 160-character bio on mobile without constant scrolling inside the textarea.
4. The character counter for bio (or similar fields) is not explicitly aligned with the helper text — it may float away from the input it describes on narrower screens.
5. Most `<label>` elements are likely not connected to their inputs via `htmlFor` / `id` pairs, which breaks keyboard navigation and screen reader behavior.
6. Input heights (`h-8`, `h-9`) may be below the mobile touch target standard from the perspective of user finger interaction with text fields — inputs should feel comfortable to tap and type into.
7. There are no visual validation states (error border, error message) beyond what the form already provides — mobile users benefit from inline error messages placed directly below the affected field.

## Proposed UI Changes

### Form Card Wrapper
- Wrap the entire edit form in a `rounded-xl border bg-card p-4` card — identical surface treatment as the preview card in Stage 2
- Add a section label above the card: "Edit Profile" in `text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3`
- Add `sm:p-5` on larger breakpoints to scale padding up slightly

### Field Group Structure
Each field must follow this consistent structure:
```
<div class="flex flex-col gap-1.5">   ← field group wrapper, gap = --field-gap (12px)
  <label htmlFor="field-id">Label</label>
  <input id="field-id" ... />
  <span class="text-xs text-muted-foreground">Helper text or error</span>  ← optional
</div>
```
- Use `gap-1.5` (6px) between label and input within one field group — this is tighter than the section gap
- Use `gap-4` (16px) between consecutive field groups using `flex flex-col gap-4` on the form wrapper

### Labels
- Every `<label>` must have `htmlFor` matching the corresponding `<input id="...">`
- Label text style: `text-sm font-medium` (consistent with shadcn/ui form conventions)
- Do not add asterisks for required fields unless there is a real validation requirement

### Input Fields (name, username, location, website)
- Set a consistent `h-11` height on all text inputs to match the button touch target standard from Stage 1
- This is achieved via `className="h-11 ..."` or by confirming the shadcn/ui `Input` component already supports this size
- Do not change placeholder text, input type, or value binding

### Bio Textarea
- Increase from `rows={3}` to `rows={5}` — this provides approximately 120px of visible editing space, enough for most bios without immediate internal scroll
- Add `resize-none` to prevent manual resize breaking the layout on mobile
- Add `min-h-[120px]` as a CSS floor to enforce minimum height across browsers

### Character Counter
- Render the bio character counter as a `<span>` placed inside the field group, aligned to the right: `text-right text-xs text-muted-foreground`
- Use `flex justify-between` on the helper row to show helper text on the left and counter on the right:
  ```
  <div class="flex justify-between items-center">
    <span class="text-xs text-muted-foreground">Describe yourself in 160 characters or less</span>
    <span class="text-xs text-muted-foreground">{charCount}/160</span>
  </div>
  ```
- If there is no helper text, render the counter right-aligned in its own row

### Validation States
- Add a `data-invalid` or conditional `border-destructive` class on the input when there is a validation error
- Render the error message as `text-xs text-destructive` directly below the input, replacing or augmenting the helper text
- Do not implement new validation logic — only wire the visual states to whatever error state already exists in the component

### Field Order
Keep the existing field order: Name → Username → Bio → Location → Website. Do not reorder fields.

## Layout / Responsive Rules

- Form is `flex flex-col gap-4` — one field per row, 16px between fields
- Field groups are `flex flex-col gap-1.5` — label, input, helper stacked tightly
- Character counter row is `flex justify-between` — helper text left, counter right
- Inputs are full-width (`w-full`) — no fixed widths
- Bio textarea has `resize-none min-h-[120px]` — no manual resize, consistent height
- Form card uses `p-4` on mobile, `sm:p-5` on larger screens
- Primary save button is NOT in this card — it belongs in Stage 4's sticky action area

## Implementation Tasks

- [ ] Locate the edit form JSX block in `app/dashboard/profile/page.tsx`
- [ ] Wrap the form in `rounded-xl border bg-card p-4 sm:p-5`
- [ ] Add "Edit Profile" section label above the card
- [ ] Add `flex flex-col gap-4` to the form wrapper to space out field groups
- [ ] Add `id` attributes to all input/textarea elements (e.g., `id="profile-name"`, `id="profile-bio"`)
- [ ] Add `htmlFor` to all `<label>` elements matching the corresponding `id`
- [ ] Add `flex flex-col gap-1.5` wrapper to each label + input + helper group
- [ ] Set `h-11` on all text inputs (or verify the shadcn Input component default achieves this)
- [ ] Change bio textarea from `rows={3}` to `rows={5}`
- [ ] Add `resize-none min-h-[120px]` to bio textarea
- [ ] Refactor the character counter to use `flex justify-between` row with helper text left and count right
- [ ] Add conditional `border-destructive` to inputs when an error state exists
- [ ] Add inline error message element below each input, shown conditionally

## Acceptance Criteria

- The edit form is visually enclosed in a card, clearly distinct from the preview card above
- An "Edit Profile" label is visible above the card
- All inputs and their labels are connected via `htmlFor` / `id`
- All form inputs have consistent `h-11` height
- Bio textarea shows at least 5 rows / 120px of visible editing space without internal scroll on a typical bio
- Character counter is right-aligned and paired with helper text in the same row
- Field spacing is uniform: 16px between fields, ~6px between label and input
- If a validation error exists on a field, a destructive border and inline error message appear directly below the input
- No layout shift when character counter updates as user types
- The form does not contain its own Save button — that belongs in Stage 4

## Edge Cases

- Bio at 160/160 characters: counter should show "160/160" in a warning or destructive color (e.g., `text-destructive`) to signal the limit has been reached
- Bio over 160 characters: if the input allows over-typing (e.g., controlled input), show the counter as negative and apply destructive styling
- Username with @ prefix already included in value: ensure the label/placeholder makes clear whether the `@` should be included or excluded
- Location field with a very long city + country string: full-width input, no truncation on input field (user needs to see full value while editing)
- Form with all fields empty (fresh profile): all inputs render empty without collapsing their row height
- Long URL in website field: full-width input, user must be able to see/edit the full URL

## QA Checklist

- [ ] 375px: all inputs full-width, bio textarea shows 5 rows, labels above each input
- [ ] 390px: character counter and helper text on same row, not wrapping to 3 lines
- [ ] 430px: form card padding correct, fields evenly spaced
- [ ] Tap each input: keyboard opens, active input remains visible above keyboard
- [ ] Type to 160 chars in bio: counter shows "160/160", counter color changes to warning
- [ ] `htmlFor`/`id` pairing: tap label text → input focus activates (functional label tap test)
- [ ] Error state: if validation error exists, destructive border and message visible below the field
- [ ] Resize attempt on textarea: `resize-none` prevents manual resize on desktop
- [ ] Dark mode: card border, field borders, helper text colors all readable
- [ ] Landscape orientation: bio textarea not excessively tall relative to viewport height

## Risks

- The shadcn/ui `Input` component may have its own height constraints — check if `h-11` can be applied via `className` prop or if the component needs a `size` variant
- If validation logic is already handled by a form library (e.g., React Hook Form, Zod), ensure inline error message rendering works with the library's error object structure — do not replace the validation library
- Increasing bio textarea height increases page length on mobile — ensure this doesn't push the save button (in Stage 4) so far down that it's unreachable

## Notes for Coding Agent

- Do not modify API calls, form submission handlers, or state management — only JSX structure and CSS
- Do not add new validation rules — only wire visual error states to existing error conditions
- Do not remove any existing `onChange` handlers, `value` bindings, or controlled input logic
- Keep the save button in its current position for now — Stage 4 will relocate it to a sticky footer
- If the form already uses React Hook Form or similar, use `register()` and `formState.errors` for the `id` and error state — do not bypass the library
- Avoid adding unnecessary wrapper divs — keep the DOM as flat as possible while achieving the field group structure
- The `resize-none` class on textarea may need to be added alongside existing className values — use `cn()` if the component uses it
