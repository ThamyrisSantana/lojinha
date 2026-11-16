# Painel da Lojinha — Design System

The design system behind the dashboard: tokens, themes, components and the rules for using them.

- **Tokens:** the `@theme` block in [`src/styles/index.css`](../src/styles/index.css) — every color, font size, radius, shadow and breakpoint. Tailwind turns each token into utility classes (`bg-surface`, `text-fg-muted`, `rounded-md`, `text-sm`, `max-lg:`…).
- **Components:** [`src/components/ui/`](../src/components/ui/) — React components built only from those utilities.
- **Visual catalog:** [Storybook](https://storybook.js.org) — every component and token, in both themes, with accessibility checks. Run `npm run storybook` (opens http://localhost:6006).

The interface text is in Portuguese (pt-BR). Code, tokens and these docs are in English.

---

## 1. Principles

1. **Black and white first.** Gray page, white cards, black as the only accent. In the dark theme it is inverted. Color is never decoration.
2. **Color means status.** Green, orange and red only appear as small dots (ok, attention, problem) and in error messages. Never color a whole surface.
3. **One clear action per area.** Each screen has at most one primary button in its header.
4. **Numbers first.** Values that matter are big, bold and use tabular figures (`tabular-nums`). Labels are small and quiet.
5. **Show the calculation.** When a number is derived (profit, cost, price), show how it was calculated close to it.
6. **Tokens only.** Tailwind's default palette, sizes and radii are turned off (`--color-*: initial` etc.), so `bg-blue-500` or `rounded-xl` simply don't exist. If a value is missing, add a token.

## 2. Themes

Dark is the default. The user picks *Claro*, *Escuro* or *Automático* (follows the device) in the sidebar footer, in **Ajustes → Aparência**, or with the sun/moon button in the phone's top bar.

| | |
|---|---|
| Stored choice | `localStorage["painel-tema"]` = `dark` · `light` · `auto` (missing = dark) |
| Applied as | `<html data-theme="dark\|light">`; no attribute = auto |
| CSS | Light values in `@theme`; dark values redefine the same variables on `:root[data-theme='dark']` and, for auto, in `@media (prefers-color-scheme: dark)` |
| No flash | An inline script in `index.html` sets `data-theme` before the page paints |
| In React | `useTheme()` (`src/app/useTheme.ts`) reads and changes it |

Components never check the theme: they use semantic tokens, which change per theme.

## 3. Color tokens

| Token (utility) | Light | Dark | Use for |
|---|---|---|---|
| `bg` | `#F2F2F2` | `#0C0C0D` | Page background, drawer body |
| `surface` | `#FFFFFF` | `#161617` | Cards, panels, tables, sidebar, inputs |
| `surface-muted` | `#F2F2F2` | `#212123` | Icon circles, toggles, progress tracks |
| `surface-sunken` | `#F8F8F8` | `#121213` | Table headers, row hover, spec lists |
| `border` | `#E7E7E7` | `#262628` | Card and table borders, dividers |
| `border-strong` | `#D8D8D8` | `#37373A` | Input and button borders |
| `fg` | `#111111` | `#F4F4F5` | Titles, values, primary text |
| `fg-muted` | `#555555` | `#A8A8AD` | Descriptions, labels |
| `fg-subtle` | `#6B6B6B` | `#87878D` | Captions, helper text, placeholders |
| `accent` / `accent-hover` / `on-accent` | black | white | Primary button, active nav, featured card |
| `success` / `warning` / `danger` | green / amber / red | lighter | Status dots, errors, destructive actions |
| `chart-1` / `chart-2` | black / light gray | white / dark gray | Sales / expenses series |
| `focus-ring`, `overlay`, `logo-bg` | | | Input focus halo, dialog backdrop, logo tile |

Use as `bg-surface`, `text-fg-muted`, `border-border-strong`, `fill-chart-1`… Opacity works too: `bg-bg/88`.

## 4. Typography

Font: **Geist** (variable, self-hosted through `@fontsource-variable/geist`). Sizes: `text-2xs` 11 · `text-xs` 12 · `text-sm` 13 · `text-base` 14 (body) · `text-md` 16 · `text-lg` 18 · `text-xl` 22 · `text-2xl` 26 · `text-3xl` 32.

| Role | Classes | Where |
|---|---|---|
| Page title | `text-3xl/tight font-bold tracking-tighter` | `PageHeader` |
| Section title | `text-lg/snug font-bold tracking-tight` | `Panel`, empty states |
| Card title | `text-md/snug font-bold tracking-tight` | product cards, task groups |
| Overline | `text-2xs font-semibold tracking-wide uppercase text-fg-subtle` | sidebar groups |
| Label | `text-xs font-semibold text-fg-muted` | form labels |
| Caption | `text-xs text-fg-subtle` | `Sub` |
| Stat | `text-2xl font-bold tracking-tight tabular-nums` | `Kpi` |

## 5. Spacing, shape and layout

- **Spacing:** Tailwind's 4px scale (`p-4` = 16px, `gap-2.5` = 10px). Cards use `p-5`/`p-6`, page sections `gap-6`.
- **Radius:** `rounded-sm` 10px (inputs, tooltips) · `rounded-md` 14px (cards, tables) · `rounded-lg` 20px (drawer, login) · `rounded-full` (buttons, chips, nav).
- **Shadow:** `shadow-sm` on cards, `shadow-lg` on floating layers.
- **Breakpoints (desktop-first):** `max-sm:` < 600 · `max-md:` < 700 · `max-lg:` < 960 (sidebar becomes a slide-out menu + bottom bar) · `max-xl:` < 1100 · `max-2xl:` < 1280.
- **Widths:** `max-w-content` 1240px, `max-w-form` 720px, `max-w-readable` 68ch, sidebar 252px, drawer 640px.

## 6. Components (`src/components/ui`)

Every component has stories in Storybook (`*.stories.tsx`).

| Component | Notes |
|---|---|
| `Button`, `IconButton` | Variants `primary` · `default` · `ghost` · `danger` · `danger-ghost`; sizes `md` · `sm`; optional `icon`. `IconButton` needs a `label` (its accessible name). `buttonClass()` styles links as buttons. |
| `ConfirmButton` | Destructive action: the first click arms it ("Confirmar exclusão"), the second runs it. `outlined` for standalone actions. |
| `Chip`, `SampleChip`, `Count` | Tones `neutral` · `good` · `warn` · `bad` (with status dot) · `info` (outlined) · `strong` (inverted). |
| `Icon` | Stroke icons, decorative (`aria-hidden`). Names in `ICON_NAMES`. |
| `PageHeader` | Title, description, actions. Takes focus when the user changes screens. |
| `Panel`, `HeadingNote` | Card with a heading and an optional element on its right. |
| `EmptyState`, `Note`, `Sub` | Empty lists, callouts (`tone="warn"`), captions. |
| `DataTable`, `NameCell`, `RowActions` | Typed columns (`numeric` right-aligns), optional detail row, caption for screen readers. |
| `Segmented` | Toggle group (`aria-pressed`), sizes `sm` · `md` · `lg`, optional counts. |
| `MonthNav` | Previous/next month; the month name goes back to today. |
| `Kpi`, `HBar`, `Avatar` | Stat card (featured, negative, tooltip), horizontal bar, product image with initial fallback. |
| `Tooltip` | Opens on hover **and** keyboard focus; linked with `aria-describedby`. |
| `Drawer` | Side form panel on the native `<dialog>` (modal, Escape closes, focus moves in and back). |
| `TextField`, `SelectField`, `TextareaField`, `CheckboxField` | Bound to React Hook Form; label, help and error linked to the control; `aria-invalid` on errors. |
| `Fieldset`, `FieldGrid`, `Suggestions`, `Preview` | Form layout, `<datalist>` suggestions, live result card. |
| `toast()` / `Toaster` | Short confirmations, announced by screen readers. |

## 7. Content guidelines

- Write for the shop owner: short, concrete, in Portuguese. Say what happens ("Registrar um lote desconta os insumos").
- Money with `brl()`, percentages with `pct()`, dates with `dataBR()`/`mesLongo()` (`src/lib`).
- Empty states say what the screen is for and offer the action to start.

## 8. Accessibility

- Every interactive element is reachable and usable with the keyboard; focus is always visible (`outline-2`).
- Dialogs are modal `<dialog>`s; changing screens moves focus to the page title; a skip link jumps to the content.
- Icons are decorative; icon-only buttons have a label. Status is never shown by color alone (dot + text).
- Charts have a text alternative; tooltips are readable by screen readers.
- Form errors are text, linked to the field, with `aria-invalid`.
- `prefers-reduced-motion` turns off transitions and animations.
- Storybook runs axe on every story (`a11y: { test: 'error' }`).

## 9. Changing the system

1. Change or add the token in `src/styles/index.css` (both themes for colors).
2. Use it through its utility class in the component.
3. Check the component's story in both themes and its accessibility panel in Storybook.
