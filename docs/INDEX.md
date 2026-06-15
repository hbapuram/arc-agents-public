# Arc Agents Documentation Index

Welcome! Here's how to navigate the docs.

## For First-Time Users

**Start here:**
1. [`../README.md`](../README.md) — What Arc Agents is, why it matters, quick start
2. [`SETUP.md`](SETUP.md) — How to run it locally (5 minutes)
3. [`PRIVACY.md`](PRIVACY.md) — Your data stays in your browser (trust us)

Then:
4. Play with the demo data (Settings → Load Demo Data)
5. Chat with Nora (nutrition), Felix (fitness), or any agent
6. Log your own data (Health → Data)
7. Check Council tab for real Claude synthesis

## For Developers

**Architecture & Design:**
1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — System design, API endpoints, data flow
2. [`EXTENDING.md`](EXTENDING.md) — How to add agents, stores, and features

**Deployment:**
3. [`SETUP.md`](SETUP.md) — Local, Vercel, Docker, Google Sheets/Calendar

**Contributing:**
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) — How to contribute code, report bugs, improve docs

## For Builders / AI Engineers

**Technical Deep Dive:**
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Multi-agent coordination pattern, context injection, data flow
- [`EXTENDING.md`](EXTENDING.md) — Step-by-step: add an agent, add a store, add an endpoint

**Learning from the Journey:**
- [`articles/SERIES_OUTLINE.md`](articles/SERIES_OUTLINE.md) — 7-part Substack series outline
  - Article 1: "I Stopped Tracking My Health and Started Automating My Decisions"
  - Article 2: "Cycle Intelligence: Teaching AI to Understand Hormonal Patterns"
  - Article 3: "Multi-Agent Synthesis: When One AI Isn't Enough"
  - Article 4: "LocalStorage is Your Backend: Building AI Apps With Real Constraints"
  - Article 5: "From Raw Data to Recommendations: The 80% Problem"
  - Article 6: "Building in Public: Open-Sourcing Arc"
  - Article 7: "From AI Tool to AI Product: What's Actually Different?"

## For Career & Interviews

**CV & Positioning:**
1. [`CV_GUIDE.md`](CV_GUIDE.md) — How to talk about Arc in interviews
   - Elevator pitch (30 seconds)
   - What to emphasize for different roles (Data Scientist, AI Engineer, PM)
   - Portfolio narrative
   - Interview prep checklist

**Show & Tell:**
- GitHub: Complete codebase with 100+ commits
- Substack: Learning journey documented publicly
- Portfolio: A real product that solved a real problem

## FAQ by Role

### Data Scientist

- **Learn:** Pattern recognition (cycle phase detection), temporal analysis (7/28-day trends), synthesis (cross-domain insights)
- **See:** `arc-context.jsx` (`buildArcSnapshot()`, `buildArcTrends()`), `health-store.jsx` (cycle logic)
- **Read:** Article 2 & 5 in the Substack series

### AI Engineer

- **Learn:** Multi-agent architecture, prompt engineering, API integration, real-world constraints
- **See:** `api/index.py` (context builders, synthesis), `chat.jsx` (streaming), system prompts in code
- **Read:** Article 3 & 4 in the Substack series

### Product Manager / AI PM

- **Learn:** User-centric design, constraints as features, transparency, roadmap clarity
- **See:** Settings tab (what options exist), Council tab (what synthesis looks like), token tracker (transparency)
- **Read:** Article 1, 5, 6, 7 in the Substack series

### Fullstack Engineer

- **Learn:** React SPA (no build step), localStorage design, Flask serverless, real-time features
- **See:** `Arc Agents.html` (entry point), `*-store.jsx` (data layer), `api/index.py` (API)
- **Read:** Article 4 in the Substack series

## File Structure

```
arc-agents-public/
├── README.md                    ← Start here
├── docs/
│   ├── INDEX.md                (you are here)
│   ├── ARCHITECTURE.md          ← Technical deep dive
│   ├── CV_GUIDE.md              ← How to use for your career
│   ├── EXTENDING.md             ← Add agents, stores, features
│   ├── PRIVACY.md               ← Data privacy & security
│   ├── SETUP.md                 ← Local/Vercel/Docker setup
│   ├── CONTRIBUTING.md          ← How to contribute
│   └── articles/
│       └── SERIES_OUTLINE.md    ← 7-part Substack series
├── api/
│   ├── index.py                 ← Flask serverless function
│   └── requirements.txt
└── arc-ui/
    └── project/                 ← React SPA (no build step)
        ├── Arc Agents.html
        ├── *.jsx                (components)
        ├── styles.css
        └── manifest.json
```

## Key Concepts

### The Context System
All agents read the same `snapshotText()` (your health data in plain English). This enables coordination without explicit communication.

### The Synthesis Pattern
Aurora (morning) + Council (evening) take your data + trends and return one coherent insight (not a list of agent outputs).

### The Constraint-Driven Design
localStorage limits (5MB) force clean architecture. Token budgets force lean prompts. These constraints are features.

### The Privacy-First Model
No user database. No telemetry. No tracking. Your data stays in your browser.

## Common Questions

**Q: Can I self-host?**  
A: Yes. See `SETUP.md` (Docker, local Flask, anything).

**Q: Can I add my own agent?**  
A: Yes. See `EXTENDING.md` (10-minute walkthrough).

**Q: Is this open-source?**  
A: Yes, MIT license. Use it, fork it, modify it.

**Q: Can I use this commercially?**  
A: Yes, but it's designed for personal use. The MIT license allows commercial use.

**Q: What if Arc Agents shuts down?**  
A: Your data stays in your browser. You can self-host or export anytime.

**Q: How do I report a security issue?**  
A: Email hbapuram06@gmail.com (don't post publicly). See `CONTRIBUTING.md`.

## Next Steps

1. **First time?** → `SETUP.md` (get it running)
2. **Want to learn?** → `ARCHITECTURE.md` (understand the design)
3. **Want to extend?** → `EXTENDING.md` (add your own agent/store)
4. **Want to contribute?** → `CONTRIBUTING.md` (help improve it)
5. **Career?** → `CV_GUIDE.md` (how to position this)

---

Last updated: 2026-06-15  
For questions, open an issue on GitHub or email hbapuram06@gmail.com
