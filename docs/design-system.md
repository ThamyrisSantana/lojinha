# Painel da Lojinha — Design System

The design system behind the dashboard: tokens, typography, spacing, components and the rules for using them.

- **Tokens:** [`public/tokens.css`](../public/tokens.css) — the single source of truth for every color, size and timing.
- **Components:** [`public/style.css`](../public/style.css) — every component, built only from tokens.
- **Visual catalog:** [`docs/styleguide.html`](styleguide.html) — every token and component rendered live, in both themes. Open the file in a browser (no server needed).
- **Icons:** the `ICONS` map in [`public/js/components.js`](../public/js/components.js), rendered with `ic(name)`.

The interface text is in Portuguese (pt-BR). Code, class names, tokens and these docs are in English.

---

## 1. Principles

1. **Black and white first.** Gray page, white cards, black as the only accent. In the dark theme it is inverted. Color is never decoration.
2. **Color means status.** Green, orange and red only appear as small dots (ok, attention, problem). Never color a whole surface or a big text block.
3. **One clear action per area.** Each screen has at most one primary (black) button in its header. Other actions are secondary or ghost buttons.
4. **Numbers first.** Values that matter (money, counts, stock) are big, bold and use tabular figures. Labels are small and quiet.
5. **Show the calculation.** When a number is derived (profit, cost, price), show how it was calculated close to it.
6. **No raw values.** Components use tokens only. If a value is missing, add a token first.

---

## 2. Themes

Two themes, **dark is the default**. The user can pick *Claro* (light), *Escuro* (dark) or *Automático* (follows the device) in the sidebar footer, in **Ajustes → Aparência**, or with the sun/moon button in the mobile top bar.

| How it works | |
|---|---|
| Stored choice | `localStorage["painel-tema"]` = `dark` · `light` · `auto` (missing = dark) |
| Applied as | `<html data-theme="dark|light">`; no attribute = auto |
| CSS | Light values on `:root`; dark values on `:root[data-theme="dark"]` and inside `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])` |
| No flash | An inline script in `index.html` sets `data-theme` before the CSS loads |

Components never check the theme. They read **semantic tokens**, which change per theme.

---

## 3. Color

### 3.1 Semantic tokens (use these)

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--color-bg` | `#F2F2F2` | `#0C0C0D` | Page background, drawer body |
| `--color-surface` | `#FFFFFF` | `#161617` | Cards, panels, tables, sidebar, inputs |
| `--color-surface-muted` | `#F2F2F2` | `#212123` | Icon circles, toggles, inputs inside cards, progress tracks |
| `--color-surface-sunken` | `#F8F8F8` | `#121213` | Table headers, row hover, spec lists |
| `--color-border` | `#E7E7E7` | `#262628` | Card and table borders, dividers |
| `--color-border-strong` | `#D8D8D8` | `#37373A` | Input and button borders, hover borders |
| `--color-text` | `#111111` | `#F4F4F5` | Titles, values, primary text |
| `--color-text-muted` | `#555555` | `#A8A8AD` | Descriptions, secondary text, labels |
| `--color-text-subtle` | `#6B6B6B` | `#87878D` | Captions, helper text, table headers, placeholders |
| `--color-accent` | `#111111` | `#F4F4F5` | Primary button, active nav item, featured card |
| `--color-accent-hover` | `#333333` | `#D8D8D8` | Primary button hover |
| `--color-on-accent` | `#FFFFFF` | `#111111` | Text/icons on accent |
| `--color-on-accent-muted` | white 62% | black 60% | Secondary text on accent |
| `--color-on-accent-danger` | `#FF8A8A` | `#C62828` | Negative value on the featured card |
| `--color-success` | `#1F8A4C` | `#4CC27E` | "Ok" dot, success messages |
| `--color-warning` | `#C27A00` | `#E3A64B` | "Attention" dot, demo banner dot, warning callout bar |
| `--color-danger` | `#C53434` | `#F06A6A` | "Problem" dot, negative numbers, destructive actions, overdue heading |
| `--color-on-danger` | `#FFFFFF` | `#FFFFFF` | Text on a danger background (armed delete button) |
| `--color-chart-1` | `#111111` | `#F4F4F5` | Main series (sales, ranking bars) |
| `--color-chart-2` | `#CACACA` | `#4B4B50` | Comparison series (expenses, channels) |
| `--color-focus-ring` | black 12% | white 16% | Input focus halo |
| `--color-overlay` | black 45% | black 45% | Behind drawers and the mobile menu |
| `--color-logo-bg` | `#FFFFFF` | `#FFFFFF` | Logo tile |

### 3.2 Primitive palette (don't use in components)

Primitives only feed the semantic tokens. Neutrals go from `--neutral-0` (`#FFFFFF`) to `--neutral-975` (`#0C0C0D`). Status primitives come in two shades each: `--green-600/400`, `--amber-600/400`, `--red-700/600/400/300`. The darker one is for the light theme, the lighter one for the dark theme.

### 3.3 Status color rules

| Meaning | Token | Shows as | Example |
|---|---|---|---|
| Ok | `--color-success` | 6px dot in a `.chip.good` | "Ok" stock, "NF emitida", margin ≥ 30% |
| Attention | `--color-warning` | dot in `.chip.warn`, left bar in `.note.warn` | "Repor", "sem NF", margin 15–30% |
| Problem | `--color-danger` | dot in `.chip.bad`, negative numbers | "Acabou", overdue task, margin < 15% |
| Emphasis (not a status) | `--color-text` as background | `.chip.pink` (black tag), `.aic.bad` (black circle) | New order, task due today, urgent alert |

The status is always written in words too ("Repor", "Atrasada"), so it never depends on color alone.

---

## 4. Typography

**Font:** Geist (Google Fonts), weights 400–700, falling back to the system UI font. Numbers use `font-variant-numeric: tabular-nums` (class `.num`).

### 4.1 Scale

| Token | Size | Typical use |
|---|---|---|
| `--text-2xs` | 11px | Overlines, badges, chart labels, spec list labels |
| `--text-xs` | 12px | Captions, helper text, chips, small buttons, table headers |
| `--text-sm` | 13px | Buttons, secondary text, table rows, callouts |
| `--text-base` | 14px | Body text (default) |
| `--text-md` | 16px | Card titles, form section titles |
| `--text-lg` | 18px | Panel (section) titles |
| `--text-xl` | 22px | Drawer titles, stats on mobile |
| `--text-2xl` | 26px | Stats, login title, page titles on mobile |
| `--text-3xl` | 32px | Page titles, featured stat |

Weights: `--font-regular` 400 · `--font-medium` 500 · `--font-semibold` 600 · `--font-bold` 700.
Line heights: `--leading-none` 1 · `--leading-tight` 1.1 · `--leading-snug` 1.3 · `--leading-normal` 1.5.
Letter spacing: `--tracking-tighter` −0.03em (page titles) · `--tracking-tight` −0.02em (titles, stats) · `--tracking-wide` 0.06em (overlines).

### 4.2 Title and text roles

Use a role instead of combining sizes and weights by hand. Each role is a class, and the existing markup already maps to it.

| Role | Class | Spec | Already applied to |
|---|---|---|---|
| Display (page title) | `.t-display` | 3xl / bold / tighter / tight leading | `.head h1` |
| Title (section) | `.t-title` | lg / bold / tight | `.panel h2`, `.empty b` |
| Subtitle (card) | `.t-subtitle` | md / bold / tight / snug | `.ptop h3`, `.tgroup h2` |
| Overline | `.t-overline` | 2xs / semibold / uppercase / wide / subtle | `.ngroup > p`, `.fhead` |
| Body | `.t-body` | base / normal leading | `body` |
| Label | `.t-label` | xs / semibold / muted | `.field > span` |
| Caption | `.t-caption` | xs / subtle | `.tsub` |
| Stat | `.t-stat` | 2xl / bold / tight / tabular | `.kpi b` |
| Eyebrow | `.eyebrow` | sm / semibold / subtle | greeting above the page title |

Rules:
- One `.t-display` per screen (the page title).
- Don't skip levels: Display → Title → Subtitle.
- Long text stays within `--readable-width` (68ch).

---

## 5. Spacing

A 4px grid, with 2px half-steps for tight UI.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--space-0-5` | 2px | | `--space-5` | 20px |
| `--space-1` | 4px | | `--space-6` | 24px |
| `--space-1-5` | 6px | | `--space-7` | 28px |
| `--space-2` | 8px | | `--space-8` | 32px |
| `--space-2-5` | 10px | | `--space-9` | 36px |
| `--space-3` | 12px | | `--space-10` | 40px |
| `--space-3-5` | 14px | | `--space-12` | 48px |
| `--space-4` | 16px | | `--space-20` | 80px |
| | | | `--space-28` | 112px |

How they're used:

| Context | Spacing |
|---|---|
| Inside chips, badges, tight rows | `--space-0-5` … `--space-1-5` |
| Between icon and label, inside controls | `--space-2` … `--space-3` |
| Gap between cards, form fields | `--space-3` … `--space-5` |
| Inside cards and panels | `--space-5` … `--space-6` |
| Between page sections | `--space-6` |
| Page padding | `--space-7` / `--space-9` (desktop), `--space-4` (mobile) |

Layout helpers: `.stack` (vertical, gap 12px), `.stack-lg` (gap 16px), `.row` (horizontal wrap, gap 8px), `.media` (avatar + text), `.narrow` (max 720px), `.min-w-0`.

---

## 6. Shape, elevation, motion, layers

**Radius**

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 10px | Inputs, small surfaces, callouts, tooltips, list rows |
| `--radius-md` | 14px | Cards, panels, tables, logo tile, square avatars |
| `--radius-lg` | 20px | Drawer, login card |
| `--radius-full` | 999px | Pills (buttons, chips, nav items, toggles) and circles |

**Borders:** `--border-width` 1px (default) · `--border-width-strong` 2px (checkbox, focus outline) · `--border-width-accent` 3px (callout bar).

**Elevation:** `--shadow-sm` for cards (barely visible; borders do the work) · `--shadow-lg` for floating layers (drawer, toast, tooltip, login card, mobile bars).

**Motion:** `--duration-fast` 120ms (press) · `--duration-base` 150ms (hover, color) · `--duration-slow` 250ms (drawer, mobile menu), easing `--ease-out`. Everything respects `prefers-reduced-motion`.

**Layers (z-index):** `--z-sticky` 30 (mobile bars) · `--z-scrim` 44 · `--z-sidebar` 45 · `--z-overlay` 50 · `--z-drawer` 55 · `--z-tooltip` 60 · `--z-toast` 70.

**Sizes:** icons `--icon-sm` 15 / `--icon-md` 18 / `--icon-lg` 20px; `--size-icon-button` 36px (`-sm` 32px); `--size-icon-circle` 40px; avatars `--size-avatar` 64px / `--size-avatar-sm` 38px; logo `--size-logo` 42 / `-sm` 34 / `-lg` 88px; `--size-checkbox` 24px; dots `--size-dot` 8 / `--size-dot-sm` 6px.

---

## 7. Layout and breakpoints

- Sidebar `--sidebar-width` 252px; content up to `--content-max-width` 1240px; drawer `--drawer-width` 640px; forms `--form-max-width` 720px.

| Breakpoint | What changes |
|---|---|
| ≤ 1280px | Stats in 3 columns (featured card full width); shortcuts in 2 columns |
| ≤ 1100px | Two-column panels stack |
| ≤ 960px | Sidebar becomes a slide-out drawer; top bar + bottom nav appear; plain page background |
| ≤ 700px | Task quick-add wraps to two rows |
| ≤ 600px | Stats in 2 columns; forms in 1 column; drawer full screen; catalog in 1 column |

Media queries can't read CSS variables, so breakpoints are written as numbers in `style.css`. Keep them in sync with this table.

---

## 8. Iconography

- Stroke icons on a 24×24 grid, `stroke-width: 1.8`, round caps and joins, `fill: none`, color from `currentColor`.
- Render with `ic(name)` (`public/js/components.js`) → `<svg class="i">`.
- Available: `visao`, `tarefas`, `preco`, `catalogo`, `insumos`, `gastos`, `pedidos`, `producao`, `ajustes`, `plus`, `menu`, `chevL`, `chevR`, `sun`, `moon`, `auto`, `check`, plus `STAR` (the logo's four-point star, filled).
- Icons in lists sit in a gray circle (`.aic`, `.qa i`). Decorative icons get `aria-hidden="true"` (done by `ic()`).

---

## 9. Components

Each component lists its class, markup, variants and rules. See them live in the [styleguide](styleguide.html).

### Button — `.btn`
```html
<button class="btn primary">Novo pedido</button>
<button class="btn">Exportar</button>
<button class="btn ghost">Cancelar</button>
<button class="btn sm">Editar</button>
<button class="btn danger">Excluir</button>
```
- Variants: default (outlined), `.primary` (accent), `.ghost` (no border), `.danger` (red text), `.armed` (red fill; the confirmation state of a delete), `.sm`.
- Icons: put `ic('plus')` before the label; it's sized automatically.
- `disabled` shows a wait cursor and reduced opacity.
- Rules: one `.primary` per header; destructive actions need two clicks (first click arms the button).

### Icon button — `.icon-btn`
Round 36px button for icon-only actions (close, previous/next month, menu). Always add `aria-label`.

### Link — `.link`
Underlined text button for low-priority actions ("Esqueci minha senha").

### Segmented control — `.seg`
```html
<div class="seg" role="group" aria-label="Mostrar">
  <button aria-pressed="true">Todos <span>5</span></button>
  <button aria-pressed="false">Na fila <span>3</span></button>
</div>
```
- For 2–4 mutually exclusive views. The selected option uses `aria-pressed="true"`. An optional count goes in `<span>`.
- Variants: `.seg.sm` (inside panel titles), `.theme-seg` (full width with icons), `.theme-seg.big`.

### Month picker — `.month`
Previous / month name / next. Clicking the name goes back to the current month (the `<small>` hint appears when you're on another month).

### Field — `.field`
```html
<label class="field">
  <span>Valor pago (R$)</span>
  <input inputmode="decimal">
  <small>Helper text, optional.</small>
</label>
```
- Inputs, selects and textareas share one style; focus shows a dark border and a soft halo.
- Grids: `.fg` (2 columns), `.fg3` (3 columns), `.full` spans the row; 1 column on phones.
- Checkbox: `.check`; add `.align-end` to line it up with inputs in the same grid row.
- Repeating rows (order items, product supplies): `.lrow` with a `.sub` line for the calculated result.

### Chip (tag) — `.chip`
```html
<span class="chip">Botton</span>
<span class="chip good">Ok</span>
<span class="chip warn">Repor</span>
<span class="chip bad">Acabou</span>
<span class="chip blue">Produção</span>
<span class="chip pink">Novo</span>
<span class="chip ex">exemplo</span>
```
- `good` / `warn` / `bad` add the status dot. `blue` is an outlined label (tags, categories). `pink` is the black emphasis tag. `ex` marks sample data.
- The variant names come from the first version of the app (when they were colors). They are kept so existing markup keeps working; think of them as *outline* (`blue`) and *emphasis* (`pink`).

### Count and badge — `.count`, `.badge`
- `.count` next to a panel title ("Precisa de atenção 6"); `.count.hot` when it needs action.
- `.badge` on navigation items (open orders, urgent tasks). Inverts on the active item.

### Panel — `.panel`
The standard card: surface, border, `--radius-md`, 24px padding. Title is an `h2` (Title role); a `<small>` or a `.seg` aligns to the right.

### Stat card — `.kpi`
```html
<div class="kpis">
  <div class="kpi feat"><span>Lucro do mês</span><b>R$ 413,56</b><small>margem 69,6%</small><small class="calc">vendas − peças − taxas</small></div>
  <div class="kpi"><span>Vendas</span><b>R$ 594,50</b><small class="up">▲ 121,2% vs set/26</small></div>
</div>
```
- Label (`span`) → value (`b`, Stat role) → context (`small`).
- `.feat`: the one number that matters most on the screen (accent background). Only one per row.
- `.neg` on `.feat` (or `b.neg`) colors a negative value. `small.up` / `small.down` for changes (arrow + text, no color). `small.calc` shows the calculation.
- `.kpis` grid: featured card wider; `.kpis.auto` for a variable number of cards.

### Table — `.tbl-wrap` + `table`
- Header row on `--color-surface-sunken`, rows separated by borders, hover highlight.
- Main cell: `.tname` (bold) + `.tsub` (caption). Numbers right-aligned with `td.r.num`.
- Row actions: `.row-actions` with `.btn.sm.ghost`. Expandable detail row: `tr.detail`.
- Avatar + text in a cell: `.media` with `.pimg.sm`.
- Tables scroll sideways on small screens (min width 720px).

### Alert list — `.alerts` / `.alert`
```html
<div class="alert">
  <span class="aic">{icon}</span>
  <div class="atx"><b>Pedido #1009 · produzindo</b><span>gabi.m · Shopee</span></div>
  <button class="btn sm">Abrir</button>
</div>
```
- Every alert has the action that resolves it. `.aic.bad` (black circle) for urgent items.
- Empty: `.alldone` ("Tudo em dia…").

### Empty state — `.empty`
Dashed card with a title (`b`), one sentence (`span`) and, when possible, the primary action that fills it.

### Callout — `.note`
One-line explanation under tables. `.note.warn` adds the orange bar for things to fix ("4 pedidos sem nota fiscal").

### Progress / ranking bar — `.hbar`
Label · track · value. `.alt` uses the comparison color; `.rank` gives more room to the label and accepts `.nm` with a title (`.t`) and a caption (`small`). Negative values: `.num.neg`.

### Chart — `svg.chart` + `.legend`
Bars use `--color-chart-1` (main) and `--color-chart-2` (comparison), grid lines `--color-border`, labels 11px subtle; the current period label gets `.is-current`. Legend dots: `.legend i.c1` / `.c2`. Hover areas (`.hit`) carry a `data-tip` tooltip.

### Product card — `.pcard`
Avatar (`.pimg`, round for bottons, `.sq` square for flat products) + title + chips, a spec list (`.ficha`, two columns, `.wide` spans both), and a footer (`.pfoot`) with the print queue (`.queue`) and actions.

### Price breakdown — `.bk` / `.sum`
Table of supplies + a summary column with totals (`.tot`).

### Drawer (forms) — `.overlay` + `.drawer`
Side sheet with header (`.dhead`), scrolling body (`.dbody`) of `fieldset`s with a `legend`, and footer (`.dfoot`) with delete on the left and Cancel/Salvar on the right. Full screen on phones. `Esc` closes it. Live results go in `.preview` (accent box).

### Task item — `.task`
Round checkbox (`.tcheck`), title (`.ttitle`), meta chips (`.tmeta`) and notes (`.tnotes`). `.task.done` strikes the title. Groups: `.tgroup` (`.late` turns the heading red). Quick add: `.quickadd`.

### Navigation — `.side` / `.nav` / `.bnav` / `.mtop`
Sidebar with grouped items (`.ngroup` + overline) and pill-shaped buttons; the active item uses `aria-current="page"`. On ≤ 960px: top bar (`.mtop`) and floating bottom nav (`.bnav`) with the 4 most used screens + "Mais".

### Feedback layers — `#tip`, `.toast`, `.demo-bar`
- Tooltip: any element with `data-tip` (HTML allowed) shows `#tip` on hover. Use it for explanations, never for required information.
- Toast: short confirmation at the bottom ("Salvo", "Pedido adicionado"), auto-hides.
- Demo banner: shown only in demo mode.

### Login — `.login` / `.login-card`
Centered card with logo, title, fields, primary button and a `.link`.

---

## 10. Content guidelines

- UI language: Portuguese (pt-BR), informal "você", short sentences.
- Money: `R$ 1.234,56` (use `brl()`); percentages `69,6%` (`pct()`); dates `dd/mm/aaaa` (`dataBR()`); months `out/26` in compact places and "outubro de 2026" in the month picker.
- Buttons say what happens ("Registrar impressão", "Comprei"), not "OK".
- Explain derived numbers next to them (see the profit card).

## 11. Accessibility

- Contrast (WCAG AA, 4.5:1 for text): `--color-text-subtle` is the lightest text allowed. Light: 4.8:1 on the page, 5.3:1 on cards. Dark: 5.5:1 on the page, 5.1:1 on cards, 4.5:1 on `--color-surface-muted`. Danger text: 4.8:1 / 5.4:1 (light), 5.3:1 or more (dark).
- Status colors are shown as dots (3:1 minimum for graphics: the lightest case, the warning dot on a light chip, is 3.1:1) and always next to words.
- Focus: every interactive element shows a 2px outline (`:focus-visible`). Inputs show a border + halo.
- Toggles use `aria-pressed`, the current page uses `aria-current="page"`, icon-only buttons have `aria-label`, dialogs are `role="dialog"` with `aria-modal`.
- Respect `prefers-reduced-motion`.

## 12. Changing the system

1. Need a new value? Add a **token** in `tokens.css` (primitive first if it's a new color, then a semantic token for each theme).
2. Use the token in `style.css`. No hex colors, `rgba()` or loose font sizes in components.
3. New component? Build it from existing tokens and roles, add it to `docs/styleguide.html` and document it here.
4. Check both themes and the 960px / 600px breakpoints.
