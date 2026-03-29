---
name: frontend-design
description: Applies visual design, layout, typography, and interaction polish for web UIs in React and Tailwind-based apps (including shadcn-style tokens). Use when building or refining screens, components, spacing, hierarchy, color, motion, accessibility, empty/loading/error states, or when the user asks for a more polished, cohesive, or professional frontend.
---

# Frontend design

## Principles

1. **Hierarchy first**: One clear primary action and focal point per view; secondary actions visually quieter.
2. **Density matches task**: Admin and data tools can be information-dense; marketing flows stay airy. Never cram without a reason.
3. **Consistency beats novelty**: Reuse spacing scale, radii, type roles, and component variants already in the project.
4. **Accessible by default**: Contrast, focus rings, labels, hit targets (min ~44px for touch when primary), no information by color alone.

## Layout and spacing

- Use a **small set of spacing steps** (e.g. multiples of 4px / Tailwind scale). Prefer `gap` in flex/grid over margins between siblings.
- **Align to a grid**: Max-width containers for readable line length (~65–80ch for body). Wide dashboards: structured columns, not infinite single-column scroll of unrelated blocks.
- **Responsive**: Mobile: single column, stacked actions; desktop: sidebars, split panes, tables. Test at narrow widths even for “desktop-first” tools.

## Typography

- **One sans for UI**, optional **second for headings** if the design system already defines it—do not add random third fonts.
- Scale: **page title > section title > body > caption/meta**. Use `font-medium`/`semibold` sparingly for emphasis, not every label.
- **Line height**: Body slightly loose (`leading-relaxed` / ~1.5–1.6); compact only in tables or tags.
- **Truncation**: Use `line-clamp` with tooltips or detail views when copy is long; avoid unreadable ellipsis-only patterns for critical info.

## Color and surfaces

- Prefer **semantic tokens** (`background`, `foreground`, `muted`, `primary`, `destructive`, `border`) over raw hex in Tailwind/shadcn setups.
- **Muted text** for secondary metadata; **one accent** (primary) for links and primary buttons; **destructive** only for destructive actions.
- **Cards and panels**: Subtle border or soft background—not stacking heavy shadows everywhere.

## Components and states

- Every interactive element needs **hover**, **focus-visible**, **disabled**, and **active** where relevant.
- **Loading**: Prefer skeletons or inline spinners tied to the component that’s waiting; avoid full-page spinners for small fetches.
- **Empty and error**: Short, human copy; one clear next step (e.g. “Add student”, “Try again”). No raw error dumps for end users.

## Motion

- Keep motion **subtle and fast** (roughly 150–250ms). Use for feedback (e.g. overlay open), not decoration.
- Respect **`prefers-reduced-motion`**: avoid gratuitous parallax or large layout shifts.

## Forms and density

- **Labels** visible; placeholders are hints, not labels.
- Group related fields; align submit actions **bottom-right** or **full-width** on mobile.
- Dense admin UIs: tight vertical rhythm, monospace or tabular nums for IDs/times when helpful.

## Review checklist

Before shipping UI changes:

- [ ] Visual hierarchy obvious in 3 seconds
- [ ] Spacing and type consistent with nearby screens
- [ ] Focus states visible; contrast sufficient (WCAG AA for text where feasible)
- [ ] Loading / empty / error handled
- [ ] Works at small viewport width
- [ ] No duplicate competing primary buttons

## Out of scope

Illustration, brand strategy, and marketing copy are separate; this skill covers **interface craft** within an existing stack and design tokens.
