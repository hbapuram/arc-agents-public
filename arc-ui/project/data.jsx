/* Arc Agents — sample data
   All 28 agents grouped by family. Includes the 7 new Ch2 agents.
*/

const AGENTS = [
  // Health
  { id: "nora",   name: "Nora",   role: "Food OS · Cycle Nutrition",        group: "health",   chat: true,  status: "ok",   ran: "6:31am",    desc: "Chat to get meal ideas from your actual pantry, tuned to your cycle phase. Flags expiring items." },
  { id: "felix",  name: "Felix",  role: "Fitness OS · Movement Coach",      group: "health",   chat: true,  status: "ok",   ran: "6:32am",    desc: "Chat for a workout plan built from your health log, recent sessions, and cycle phase." },
  { id: "luna",   name: "Luna",   role: "Wellness · Mood + Energy",         group: "health",   chat: false, status: "ok",   ran: "6:34am",    desc: "Automatic. Surfaces in Today when your logged HRV, sleep score, or steps fall outside target ranges for your cycle phase." },
  { id: "flora",  name: "Flora",  role: "Cycle OS · Phase Intelligence",    group: "health",   chat: false, status: "ok",   ran: "6:33am",    desc: "Automatic. Calculates your cycle phase and drives phase-aware guidance across all agents." },
  { id: "dusk",   name: "Dusk",   role: "Sleep Signal · Wind-down Cue",     group: "health",   chat: false, status: "idle", ran: "—",         desc: "Coming soon. Will fire a personalised bedtime nudge each evening based on your sleep debt and next-day schedule." },

  // Health extended
  { id: "cara",   name: "Cara",   role: "Personal Care OS · Skincare",      group: "health", chat: true,  status: "ok", ran: "6:35am",    isNew: true, desc: "Chat to get your AM/PM skincare routine from your actual shelf, with expiry alerts and cycle adjustments." },
  { id: "soma",   name: "Soma",   role: "Sleep Optimiser · Recovery",       group: "health", chat: false, status: "idle", ran: "—",         isNew: true, desc: "Coming soon. Will analyse your 7-day deep sleep and REM trends once enough sleep history is logged." },
  { id: "aurora", name: "Aurora", role: "Morning Synthesis · Daily Briefing", group: "health", chat: false, status: "ok", ran: "6:30am",  isNew: true, desc: "Automatic. Generates your morning briefing once daily via Claude — reads sleep, cycle phase, schedule, and protein status. Falls back to phase summary if offline." },
  { id: "pulse",  name: "Pulse",  role: "Reactive Nudges · Mid-day Signals", group: "health", chat: false, status: "ok", ran: "varies",   isNew: true, desc: "Automatic. Fires only when a signal warrants it — low steps, HRV drop, or missed meal." },

  // Glue
  { id: "nova",  name: "Nova",  role: "Briefing · Today Composer",    group: "glue", chat: false, status: "ok",   ran: "6:30am",    desc: "Automatic. Feeds phase-keyed nudges (Cara expiry, supplement stock, Pulse signals) into the Today feed — works alongside Aurora to compose the daily picture." },
  { id: "sage",  name: "Sage",  role: "Day Manager · Schedule",       group: "glue", chat: false, status: "ok",   ran: "6:30am",    desc: "Automatic. Time-blocks your day from chores, supplements, and workouts. Tap ↻ Plan in Life tab." },
  { id: "echo",  name: "Echo",  role: "Reminders · WhatsApp Bridge",  group: "glue", chat: false, status: "idle", ran: "—",         desc: "Planned feature. Will deliver reminders via WhatsApp — not yet active." },
  { id: "scout", name: "Scout", role: "Shop Smart · Store Advisor",   group: "glue", chat: true,  status: "ok",   ran: "on demand", isNew: true, desc: "Chat to get personalised store picks for each grocery item, based on your own ratings and notes." },

  // Wellbeing
  { id: "halo",  name: "Halo",  role: "Wind-down · Evening Reflection", group: "wellbeing", chat: false, status: "idle", ran: "—", desc: "Coming soon. Will prompt a three-things reflection each evening and feed patterns to Lyra's weekly review." },

  // Meta
  { id: "eve",   name: "Eve",   role: "Evening Coach · Wind-down",           group: "meta", chat: true,  status: "ok", ran: "8:00pm",    isNew: true, desc: "Chat for a real evening wind-down — mood check, reflection, and sleep prep tuned to your cycle." },
  { id: "lyra",  name: "Lyra",  role: "Weekly Review · Pattern Insights",    group: "meta", chat: false, status: "ok", ran: "Sun 8pm",   isNew: true, desc: "Automatic. Computes real 7-day trends — sleep averages, HRV direction, protein adherence, training load, and top symptoms. Results appear in the Council tab once enough data is logged." },
  { id: "vera",  name: "Vera",  role: "Quick Compare · Smart Routing",       group: "meta", chat: true,  status: "ok", ran: "on demand", isNew: true, desc: "Chat to ask anything — Vera answers directly or routes you to the right specialist agent." },

  // Council
  { id: "mirror",  name: "Mirror",      role: "Feedback Loop · Pattern Learning",   group: "council", chat: false, status: "ok", ran: "daily", desc: "Automatic. Shows live adherence stats — supplements taken today, health logged this week, workouts completed, chores done. Resets and recalculates daily." },
  { id: "council", name: "The Council", role: "Cross-Domain Synthesis · Daily Read", group: "council", chat: false, status: "ok", ran: "daily", desc: "Automatic. Generates a cross-domain synthesis once daily via Claude — reads all your health stores and surfaces conflicts, patterns, and adjustments. Refresh anytime." },
];

const GROUP_META = {
  health:    { label: "Health",     color: "var(--sage)",  light: "rgba(74,122,90,0.08)",  border: "rgba(74,122,90,0.3)" },
  glue:      { label: "Glue",       color: "var(--teal)",  light: "rgba(42,107,107,0.08)", border: "rgba(42,107,107,0.3)" },
  wellbeing: { label: "Wellbeing",  color: "var(--lav)",   light: "rgba(90,79,122,0.08)",  border: "rgba(90,79,122,0.3)" },
  meta:      { label: "Meta",       color: "var(--amber)", light: "rgba(196,136,74,0.08)", border: "rgba(196,136,74,0.3)" },
  council:   { label: "Council",    color: "var(--gold)",  light: "rgba(154,123,63,0.08)", border: "rgba(154,123,63,0.3)" },
};

// Time-of-day states (hour of day)
const DAY_STATES = [
  { id: "morning",  label: "Morning Brief",   hour: 7,  range: "6–9 am",   color: "var(--deep)" },
  { id: "work",     label: "Work Focus",      hour: 11, range: "9 am–1 pm", color: "var(--blue)" },
  { id: "afternoon",label: "Afternoon",       hour: 15, range: "1–5 pm",   color: "var(--sage)" },
  { id: "evening",  label: "Evening",         hour: 19, range: "5–9 pm",   color: "var(--amber)" },
  { id: "winddown", label: "Wind-down",       hour: 22, range: "9 pm–12 am", color: "var(--lav)" },
];

const CYCLE_PHASES = [
  { id: "menstrual",  label: "Menstrual",  day: 2,  energy: "Restorative · low key",
    note: "Rest, gentle movement, iron-rich food. Soft cognitive work — editing, planning, reflection.",
    nora: "Iron + warm foods. Lentils, dark greens, dates.",
    felix: "Walks, mobility, restorative yoga. No PRs this week.",
    cara:  "Barrier-supporting routine. Skip exfoliants. Keep retinol gentle.",
    supp:  "Iron + vitamin C (absorption), magnesium for cramps. Skip zinc on iron days.",
    sleep: "Expect more sleep need — allow +30–60 min. Magnesium glycinate in the evening.",
    body:  "Water retention can nudge weight up 0.5–1 kg — not fat. Measure waist later in cycle." },
  { id: "follicular", label: "Follicular", day: 6,  energy: "High energy · focus mode on",
    note: "Best for strength, deep work, new projects. Estrogen rising.",
    nora:  "Protein priority · steady carbs. Big plates.",
    felix: "Strength + intensity. Push lower body.",
    cara:  "Low sebum, retinol tolerated well. Active acids OK.",
    supp:  "B12 + biotin for energy/hair. Iron only if still finishing a course.",
    sleep: "Sleep usually easiest now — protect a consistent bedtime to bank recovery.",
    body:  "Best window for honest measurements — bloating is lowest." },
  { id: "ovulatory",  label: "Ovulatory",  day: 14, energy: "Warm · social · expressive",
    note: "Peak verbal + social energy. Good for collaboration, presentations, recording.",
    nora:  "Antioxidants + cruciferous veg. Lighter meals digest better.",
    felix: "Power output high. Sprints, plyos, classes welcome.",
    cara:  "Skin glows naturally. Light layers, sunscreen non-negotiable.",
    supp:  "Antioxidants + omega-3. Keep vitamin D consistent.",
    sleep: "Core temp slightly higher — keep the room cool for deep sleep.",
    body:  "Strength peaks — a good time to log measurements after training." },
  { id: "luteal",     label: "Luteal",     day: 22, energy: "Grounded · introspective",
    note: "Steady cognitive work, finishing not starting. Crave warmth, magnesium, slower mornings.",
    nora:  "Complex carbs + magnesium. Soups, oats, dark chocolate.",
    felix: "Strength still good early week; reduce intensity ~20% by end.",
    cara:  "Sebum up — gentle exfoliation, blemish patches. Skip retinol mid-week.",
    supp:  "Magnesium for PMS + sleep, B6 for mood. Calcium may ease cramps.",
    sleep: "Sleep can fragment late luteal — wind down earlier, limit caffeine after noon.",
    body:  "Weight + measurements drift up from water — don't over-read the scale here." },
];

const SCHEDULE = [
  { time: "06:30", title: "Morning routine + brief",         sub: "Sage · 45 min",               color: "var(--deep)",  state: "morning" },
  { time: "12:30", title: "Lunch — lentil soup + sourdough", sub: "Nora · 650 kcal",             color: "var(--sage)",  state: "afternoon" },
  { time: "17:30", title: "Grocery run — Lidl",              sub: "Nora · list ready · €35",     color: "var(--amber)", state: "evening" },
  { time: "19:00", title: "Strength workout",                sub: "Felix · follicular · 40 min", color: "var(--terra)", state: "evening" },
  { time: "21:00", title: "Evening reflection",              sub: "Eve · 10 min conversation",   color: "var(--lav)",   state: "winddown" },
];

const REFLECTION_PROMPTS = [
  "Three things that went well today?",
  "One thing you're carrying that you can put down?",
  "What did your body tell you today?",
  "What would tomorrow you thank today you for?",
];

Object.assign(window, { AGENTS, GROUP_META, DAY_STATES, CYCLE_PHASES, SCHEDULE, REFLECTION_PROMPTS });
