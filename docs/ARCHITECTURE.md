# Arc Agents — Technical Architecture

## System Overview

```
User Browser (SPA)
├── React 18 UMD + Babel (JSX transpilation)
├── 16 localStorage stores (pantry, meals, schedule, etc.)
├── Token tracker (real usage monitoring)
└── UI: 5 tabs (Today, Health, Life, Agents, Council)
       │
       ├─→ /api/health (read cycle phase, health log)
       ├─→ /api/context/<agent> (system prompt + domain context)
       ├─→ /api/chat (streaming, Claude Haiku)
       ├─→ /api/synthesize (Aurora/Council synthesis)
       ├─→ /api/parse-entry (Tell Arc NL router)
       ├─→ /api/macros (ingredient nutrition lookup)
       ├─→ /api/meals/parse-photo (vision: meal snapping)
       ├─→ /api/pantry/parse-receipt (vision: bill scanning)
       ├─→ /api/sheets/* (Google Sheets sync, optional)
       └─→ /api/calendar/* (Google Calendar sync, optional)
       │
       └─→ Vercel (single Flask serverless function)
           │
           ├─→ Claude Haiku API (multi-agent, synthesis)
           ├─→ Google Sheets API (optional)
           └─→ Google Calendar API (optional)
```

## Frontend Architecture

### Core Principle: No Build Step

Arc uses **React 18 UMD + Babel Standalone**. The app is literally:
- `Arc Agents.html` (one HTML file)
- `app.jsx`, `chat.jsx`, `tabs.jsx`, etc. (JSX files included as `<script type="text/babel">`)
- `styles.css` (single CSS file, class-scoped)
- `manifest.json` (PWA manifest)

**Why?**
- Zero dependencies to manage
- Instant development loop (edit JSX → refresh → see change)
- No webpack, no build step, no compiler errors
- Browser transpiles JSX on the fly

**Constraint**: No styled-jsx (Babel standalone doesn't support it). All CSS goes in `styles.css`.

### File Structure

```
arc-ui/project/
├── Arc Agents.html          # Root: loads React UMD, Babel, all JSX files, manifest, icon
├── app.jsx                  # Root component: 5-tab layout, Settings modal
├── chat.jsx                 # Modal chat UI: per-agent, streaming API, localStorage injection
├── data.jsx                 # Constants: AGENTS (15 active + meta), CYCLE_PHASES, SCHEDULE sample, DAY_STATES
├── health-store.jsx         # Health log store: HealthLogForm, daily vitals, currentDayState(), deriveCycle()
├── meal-store.jsx           # Meals + recipes: NUTRITION_DB, sumMacros, getDailyMacros, addRecipe
├── pantry-store.jsx         # Pantry items: addPantryItem, getPantryItems, cyclePantryStatus
├── grocery-store.jsx        # Weekly grocery list: addGroceryItem, toggleGroceryItem, currentWeekOf
├── schedule-store.jsx       # Schedule + chores + supplements: getScheduleForWeek, buildDayPlan, ChoreEditRow
├── work-store.jsx           # Day type + work stamps: getDayType, setDayType, calcHoursWorked
├── skincare-store.jsx       # Cupboard: getRoutine(AM/PM), getExpiringSkincare, PAO calc
├── symptoms-store.jsx       # Daily symptoms: logSymptom, getSymptomsForDate, phase-day tagging
├── bloodtest-store.jsx      # Blood markers: addBloodTest, getLatestByMarker, trend arrows
├── body-store.jsx           # Weight + measurements: getLatestBody, getBodyTrend
├── water-store.jsx          # Hydration: logWaterMl, getTodayWaterMl, 7-day history
├── token-store.jsx          # ★ Token usage tracker: wraps fetch, captures usage from /api/* responses
├── shop-store.jsx           # Shopping prefs + ingredient intel: addShopRating, addIngredientEntry
├── sync-store.jsx           # Google Sheets + Calendar: syncAllToSheets, restoreFromSheets, scheduleInCalendar
├── arc-context.jsx          # ★ Shared brain: buildArcSnapshot(), snapshotText(), buildArcTrends(), buildAdherence()
├── tell-arc.jsx             # Universal NL router: POST /api/parse-entry → confirm → _applyArcAction
├── tabs.jsx                 # UI: TodayTab, HealthTab (7 sub-tabs), LifeScheduleTab, AgentsTab, CouncilTab
├── tweaks-panel.jsx         # Settings UI primitives: TweakSection, Toggle, Radio
├── health-trackers.jsx      # UI for symptoms, blood tests, body
├── phase4-components.jsx    # PersonalCareCupboard, AppleHealthData (legacy)
├── pantry-manager.jsx       # PantryManager, QuickAddForm, ReceiptParser
├── styles.css               # All styling: tabs, modals, cards, forms, responsive, dark mode
├── manifest.json            # PWA manifest (installable home-screen)
├── icon.svg                 # PWA + home-screen icon
└── _archive/                # Career/life code (not loaded)
```

### The Arc Context System (Shared Brain)

**`arc-context.jsx`** is the glue that makes multi-agent coordination work:

```javascript
// buildArcSnapshot() reads all 16 stores and returns a normalized object:
{
  today: "2026-06-15",
  phase: "Luteal",
  health: { sleep: 7, hrv: 55, resting_hr: 62, steps: 12000 },
  meals: [ { name: "Oatmeal", macros: { kcal: 350, protein: 12, ... } }, ... ],
  pantry: [ { name: "Eggs", qty: 6, unit: "count", ... }, ... ],
  schedule: [ { time: "08:00", label: "Morning routine", ... }, ... ],
  supplements: [ { name: "Magnesium", taken: true, phase: "Luteal", ... }, ... ],
  workout: { done: true, type: "HIIT", duration: 30, feedback: "🟢" },
  water: { logged_ml: 1800, goal_ml: 2000 },
  // ... 10 more domains
}

// snapshotText() serializes it for LLM injection:
"Today is 2026-06-15 (Luteal phase). Sleep: 7h, HRV: 55, HR: 62 BPM...
Meals today: 1800 kcal, 95g protein. Pantry has eggs (6), yogurt (0)...
Schedule: 8:00 Morning routine, 9:00 Workout, 12:00 Lunch...
Water: 1800/2000ml logged..."

// buildArcTrends() computes 7/28-day patterns:
{
  sleep: { avg_7d: 6.8, trend: "↓", pattern: "weekend later" },
  protein: { avg_7d: 95, trend: "↑", phase_fit: "good for luteal" },
  workouts: { count_28d: 12, avg_intensity: "medium", recovery: "stressed" },
  symptoms: { top_3: ["bloating", "fatigue", "low-mood"], phase_correlation: 0.92 },
}

// buildAdherence() computes live completion stats:
{
  supplements_today: 8/9,
  chores_week: 12/19,
  water_percent: 90,
  health_logged_days: 7/7,
}
```

Every agent receives `snapshotText()` as part of their system prompt. This is the **single source of truth** for cross-domain awareness.

### Data Flow for Chat

```
User opens chat (Nora) →
  chat.jsx calls GET /api/context/nora →
  API returns { system_prompt, context_text, model, usage_tracking_enabled }
  chat.jsx injects localStorage (pantry, meals) as client_context
  User sends message →
  chat.jsx calls POST /api/chat { agent_id, message, system_prompt, context_text, client_context }
  API streams Claude response back
  Token count captured in response.usage → token-store.jsx updates arc-tokens-v1
  Message logged to chat history (localStorage)
```

## Backend Architecture

### Single Flask Serverless Function

`api/index.py` handles everything:

```python
@app.route('/api/chat', methods=['POST'])
def chat():
    """Stream chat responses from Claude"""
    data = request.json
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=data['system_prompt'],
        messages=[{"role": "user", "content": data['message']}],
        stream=True,
    )
    return stream_response(response)

@app.route('/api/context/<agent_id>', methods=['GET'])
def get_context(agent_id):
    """Return system prompt + domain context for an agent"""
    if agent_id not in CONTEXT_BUILDERS:
        return {"error": "unknown agent"}, 404
    builder = CONTEXT_BUILDERS[agent_id]
    return builder.build()  # calls specific function per agent

@app.route('/api/synthesize', methods=['POST'])
def synthesize():
    """Aurora (morning) or Council (evening) synthesis"""
    data = request.json
    kind = data['kind']  # "aurora" or "council"
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        system=SYNTHESIS_PROMPTS[kind],
        messages=[{"role": "user", "content": f"Snapshot:\n{data['snapshot']}\nTrends:\n{data['trends']}"}],
    )
    return {
        "text": response.content[0].text,
        "kind": kind,
        "usage": _usage(response),
    }

@app.route('/api/parse-entry', methods=['POST'])
def parse_entry():
    """Tell Arc NL router: parse arbitrary text into actions"""
    data = request.json
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=_TELL_ARC_SYSTEM,  # schema-aware system prompt
        messages=[{"role": "user", "content": data['text']}],
    )
    # Response is JSON: {actions: [{store, summary, data}, ...]}
    return json.loads(response.content[0].text)

# ... plus /api/macros, /api/meals/parse-photo, /api/pantry/parse-receipt, etc.
```

### Data Builders

Each agent has a context builder function:

```python
CONTEXT_BUILDERS = {
    'nora': _context_nora,      # Returns: {system_prompt, context_text}
    'felix': _context_felix,    # Reads health_log.json, cycle phase
    'flora': _context_flora,    # Returns cycle phase + guidance
    'vera': _context_vera,      # Meta-agent, sees all context
    # ... 11 more
}

def _context_nora():
    phase = get_cycle_phase()  # From health_log.json
    return {
        "system_prompt": NORA_SYSTEM,  # Specialized prompt
        "context_text": f"Today is {datetime.now().date()}. Cycle phase: {phase}. [Guidance for {phase} phase]",
        "model": "claude-haiku-4-5-20251001",
    }
```

### Health Data Pipeline

```
health_log.json (manual daily log)
    │
    ├─→ utils/apple_health_reader.py (reads JSON)
    │   └─→ get_today()
    │   └─→ get_health_log()
    │   └─→ get_cycle_phase() [derived from period_start date]
    │
    └─→ api/index.py
        └─→ /api/health → returns { sleep, hrv, hr, steps, symptoms, ... }
        └─→ /api/context/<agent> → injects into system prompt
```

**Note**: Web app uses `arc-health-v1` (browser localStorage). CLI agents use `health_log.json`. They don't sync; choose one.

### Token Tracking

Every API endpoint that calls Claude returns a `usage` field:

```python
def _usage(response):
    """Extract token counts from Claude response"""
    return {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }

# Every endpoint does:
response = client.messages.create(...)
return {"data": result, "usage": _usage(response)}
```

Frontend's `token-store.jsx` wraps `fetch()` to capture this:

```javascript
const originalFetch = window.fetch;
window.fetch = async (url, options) => {
  const response = await originalFetch(url, options);
  if (url.startsWith('/api/') && response.ok) {
    const json = await response.json();
    if (json.usage) {
      recordTokens(json.usage);  // Updates arc-tokens-v1
    }
  }
  return response;
};
```

## Multi-Agent Coordination

### The Context Injection Pattern

**Without explicit function-calling or daisy-chaining**, agents coordinate via shared context:

```
1. buildArcSnapshot() reads all 16 stores
2. Every agent's system prompt includes snapshotText()
3. Agent A (Nora) makes a recommendation
4. Agent B (Felix) makes a recommendation
5. If they conflict, Vera (meta-agent) sees both snapshots + reads the conflict
6. Vera decides: which takes priority? (e.g., "rest day" > "HIIT")
```

**Example: Nora vs. Felix Conflict**

Nora says: "You need 2000 kcal + 120g protein today (Luteal phase)"  
Felix says: "Rest day due to low HRV — light workout only"

User sees both, but Council synthesis emphasizes: "Rest today (HRV is low), eat a bit less (recovery phase), focus on anti-inflammatory foods"

### Agent Roles

| Agent | Role | Reads | Outputs |
|-------|------|-------|---------|
| **Nora** | Nutrition | Meals, pantry, cycle phase, macro goals | Meal recommendations, grocery ideas, phase-fit recipes |
| **Felix** | Fitness | Workouts, sleep, HRV, cycle phase, feedback history | Workout recommendations, intensity/duration, recovery tips |
| **Flora** | Cycle | Health log, period_start, symptoms | Phase prediction, hormon guidance, supplement prioritization |
| **Cara** | Care | Skincare, cycle phase, expiry | AM/PM routines, timing, expiry alerts |
| **Luna** | Wellness | Sleep, mood, energy, stress | Recovery recommendations, stress relief, energy optimization |
| **Eve** | Symptoms | Symptoms log, cycle phase | Symptom interpretation, phase correlation, when to worry |
| **Scout** | Shopping | Pantry, grocery, shop ratings, ingredient intel | Store recommendations, price checks, anti-waste tips |
| **Vera** | Meta | All context | Disambiguation, conflict resolution, priority weighting |
| **Aurora** | Synthesis | All context + trends | Morning brief (5 actionable items, personalized) |
| **Council** | Synthesis | All context + trends + adherence | Evening review (insights + patterns + gaps) |
| **Lyra** | Trends | Historical data, 7/28-day patterns | Trend bullets (what changed, what's working) |
| **Mirror** | Adherence | Daily logs, targets | Completion stats, gaps, improvement areas |
| **Pulse** | Vitals | Health log (sleep, HR, HRV, steps) | Vital trends, anomalies, recovery status |
| **Dusk** | Sleep | Sleep history, mood, stress | Sleep quality scoring, recovery needs |
| **Halo** | Wellbeing | All health + mood + energy | Holistic wellness assessment, priority actions |

## API Endpoints

| Endpoint | Method | Input | Output | Notes |
|----------|--------|-------|--------|-------|
| `/api/health` | GET | — | `{sleep, hrv, hr, steps, cycle_phase}` | From health_log.json |
| `/api/context/<agent>` | GET | `agent_id` | `{system_prompt, context_text}` | Per-agent context builder |
| `/api/chat` | POST | `{agent_id, message, system_prompt, context_text}` | Stream of text | Claude Haiku, streaming |
| `/api/synthesize` | POST | `{kind, snapshot, trends, phase}` | `{text, kind, usage}` | Aurora or Council |
| `/api/parse-entry` | POST | `{text}` | `{actions:[{store, summary, data}]}` | Tell Arc router |
| `/api/macros` | POST | `{ingredients:[{name, qty, unit}]}` | `{macros:[{name, kcal, protein, ...}]}` | Claude vision + lookup |
| `/api/meals/parse-photo` | POST | `{image_base64, mime_type}` | `{name, ingredients, type}` | Vision: meal snapping |
| `/api/pantry/parse-receipt` | POST | `{image_base64, mime_type}` | `{items:[{name, price_eur, qty, ...}]}` | Vision: bill scanning |
| `/api/sheets/seed` | POST | — | `{seeded: true}` | Writes seed data to Google Sheets |
| `/api/sheets/sync` | POST | `{store, data}` | `{synced: true}` | Pushes one store to Sheets |
| `/api/sheets/load` | GET | — | `{stores: {...}}` | Pulls all stores from Sheets |
| `/api/calendar/events` | GET | — | `{events:[{title, date, time, eventId}]}` | Next 14 days |
| `/api/calendar/event` | POST | `{title, date, time, duration, eventId?}` | `{eventId, link}` | Create/update |
| `/api/calendar/event/<id>` | DELETE | — | `{deleted: true}` | Remove event |

## localStorage Schema

| Store | Key | Schema | Max Size | Purpose |
|-------|-----|--------|----------|---------|
| Health | `arc-health-v1` | `{entries: [{date, sleep_h, hrv, hr, ...}]}` | 500 entries | Daily vitals |
| Pantry | `arc-pantry-v1` | `{items: [{id, name, qty, unit, bought_date, ...}]}` | 500 items | Pantry inventory |
| Meals | `arc-meals-v1` | `{meals: [{date, meals:[...]}], macro_goals: {...}}` | 500 meal entries | Daily meal log + goals |
| Recipes | `arc-recipes-v1` | `{recipes: [{name, ingredients:[...], macros, vegetarian}]}` | 200 recipes | Recipe templates |
| Groceries | `arc-groceries-v1` | `{week_of, items: [{name, checked, ...}]}` | 1 week | Weekly grocery list |
| Schedule | `arc-schedule-v1` | `{items: [{date, time, label, category, duration, ...}]}` | 200 items | Weekly schedule |
| Chores | `arc-chores-v1` | `{chores: [{id, label, frequency, dayType, ...}]}` | 200 chores | Habit tracking |
| Supplements | `arc-supplements-v2` | `{supplements: [{name, dose, phases, timing, ...}], taken: {...}}` | 100 supplements | Cycle-aware, timing-aware |
| Skincare | `arc-skincare-v1` | `{products: [{name, category, pao, expiry, ...}]}` | 100 products | AM/PM routines, expiry |
| Workouts | `arc-workouts-v1` | `{workouts: [{date, type, duration, intensity, feedback}]}` | 200 workouts | Workout log + feedback |
| Symptoms | `arc-symptoms-v1` | `{entries: [{date, symptom, severity, ...}]}` | 500 entries | Daily symptom tracking |
| Blood Tests | `arc-bloodtests-v1` | `{tests: [{date, marker, value, range_min, range_max, trend}]}` | 200 tests | Blood marker history |
| Body | `arc-body-v1` | `{entries: [{date, weight_kg, measurements}]}` | 200 entries | Weight + body metrics |
| Water | `arc-water-v1` | `{days: {YYYY-MM-DD: {entries, totalMl}}, defaultBottleMl}` | 90 days | Hydration history |
| Shops | `arc-shops-v1` | `{ratings: [{item_id, shop, rating, ...}]}` | 500 ratings | Shopping preferences |
| Ingredient Intel | `arc-ingredient-ratings-v1` | `{entries: [{name, store, price, quality, taste, ...}]}` | 500 entries | Price + quality intel |
| Work | `arc-work-v1` | `{dayType: {...}, stamps: {YYYY-MM-DD: {loginTime, ...}}}` | 365 days | Work tracking |
| Tweaks | `arc-tweaks-v1` | `{theme, accent_color, units, ...}` | 1KB | Settings |
| Synthesis Cache | `arc-synth-council`, `arc-synth-aurora` | `{date, text}` | 2KB each | Daily synthesis (1 per day) |
| Tokens | `arc-tokens-v1` | `{days: {YYYY-MM-DD: {input, output, calls}}}` | 365 days | Real token usage tracking |
| Sync Status | `arc-sync-status-v1` | `{lastSync, lastRestore, errors, autoSync}` | 1KB | Cloud sync metadata |
| Macro Goals | `arc-macro-goals-v1` | `{base, goals, phase_modifiers, refined}` | 5KB | Dynamic macro config |
| Purchase Log | `arc-purchase-log-v1` | `{entries: [{name, date, phase, weekOf}]}` | 50 entries | Grocery purchase recall |

---

## Deployment

### Local Development

```bash
python api/index.py
# Runs on http://localhost:5000
# Serves both API (/api/*) and SPA (/)
```

### Vercel Deployment

```bash
vercel
# Detects Flask in api/index.py
# Routes all traffic through api/index.py
# Environment variables: ANTHROPIC_API_KEY, GOOGLE_SHEETS_ID, etc.
```

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional (Google Sheets sync)
GOOGLE_SHEETS_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"..."}'
GOOGLE_CALENDAR_ID=your_email@gmail.com

# Demo mode (for testing)
DEMO_MODE=false
```

---

## Performance & Constraints

| Constraint | Value | Mitigation |
|-----------|-------|-----------|
| localStorage size | 5-10 MB | Cap stores at 500 items, old data archived |
| API response time | 500-2000ms | Stream responses, cache synthesis (1/day) |
| Token budget | Haiku 4.5 limits | Lean context (snapshot ~2KB), short prompts |
| Number of agents | 15 | Vera coordinates, no exponential calls |
| Schedule reorder latency | Should be <100ms | HTML5 drag + swap (client-only) |
| Daily synthesis calls | 2 (Aurora + Council) | Cached in localStorage, 1 call per day per kind |

---

## Security & Privacy

- **No user database**: all data stays in browser localStorage
- **No auth**: assumes single-user (personal device)
- **HTTPS only in production** (Vercel auto-provides)
- **API key** in environment (never exposed to frontend)
- **Demo data clearly marked** (different styling, watermark on cards)
- **No telemetry** (just your API usage via token tracking)

See [`PRIVACY.md`](PRIVACY.md) for detailed privacy analysis.
