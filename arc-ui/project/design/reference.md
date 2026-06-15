# Arc Agents — Design & Engineering Reference

> A reference for Claude Code (or any contributor) **before** modifying the app for production use. Read this end-to-end on first contact; skim sections on later edits.

---

## 1 · What this app is

A mobile-first **personal companion** that surfaces outputs from 28 Python agents (Chapters 1–8) across **6 bottom tabs**. The frontend does **not** run agents — it reads their cached output from Notion (or a Flask `/api/*` endpoint), and renders the right surface at the right moment of the day.

**Core design principle:** the app is a *living briefing*, not a settings panel. State changes through the day, through the cycle, and across moods (light/dark). Agents push cards; the user pulls details. Notifications are timed, not blasted.

---

## 2 · File layout

```
Arc Agents.html          – Entry point. Loads fonts + Babel + every JSX file in order.
styles.css               – ALL styles. Single source of truth for tokens & components.
data.jsx                 – AGENTS list, GROUP_META, DAY_STATES, CYCLE_PHASES, SCHEDULE, NEWS_ITEMS.
                           Pushes them onto `window` so other Babel scripts can see them.
tweaks-panel.jsx         – Vendor starter: TweaksPanel + useTweaks + TweakSlider/Radio/Select/etc.
                           Self-managed visibility via host postMessage protocol.
chat.jsx                 – AgentChat sheet. Image + voice input. Demo reply table.
                           Pushes `AgentChat` onto window.
tabs.jsx                 – Every tab + subtab component, plus Icon, FeedItem, CycleRing,
                           TokenUsage, SubstackPicks, AgentDot, JobRow. Pushes all tab
                           components onto window.
app.jsx                  – Root <App/>. Tweaks defaults, tab keyboard nav, day-state hookup.
                           Mounts to #root.

design/                  – This folder. Reference docs only — never imported.
  reference.md           – You are here.
```

**Rule of thumb when splitting a new file:** components export themselves via `Object.assign(window, { … })` because each `<script type="text/babel">` block gets its own scope after transpile. **Always use distinct names for style/data objects** — never `const styles = {…}` because two files with that name collide and break.

---

## 3 · The atmosphere system — three independent axes

These are the most important concepts in the codebase. Every visual feels alive because three orthogonal data-attributes cascade onto `<div class="device" data-state data-phase data-theme>`:

| Axis | Attribute | Values | Drives |
|---|---|---|---|
| **Time of day** | `data-state` | `morning` / `work` / `afternoon` / `evening` / `winddown` | Base palette warmth, `--deep`, `--time-wash` radial gradient |
| **Cycle phase** | `data-phase` | `menstrual` / `follicular` / `ovulatory` / `luteal` | `--phase-accent`, `--phase-tint`, `--phase-soft`, **`--hero-bg`** (dark cards), cycle-ring stroke, pulse halo |
| **Theme** | `data-theme` | `light` / `dark` | Base BG/surface/text tokens, dark-mode `--hero-bg` variants |

**Resolution order:** base `:root` → `[data-theme]` → `[data-state]` → `[data-theme][data-state]` combos → `[data-phase]` → `[data-theme][data-phase]` combos. All transitions are CSS-eased at ~0.7s (overridden by `[data-motion="off"]` and `prefers-reduced-motion`).

**Where atmosphere is rendered:** the `.device::before` pseudo-element. It composes two radial gradients (phase-tint + phase-soft) plus the `--time-wash` from time-of-day, sits at `z-index: 0`, and content sits at `z-index: 1`.

**Adding a new phase / state / theme:** define every relevant token in the new selector. Don't half-define — leaving `--hero-bg` undefined for a new phase falls back to `var(--deep)` and breaks the visual rhythm.

---

## 4 · Design tokens (CSS custom properties)

All tokens live in `styles.css` under `:root` and the data-attribute selectors. Never inline a hex code in a component — always go through a token.

### Color
| Token | Default | Use |
|---|---|---|
| `--bg` | warm cream | Device + tabbar bg |
| `--surface` | parchment-white | Cards, inputs, tiles |
| `--surface-2` | warm beige | Hover, secondary fills |
| `--border` | soft taupe | Hairline dividers |
| `--border-strong` | darker taupe | Hover borders |
| `--text` | near-black | Body |
| `--text-2` | warm graphite | Secondary body |
| `--muted` | warm grey | Meta labels |
| `--deep` | forest green | Primary action, focus ring, time-of-day driven |
| `--hero-bg` | derived from --deep | Dark hero cards — **phase + theme driven** |
| `--phase-accent` | sage | Cycle ring, pulse, Substack mark, "Why today" emphasis |
| `--phase-tint` / `--phase-soft` | translucent variants | Atmosphere overlay |
| `--terra` / `--sage` / `--amber` / `--lav` / `--blue` / `--teal` / `--gold` | brand accents | Agent group colors via `GROUP_META` (do not mix) |

### Type
- `--font-display`: Cormorant Garamond, 300/400, italic for emphasis. Used for headings, large numbers, hero quotes.
- `--font-mono`: DM Mono. Used for labels, eyebrows, status, timestamps. **Always uppercase + letter-spaced** (`text-transform: uppercase; letter-spacing: 0.1–0.16em`).
- `--font-sans`: DM Sans, 300/400/500. Body copy and UI.

### Scale
- Display numbers: 22–48 px Cormorant italic.
- Section titles: 16–22 px.
- Body: 12.5–14 px DM Sans.
- Labels/meta: 7.5–10.5 px DM Mono uppercase.
- **Never under 11 px for any interactive text.** Hit targets ≥ 44 px.

### Shape
- Cards: 14 px radius. Sub-cards: 10 px. Chips/pills: 999 px. Buttons: 8 px. Status dots: 50%.
- Card padding: 14–20 px. Card gap: 8–10 px. Tab content gutter: 16 px.

---

## 5 · Tab map (where every agent lives)

| Tab | Subtabs | Anchor visual | Agents that surface |
|---|---|---|---|
| **Today** | — | Phase-tinted hero card (morning brief / Kai focus / Eve wind-down) + Sage schedule strip | Aurora, Nova, Sage, Kai, Eve, Pulse, Flora, Cara, Finn, Aria, Ivy, Bea, Luna |
| **Health** | Today · Meals · Fitness · Cycle · Sleep · Care | Flora cycle ring + Aurora vitals | Flora, Nora, Felix, Dusk, Soma, Luna, Cara, Pulse |
| **Career** | Briefing · Coach · Plan · Learning · Jobs · Presence | Cleo dark match-score card | Aria, Kai, Rex, Scout, Cleo, Vox · plus the Substack widget on Presence |
| **Life** | Finance · Discover · Wardrobe · Social · Home · Travel | Finn donut + category bars | Finn, Ivy, Bea, Zara, Rue, Ember, Mira, Atlas |
| **Agents** | — | TokenUsage (collapsed) + Team list (collapsed) | All 28 — full grid + search + group filter inside the collapse |
| **Council** | — | Council weekly quote + Mirror + Lyra approval queue | Mirror, The Council, Lyra |

**New in Ch2** (visually outlined in blue on the Agents grid): **Cara, Soma, Eve, Aurora, Lyra, Pulse, Vera**. See Section 9 for where each appears.

**Vera** is special — she's a floating Quick-Compare button on every tab except Agents. Auto-routes Food / Skin / Supplements / Fitness queries with chips. See `chat.jsx → DEMO_REPLIES.vera`.

---

## 6 · Component patterns

### Feed item (`<FeedItem>`)
The fundamental list unit on Today and inside cards. Tap-to-expand reveals more context + a "Chat with X" action. Anchor color comes from `GROUP_META[agent.group].light` for the icon backdrop and `.color` for the dot.

### Collapsible card (`<details class="collapse-card">`)
Native `<details>`/`<summary>` for accessibility (keyboard, screen reader announces expanded/collapsed automatically). The summary contains a compact one-line "lead" showing key numbers; the body is hidden by default. **Used for: Token Usage, Your Team** on the Agents tab.

### Hero card (`.card.dark`)
A bold dark-on-light statement. Background is `var(--hero-bg)` so it tracks cycle phase. Used for: Morning Brief (Today), Cleo Match Score (Career), Council Weekly (Council).

### Chip / Tag
Always pill-shaped (999 px), 4–10 px horizontal padding, mono uppercase. Use sparingly — they're for status, agent grouping, and topic tags only.

### Chat sheet (`<AgentChat>`)
Slide-up modal with header (agent name + role + close), thread (`role="log" aria-live="polite"`), staged attachment row, recording overlay, and composer (camera button + input + mic/send button). Image input uses native `<input type="file" accept="image/*" capture>`. Voice input fakes a recording timer + waveform — **MediaRecorder is not wired**; replace with real capture before shipping.

### Token usage card
Four stat tiles (Today / Week / Month / All-time) + 7-day bar chart where today's bar uses `--phase-accent`. Numbers are demo data — wire to `/api/usage` reading the Anthropic billing endpoint.

### Substack picks
One pick per day (Mon–Sun) curated from real-feeling publication names (Latent Space, Stratechery, Lenny's, Anthropic blog, Stripe Eng, Cal Newport, Sahil Lavingia). Today's pick is the hero with a "Why today" reasoning line. **The reasoning blends cycle phase + Cleo gap + Aria news + Scout chapter** — that logic lives server-side in production. The frontend just renders.

---

## 7 · Accessibility contract — do not regress

| What | How it's done | Where to be careful |
|---|---|---|
| Keyboard | `<details>` for collapsibles · arrow keys on tab bar · Esc closes chat · Skip-to-content link | Don't replace native `<details>` with a div + onclick. Don't trap focus inside cards. |
| Screen reader | `role="tablist" / tab / tabpanel`, `aria-current`, `aria-selected`, `aria-live="polite"` on chat log, `role="img"` + label on cycle ring | New cards must have a `<div className="lbl">` agent label or an `aria-label` on the section. |
| Focus rings | `:focus-visible { outline: 2px solid var(--deep); }` — universal | Don't `outline: none` anything without replacing the indicator. |
| Motion | `prefers-reduced-motion` honored + `[data-motion="off"]` zeroes out transitions and animations | If you add a CSS animation, make sure it's disabled under `[data-motion="off"] *`. |
| Contrast | Light theme passes WCAG AA on all text/bg pairs. Dark theme uses warm charcoal (NOT pure black). High-contrast Tweak overrides to strict black/white. | Don't change `--text` or `--bg` without re-checking pairs in all three themes. |
| Hit targets | ≥ 44 px on every interactive element. Tab buttons, chips, mic, send. | Don't introduce smaller buttons just because they "fit". |
| Font scale | 85–140 % via `--fs-scale` set on `<html>`. Everything sizes via rem-aware px math. | Don't hard-code `font-size: 12px;` — use the existing scale. |

---

## 8 · Tweaks system (in-design knobs)

`tweaks-panel.jsx` handles the full Tweaks toolbar protocol. **Do not** rewrite its message-listener registration — it's order-sensitive (listener first, then `__edit_mode_available`).

### Adding a new tweak
1. Add a default value to the `TWEAK_DEFAULTS` constant in `app.jsx` (inside the `EDITMODE-BEGIN/END` markers — the host parses this as JSON).
2. Add a control inside `<TweaksPanel>` using `<TweakSlider>`, `<TweakRadio>`, `<TweakSelect>`, `<TweakToggle>`, `<TweakColor>`, `<TweakText>`, or `<TweakNumber>`.
3. In your component, read `tweaks.yourKey` and apply.

### Persistence
`setTweak(key, value)` posts `__edit_mode_set_keys` to the host. The host rewrites the JSON block on disk so the new default survives reload. **The block must remain valid JSON** — double-quoted keys, no trailing commas.

### Current tweaks
- `dayState` — string, drives `data-state`. Cycles the day.
- `cyclePhase` — string, drives `data-phase`. Switches phase atmosphere + content (Flora, Nora, Felix, Cara).
- `theme` — `light | dark`. Drives `data-theme`.
- `fontSize` — 85–140 (%). Maps to `--fs-scale`.
- `contrast` — `normal | high`. Independent of theme.
- `motion` — `on | off`. Independent of OS setting.
- `showVeraFab` — boolean. Hides the floating Vera button.

---

## 9 · The new Ch2 agents — surfaces & contracts

| Agent | Surface(s) | Trigger | Notion DB it reads | What you should NOT break |
|---|---|---|---|---|
| **Aurora** | Today morning hero · Health → Today vitals card | 6:30 am | Apple Health (synthesizes) | Aurora has no chat — by design. Don't add one. |
| **Cara** | Today morning feed · Health → Care subtab | 6:35 am | Personal Care Cupboard | PAO + expiry math is server-side. The UI just displays "5 mo PAO left" — don't compute in JS. |
| **Soma** | Health → Sleep subtab · Today health feed | 6:30 am | Apple Health 7-day window | Soma is descriptive (patterns). Dusk is prescriptive (tonight). Don't merge them. |
| **Eve** | Today evening hero (after 7 pm) · Agents chat | 8 pm | Apple Health, Habits, Goals | Eve is a *conversation*, not a card. The hero opens the chat directly. |
| **Lyra** | Council → habit approval queue | Sun 8 pm | Habits + Goals + Feedback Log | Approve / Reject / Modify must hand back to a writer endpoint. Don't fire-and-forget. |
| **Pulse** | Today feed (signal-driven) · Health Today | Mid-day, conditional | Apple Health current | Pulse must be allowed to fire **zero times** on a quiet day. Silent days are deliberate. |
| **Vera** | Floating "Ask Vera" FAB on every tab except Agents · Agents grid | On demand | All shelf + goal data | The route chips ("Food / Skin / Supplements / Fitness") matter — don't remove them; they pin context depth. |

---

## 10 · Data interface (Notion → app)

The frontend assumes a small JSON contract per agent. Production: the Flask `/api/today` endpoint composes these from Notion + caches them.

```jsonc
{
  "agent": "aurora",
  "ran_at": "2025-05-25T06:30:12Z",
  "status": "ok",                  // ok | slow | failed | idle
  "duration_ms": 1840,
  "tokens": { "input": 412, "output": 218 },
  "output": {                      // shape varies per agent
    "phase": "follicular",
    "day": 6,
    "energy_line": "High energy, focus mode on",
    "priorities": [/* 3 strings */],
    "breakfast": "Oats + kefir",
    "workout": "Strength · 40m"
  }
}
```

**Status dots** in the Agents grid: read from `status`. Last-run label: humanise `ran_at`.

**Token usage card** expects an aggregate endpoint:
```jsonc
{
  "today_tokens": 14300,
  "week_daily": [10200, 13800, 15600, 11900, 16400, 9800, 14300],
  "month_tokens": 412800,
  "lifetime_tokens": 2410000,
  "model": "claude-haiku-3-5"
}
```

**Cycle phase** must be authoritative server-side — the frontend treats it as a string from the API. Don't compute phase from the current date in JS; Flora cross-references Apple Health cycle day + wrist temp delta on the backend.

---

## 11 · What's mocked vs real

Before production:
- [ ] **Demo replies in `chat.jsx`** — replace `DEMO_REPLIES` lookups with calls to `/api/chat/:agent`. Vera's auto-routing logic moves server-side; the chips just tag intent.
- [ ] **Voice recording** — currently fakes a timer. Wire MediaRecorder, upload as multipart, transcribe via Anthropic or Whisper.
- [ ] **Image attach** — currently just shows the user's local FileReader data URL. Production must upload to a temp bucket + send the URL to the chat endpoint.
- [ ] **Schedule "now" line** — driven by the `dayState` tweak in this prototype. Production must use `new Date()` or a server-provided current time.
- [ ] **Token usage numbers** — hardcoded demo data in `TokenUsage()`. Wire to the Anthropic billing endpoint + cache locally.
- [ ] **Substack queue** — `SS_PICKS` is hardcoded. Production must call a curation endpoint that reads Cleo's gap, Aria's news, Scout's chapter, and the current phase to choose 7 picks.
- [ ] **Sample agent counts** — `AGENTS` array in `data.jsx` is the demo set. The Notion API call must return live status for each.

---

## 12 · Don't-touch list

These are easy to break by accident:

1. **`window.*` assignment at the bottom of each JSX file** — every component shared across files must be assigned. Lose one and you'll get `ReferenceError: X is not defined`.
2. **`color: var(--text)` on `.device`** — body inheritance does NOT carry the dark-mode override across the device boundary. Removing this re-introduces the invisible-greeting bug.
3. **TweakSection uses `label`, not `title`** — the starter's API uses `label`. Don't normalize it.
4. **Babel/React script integrity hashes in `Arc Agents.html`** — pinned versions + hashes. Bumping React requires new hashes.
5. **`<deck-stage>` is NOT used here** — this is an app, not a deck. Don't wrap content in deck primitives.
6. **The EDITMODE JSON block in `app.jsx`** — must remain valid JSON for tweak persistence. No comments, no trailing commas.
7. **`.card.dark` reads `--hero-bg`** — not `--deep` directly. Phase shifting depends on this.

---

## 13 · Production migration checklist

When porting this prototype to React Native + Expo (or a PWA in production-shaped React):

1. Move every `*.jsx` Babel file into proper modules (`.tsx` with imports).
2. Replace the `window.*` shimming with explicit `import` / `export`.
3. Replace `<details>` collapsibles with an accessible Disclosure component (React Native doesn't ship one; build it with `aria-expanded`).
4. Replace MediaRecorder with `expo-av` (React Native) or keep it (PWA).
5. Replace the file input + FileReader with `expo-image-picker` or the PWA File API.
6. Replace `data.jsx` with TanStack Query hooks (`useTodayFeed`, `useAgent`, `useTokenUsage`) calling the Flask backend.
7. Move all CSS custom properties to a theme provider; dark/light/contrast/phase all become context values that re-render appropriately.
8. The phase/state atmosphere stays — it's the soul of the app. Implement via a top-level `<AtmosphereProvider>` that sets the same data-attributes (or styled-components theme) on the root view.
9. Push notifications via `expo-notifications` (RN) or the Web Push API (PWA). Schedule from the times in `Chapter 2 — Health & Life OS.html`.
10. Persistent state: cache last Notion fetch in AsyncStorage / IndexedDB so the app is usable offline. Show "last updated" timestamp under the appbar.

---

## 14 · Quick reference — adding things

### New agent
1. Add to `AGENTS` in `data.jsx` with `group` set to one of `GROUP_META`'s keys.
2. If it's conversational, add a `DEMO_REPLIES[id]` entry in `chat.jsx` with at least `default`.
3. Decide its surface — feed item on Today? Subtab card on Health/Career/Life? Add the JSX in `tabs.jsx`.
4. If new in Ch2+, set `isNew: true` so the blue outline + NEW badge appears on the Agents grid.

### New tab
1. Add an entry to `TAB_LIST` in `app.jsx` (id + label + icon name).
2. Add the matching SVG path to `Icon` in `tabs.jsx`.
3. Write a `<NewTab/>` component in `tabs.jsx`, export to `window`.
4. Add the conditional render in `app.jsx`'s `<main className="tabpanels">`.

### New collapsible card
Wrap the body in `<details className="card collapse-card">` with `<summary>` containing `.collapse-lead` (label + summary line) and a `<Chevron/>`. The existing CSS handles open/close + rotation.

### New cycle phase content surface
Pass `phase` (string id) or `ph` (full object) down through props. Look up via `CYCLE_PHASES.find(p => p.id === phase)`. Use the `ph.energy`, `ph.note`, `ph.nora`, `ph.felix`, `ph.cara` strings directly — extend the data structure if a new domain comes online.

---

## 15 · Naming conventions

- React components: PascalCase, named exports onto `window`.
- Tweak keys: camelCase string keys in EDITMODE JSON.
- CSS classes: kebab-case, prefixed by area (`feed-`, `tok-`, `ss-`, `agent-`, `sched-`, `chip-`).
- Data attributes on `.device`: lowercase noun (`data-state`, `data-phase`, `data-theme`, `data-motion`, `data-contrast`).
- Agent IDs in `AGENTS`: short lowercase (`nora`, `vera`, `cara` — never `nora-agent` or `Nora`).

---

*Last updated: chat composer image+voice input, collapsible Agents tab, dark mode, phase-driven hero cards, Substack daily picks.*
