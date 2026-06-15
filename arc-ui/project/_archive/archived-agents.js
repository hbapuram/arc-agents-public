/* ─────────────────────────────────────────────────────────────────────────────
   ARCHIVED: Career & Life Agents
   Removed June 2026 — see _archive/README.md for restore instructions.
   ───────────────────────────────────────────────────────────────────────────── */

// ── Career agents (add back to AGENTS array in data.jsx) ──────────────────────
const ARCHIVED_CAREER_AGENTS = [
  { id: "aria",  name: "Aria",  role: "News · AI + FinTech",         group: "career", chat: true,  status: "ok",   ran: "6:31am", desc: "Top 3-5 stories. Why-it-matters note." },
  { id: "kai",   name: "Kai",   role: "Coach · Daily Focus",          group: "career", chat: true,  status: "ok",   ran: "7:50am", desc: "One focus, one motivator, one action. Sent via WhatsApp 8am." },
  { id: "rex",   name: "Rex",   role: "Planner · 3 Priorities",       group: "career", chat: false, status: "ok",   ran: "6:32am", desc: "Today's 3 priorities. AXA vs personal split." },
  { id: "scout", name: "Scout", role: "Learning · Chapter Progress",  group: "career", chat: false, status: "ok",   ran: "6:33am", desc: "Today's 45-min session + resources." },
  { id: "cleo",  name: "Cleo",  role: "Jobs · Match Score",           group: "career", chat: false, status: "ok",   ran: "6:34am", desc: "Matched roles + skill gap score." },
  { id: "vox",   name: "Vox",   role: "Presence · LinkedIn + GitHub", group: "career", chat: true,  status: "idle", ran: "—",      desc: "Drafts a post when triggered. Tracks last activity." },
];

// ── Life agents (add back to AGENTS array in data.jsx) ────────────────────────
const ARCHIVED_LIFE_AGENTS = [
  { id: "finn",  name: "Finn",  role: "Finance · Spending Awareness", group: "life",   chat: false, status: "ok",   ran: "7:00pm", desc: "Daily spend pulse. Reads Finch. Goals-aware." },
  { id: "ember", name: "Ember", role: "Home · Chores + Errands",      group: "life",   chat: false, status: "ok",   ran: "8:00am", desc: "Today's chores from weekly rotation." },
  { id: "mira",  name: "Mira",  role: "Content · Reading + Media",    group: "life",   chat: false, status: "ok",   ran: "8:00am", desc: "One article/video matched to today's energy." },
  { id: "atlas", name: "Atlas", role: "Travel · Trips + Leave",       group: "life",   chat: false, status: "idle", ran: "—",      desc: "Weekend ideas. Reads Finn for budget." },
  { id: "ivy",   name: "Ivy",   role: "Discovery · Dublin Tonight",   group: "life",   chat: false, status: "ok",   ran: "5:30pm", desc: "Tonight's options. Only if Sage is free." },
  { id: "zara",  name: "Zara",  role: "Wardrobe · Outfit 1-2-3",      group: "life",   chat: false, status: "ok",   ran: "7:00am", desc: "Three outfits with weather + calendar context." },
  { id: "rue",   name: "Rue",   role: "Social · Important Dates",     group: "life",   chat: false, status: "ok",   ran: "8:00am", desc: "Birthdays, overdue catch-ups, message drafts." },
  { id: "bea",   name: "Bea",   role: "Hobbies · Guitar + Reading",   group: "life",   chat: false, status: "idle", ran: "—",      desc: "Gentle nudges when hobbies go quiet." },
];

// ── GROUP_META entries (add back to GROUP_META in data.jsx) ───────────────────
const ARCHIVED_GROUP_META = {
  career: { label: "Career", color: "var(--blue)",  light: "rgba(46,107,158,0.08)", border: "rgba(46,107,158,0.3)" },
  life:   { label: "Life",   color: "var(--terra)", light: "rgba(181,84,63,0.08)",  border: "rgba(181,84,63,0.3)" },
};

// ── NEWS_ITEMS (add back to data.jsx, used by CareerTab briefing sub-tab) ─────
const ARCHIVED_NEWS_ITEMS = [
  { source: "TechCrunch", hl: "AI engineering roles up 34% in Dublin",         why: "Cleo's match score moves with this trend — watch FinTech." },
  { source: "Reuters",    hl: "ECB holds rates steady, hints at September cut", why: "Affects Finn's savings rate model + your mortgage planning." },
  { source: "Anthropic",  hl: "Claude Haiku 4.5 ships — faster, cheaper",      why: "Could lower agent running costs by ~30%. Update Ch.5 plan." },
  { source: "The Verge",  hl: "LangChain 0.3 with new agent orchestration",    why: "Directly on your learning path. Scout is queuing examples." },
];

// ── Career-only SCHEDULE blocks (merge back into SCHEDULE in data.jsx) ────────
const ARCHIVED_SCHEDULE_BLOCKS = [
  { time: "08:00", title: "Deep work — model review",    sub: "Rex · AXA · 2 hr",              color: "var(--blue)", state: "work" },
  { time: "11:00", title: "Learning block — RAG basics", sub: "Scout · Ch.2 Session 1 · 45 m", color: "var(--blue)", state: "work" },
  { time: "14:00", title: "AXA team sync",               sub: "Calendar · 30 min",             color: "var(--blue)", state: "afternoon" },
];
