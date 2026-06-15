/* arc-context.jsx — Arc's shared brain (cross-agent intelligence layer)
 *
 * The app's agents used to be siloed: each chat saw only its own store, and the
 * "automatic" agents (Aurora, Nova, the Council, Mirror, Lyra) were static text.
 * This module is the single place that reads EVERY store, normalises it into one
 * snapshot, and turns that snapshot into real, cross-domain output:
 *
 *   buildArcSnapshot()  → one object pulling cycle, health, workouts, meals,
 *                         supplements, skincare, symptoms, blood markers, body,
 *                         schedule, chores, day-type, grocery.
 *   snapshotText(snap)  → compact text rendering, injected into every chat agent
 *                         so each one is aware of the other domains.
 *   buildArcTrends()    → deterministic 7/28-day trends (sleep, HRV, protein
 *                         adherence, symptoms, training) — powers Lyra & Soma.
 *   buildAdherence()    → real "did you follow through" stats — powers Mirror.
 *   useSynthesis(kind)  → cached LLM synthesis (council / aurora) via /api/
 *                         synthesize, with a deterministic fallback when offline.
 *
 * Loaded after every *-store.jsx and before tabs.jsx (see Arc Agents.html).
 * All store helpers are global (top-level fns in babel scripts), so we call them
 * directly, guarded with typeof checks for robustness.
 */

// ── date helpers ───────────────────────────────────────────────────────────────
function _ctxToday() {
  if (typeof _todayKey === "function") return _todayKey();
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function _ctxAddDays(dateKey, n) {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function _ctxSafe(fn, fallback) { try { const v = fn(); return v == null ? fallback : v; } catch (e) { return fallback; } }

// ── buildArcSnapshot — the shared state object ──────────────────────────────────
function buildArcSnapshot() {
  const date = _ctxToday();

  const cycle = _ctxSafe(() => deriveCycle(), {});
  const health = _ctxSafe(() => getHealthDay(date), {}) || {};
  const weekOf = _ctxSafe(() => (typeof currentWeekOf === "function" ? currentWeekOf() : null), null);

  const allWorkouts  = _ctxSafe(() => loadWorkouts().entries, []) || [];
  const workoutsToday = allWorkouts.filter(w => w.date === date);
  const recentWorkouts = allWorkouts.slice(-7);

  const macros = _ctxSafe(() => getDailyMacros(date), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const goals  = _ctxSafe(() => typeof getDynamicTargets === "function" ? getDynamicTargets() : loadMeals().goals, { kcal: 2000, protein: 120 });
  const meals  = _ctxSafe(() => getMealsForDate(date), []) || [];
  const proteinGap = Math.max(0, Math.round((goals.protein || 0) - (macros.protein || 0)));

  const activeSupps = _ctxSafe(() => getActiveSupplements(), []) || [];
  const dueSupps = activeSupps.filter(s => !s.takenToday);
  const lowSupps = _ctxSafe(() => activeSupps.filter(s => isSupplementLow(s)), []) || [];

  const expiringSkin = _ctxSafe(() => getExpiringSkincare(), []) || [];

  const symptomsToday  = _ctxSafe(() => getSymptomsForDate(date), []) || [];
  const recentSymptoms = _ctxSafe(() => getRecentSymptoms(7), []) || [];

  const markers = _ctxSafe(() => getLatestByMarker(), []) || [];
  const flaggedMarkers = markers.filter(m => m.status === "low" || m.status === "high");

  const body = _ctxSafe(() => getLatestBody(), null);

  const schedule = _ctxSafe(
    () => (weekOf ? getScheduleForWeek(weekOf).filter(it => it.date === date) : []), []
  ) || [];
  const dueChores = _ctxSafe(() => getDueChores(), []) || [];
  const dayType   = _ctxSafe(() => getDayType(date), "wfh");
  const grocery   = _ctxSafe(
    () => (weekOf ? getGroceriesForWeek(weekOf).filter(g => !g.checked) : []), []
  ) || [];

  const recentPurchases = _ctxSafe(() => typeof getRecentPurchases === "function" ? getRecentPurchases(14) : [], []) || [];

  const waterMl    = _ctxSafe(() => typeof getTodayWaterMl === "function" ? getTodayWaterMl() : 0, 0);
  const waterGoal  = (typeof WATER_GOAL_ML !== "undefined") ? WATER_GOAL_ML : 2000;

  return {
    date,
    cycle: {
      phase: cycle.label || null, id: cycle.id || null, day: cycle.day || null,
      energy: cycle.energy || null, set: !!cycle.set,
    },
    health,
    macros, goals, proteinGap, mealCount: meals.length,
    workoutsToday: workoutsToday.map(w => ({ type: w.type, duration: w.duration, intensity: w.intensity })),
    recentWorkouts: recentWorkouts.map(w => ({ date: w.date, type: w.type, duration: w.duration, intensity: w.intensity })),
    supplements: {
      active: activeSupps.length,
      due: dueSupps.map(s => s.name),
      low: lowSupps.map(s => ({ name: s.name, daysLeft: s.daysLeft })),
    },
    skincareExpiring: expiringSkin.map(p => ({ name: p.name, flag: p.expiry_flag, days: p.days_left })),
    symptomsToday: symptomsToday.map(s => ({ symptom: s.symptom, severity: s.severity })),
    recentSymptoms: recentSymptoms.map(s => ({ date: s.date, symptom: s.symptom, severity: s.severity, cycleDay: s.cycleDay })),
    flaggedMarkers: flaggedMarkers.map(m => ({ marker: m.marker, value: m.value, unit: m.unit, status: m.status, trend: m.trend })),
    body: body ? { date: body.date } : null,
    schedule: schedule.map(it => ({ time: it.time, label: it.label, type: it.type, done: it.done })),
    dueChores: dueChores.map(c => c.label),
    dayType,
    groceryOpen: grocery.map(g => g.name),
    recentPurchases: recentPurchases.map(p => ({ name: p.name, date: p.date, phase: p.phase })),
    water: { ml: waterMl, goalMl: waterGoal },
  };
}

// ── snapshotText — compact rendering for LLM context ────────────────────────────
function snapshotText(snap) {
  const s = snap || buildArcSnapshot();
  const L = [];
  const c = s.cycle || {};
  L.push(`Cycle: ${c.set ? `${c.phase} day ${c.day} — ${c.energy}` : "not set"}`);

  const h = s.health || {};
  const hv = [
    h.sleep_duration != null && `sleep ${h.sleep_duration}h`,
    h.deep_sleep_min != null && `deep ${h.deep_sleep_min}min`,
    h.hrv != null && `HRV ${h.hrv}ms`,
    h.resting_hr != null && `RHR ${h.resting_hr}`,
    h.steps != null && `${Number(h.steps).toLocaleString()} steps`,
    h.mood_score != null && `mood ${h.mood_score}/10`,
    h.energy_score != null && `energy ${h.energy_score}/10`,
  ].filter(Boolean).join(", ");
  L.push(`Today's body signals: ${hv || "not logged"}`);

  if (s.workoutsToday.length)
    L.push(`Worked out today: ${s.workoutsToday.map(w => `${w.type} ${w.duration}min int ${w.intensity}/5`).join("; ")}`);
  else if (s.recentWorkouts.length)
    L.push(`Recent training: ${s.recentWorkouts.slice(-4).map(w => `${w.date} ${w.type} ${w.duration}min`).join("; ")}`);

  const gParts = [`${Math.round(s.macros.kcal)}/${s.goals.kcal} kcal`, `${Math.round(s.macros.protein)}/${s.goals.protein}g protein${s.proteinGap > 0 ? ` (short ${s.proteinGap}g)` : ""}`];
  if (s.goals.carbs) gParts.push(`${Math.round(s.macros.carbs || 0)}/${s.goals.carbs}g carbs`);
  if (s.goals.fat) gParts.push(`${Math.round(s.macros.fat || 0)}/${s.goals.fat}g fat`);
  L.push(`Nutrition today: ${gParts.join(", ")}, ${s.mealCount} meal(s) logged`);

  if (s.supplements.due.length)
    L.push(`Supplements still to take today: ${s.supplements.due.join(", ")}`);
  if (s.supplements.low.length)
    L.push(`Supplements running low: ${s.supplements.low.map(x => `${x.name} (${x.daysLeft}d)`).join(", ")}`);

  if (s.symptomsToday.length)
    L.push(`Symptoms today: ${s.symptomsToday.map(x => `${x.symptom} (sev ${x.severity})`).join(", ")}`);

  if (s.flaggedMarkers.length)
    L.push(`Blood markers out of range: ${s.flaggedMarkers.map(m => `${m.marker} ${m.value}${m.unit || ""} ${m.status.toUpperCase()}`).join(", ")}`);

  if (s.skincareExpiring.length)
    L.push(`Skincare expiring: ${s.skincareExpiring.map(p => `${p.name} (${p.flag === "expired" ? "expired" : p.days + "d"})`).join(", ")}`);

  if (s.schedule.length)
    L.push(`Today's plan: ${s.schedule.map(it => `${it.time} ${it.label}${it.done ? " ✓" : ""}`).join("; ")}`);
  if (s.dueChores.length)
    L.push(`Chores due: ${s.dueChores.slice(0, 6).join(", ")}${s.dueChores.length > 6 ? ` (+${s.dueChores.length - 6} more)` : ""}`);
  L.push(`Day type: ${s.dayType}`);
  if (s.groceryOpen.length)
    L.push(`Grocery to buy: ${s.groceryOpen.slice(0, 12).join(", ")}`);
  if (s.water && s.water.ml != null)
    L.push(`Hydration today: ${s.water.ml}ml / ${s.water.goalMl || 2000}ml${s.water.ml >= (s.water.goalMl || 2000) ? " ✓ goal met" : ` (${Math.round((s.water.ml / (s.water.goalMl || 2000)) * 100)}%)`}`);

  return L.join("\n");
}

// ── buildArcTrends — deterministic trends (Lyra / Soma) ─────────────────────────
function buildArcTrends() {
  const today = _ctxToday();
  const days = _ctxSafe(() => loadHealth().days, {}) || {};
  const last = (n) => Array.from({ length: n }, (_, i) => days[_ctxAddDays(today, -i)]).filter(Boolean);
  const mean = (arr, key) => {
    const v = arr.map(x => x[key]).filter(x => x != null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };

  const recent7 = last(7);
  const sleepAvg = mean(recent7, "sleep_duration");
  const stepsAvg = mean(recent7, "steps");
  const hrvAvg   = mean(recent7, "hrv");

  // HRV direction: compare first vs second half of the available 7-day series.
  const hrvSeries = recent7.map(x => x.hrv).filter(x => x != null).reverse(); // oldest→newest
  let hrvDirection = null;
  if (hrvSeries.length >= 4) {
    const half = Math.floor(hrvSeries.length / 2);
    const a = hrvSeries.slice(0, half), b = hrvSeries.slice(-half);
    const am = a.reduce((x, y) => x + y, 0) / a.length, bm = b.reduce((x, y) => x + y, 0) / b.length;
    hrvDirection = bm > am + 2 ? "rising" : bm < am - 2 ? "falling" : "steady";
  }

  // Protein adherence over the last 7 calendar days that had any meal logged.
  const goalP = _ctxSafe(() => loadMeals().goals.protein, 120) || 120;
  let metDays = 0, mealDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = _ctxAddDays(today, -i);
    const m = _ctxSafe(() => getDailyMacros(d), { protein: 0 });
    if (m.protein > 0) { mealDays++; if (m.protein >= goalP * 0.9) metDays++; }
  }

  // Training this week
  const weekOf = _ctxSafe(() => currentWeekOf(), null);
  const wsum = (weekOf && typeof getWorkoutSummary === "function") ? getWorkoutSummary(weekOf) : { count: 0, totalMinutes: 0 };

  // Symptom frequency (last 28d), top 3
  const recentSym = _ctxSafe(() => getRecentSymptoms(28), []) || [];
  const symCounts = {};
  recentSym.forEach(s => { symCounts[s.symptom] = (symCounts[s.symptom] || 0) + 1; });
  const topSymptoms = Object.entries(symCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([symptom, count]) => ({ symptom, count }));

  // Logging consistency
  let logged7 = 0;
  const core = (typeof HEALTH_CORE !== "undefined") ? HEALTH_CORE : ["sleep_duration", "hrv", "resting_hr", "steps"];
  for (let i = 0; i < 7; i++) {
    const d = days[_ctxAddDays(today, -i)];
    if (d && core.some(k => d[k] != null)) logged7++;
  }

  return {
    sleepAvg, stepsAvg, hrvAvg, hrvDirection,
    protein: { metDays, mealDays, goal: goalP },
    training: { count: wsum.count, minutes: wsum.totalMinutes },
    topSymptoms,
    logged7,
    enoughData: logged7 >= 3 || mealDays >= 3 || recentSym.length >= 3,
  };
}

// Human-readable trend lines (used by the API synthesis prompt and Lyra fallback).
function trendsText(trends) {
  const t = trends || buildArcTrends();
  const L = [];
  if (t.sleepAvg != null) L.push(`7-day sleep average: ${t.sleepAvg}h`);
  if (t.hrvAvg != null) L.push(`7-day HRV average: ${t.hrvAvg}ms${t.hrvDirection ? ` (${t.hrvDirection})` : ""}`);
  if (t.stepsAvg != null) L.push(`7-day steps average: ${Math.round(t.stepsAvg).toLocaleString()}`);
  if (t.protein.mealDays) L.push(`Protein target met ${t.protein.metDays}/${t.protein.mealDays} logged days (goal ${t.protein.goal}g)`);
  if (t.training.count) L.push(`Training this week: ${t.training.count} session(s), ${t.training.minutes} min`);
  if (t.topSymptoms.length) L.push(`Most frequent symptoms (28d): ${t.topSymptoms.map(s => `${s.symptom} ×${s.count}`).join(", ")}`);
  L.push(`Health logged ${t.logged7}/7 of the last 7 days`);
  return L.join("\n");
}

// ── buildAdherence — real follow-through stats (Mirror) ─────────────────────────
function buildAdherence() {
  const today = _ctxToday();
  const supps = _ctxSafe(() => getActiveSupplements(), []) || [];
  const suppTaken = supps.filter(s => s.takenToday).length;

  const days = _ctxSafe(() => loadHealth().days, {}) || {};
  const core = (typeof HEALTH_CORE !== "undefined") ? HEALTH_CORE : ["sleep_duration", "hrv", "resting_hr", "steps"];
  let logged7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = days[_ctxAddDays(today, -i)];
    if (d && core.some(k => d[k] != null)) logged7++;
  }

  const weekOf = _ctxSafe(() => currentWeekOf(), null);
  const workouts = (weekOf && typeof getWorkoutsForWeek === "function") ? getWorkoutsForWeek(weekOf).length : 0;

  const chores = _ctxSafe(() => loadChores().chores, []) || [];
  const choresDoneToday = chores.filter(c => c.lastDone === today).length;
  const choresDue = _ctxSafe(() => getDueChores().length, 0);

  return { suppTaken, suppTotal: supps.length, logged7, workouts, choresDoneToday, choresDue };
}

// ── Deterministic fallbacks (used when the API is unreachable) ───────────────────
function councilFallback(snap) {
  const s = snap || buildArcSnapshot();
  const c = s.cycle || {};
  const base = {
    menstrual:  `Rest is the work right now. Energy runs lower on day ${c.day} — Felix recommends gentle movement only, and Nora leans into iron-rich, warming food.`,
    follicular: `Energy is climbing. Felix sees a window for strength and Nora suggests protein-forward meals to fuel it — estrogen is rising, use it.`,
    ovulatory:  `Peak window active — your highest-output phase. Felix recommends higher intensity; Cara notes skin can be reactive, so keep actives minimal.`,
    luteal:     `Shifting toward recovery. Progesterone is rising — Felix dials intensity back, Nora leans on magnesium-rich foods, and sleep matters more this week.`,
  }[c.id] || `Tracking cycle day ${c.day || "—"}. Agents are calibrating to your ${c.phase || "current"} phase.`;
  // Layer one real cross-domain signal on top, when present.
  if (s.proteinGap > 25 && s.workoutsToday.length)
    return base + ` You trained today and protein is ${s.proteinGap}g short — Nora flags a protein top-up tonight.`;
  if (s.health && s.health.hrv != null && s.health.hrv < 40)
    return base + ` HRV is low today (${s.health.hrv}ms) — Felix and Soma both suggest taking it easy.`;
  if (s.supplements.low.length)
    return base + ` Heads up from Cara: ${s.supplements.low.map(x => x.name).join(", ")} running low.`;
  return base;
}

function auroraFallback(snap) {
  const s = snap || buildArcSnapshot();
  const c = s.cycle || {};
  const bits = [];
  if (c.set) bits.push(`${c.phase} day ${c.day} — ${c.energy}`);
  if (s.health && s.health.sleep_duration != null) bits.push(`${s.health.sleep_duration}h sleep`);
  if (s.schedule.length) bits.push(`${s.schedule.length} block${s.schedule.length === 1 ? "" : "s"} planned`);
  if (s.proteinGap > 0) bits.push(`${s.proteinGap}g protein to go`);
  return bits.length ? bits.join(" · ") : "Log today's health to get your morning briefing.";
}

// ── useSynthesis — cached LLM synthesis with deterministic fallback ──────────────
function useSynthesis(kind) {
  const cacheKey = `arc-synth-${kind}`;
  const read = () => {
    try {
      const c = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (c && c.date === _ctxToday() && c.text) return c;
    } catch (e) {}
    return null;
  };
  const [state, setState] = React.useState(() => {
    const c = read();
    return { text: c ? c.text : null, loading: false, error: null, savedAt: c ? c.savedAt : null, source: c ? "cache" : null };
  });

  const run = React.useCallback((force) => {
    if (!force) { const c = read(); if (c) { setState({ text: c.text, loading: false, error: null, savedAt: c.savedAt, source: "cache" }); return; } }
    setState(st => ({ ...st, loading: true, error: null }));
    const snap = buildArcSnapshot();
    fetch("/api/synthesize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, snapshot: snapshotText(snap), trends: trendsText(), phase: snap.cycle.phase }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error || !data.text) throw new Error(data.error || "empty");
        const savedAt = Date.now();
        try { localStorage.setItem(cacheKey, JSON.stringify({ date: _ctxToday(), text: data.text, savedAt })); } catch (e) {}
        setState({ text: data.text, loading: false, error: null, savedAt, source: "api" });
      })
      .catch(err => {
        const fb = kind === "council" ? councilFallback(snap) : auroraFallback(snap);
        setState({ text: fb, loading: false, error: err.message, savedAt: null, source: "fallback" });
      });
  }, [kind, cacheKey]);

  React.useEffect(() => {
    if (!state.text) run(false);
    // Re-run when the underlying data changes materially (only if not freshly cached today).
  }, []); // eslint-disable-line

  return { ...state, refresh: () => run(true) };
}

Object.assign(window, {
  buildArcSnapshot, snapshotText, buildArcTrends, trendsText,
  buildAdherence, councilFallback, auroraFallback, useSynthesis,
});
