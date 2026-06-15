# Using Arc Agents for Your CV

This guide helps you position Arc Agents in job applications, interviews, and portfolio discussions. The project signals multiple skill levels and tracks a clear career trajectory (Data Scientist → AI Engineer → AI Product Manager).

---

## The Elevator Pitch (30 seconds)

**For interviews:**
*"Arc Agents is an open-source AI health companion that synthesizes data across domains—sleep, cycle phase, workouts, meals—to give personalized recommendations. I built it as a React SPA with a Flask API and 15 specialized Claude agents that coordinate via shared context. The most interesting part is the multi-agent coordination pattern: instead of daisy-chaining API calls, each agent receives a unified snapshot of all your health data and makes specialized recommendations. It's live on Vercel, uses localStorage for privacy, and I've open-sourced it to teach others how to build AI products, not just AI tools."*

**For LinkedIn:**
*"Built Arc Agents, an AI-powered health companion that orchestrates 15 specialized agents to synthesize health data (cycle, sleep, nutrition, workouts) into personalized guidance. Demonstrates multi-agent coordination, real-world AI constraints, and privacy-first architecture. Open-source; featured in Substack series on AI product design."*

---

## What to Emphasize for Different Roles

### For Data Scientist Roles

**What you built that matters:**
- **Pattern recognition**: Cycle phase detection (28-day cycle → 4 phases, derived from one input: period_start date)
- **Temporal reasoning**: 7-day and 28-day trend computation (`buildArcTrends()`)
- **Feature engineering**: Cross-domain features (e.g., "protein adherence during luteal phase")
- **Synthesis**: Aggregating 16 data streams into one coherent recommendation
- **Feedback loops**: User feedback on recommendations → improved model guidance

**Key stats:**
- 16 localStorage stores (structured health data)
- 15+ specialized analysis functions (one per domain)
- 7/28-day trend computation + adherence scoring
- Real-time token cost tracking (transparency about AI usage)

**Interview talking points:**
- "The tricky part wasn't collecting data—it was interpreting it. The real insight came from understanding that your cycle phase changes what's nutritionally optimal. I built a simple feature derivation (period_start → phase) and suddenly every recommendation became personalized."
- "Trends matter more than daily snapshots. I built `buildArcTrends()` to surface 28-day patterns. It taught me that data science is 50% math, 50% knowing what questions to ask."
- "Synthesis is hard. Taking 16 independent data streams and making them tell one story—not overwhelming the user with conflicting advice—that's where the product thinking comes in."

**Code samples to show:**
- `arc-context.jsx`: `buildArcSnapshot()` + `buildArcTrends()`
- `health-store.jsx`: cycle phase derivation + health log form
- `tabs.jsx`: AdherenceGrid (real stats calculation)

---

### For AI/ML Engineer Roles

**What you built that matters:**
- **Multi-agent architecture**: 15 independent agents + shared context (no function-calling, no daisy-chaining)
- **Prompt engineering**: Domain-specific system prompts + cross-domain context injection
- **API integration**: Claude API with streaming, token tracking, error handling
- **Real-world constraints**: Token budgets, localStorage limits, latency optimization
- **System design**: Stateless serverless architecture, localStorage-first data model

**Key stats:**
- 15 active agents + 14 archived (scope evolution)
- Multi-agent coordination without explicit communication
- 100+ commits showing iterative design
- Token tracking on every API call (transparency)

**Interview talking points:**
- "The naive approach to multi-agent systems is to daisy-chain: Agent A → Agent B → Agent C. That's slow and expensive. I went the opposite direction: all agents read the same unified snapshot of your health data, make independent recommendations, and Vera (a meta-agent) handles conflicts. It's cheaper, faster, and actually more flexible."
- "Prompt engineering is a skill. Each agent has a specialized role, but they all receive the same cross-domain context. The trick is writing prompts that are focused enough to be cheap, but context-rich enough to be useful. I learned that lean context beats comprehensive context 80% of the time."
- "Real-world constraints are features. localStorage has a 5MB limit, so I designed lean stores with intelligent caps (max 500 meals, max 200 workouts). That forced clean architecture. Same with token budgets—I cache synthesis 1x per day instead of computing it every request."

**Code samples to show:**
- `api/index.py`: Context builders, synthesis endpoints, token tracking
- `arc-context.jsx`: Snapshot + trends computation
- `chat.jsx`: API integration + streaming
- System prompt examples (from AGENTS dict in data.jsx)

**Technical deep dive:**
- "Walk me through how the agents coordinate."
  - *Show: snapshotText() + system prompt injection → agents work independently → Vera sees conflicts*
- "How do you handle token limits?"
  - *Show: lean context, caching, single-shot responses + structured output*
- "What would you do differently at scale?"
  - *Discuss: function-calling for efficiency, caching layer, maybe vector DB for trend retrieval*

---

### For Product Manager / AI PM Roles

**What you built that matters:**
- **User-centric design**: Built because *you* needed it (not a hypothetical)
- **Product thinking**: Constraints as features (privacy, lean UX, cross-domain synthesis)
- **Real-world feedback loops**: Using your own app, iterating based on friction points
- **Transparency**: Token tracking, agent cost awareness, demo data clearly marked
- **Roadmap clarity**: Scope decisions (health only, no career/life), feature prioritization
- **Community potential**: Open source, extensible, documented for others to build on

**Key stories:**
- **Scope reduction**: Started as a generalist app (career + life + health) → realized focused health was more valuable → archived 14 agents → shipped 15 core agents well
- **Data pipeline evolution**: Apple Health integration was too fiddly → switched to manual daily log → users adopted it → learned that simplicity wins
- **Synthesis as aha moment**: Started with single-agent Q&A → users asked conflicting questions → realized multi-agent with unified context was the answer
- **Open sourcing as leverage**: Making it public forced me to think about UX, documentation, extensibility → better product

**Interview talking points:**
- "The product insight wasn't technical. I noticed I had all this health data, but none of it talked to each other. So I built something that would. But then I realized the hard part wasn't the AI—it was knowing what to ask it, and making the output feel like wisdom, not information overload."
- "Constraints taught me how to design. localStorage limit + token budget forced me to think about what's actually valuable. Can't show everything? Show trends. Can't compute everything? Cache synthesis. Real constraints are better than infinite resources for product clarity."
- "User research is usually external. Here, I was my own user. That's both a strength (I knew exactly what I needed) and a weakness (I might not represent everyone). Open sourcing forced me to test with real users and iterate."
- "Transparency is underrated. Showing users the token cost of each agent, the synthesis cache date, the demo data watermark—that builds trust. Most AI products hide the AI. I made it visible."

**Framework you developed:**
- **6 principles of AI products**:
  1. Context is everything (same model, different context = different output quality)
  2. Synthesis beats retrieval (don't show data, show insight)
  3. Transparency builds trust (users need to understand what the AI is doing)
  4. Privacy is a feature (users own their data)
  5. Constraints drive innovation (token budgets, storage limits force better design)
  6. Taste matters (product design is 50% AI, 50% UX)

---

### For Fullstack Engineer Roles

**What you built that matters:**
- **React 18 SPA with no build step** (UMD + Babel, instant iteration)
- **Flask serverless architecture** (single function, scales to zero)
- **localStorage data model** (16 stores, clean schema, no backend DB)
- **Real-time features** (streaming chat, touch-friendly UI, drag-and-drop schedule)
- **Integration layers** (Google Sheets + Calendar optional sync)
- **Pragmatic design decisions** (no styled-jsx, single CSS file, offline-first)

**Key stats:**
- 3,500+ lines of JSX (React components)
- 800+ lines of Python (Flask API)
- 16 localStorage stores with clean schemas
- 0 build step (React UMD + Babel standalone)
- Vercel deployment (serverless)

**Interview talking points:**
- "Most modern webapps require a build step. I chose React UMD + Babel standalone because I wanted instant iteration—edit JSX, refresh, see change. No webpack, no node_modules, no build errors. It's slower to load than a bundled SPA, but faster to develop. For a personal project, that tradeoff made sense."
- "localStorage is not often used at scale because it's slow and size-limited. But for a personal health app, it's perfect. It's instant, it's private, it's offline-first. I designed the schema carefully (500-item caps, smart retention) to stay well under the 5MB limit."
- "The API is intentionally stateless and thin. All compute happens in Claude, all state lives in the user's browser. This means I pay for serverless as you'd expect—just API calls—not a database or a queue. And if my API goes down, your app still works (reads/writes to localStorage, syncs when back online)."
- "The hardest UI challenge was touch. Drag-and-drop doesn't work on touchscreens (no mousedown/move/up events). So I added arrow buttons for reordering. Seems simple, but it required thinking about how people actually use the app."

**Code samples to show:**
- `Arc Agents.html`: Single entry point, how React UMD is loaded
- `app.jsx`: Tab structure, state management pattern
- `*-store.jsx`: How localStorage stores are organized (factory pattern)
- `api/index.py`: Stateless Flask function, streaming endpoints
- `chat.jsx`: Streaming API integration
- `sync-store.jsx`: Google Sheets + Calendar integration

---

## Portfolio Narrative

**The story you tell:**

*"I started with a problem: I had sleep data, cycle data, meal logs, workout history, and none of it talked to each other. Existing health apps are data-collection engines; they don't synthesize.*

*So I built Arc Agents. It's a personal AI health companion that uses 15 specialized Claude agents to synthesize fragmented health data into personalized recommendations. The architecture is interesting: instead of daisy-chaining API calls, all agents read the same unified snapshot of your health data and make independent recommendations. A meta-agent (Vera) handles conflicts.*

*I learned three things building this:*

*1. Data science is about asking the right questions, not collecting more data. The insight (cycle phase changes what's nutritionally optimal) drove all the personalization.*

*2. Multi-agent systems are harder to coordinate than you'd think, but constraints (token budgets, localStorage limits) force you toward elegant solutions.*

*3. Building for yourself is liberating—I could iterate fast and test ruthlessly. But building for others requires thinking about generalization, documentation, and community.*

*I open-sourced it to share both the code and the thinking. The Substack series documents the journey from "I need a better dashboard" to "How do you build AI products that actually work?"*

*Most importantly: this shows I can take an idea → architecture → execution → public → learning. That's the trajectory I want for my career."*

---

## Job Application Sections

### "Projects" Section

```
Arc Agents — AI-Powered Health Companion
github.com/yourusername/arc-agents-public | 6 months active development

• Built an open-source personal health AI system using 15 specialized Claude agents 
  to synthesize data (cycle phase, sleep, nutrition, workouts) into personalized insights
• Designed multi-agent coordination architecture: agents receive shared context snapshot,
  make independent recommendations, meta-agent (Vera) handles conflicts
• Implemented real-time features: photo recognition (meals, receipts), drag-reorder 
  schedule with conflict warnings, dynamic macro goal adjustment by cycle phase
• Stack: React 18 (UMD, no build step), Flask (serverless on Vercel), Claude Haiku API,
  localStorage (16 stores, privacy-first), Google Sheets + Calendar sync
• 100+ commits, 3,500 lines of JSX, 800 lines of Python, open-source (MIT)
• Authored 7-part Substack series on AI product design and multi-agent architectures

Skills demonstrated: Multi-agent AI systems, prompt engineering, data synthesis, 
fullstack development, product thinking, pragmatic architecture, learning in public
```

### "Skills" Section

Add these:
- **AI/ML**: Multi-agent systems, prompt engineering, Claude API, vision API, synthesis
- **Data Science**: Temporal analysis (7/28-day trends), feature derivation, pattern recognition, feedback loops
- **Backend**: Flask, serverless (Vercel), stateless API design, Google Sheets/Calendar APIs
- **Frontend**: React 18, localStorage (client-side persistence), real-time chat (streaming), drag-drop UX
- **Architecture**: Privacy-first design, real-world constraints as features, extensibility

---

## Interview Preparation Checklist

- [ ] **Can you explain the multi-agent architecture in 2 minutes?**
  - Start: "Problem was one agent didn't have enough context"
  - Middle: "Solution is all agents read the same snapshot"
  - End: "Vera coordinates conflicts, cheaper than daisy-chaining"

- [ ] **What would you do differently at scale?** (Have an answer ready)
  - Token budget: "Maybe cached embeddings for trends instead of full context"
  - Privacy: "Might add differential privacy for aggregate insights"
  - Complexity: "Function-calling for efficiency, maybe event sourcing for audit trail"

- [ ] **Why open source this?**
  - Credibility: "Shows I can ship real code"
  - Community: "Others can build agents / stores for their use cases"
  - Learning: "Forced me to think about design, documentation, extensibility"

- [ ] **What surprised you building this?**
  - Be honest: "Thought synthesis would be hard; was easy with Claude. UX was actually harder."
  - Or: "Realized localStorage was perfect for this use case, not a limitation"

- [ ] **What would you add next?**
  - Mobile app: "Same architecture, React Native"
  - Integrations: "Real Apple Health, Oura, Whoop via OAuth"
  - Community: "Let users share custom agents, prompts, stores"
  - But: "First validate with users that it's actually helpful"

---

## LinkedIn Recommendations to Ask For

If anyone's used Arc Agents or reviewed the code, ask them to note:
- "Built a sophisticated multi-agent AI system"
- "Strong understanding of AI product design"
- "Pragmatic fullstack developer"
- "Clear communicator (especially the Substack series)"

---

## Metrics to Track

Before interviews, know these:
- **GitHub**: Star count, fork count, issues/PRs
- **Usage**: How many people have tried the demo?
- **Substack**: Subscriber count, read engagement
- **Commits**: 100+ commits shows iterative development, not a one-shot

Keep these up to date on your CV and linked.

---

## Red Flags to Address Proactively

**"This is just a personal project."**
- Response: "Yes, but it's open-source, documented for extensibility, and tested by real users. It demonstrates full-stack capability and AI architecture thinking."

**"Why only 15 agents? Why not more?"**
- Response: "Scope is intentional. More agents = exponential coordination complexity. 15 is the right number for coherence. Vera (meta-agent) would break at 50+."

**"How do you know if it actually helps users?"**
- Response: "I don't, yet. That's the next research phase. Building in public helps; Substack feedback is real. This is designed to be a portfolio piece that demonstrates thinking, not a revenue business."

---

## Final Thought

Arc Agents isn't just a project—it's a **story arc**:
1. **Problem**: Health data silos + weak synthesis
2. **Solution**: Multi-agent AI architecture
3. **Learning**: Data science + AI engineering + product thinking
4. **Public**: Open source + Substack series
5. **Trajectory**: Data scientist → AI engineer → AI product manager

That narrative is what makes it valuable for your CV. Use it.
