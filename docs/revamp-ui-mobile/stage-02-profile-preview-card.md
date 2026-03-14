# Stage 2 — Profile Preview Card Refactor

## Goal

Decompose the monolithic profile preview section in `app/dashboard/profile/page.tsx` into clearly separated, mobile-first sub-sections: identity (avatar + name + username), bio, stats grid, and metadata list. Each sub-section should stack predictably on narrow screens, handle real-world content gracefully, and render intentionally when fields are empty.

## Components / Files Likely Affected

- `app/dashboard/profile/page.tsx` — primary target; the `ProfileDisplay` inline component or JSX block within this file
- `app/globals.css` — may consume mobile spacing tokens introduced in Stage 1

## UI Problems Being Solved

1. The current `ProfileDisplay` section places avatar, identity, bio, stats, and metadata in a loosely structured vertical flow that was designed with desktop dimensions in mind. On narrow mobile screens, the sections do not have clear visual separation.
2. Long display names do not truncate or wrap in a controlled way, which can push adjacent elements (avatar, stats) into unstable positions.
3. Stats are presented inline with natural wrapping, meaning metric groupings (e.g., "12.4K Followers" and "342 Following") can split unpredictably across lines on very narrow screens.
4. Metadata items (location, URL, join date) use `break-all` for URLs, which technically prevents overflow but creates visually jagged line breaks that read poorly.
5. Empty fields (no location, no URL, no bio) simply disappear from the DOM, creating inconsistent card height and visual rhythm. Users may not know whether the field is empty by choice or a loading/display error.
6. There is no visual boundary between the read-only preview card and the editable form below it, causing the overall page to feel like one continuous unsorted block.

## Proposed UI Changes

### Identity Section (avatar + name + username)
- Lay out the avatar and identity text side-by-side using `flex items-start gap-3`
- Apply `min-w-0` to the identity text container to prevent it from overflowing its flex parent
- Display name: use `truncate` class — truncate to one line with an ellipsis if name is too long for the row
- Username (`@handle`): use `truncate` or `text-sm text-muted-foreground truncate` — keep below the name, single line
- Avatar: keep at a fixed size (`w-16 h-16` or `w-14 h-14`); do not allow it to shrink

### Bio Section
- Render the bio as a distinct paragraph below the identity row
- Use `break-words` (not `break-all`) for natural word-wrap
- When bio is empty, render a muted placeholder text such as "No bio added yet" in `text-muted-foreground text-sm` — do not collapse the section entirely
- Cap bio preview at 3 lines using `line-clamp-3` for the preview card; full bio is visible in the edit form

### Stats Section
- Replace the inline wrapping stats row with a fixed `grid grid-cols-3` layout
- Each stat cell contains a bold numeric value on top and a muted label below (`text-xs`)
- Use `text-center` within each cell
- Stat values should use number formatting (e.g., "12.4K" not "12400") — preserve whatever formatting currently exists, only change layout
- The grid must not reflow to fewer than 3 columns on any supported mobile width (320px+)
- Add a subtle top border or `pt-3 border-t` to visually separate the stats from the bio

### Metadata Section
- List metadata items (location, website URL, join date) in a vertical stack
- Each item is a flex row: `flex items-center gap-2` with an icon and text
- URL display: show a shortened version of the URL as the visible text (e.g., strip `https://`, truncate to ~30 chars) while preserving the full URL as the `href`; use `truncate` on the text span
- Use `break-words` for location text, not `break-all`
- When a metadata field is empty, omit the row entirely — but if ALL metadata fields are empty, render a single muted row: "No location, website, or join date added"
- Add a subtle `border-t pt-3` above this section to separate it from stats

### Preview Card Wrapper
- Wrap the entire read-only preview (identity + bio + stats + metadata) in a `rounded-xl border bg-card p-4` card container
- Use `card-px` (16px) internal padding, consistent with the spacing system from Stage 1
- Add a section header label "Profile Preview" in `text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3` above the card to clearly label this as the current state, not the edit area

## Layout / Responsive Rules

- Identity row: `flex items-start gap-3`, avatar is `flex-none`, identity text is `flex-1 min-w-0`
- Stats grid: always 3-column (`grid grid-cols-3 gap-2`), never fewer — fixed column count, not auto-fill
- Metadata items: single column vertical stack — no inline grouping at any width
- All text inside the card must respect `min-w-0` on their containers to prevent flex overflow
- Card itself should be full width within the page horizontal padding set in Stage 1
- On `sm:` breakpoints and above, the card padding may increase to `sm:p-5` — but mobile padding is the default

## Implementation Tasks

- [ ] Locate the `ProfileDisplay` component or JSX block in `app/dashboard/profile/page.tsx`
- [ ] Wrap the entire block in a bordered card: `rounded-xl border bg-card p-4`
- [ ] Add "Profile Preview" section label above the card
- [ ] Refactor identity row: `flex items-start gap-3` with `flex-none` avatar and `flex-1 min-w-0` text container
- [ ] Apply `truncate` to display name (single line)
- [ ] Apply `truncate` to username (single line)
- [ ] Replace inline stats row with `grid grid-cols-3 gap-2` layout with value + label stacked per cell
- [ ] Add `border-t pt-3 mt-3` separator above stats section
- [ ] Replace bio rendering: use `break-words`, add `line-clamp-3`, show "No bio added yet" placeholder when empty
- [ ] Refactor metadata items: vertical stack, each row is `flex items-center gap-2`
- [ ] Fix URL display: truncate visible text, preserve full `href`
- [ ] Add empty-state row when all metadata fields are empty
- [ ] Add `border-t pt-3 mt-3` separator above metadata section
- [ ] Verify no business logic (data fetching, profile update calls) is touched

## Acceptance Criteria

- The profile preview section is wrapped in a visually distinct card with a clear "Profile Preview" label
- Display name truncates to one line with ellipsis when the name is very long (20+ characters)
- Username truncates to one line with ellipsis when the handle is very long
- Stats always render in a stable 3-column grid regardless of viewport width
- Bio wraps naturally with `break-words` and shows a placeholder when empty
- Bio in the preview card is limited to 3 visible lines (`line-clamp-3`)
- URL metadata shows a shortened visible label (no `break-all` jagged breaks)
- The card renders without visual collapse when all metadata fields are empty
- No horizontal overflow appears in the card at 320px viewport width
- The card visually separates itself from the edit form below it

## Edge Cases

- Name with 40+ characters: must truncate at one line, no line wrapping of the name into the avatar column
- Bio at exactly 160 characters (Twitter's max): 3-line clamp must still apply without overflow
- All metadata fields empty (no location, no website, no join date): renders the "No location, website, or join date added" fallback row
- URL longer than 60 characters (e.g., a long LinkedIn or portfolio URL): shows truncated visible text, full URL preserved in `href`
- Stats with 0 values (new account): renders "0" without breaking the grid
- Stats with very large numbers (1M+ followers): value formatting must fit within a 3-column cell without overflow
- Profile with no avatar image: avatar placeholder must maintain the fixed avatar dimensions

## QA Checklist

- [ ] 320px: name truncates, stats grid holds 3 columns, no horizontal overflow
- [ ] 375px (iPhone SE): card padding correct, bio clamp active, metadata readable
- [ ] 390px (iPhone 14): all sections stack cleanly, no font size or spacing regression
- [ ] 430px (iPhone 14 Pro Max): card does not over-stretch; stat grid balanced
- [ ] Long name (40+ chars): single-line truncation with ellipsis visible
- [ ] Long URL (60+ chars): truncated display, no `break-all` jagged wrapping
- [ ] Empty bio: placeholder text renders, card height consistent
- [ ] Empty metadata: fallback row renders
- [ ] Dark mode: card border, text colors, and muted variants all readable
- [ ] Light mode (if supported): same pass

## Risks

- `line-clamp-3` on bio may conflict with existing Tailwind plugin versions — verify `@tailwindcss/line-clamp` or `line-clamp-*` utilities are available in the project's Tailwind config
- Replacing the stats row with a strict 3-column grid assumes exactly 3 stats exist. If the data model can return fewer stats, the grid will have empty cells — handle gracefully with a minimum of one stat always present or use conditional rendering
- Truncating the display name in the preview card is strictly a visual change to the preview; the edit form must still show the full name

## Notes for Coding Agent

- Do not modify data fetching, API calls, or the `onSave` / `handleSave` logic
- Do not change the edit form below the preview card in this stage — that is Stage 3
- Do not remove any existing functionality — only restructure the JSX layout of the read-only preview
- If `ProfileDisplay` is already extracted as a sub-component within the file, refactor it in place; do not move it to a new file unless it exceeds 80 lines after changes
- Use `truncate` (Tailwind) for single-line text overflow, not custom CSS
- Use `break-words` for bio and location, not `break-all`
- Prefer Tailwind grid utilities over CSS flex hacks for the stats layout
- The spacing tokens added in Stage 1 (`--card-px`, `--section-gap`) should be used via the utility classes defined there
