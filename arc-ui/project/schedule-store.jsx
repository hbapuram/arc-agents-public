/* schedule-store.jsx — four stores: schedule, chores, supplements, workouts
 * keys: arc-schedule-v1, arc-chores-v1, arc-supplements-v1, arc-workouts-v1
 * Loaded before tabs.jsx; registers all helpers on window.
 */

function _dateStr(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}

function _addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return _dateStr(d);
}

// Returns Mon–Sun date strings for the week containing weekOf
function _weekDates(weekOf) {
  return Array.from({ length: 7 }, (_, i) => _addDays(weekOf, i));
}

// ── Schedule store ────────────────────────────────────────────────────────────
const SCHEDULE_STORE_KEY = "arc-schedule-v1";

function loadSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { items: Array.isArray(o.items) ? o.items : [] }; }
  } catch (e) {}
  return { items: [] };
}

function saveSchedule(o) {
  try { localStorage.setItem(SCHEDULE_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("schedulechange"));
}

function addScheduleItem(item) {
  const o = loadSchedule();
  o.items.push({ done: false, ...item, id: String(Date.now() + Math.random()) });
  saveSchedule(o);
}

function updateScheduleItem(id, edits) {
  const o = loadSchedule();
  o.items = o.items.map(it => it.id === id ? { ...it, ...edits } : it);
  saveSchedule(o);
}

function deleteScheduleItem(id) {
  const o = loadSchedule();
  o.items = o.items.filter(it => it.id !== id);
  saveSchedule(o);
}

function toggleScheduleItem(id) {
  const o = loadSchedule();
  o.items = o.items.map(it => it.id === id ? { ...it, done: !it.done } : it);
  saveSchedule(o);
}

function getScheduleForWeek(weekOf) {
  const dates = new Set(_weekDates(weekOf));
  return loadSchedule().items.filter(it => dates.has(it.date));
}

function useScheduleVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("schedulechange", h);
    return () => window.removeEventListener("schedulechange", h);
  }, []);
  return v;
}

// ── Chores store ──────────────────────────────────────────────────────────────
const CHORES_STORE_KEY = "arc-chores-v1";

// Pre-fixed chores. dayType: "any"|"wfh"|"weekend" — when they're best done.
const FIXED_CHORES = [
  // Daily
  { id:"fc-dishes",    label:"Wash dishes",              category:"Kitchen",   frequency:"daily",      duration:10, dayType:"any",     fixed:true },
  { id:"fc-counters",  label:"Wipe counters",            category:"Kitchen",   frequency:"daily",      duration:5,  dayType:"any",     fixed:true },
  { id:"fc-tidy",      label:"Tidy room reset",          category:"Household", frequency:"daily",      duration:5,  dayType:"any",     fixed:true },
  // Weekly
  { id:"fc-laundry",   label:"Laundry",                  category:"Household", frequency:"weekly",     duration:30, dayType:"wfh",     fixed:true },
  { id:"fc-floors",    label:"Vacuum + mop floors",      category:"Household", frequency:"weekly",     duration:30, dayType:"wfh",     fixed:true },
  { id:"fc-bathroom",  label:"Clean bathroom",           category:"Household", frequency:"weekly",     duration:20, dayType:"wfh",     fixed:true },
  { id:"fc-pantry",    label:"Refresh pantry drawer",    category:"Kitchen",   frequency:"weekly",     duration:10, dayType:"any",     fixed:true },
  { id:"fc-bottles",   label:"Clean bottles + containers", category:"Kitchen", frequency:"weekly",     duration:15, dayType:"any",     fixed:true },
  { id:"fc-desk",      label:"Desk clear + organise",    category:"Household", frequency:"weekly",     duration:10, dayType:"any",     fixed:true },
  { id:"fc-cosm",      label:"Organise cosmetics",       category:"Household", frequency:"weekly",     duration:10, dayType:"any",     fixed:true },
  { id:"fc-dust",      label:"Dust surfaces",            category:"Household", frequency:"weekly",     duration:15, dayType:"wfh",     fixed:true },
  { id:"fc-plant",     label:"Water + wipe Monstera",    category:"Household", frequency:"weekly",     duration:5,  dayType:"any",     fixed:true },
  // Biweekly
  { id:"fc-sheets",    label:"Change bed sheets",        category:"Household", frequency:"biweekly",   duration:15, dayType:"wfh",     fixed:true },
  // Monthly
  { id:"fc-oven",      label:"Deep clean oven",          category:"Kitchen",   frequency:"monthly",    duration:30, dayType:"weekend", fixed:true },
  { id:"fc-cupboards", label:"Wipe down cupboards",      category:"Household", frequency:"monthly",    duration:20, dayType:"any",     fixed:true },
  { id:"fc-kettle",    label:"Descale kettle",           category:"Kitchen",   frequency:"monthly",    duration:10, dayType:"any",     fixed:true },
  { id:"fc-wardrobe",  label:"Organise wardrobe",        category:"Household", frequency:"monthly",    duration:20, dayType:"any",     fixed:true },
  // Every 2 months
  { id:"fc-laundr2",   label:"Laundromat run",           category:"Household", frequency:"bimonthly",  duration:90, dayType:"weekend", fixed:true },
];

const FREQ_DAYS = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, bimonthly: 60 };

function loadChores() {
  try {
    const raw = localStorage.getItem(CHORES_STORE_KEY);
    const today = _dateStr();
    if (raw) {
      const o = JSON.parse(raw);
      const result = { chores: Array.isArray(o.chores) ? o.chores : [] };
      const existingIds = new Set(result.chores.map(c => c.id));
      const missing = FIXED_CHORES.filter(fc => !existingIds.has(fc.id));
      if (missing.length) {
        missing.forEach(fc => result.chores.push({ ...fc, lastDone: null, nextDue: today }));
        try { localStorage.setItem(CHORES_STORE_KEY, JSON.stringify(result)); } catch(e) {}
      }
      return result;
    }
  } catch (e) {}
  const today = _dateStr();
  const o = { chores: FIXED_CHORES.map(fc => ({ ...fc, lastDone: null, nextDue: today })) };
  try { localStorage.setItem(CHORES_STORE_KEY, JSON.stringify(o)); } catch(e) {}
  return o;
}

function saveChores(o) {
  try { localStorage.setItem(CHORES_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("choreschange"));
}

function addChore(chore) {
  const o = loadChores();
  const today = _dateStr();
  o.chores.push({
    category: "Household",
    frequency: "weekly",
    lastDone: null,
    nextDue: today,
    ...chore,
    id: String(Date.now() + Math.random()),
    fixed: false,
  });
  saveChores(o);
}

function updateChore(id, edits) {
  const o = loadChores();
  o.chores = o.chores.map(c => c.id === id ? { ...c, ...edits } : c);
  saveChores(o);
}

function deleteChore(id) {
  const o = loadChores();
  const chore = o.chores.find(c => c.id === id);
  if (chore && chore.fixed) return; // fixed chores cannot be deleted
  o.chores = o.chores.filter(c => c.id !== id);
  saveChores(o);
}

function markChoreDone(id) {
  const o = loadChores();
  const today = _dateStr();
  o.chores = o.chores.map(c => {
    if (c.id !== id) return c;
    const freqDays = FREQ_DAYS[c.frequency] || 7;
    return { ...c, lastDone: today, nextDue: _addDays(today, freqDays) };
  });
  saveChores(o);
}

function getDueChores() {
  const today = _dateStr();
  return loadChores().chores.filter(c => c.nextDue <= today);
}

function useChoresVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("choreschange", h);
    return () => window.removeEventListener("choreschange", h);
  }, []);
  return v;
}

// ── Supplements store ─────────────────────────────────────────────────────────
// v2 seeds imported from the user's real Notion Supplements DB (Jun 2026).
// Rich shape: dose, frequency, cycle phases, expiry, purpose, interaction notes,
// health goals, stock status — all editable in-app (and later via "Tell Arc").
const SUPPLEMENTS_STORE_KEY = "arc-supplements-v2";

const SUPPLEMENT_SEEDS = [
  { id: "seed-1", name: "Supply6 360", category: "Multivitamin", dose: "1 sachet", dosage: 1, unit: "sachets",
    timing: "morning", mealTiming: "with_food", frequency: "Daily", phases: ["Any"], daysLeft: 30, totalDays: 30,
    expiry: "2027-07-31", purpose: "All-in-one nutrition — 63+ nutrients, probiotics, greens, adaptogens",
    notes: "Mix 1 sachet in water every morning", healthGoals: ["Energy", "Immune Support", "Hormone Balance"],
    timingNote: "Dissolve in water; take with or just after breakfast. B vitamins can irritate an empty stomach.",
    avoidWith: [],
    stockStatus: "Active", source: "India", cost: 18, active: true, takenToday: false },
  { id: "seed-2", name: "Iron Biglycinate", category: "Minerals", dose: "20 mg", dosage: 20, unit: "mg",
    timing: "morning", mealTiming: "before_food", frequency: "Daily", phases: ["Menstrual", "Follicular", "Ovulatory"], daysLeft: 0, totalDays: 30,
    expiry: null, purpose: "Anemia — Haemoglobin 11.7 (low)",
    notes: "Take with Frootcee in the morning. Space 2 hours from magnesium", healthGoals: ["Energy", "Hair health", "Immune Support"],
    timingNote: "30 min before food for best absorption, or pair with Vitamin C (Frootcee) to boost uptake by up to 3×. Avoid tea, coffee, and dairy for at least 1h either side.",
    avoidWith: ["Tea or coffee within 1h", "Dairy or calcium-rich foods", "Zinc same day (Zinconia)", "Magnesium at the same time"],
    stockStatus: "On Order", source: "", cost: null, active: false, takenToday: false },
  { id: "seed-3", name: "Biotin", category: "Vitamins", dose: "10 mg", dosage: 10, unit: "mg",
    timing: "with_food", mealTiming: "with_food", frequency: "Daily", phases: ["Any"], daysLeft: 0, totalDays: 30,
    expiry: null, purpose: "For hairfall, brittle nails",
    notes: "Take daily with food. Results visible after 8–12 weeks", healthGoals: ["Hair health", "Skin"],
    timingNote: "Any meal. Food prevents mild stomach upset. No significant food or supplement interactions.",
    avoidWith: [],
    stockStatus: "On Order", source: "", cost: null, active: false, takenToday: false },
  { id: "seed-4", name: "Zinconia-50", category: "Minerals", dose: "50 mg", dosage: 50, unit: "mg",
    timing: "with_food", mealTiming: "with_food", frequency: "Weekly", phases: ["Any"], daysLeft: 70, totalDays: 70,
    expiry: "2028-01-01", purpose: "Zinc — REDUCE frequency to avoid blocking iron absorption",
    notes: "Take only weekly. Do NOT take with Frootcee on the same day", healthGoals: ["Hair health", "Immune Support", "Skin"],
    timingNote: "Always with food to prevent nausea. NEVER on the same day as Frootcee — the combined zinc dose exceeds safe limits and blocks iron absorption.",
    avoidWith: ["Frootcee same day (excess zinc)", "Iron supplements (competes for absorption)", "Black tea or coffee"],
    stockStatus: "Discontinued", source: "India", cost: 4, active: false, takenToday: false },
  { id: "seed-5", name: "Frootcee", category: "Vitamins", dose: "39 mg", dosage: 39, unit: "mg",
    timing: "morning", mealTiming: "with_food", frequency: "Alternating", phases: ["Any"], daysLeft: 30, totalDays: 30,
    expiry: "2027-02-28", purpose: "Vitamin C — enhances iron absorption",
    notes: "Contains ascorbic acid + zinc. Take with iron. Do NOT take with Zinconia on the same day", healthGoals: ["Energy", "Immune Support", "Hair health"],
    timingNote: "Take alongside iron to enhance absorption. Avoid Zinconia on the same day — this sachet already contains zinc, so double dosing risks blocking iron uptake.",
    avoidWith: ["Zinconia same day (excess zinc)", "Antacids (reduce vitamin C absorption)"],
    stockStatus: "Active", source: "India", cost: 2.5, active: true, takenToday: false },
  { id: "seed-6", name: "Magnesium Biglycinate", category: "Minerals", dose: "175 mg", dosage: 175, unit: "mg",
    timing: "evening", mealTiming: "anytime", frequency: "Daily", phases: ["Menstrual", "Luteal"], daysLeft: 180, totalDays: 180,
    expiry: "2029-03-31", purpose: "Sleep, stress, hormone balance, hair health",
    notes: "Take 2 hours after iron, in the evening. Contains L-leucine (105mg)", healthGoals: ["Sleep", "Hormone Balance", "Hair health", "Bone health"],
    timingNote: "Evening or bedtime is ideal — magnesium glycinate promotes relaxation and deeper sleep. Food not required. Space at least 2h from iron.",
    avoidWith: ["Iron at the same time (space 2 hours)", "Very high-dose calcium at the same time"],
    stockStatus: "Active", source: "Amazon.ie", cost: 15, active: true, takenToday: false },
  { id: "seed-7", name: "Care D3 Plus Nano Shots", category: "Vitamins", dose: "60000 IU", dosage: 60000, unit: "IU",
    timing: "with_food", mealTiming: "with_food", frequency: "As Needed", phases: ["Any"], daysLeft: 4, totalDays: 4,
    expiry: "2026-12-31", purpose: "Vitamin D3 — critical for Ireland winter / low sun exposure",
    notes: "Summer = 1 vial every 2 months; Winter = 1 vial every 2 weeks", healthGoals: ["Bone health", "Immune Support", "Mood"],
    timingNote: "Must be taken WITH a fat-containing meal — D3 is fat-soluble and absorption drops significantly without dietary fat. Take with your largest meal of the day.",
    avoidWith: [],
    stockStatus: "Active", source: "India", cost: 24, active: true, takenToday: false },
  { id: "seed-8", name: "Neurospire D3", category: "Vitamins", dose: "1 tablet", dosage: 1, unit: "tablets",
    timing: "morning", mealTiming: "before_food", frequency: "Alternating", phases: ["Any"], daysLeft: 60, totalDays: 60,
    expiry: "2027-09-30", purpose: "Methylcobalamin (B12) — critical for deficiency (bloodwork: 200 pg/mL)",
    notes: "Alternate with M-Strong on non-B12 days. Backup B12 source", healthGoals: ["Energy", "Hair health", "Immune Support"],
    timingNote: "Morning on an empty stomach or with a light snack. The sublingual/nano form absorbs well regardless, but morning timing makes productive use of the energy boost.",
    avoidWith: ["Excessive alcohol (depletes B12)", "Metformin users (increases B12 requirements — discuss with GP)"],
    stockStatus: "Active", source: "India", cost: 5, active: true, takenToday: false },
  { id: "seed-9", name: "M-Strong", category: "Vitamins", dose: "1 capsule", dosage: 1, unit: "capsules",
    timing: "morning", mealTiming: "with_food", frequency: "Daily", phases: ["Any"], daysLeft: 30, totalDays: 30,
    expiry: "2028-01-01", purpose: "B12 + metabolic support (methylcobalamin, folic acid, ALA, myo-inositol)",
    notes: "Alternate with Neurospire D3 on non-B12 days", healthGoals: ["Energy", "Hormone Balance"],
    timingNote: "Take with breakfast. High-dose B-vitamin complexes can cause nausea without food. The myo-inositol in this formula also benefits from food co-ingestion.",
    avoidWith: ["Excessive alcohol"],
    stockStatus: "Active", source: "India", cost: 17.5, active: true, takenToday: false },
];

// Timing enrichment lookup — used to migrate existing stored supplements that predate these fields.
const SUPP_TIMING_ENRICHMENT = {
  "seed-1": { mealTiming: "with_food",    avoidWith: [],                                                                                                                         timingNote: "Dissolve in water; take with or just after breakfast. B vitamins can irritate an empty stomach." },
  "seed-2": { mealTiming: "before_food",  avoidWith: ["Tea or coffee within 1h", "Dairy or calcium-rich foods", "Zinc same day (Zinconia)", "Magnesium at the same time"],        timingNote: "30 min before food for best absorption, or pair with Vitamin C (Frootcee) to boost uptake by up to 3×. Avoid tea, coffee, and dairy for at least 1h either side." },
  "seed-3": { mealTiming: "with_food",    avoidWith: [],                                                                                                                         timingNote: "Any meal. Food prevents mild stomach upset. No significant food or supplement interactions." },
  "seed-4": { mealTiming: "with_food",    avoidWith: ["Frootcee same day (excess zinc)", "Iron supplements (competes for absorption)", "Black tea or coffee"],                    timingNote: "Always with food to prevent nausea. NEVER on the same day as Frootcee — the combined zinc dose exceeds safe limits and blocks iron absorption." },
  "seed-5": { mealTiming: "with_food",    avoidWith: ["Zinconia same day (excess zinc)", "Antacids (reduce vitamin C absorption)"],                                               timingNote: "Take alongside iron to enhance absorption. Avoid Zinconia on the same day — this sachet already contains zinc, so double dosing risks blocking iron uptake." },
  "seed-6": { mealTiming: "anytime",      avoidWith: ["Iron at the same time (space 2 hours)", "Very high-dose calcium at the same time"],                                        timingNote: "Evening or bedtime is ideal — magnesium glycinate promotes relaxation and deeper sleep. Food not required. Space at least 2h from iron." },
  "seed-7": { mealTiming: "with_food",    avoidWith: [],                                                                                                                         timingNote: "Must be taken WITH a fat-containing meal — D3 is fat-soluble and absorption drops significantly without dietary fat. Take with your largest meal of the day." },
  "seed-8": { mealTiming: "before_food",  avoidWith: ["Excessive alcohol (depletes B12)", "Metformin users (increases B12 requirements — discuss with GP)"],                     timingNote: "Morning on an empty stomach or with a light snack. The sublingual/nano form absorbs well regardless, but morning timing makes productive use of the energy boost." },
  "seed-9": { mealTiming: "with_food",    avoidWith: ["Excessive alcohol"],                                                                                                       timingNote: "Take with breakfast. High-dose B-vitamin complexes can cause nausea without food. The myo-inositol in this formula also benefits from food co-ingestion." },
};

function _enrichSupp(s) {
  const e = SUPP_TIMING_ENRICHMENT[s.id];
  if (!e) return s;
  const out = { ...s };
  let changed = false;
  if (out.mealTiming == null) { out.mealTiming = e.mealTiming; changed = true; }
  if (out.avoidWith  == null) { out.avoidWith  = e.avoidWith;  changed = true; }
  if (out.timingNote == null) { out.timingNote = e.timingNote; changed = true; }
  return changed ? out : s;
}

function loadSupplements() {
  try {
    const raw = localStorage.getItem(SUPPLEMENTS_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      const today = _dateStr();
      // Auto-reset takenToday on new day
      if (o.lastReset !== today) {
        o.supplements = (o.supplements || []).map(s => ({ ...s, takenToday: false }));
        o.lastReset = today;
      }
      // One-time migration: add mealTiming/avoidWith/timingNote to seeds that predate these fields
      const base = Array.isArray(o.supplements) ? o.supplements : [];
      const enriched = base.map(_enrichSupp);
      const changed = enriched.some((s, i) => s !== base[i]);
      if (changed || o.lastReset === today) {
        o.supplements = enriched;
        try { localStorage.setItem(SUPPLEMENTS_STORE_KEY, JSON.stringify(o)); } catch (e) {}
      }
      return { supplements: enriched, lastReset: o.lastReset || today };
    }
  } catch (e) {}
  // First load: seed with known supplements (already include timing fields)
  const today = _dateStr();
  return { supplements: SUPPLEMENT_SEEDS, lastReset: today };
}

function saveSupplements(o) {
  try { localStorage.setItem(SUPPLEMENTS_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("supplementschange"));
}

function addSupplement(s) {
  const o = loadSupplements();
  o.supplements.push({
    timing: "morning",
    active: true,
    takenToday: false,
    ...s,
    id: String(Date.now() + Math.random()),
    daysLeft: s.daysLeft != null ? s.daysLeft : (s.totalDays || 30),
  });
  saveSupplements(o);
}

function updateSupplement(id, edits) {
  const o = loadSupplements();
  o.supplements = o.supplements.map(s => s.id === id ? { ...s, ...edits } : s);
  saveSupplements(o);
}

function deleteSupplement(id) {
  const o = loadSupplements();
  o.supplements = o.supplements.filter(s => s.id !== id);
  saveSupplements(o);
}

function toggleSupplementTaken(id) {
  const o = loadSupplements();
  o.supplements = o.supplements.map(s => {
    if (s.id !== id) return s;
    const nowTaken = !s.takenToday;
    return { ...s, takenToday: nowTaken, daysLeft: nowTaken ? Math.max(0, s.daysLeft - 1) : s.daysLeft + 1 };
  });
  saveSupplements(o);
}

// Returns active supplements, phase-matched ones sorted first so schedule labels
// and planner output naturally surface the most relevant supps without the
// caller needing to know anything about cycle phase.
function getActiveSupplements() {
  const phase = (typeof deriveCycle === "function" ? (deriveCycle()?.label || "") : "").toLowerCase();
  return loadSupplements().supplements
    .filter(s => s.active)
    .sort((a, b) => {
      const aMatch = (a.phases || []).some(p => String(p).toLowerCase() === phase);
      const bMatch = (b.phases || []).some(p => String(p).toLowerCase() === phase);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
}

// Supplements that are tracked but not in the daily list (On Order / Discontinued).
function getInactiveSupplements() {
  return loadSupplements().supplements.filter(s => !s.active);
}

// True if a supplement is flagged for the given cycle phase (or "Any").
function supplementMatchesPhase(s, phaseLabel) {
  if (!phaseLabel) return false;
  const phases = (s.phases || []).map(p => String(p).toLowerCase());
  if (phases.includes("any")) return false; // "Any" isn't a phase-specific highlight
  return phases.includes(String(phaseLabel).toLowerCase());
}

function isSupplementLow(s) {
  // "As Needed" supplies aren't day-counted; flag low only by raw units left.
  return s.daysLeft < 7;
}

function useSupplementsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("supplementschange", h);
    return () => window.removeEventListener("supplementschange", h);
  }, []);
  return v;
}

// ── Workouts store ────────────────────────────────────────────────────────────
const WORKOUTS_STORE_KEY = "arc-workouts-v1";

function loadWorkouts() {
  try {
    const raw = localStorage.getItem(WORKOUTS_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { entries: Array.isArray(o.entries) ? o.entries : [] }; }
  } catch (e) {}
  return { entries: [] };
}

function saveWorkouts(o) {
  try { localStorage.setItem(WORKOUTS_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("workoutschange"));
}

function addWorkout(entry) {
  const o = loadWorkouts();
  o.entries.push({ ...entry, id: String(Date.now() + Math.random()), loggedAt: Date.now() });
  saveWorkouts(o);
}

function updateWorkout(id, edits) {
  const o = loadWorkouts();
  o.entries = o.entries.map(e => e.id === id ? { ...e, ...edits } : e);
  saveWorkouts(o);
}

function deleteWorkout(id) {
  const o = loadWorkouts();
  o.entries = o.entries.filter(e => e.id !== id);
  saveWorkouts(o);
}

function getWorkoutsForWeek(weekOf) {
  const dates = new Set(_weekDates(weekOf));
  return loadWorkouts().entries.filter(e => dates.has(e.date));
}

function getWorkoutSummary(weekOf) {
  const entries = getWorkoutsForWeek(weekOf);
  const byType = {};
  let totalMinutes = 0;
  entries.forEach(e => {
    const mins = Number(e.duration) || 0;
    totalMinutes += mins;
    byType[e.type] = (byType[e.type] || 0) + mins;
  });
  return { totalMinutes, byType, count: entries.length };
}

function useWorkoutsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("workoutschange", h);
    return () => window.removeEventListener("workoutschange", h);
  }, []);
  return v;
}

Object.assign(window, {
  // schedule
  loadSchedule, saveSchedule, addScheduleItem, updateScheduleItem,
  deleteScheduleItem, toggleScheduleItem, getScheduleForWeek, useScheduleVersion,
  // chores
  loadChores, saveChores, addChore, updateChore, deleteChore,
  markChoreDone, getDueChores, useChoresVersion,
  // supplements
  loadSupplements, saveSupplements, addSupplement, updateSupplement, deleteSupplement,
  toggleSupplementTaken, getActiveSupplements, getInactiveSupplements,
  supplementMatchesPhase, isSupplementLow, useSupplementsVersion,
  // workouts
  loadWorkouts, saveWorkouts, addWorkout, updateWorkout, deleteWorkout,
  getWorkoutsForWeek, getWorkoutSummary, useWorkoutsVersion,
  // shared util
  _weekDates,
});
