# Arc Agents — Archived Features

This folder contains code that was removed from the live app in June 2026 as part of a deliberate simplification. The app was refocused on **health & wellness only** to make it genuinely useful and shippable rather than sprawling.

Nothing here is deleted — it's all ready to be revived. To restore a feature, copy the relevant file back into `arc-ui/project/`, re-add its `<script>` tag in `Arc Agents.html`, and re-wire it in `app.jsx`.

---

## What's Here

### `phase3-components.jsx`
**Goals & Habits system** — GoalCascade (annual/quarterly/weekly/daily goal tree), HabitTracker (weekly habit grid with localStorage persistence), ProposalCard (Lyra's habit change proposals with approve/modify/decline), FeedbackLoop (weekly reflection entries). Exported: `GoalCascade`, `HabitTracker`, `ProposalCard`, `FeedbackLoop`, `GoalsTab`.

To restore: add `<script type="text/babel" src="phase3-components.jsx?v=...">` to the HTML, add `"goals"` back to `TAB_LIST` in `app.jsx`, add `{tab === "goals" && <GoalsTab />}` to the panel renderer.

---

### `archived-agents.js`
**Career and Life agents** removed from `data.jsx`:

| Agent | Role | Group |
|---|---|---|
| Aria | News · AI + FinTech | Career |
| Kai | Coach · Daily Focus | Career |
| Rex | Planner · 3 Priorities | Career |
| Scout | Learning · Chapter Progress | Career |
| Cleo | Jobs · Match Score | Career |
| Vox | Presence · LinkedIn + GitHub | Career |
| Finn | Finance · Spending Awareness | Life |
| Ember | Home · Chores + Errands | Life |
| Mira | Content · Reading + Media | Life |
| Atlas | Travel · Trips + Leave | Life |
| Ivy | Discovery · Dublin Tonight | Life |
| Zara | Wardrobe · Outfit 1-2-3 | Life |
| Rue | Social · Important Dates | Life |
| Bea | Hobbies · Guitar + Reading | Life |

Also contains: `NEWS_ITEMS` (career-focused tech/finance headlines), `career`/`life` `GROUP_META` colour tokens, and the career-only `SCHEDULE` blocks (AXA deep work, Scout learning block, team sync).

To restore: copy the agent entries back into `AGENTS` in `data.jsx`, add `career`/`life` back to `GROUP_META`, add `NEWS_ITEMS` back, merge the schedule blocks.

---

### `archived-tabs.jsx`
**CareerTab and LifeTab** removed from `tabs.jsx`:

Career UI: `CareerTab` (briefing/coach/plan/learning/jobs/presence sub-tabs), `JobRow`, `SubstackPicks`.

Life UI: `LifeTab` (finance/discover/wardrobe/social/home/travel sub-tabs), `LifeFinance`, `BudgetCell`, `LifeDiscover`, `DiscoverRow`, `LifeWardrobe`, `LifeSocial`, `LifeHome`, `LifeTravel`.

To restore: copy functions back into `tabs.jsx`, add `CareerTab`/`LifeTab` to the `window` export, add `"career"`/`"life"` tabs to `TAB_LIST` in `app.jsx`, add their panel renderings.

---

## Reviving Everything

If you want to bring the full multi-domain OS back:

1. Move `phase3-components.jsx` back to `arc-ui/project/`
2. Merge `archived-agents.js` content back into `data.jsx`
3. Merge `archived-tabs.jsx` functions back into `tabs.jsx`
4. Add the removed tabs back to `TAB_LIST` in `app.jsx`
5. Re-add removed panel renderings in `app.jsx`
6. Re-add the `phase3-components.jsx` script tag in `Arc Agents.html`
7. Bump asset cache-bust version
