# About Arc Agents: Your Personal AI Health Companion

> **What if your health app actually understood you?** Not just collected data, but synthesized it. Not just tracked metrics, but predicted what you need. Not just reminded you to drink water, but gave you personalized guidance that changes with your cycle, sleep quality, and goals.

---

## The Problem Arc Solves

Most health apps are **data collection engines**. You log your food, sleep, workouts, symptoms—each in a different app or spreadsheet. Then what? They show you a dashboard. But dashboards don't think.

**The real problems:**
- Your cycle phase changes what nutrition is optimal, but your meal app doesn't know your cycle
- Your sleep quality affects tomorrow's workout capacity, but your fitness app only sees today's logs
- You have 16 different apps, none of them know about each other
- You want personalized guidance, not generic advice

**What Arc does:** It reads all your health data, understands the connections, and gives you *one coherent recommendation*—not 16 conflicting ones.

---

## Who Is Arc For?

### 1. **Women Managing Their Cycle**

Your body is not a constant. What works nutritionally on day 7 (follicular, rising estrogen) is wrong on day 21 (luteal, high progesterone).

Arc knows this. It:
- **Derives your cycle phase** from a one-time period_start date (no manual selection)
- **Adjusts your macro goals** daily by phase (luteal = higher calories, higher carbs for mood)
- **Prioritizes supplements** by phase (magnesium in luteal for cramps, iron in menstrual for recovery)
- **Gives phase-aware meal recommendations** (lighter workouts + more carbs in luteal, HIIT in follicular)
- **Tracks cycle-correlated symptoms** (bloating day 21 confirms luteal phase)

**Result:** Your health advice actually matches your biology.

### 2. **Athletes & Fitness-First People**

Training stress, sleep debt, and hormone levels interact. Arc sees all three.

Arc:
- **Recommends workouts** based on HRV + sleep + cycle phase (not just "I want to work out")
- **Predicts recovery needs** (high training load + luteal phase = prioritize rest)
- **Adjusts nutrition** for your training intensity (HIIT day needs more carbs than rest day)
- **Tracks feedback loops** (you rate post-workout how you felt → AI learns what works for you)

**Result:** Your workouts adapt to your actual recovery capacity, not a generic plan.

### 3. **Nutritionists & Meal Planners**

Food is complex. Macros matter, but so does:
- Phase-specific satiety (progesterone increases appetite in luteal)
- Supplement interactions (calcium affects iron absorption)
- Pantry inventory (what can you actually make today?)
- Budget & preferences (vegetarian, avoiding certain ingredients)

Arc:
- **Plans meals** phase-aware, macro-optimized, pantry-first
- **Looks up nutrition** instantly (NUTRITION_DB + Claude for unknowns)
- **Remembers purchases** (price, store, quality rating) so AI knows what's available
- **Suggests recipes** that fit today's goals + your pantry
- **Scans receipts** (photo → bill parsing → itemized prices + quality logging)

**Result:** Meal planning that actually uses your context.

### 4. **People Tracking Symptoms & Health Conditions**

Whether it's PMS, PCOS, endometriosis, or just stress—symptoms have patterns.

Arc:
- **Logs daily symptoms** (severity 1-5, auto-tagged to cycle day)
- **Surfaces patterns** (bloating correlates with luteal phase, fatigue with poor sleep)
- **Gives context to doctors** (here are my 28-day trends, not just today's snapshot)
- **Tests hypotheses** (is my anxiety worse on high cortisol days? is magnesium actually helping?)

**Result:** You understand your body's patterns, and have data to share with your doctor.

### 5. **Quantified Self People**

You love data. You track everything. But you're drowning in dashboards.

Arc:
- **Centralizes everything** (sleep, HRV, HR, workouts, meals, supplements, symptoms, blood tests, body)
- **Computes trends** (7-day and 28-day patterns, not just daily snapshots)
- **Synthesizes insights** (Aurora morning brief + Council evening review)
- **Shows token costs** (transparency: how much does this AI insight cost?)
- **Exports easily** (localStorage is JSON, sync to Google Sheets)

**Result:** One dashboard that actually makes sense of all your data.

---

## How Arc Works

### The Core Idea: Multi-Agent Synthesis

Instead of **one big AI** that tries to be everything (expensive, slow, confused), Arc uses **15 specialized agents**:

- **Nora** (nutrition): reads your meals, macros, pantry, cycle phase → recommends what to eat
- **Felix** (fitness): reads your workouts, HRV, sleep, feedback → recommends workouts
- **Flora** (cycle): reads your symptoms, period date → predicts phase, guides timing
- **Cara** (care): reads your skincare, cycle phase → suggests AM/PM routines
- **Eve** (symptoms): reads your daily symptoms, cycle → finds patterns
- **Scout** (shopping): reads your purchases, ratings → suggests stores, finds deals
- **Aurora** (synthesis): reads everything → gives your morning brief (5 actions for today)
- **Council** (synthesis): reads everything + trends → gives evening review (what worked, what didn't)
- **Plus 7 more** (sleep, stress, trends, adherence, etc.)

**The magic:** All agents read the same "snapshot" of your health. They're specialized but coordinated. So Nora and Felix never contradict each other—they both see your sleep was bad and adapt accordingly.

### The Flow

```
1. You log data:
   - Health (sleep, HRV, mood, symptoms)
   - Meals (what you ate, macros)
   - Workouts (type, duration, how you felt)
   - Supplements (what you took)
   - Anything via "Tell Arc" (type naturally, AI files it)

2. Arc synthesizes:
   - Reads all 16 stores (health, meals, supplements, workouts, etc.)
   - Computes your cycle phase
   - Builds 7/28-day trends
   - Asks Claude: "Given all this context, what should they do?"

3. You get guidance:
   - Aurora (morning): "Here are your 5 actions for today"
   - Individual agents: Chat with Nora about meals, Felix about workouts, etc.
   - Council (evening): "Here's what you accomplished, here's what changed"
```

---

## What Makes Arc Different

### 1. **Cycle-Aware**

Most health apps treat your body as constant. Arc knows your cycle changes everything:
- Macro goals adjust daily by phase
- Supplement timing is phase-specific
- Workout intensity recommendations shift
- Symptom tracking is phase-correlated

### 2. **Cross-Domain Context**

Arc doesn't treat domains in isolation. It knows:
- High training load + luteal phase = rest day (not "train harder")
- Poor sleep + high stress = lower intensity workouts
- Period starting = adjust macro goals for recovery + mood

### 3. **Privacy-First**

Your data stays in your browser. No user database, no surveillance, no tracking.
- Entirely offline (works with zero internet)
- Optional cloud sync (Google Sheets, your choice)
- Token costs transparent (you see what each AI call costs)

### 4. **Personalization Without Asking**

Arc learns as you use it:
- Rates recommendations you accept vs. ignore
- Tracks feedback (post-workout: 🟢 good, 🟡 okay, 🔴 rough)
- Adapts prompts based on your patterns

You don't fill out a 50-question onboarding. Arc figures you out.

### 5. **Extensible**

Built in React + Flask with no build step. Easy to:
- Add new agents (stress management, recovery, injury prevention)
- Add new data stores (caffeine tracking, meditation, injury logs)
- Integrate with real data (Apple Health, Oura, Whoop, when you're ready)

---

## Personalization: How Arc Adapts to You

### Day 1: Initial Setup
- You set your period_start date (one-time)
- Optional: Your macro baseline goals
- Optional: Your dietary constraints (vegetarian, allergies, etc.)
- Load demo data to see how it works

### Days 2-7: Arc Learns
- Log your sleep, workouts, meals, symptoms
- Aurora / Council start making sense (cross-domain connections)
- You chat with agents, they see patterns

### Week 2+: True Personalization
- **Cycle awareness**: Arc knows your pattern (when you're hungry, when you're tired)
- **Workout adaptation**: "You recover slower than average; rest days matter"
- **Meal planning**: Suggests recipes you've liked before, from stores you prefer
- **Symptom tracking**: "Your PMS bloating peaks day 21, try magnesium starting day 18"
- **Supplement timing**: "Magnesium absorption is better with dinner, not breakfast"

### Month 2+: Deep Personalization
- Aurora brief is completely personalized (not generic)
- Council synthesis matches your actual patterns (not population averages)
- Agents know your preferences (you never ask "is this vegetarian?" anymore)
- Feedback loops improve accuracy (you rated Felix's workout recommendations 9/10 three weeks in a row → he adjusts style)

---

## Real Examples

### Example 1: The Cycle-Aware Week

**Monday (Follicular phase, day 7)**
- Arc: "Energy is rising, good day for HIIT"
- Nora (nutrition): "Metabolic rate up, maintain current calories"
- Aurora (morning): "Great day for intensity. Confidence is high."

**Wednesday (Ovulatory, day 14)**
- You: Log a hard HIIT workout, rate it 9/10
- Arc: "Peak workout day confirmed. Protein needs up."
- Felix (fitness): "Your power output is best this week; trust this session"

**Friday (Luteal, day 21)**
- You: Feel tired after the morning
- Arc: "HRV dropped, progesterone rising. Rest day recommended."
- Felix: "HIIT would be counterproductive today. Try yoga + walk."
- Nora: "Appetite up (progesterone), increase carbs to 45% (from 40%)"
- Aurora: "Focus on recovery today. Sleep is your priority."

**You log:**
- Easy walk (30 min)
- Yoga (20 min)
- 3 meals + 2 snacks (hitting adjusted macros)
- 8 glasses of water
- Council (evening): "Rest week tracking well. Protects next cycle's performance."

### Example 2: The Grocery Shopping Workflow

**Tuesday, 4 PM**
- You're planning meals for the week
- Nora (nutrition): "You're in follicular, higher intensity workouts likely. Plan for 100g protein/day"
- You: "What should I buy?"
- Nora: "Scan your pantry. Here's what you're low on: eggs, yogurt, quinoa"
- Scout (shopping): "Here's your best store option (Tesco for eggs, SuperValu for yogurt, Lidl for quinoa)"

**Later: Actual shopping**
- You scan the receipt (photo)
- Arc parses items + prices automatically
- You log quality ratings (eggs: 5 stars, yogurt: 4 stars, quinoa: 4 stars)
- Scout remembers: "Tesco eggs are best, SuperValu yogurt is fine, Lidl quinoa is meh"

**Next month:**
- Scout: "Based on your preferences: go to Tesco for eggs, skip Lidl for quinoa"
- Nora: Auto-completes pantry from your history

### Example 3: The Symptom Detective

**Week 1-4: You log symptoms**
- Day 7: Bloating (3/5)
- Day 14: Energy spike (5/5)
- Day 21: Cramps (4/5), anxiety (3/5), bloating (4/5)
- Day 25: Fatigue (3/5), mood low (3/5)

**Council (end of month):** "Clear pattern: luteal phase (days 21-28) is tough. High bloating, low mood. Solutions: magnesium starting day 18, lower workout intensity day 21-25, extra rest days."

**Flora (cycle agent):** "Here's the supplement timing: magnesium glycinate (absorbs better), take with dinner (food helps absorption), starting day 18."

**You implement:** Magnesium day 18-28
**Week 2 (next cycle):** Bloating and anxiety on day 21 drop to 2/5
**Eve (symptoms agent):** "Magnesium is working. Stick with it."

---

## How to Get Started

### Option 1: Live Demo (Easiest)
1. Deploy using the setup guide below
2. Load demo data (Settings tab)
3. Start logging your health
4. Chat with agents

### Option 2: Self-Hosted (Most Control)
1. `git clone` this repo
2. `pip install -r requirements.txt`
3. Set `ANTHROPIC_API_KEY`
4. `python api/index.py`
5. Open `http://localhost:5000`

### Option 3: Deploy Yourself (On Vercel)
1. Fork the repo
2. Deploy to Vercel (auto-detects Flask)
3. Set environment variables
4. Done

See [`docs/SETUP.md`](docs/SETUP.md) for detailed instructions.

---

## Privacy & Trust

**Arc is obsessively private:**
- All data stays in your browser (localStorage)
- No backend database storing your health info
- No telemetry, no tracking, no ads
- Optional cloud sync (Google Sheets), only if you enable it
- Open source (audit the code)
- Demo data clearly marked (don't accidentally use demo for real health logging)

See [`docs/PRIVACY.md`](docs/PRIVACY.md) for complete analysis.

---

## The AI Behind Arc

Arc uses **Claude Haiku** (fast, cheap, capable):
- System prompts are specialized per agent
- Context injection: each agent sees your full health snapshot
- Synthesis: Aurora + Council aggregate 15 agents into 1 voice
- Token transparent: you see the cost of every recommendation

**Why Haiku?** Because you don't need Opus for this. Haiku is fast enough for real-time chat, cheap enough for daily synthesis, and capable enough for domain-specific reasoning.

---

## What's Next (Roadmap)

- 🚀 **Mobile app** (React Native, same localStorage architecture)
- 🚀 **Real integrations** (Apple Health, Oura, Whoop via OAuth)
- 🚀 **Community agents** (users share custom agents + prompts)
- 📚 **Learning resources** (7-part Substack series on AI products)
- 🤝 **Extensibility** (easy-to-add domains: injury tracking, meditation, etc.)

---

## The Story Behind Arc

This started as a personal need: I had health data scattered across 5 apps, none of them understood my cycle, all the advice was generic.

I built Arc to solve my problem. Then realized it could solve others' too. Open-sourced it because I believe in privacy-first health tech.

The real innovation isn't the AI—it's the **synthesis**. One agent seeing one thing is obvious. 15 agents reading the same snapshot, coordinating intelligently, giving you one coherent action—that's the product.

**Follow the journey:** [Substack series on building Arc Agents](https://substack.com/@hrishita)

---

## Questions?

- **How much does it cost?** Free to self-host (you provide your own `ANTHROPIC_API_KEY`). Claude API pricing is ~$0.001 per request.
- **Is this a medical device?** No. It's a personal health tracker + AI advisor. Not a replacement for your doctor.
- **Can I fork it?** Yes. MIT license. Do whatever you want.
- **Can I add my own agents?** Yes. See [`docs/EXTENDING.md`](docs/EXTENDING.md).
- **Will you close this down?** Nope. It's open source, you can self-host forever.

---

**Open Source | [GitHub](https://github.com/yourusername/arc-agents-public) | MIT License**

---

*Last updated: 2026-06-15*
