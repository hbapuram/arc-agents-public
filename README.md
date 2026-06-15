# Arc Agents — AI-Powered Lifestyle Orchestration

> A personal health & wellness companion that uses multi-agent AI to synthesize fragmented health data into actionable intelligence. Open-source, privacy-first, built entirely in the browser.

![version](https://img.shields.io/badge/version-20260615-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![python](https://img.shields.io/badge/python-3.9+-blue) ![react](https://img.shields.io/badge/react-18-blue)

---

## The Problem

You have sleep data, cycle data, meal logs, workout history, supplements, symptoms, blood markers. Each sits in a different app or spreadsheet. None of them talk to each other.

You want:
- *"Given my cycle phase + sleep quality + upcoming workout, what should I eat and when?"*
- *"My supplements + skincare routine aren't working together. What's wrong?"*
- *"Show me the actual trend—not just today's data, but what does the pattern say?"*

Existing apps can't do this. They're silos. **Arc Agents can.**

---

## What It Does

Arc is a **React SPA + Flask API** that orchestrates 15 specialized AI agents across health domains:

### Core Features

**📊 Cross-Domain Intelligence**
- **Aurora** (morning brief): synthesizes sleep + cycle + upcoming workouts → personalized guidance
- **Council** (daily review): aggregates trends across meal adherence, training load, symptoms, sleep patterns → strategic insights
- **Vera** (meta-agent): coordinates between specialized agents, handles disambiguation

**🔄 Domain-Specific Agents** (each reads localStorage + cross-domain context)
- **Nora** (nutrition): phase-aware recipes, macro goals, pantry-first meal planning, purchase recall
- **Felix** (fitness): workout recommendations based on HRV + sleep + cycle phase + feedback loop
- **Flora** (cycle): hormonal pattern tracking, phase detection, symptom correlation
- **Cara** (care): skincare/haircare/dental routines (AM/PM), expiry/PAO tracking, timing awareness
- **Soma** (sleep): sleep quality scoring, recovery optimization
- **Luna** (wellness): stress, energy, recovery synthesis
- **Eve** (symptoms): daily symptom logging, severity tracking, cycle-day correlation
- **Scout** (shopping): ingredient intelligence, store preferences, bill scanning → anti-waste optimization
- **Plus 6 more** (Lyra, Mirror, Pulse, Dusk, Halo, Nova) for specialized synthesis & analysis

**📱 Data Layers** (all localStorage, privacy-first)
- **Health log**: daily vitals (sleep, HRV, resting HR, steps, symptoms, blood tests, body metrics)
- **Meal tracking**: recipes, macros, phase-fit scoring, ingredient sourcing
- **Pantry + Grocery**: purchase history, ingredient intelligence (price/quality/store ratings)
- **Supplements**: cycle-phase aware, meal-timing, interactions, stock tracking
- **Schedule + Chores**: AI-generated day plans, drag-to-reorder, time-conflict warnings
- **Skincare**: AM/PM routines, expiry alerts, category grouping
- **Work tracker**: day-type tagging (Office/WFH/Day off), time stamps, hours calculation
- **Water tracker**: daily hydration with 7-day trends

**🧠 AI Features**
- **Photo intelligence**: "Snap meal" (vision) → ingredient extraction; "Scan bill" (vision) → item+price parsing
- **NL input** ("Tell Arc"): type *any* text → AI router → dispatches to correct store (meal logged, supplement taken, symptom noted, etc.)
- **Dynamic macro goals**: adjusts daily targets by phase, workout intensity, symptoms
- **Meal tweaks**: weekly recipe adjustments via AI based on past logs + preferences
- **Token usage tracking**: real-time transparency on API costs

---

## Why This Matters

Most health apps are **collection engines**—they gather data and show you dashboards. Arc is a **synthesis engine**:

1. **It understands context**. Your cycle phase changes what workouts make sense, what meals fit your macros, which supplements to prioritize.
2. **It connects dots**. Your sleep quality predicts tomorrow's mood and workout capacity. Your supplement timing affects absorption. Your store preferences optimize your shopping.
3. **It surfaces patterns**. Council doesn't just tell you today's calories—it shows you the 7/28-day trend, adherence gaps, and what actually changed.
4. **It's transparent about AI**. Every API call is tracked and visible. You see the token cost, you can audit the agent prompts.

---

## Technical Foundation

### Architecture

```
arc-agents/
├── api/
│   └── index.py            # Flask serverless: /api/* routes + static SPA serving
├── arc-ui/project/
│   ├── Arc Agents.html     # SPA shell (React 18 UMD + Babel, no build step)
│   ├── app.jsx             # Root: 5-tab app (Today/Health/Life/Agents/Council)
│   ├── chat.jsx            # Modal chat sheets (per-agent, live Anthropic API)
│   ├── arc-context.jsx     # Shared brain: buildArcSnapshot(), trend synthesis, adherence
│   ├── *-store.jsx         # 16 localStorage stores (pantry, meals, supplements, etc.)
│   ├── tabs.jsx            # UI: schedule, chores, water tracker, Health sub-tabs
│   ├── styles.css          # Single file, class-scoped (Babel-standalone incompatible with styled-jsx)
│   └── manifest.json       # PWA manifest (installable home-screen app)
└── agents/                 # Standalone Python CLI agents (optional, for desktop automation)
```

### Stack

- **Frontend**: React 18 (UMD, no build), Babel standalone (JSX transpilation in browser)
- **Backend**: Flask (serverless on Vercel)
- **AI**: Claude Haiku 4.5 (via Anthropic API, token-transparent)
- **Data**: Browser localStorage (16 stores, ~5MB total, demo data included)
- **Deployment**: Vercel (single serverless function)
- **Integration**: Google Sheets + Calendar (optional sync layer)

### Key Design Decisions

**No build step**: React UMD + Babel standalone means the app is literally HTML + JSX + CSS. Faster development, instant preview, no webpack bloat.

**localStorage-first**: All personal data lives in your browser. Vercel API is stateless, just routes chat to Claude. No user database, no privacy worries.

**Multi-agent coordination**: Each agent has a specialized role + full cross-domain context (via `snapshotText()`). They don't call each other; they receive the same context and Vera (meta-agent) coordinates disputes.

**Real constraints**: Built pragmatically—touch-friendly UI for iOS, localStorage size limits (500-item caps on logs), offline-first architecture.

---

## Getting Started

### Prerequisites

- Node.js 16+ (for local dev server only; production is serverless)
- Python 3.9+ (for running the Flask API locally)
- `ANTHROPIC_API_KEY` (your Claude API key)

### Live Demo

**[View the landing page →](https://hbapuram.github.io/arc-agents-public/demo-landing.html)** 

(Architecture, all 15 agents, integration details, tech stack, and how to get started)

### Local Setup

```bash
# Clone this repo
git clone https://github.com/yourusername/arc-agents-public.git
cd arc-agents-public

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=your_key_here
# Optional: Google Sheets + Calendar sync
# export GOOGLE_SHEETS_ID=your_sheet_id
# export GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
# export GOOGLE_CALENDAR_ID=your_email@gmail.com

# Run the Flask API (serves SPA + API routes)
python api/index.py

# Open http://localhost:5000 in your browser
```

### Enable GitHub Pages (For Live Demo)

To view the interactive demo landing page:

1. Go to your repo **Settings** → **Pages** (left sidebar)
2. Under "Source", select `main` branch and `/ (root)` folder
3. Click **Save**
4. GitHub will provision your Pages site (~1 min)
5. Your demo is now live at: `https://yourusername.github.io/arc-agents-public/demo-landing.html`

### First Run (Local)

1. Open the app → **Settings** tab → toggle **Load Demo Data**
2. Play with the schedule, log a meal, check the cycle phase
3. Open **Nora** (nutrition) chat → ask *"What should I eat today?"*
4. Check **Council** tab (daily synthesis) → refresh to see real AI insights

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (Vercel auto-detects Flask)
vercel

# Set environment variables in Vercel dashboard
# ANTHROPIC_API_KEY, GOOGLE_SHEETS_ID (optional), etc.
```

---

## Privacy & Transparency

✅ **All data stays in your browser** (localStorage, never leaves your device)  
✅ **No user database** (Vercel API is stateless)  
✅ **Demo data is clearly marked** (different color, watermark)  
✅ **Token transparency** (every API call is logged and visible in Agents tab)  
✅ **Open-source system prompts** (audit exactly what each agent sees)  
✅ **Optional cloud sync** (Google Sheets, only if you enable it; encrypted)  
✅ **No telemetry, no tracking** (just your data, your API key, your Vercel account)

---


---


---

## Project Stats

| Metric | Value |
|--------|-------|
| Total commits | 100+ |
| Specialized agents | 15 active + 14 archived (career/life) |
| localStorage stores | 16 (pantry, meals, recipes, schedule, chores, supplements, etc.) |
| Lines of JSX | ~3,500 |
| Lines of Python | ~800 |
| API endpoints | 15 (health, context, chat, parse-entry, macros, synthesize, etc.) |
| Supported cycle phases | 4 (Menstrual, Follicular, Ovulatory, Luteal) |
| Builtin supplement data | 9 (with timing, interactions, phase guidance) |
| Fixed chores | 19 (daily/weekly/biweekly/monthly) |
| Vision endpoints | 2 (meal snapping, receipt scanning) |

---

## Contributing

This is a **personal project**, but you can:

- **Fork & adapt** for your own health use case
- **Open issues** for bugs or feature ideas
- **Reference the architecture** in your own AI projects
- **Remix the agent prompts** for your domain (fitness coaching, nutrition, sleep, etc.)

See [`CONTRIBUTING.md`](docs/CONTRIBUTING.md) for guidelines.

---

## What's Next?

- [ ] Mobile app (React Native, same localStorage architecture)
- [ ] Desktop agents (Python CLI with local health data polling)
- [ ] API-first version (REST + webhooks for integrations)
- [ ] Community agent templates (share custom agents, prompts, stores)
- [ ] Real-time biometric sync (Apple Health, Oura, Whoop via OAuth)

---

## License

MIT — use it, learn from it, build on it. See [`LICENSE`](LICENSE).

---

## Questions?

- **How does the AI part work?** See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **How do I add a new health domain?** See [`docs/EXTENDING.md`](docs/EXTENDING.md)
- **Is my data actually private?** See [`docs/PRIVACY.md`](docs/PRIVACY.md)

---

**Open Source | [GitHub](https://github.com/yourusername/arc-agents-public) | [Demo Landing](demo-landing.html) | MIT License**
