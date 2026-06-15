/* Arc Agents — tab panels */

const { useMemo: _useMemo } = React;

/* ─── Icon helpers (line-style, inherit color) ─── */
function Icon({ name, size = 18 }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  switch (name) {
    case "today":   return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "health":  return <svg {...props}><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>;
    case "goals":   return <svg {...props}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>;
    case "career":  return <svg {...props}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case "life":    return <svg {...props}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></svg>;
    case "agents":  return <svg {...props}><circle cx="12" cy="9" r="4"/><path d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>;
    case "council":  return <svg {...props}><path d="M6 4h12v6a6 6 0 0 1-12 0z"/><path d="M9 20h6M12 16v4"/></svg>;
    case "search":   return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
    case "chat":     return <svg {...props}><path d="M21 12a8 8 0 0 1-12.2 6.8L4 20l1.2-4.8A8 8 0 1 1 21 12z"/></svg>;
    case "settings": return <svg {...props}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/></svg>;
    default:         return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

/* ─── Markdown renderer (bold + italic only, HTML-escaped) ─── */
function renderMd(text) {
  if (!text) return "";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/* ─── Small helpers ─── */
function AgentDot({ id }) {
  const a = AGENTS.find(x => x.id === id);
  const c = a ? GROUP_META[a.group].color : "var(--muted)";
  return <span className="agent-dot" style={{ background: c }} aria-hidden="true" />;
}

function statusColor(s) {
  return s === "ok" ? "var(--sage)" : s === "slow" ? "var(--amber)" : s === "failed" ? "var(--terra)" : "var(--muted)";
}

/* ─── TODAY ─── */
// Maps schedule-store item types → strip accent colour.
const _SCHEDULE_TYPE_COLOR = {
  grocery_run: "var(--amber)", meal_prep: "var(--sage)", chore: "var(--lav)",
  workout: "var(--terra)", supplement_dose: "var(--teal)", other: "var(--deep)",
};

// Today's real schedule items (from schedule-store), shaped for the Today strip.
// Returns [] when nothing is logged — never falls back to static sample data.
function _todayStripItems(todayKey) {
  if (typeof getScheduleForWeek !== "function" || typeof currentWeekOf !== "function") return [];
  const items = getScheduleForWeek(currentWeekOf())
    .filter(it => it.date === todayKey && it.time)
    .sort((a, b) => (a.time < b.time ? -1 : 1));
  return items.map(it => ({
    time: it.time,
    title: it.label,
    sub: `${(_SCHEDULE_TYPE_LABELS && _SCHEDULE_TYPE_LABELS[it.type]) || it.type}${it.done ? " · done" : ""}`,
    color: _SCHEDULE_TYPE_COLOR[it.type] || "var(--deep)",
  }));
}

// Builds the Cara skincare feed line from real expiry data (or null if nothing flagged).
function _caraFeedText() {
  if (typeof getExpiringSkincare !== "function") return null;
  const expiring = getExpiringSkincare();
  if (!expiring.length) return null;
  const p = expiring[0];
  const when = p.expiry_flag === "expired" ? "has expired" : `runs out in ${p.days_left} day${p.days_left === 1 ? "" : "s"}`;
  return `${p.name} ${when}${expiring.length > 1 ? ` (+${expiring.length - 1} more)` : ""}.`;
}

// Builds the Pulse signal line from today's real HRV / steps (or a stable-signal fallback).
function _pulseFeedText(d) {
  if (d.hrv != null && d.hrv < 40) return `HRV ${d.hrv} ms — trending low. Take a 5-min reset and keep intensity easy.`;
  if (d.steps != null && d.steps < 3000) return `Only ${Number(d.steps).toLocaleString()} steps so far — a short walk would help.`;
  if (d.hrv != null || d.steps != null) return "Signals look stable this afternoon — nothing reactive to flag.";
  return "Log today's health to get reactive mid-day signals.";
}

// Returns next predicted period start date string (YYYY-MM-DD), or null.
function _nextPeriodDate() {
  if (typeof loadHealth !== "function") return null;
  const o = loadHealth();
  if (!o.period_start) return null;
  const len = Number(o.cycle_length) || 28;
  const d = new Date(o.period_start + "T00:00:00");
  d.setDate(d.getDate() + len);
  return d.toISOString().slice(0, 10);
}

// Returns the most recent workout logged today within the last 60 min, or null.
function _recentWorkoutForProtein() {
  if (typeof loadWorkouts !== "function") return null;
  const today = _todayKey();
  const entries = loadWorkouts().entries.filter(e => e.date === today && e.loggedAt);
  if (!entries.length) return null;
  const latest = entries.slice().sort((a, b) => b.loggedAt - a.loggedAt)[0];
  return (Date.now() - latest.loggedAt < 3600000) ? latest : null;
}

/* ─── Tab intro collapsible ─── */
function TabIntro({ title, children }) {
  return (
    <details className="tab-intro">
      <summary>{title || "About this tab"}</summary>
      <div className="tab-intro-body">{children}</div>
    </details>
  );
}

function TodayTab({ state, phase, openAgent, who }) {
  // Re-render when any feeding store changes (all loaded before tabs.jsx).
  useHealthVersion();
  useScheduleVersion();
  useSkincareVersion();
  useSupplementsVersion();
  useWorkVersion();
  const isMorning  = state === "morning";
  const isEvening  = state === "evening" || state === "winddown";
  const ph = (phase && typeof phase === "object")
    ? phase : (CYCLE_PHASES.find(p => p.id === phase) || CYCLE_PHASES[1]);

  const todayKey   = _todayKey();
  const d          = getHealthDay();
  const stripItems = _todayStripItems(todayKey);
  const caraText   = _caraFeedText();
  const pulseText  = _pulseFeedText(d);
  const lowSupps   = (typeof getActiveSupplements === "function")
    ? getActiveSupplements().filter(s => typeof isSupplementLow === "function" && isSupplementLow(s)) : [];
  const sageText   = stripItems.length
    ? `${stripItems.length} block${stripItems.length === 1 ? "" : "s"} · ${stripItems.map(s => s.time).join(" · ")}`
    : "No blocks scheduled today — add some in Life → Schedule.";

  // Period confirmation banner
  const nextPeriod  = _nextPeriodDate();
  const dayDiff     = nextPeriod ? Math.round((new Date(todayKey) - new Date(nextPeriod)) / 86400000) : null;
  const showPeriodBanner = nextPeriod && Math.abs(dayDiff) <= 2 && (() => {
    try { return localStorage.getItem("arc-period-confirm-" + todayKey) !== "done"; } catch(e) { return false; }
  })();
  const [periodBannerDone, setPeriodBannerDone] = React.useState(!showPeriodBanner);
  const [eveDismissed, setEveDismissed] = React.useState(false);
  const dismissPeriodBanner = (confirmed, actualDate) => {
    try { localStorage.setItem("arc-period-confirm-" + todayKey, "done"); } catch(e) {}
    if (confirmed && typeof setPeriodStart === "function") setPeriodStart(actualDate || todayKey);
    setPeriodBannerDone(true);
  };

  // Protein nudge
  const proteinWorkout = _recentWorkoutForProtein();
  const proteinMinsAgo = proteinWorkout ? Math.round((Date.now() - proteinWorkout.loggedAt) / 60000) : null;

  return (
    <div role="tabpanel" id="panel-today" aria-labelledby="tab-today">
      <TabIntro title="About · Today">
        <p>Your daily command centre — everything in one scroll.</p>
        <ul>
          <li><strong>Tell Arc</strong> (top bar) — add meals, workouts, supplements, symptoms, or anything in plain English; Arc files it to the right store automatically</li>
          <li><strong>Day type</strong> — switch Office / WFH / Day off; drives chore hints and the eggs-available rule for Nora</li>
          <li><strong>Log today</strong> — tap to record sleep, HRV, energy, and steps for today</li>
          <li><strong>Work tracker</strong> — one-tap login / lunch / logout stamps with hours calc</li>
          <li><strong>Water tracker</strong> — log hydration against your 2 L daily goal with quick-add buttons</li>
          <li><strong>Morning hero</strong> — Aurora's cross-domain briefing (6–9 am, once daily, reads all stores and cycle phase)</li>
          <li><strong>Schedule strip</strong> — your time-blocked day; generate it with ↻ Plan in Life → Schedule</li>
          <li><strong>Today feed</strong> — live nudges: expiry alerts, low supplement stock, protein shake reminder within 60 min of a workout</li>
          <li><strong>Sleep card</strong> — last night's sleep, deep and REM breakdown</li>
        </ul>
      </TabIntro>
      <TellArcBar />
      <DayTypePill />

      {/* Period confirmation banner */}
      {!periodBannerDone && (
        <section className="card period-banner" aria-label="Period confirmation">
          <div className="period-banner-icon">🌸</div>
          <div className="period-banner-body">
            <div className="period-banner-title">Period {dayDiff === 0 ? "expected today" : dayDiff < 0 ? `expected ${Math.abs(dayDiff)}d ago` : `due in ${dayDiff}d`}</div>
            <div className="period-banner-sub">Did it start today?</div>
          </div>
          <div className="period-banner-actions">
            <button className="btn-action" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => dismissPeriodBanner(true, todayKey)}>Yes, today</button>
            <button className="btn-action ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => dismissPeriodBanner(false)}>Not yet</button>
          </div>
        </section>
      )}

      {/* Morning hero card — Aurora's real cross-domain briefing */}
      {isMorning && (
        <section className="card dark" aria-label="Morning briefing from Aurora">
          <div className="lbl"><AgentDot id="aurora" /> Aurora · Good morning, {who || "there"}</div>
          <h2>{ph.label} phase{ph.day ? ` · Day ${ph.day}` : ""}<br/><em>{ph.energy}</em></h2>
          <AuroraBrief phase={ph} />
        </section>
      )}

      {/* Evening hero — Eve */}
      {isEvening && !eveDismissed && (
        <section className="card" aria-label="Evening reflection from Eve">
          <div className="lbl"><AgentDot id="eve" /> Eve · Wind-down</div>
          <h2 style={{ fontSize: 18 }}>{REFLECTION_PROMPTS[0]}</h2>
          <div className="actions" style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="btn-action" onClick={() => openAgent("eve")}>Start reflection</button>
            <button className="btn-action ghost" onClick={() => setEveDismissed(true)}>Later</button>
          </div>
        </section>
      )}

      <LogTodayCard />
      <WorkTracker />
      <WaterTracker />

      {/* Feed */}
      <h3 className="sec-meta" style={{ marginTop: 14 }}>From your agents</h3>

      {proteinWorkout && (
        <FeedItem agentId="nova" icon="🥤" text={`Protein window — workout ${proteinMinsAgo}min ago. Aim for 30–40g in the next ${60 - proteinMinsAgo} min.`} isNew />
      )}
      <FeedItem agentId="sage" icon="📅" text={sageText} />
      <FeedItem agentId="flora" icon="✦"  text={`${ph.day ? `Day ${ph.day} ` : ""}${ph.label.toLowerCase()}. ${ph.note}`} />
      {isMorning && caraText && <FeedItem agentId="cara"  icon="🪞" text={caraText} isNew onOpen={() => openAgent("cara")} />}
      {lowSupps.length > 0 && <FeedItem agentId="cara" icon="💊" text={`Running low: ${lowSupps.map(s => s.name).join(", ")}. Reorder soon.`} />}
      {isEvening && <FeedItem agentId="luna"  icon="○" text={d.mood_score != null ? `Mood ${d.mood_score}/10 logged · energy ${d.energy_score ?? "—"}/10` : "Log your mood in Health → Data to see trends here."} />}
      {!isEvening && <FeedItem agentId="pulse" icon="↯" text={pulseText} isNew />}

      {/* Schedule strip */}
      <h3 className="sec-meta" style={{ marginTop: 18 }}>Today · schedule</h3>
      <section className="card" aria-label="Today's schedule">
        {stripItems.length === 0 ? (
          <div style={{ padding: "10px 0", textAlign: "center", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
            No blocks planned yet — go to <strong style={{ color: "var(--text)" }}>Life</strong> and tap <em>↻ Plan</em> to auto-generate today's schedule.
          </div>
        ) : stripItems.map((s, i) => {
          const past = isPast(s.time, state);
          const now = isNow(s.time, state);
          return (
            <div key={i} className={`sched ${past ? "past" : ""} ${now ? "now" : ""}`} aria-current={now ? "true" : undefined}>
              <div className="t">{s.time}</div>
              <div className="bar" style={{ background: s.color }} aria-hidden="true"></div>
              <div>
                <div className="ttl">{s.title}</div>
                <div className="sub">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function FeedItem({ agentId, icon, text, isNew, onOpen }) {
  const a = AGENTS.find(x => x.id === agentId);
  if (!a) return null;
  const group = GROUP_META[a.group];
  const [open, setOpen] = React.useState(false);
  return (
    <button
      className="feed"
      onClick={() => { setOpen(o => !o); }}
      aria-expanded={open}
      aria-label={`${a.name}, ${a.role}. ${text}. Tap to ${open ? "collapse" : "expand"}.`}
    >
      <span className="ico" style={{ background: group.light, color: group.color }}>{icon}</span>
      <div className="body">
        <div className="agent">
          <AgentDot id={a.id} />
          {a.name} · {a.role.split("·")[0].trim()}
          {isNew && <span className="newbadge">NEW</span>}
        </div>
        <div className="txt">{text}</div>
        {open && (
          <div className="more">
            <strong>Why this matters:</strong> {a.desc}
            {onOpen && (
              <div className="actions">
                <button type="button" className="btn-action" onClick={(e) => { e.stopPropagation(); onOpen(); }}>Chat with {a.name}</button>
                <button type="button" className="btn-action ghost" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>Done</button>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function isPast(time, state) {
  const stateHour = (DAY_STATES.find(s => s.id === state) || DAY_STATES[1]).hour;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60 < stateHour - 0.5;
}
function isNow(time, state) {
  const stateHour = (DAY_STATES.find(s => s.id === state) || DAY_STATES[1]).hour;
  const [h, m] = time.split(":").map(Number);
  const t = h + m / 60;
  return Math.abs(t - stateHour) < 0.5;
}

/* ─── AuroraBrief — real, cross-domain morning briefing (synthesised, cached) ─── */
function AuroraBrief({ phase }) {
  const synth = (typeof useSynthesis === "function")
    ? useSynthesis("aurora")
    : { text: null, loading: false };

  // While the brief loads (or if the API is unreachable and there's no fallback yet),
  // show the deterministic phase chips so the hero is never empty.
  if (!synth.text) {
    if (synth.loading) {
      return <div className="aurora-brief loading" aria-live="polite">Composing your briefing…</div>;
    }
    const ph = phase || {};
    return (
      <div className="chips" style={{ marginTop: 10 }}>
        {[ph.nora, ph.felix, ph.cara].filter(Boolean).map((t, i) => (
          <span key={i} className="chip" style={{ color: "#fff", background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.16)" }}>
            <span className="dot" style={{ background: "#fff" }}/>{String(t).split(".")[0]}
          </span>
        ))}
      </div>
    );
  }

  return <p className="aurora-brief" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: renderMd(synth.text) }} />;
}

/* ─── WaterTracker — daily hydration card with custom bottle ─── */
function WaterTracker() {
  useWaterVersion();
  const totalMl  = typeof getTodayWaterMl      === "function" ? getTodayWaterMl()      : 0;
  const entries  = typeof getTodayWaterEntries === "function" ? getTodayWaterEntries() : [];
  const bottleMl = typeof getDefaultBottleMl   === "function" ? getDefaultBottleMl()  : 500;
  const history  = typeof getWaterHistory      === "function" ? getWaterHistory(7)    : [];
  const goal     = (typeof WATER_GOAL_ML !== "undefined") ? WATER_GOAL_ML : 2000;
  const pct      = Math.min(100, Math.round((totalMl / goal) * 100));
  const glasses  = (totalMl / 250).toFixed(1);

  const [bottleOpen,  setBottleOpen]  = React.useState(false);
  const [bottleInput, setBottleInput] = React.useState(String(bottleMl));
  const [customOpen,  setCustomOpen]  = React.useState(false);
  const [customMl,    setCustomMl]    = React.useState("");

  // Keep bottleInput in sync when the stored value changes
  React.useEffect(() => { setBottleInput(String(bottleMl)); }, [bottleMl]);

  const saveBottle = () => {
    const ml = parseInt(bottleInput, 10);
    if (ml > 0 && typeof setDefaultBottleMl === "function") setDefaultBottleMl(ml);
    setBottleOpen(false);
  };

  const addCustom = () => {
    const ml = parseInt(customMl, 10);
    if (ml > 0 && typeof logWaterMl === "function") logWaterMl(ml, `${ml}ml`);
    setCustomMl("");
    setCustomOpen(false);
  };

  const inputStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", background: "var(--surface-2)", color: "var(--text)" };

  return (
    <section className="card water-card" aria-label="Water tracker">
      <div className="water-header">
        <div className="lbl" style={{ margin: 0 }}>Hydration</div>
        <button className="water-bottle-btn" onClick={() => setBottleOpen(o => !o)} title="Set bottle size">
          ⚙ {bottleMl}ml bottle
        </button>
      </div>

      {bottleOpen && (
        <div className="water-bottle-form">
          <span className="water-bottle-label">My bottle capacity</span>
          <input type="number" value={bottleInput} min="100" max="3000" step="50"
            onChange={e => setBottleInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveBottle()}
            style={{ ...inputStyle, width: 68 }} />
          <span className="water-bottle-label">ml</span>
          <button className="btn-action" style={{ padding: "4px 12px", fontSize: 12 }} onClick={saveBottle}>Save</button>
          <button className="btn-action ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setBottleOpen(false)}>✕</button>
        </div>
      )}

      <div className="water-total-row">
        <span className="water-total-ml">{totalMl.toLocaleString()}</span>
        <span className="water-total-sep"> / {goal.toLocaleString()} ml</span>
        <span className="water-total-glasses">{glasses} glasses</span>
      </div>
      <div className="water-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
        <div className="water-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="water-btns">
        <button className="water-btn" onClick={() => typeof logWaterMl === "function" && logWaterMl(250, "Glass")}>+ Glass 250ml</button>
        <button className="water-btn" onClick={() => typeof logWaterMl === "function" && logWaterMl(350, "Mug")}>+ Mug 350ml</button>
        <button className="water-btn water-btn-bottle" onClick={() => typeof logWaterMl === "function" && logWaterMl(bottleMl, "Bottle")}>+ Bottle {bottleMl}ml</button>
        {customOpen ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="number" value={customMl} placeholder="ml" min="50" max="2000" step="50"
              onChange={e => setCustomMl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              style={{ ...inputStyle, width: 62 }} autoFocus />
            <button className="btn-action" style={{ padding: "4px 10px", fontSize: 12 }} onClick={addCustom}>+</button>
            <button className="btn-action ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setCustomOpen(false)}>✕</button>
          </div>
        ) : (
          <button className="water-btn" onClick={() => setCustomOpen(true)}>+ Custom</button>
        )}
        {entries.length > 0 && (
          <button className="water-btn water-undo" onClick={() => typeof undoLastWater === "function" && undoLastWater()} title="Undo last log">↩</button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="water-log">
          {[...entries].reverse().slice(0, 4).map((e, i) => (
            <span key={i} className="water-log-entry">{e.time} +{e.ml}ml</span>
          ))}
          {entries.length > 4 && <span className="water-log-entry water-log-more">+{entries.length - 4} more</span>}
        </div>
      )}

      {history.some(d => d.totalMl > 0) && (
        <div className="water-history" aria-label="7-day hydration history">
          {history.map((d, i) => {
            const h = Math.round((d.totalMl / goal) * 100);
            const isToday = i === history.length - 1;
            return (
              <div key={d.date} className={`water-hist-col ${isToday ? "today" : ""}`}>
                <div className="water-hist-bar-wrap">
                  <div className="water-hist-bar" style={{ height: `${Math.min(100, h)}%` }} />
                </div>
                <div className="water-hist-label">{d.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─── Local week-shift helper ─── */
function _shiftWeekBy(weekOf, dir) {
  const d = new Date(weekOf + "T00:00:00");
  d.setDate(d.getDate() + dir * 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/* ─── MacroBar ─── */
function MacroBar({ actual, goal, label, type }) {
  const t = type || "protein";
  const pct = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
  const over = actual > goal;
  return (
    <div className="macro-bar">
      <div className="macro-bar-row">
        <span className="mbl">{label}</span>
        <span className="mbv">{Math.round(actual)} / {goal}</span>
      </div>
      <div className="macro-bar-track">
        <div className={`macro-bar-fill ${t} ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Meal Logger ─── */
const _MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const _ING_UNITS  = ["g", "ml", "pieces", "cup", "tbsp", "tsp", "kg", "pack"];

function MealLogger({ editData, onSaved }) {
  const [mtype, setMtype]       = React.useState((editData && editData.type) || "breakfast");
  const [mname, setMname]       = React.useState((editData && editData.name) || "");
  const [ings, setIngs]         = React.useState(
    (editData && editData.ingredients && editData.ingredients.length)
      ? editData.ingredients
      : [{ name: "", qty: "", unit: "g", kcal: null, protein: null, carbs: null, fat: null }]
  );
  const [notes, setNotes]       = React.useState((editData && editData.notes) || "");
  const [aiLoading, setAiLoad]  = React.useState(false);
  const [saved, setSaved]       = React.useState(false);
  const [snapping, setSnapping] = React.useState(false);
  const [snapMsg, setSnapMsg]   = React.useState(null);
  const snapRef = React.useRef(null);

  // "Snap meal": photo → /api/meals/parse-photo → auto-fill the ingredient rows.
  const snapMeal = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = String(reader.result).split(",")[1];
      setSnapping(true); setSnapMsg(null);
      try {
        const r = await fetch("/api/meals/parse-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, mime_type: file.type || "image/jpeg" }),
        });
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        if (data.type && _MEAL_TYPES.includes(data.type)) setMtype(data.type);
        if (data.name) setMname(data.name);
        const rows = (data.ingredients || []).map(i => ({
          name: i.name || "", qty: i.qty != null ? i.qty : "", unit: i.unit || "g",
          kcal: null, protein: null, carbs: null, fat: null,
        }));
        if (rows.length) setIngs(rows);
        setSnapMsg({ ok: true, text: `Found ${rows.length} item${rows.length !== 1 ? "s" : ""} — review, then look up macros.` });
      } catch (err) {
        setSnapMsg({ ok: false, text: err.message || "Couldn't read that photo." });
      } finally { setSnapping(false); }
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    const handler = (e) => {
      const recipe = e.detail;
      if (!recipe || !recipe.ingredients) return;
      setMname(recipe.name || "");
      setIngs(recipe.ingredients.map(i => ({ ...i, kcal: null, protein: null, carbs: null, fat: null })));
    };
    window.addEventListener("arc-apply-recipe", handler);
    return () => window.removeEventListener("arc-apply-recipe", handler);
  }, []);

  const setIng = (idx, key, val) =>
    setIngs(prev => prev.map((ing, i) => i === idx ? { ...ing, [key]: val } : ing));

  const autoLookup = async (idx) => {
    const ing = ings[idx];
    if (!ing.name.trim()) return;
    const macros = lookupNutrition(ing.name, ing.qty || "100", ing.unit || "g");
    if (macros) { setIngs(prev => prev.map((it, i) => i === idx ? { ...it, ...macros } : it)); return; }
    // Not in local DB — ask AI for just this one ingredient
    setIng(idx, "_aiLooking", true);
    try {
      const r = await fetch("/api/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: [{ name: ing.name, qty: ing.qty || "100", unit: ing.unit || "g" }] }),
      });
      const data = await r.json();
      if (data.macros && data.macros[0]) {
        setIngs(prev => prev.map((it, i) => i === idx ? { ...it, ...data.macros[0], _aiLooking: false } : it));
      } else { setIng(idx, "_aiLooking", false); }
    } catch (e) { setIng(idx, "_aiLooking", false); }
  };

  const askAI = async () => {
    const toAsk = ings
      .map((ing, i) => ({ ...ing, _idx: i }))
      .filter(ing => ing.name.trim());
    if (!toAsk.length) return;
    setAiLoad(true);
    try {
      const r = await fetch("/api/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: toAsk.map(i => ({ name: i.name, qty: i.qty || "100", unit: i.unit || "g" })),
        }),
      });
      const data = await r.json();
      if (data.macros) {
        setIngs(prev => {
          const next = [...prev];
          toAsk.forEach((ing, pos) => {
            if (data.macros[pos]) next[ing._idx] = { ...next[ing._idx], ...data.macros[pos] };
          });
          return next;
        });
      }
    } catch (e) { /* ignore */ }
    finally { setAiLoad(false); }
  };

  const addRow  = () => setIngs(prev => [...prev, { name: "", qty: "", unit: "g", kcal: null, protein: null, carbs: null, fat: null }]);
  const removeRow = (idx) => setIngs(prev => prev.filter((_, i) => i !== idx));

  const totals = sumMacros(ings);

  const save = () => {
    const validIngs = ings.filter(i => i.name.trim());
    if (!validIngs.length) return;
    const meal = {
      date: _todayKey(),
      type: mtype,
      name: mname.trim() || undefined,
      ingredients: validIngs,
      notes: notes.trim() || undefined,
    };
    if (editData && editData.id) updateMeal(editData.id, meal);
    else addMeal(meal);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIngs([{ name: "", qty: "", unit: "g", kcal: null, protein: null, carbs: null, fat: null }]);
      setMname(""); setNotes("");
      if (onSaved) onSaved();
    }, 1200);
  };

  const inlineStyle = { font: "inherit", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)", width: "100%" };

  return (
    <div>
      <div className="subnav" style={{ marginBottom: 10 }}>
        {_MEAL_TYPES.map(t => (
          <button key={t} aria-pressed={mtype === t} onClick={() => setMtype(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="snap-meal-row">
        <input ref={snapRef} type="file" accept="image/*" onChange={snapMeal} style={{ display: "none" }} />
        <button type="button" className="snap-meal-btn" onClick={() => snapRef.current && snapRef.current.click()} disabled={snapping}>
          <span aria-hidden="true">📷</span> {snapping ? "Reading photo…" : "Snap meal"}
        </button>
        {snapMsg && <span className={`snap-meal-msg ${snapMsg.ok ? "ok" : "err"}`}>{snapMsg.text}</span>}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>
          Meal name <span style={{ fontWeight: 400 }}>(optional)</span>
        </div>
        <input type="text" value={mname} onChange={e => setMname(e.target.value)} placeholder="e.g. Dal + rice bowl" style={inlineStyle} />
      </div>

      <div style={{ marginBottom: 6 }}>
        {ings.map((ing, idx) => (
          <div key={idx}>
            <div className="ing-row">
              <input type="text" value={ing.name}
                onChange={e => setIng(idx, "name", e.target.value)}
                onBlur={() => ing.name.trim() && ing.kcal == null && autoLookup(idx)}
                placeholder="Ingredient" />
              <input type="number" value={ing.qty}
                onChange={e => setIng(idx, "qty", e.target.value)}
                placeholder="qty" min="0" step="0.1" />
              <select value={ing.unit} onChange={e => setIng(idx, "unit", e.target.value)}>
                {_ING_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
              <button className="ing-lookup-btn" type="button" onClick={() => autoLookup(idx)}
                title="Lookup nutrition" disabled={ing._aiLooking}>
                {ing._aiLooking ? "…" : ing.kcal != null ? `${Math.round(ing.kcal)}kcal` : "Look up"}
              </button>
              <button className="ing-row-del" type="button" onClick={() => removeRow(idx)} aria-label="Remove">×</button>
            </div>
            {ing.kcal != null && (
              <div className="ing-row-macros">
                {Math.round(ing.kcal)} kcal · {Math.round(ing.protein || 0)}g P · {Math.round(ing.carbs || 0)}g C · {Math.round(ing.fat || 0)}g F
              </div>
            )}
          </div>
        ))}
        <button className="ing-add-btn" type="button" onClick={addRow}>+ Add ingredient</button>
      </div>

      {totals.kcal > 0 && (
        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>
          Total: <strong style={{ color: "var(--text)" }}>{Math.round(totals.kcal)} kcal</strong> · {Math.round(totals.protein)}g P · {Math.round(totals.carbs)}g C · {Math.round(totals.fat)}g F
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <button className="btn-action ghost" onClick={askAI} disabled={aiLoading || !ings.some(i => i.name.trim())}>
          {aiLoading ? "Estimating…" : "Ask AI for macros"}
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)…"
          rows={2} style={{ width: "100%", font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)", resize: "vertical" }} />
      </div>

      <button className="btn-action" onClick={save} disabled={!ings.some(i => i.name.trim())}>
        {saved ? "Saved ✓" : editData ? "Update meal" : "Log meal"}
      </button>
    </div>
  );
}

/* ─── Macro Goals Wizard ─── */
function MacroGoalsWizard({ onSaved }) {
  const [form, setForm] = React.useState({ current_kg: "", target_kg: "", weeks: "16", focus: "fat_loss", workouts_week: "3", extra_goal: "" });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const fs = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 8px", background: "var(--surface-2)", color: "var(--text)", width: "100%", marginBottom: 6 };

  const save = async () => {
    if (!form.current_kg || !form.target_kg) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/setup-goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, current_kg: +form.current_kg, target_kg: +form.target_kg, weeks: +form.weeks, workouts_week: +form.workouts_week }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      saveMacroGoals(data);
      onSaved && onSaved(data);
    } catch (e) { setErr(e.message || "Could not compute goals"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Set macro goals</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <input type="number" placeholder="Current weight (kg)" value={form.current_kg} onChange={e => setForm(f => ({ ...f, current_kg: e.target.value }))} style={fs} />
        <input type="number" placeholder="Target weight (kg)" value={form.target_kg} onChange={e => setForm(f => ({ ...f, target_kg: e.target.value }))} style={fs} />
        <input type="number" placeholder="Timeline (weeks)" value={form.weeks} onChange={e => setForm(f => ({ ...f, weeks: e.target.value }))} style={fs} />
        <input type="number" placeholder="Workouts/week" value={form.workouts_week} onChange={e => setForm(f => ({ ...f, workouts_week: e.target.value }))} style={fs} />
      </div>
      <select value={form.focus} onChange={e => setForm(f => ({ ...f, focus: e.target.value }))} style={{ ...fs, marginTop: 0 }}>
        <option value="fat_loss">Fat loss</option>
        <option value="muscle_build">Muscle build</option>
        <option value="both">Both (recomposition)</option>
      </select>
      <input placeholder="Additional goal (optional)" value={form.extra_goal} onChange={e => setForm(f => ({ ...f, extra_goal: e.target.value }))} style={fs} />
      {err && <div style={{ color: "var(--terra)", fontSize: 11, marginBottom: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-action" onClick={save} disabled={loading || !form.current_kg || !form.target_kg}>
          {loading ? "Computing…" : "Save goals"}
        </button>
        <button className="btn-action ghost" onClick={() => onSaved && onSaved(null)}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Daily Meal View ─── */
function DailyMealView({ ph, openAgent }) {
  useMealsVersion();
  const todayKey = _todayKey();
  const meals    = getMealsForDate(todayKey);
  const macros   = getDailyMacros(todayKey);
  const goals    = typeof getDynamicTargets === "function" ? getDynamicTargets() : loadMeals().goals;
  const [expandedId,   setExpandedId]   = React.useState(null);
  const [editId,       setEditId]       = React.useState(null);
  const [savedRcp,     setSavedRcp]     = React.useState(null);
  const [showGoals,    setShowGoals]    = React.useState(false);
  const [tweakState,   setTweakState]   = React.useState(null); // null | "loading" | { tweaks }

  const saveAsRecipe = (meal) => {
    const rname = window.prompt("Recipe name?", meal.name || meal.type);
    if (!rname) return;
    addRecipe({
      name: rname.trim(),
      tags: [meal.type],
      ingredients: (meal.ingredients || []).map(({ name, qty, unit }) => ({ name, qty, unit })),
      notes: meal.notes || "",
    });
    setSavedRcp(meal.id);
    setTimeout(() => setSavedRcp(null), 1500);
  };

  const tweakThisWeek = async () => {
    setTweakState("loading");
    try {
      const snap = typeof buildArcSnapshot === "function" ? buildArcSnapshot() : {};
      const weekOf = typeof currentWeekOf === "function" ? currentWeekOf() : "";
      // Build week_meals for the 7 days of this week
      const week_meals = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekOf + "T00:00:00");
        d.setDate(d.getDate() + i);
        const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const dm = typeof getMealsForDate === "function" ? getMealsForDate(dk) : [];
        if (dm.length) week_meals[dk] = dm.map(m => ({ ...m, macros: sumMacros(m.ingredients || []) }));
      }
      // Daily targets (same for each day, adjusted per day below)
      const daily_targets = {};
      Object.keys(week_meals).forEach(dk => { daily_targets[dk] = typeof getDynamicTargets === "function" ? getDynamicTargets() : goals; });
      const phaseLabel = snap.cycle ? `${snap.cycle.phase || ""} day ${snap.cycle.day || ""}` : "";
      const mg = typeof getMacroGoals === "function" ? getMacroGoals() : null;
      const r = await fetch("/api/meal-tweaks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_meals, daily_targets,
          dietary: mg ? mg.dietary : { vegetarian: true, eggs: "office_lunch_only" },
          phase_context: phaseLabel,
        }),
      });
      const data = await r.json();
      setTweakState(data.error ? null : { tweaks: data.tweaks || [] });
    } catch (e) { setTweakState(null); }
  };

  if (editId) {
    const meal = meals.find(m => m.id === editId);
    return meal ? <MealLogger editData={meal} onSaved={() => setEditId(null)} /> : null;
  }

  return (
    <div>
      {showGoals && (
        <MacroGoalsWizard onSaved={data => { setShowGoals(false); }} />
      )}
      <section className="card" style={{ marginBottom: 10 }}>
        <div className="lbl"><AgentDot id="nora" /> Nora · Today's macros</div>
        <MacroBar actual={macros.kcal}     goal={goals.kcal}    label="Calories" type="kcal" />
        <MacroBar actual={macros.protein}  goal={goals.protein} label="Protein · g" />
        {goals.carbs > 0 && <MacroBar actual={macros.carbs || 0} goal={goals.carbs} label="Carbs · g" type="carbs" />}
        {goals.fat > 0   && <MacroBar actual={macros.fat || 0}   goal={goals.fat}   label="Fat · g"   type="fat" />}
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <button className="btn-action" onClick={() => openAgent("nora")}>Chat with Nora</button>
          <button className="btn-action ghost" onClick={() => setShowGoals(g => !g)}>
            {typeof getMacroGoals === "function" && getMacroGoals() ? "Edit goals" : "Set macro goals"}
          </button>
          {meals.length > 0 && (
            <button className="btn-action ghost" disabled={tweakState === "loading"} onClick={tweakThisWeek}>
              {tweakState === "loading" ? "Analysing…" : "Tweak this week"}
            </button>
          )}
        </div>
        {tweakState && tweakState !== "loading" && tweakState.tweaks && tweakState.tweaks.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Suggested tweaks</div>
            {tweakState.tweaks.map((tw, i) => (
              <div key={i} className="advice-row" style={{ marginBottom: 4 }}>
                <span className="advice-text"><strong>{tw.date} · {tw.meal}</strong> — {tw.ingredient}: {tw.from_qty} → {tw.to_qty}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", width: "100%", marginTop: 2 }}>{tw.reason}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {meals.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Nothing logged yet today — switch to "Log Meal" to add your first meal.
        </div>
      ) : (
        meals.map(meal => {
          const tot   = sumMacros(meal.ingredients || []);
          const isOpen = expandedId === meal.id;
          return (
            <div key={meal.id} className="meal-card">
              <div className="meal-card-head" onClick={() => setExpandedId(isOpen ? null : meal.id)} style={{ cursor: "pointer" }}>
                <span className="meal-type-badge">{meal.type}</span>
                <span className="meal-card-name">
                  {meal.name || (meal.ingredients || []).slice(0,2).map(i => i.name).join(" + ") || "meal"}
                </span>
                <div className="meal-card-quick-actions" onClick={e => e.stopPropagation()}>
                  <button className="meal-qbtn" onClick={() => setEditId(meal.id)}>Edit</button>
                  <button className="meal-qbtn del" onClick={() => deleteMeal(meal.id)} aria-label="Delete">×</button>
                </div>
              </div>
              <div className="meal-card-macros">
                {Math.round(tot.kcal)} kcal · {Math.round(tot.protein)}g P · {Math.round(tot.carbs)}g C · {Math.round(tot.fat)}g F
              </div>
              {isOpen && (
                <>
                  <div className="meal-card-ings">
                    {(meal.ingredients || []).map((ing, i) => (
                      <div key={i}>{ing.name}{ing.qty ? ` — ${ing.qty}${ing.unit || ""}` : ""}{ing.kcal != null ? ` (${Math.round(ing.kcal)} kcal)` : ""}</div>
                    ))}
                  </div>
                  {meal.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{meal.notes}</div>}
                  <div className="meal-card-actions">
                    <button className="btn-action ghost" style={{ fontSize: 11 }} onClick={() => saveAsRecipe(meal)}>
                      {savedRcp === meal.id ? "Saved ✓" : "Save as recipe"}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      {ph && <div className="rule"><strong>Phase note ({ph.label}):</strong> {ph.nora}</div>}
    </div>
  );
}

/* ─── Phase-ingredient scoring ─── */
const INGREDIENT_PHASE_SCORES = {
  "spinach":        { menstrual:5, follicular:3, ovulatory:3, luteal:3 },
  "lentils":        { menstrual:5, follicular:4, ovulatory:3, luteal:4 },
  "kale":           { menstrual:5, follicular:3, ovulatory:4, luteal:3 },
  "sesame":         { menstrual:5, follicular:2, ovulatory:2, luteal:3 },
  "pumpkin seeds":  { menstrual:5, follicular:3, ovulatory:3, luteal:4 },
  "dates":          { menstrual:5, follicular:2, ovulatory:2, luteal:3 },
  "dark chocolate": { menstrual:5, follicular:2, ovulatory:2, luteal:5 },
  "ginger":         { menstrual:5, follicular:2, ovulatory:3, luteal:4 },
  "beets":          { menstrual:4, follicular:3, ovulatory:4, luteal:3 },
  "eggs":           { menstrual:2, follicular:5, ovulatory:4, luteal:3 },
  "tofu":           { menstrual:3, follicular:5, ovulatory:4, luteal:4 },
  "quinoa":         { menstrual:4, follicular:5, ovulatory:4, luteal:4 },
  "broccoli":       { menstrual:3, follicular:4, ovulatory:5, luteal:3 },
  "yogurt":         { menstrual:3, follicular:5, ovulatory:4, luteal:3 },
  "kefir":          { menstrual:3, follicular:5, ovulatory:3, luteal:3 },
  "blueberries":    { menstrual:3, follicular:4, ovulatory:5, luteal:4 },
  "walnuts":        { menstrual:3, follicular:4, ovulatory:5, luteal:4 },
  "avocado":        { menstrual:3, follicular:4, ovulatory:5, luteal:4 },
  "olive oil":      { menstrual:3, follicular:3, ovulatory:4, luteal:3 },
  "turmeric":       { menstrual:4, follicular:3, ovulatory:4, luteal:4 },
  "oats":           { menstrual:3, follicular:3, ovulatory:2, luteal:5 },
  "sweet potato":   { menstrual:3, follicular:3, ovulatory:3, luteal:5 },
  "chickpeas":      { menstrual:4, follicular:4, ovulatory:3, luteal:5 },
  "banana":         { menstrual:3, follicular:3, ovulatory:3, luteal:4 },
  "almonds":        { menstrual:4, follicular:4, ovulatory:4, luteal:5 },
  "brown rice":     { menstrual:2, follicular:3, ovulatory:3, luteal:4 },
  "paneer":         { menstrual:2, follicular:4, ovulatory:3, luteal:3 },
  "tomato":         { menstrual:3, follicular:3, ovulatory:4, luteal:3 },
  "onion":          { menstrual:3, follicular:3, ovulatory:3, luteal:3 },
  "garlic":         { menstrual:4, follicular:3, ovulatory:3, luteal:4 },
};

function recipePhaseScore(recipe) {
  const snap = typeof buildArcSnapshot === "function" ? buildArcSnapshot() : null;
  if (!snap || !snap.cycle || !snap.cycle.id) return null;
  const phaseId = snap.cycle.id;
  let total = 0, count = 0;
  (recipe.ingredients || []).forEach(({ name }) => {
    const key = (name || "").toLowerCase().trim();
    const entry = Object.entries(INGREDIENT_PHASE_SCORES).find(([k]) => key.includes(k) || k.includes(key));
    if (entry) { total += (entry[1][phaseId] || 3); count++; }
  });
  const avg = count ? total / count : 3;
  return { label: snap.cycle.phase, id: phaseId, score: avg };
}

/* ─── Recipe Book ─── */
function RecipeBook({ setPendingRecipe, setSub }) {
  useRecipesVersion();
  const recipes   = getRecipes();
  const [showForm,   setShowForm]  = React.useState(false);
  const [newName,    setNewName]   = React.useState("");
  const [newIngs,    setNewIngs]   = React.useState([{ name: "", qty: "", unit: "g" }]);
  const [newTags,    setNewTags]   = React.useState("");
  const [adviceMap,  setAdviceMap] = React.useState({});
  const [editId,     setEditId]    = React.useState(null);
  const [editName,   setEditName]  = React.useState("");
  const [editIngs,   setEditIngs]  = React.useState([]);
  const [editTags,   setEditTags]  = React.useState("");
  const [quickBuild, setQuickBuild] = React.useState(null); // null | "loading" | {...suggestion}

  const startEdit = (recipe) => {
    setEditId(recipe.id);
    setEditName(recipe.name);
    setEditIngs((recipe.ingredients || []).map(i => ({ ...i })));
    setEditTags((recipe.tags || []).join(", "));
  };
  const cancelEdit = () => setEditId(null);
  const saveEdit = () => {
    updateRecipe(editId, {
      name: editName.trim(),
      tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      ingredients: editIngs.filter(i => i.name.trim()),
    });
    setEditId(null);
  };
  const setEditIng = (idx, key, val) =>
    setEditIngs(prev => prev.map((x, i) => i === idx ? { ...x, [key]: val } : x));

  const doQuickBuild = async () => {
    setQuickBuild("loading");
    const pantry = typeof getPantryItems === "function" ? getPantryItems() : [];
    const pantryText = pantry.length ? pantry.map(p => `${p.name} (${p.status})`).join(", ") : "empty";
    const h = new Date().getHours();
    const timeOfDay = h < 10 ? "morning" : h < 14 ? "midday" : h < 18 ? "afternoon" : "evening";
    const snap = typeof buildArcSnapshot === "function" ? buildArcSnapshot() : {};
    try {
      const r = await fetch("/api/quick-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantry: pantryText, time_of_day: timeOfDay, phase_label: snap.cycle?.phase || "" }),
      });
      const data = await r.json();
      setQuickBuild(data.error ? null : data);
    } catch (e) { setQuickBuild(null); }
  };

  const tryQuickBuild = (suggestion) => {
    if (setPendingRecipe && setSub) { setPendingRecipe(suggestion); setSub("log"); }
    else window.dispatchEvent(new CustomEvent("arc-apply-recipe", { detail: suggestion }));
    setQuickBuild(null);
  };

  const saveQuickBuildAsRecipe = (suggestion) => {
    addRecipe({ name: suggestion.name, tags: [suggestion.type, "quick-build"], ingredients: suggestion.ingredients || [] });
    setQuickBuild(null);
  };

  const acceptAdviceSuggestion = (recipe, s) => {
    if (!s.ingredient) return;
    const newIng = { name: s.ingredient, qty: "", unit: "g" };
    updateRecipe(recipe.id, { ingredients: [...(recipe.ingredients || []), newIng] });
  };

  const applyRecipe = (recipe) => {
    if (setPendingRecipe && setSub) { setPendingRecipe(recipe); setSub("log"); }
    else window.dispatchEvent(new CustomEvent("arc-apply-recipe", { detail: recipe }));
  };

  const saveRecipe = () => {
    if (!newName.trim()) return;
    addRecipe({
      name: newName.trim(),
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      ingredients: newIngs.filter(i => i.name.trim()),
    });
    setNewName(""); setNewTags(""); setNewIngs([{ name: "", qty: "", unit: "g" }]);
    setShowForm(false);
  };

  const setNewIng = (idx, key, val) =>
    setNewIngs(prev => prev.map((x, i) => i === idx ? { ...x, [key]: val } : x));

  const fetchAdvice = async (recipe) => {
    setAdviceMap(prev => ({ ...prev, [recipe.id]: { loading: true, result: null } }));
    const snap     = typeof buildArcSnapshot === "function" ? buildArcSnapshot() : {};
    const pantry   = typeof getPantryItems === "function" ? getPantryItems() : [];
    const purchases = typeof getRecentPurchases === "function" ? getRecentPurchases(14) : [];
    const targets  = typeof getDynamicTargets === "function" ? getDynamicTargets() : {};

    const phaseId = snap.cycle && snap.cycle.id ? snap.cycle.id : "";
    const PHASE_START = { menstrual:1, follicular:6, ovulatory:15, luteal:19 };
    const PHASE_LEN   = { menstrual:5, follicular:9, ovulatory:4,  luteal:11 };
    const daysIntoPhase = (snap.cycle && snap.cycle.day ? snap.cycle.day : 0) - (PHASE_START[phaseId] || 0);
    const daysRemaining = Math.max(0, (PHASE_LEN[phaseId] || 7) - daysIntoPhase);

    const pantryText = pantry.length
      ? pantry.map(p => `${p.name} (${p.status})`).join(", ") : "empty";
    const purchaseText = purchases.length
      ? purchases.map(p => `${p.name} bought ${p.date}`).join(", ") : "none";

    try {
      const r = await fetch("/api/meal-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe,
          phase_id: phaseId,
          phase_label: snap.cycle ? snap.cycle.phase : "",
          days_remaining: daysRemaining,
          pantry: pantryText,
          recent_purchases: purchaseText,
          dynamic_targets: targets,
          snapshot: typeof snapshotText === "function" ? snapshotText() : "",
        }),
      });
      const data = await r.json();
      setAdviceMap(prev => ({ ...prev, [recipe.id]: { loading: false, result: data } }));
    } catch (e) {
      setAdviceMap(prev => ({ ...prev, [recipe.id]: { loading: false, result: { error: true } } }));
    }
  };

  const fieldStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 8px", background: "var(--surface)", color: "var(--text)" };

  return (
    <div>
      {/* Quick Build */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <button className="btn-action ghost" style={{ fontSize: 12 }} disabled={quickBuild === "loading"} onClick={doQuickBuild}>
          {quickBuild === "loading" ? "Checking pantry…" : "✦ What can I make?"}
        </button>
      </div>
      {quickBuild && quickBuild !== "loading" && (
        <div className="quick-build-card card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <span className="meal-type-badge">{quickBuild.type}</span>
              <div style={{ fontWeight: 500, fontSize: 14, marginTop: 5 }}>{quickBuild.name}</div>
              {quickBuild.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{quickBuild.description}</div>}
            </div>
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0 }} onClick={() => setQuickBuild(null)}>×</button>
          </div>
          {quickBuild.ingredients && quickBuild.ingredients.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
              {quickBuild.ingredients.map((ing, i) => <span key={i} style={{ marginRight: 8 }}>{ing.name} {ing.qty}{ing.unit}</span>)}
            </div>
          )}
          {quickBuild.instructions && (
            <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", marginBottom: 6 }}>{quickBuild.instructions}</div>
          )}
          {quickBuild.why && (
            <div style={{ fontSize: 11, color: "var(--sage)", marginBottom: 8 }}>{quickBuild.why}</div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn-action" style={{ fontSize: 11 }} onClick={() => tryQuickBuild(quickBuild)}>Try this now</button>
            <button className="btn-action ghost" style={{ fontSize: 11 }} onClick={() => saveQuickBuildAsRecipe(quickBuild)}>Save as recipe</button>
            <button className="btn-action ghost" style={{ fontSize: 11 }} onClick={() => setQuickBuild(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {recipes.length === 0 && !showForm && (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No recipes yet. Save a meal as a recipe, or create one below.
        </div>
      )}

      <div className="recipe-grid">
        {recipes.map(recipe => {
          const fit = recipePhaseScore(recipe);
          const adv = adviceMap[recipe.id];
          const level = fit ? (fit.score >= 4 ? "good" : fit.score >= 3 ? "ok" : "warn") : null;
          return (
            <div key={recipe.id} className={`recipe-card${adv && adv.result ? " recipe-card--wide" : ""}`}>
              {editId === recipe.id ? (
                <div className="recipe-edit-form">
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    style={fieldStyle} placeholder="Recipe name" />
                  <div style={{ marginTop: 8 }}>
                    {editIngs.map((ing, idx) => (
                      <div key={idx} className="recipe-edit-ing-row">
                        <input value={ing.name} onChange={e => setEditIng(idx, "name", e.target.value)}
                          style={{ ...fieldStyle, flex: 2 }} placeholder="ingredient" />
                        <input value={ing.qty} onChange={e => setEditIng(idx, "qty", e.target.value)}
                          style={{ ...fieldStyle, flex: "0 0 52px" }} placeholder="qty" />
                        <select value={ing.unit} onChange={e => setEditIng(idx, "unit", e.target.value)}
                          style={fieldStyle}>
                          {["g","ml","pieces","cup","tbsp","tsp","kg","pack"].map(u => <option key={u}>{u}</option>)}
                        </select>
                        <button className="recipe-edit-rm" onClick={() => setEditIngs(prev => prev.filter((_, i) => i !== idx))}>×</button>
                      </div>
                    ))}
                    <button className="recipe-edit-add-ing" onClick={() => setEditIngs(prev => [...prev, { name: "", qty: "", unit: "g" }])}>+ ingredient</button>
                  </div>
                  <input value={editTags} onChange={e => setEditTags(e.target.value)}
                    style={{ ...fieldStyle, width: "100%", marginTop: 6 }} placeholder="tags (comma separated)" />
                  <div className="recipe-actions" style={{ marginTop: 10 }}>
                    <button className="btn-action" style={{ fontSize: 11 }} onClick={saveEdit}>Save</button>
                    <button className="btn-action ghost" style={{ fontSize: 11 }} onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="recipe-card-name">{recipe.name}</div>
                  <div className="recipe-card-meta">{(recipe.ingredients || []).length} ingredients</div>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="recipe-tags">
                      {recipe.tags.map(t => <span key={t} className="recipe-tag">{t}</span>)}
                    </div>
                  )}
                  {fit && (
                    <div className="recipe-phase-chip" data-level={level}>
                      {fit.score >= 4 ? `✓ Great for ${fit.label}` : fit.score >= 3 ? `~ OK for ${fit.label}` : `⚑ Tweak for ${fit.label}`}
                    </div>
                  )}
                  <div className="recipe-actions">
                    <button className="btn-action" style={{ fontSize: 11 }} onClick={() => applyRecipe(recipe)}>Apply</button>
                    <button className="btn-action ghost" style={{ fontSize: 11 }} disabled={adv && adv.loading}
                      onClick={() => fetchAdvice(recipe)}>
                      {adv && adv.loading ? "…" : "Improve for today"}
                    </button>
                    <button className="btn-action ghost" style={{ fontSize: 11 }} onClick={() => startEdit(recipe)}>Edit</button>
                    <button className="btn-action ghost" style={{ fontSize: 11, color: "var(--terra)" }} onClick={() => deleteRecipe(recipe.id)}>Delete</button>
                  </div>
                </>
              )}
              {adv && adv.result && !adv.result.error && (
                <div className="recipe-advice">
                  {(adv.result.suggestions || []).map((s, i) => (
                    <div key={i} className="advice-row">
                      <span className="advice-text">{s.text}</span>
                      <div className="advice-row-actions">
                        {s.in_pantry
                          ? <span className="badge-pantry">In pantry ✓</span>
                          : s.add_to_grocery && (
                            <button className="btn-add-grocery"
                              onClick={() => addGroceryItem({ name: s.ingredient, source: "nora", category: "Other" })}>
                              + Grocery list
                            </button>
                          )
                        }
                        {s.ingredient && !s.in_pantry && (
                          <button className="btn-accept-suggestion"
                            onClick={() => acceptAdviceSuggestion(recipe, s)}
                            title="Add this ingredient to the recipe">
                            + Add to recipe
                          </button>
                        )}
                      </div>
                      {s.buy_note && <div className="advice-buy-note">{s.buy_note}</div>}
                    </div>
                  ))}
                  {(adv.result.low_after_cooking || []).map(item => (
                    <div key={item} className="advice-low-banner">
                      After today you may run low on <strong>{item}</strong> —{" "}
                      <button className="btn-link" onClick={() => addGroceryItem({ name: item, source: "nora" })}>
                        Add to list?
                      </button>
                    </div>
                  ))}
                  <button className="btn-link" style={{ marginTop: 6, fontSize: 11 }}
                    onClick={() => setAdviceMap(prev => ({ ...prev, [recipe.id]: null }))}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div style={{ marginTop: 12, background: "var(--surface-2)", borderRadius: 10, padding: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>New recipe</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Recipe name"
            style={{ ...fieldStyle, width: "100%", marginBottom: 6 }} />
          {newIngs.map((ing, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px auto", gap: 5, marginBottom: 5 }}>
              <input value={ing.name} onChange={e => setNewIng(idx, "name", e.target.value)} placeholder="Ingredient" style={fieldStyle} />
              <input type="number" value={ing.qty} onChange={e => setNewIng(idx, "qty", e.target.value)} placeholder="qty" style={fieldStyle} />
              <select value={ing.unit} onChange={e => setNewIng(idx, "unit", e.target.value)} style={fieldStyle}>
                {["g","ml","pieces","cup","tbsp","tsp","kg"].map(u => <option key={u}>{u}</option>)}
              </select>
              <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}
                onClick={() => setNewIngs(arr => arr.filter((_, i) => i !== idx))}>×</button>
            </div>
          ))}
          <button className="ing-add-btn" onClick={() => setNewIngs(arr => [...arr, { name: "", qty: "", unit: "g" }])}>+ Add ingredient</button>
          <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags (comma-separated)"
            style={{ ...fieldStyle, width: "100%", marginTop: 6 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-action" onClick={saveRecipe} disabled={!newName.trim()}>Save recipe</button>
            <button className="btn-action ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-action ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => setShowForm(true)}>+ New recipe</button>
      )}
    </div>
  );
}

/* ─── Workout Logger ─── */
const _WORKOUT_TYPES = ["strength", "cardio", "yoga", "pilates", "walk", "swim", "hiit", "rest", "other"];
const _FEEDBACK_EMOJIS = ["😰", "😕", "😐", "😊", "🔥"];
const _FEEDBACK_LABELS = ["Very hard", "Tough", "OK", "Good", "Great"];

function PostWorkoutFeedback({ workoutId, onDone }) {
  const [rating, setRating] = React.useState(null);
  const [note,   setNote]   = React.useState("");
  const save = () => {
    if (rating !== null && typeof updateWorkout === "function") {
      updateWorkout(workoutId, { feedback: { rating, note: note.trim(), at: new Date().toISOString() } });
    }
    onDone();
  };
  return (
    <div className="card feedback-card" style={{ marginTop: 10 }}>
      <div className="lbl">How did it feel?</div>
      <div className="feedback-emojis">
        {_FEEDBACK_EMOJIS.map((e, i) => (
          <button key={i} className={`feedback-emoji-btn${rating === i + 1 ? " sel" : ""}`}
            onClick={() => setRating(i + 1)} title={_FEEDBACK_LABELS[i]}>
            <span>{e}</span>
            <span className="feedback-emoji-lbl">{_FEEDBACK_LABELS[i]}</span>
          </button>
        ))}
      </div>
      <input value={note} onChange={e => setNote(e.target.value)}
        placeholder="Optional note — what worked, what didn't…"
        style={{ width: "100%", font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)", marginTop: 8, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-action" onClick={save}>Save feedback</button>
        <button className="btn-action ghost" onClick={onDone}>Skip</button>
      </div>
    </div>
  );
}

function WorkoutRecommend({ ph }) {
  const [rec,     setRec]     = React.useState(null); // null | "loading" | {type,duration,intensity,notes}
  const [error,   setError]   = React.useState(null);
  const [applied, setApplied] = React.useState(false);

  const getRecommendation = async () => {
    setRec("loading"); setError(null);
    const d   = typeof getHealthDay === "function" ? getHealthDay() : {};
    const cyc = typeof deriveCycle  === "function" ? deriveCycle()  : {};
    const dt  = typeof getDayType   === "function" ? getDayType()   : "wfh";
    const recent = typeof loadWorkouts === "function"
      ? loadWorkouts().entries.slice(-5).map(w =>
          `${w.type} ${w.duration}min intensity ${w.intensity}/5${w.feedback ? `, felt ${_FEEDBACK_LABELS[(w.feedback.rating||3)-1]}` : ""}`)
      : [];

    const context = [
      `Cycle phase: ${cyc.label || "unknown"}${cyc.day ? `, day ${cyc.day}` : ""}`,
      `Phase guidance: ${ph ? ph.felix : "general"}`,
      `Sleep last night: ${d.sleep_duration ? d.sleep_duration + "h" : "not logged"}`,
      `HRV: ${d.hrv != null ? d.hrv + " ms" : "not logged"}`,
      `Resting HR: ${d.resting_hr != null ? d.resting_hr + " bpm" : "not logged"}`,
      `Day type: ${dt}`,
      `Recent workouts: ${recent.length ? recent.join("; ") : "none logged"}`,
    ].join("\n");

    const system = `You are Felix, a smart fitness advisor. Based on the user's biometric data, cycle phase, sleep, and recent workout history, recommend today's optimal workout. Respond ONLY with valid JSON (no markdown): {"type":"strength|cardio|yoga|pilates|walk|swim|hiit|rest","duration":45,"intensity":3,"notes":"brief reasoning max 30 words"}. If recovery is needed, type should be "rest" or "walk".`;

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, messages: [{ role: "user", content: context }], agent: "felix" }),
      });
      const data = await r.json();
      if (data.reply) {
        const match = data.reply.match(/\{[\s\S]*?\}/);
        if (match) { setRec(JSON.parse(match[0])); return; }
      }
      setError("Couldn't parse recommendation — try Ask Felix in chat.");
      setRec(null);
    } catch (e) {
      setError("Server unreachable — is Flask running?");
      setRec(null);
    }
  };

  const applyRec = () => {
    if (!rec || rec === "loading") return;
    window.dispatchEvent(new CustomEvent("arc-apply-workout-rec", { detail: rec }));
    setApplied(true);
  };

  if (!rec) return (
    <div>
      <div className="rule" style={{ marginBottom: 12 }}>
        {ph && <span>Phase: <strong>{ph.label}</strong> — {ph.felix.split(".")[0]}.</span>}
      </div>
      <button className="btn-action" onClick={getRecommendation}>✦ Get AI recommendation</button>
      {error && <div style={{ marginTop: 8, color: "var(--terra)", fontSize: 12 }}>{error}</div>}
    </div>
  );

  if (rec === "loading") return (
    <div className="rec-loading-card card">
      <div className="rec-loading-dots"><span /><span /><span /></div>
      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>Felix is analysing your sleep, cycle, and history…</div>
    </div>
  );

  return (
    <div className="rec-card card">
      <div className="rec-card-header">
        <div>
          <span className="rec-type-badge">{rec.type}</span>
          <span className="rec-meta">{rec.duration} min · intensity {rec.intensity}/5</span>
        </div>
        <div className="lbl" style={{ marginTop: 0 }}>Felix · AI recommendation</div>
      </div>
      <p className="rec-notes">{rec.notes}</p>
      {applied
        ? <div style={{ color: "var(--sage)", fontSize: 12 }}>✓ Applied to log form</div>
        : <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-action" onClick={applyRec}>Use this plan</button>
            <button className="btn-action ghost" onClick={() => setRec(null)}>Try again</button>
          </div>
      }
    </div>
  );
}

function WorkoutLogger({ ph }) {
  const [wtype,     setWtype]    = React.useState("strength");
  const [duration,  setDuration] = React.useState("");
  const [intensity, setIntens]   = React.useState(3);
  const [notes,     setNotes]    = React.useState("");
  const [savedId,   setSavedId]  = React.useState(null); // id of just-logged workout → triggers feedback
  const cyc = typeof deriveCycle === "function" ? deriveCycle() : {};

  // Listen for AI recommendation applied event
  React.useEffect(() => {
    const h = (e) => {
      const r = e.detail;
      if (!r) return;
      if (r.type) setWtype(r.type);
      if (r.duration) setDuration(String(r.duration));
      if (r.intensity) setIntens(r.intensity);
    };
    window.addEventListener("arc-apply-workout-rec", h);
    return () => window.removeEventListener("arc-apply-workout-rec", h);
  }, []);

  const save = () => {
    if (!duration) return;
    const entry = {
      date: _todayKey(), type: wtype,
      duration: Number(duration), intensity,
      notes: notes.trim() || undefined,
      phase: cyc.id,
    };
    addWorkout(entry);
    // Grab the id of the just-added entry
    const entries = loadWorkouts().entries;
    const justAdded = entries[entries.length - 1];
    setSavedId(justAdded ? justAdded.id : "done");
    setDuration(""); setNotes("");
  };

  if (savedId) return (
    <div>
      <div style={{ color: "var(--sage)", fontSize: 13, marginBottom: 4 }}>Workout logged ✓</div>
      <PostWorkoutFeedback workoutId={savedId} onDone={() => setSavedId(null)} />
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Type</div>
      <div className="workout-type-grid" style={{ marginBottom: 12 }}>
        {_WORKOUT_TYPES.map(t => (
          <button key={t} className={`workout-type-btn ${wtype === t ? "active" : ""}`} onClick={() => setWtype(t)}>{t}</button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4 }}>Duration (min)</div>
        <input type="number" min="1" max="300" value={duration} onChange={e => setDuration(e.target.value)} placeholder="45"
          style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", font: "inherit", fontSize: 16, fontWeight: 500, background: "var(--surface-2)", color: "var(--text)", width: "100%" }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 6 }}>Intensity</div>
        <div className="intensity-picker">
          {[1,2,3,4,5].map(n => (
            <button key={n} className={`intensity-dot ${intensity === n ? "active" : ""}`} onClick={() => setIntens(n)}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes: sets, reps, distance, how it felt…"
          rows={2} style={{ width: "100%", font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)", resize: "vertical" }} />
      </div>

      {ph && <div className="rule" style={{ marginBottom: 10 }}><strong>Phase ({ph.label}):</strong> {ph.felix}</div>}

      <button className="btn-action" onClick={save} disabled={!duration}>Log workout</button>
    </div>
  );
}

/* ─── Workout Week Summary ─── */
function WorkoutWeekSummary() {
  useWorkoutsVersion();
  const weekOf  = currentWeekOf();
  const summary = getWorkoutSummary(weekOf);
  const entries = getWorkoutsForWeek(weekOf).slice().reverse().slice(0, 5);

  return (
    <div>
      <div className="workout-week-stats">
        <div>
          <div className="workout-big-num">{summary.totalMinutes}</div>
          <div className="workout-big-label">min this week</div>
        </div>
        <div>
          <div className="workout-big-num">{summary.count}</div>
          <div className="workout-big-label">sessions</div>
        </div>
      </div>
      {Object.keys(summary.byType).length > 0 && (
        <div className="workout-type-chips">
          {Object.entries(summary.byType).map(([type, mins]) => (
            <span key={type} className="workout-type-chip">{type} · {mins}m</span>
          ))}
        </div>
      )}
      {entries.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No workouts logged this week.</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {entries.map(e => (
            <div key={e.id} className="workout-entry-card">
              <span className="workout-type-tag">{e.type}</span>
              <div className="workout-entry-info">
                <div className="workout-entry-name">{e.duration} min{e.notes ? ` · ${e.notes.slice(0,40)}` : ""}</div>
                <div className="workout-entry-meta">{e.date} · intensity {e.intensity}/5{e.phase ? ` · ${e.phase}` : ""}</div>
              </div>
              <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14 }}
                onClick={() => deleteWorkout(e.id)} aria-label="Delete">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── HEALTH ─── */
function HealthTab({ phase, openAgent }) {
  const [sub, setSub] = React.useState("today");
  const ph = (phase && typeof phase === "object")
    ? phase : (CYCLE_PHASES.find(p => p.id === phase) || CYCLE_PHASES[1]);
  return (
    <div role="tabpanel" id="panel-health" aria-labelledby="tab-health">
      <TabIntro title="About · Health">
        <p>Seven sub-tabs covering every aspect of your wellbeing — use the nav row above to jump between them.</p>
        <ul>
          <li><strong>Today</strong> — health signals card: HRV, sleep score, steps, and phase guidance from Flora</li>
          <li><strong>Meals</strong> — log food (snap or manual), AI macros, recipes, pantry, and grocery list with ingredient intelligence</li>
          <li><strong>Fitness</strong> — log workouts, get Felix's AI recommendation based on your HRV and cycle phase, view weekly training load</li>
          <li><strong>Cycle</strong> — log symptoms (severity 1-3), view cycle calendar, Flora's phase guidance for food, fitness, and skincare</li>
          <li><strong>Sleep</strong> — sleep card with total, deep, and REM breakdown from your health log</li>
          <li><strong>Care</strong> — AM/PM skincare routine from Cara (reads your actual shelf), expiry and PAO alerts, dental routine</li>
          <li><strong>Data</strong> — the single edit hub: daily health log, all supplements (full CRUD), blood test results with trend arrows, body measurements</li>
        </ul>
      </TabIntro>
      <div className="subnav" role="tablist" aria-label="Health sections">
        {[
          ["today", "Today"], ["meals", "Meals"], ["fitness", "Fitness"],
          ["cycle", "Cycle"], ["sleep", "Sleep"],
          ["care", "Care"], ["data", "Data"],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-pressed={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>

      {sub === "today"   && <HealthToday  ph={ph} openAgent={openAgent} />}
      {sub === "meals"   && <HealthMeals  ph={ph} openAgent={openAgent} />}
      {sub === "fitness" && <HealthFitness ph={ph} openAgent={openAgent} />}
      {sub === "cycle"   && <HealthCycle  ph={ph} />}
      {sub === "sleep"   && <HealthSleep />}
      {sub === "care"    && <HealthCare   ph={ph} openAgent={openAgent} />}
      {sub === "data"    && <HealthDataTab />}
    </div>
  );
}

function CycleRing({ day = 6, total = 28, phase = "Follicular" }) {
  const r = 32, c = 2 * Math.PI * r;
  const dash = (day / total) * c;
  return (
    <svg width="78" height="78" viewBox="0 0 78 78" role="img" aria-label={`${phase} phase, day ${day} of ${total}`}>
      <circle cx="39" cy="39" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
      <circle cx="39" cy="39" r={r} fill="none" stroke="var(--phase-accent, var(--sage))" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90 39 39)"/>
      <text x="39" y="44" textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize="16" fill="var(--text)">D{day}</text>
    </svg>
  );
}

function HealthToday({ ph, openAgent }) {
  useHealthVersion();
  const d = getHealthDay();
  const v = (k, suffix = "") => (d[k] != null ? `${k === "steps" ? Number(d[k]).toLocaleString() : d[k]}${suffix}` : "—");
  return (
    <>
      <section className="card" aria-label="Cycle phase from Flora">
        <div className="lbl"><AgentDot id="flora"/> Flora · Cycle phase</div>
        <div className="cyclebox">
          <CycleRing day={ph.day || 1} phase={ph.label} />
          <div className="copy">
            <div className="phasename">{ph.label} ✦ {ph.energy.split("·")[0].trim()}</div>
            <div className="phasenote">{ph.note}</div>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Today's vitals">
        <div className="lbl">Aurora · Today's vitals</div>
        <div className="stats">
          <div className="stat"><div className="num">{v("steps")}</div><span className="lbl">steps</span></div>
          <div className="stat"><div className="num">{v("hrv")}</div><span className="lbl">HRV</span></div>
          <div className="stat"><div className="num">{v("resting_hr")}</div><span className="lbl">resting HR</span></div>
          <div className="stat"><div className="num">{v("sleep_duration", "h")}</div><span className="lbl">sleep</span></div>
        </div>
        <button className="btn-action ghost" style={{ marginTop: 10 }} onClick={openHealthForm}>Log today's health →</button>
      </section>

      <FeedItem agentId="soma"  icon="◑" text={d.deep_sleep_min != null || d.rem_sleep_min != null
        ? `Deep sleep ${d.deep_sleep_min ?? "—"} min, REM ${d.rem_sleep_min ?? "—"} min.`
        : "Log your sleep stages to see recovery insights."} isNew />
      <FeedItem agentId="pulse" icon="↯" text="No reactive nudge right now — signals are stable." />
    </>
  );
}

/* ─── Health Meals (meal planner with sub-tabs) ─── */
function HealthMeals({ ph, openAgent }) {
  const [sub, setSub] = React.useState("today");
  const [pendingRecipe, setPendingRecipe] = React.useState(null);
  const [planState, setPlanState] = React.useState(null); // null | "loading" | {plan:[...]}

  React.useEffect(() => {
    const handler = (e) => {
      setPendingRecipe(e.detail);
      setSub("log");
    };
    window.addEventListener("arc-apply-recipe", handler);
    return () => window.removeEventListener("arc-apply-recipe", handler);
  }, []);

  const suggestPlan = async () => {
    setPlanState("loading");
    try {
      const recipes = typeof getRecipes === "function" ? getRecipes() : [];
      const meals   = typeof getMealsForDate === "function" ? getMealsForDate(_todayKey()) : [];
      const snap    = typeof buildArcSnapshot === "function" ? buildArcSnapshot() : {};
      const targets = typeof getDynamicTargets === "function" ? getDynamicTargets() : {};
      const dayType = typeof getDayType === "function" ? getDayType() : "wfh";
      const r = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes, already_logged: meals, phase_id: snap.cycle?.id || "", phase_label: snap.cycle?.phase || "", dynamic_targets: targets, day_type: dayType }),
      });
      const data = await r.json();
      setPlanState(data.plan ? { plan: data.plan } : null);
    } catch (e) { setPlanState(null); }
  };

  const applyPlanSlot = (slot) => {
    const recipe = (typeof getRecipes === "function" ? getRecipes() : []).find(r => r.name === slot.recipe_name);
    if (recipe) { setPendingRecipe(recipe); setSub("log"); }
  };

  const hasRecipes = typeof getRecipes === "function" && getRecipes().length > 0;

  return (
    <>
      {planState && planState !== "loading" && planState.plan && (
        <div className="meal-plan-card card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="lbl" style={{ margin: 0 }}><AgentDot id="nora" /> Nora · Suggested today</div>
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1 }} onClick={() => setPlanState(null)}>×</button>
          </div>
          {planState.plan.map(slot => (
            <div key={slot.type} className="meal-plan-slot">
              <span className="meal-type-badge">{slot.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="meal-plan-name">{slot.recipe_name || <em style={{ color: "var(--muted)" }}>No saved match</em>}</div>
                <div className="meal-plan-reason">{slot.reason}</div>
              </div>
              {slot.recipe_name && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn-action" style={{ fontSize: 10, padding: "3px 9px" }} onClick={() => applyPlanSlot(slot)}>Use</button>
                  <button className="btn-action ghost" style={{ fontSize: 10, padding: "3px 9px" }} onClick={() => setPlanState(s => ({ ...s, plan: s.plan.filter(p => p.type !== slot.type) }))}>Skip</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="subnav" style={{ marginBottom: 12 }}>
        {[["log","Log Meal"],["today","Today"],["recipes","Recipes"],["pantry","Pantry"],["grocery","Grocery"]].map(([id, label]) => (
          <button key={id} aria-pressed={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
        {hasRecipes && (
          <button aria-pressed={false} disabled={planState === "loading"} onClick={suggestPlan}
            style={{ marginLeft: "auto", fontSize: 11 }} title="AI suggests meals from your recipes">
            {planState === "loading" ? "…" : "✦ Plan day"}
          </button>
        )}
      </div>
      {sub === "log"     && <MealLogger key={pendingRecipe?.id || "new"} editData={pendingRecipe} onSaved={() => setPendingRecipe(null)} />}
      {sub === "today"   && <DailyMealView ph={ph} openAgent={openAgent} />}
      {sub === "recipes" && <RecipeBook setPendingRecipe={setPendingRecipe} setSub={setSub} />}
      {sub === "pantry"  && <PantryManager />}
      {sub === "grocery" && <HealthGrocery openAgent={openAgent} />}
    </>
  );
}

/* ─── Health Fitness (workout logger with sub-tabs) ─── */
function HealthFitness({ ph, openAgent }) {
  useHealthVersion();
  const d = getHealthDay();
  const [sub, setSub] = React.useState("recommend");
  return (
    <>
      <div className="subnav" style={{ marginBottom: 12 }}>
        {[["recommend","Recommend"],["log","Log"],["week","This Week"]].map(([id, label]) => (
          <button key={id} aria-pressed={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>
      {sub === "recommend" && <WorkoutRecommend ph={ph} />}
      {sub === "log" && <WorkoutLogger ph={ph} />}
      {sub === "week" && (
        <>
          <WorkoutWeekSummary />
          <section className="card" style={{ marginTop: 10 }}>
            <div className="lbl"><AgentDot id="felix" /> Felix · Today's signals</div>
            <div className="stats">
              <div className="stat"><div className="num">{d.steps != null ? Number(d.steps).toLocaleString() : "—"}</div><span className="lbl">steps</span></div>
              <div className="stat"><div className="num">{d.active_calories != null ? d.active_calories : "—"}</div><span className="lbl">active kcal</span></div>
              <div className="stat"><div className="num">{d.resting_hr != null ? d.resting_hr : "—"}</div><span className="lbl">RHR</span></div>
              <div className="stat"><div className="num">{d.hrv != null ? d.hrv : "—"}</div><span className="lbl">HRV</span></div>
            </div>
            <button className="btn-action" style={{ marginTop: 10 }} onClick={() => openAgent("felix")}>Ask Felix</button>
          </section>
        </>
      )}
    </>
  );
}

/* ─── Health Grocery ─── */
function HealthGrocery({ openAgent }) {
  useGroceriesVersion();
  useShopsVersion();
  const [weekOf,       setWeekOf]      = React.useState(currentWeekOf());
  const [form,         setForm]        = React.useState({ name: "", qty: "1", unit: "pieces", category: "Other" });
  const [noraLoading,  setNoraLoad]    = React.useState(false);
  const [noraSugg,     setNoraSugg]    = React.useState(null); // null | [{name,qty,unit,category,reason}] | string (fallback)
  const [receiptState, setReceiptState] = React.useState(null);
  const [checkingItem, setCheckingItem] = React.useState(null); // item.id currently showing quiz
  const [editingItemId, setEditingItemId] = React.useState(null);
  const [editingItemData, setEditingItemData] = React.useState({});
  const receiptRef  = React.useRef(null);
  const intelFileRef = React.useRef(null);
  const [intelOpen,  setIntelOpen]  = React.useState(false);
  const [intelMode,  setIntelMode]  = React.useState("manual"); // "manual" | "scan"
  const [intelForm,  setIntelForm]  = React.useState({ name: "", store: "", price_eur: "", qty: "1", unit: "g", quality: 0, taste: 0, packaging: 0, addToPantry: false });
  const [intelSaved, setIntelSaved] = React.useState(false);
  const [intelScanState, setIntelScanState] = React.useState(null); // null | "loading" | { items } | { error }

  const _STORE_LIST = (typeof KNOWN_STORES !== "undefined" ? KNOWN_STORES : ["Lidl","Tesco","SuperValu","Dunnes Stores","Aldi","M&S","Other"]);

  const items   = getGroceriesForWeek(weekOf);
  const grouped = {};
  items.forEach(it => {
    const cat = it.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  });

  const addItem = () => {
    if (!form.name.trim()) return;
    addGroceryItem({ ...form, weekOf });
    setForm({ name: "", qty: "1", unit: "pieces", category: "Other" });
  };

  const checkOff = (it) => {
    if (it.checked) { toggleGroceryItem(it.id); return; }
    setCheckingItem(it.id);
  };

  const confirmCheckOff = (it, store) => {
    const phase = typeof buildArcSnapshot === "function" ? (buildArcSnapshot().cycle || {}).id || "" : "";
    toggleGroceryItem(it.id, { logPurchase: true, name: it.name, phase });
    if (store && typeof addShopRating === "function") addShopRating(it.name, store, 3);
    setCheckingItem(null);
  };

  const startEditItem = (it) => { setEditingItemId(it.id); setEditingItemData({ name: it.name, qty: it.qty, unit: it.unit }); };
  const saveEditItem = () => {
    if (typeof updateGroceryItem === "function") updateGroceryItem(editingItemId, editingItemData);
    setEditingItemId(null);
  };

  const askNora = async () => {
    setNoraLoad(true); setNoraSugg(null);
    try {
      const ctxR = await fetch("/api/context/nora");
      const ctx  = await ctxR.json();
      const pantryItems = typeof getPantryItems === "function" ? getPantryItems() : [];
      const pantryText  = pantryItems.length
        ? pantryItems.map(i => `${i.name} (${i.status})`).join(", ") : "empty";
      const snap = typeof buildArcSnapshot === "function" ? buildArcSnapshot() : {};
      const phase = snap.cycle?.phase || "";
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: ctx.system,
          messages: [{ role: "user", content:
            `Pantry: ${pantryText}. Phase: ${phase}. Suggest 5-7 grocery items for this week. ` +
            `Reply ONLY with valid JSON (no fences): {"suggestions":[{"name":"item","qty":"1","unit":"pieces","category":"Produce","reason":"brief why"}]}`
          }],
          agent: "nora",
          client_context: `Pantry: ${pantryText}`,
        }),
      });
      const data = await r.json();
      if (data.reply) {
        try {
          const m = data.reply.match(/\{[\s\S]*\}/);
          if (m) { const parsed = JSON.parse(m[0]); setNoraSugg(parsed.suggestions || []); return; }
        } catch (e) { /* fall through to text */ }
        setNoraSugg(data.reply); // plain text fallback
      }
    } catch (e) { /* ignore */ }
    finally { setNoraLoad(false); }
  };

  const _doReceiptScan = async (file, onLoading, onResult, onError) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = String(reader.result).split(",")[1];
      onLoading();
      try {
        const r = await fetch("/api/pantry/parse-receipt", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, mime_type: file.type || "image/jpeg" }),
        });
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        onResult(data.items || []);
      } catch (err) { onError(err.message || "Could not read receipt."); }
    };
    reader.readAsDataURL(file);
  };

  const scanReceipt = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    _doReceiptScan(file,
      () => setReceiptState("loading"),
      (items) => setReceiptState({ store: _STORE_LIST[0], items: items.map(it => ({ ...it, sel: true, toPantry: false, toGrocery: true })) }),
      (msg)   => setReceiptState({ error: msg }),
    );
  };

  const confirmReceipt = () => {
    if (!receiptState?.items) return;
    const store = receiptState.store || _STORE_LIST[0];
    const phase = typeof buildArcSnapshot === "function" ? (buildArcSnapshot().cycle || {}).id || "" : "";
    receiptState.items.filter(it => it.sel).forEach(it => {
      if (typeof addIngredientEntry === "function") {
        addIngredientEntry({ name: it.name, store, price_eur: it.price_eur != null ? Number(it.price_eur) : null, quantity: it.quantity || 1, unit: it.unit || "pieces", phase });
      }
      if (it.toPantry && typeof addPantryItems === "function") {
        addPantryItems([{ name: it.name, quantity: it.quantity || 1, unit: it.unit || "pieces", category: it.category || "Other", status: "In Stock" }]);
      }
      if (it.toGrocery) {
        addGroceryItem({ name: it.name, qty: it.quantity || 1, unit: it.unit || "pieces", category: it.category || "Other", weekOf });
      }
    });
    setReceiptState(null);
  };

  const fmtWk = (w) => new Date(w + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  // Scout grouping (for items with known preferred store)
  const unchecked = items.filter(it => !it.checked);
  const byStore = {}; const unassigned = [];
  unchecked.forEach(it => {
    const pref = typeof getShopPref === "function" ? getShopPref(it.name) : null;
    if (pref && pref.preferred) {
      if (!byStore[pref.preferred]) byStore[pref.preferred] = [];
      byStore[pref.preferred].push(it);
    } else { unassigned.push(it); }
  });
  const hasStorePrefs = Object.keys(byStore).length > 0;

  return (
    <div>
      {/* Bill scan confirm modal */}
      {receiptState === "loading" && (
        <div className="bill-confirm-modal"><span style={{ color: "var(--muted)", fontSize: 13 }}>Reading bill…</span></div>
      )}
      {receiptState?.error && (
        <div className="bill-confirm-modal">
          <span style={{ color: "var(--terra)", fontSize: 13 }}>{receiptState.error}</span>
          <button className="btn-action ghost" style={{ marginTop: 8 }} onClick={() => setReceiptState(null)}>Dismiss</button>
        </div>
      )}
      {receiptState?.items && (
        <div className="bill-confirm-modal">
          <div className="bill-confirm-header">
            <span className="lbl" style={{ margin: 0 }}>Confirm bill — {receiptState.items.length} items</span>
            <button className="bill-confirm-close" onClick={() => setReceiptState(null)}>×</button>
          </div>
          <div className="bill-store-row">
            <span className="bill-store-label">Shopped at</span>
            <select className="bill-store-select" value={receiptState.store}
              onChange={e => setReceiptState(s => ({ ...s, store: e.target.value }))}>
              {_STORE_LIST.map(st => <option key={st}>{st}</option>)}
            </select>
          </div>
          <div className="bill-col-headers">
            <span style={{ flex: 2 }}>Item</span>
            <span style={{ width: 64, textAlign: "right" }}>€ Price</span>
            <span style={{ width: 70, textAlign: "center" }}>Pantry</span>
            <span style={{ width: 70, textAlign: "center" }}>List</span>
          </div>
          {receiptState.items.map((it, i) => (
            <div key={i} className="bill-confirm-item">
              <input type="checkbox" checked={it.sel}
                onChange={() => setReceiptState(s => ({ ...s, items: s.items.map((x, j) => j === i ? { ...x, sel: !x.sel } : x) }))} />
              <span className="bill-item-name">{it.name}</span>
              <input className="bill-price-input" type="number" min="0" step="0.01"
                value={it.price_eur != null ? it.price_eur : ""}
                placeholder="—"
                onChange={e => setReceiptState(s => ({ ...s, items: s.items.map((x, j) => j === i ? { ...x, price_eur: e.target.value === "" ? null : Number(e.target.value) } : x) }))} />
              <button className={`bill-dest-btn${it.toPantry ? " active" : ""}`}
                onClick={() => setReceiptState(s => ({ ...s, items: s.items.map((x, j) => j === i ? { ...x, toPantry: !x.toPantry } : x) }))}>
                Pantry
              </button>
              <button className={`bill-dest-btn${it.toGrocery ? " active" : ""}`}
                onClick={() => setReceiptState(s => ({ ...s, items: s.items.map((x, j) => j === i ? { ...x, toGrocery: !x.toGrocery } : x) }))}>
                List
              </button>
            </div>
          ))}
          <div className="bill-confirm-note">Prices logged to ingredient intelligence automatically.</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="btn-action" onClick={confirmReceipt}>
              Confirm {receiptState.items.filter(it => it.sel).length} items
            </button>
            <button className="btn-action ghost" onClick={() => setReceiptState(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grocery-week-nav">
        <button className="btn-action ghost" style={{ padding: "5px 10px" }} onClick={() => setWeekOf(w => _shiftWeekBy(w, -1))}>‹</button>
        <span className="grocery-week-label">Week of {fmtWk(weekOf)}</span>
        <button className="btn-action ghost" style={{ padding: "5px 10px" }} onClick={() => setWeekOf(w => _shiftWeekBy(w, 1))}>›</button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
          No items yet — add below, scan a bill, or ask Nora.
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="grocery-cat-section">
            <div className="grocery-cat-label">{cat}</div>
            {catItems.map(it => (
              <div key={it.id} className="grocery-item-wrapper">
                {editingItemId === it.id ? (
                  <div className="grocery-item grocery-item-edit-row">
                    <input className="grocery-edit-input" value={editingItemData.name}
                      onChange={e => setEditingItemData(d => ({ ...d, name: e.target.value }))} />
                    <input className="grocery-edit-qty" type="number" value={editingItemData.qty}
                      onChange={e => setEditingItemData(d => ({ ...d, qty: e.target.value }))} />
                    <select className="grocery-edit-unit" value={editingItemData.unit}
                      onChange={e => setEditingItemData(d => ({ ...d, unit: e.target.value }))}>
                      {["pieces","pack","g","kg","ml","L","can","jar"].map(u => <option key={u}>{u}</option>)}
                    </select>
                    <button className="grocery-edit-save" onClick={saveEditItem} title="Save">✓</button>
                    <button className="grocery-item-del" onClick={() => setEditingItemId(null)} title="Cancel">×</button>
                  </div>
                ) : (
                  <div className="grocery-item">
                    <input type="checkbox" checked={it.checked} onChange={() => checkOff(it)} />
                    <span className={`grocery-item-name ${it.checked ? "checked" : ""}`}>{it.name}</span>
                    {typeof StoreBadge === "function" && <StoreBadge itemName={it.name} />}
                    <span className="grocery-item-qty">{it.qty} {it.unit}</span>
                    {it.source === "nora" && <span className="grocery-source-nora">Nora</span>}
                    <button className="grocery-edit-btn" onClick={() => startEditItem(it)} title="Edit">✎</button>
                    <button className="grocery-item-del" onClick={() => deleteGroceryItem(it.id)} aria-label="Remove">×</button>
                  </div>
                )}
                {/* Check-off quiz */}
                {checkingItem === it.id && (
                  <div className="grocery-quiz">
                    <span className="grocery-quiz-label">Where'd you get it?</span>
                    <div className="grocery-quiz-stores">
                      {_STORE_LIST.map(store => (
                        <button key={store} className="grocery-quiz-store-btn" onClick={() => confirmCheckOff(it, store)}>{store}</button>
                      ))}
                      <button className="grocery-quiz-skip-btn" onClick={() => confirmCheckOff(it, null)}>Skip</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      <div className="grocery-add-form">
        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Item name" onKeyDown={e => e.key === "Enter" && addItem()} />
        <input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="qty" min="0" />
        <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
          {["pieces","pack","g","kg","ml","L","can","jar"].map(u => <option key={u}>{u}</option>)}
        </select>
        <button className="btn-action" onClick={addItem} disabled={!form.name.trim()}>Add</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <button className="btn-action ghost" onClick={askNora} disabled={noraLoading}>
          {noraLoading ? "Asking Nora…" : "Ask Nora"}
        </button>
        <button className="btn-action ghost" onClick={() => receiptRef.current && receiptRef.current.click()}>Scan bill</button>
        <input ref={receiptRef} type="file" accept="image/*" style={{ display: "none" }} onChange={scanReceipt} />
        {items.some(it => it.checked) && (
          <button className="btn-action ghost" onClick={() => clearCheckedGroceries(weekOf)}>Clear checked</button>
        )}
      </div>

      {/* Nora suggestions — structured chips or text fallback */}
      {noraSugg && (
        <div className="grocery-nora-confirm" style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="lbl" style={{ margin: 0 }}><AgentDot id="nora" /> Nora's suggestions</div>
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }} onClick={() => setNoraSugg(null)}>×</button>
          </div>
          {Array.isArray(noraSugg) ? (
            noraSugg.map((s, i) => (
              <div key={i} className="nora-sugg-row">
                <div className="nora-sugg-name">{s.name}</div>
                <div className="nora-sugg-reason">{s.reason}</div>
                <button className="btn-action ghost" style={{ fontSize: 11, padding: "3px 9px", flexShrink: 0 }}
                  onClick={() => addGroceryItem({ name: s.name, qty: s.qty || "1", unit: s.unit || "pieces", category: s.category || "Other", weekOf, source: "nora" })}>
                  + Add
                </button>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--text)", margin: 0 }}>{noraSugg}</p>
          )}
        </div>
      )}

      {/* Scout — only show when store preferences exist */}
      {hasStorePrefs && (
        <details className="card shop-smart-card" style={{ marginTop: 12 }}>
          <summary className="shop-smart-summary">
            <AgentDot id="scout" />
            <span>Scout · Shop Smart</span>
            <span className="shop-smart-count">{Object.keys(byStore).length} store{Object.keys(byStore).length !== 1 ? "s" : ""}</span>
            <Chevron />
          </summary>
          <div className="shop-smart-body">
            {Object.entries(byStore).map(([store, storeItems]) => (
              <div key={store} className="shop-store-group">
                <div className="shop-store-label">{store}</div>
                {storeItems.map(it => (
                  <div key={it.id} className="shop-item-line">
                    <span>{it.name}</span>
                    <span className="shop-item-qty">{it.qty} {it.unit}</span>
                  </div>
                ))}
              </div>
            ))}
            {unassigned.length > 0 && (
              <div className="shop-store-group unassigned">
                <div className="shop-store-label">No preference yet — check off items to assign a store</div>
                {unassigned.map(it => <div key={it.id} className="shop-item-line muted">{it.name}</div>)}
              </div>
            )}
            <button className="btn-action ghost" style={{ marginTop: 10, width: "100%" }}
              onClick={() => openAgent && openAgent("scout")}>Ask Scout for store advice</button>
          </div>
        </details>
      )}

      {/* Ingredient intelligence entry */}
      <details className="card intel-entry-card" style={{ marginTop: 12 }} open={intelOpen}
        onToggle={e => setIntelOpen(e.target.open)}>
        <summary className="intel-entry-summary">
          <AgentDot id="scout" />
          <span>Log ingredient intelligence</span>
          <Chevron />
        </summary>
        <div className="intel-entry-body">
          <div className="intel-mode-tabs">
            <button className={`intel-mode-btn${intelMode === "manual" ? " active" : ""}`} onClick={() => setIntelMode("manual")}>Manual entry</button>
            <button className={`intel-mode-btn${intelMode === "scan" ? " active" : ""}`} onClick={() => setIntelMode("scan")}>Upload image</button>
          </div>

          {intelMode === "manual" && (
            <div className="intel-manual-form">
              <input className="intel-input" placeholder="Ingredient (e.g. Oat milk)" value={intelForm.name}
                onChange={e => setIntelForm(f => ({ ...f, name: e.target.value }))} />
              <div className="intel-row">
                <select className="intel-select" value={intelForm.store}
                  onChange={e => setIntelForm(f => ({ ...f, store: e.target.value }))}>
                  <option value="">Select store…</option>
                  {_STORE_LIST.map(st => <option key={st}>{st}</option>)}
                </select>
                <input className="intel-price" type="number" min="0" step="0.01" placeholder="€ price" value={intelForm.price_eur}
                  onChange={e => setIntelForm(f => ({ ...f, price_eur: e.target.value }))} />
                <input className="intel-qty" type="number" min="0" step="0.01" placeholder="qty" value={intelForm.qty}
                  onChange={e => setIntelForm(f => ({ ...f, qty: e.target.value }))} />
                <select className="intel-unit" value={intelForm.unit}
                  onChange={e => setIntelForm(f => ({ ...f, unit: e.target.value }))}>
                  {["g","kg","ml","L","pieces","pack"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="intel-ratings">
                {[["quality","Quality"],["taste","Taste"],["packaging","Packaging"]].map(([key, label]) => (
                  <div key={key} className="intel-rating-row">
                    <span className="intel-rating-label">{label}</span>
                    <div className="intel-stars">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" className={`intel-star${intelForm[key] >= n ? " on" : ""}`}
                          onClick={() => setIntelForm(f => ({ ...f, [key]: f[key] === n ? 0 : n }))}>★</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <label className="intel-pantry-check">
                <input type="checkbox" checked={intelForm.addToPantry}
                  onChange={e => setIntelForm(f => ({ ...f, addToPantry: e.target.checked }))} />
                Also add to pantry
              </label>
              <div className="intel-actions">
                <button className="btn-action" disabled={!intelForm.name.trim() || !intelForm.store}
                  onClick={() => {
                    const phase = typeof buildArcSnapshot === "function" ? (buildArcSnapshot().cycle || {}).id || "" : "";
                    if (typeof addIngredientEntry === "function") {
                      addIngredientEntry({
                        name: intelForm.name, store: intelForm.store,
                        price_eur: intelForm.price_eur ? Number(intelForm.price_eur) : null,
                        quantity: intelForm.qty, unit: intelForm.unit,
                        quality: intelForm.quality || null, taste: intelForm.taste || null, packaging: intelForm.packaging || null,
                        phase,
                      });
                    }
                    if (intelForm.addToPantry && typeof addPantryItems === "function") {
                      addPantryItems([{ name: intelForm.name, quantity: intelForm.qty, unit: intelForm.unit, category: "Other", status: "In Stock" }]);
                    }
                    setIntelForm({ name: "", store: "", price_eur: "", qty: "1", unit: "g", quality: 0, taste: 0, packaging: 0, addToPantry: false });
                    setIntelSaved(true);
                    setTimeout(() => setIntelSaved(false), 2000);
                  }}>
                  Save entry
                </button>
                {intelSaved && <span className="intel-saved-msg">✓ Logged</span>}
              </div>
            </div>
          )}

          {intelMode === "scan" && (
            <div>
              {intelScanState === "loading" && <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>Scanning…</div>}
              {intelScanState?.error && <div style={{ color: "var(--terra)", fontSize: 12 }}>{intelScanState.error}</div>}
              {intelScanState?.items && (
                <div>
                  <div className="lbl" style={{ marginBottom: 6 }}>Parsed items — tap to log to intelligence:</div>
                  <div className="intel-scan-store-row">
                    <span className="bill-store-label">Store</span>
                    <select className="bill-store-select" value={intelScanState.store || _STORE_LIST[0]}
                      onChange={e => setIntelScanState(s => ({ ...s, store: e.target.value }))}>
                      {_STORE_LIST.map(st => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                  {intelScanState.items.map((it, i) => (
                    <div key={i} className="intel-scan-item">
                      <span className="intel-scan-name">{it.name}</span>
                      {it.price_eur != null && <span className="intel-scan-price">€{Number(it.price_eur).toFixed(2)}</span>}
                      <button className="btn-action ghost" style={{ fontSize: 11, padding: "3px 9px" }}
                        onClick={() => {
                          if (typeof addIngredientEntry !== "function") return;
                          addIngredientEntry({ name: it.name, store: intelScanState.store || _STORE_LIST[0], price_eur: it.price_eur != null ? Number(it.price_eur) : null, quantity: it.quantity || 1, unit: it.unit || "pieces", phase: typeof buildArcSnapshot === "function" ? (buildArcSnapshot().cycle || {}).id || "" : "" });
                          setIntelScanState(s => ({ ...s, items: s.items.filter((_, j) => j !== i) }));
                        }}>
                        Log
                      </button>
                    </div>
                  ))}
                  {intelScanState.items.length === 0 && <div style={{ color: "var(--muted)", fontSize: 12 }}>All items logged ✓</div>}
                </div>
              )}
              {!intelScanState && (
                <div>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>Upload a bill or shelf label to auto-parse item names and prices.</p>
                  <button className="btn-action ghost" onClick={() => intelFileRef.current && intelFileRef.current.click()}>Upload image</button>
                </div>
              )}
              <input ref={intelFileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files && e.target.files[0];
                  e.target.value = "";
                  if (!file) return;
                  _doReceiptScan(file,
                    () => setIntelScanState("loading"),
                    (items) => setIntelScanState({ store: _STORE_LIST[0], items }),
                    (msg) => setIntelScanState({ error: msg, items: null }),
                  );
                }} />
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function HealthCycle({ ph }) {
  return (
    <>
      <section className="card">
        <div className="lbl"><AgentDot id="flora"/> Flora · Phase report</div>
        <div className="cyclebox" style={{ marginBottom: 10 }}>
          <CycleRing day={ph.day} phase={ph.label} />
          <div className="copy">
            <div className="phasename">{ph.label} · Day {ph.day} of 28</div>
            <div className="phasenote">{ph.note}</div>
          </div>
        </div>
        <div className="rule"><strong>Energy:</strong> {ph.energy}</div>
        <div className="rule"><strong>Nutrition:</strong> {ph.nora}</div>
        <div className="rule"><strong>Movement:</strong> {ph.felix}</div>
        <div className="rule"><strong>Skin:</strong> {ph.cara}</div>
        {ph.supp  && <div className="rule"><strong>Supplements:</strong> {ph.supp}</div>}
        {ph.sleep && <div className="rule"><strong>Sleep:</strong> {ph.sleep}</div>}
        {ph.body  && <div className="rule"><strong>Body:</strong> {ph.body}</div>}
      </section>
      <div style={{ height: 12 }} />
      <SymptomsTracker />
    </>
  );
}

function HealthSleep() {
  useHealthVersion();
  const d = getHealthDay();
  const dur  = d.sleep_duration;
  const deep = d.deep_sleep_min;
  const rem  = d.rem_sleep_min;
  const logged = dur != null || deep != null || rem != null;

  // Lightweight "score" derived from logged stages (no fake fixed value).
  let score = null;
  if (dur != null) {
    let s = Math.min(100, Math.round((dur / 8) * 80));
    if (deep != null) s += Math.min(10, Math.round(deep / 12));
    if (rem != null)  s += Math.min(10, Math.round(rem / 12));
    score = Math.min(100, s);
  }

  return (
    <section className="card">
      <div className="lbl"><AgentDot id="dusk"/> Dusk + <AgentDot id="soma"/> Soma · Sleep</div>
      {logged ? (
        <>
          <h2 style={{ fontSize: 18 }}>Last night · {dur != null ? `${dur} hrs` : "—"}</h2>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {score != null ? `Score ${score} · ` : ""}
            Deep {deep != null ? `${deep} min` : "—"} · REM {rem != null ? `${rem} min` : "—"}.
          </p>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 18 }}>No sleep logged</h2>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Log sleep duration + stages on the Today tab to see recovery insights.</p>
        </>
      )}
      <div className="rule" style={{ marginTop: 10 }}>
        <strong>Soma:</strong> {deep != null
          ? `Deep sleep at ${deep} min — aim for 90+ min for full physical recovery.`
          : "Log deep & REM minutes to track your sleep architecture over the week."}
      </div>
      <div className="rule lav">
        <strong>Dusk (tonight):</strong> wind-down ~22:00. No screens after 22:30.
      </div>
      <button className="btn-action ghost" style={{ marginTop: 10 }} onClick={openHealthForm}>Log sleep →</button>
    </section>
  );
}

function _careStep(p) {
  const med = p.medicated ? <em style={{ color: "var(--muted)" }}> (medicated)</em> : null;
  const exp = p.expiry_flag === "expires_soon" ? <em style={{ color: "var(--terra)" }}> · {p.days_left}d left</em>
            : p.expiry_flag === "expired" ? <em style={{ color: "var(--terra)" }}> · expired</em> : null;
  return <li key={p.id}>{p.name}{p.brand ? ` — ${p.brand}` : ""}{med}{exp}</li>;
}

function HealthCare({ ph, openAgent }) {
  useSkincareVersion();
  const am = getRoutine("AM");
  const pm = getRoutine("PM");
  const expiring = getExpiringSkincare();
  const phaseProducts = getSkincareProducts().filter(p =>
    (p.phases || []).map(x => String(x).toLowerCase()).includes(String(ph.label).toLowerCase()));

  return (
    <section className="card">
      <div className="lbl"><AgentDot id="cara"/> Cara · Personal Care Cupboard</div>
      <div className="rule" style={{ marginBottom: 10 }}>
        <strong>Phase ({ph.label}):</strong> {ph.cara}
      </div>

      {am.length === 0 && pm.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>
          No routine yet — add products in Health → Data (Personal Care Cupboard) and set each to AM, PM, or Both.
        </div>
      ) : (
        <>
          {am.length > 0 && <>
            <h2 style={{ fontSize: 17 }}>AM routine</h2>
            <ol style={{ paddingLeft: 18, marginTop: 6, fontSize: 13, color: "var(--text)" }}>{am.map(_careStep)}</ol>
          </>}
          {pm.length > 0 && <>
            <h2 style={{ fontSize: 17, marginTop: 12 }}>PM routine</h2>
            <ol style={{ paddingLeft: 18, marginTop: 6, fontSize: 13, color: "var(--text)" }}>{pm.map(_careStep)}</ol>
          </>}
        </>
      )}

      {phaseProducts.length > 0 && (
        <div className="rule" style={{ marginTop: 10 }}>
          <strong>For your {ph.label.toLowerCase()} phase:</strong> {phaseProducts.map(p => p.name).join(", ")}
        </div>
      )}

      {expiring.length > 0 && (
        <div className="rule terra" style={{ marginTop: 10 }}>
          <strong>Heads-up:</strong> {expiring.map(p => `${p.name} (${p.expiry_flag === "expired" ? "expired" : p.days_left + "d"})`).join(", ")}.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button className="btn-action" onClick={() => openAgent("cara")}>Ask Cara about a product</button>
      </div>
    </section>
  );
}

/* ─── AGENTS ─── */
function TokenUsage() {
  if (typeof useTokenVersion === "function") useTokenVersion();
  const stats = typeof getTokenStats === "function" ? getTokenStats() : null;

  const fmt = (n) => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M"
                  : n >= 1_000     ? (n / 1_000).toFixed(1) + "K"
                  : String(Math.round(n));
  const cost = (s) => {
    const c = typeof estTokenCost === "function" ? estTokenCost(s) : 0;
    return "$" + c.toFixed((s.total || 0) > 50_000 ? 2 : 4);
  };

  // Honest empty state — nothing is shown until real AI calls have been made.
  if (!stats || !stats.hasData) {
    return (
      <details className="card collapse-card token-card">
        <summary>
          <div className="collapse-lead">
            <div className="lbl" style={{ margin: 0 }}>Token usage</div>
            <div className="collapse-summary"><span style={{ color: "var(--muted)" }}>not tracked yet</span></div>
          </div>
          <Chevron />
        </summary>
        <div className="collapse-body">
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            Nothing tracked yet. When you chat with an agent, use Tell Arc, scan a photo, or open a daily
            briefing, Arc records the real token counts those calls return and shows your today / week /
            month totals here.
          </p>
          <div className="tok-foot" style={{ marginTop: 10 }}>
            Counts AI calls only · stored in your browser · cost estimated at Haiku 4.5 rates
          </div>
        </div>
      </details>
    );
  }

  const { today, week, month, all, series } = stats;
  const max = Math.max(1, ...series.map(s => s.total));

  return (
    <details className="card collapse-card token-card">
      <summary>
        <div className="collapse-lead">
          <div className="lbl" style={{ margin: 0 }}>Token usage</div>
          <div className="collapse-summary">
            <span className="num"><em>{fmt(today.total)}</em> today</span>
            <span className="sep">·</span>
            <span>{fmt(month.total)} this month</span>
            <span className="sep">·</span>
            <span>{cost(month)}</span>
          </div>
        </div>
        <Chevron />
      </summary>
      <div className="collapse-body">
        <div className="tok-grid">
          <TokStat label="Today" value={fmt(today.total)} sub={cost(today)} />
          <TokStat label="Week"  value={fmt(week.total)}  sub={cost(week)} />
          <TokStat label="Month" value={fmt(month.total)} sub={cost(month)} />
          <TokStat label="All-time" value={fmt(all.total)} sub={cost(all)} />
        </div>
        <div className="tok-chart" aria-hidden="true">
          {series.map((s, i) => {
            const h = s.total > 0 ? Math.max(8, (s.total / max) * 100) : 3;
            return (
              <div key={i} className="tok-bar-col" title={`${s.label}: ${fmt(s.total)} tokens`}>
                <span className={`tok-bar ${s.isToday ? "today" : ""}`} style={{ height: `${h}%` }} />
                <span className="tok-day">{s.label}</span>
              </div>
            );
          })}
        </div>
        <div className="tok-foot">
          {fmt(all.input)} in · {fmt(all.output)} out · {all.calls} AI {all.calls === 1 ? "call" : "calls"} all-time · stored in your browser · cost estimated at Haiku 4.5 rates
        </div>
      </div>
    </details>
  );
}

function Chevron() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

function TokStat({ label, value, sub }) {
  return (
    <div className="tok-stat">
      <div className="tok-num">{value}</div>
      <div className="tok-lbl">{label}</div>
      <div className="tok-sub">{sub}</div>
    </div>
  );
}

function AgentsTab({ openAgent }) {
  const [group, setGroup] = React.useState("all");
  const [q, setQ] = React.useState("");
  const filtered = AGENTS.filter(a => (group === "all" || a.group === group) && (q === "" || (a.name + a.role).toLowerCase().includes(q.toLowerCase())));
  const counts = AGENTS.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const live = (counts.ok || 0) + (counts.slow || 0);

  return (
    <div role="tabpanel" id="panel-agents" aria-labelledby="tab-agents">
      <TabIntro title="About · Agents">
        <p>15 active agents working across health, food, fitness, skincare, shopping, and synthesis. Tiles with a green <strong>CHAT</strong> badge open a live conversation. Grey <strong>AUTO</strong> tiles work silently — their output surfaces in specific tabs. Expand the guide below for what to ask each one.</p>
      </TabIntro>

      <details className="card collapse-card">
        <summary>
          <div className="collapse-lead">
            <div className="lbl" style={{ margin: 0 }}>How to use Arc Agents</div>
            <div className="collapse-summary" style={{ fontSize: 11, color: "var(--muted)" }}>chat agents · auto agents · tips</div>
          </div>
          <Chevron />
        </summary>
        <div className="collapse-body guide-body">

          <h4 className="guide-section-head">Chat agents — tap tile to open</h4>

          <div className="guide-agent-row">
            <span className="guide-agent-name">Nora</span>
            <span className="guide-agent-role">Food · Cycle Nutrition</span>
          </div>
          <p>Reads your live pantry and today's meals. Vegetarian only — eggs on office lunch days only, never dinner or breakfast.</p>
          <div className="guide-examples">
            <span className="guide-example">"What can I make with what's in my pantry?"</span>
            <span className="guide-example">"What should I eat today — I'm in luteal phase"</span>
            <span className="guide-example">"What's expiring soon that I should use up?"</span>
            <span className="guide-example">"I'm 40g short on protein — what can I add?"</span>
          </div>

          <div className="guide-agent-row">
            <span className="guide-agent-name">Felix</span>
            <span className="guide-agent-role">Fitness · Recovery Coach</span>
          </div>
          <p>Reads your HRV, sleep, recent workouts, and cycle phase. HRV below 35ms = rest day recommendation.</p>
          <div className="guide-examples">
            <span className="guide-example">"What workout suits today given my HRV?"</span>
            <span className="guide-example">"Was yesterday's session appropriate for this phase?"</span>
            <span className="guide-example">"I'm tired and sore — what do you suggest?"</span>
            <span className="guide-example">"Set my macro goals"</span>
          </div>

          <div className="guide-agent-row">
            <span className="guide-agent-name">Cara</span>
            <span className="guide-agent-role">Skincare · Personal Care</span>
          </div>
          <p>Reads your actual shelf (products, PAO, expiry dates) and current cycle phase. AM: Vitamin C first. PM: retinol only, never same night as AHAs.</p>
          <div className="guide-examples">
            <span className="guide-example">"What's my AM routine for today?"</span>
            <span className="guide-example">"Is anything on my shelf expiring soon?"</span>
            <span className="guide-example">"Can I use my vitamin C serum with niacinamide?"</span>
            <span className="guide-example">"My skin is breaking out — what do I adjust?"</span>
          </div>

          <div className="guide-agent-row">
            <span className="guide-agent-name">Eve</span>
            <span className="guide-agent-role">Evening · Wind-down Coach</span>
          </div>
          <p>Reads your symptoms, mood, HRV, and steps. Best opened in the evening — she's conversational, not a reporting tool.</p>
          <div className="guide-examples">
            <span className="guide-example">"How did today go?"</span>
            <span className="guide-example">"Help me wind down — I can't switch off"</span>
            <span className="guide-example">"I'm feeling anxious and tired"</span>
            <span className="guide-example">"Give me a journal prompt for tonight"</span>
          </div>

          <div className="guide-agent-row">
            <span className="guide-agent-name">Scout</span>
            <span className="guide-agent-role">Shopping · Store Advisor</span>
          </div>
          <p>Reads your shop rating history and unchecked grocery list. Recommendations improve the more you rate items in the Grocery tab (star widget next to each item).</p>
          <div className="guide-examples">
            <span className="guide-example">"Where's the best place to buy spinach?"</span>
            <span className="guide-example">"Group my grocery list by best store"</span>
            <span className="guide-example">"How did Lidl do for blueberries last time?"</span>
          </div>

          <div className="guide-agent-row">
            <span className="guide-agent-name">Vera</span>
            <span className="guide-agent-role">Quick Compare · Routing</span>
          </div>
          <p>Start here if you're not sure which agent to use. Fast Q&A on anything — food, fitness, skincare, supplements. Routes you to a specialist for deep dives.</p>
          <div className="guide-examples">
            <span className="guide-example">"Is magnesium better in the morning or evening?"</span>
            <span className="guide-example">"Should I work out with a HRV of 32?"</span>
            <span className="guide-example">"Compare oat milk vs almond milk for luteal phase"</span>
          </div>

          <h4 className="guide-section-head" style={{ marginTop: 18 }}>Auto agents — where to find their output</h4>
          <div className="guide-auto-list">
            <div className="guide-auto-row"><span className="guide-auto-name">Aurora</span><span className="guide-auto-desc">Morning hero card on Today tab (6–9 am, once daily, reads all stores)</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Flora</span><span className="guide-auto-desc">Phase chip everywhere — fill Period start in Log today (Today tab or Health → Data) to activate</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Pulse</span><span className="guide-auto-desc">Feed nudges on Today — fires when HRV drops, steps are low, or protein shake is due</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Nova</span><span className="guide-auto-desc">Today feed composition — Cara expiry alerts, supplement low-stock warnings</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Sage</span><span className="guide-auto-desc">↻ Plan button in Life → Schedule — auto-generates a time-blocked day</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Lyra</span><span className="guide-auto-desc">Council tab → Pattern Insights (needs 7+ days of logged data)</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Mirror</span><span className="guide-auto-desc">Council tab → Follow-through grid (live adherence, resets daily)</span></div>
            <div className="guide-auto-row"><span className="guide-auto-name">Council</span><span className="guide-auto-desc">Council tab → main card (cross-domain synthesis, once daily)</span></div>
          </div>

          <h4 className="guide-section-head" style={{ marginTop: 18 }}>Cross-agent awareness</h4>
          <p>Every chat agent sees a snapshot of all your stores. Nora knows if you worked out; Felix knows your protein intake; Cara knows your cycle phase. You never need to re-explain your situation — just ask.</p>

          <h4 className="guide-section-head" style={{ marginTop: 18 }}>Tips</h4>
          <ul className="guide-tips">
            <li>Log something every day via Tell Arc or Health → Data — richer data = sharper, more personalised responses from every agent</li>
            <li>Set your period start once in Health → Data → Log today — Flora derives your phase automatically from there</li>
            <li>The Council and Lyra's patterns are most useful after 7 days of consistent logging</li>
            <li>To set Felix's macro goals: open Felix and say "Set my macro goals" — he'll guide you through 4–5 questions then save targets to arc-macro-goals-v1</li>
            <li>Scout's recommendations improve over time — rate each grocery item with the ★ widget after each shop</li>
            <li>Vera is the fastest entry point if you just have a quick question and aren't sure which specialist to use</li>
          </ul>
        </div>
      </details>

      <TokenUsage />

      <details className="card collapse-card">
        <summary>
          <div className="collapse-lead">
            <div className="lbl" style={{ margin: 0 }}>Your team</div>
            <div className="collapse-summary stat-pills">
              <span><em>{AGENTS.length}</em> agents</span>
              <span className="sep">·</span>
              <span style={{ color: "var(--sage)" }}><em>{live}</em> live</span>
              <span className="sep">·</span>
              <span style={{ color: "var(--sage)" }}><em>{counts.ok || 0}</em> ok</span>
              {counts.slow ? <><span className="sep">·</span><span style={{ color: "var(--amber)" }}><em>{counts.slow}</em> slow</span></> : null}
              {counts.failed ? <><span className="sep">·</span><span style={{ color: "var(--terra)" }}><em>{counts.failed}</em> failed</span></> : null}
              {counts.idle ? <><span className="sep">·</span><span style={{ color: "var(--muted)" }}><em>{counts.idle}</em> idle</span></> : null}
            </div>
          </div>
          <Chevron />
        </summary>
        <div className="collapse-body">
          <label htmlFor="agent-search" className="lbl" style={{ display: "block", margin: "4px 0 4px" }}>
            Search agents
          </label>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              id="agent-search"
              type="search"
              placeholder="Filter by name or role…"
              value={q} onChange={(e) => setQ(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 10, padding: "10px 12px 10px 36px", font: "inherit", fontSize: 13, minHeight: 44, color: "var(--text)" }}
              aria-label="Filter agents by name or role"
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><Icon name="search" size={16} /></span>
          </div>

          <div className="subnav" role="tablist" aria-label="Filter by group">
            {[
              ["all", "All"], ["health", "Health"],
              ["glue", "Glue"], ["wellbeing", "Wellbeing"], ["meta", "Meta"], ["council", "Council"],
            ].map(([id, label]) => (
              <button key={id} role="tab" aria-pressed={group === id} onClick={() => setGroup(id)}>{label}</button>
            ))}
          </div>

          <div className="agentgrid">
            {filtered.map(a => (
              <button key={a.id} className={`agenttile ${a.isNew ? "new" : ""}`} onClick={() => openAgent(a.id)} aria-label={`${a.name} — ${a.role}. Status ${a.status}. Last ran ${a.ran}.`}>
                <span className="sd" style={{ background: statusColor(a.status) }}></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">
                    {a.name}
                    {a.isNew && <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--blue)", letterSpacing: "0.1em" }}>NEW</span>}
                    {a.chat
                      ? <span style={{ marginLeft: 5, fontFamily: "var(--font-mono)", fontSize: 7, padding: "1px 4px", background: "rgba(74,122,90,0.12)", color: "var(--sage)", borderRadius: 3, letterSpacing: "0.08em" }}>CHAT</span>
                      : <span style={{ marginLeft: 5, fontFamily: "var(--font-mono)", fontSize: 7, padding: "1px 4px", background: "var(--surface-2)", color: "var(--muted)", borderRadius: 3, letterSpacing: "0.08em" }}>AUTO</span>
                    }
                  </div>
                  <div className="rl">{GROUP_META[a.group].label} · {a.ran}</div>
                  {a.desc && <div className="ag-desc">{a.desc}</div>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                No agents match "{q}".
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

function StatusPill({ color, count, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} aria-hidden="true"></span>
      <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, color: "var(--deep)" }}>{count}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/* ─── COUNCIL ─── */
function CouncilTab({ openAgent }) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const dayName = now.toLocaleDateString("en-GB", { weekday: "long" });

  // Recompute when any feeding store changes.
  useHealthVersion(); useSupplementsVersion(); useWorkoutsVersion(); useSymptomsVersion();

  const cyc = (typeof deriveCycle === "function") ? deriveCycle() : {};
  const phase = cyc.label || "this phase";
  const phaseDay = cyc.day || "–";

  const council = (typeof useSynthesis === "function") ? useSynthesis("council") : { text: null, loading: false, refresh: () => {} };
  const trends  = (typeof buildArcTrends === "function") ? buildArcTrends() : null;
  const adh     = (typeof buildAdherence === "function") ? buildAdherence() : null;

  const chipStyle = { color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.16)" };
  const freshLabel = council.source === "api" ? "updated just now"
    : council.source === "cache" ? "updated today"
    : council.source === "fallback" ? "offline · basic view" : "";

  return (
    <div role="tabpanel" id="panel-council" aria-labelledby="tab-council">
      <TabIntro title="About · Council">
        <p>Your weekly synthesis and reflection hub — gets sharper the more you log.</p>
        <ul>
          <li><strong>The Council</strong> — Claude reads all your health stores and writes a single cross-domain insight once daily. It flags conflicts (e.g. low protein on a high-training day), patterns (e.g. sleep dipping in luteal), and immediate actions. Tap ↻ to force a refresh at any time.</li>
          <li><strong>Lyra · Pattern Insights</strong> — deterministic 7 and 28-day trend bullets: sleep averages, HRV direction, protein adherence, training load, top symptoms. Requires 7+ days of logged data before trends appear.</li>
          <li><strong>Mirror · Follow-through</strong> — live adherence stats for today and this week: supplements taken, health days logged, workouts completed, chores done. Resets and recalculates daily.</li>
        </ul>
        <p>Ask Vera (floating button) for a quick question without opening a full chat. The Council uses the same cross-domain context as all other agents.</p>
      </TabIntro>
      <section className="card dark" aria-label="The Council — cross-domain synthesis">
        <div className="lbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span><AgentDot id="council"/> The Council · Week {weekNum} · {dayName}</span>
          <button type="button" className="council-refresh" onClick={council.refresh} disabled={council.loading} aria-label="Refresh the Council synthesis">
            {council.loading ? "…" : "↻"}
          </button>
        </div>
        <p className="council-quote" dangerouslySetInnerHTML={{ __html:
          council.loading && !council.text
            ? "Synthesising across your agents…"
            : `“${renderMd(council.text || (typeof councilFallback === "function" ? councilFallback() : ""))}”`
        }} />
        <div className="chips">
          <span className="chip" style={chipStyle}>{phase} · day {phaseDay}</span>
          {freshLabel && <span className="chip" style={chipStyle}>{freshLabel}</span>}
        </div>
      </section>

      <section className="card">
        <div className="lbl"><AgentDot id="lyra"/> Lyra · Pattern insights</div>
        {trends && trends.enoughData
          ? <TrendInsights trends={trends} />
          : <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Patterns appear once Arc has a few days of data{trends ? ` — ${trends.logged7}/7 of the last week logged so far` : ""}. Keep using Tell Arc and the Health tab daily.
            </p>}
      </section>

      <section className="card">
        <div className="lbl"><AgentDot id="mirror"/> Mirror · This week's follow-through</div>
        {adh
          ? <AdherenceGrid adh={adh} />
          : <p style={{ fontSize: 13, color: "var(--muted)" }}>Follow-through stats appear as you log.</p>}
        <div className="rule" style={{ marginTop: 10 }}>
          <strong>Tip:</strong> the more you log, the sharper the Council's cross-domain synthesis becomes.
        </div>
      </section>
    </div>
  );
}

/* ─── TrendInsights — Lyra's real, deterministic trend lines ─── */
function TrendInsights({ trends }) {
  const lines = (typeof trendsText === "function" ? trendsText(trends) : "").split("\n").filter(Boolean);
  if (!lines.length) return null;
  return (
    <ul className="trend-list">
      {lines.map((l, i) => <li key={i}>{l}</li>)}
    </ul>
  );
}

/* ─── AdherenceGrid — Mirror's real follow-through stats ─── */
function AdherenceGrid({ adh }) {
  const items = [
    { label: "Supplements taken today", val: `${adh.suppTaken}/${adh.suppTotal}` },
    { label: "Health logged (7d)",      val: `${adh.logged7}/7` },
    { label: "Workouts this week",      val: `${adh.workouts}` },
    { label: "Chores done today",       val: `${adh.choresDoneToday}` },
  ];
  return (
    <div className="adherence-grid">
      {items.map((it, i) => (
        <div key={i} className="adherence-cell">
          <div className="adherence-val">{it.val}</div>
          <div className="adherence-lbl">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

const _SUPP_TIMINGS  = ["morning", "evening", "with_food", "before_food", "as_needed"];
const _SUPP_STATUSES = ["Active", "On Order", "Discontinued"];
const _SUPP_TIMING_LABELS = { morning: "Morning", evening: "Evening", with_food: "With food", before_food: "Before food", as_needed: "As needed" };
const _MEAL_TIMING_LABELS = { empty_stomach: "empty stomach", before_food: "before food", with_food: "with food", after_food: "after food", anytime: "any time" };
const _PHASE_OPTIONS = ["Any", "Menstrual", "Follicular", "Ovulatory", "Luteal"];

function SupplementsEditor() {
  useSupplementsVersion();
  const all     = loadSupplements().supplements;
  const [editId,  setEditId]  = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const blank = { name: "", dose: "", unit: "mg", timing: "morning", frequency: "Daily", phases: ["Any"], stockStatus: "Active", purpose: "", notes: "", active: true };
  const [addForm, setAddForm] = React.useState({ ...blank });

  const saveAdd = () => {
    if (!addForm.name.trim()) return;
    addSupplement({ ...addForm, phases: addForm.phases.length ? addForm.phases : ["Any"] });
    setAddForm({ ...blank });
    setAddOpen(false);
  };

  return (
    <section className="card" style={{ marginBottom: 10 }}>
      <div className="lbl" style={{ marginBottom: 10 }}>Supplements · all entries</div>
      {all.map(s => (
        editId === s.id
          ? <SuppEditRow key={s.id} s={s} onDone={() => setEditId(null)} />
          : (
            <div key={s.id} className="supp-edit-row">
              <div className="supp-edit-main">
                <span className="supp-edit-name">{s.name}</span>
                <span className="supp-edit-meta">{s.dose} · {_SUPP_TIMING_LABELS[s.timing] || s.timing} · {s.stockStatus}</span>
              </div>
              <div className="supp-edit-btns">
                <button className="chore-edit-btn" onClick={() => setEditId(s.id)} title="Edit">✎</button>
                <button className="chore-edit-btn" style={{ color: "var(--terra)" }} onClick={() => { if (window.confirm(`Delete ${s.name}?`)) deleteSupplement(s.id); }} title="Delete">×</button>
              </div>
            </div>
          )
      ))}
      {addOpen
        ? (
          <div className="supp-add-form" style={{ marginTop: 10 }}>
            <input placeholder="Name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="Dose e.g. 200" value={addForm.dose} onChange={e => setAddForm(f => ({ ...f, dose: e.target.value }))} style={{ flex: 1 }} />
              <input placeholder="mg" value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} style={{ width: 60 }} />
            </div>
            <select value={addForm.timing} onChange={e => setAddForm(f => ({ ...f, timing: e.target.value }))}>
              {_SUPP_TIMINGS.map(t => <option key={t} value={t}>{_SUPP_TIMING_LABELS[t]}</option>)}
            </select>
            <select value={addForm.stockStatus} onChange={e => setAddForm(f => ({ ...f, stockStatus: e.target.value, active: e.target.value === "Active" }))}>
              {_SUPP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Purpose (optional)" value={addForm.purpose} onChange={e => setAddForm(f => ({ ...f, purpose: e.target.value }))} />
            <textarea placeholder="Notes (optional)" value={addForm.notes} rows={2} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              style={{ width: "100%", font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-action" onClick={saveAdd} disabled={!addForm.name.trim()}>Add</button>
              <button className="btn-action ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            </div>
          </div>
        )
        : <button className="schedule-add-day" style={{ marginTop: 8 }} onClick={() => setAddOpen(true)}>+ Add supplement</button>
      }
    </section>
  );
}

function SuppEditRow({ s, onDone }) {
  const [form, setForm] = React.useState({
    name: s.name || "", dose: s.dose || "", unit: s.unit || "mg",
    timing: s.timing || "morning", frequency: s.frequency || "Daily",
    stockStatus: s.stockStatus || "Active", purpose: s.purpose || "", notes: s.notes || "",
    active: s.stockStatus === "Active",
  });
  const save = () => {
    updateSupplement(s.id, { ...form, active: form.stockStatus === "Active" });
    onDone();
  };
  return (
    <div className="supp-edit-form">
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
      <div style={{ display: "flex", gap: 6 }}>
        <input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="Dose" style={{ flex: 1 }} />
        <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="unit" style={{ width: 60 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <select value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))} style={{ flex: 1 }}>
          {_SUPP_TIMINGS.map(t => <option key={t} value={t}>{_SUPP_TIMING_LABELS[t]}</option>)}
        </select>
        <select value={form.stockStatus} onChange={e => setForm(f => ({ ...f, stockStatus: e.target.value }))} style={{ flex: 1 }}>
          {_SUPP_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>
      <input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Purpose" />
      <textarea value={form.notes} rows={2} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes / interactions"
        style={{ width: "100%", font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)", resize: "vertical" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-action" onClick={save}>Save</button>
        <button className="btn-action ghost" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

function HealthDataTab() {
  return (
    <>
      <section className="card" style={{ paddingTop: 12 }}>
        <div className="lbl">Your health · daily log</div>
        <HealthLogForm inline />
      </section>
      <AppleHealthData />
      <SupplementsEditor />
      <section className="card"><BloodTestPanel /></section>
      <section className="card"><BodyTracker /></section>
      <PersonalCareCupboard />
      <NotionDataUpdates />
    </>
  );
}

/* ─── LIFE SCHEDULE TAB ─── */
const _SCHEDULE_TYPE_LABELS = {
  grocery_run: "Grocery run", meal_prep: "Meal prep", chore: "Chore",
  workout: "Workout", supplement_dose: "Supplements", other: "Other",
};
const _DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Maps skincare categories to a display group for the schedule label.
const _CARE_GROUP = {
  cleanser: "Face", toner: "Face", essence: "Face", serum: "Face",
  treatment: "Face", eye: "Face", moisturiser: "Face", oil: "Face",
  spf: "Face", mask: "Face", body: "Body", hair: "Hair", dental: "Dental", other: "Other",
};
const _careLabel = (products) =>
  [...new Set(products.map(p => _CARE_GROUP[p.category] || "Other"))].join(" · ");

// Builds a sensible day plan from real store data (chores, supplements, workouts, care routines).
// Supplements are split into separate time blocks based on mealTiming science:
//   06:30 — before_food / empty_stomach morning supps (iron, B12 — need empty stomach)
//   07:15 — with_food morning supps (multivitamin, adaptogens — need food buffer)
//   12:45 — with_food timing (not morning/evening) — e.g. D3 which needs dietary fat
//   21:00 — evening supps (magnesium — supports sleep)
// Care routines (skin/body/hair/dental) from arc-skincare-v1:
//   07:45 — AM care routine
//   21:30 — PM care routine
function buildDayPlan(skipTimes = new Set(), dateKey = null) {
  const today  = dateKey || _todayKey();
  const dt     = typeof getDayType === "function" ? getDayType(today) : "wfh";
  const chores = typeof getDueChores === "function" ? getDueChores() : [];
  const supps  = typeof getActiveSupplements === "function" ? getActiveSupplements() : [];
  const amCare = typeof getRoutine === "function" ? getRoutine("AM") : [];
  const pmCare = typeof getRoutine === "function" ? getRoutine("PM") : [];

  const preBreakfastSupps = supps.filter(s =>
    s.timing === "morning" && (s.mealTiming === "before_food" || s.mealTiming === "empty_stomach")
  );
  const withBreakfastSupps = supps.filter(s =>
    s.timing === "morning" && !preBreakfastSupps.includes(s)
  );
  const withLunchSupps = supps.filter(s => s.timing === "with_food");
  const eveningSupps   = supps.filter(s => s.timing === "evening");

  // Compute weekOf for the plan date (may differ from current week)
  const _planWeekOf = (() => {
    const d = new Date(today + "T00:00:00");
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return mon.toISOString().slice(0, 10);
  })();
  const workouts = typeof getWorkoutsForWeek === "function"
    ? getWorkoutsForWeek(_planWeekOf).filter(w => w.date === today) : [];

  const plan = [];
  // Only add a block if its time slot isn't already held by a pinned item
  const _add = (item) => { if (!skipTimes.has(item.time)) plan.push(item); };

  if (preBreakfastSupps.length)
    _add({ time: "06:30", label: `Before breakfast · ${preBreakfastSupps.map(s => s.name).join(", ")}`, type: "supplement_dose" });

  if (withBreakfastSupps.length)
    _add({ time: "07:15", label: `With breakfast · ${withBreakfastSupps.map(s => s.name).join(", ")}`, type: "supplement_dose" });

  const dailyChores = chores.filter(c => c.frequency === "daily");
  if (dailyChores.length)
    _add({ time: "07:30", label: dailyChores.map(c => c.label).join(" · "), type: "chore" });

  if (amCare.length)
    _add({ time: "07:45", label: `AM routine · ${_careLabel(amCare)}`, type: "other" });

  if (dt === "office") {
    _add({ time: "08:30", label: "Commute + office", type: "other" });
    _add({ time: "12:30", label: "Lunch (office)", type: "meal_prep" });
    _add({ time: "17:30", label: "Head home", type: "other" });
  } else if (dt === "wfh") {
    _add({ time: "09:00", label: "WFH — work block", type: "other" });
    _add({ time: "12:30", label: "Lunch at home", type: "meal_prep" });
    _add({ time: "14:00", label: "WFH — afternoon focus", type: "other" });
  } else {
    _add({ time: "10:00", label: "Morning · free block", type: "other" });
  }

  if (withLunchSupps.length)
    _add({ time: "12:45", label: `With lunch · ${withLunchSupps.map(s => s.name).join(", ")}`, type: "supplement_dose" });

  const heavyChores = chores.filter(c => c.dayType === "wfh" || c.dayType === "weekend");
  if (heavyChores.length && (dt === "wfh" || dt === "off")) {
    const t = dt === "off" ? "10:30" : "16:00";
    _add({ time: t, label: heavyChores.slice(0, 3).map(c => c.label).join(" · "), type: "chore" });
  }

  const wt = dt === "office" ? "18:30" : "17:30";
  if (workouts.length)
    _add({ time: wt, label: `${workouts[0].type} · ${workouts[0].duration} min`, type: "workout" });

  _add({ time: "19:30", label: "Dinner", type: "meal_prep" });

  if (eveningSupps.length)
    _add({ time: "21:00", label: `Evening · ${eveningSupps.map(s => s.name).join(", ")}`, type: "supplement_dose" });

  if (pmCare.length)
    _add({ time: "21:30", label: `PM routine · ${_careLabel(pmCare)}`, type: "other" });

  _add({ time: "22:00", label: "Wind-down · no screens", type: "other" });

  return plan;
}

// Checks whether moving a supplement_dose schedule item to newTime violates its
// mealTiming constraints. Returns [{ name, why, betterTime }] or null.
// `why` is pulled from the supplement's stored timingNote so the user sees the
// science-backed reason, not just a generic message.
function _checkSuppTimingConflict(item, newTime) {
  if (item.type !== "supplement_dose" || !newTime) return null;
  const allSupps = typeof loadSupplements === "function" ? loadSupplements().supplements : [];
  const [h, m] = newTime.split(":").map(Number);
  const newHour = h + m / 60;
  const issues = [];

  for (const s of allSupps) {
    if (!item.label.includes(s.name)) continue;
    let why = null, betterTime = null;

    if (s.mealTiming === "before_food" || s.mealTiming === "empty_stomach") {
      if (newHour > 7.75) {
        why = s.timingNote || `${s.name} needs an empty stomach for best absorption.`;
        betterTime = "06:30 — before breakfast, empty stomach";
      }
    } else if (s.timing === "evening") {
      if (newHour < 17) {
        why = s.timingNote || `${s.name} is an evening supplement.`;
        betterTime = "21:00 — evening, before bed";
      }
    } else if (s.mealTiming === "with_food" && s.timing !== "morning") {
      if (newHour < 6.5 || newHour > 22) {
        why = s.timingNote || `${s.name} needs to be taken with a meal.`;
        betterTime = "12:45 — with lunch (fat-containing)";
      }
    }

    if (why) issues.push({ name: s.name, why, betterTime });
  }
  return issues.length > 0 ? issues : null;
}

function WeeklySchedule() {
  useScheduleVersion();
  const [view,     setView]    = React.useState("week");
  const [weekOf,   setWeekOf]  = React.useState(currentWeekOf());
  const [selDay,   setSelDay]  = React.useState(_todayKey());
  const [dragId,   setDragId]  = React.useState(null);
  const [dragOver, setDragOver]= React.useState(null);
  const [addOpen,  setAddOpen] = React.useState(false);
  const [addForm,      setAddForm]      = React.useState({ type: "chore", label: "", time: "" });
  const [timingWarning, setTimingWarning] = React.useState(null);

  const today     = _todayKey();
  const weekDates = _weekDates(weekOf);
  const allItems  = getScheduleForWeek(weekOf);

  const fmtWk  = (w) => new Date(w + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fmtDay = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  const openDay = (date) => { setSelDay(date); setView("day"); };

  const doGenPlan = () => {
    const selItems = allItems.filter(i => i.date === selDay);
    const pinnedTimes = new Set(selItems.filter(i => i.pinned).map(i => i.time));
    selItems.filter(i => !i.pinned).forEach(i => deleteScheduleItem(i.id));
    const plan = buildDayPlan(pinnedTimes, selDay);
    plan.forEach(item => addScheduleItem({ date: selDay, ...item }));
  };

  const confirmAdd = () => {
    if (!addForm.label.trim()) return;
    addScheduleItem({ date: selDay, type: addForm.type, label: addForm.label.trim(), time: addForm.time || undefined });
    setAddForm({ type: "chore", label: "", time: "" });
    setAddOpen(false);
  };

  // Shared swap core — used by both HTML5 drag (desktop/mouse) and the up/down
  // reorder arrows (touch-friendly). Swaps the two items' `time` values, but first
  // enforces the pinned lock and runs the supplement-timing conflict check so the
  // "Keep timing / Move anyway" flow is preserved no matter how the swap was triggered.
  const attemptSwap = (srcId, tgtId) => {
    if (!srcId || srcId === tgtId) return;
    const dayItems = allItems.filter(i => i.date === selDay);
    const src = dayItems.find(i => i.id === srcId);
    const tgt = dayItems.find(i => i.id === tgtId);
    if (!src || !tgt) return;
    // Block if either item is pinned — pinned means the time slot is locked
    if (src.pinned || tgt.pinned) {
      const pinned = src.pinned ? src : tgt;
      setTimingWarning({ pinned: true, pinnedLabel: pinned.label });
      return;
    }
    const issues = [
      ...(_checkSuppTimingConflict(src, tgt.time) || []),
      ...(_checkSuppTimingConflict(tgt, src.time) || []),
    ];
    if (issues.length > 0) {
      setTimingWarning({ issues, pending: { srcId: src.id, tgtId: tgt.id, srcTime: src.time, tgtTime: tgt.time } });
    } else {
      updateScheduleItem(src.id, { time: tgt.time });
      updateScheduleItem(tgt.id, { time: src.time });
    }
  };

  const handleDayDrop = (targetId) => {
    if (dragId && dragId !== targetId) attemptSwap(dragId, targetId);
    setDragId(null); setDragOver(null);
  };

  // Touch-friendly reorder: swap an item with its sorted neighbour (dir -1 = up, +1 = down).
  // HTML5 drag events don't fire on touchscreens, so this is the primary path on mobile.
  const moveItem = (id, dir) => {
    const sorted = allItems.filter(i => i.date === selDay)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    const idx = sorted.findIndex(i => i.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    attemptSwap(id, sorted[targetIdx].id);
  };

  const viewToggle = (
    <div className="sched-view-toggle">
      <button className={`sched-view-btn${view === "week" ? " active" : ""}`} onClick={() => setView("week")}>Week</button>
      <button className={`sched-view-btn${view === "day" ? " active" : ""}`} onClick={() => openDay(selDay)}>Day</button>
    </div>
  );

  /* ── WEEK VIEW (compact) ── */
  if (view === "week") {
    return (
      <div>
        <div className="sched-top-row">
          <div className="week-nav">
            <button className="btn-action ghost" style={{ padding: "5px 10px" }} onClick={() => setWeekOf(w => _shiftWeekBy(w, -1))}>‹</button>
            <span className="week-nav-label">Week of {fmtWk(weekOf)}</span>
            <button className="btn-action ghost" style={{ padding: "5px 10px" }} onClick={() => setWeekOf(w => _shiftWeekBy(w, 1))}>›</button>
          </div>
          {viewToggle}
        </div>
        <div className="week-compact-grid">
          {weekDates.map((date, i) => {
            const dayItems = allItems.filter(it => it.date === date);
            const done     = dayItems.filter(it => it.done).length;
            const isToday  = date === today;
            return (
              <div
                key={date}
                className={`week-compact-col${isToday ? " today" : ""}`}
                onClick={() => openDay(date)}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === "Enter" && openDay(date)}
              >
                <div className="week-compact-head">
                  <span className="week-compact-dn">{_DAY_NAMES[i]}</span>
                  <span className="week-compact-dd">{date.slice(8)}</span>
                </div>
                <div className="week-compact-dots">
                  {dayItems.length === 0
                    ? <span className="wc-empty" />
                    : dayItems.slice(0, 8).map(it => (
                        <span key={it.id} className={`wc-dot${it.done ? " done" : ""}`} data-type={it.type} title={it.label} />
                      ))
                  }
                </div>
                {dayItems.length > 0 && (
                  <span className="week-compact-count">{dayItems.length - done}/{dayItems.length}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── DAY VIEW (detailed) ── */
  const dayIdx   = weekDates.indexOf(selDay);
  const prevDay  = dayIdx > 0  ? weekDates[dayIdx - 1] : null;
  const nextDay  = dayIdx < 6  ? weekDates[dayIdx + 1] : null;
  const dayItems = allItems.filter(i => i.date === selDay).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  return (
    <div>
      <div className="sched-top-row">
        <div className="sched-day-nav">
          <button className="btn-action ghost" style={{ padding: "5px 10px" }} onClick={() => prevDay && setSelDay(prevDay)} disabled={!prevDay}>‹</button>
          <span className="sched-day-heading">{fmtDay(selDay)}{selDay === today ? " · Today" : ""}</span>
          <button className="btn-action ghost" style={{ padding: "5px 10px" }} onClick={() => nextDay && setSelDay(nextDay)} disabled={!nextDay}>›</button>
        </div>
        {viewToggle}
      </div>

      {/* Plan / Re-plan button — available for any selected day */}
      <div className="sched-plan-row">
        <button className="schedule-gen-btn" onClick={doGenPlan}>
          {dayItems.length === 0
            ? `↻ Plan ${selDay === today ? "today" : fmtDay(selDay)} from your stores`
            : dayItems.some(i => i.pinned)
              ? "↻ Re-plan around pinned blocks"
              : `↻ Re-plan ${selDay === today ? "today" : fmtDay(selDay)}`}
        </button>
        {dayItems.some(i => i.pinned) && (
          <span className="sched-plan-hint">Pinned blocks stay fixed</span>
        )}
      </div>

      {dayItems.length === 0 && (
        <div className="sched-empty-state">
          <p className="sched-empty-text">Nothing scheduled — tap the plan button above or + below to add.</p>
        </div>
      )}

      {timingWarning && (
        <div className="sched-timing-warn">
          {timingWarning.pinned ? (
            <>
              <div className="sched-timing-warn-head">
                <span className="sched-timing-warn-icon">📌</span>
                <strong>Block is pinned</strong>
              </div>
              <div className="sched-timing-warn-item">
                <span className="sched-timing-warn-name">{timingWarning.pinnedLabel}</span>
                <span className="sched-timing-warn-why">This block's time slot is locked. The AI will schedule around it when you re-plan. Tap the pin icon (⊙) on the block to unlock it.</span>
              </div>
              <div className="sched-timing-warn-actions">
                <button className="btn-action" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setTimingWarning(null)}>Got it</button>
              </div>
            </>
          ) : (
            <>
              <div className="sched-timing-warn-head">
                <span className="sched-timing-warn-icon">⏱</span>
                <strong>Timing conflict</strong>
              </div>
              {timingWarning.issues.map((w, i) => (
                <div key={i} className="sched-timing-warn-item">
                  <span className="sched-timing-warn-name">{w.name}</span>
                  <span className="sched-timing-warn-why">{w.why}</span>
                  {w.betterTime && <span className="sched-timing-warn-when">→ Optimal: {w.betterTime}</span>}
                </div>
              ))}
              <div className="sched-timing-warn-actions">
                <button className="btn-action" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setTimingWarning(null)}>
                  Keep timing
                </button>
                <button className="btn-action ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => {
                  const { pending } = timingWarning;
                  updateScheduleItem(pending.srcId, { time: pending.tgtTime });
                  updateScheduleItem(pending.tgtId, { time: pending.srcTime });
                  setTimingWarning(null);
                }}>
                  Move anyway
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="sched-day-list">
        {dayItems.map((it, idx) => (
          <div
            key={it.id}
            className={`sched-day-item${it.done ? " done" : ""}${it.pinned ? " pinned" : ""}${dragId === it.id ? " dragging" : ""}${dragOver === it.id ? " drag-over-item" : ""}`}
            data-type={it.type}
            draggable={!it.pinned}
            onDragStart={it.pinned ? undefined : (e => { e.dataTransfer.setData("text/plain", it.id); setDragId(it.id); })}
            onDragEnd={it.pinned ? undefined : (() => { setDragId(null); setDragOver(null); })}
            onDragOver={e => { e.preventDefault(); setDragOver(it.id); }}
            onDragLeave={() => setDragOver(d => d === it.id ? null : d)}
            onDrop={e => { e.preventDefault(); handleDayDrop(it.id); }}
          >
            <div className="sdi-reorder">
              {!it.pinned && (<>
                <button className="sdi-move" disabled={idx === 0}
                  onClick={() => moveItem(it.id, -1)} title="Move earlier" aria-label="Move earlier">▲</button>
                <button className="sdi-move" disabled={idx === dayItems.length - 1}
                  onClick={() => moveItem(it.id, 1)} title="Move later" aria-label="Move later">▼</button>
              </>)}
            </div>
            <div className="sdi-time">{it.time || ""}</div>
            <div className="sdi-label">{it.label}</div>
            <div className="sdi-actions">
              <button
                className={`sdi-pin${it.pinned ? " active" : ""}`}
                onClick={() => updateScheduleItem(it.id, { pinned: !it.pinned })}
                title={it.pinned ? "Unpin — AI can reschedule" : "Pin — hold this time slot"}
              >⊙</button>
              <button className={`sdi-check${it.done ? " checked" : ""}`} onClick={() => toggleScheduleItem(it.id)} title={it.done ? "Mark undone" : "Mark done"}>
                {it.done ? "✓" : "○"}
              </button>
              {typeof scheduleInCalendar === "function" && it.time && (
                <button className="sdi-cal"
                  title={it.gcalEventId ? "Update in Calendar" : "Add to Google Calendar"}
                  onClick={async () => {
                    try {
                      const r = await scheduleInCalendar({ title: it.label, date: selDay, time: it.time, duration: it.duration || 30, category: it.type, eventId: it.gcalEventId });
                      updateScheduleItem(it.id, { gcalEventId: r.eventId });
                    } catch(e) { alert("Calendar error: " + e.message); }
                  }}>
                  {it.gcalEventId ? "📅✓" : "📅"}
                </button>
              )}
              <button className="sdi-rm" onClick={() => deleteScheduleItem(it.id)} title="Remove">×</button>
            </div>
          </div>
        ))}
      </div>

      {addOpen ? (
        <div className="card" style={{ marginTop: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
            {Object.entries(_SCHEDULE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Label" onKeyDown={e => e.key === "Enter" && confirmAdd()} />
          <input type="time" value={addForm.time} onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))} />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-action" onClick={confirmAdd} disabled={!addForm.label.trim()}>Add</button>
            <button className="btn-action ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="schedule-add-day" style={{ marginTop: 8 }} onClick={() => setAddOpen(true)}>+ Add item</button>
      )}
    </div>
  );
}

const _FREQ_ORDER  = ["daily", "weekly", "biweekly", "monthly", "bimonthly"];
const _FREQ_LABELS = { daily:"Daily", weekly:"Weekly", biweekly:"Every 2 weeks", monthly:"Monthly", bimonthly:"Every 2 months" };

function ChoresTracker() {
  useChoresVersion();
  useWorkVersion();
  const all            = loadChores().chores;
  const today          = _todayKey();
  const dayType        = (typeof getDayType === "function") ? getDayType() : "wfh";
  const [form,         setForm]         = React.useState({ label: "", category: "Household", frequency: "weekly", dayType: "any" });
  const [showAdd,      setShowAdd]      = React.useState(false);
  const [editingChoreId, setEditingChoreId] = React.useState(null);

  const isOverdue  = (c) => c.nextDue < today;
  const isDueToday = (c) => c.nextDue === today;
  const isDue      = (c) => c.nextDue <= today;

  const dayHint = (c) => {
    if (!c.dayType || c.dayType === "any") return null;
    if (c.dayType === "wfh") {
      return dayType === "wfh"
        ? { icon: "✓", cls: "dt-ok",    tip: "Good for WFH" }
        : { icon: "~", cls: "dt-later", tip: "Better on a WFH day" };
    }
    if (c.dayType === "weekend") {
      const dow = new Date().getDay();
      return (dow === 0 || dow === 6)
        ? { icon: "✓", cls: "dt-ok",    tip: "Good for weekends" }
        : { icon: "~", cls: "dt-later", tip: "Better on a weekend" };
    }
    return null;
  };

  const doAdd = () => {
    if (!form.label.trim()) return;
    addChore({ ...form });
    setForm({ label: "", category: "Household", frequency: "weekly", dayType: "any" });
    setShowAdd(false);
  };

  const selStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)" };

  const dueNow = all.filter(isDue);
  const byFreq = {};
  _FREQ_ORDER.forEach(f => { byFreq[f] = []; });
  all.forEach(c => { const f = c.frequency || "weekly"; (byFreq[f] || (byFreq[f] = [])).push(c); });

  const ChoreEditRow = ({ c, onDone }) => {
    const [ef, setEf] = React.useState({
      label:     c.label || "",
      category:  c.category || "Household",
      frequency: c.frequency || "weekly",
      duration:  c.duration != null ? String(c.duration) : "",
      dayType:   c.dayType || "any",
    });
    const save = () => {
      updateChore(c.id, { ...ef, duration: ef.duration ? Number(ef.duration) : undefined });
      onDone();
    };
    return (
      <div className="chore-edit-row">
        <input value={ef.label} onChange={e => setEf(f => ({ ...f, label: e.target.value }))}
          placeholder="Chore name" style={{ ...selStyle, width: "100%" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select value={ef.category} onChange={e => setEf(f => ({ ...f, category: e.target.value }))} style={selStyle}>
            {["Household","Kitchen","Other"].map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={ef.frequency} onChange={e => setEf(f => ({ ...f, frequency: e.target.value }))} style={selStyle}>
            {_FREQ_ORDER.map(v => <option key={v} value={v}>{_FREQ_LABELS[v]}</option>)}
          </select>
          <select value={ef.dayType} onChange={e => setEf(f => ({ ...f, dayType: e.target.value }))} style={selStyle}>
            {[["any","Any day"],["wfh","WFH day"],["weekend","Weekend"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="number" value={ef.duration} onChange={e => setEf(f => ({ ...f, duration: e.target.value }))}
            placeholder="min" style={{ ...selStyle, width: 60 }} />
        </div>
        <div className="chore-edit-actions">
          <button className="btn-action" style={{ fontSize: 12, padding: "6px 14px" }} onClick={save}>Save</button>
          <button className="btn-action ghost" style={{ fontSize: 12, padding: "6px 14px" }} onClick={onDone}>Cancel</button>
          {!c.fixed && (
            <button className="btn-action ghost" style={{ fontSize: 12, padding: "6px 14px", color: "var(--terra)" }}
              onClick={() => { deleteChore(c.id); onDone(); }}>Delete</button>
          )}
        </div>
      </div>
    );
  };

  const ChoreRow = ({ c }) => {
    const hint = dayHint(c);
    if (editingChoreId === c.id)
      return <ChoreEditRow c={c} onDone={() => setEditingChoreId(null)} />;
    return (
      <div className={`chore-row${isOverdue(c) ? " overdue" : isDueToday(c) ? " due-today" : ""}`}>
        <button className="chore-done-btn" onClick={() => markChoreDone(c.id)} title="Mark done">✓</button>
        <span className="chore-label">{c.label}</span>
        {c.duration && <span className="chore-dur">{c.duration}m</span>}
        {hint && <span className={`chore-dt-hint ${hint.cls}`} title={hint.tip}>{hint.icon}</span>}
        <span className="chore-next-due">
          {isOverdue(c)   ? <span className="chore-due-badge overdue">overdue</span>
           : isDueToday(c) ? <span className="chore-due-badge today">today</span>
           : <span className="chore-next-label">{c.nextDue ? c.nextDue.slice(5) : "—"}</span>}
        </span>
        <button className="chore-edit-btn" onClick={() => setEditingChoreId(c.id)} title="Edit chore">✎</button>
        {!c.fixed && (
          <button className="chore-del" onClick={() => deleteChore(c.id)} aria-label="Delete">×</button>
        )}
      </div>
    );
  };

  return (
    <div>
      {dueNow.length > 0 && (
        <section className="card" style={{ marginBottom: 10 }}>
          <div className="lbl">Due today · {dueNow.length} chore{dueNow.length !== 1 ? "s" : ""}</div>
          {dueNow.map(c => <ChoreRow key={c.id} c={c} />)}
        </section>
      )}

      {_FREQ_ORDER.map(freq => {
        const chores = byFreq[freq];
        if (!chores || !chores.length) return null;
        return (
          <section key={freq} className="card" style={{ marginBottom: 10 }}>
            <div className="lbl">{_FREQ_LABELS[freq]}</div>
            {chores.map(c => <ChoreRow key={c.id} c={c} />)}
          </section>
        );
      })}

      <section className="card">
        {!showAdd ? (
          <button className="btn-action ghost" style={{ width: "100%" }} onClick={() => setShowAdd(true)}>
            + Add custom chore
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Chore name" onKeyDown={e => e.key === "Enter" && doAdd()}
              style={{ ...selStyle, flex: 1, minWidth: 120 }} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={selStyle}>
              {["Household","Kitchen","Other"].map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={selStyle}>
              {_FREQ_ORDER.map(f => <option key={f} value={f}>{_FREQ_LABELS[f]}</option>)}
            </select>
            <select value={form.dayType} onChange={e => setForm(f => ({ ...f, dayType: e.target.value }))} style={selStyle} title="Best day type">
              {[["any","Any day"],["wfh","WFH day"],["weekend","Weekend"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn-action" onClick={doAdd} disabled={!form.label.trim()}>Add</button>
            <button className="btn-action ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}

function SupplementRow({ s, phaseLabel }) {
  const [open, setOpen] = React.useState(false);
  const forPhase  = supplementMatchesPhase(s, phaseLabel);
  const mealLabel = s.mealTiming ? (_MEAL_TIMING_LABELS[s.mealTiming] || s.mealTiming) : null;
  const hasDetail = s.purpose || s.notes || s.timingNote || (s.avoidWith && s.avoidWith.length) || (s.phases && s.phases.length);
  return (
    <div className={`supp-row ${forPhase ? "supp-for-phase" : ""}`}>
      <input type="checkbox" className="supp-check" checked={s.takenToday} onChange={() => toggleSupplementTaken(s.id)} />
      <div className="supp-info" onClick={() => hasDetail && setOpen(o => !o)} style={{ cursor: hasDetail ? "pointer" : "default" }}>
        <div className="supp-name">
          {s.name}
          {forPhase && <span className="supp-phase-badge">★ {phaseLabel}</span>}
        </div>
        <div className="supp-timing">
          {_SUPP_TIMING_LABELS[s.timing] || s.timing}
          {mealLabel && s.mealTiming !== "with_food" && (
            <span className="supp-meal-badge" data-meal={s.mealTiming}>{mealLabel}</span>
          )}
          {" · "}{s.dose}{s.frequency ? ` · ${s.frequency}` : ""}
        </div>
        <div className="supp-days">{s.daysLeft} / {s.totalDays} {s.frequency === "As Needed" ? "units left" : "days left"}</div>
        <div className="supp-bar">
          <div className={`supp-bar-fill ${isSupplementLow(s) ? "low" : ""}`}
            style={{ width: `${Math.min(100, (s.daysLeft / (s.totalDays || 1)) * 100)}%` }} />
        </div>
        {open && (
          <div className="supp-detail">
            {s.timingNote && (
              <div className="supp-timing-note">
                <span className="supp-timing-icon">⏱</span>{s.timingNote}
              </div>
            )}
            {s.avoidWith && s.avoidWith.length > 0 && (
              <div className="supp-avoid-section">
                <div className="supp-avoid-label">Avoid with</div>
                <ul className="supp-avoid-list">
                  {s.avoidWith.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {s.purpose && <div style={{ marginTop: 6 }}><strong>Why:</strong> {s.purpose}</div>}
            {s.notes && <div className="supp-detail-note">⚠ {s.notes}</div>}
            {s.phases && s.phases.length > 0 && (
              <div className="supp-phase-chips">
                {s.phases.map(p => <span key={p} className="supp-phase-chip">{p}</span>)}
              </div>
            )}
            {s.expiry && <div className="supp-detail-exp">Expires {s.expiry}</div>}
          </div>
        )}
      </div>
      {isSupplementLow(s) && <span className="supp-low-badge">LOW</span>}
      <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}
        onClick={() => deleteSupplement(s.id)} aria-label="Delete">×</button>
    </div>
  );
}

function SupplementsTracker() {
  useSupplementsVersion();
  const supplements = getActiveSupplements();
  const inactive    = getInactiveSupplements();
  const cyc         = typeof deriveCycle === "function" ? deriveCycle() : {};
  const phaseLabel  = cyc.label || null;
  const [form, setForm] = React.useState({ name: "", dose: "1 tablet", timing: "morning", totalDays: "30" });

  const doAdd = () => {
    if (!form.name.trim()) return;
    addSupplement({ ...form, totalDays: Number(form.totalDays) || 30 });
    setForm({ name: "", dose: "1 tablet", timing: "morning", totalDays: "30" });
  };

  const taken     = supplements.filter(s => s.takenToday).length;
  const phaseSupp = supplements.filter(s => supplementMatchesPhase(s, phaseLabel));
  const fieldStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)" };

  return (
    <div>
      <section className="card">
        <div className="lbl">Daily supplements{phaseLabel ? ` · ${phaseLabel} phase` : ""}</div>
        {supplements.length > 0 && (
          <div className="supp-progress">{taken} of {supplements.length} taken today</div>
        )}
        {phaseSupp.length > 0 && (
          <div className="supp-phase-hint">★ {phaseSupp.map(s => s.name).join(", ")} flagged for your {phaseLabel.toLowerCase()} phase.</div>
        )}
        {supplements.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0" }}>No active supplements.</div>
        ) : (
          supplements.map(s => <SupplementRow key={s.id} s={s} phaseLabel={phaseLabel} />)
        )}
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Add supplement</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name"
              style={{ ...fieldStyle, flex: "2 0 120px" }} />
            <input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="Dose"
              style={{ ...fieldStyle, flex: "1 0 80px" }} />
            <select value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))} style={fieldStyle}>
              {["morning","evening","with_food","as_needed","weekly"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={form.totalDays} onChange={e => setForm(f => ({ ...f, totalDays: e.target.value }))}
              placeholder="days" style={{ ...fieldStyle, width: 64 }} />
            <button className="btn-action" onClick={doAdd} disabled={!form.name.trim()}>Add</button>
          </div>
        </div>
      </section>

      {inactive.length > 0 && (
        <details className="card collapse-card" style={{ marginTop: 10 }}>
          <summary>
            <div className="collapse-lead">
              <div className="lbl" style={{ margin: 0 }}>On order / discontinued</div>
              <div className="collapse-summary"><span>{inactive.length} not in daily list</span></div>
            </div>
            <Chevron />
          </summary>
          <div className="collapse-body">
            {inactive.map(s => (
              <div key={s.id} className="supp-inactive-row">
                <div>
                  <div className="supp-name">{s.name} <span className={`supp-stock-badge ${s.stockStatus === "On Order" ? "order" : "disc"}`}>{s.stockStatus}</span></div>
                  {s.purpose && <div className="supp-timing">{s.purpose}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {s.stockStatus !== "Active" && (
                    <button className="btn-action ghost" style={{ fontSize: 11 }}
                      onClick={() => updateSupplement(s.id, { active: true, stockStatus: "Active", daysLeft: s.totalDays || 30 })}>
                      Activate
                    </button>
                  )}
                  <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}
                    onClick={() => deleteSupplement(s.id)} aria-label="Delete">×</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function LifeScheduleTab({ openAgent }) {
  const [sub, setSub] = React.useState("schedule");
  return (
    <div role="tabpanel" id="panel-life" aria-labelledby="tab-life">
      <TabIntro title="About · Life">
        <p>Your daily structure — schedule, chores, and supplements in one place.</p>
        <ul>
          <li><strong>Schedule</strong> — Week view shows a 7-col dot overview; Day view shows the full timeline. Tap ↻ Plan to auto-generate a time-blocked day from your chores, supplements, workouts, and day type. Drag items to reorder. Tap 📅 on any timed block to push it to Google Calendar. Pin a block (⊙) to lock its time when re-planning.</li>
          <li><strong>Chores</strong> — 19 pre-seeded household tasks tagged by frequency (daily / weekly / biweekly / monthly) and best day type (office / WFH / day off). Tap ✎ on any row to edit label, category, frequency, day type, or duration inline. Fixed chores can be edited but not deleted.</li>
          <li><strong>Supplements</strong> — phase-aware tracker showing which supplements are most relevant today. Check off what you've taken. AM/PM timing badges help sequence your stack. Low-stock items are flagged automatically.</li>
        </ul>
        <p>Planning tip: set your day type first (Today tab → pill at the top), then tap ↻ Plan — the planner uses your day type to pick the right chores and meal-timing context.</p>
      </TabIntro>
      <div className="subnav" role="tablist" aria-label="Life sections">
        {[["schedule","Schedule"],["chores","Chores"],["supplements","Supplements"]].map(([id, label]) => (
          <button key={id} role="tab" aria-pressed={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>
      {sub === "schedule"    && <WeeklySchedule />}
      {sub === "chores"      && <ChoresTracker />}
      {sub === "supplements" && <SupplementsTracker />}
    </div>
  );
}

Object.assign(window, { TodayTab, HealthTab, AgentsTab, CouncilTab, Icon, LifeScheduleTab });
