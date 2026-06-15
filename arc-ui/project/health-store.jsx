/* health-store.jsx — manual daily health log
 *
 * The automated Apple Watch pull was retired (see CLAUDE.md). In the app you type
 * your daily numbers; they persist to localStorage under HEALTH_STORE_KEY and drive
 * the Today vitals, the Health → Data cards, and the cycle phase shown across tabs.
 * Cycle phase is derived from a one-time period-start date (no daily input), matching
 * the boundaries in utils/cycle_utils.py. Day-of-day "state" (morning/work/…) is
 * derived from the real clock instead of a manual setting.
 *
 * Loaded before tabs.jsx / app.jsx; registers helpers + components on window.
 */

const HEALTH_STORE_KEY = "arc-health-v1";

// Metrics the form collects. First four (HEALTH_CORE) are the everyday ones.
const HEALTH_METRICS = [
  { key: "sleep_duration",  label: "Sleep",       unit: "h",    step: 0.1, max: 16,     core: true },
  { key: "hrv",             label: "HRV",         unit: "ms",   step: 1,   max: 250,    core: true },
  { key: "resting_hr",      label: "Resting HR",  unit: "bpm",  step: 1,   max: 220,    core: true },
  { key: "steps",           label: "Steps",       unit: "",     step: 100, max: 100000, core: true },
  { key: "deep_sleep_min",  label: "Deep sleep",  unit: "min",  step: 5,   max: 600 },
  { key: "rem_sleep_min",   label: "REM sleep",   unit: "min",  step: 5,   max: 600 },
  { key: "active_calories", label: "Active kcal", unit: "kcal", step: 10,  max: 8000 },
  { key: "stand_hours",     label: "Stand",       unit: "h",    step: 1,   max: 24 },
];
const HEALTH_CORE = HEALTH_METRICS.filter(m => m.core).map(m => m.key);

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadHealth() {
  try {
    const raw = localStorage.getItem(HEALTH_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      o.days = o.days || {};
      if (!o.cycle_length) o.cycle_length = 28;
      if (!("period_start" in o)) o.period_start = null;
      return o;
    }
  } catch (e) { /* private mode / corrupt — fall through */ }
  return { period_start: null, cycle_length: 28, days: {} };
}

function saveHealth(o) {
  try { localStorage.setItem(HEALTH_STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent("healthchange"));
}

function getHealthDay(dateKey) {
  return loadHealth().days[dateKey || _todayKey()] || {};
}

// edits: { metricKey: number|null }. null/""/undefined removes the field.
function setHealthDay(edits, dateKey) {
  const o = loadHealth();
  const k = dateKey || _todayKey();
  const cur = { ...(o.days[k] || {}) };
  for (const [field, val] of Object.entries(edits)) {
    if (val === null || val === "" || val === undefined || Number.isNaN(val)) delete cur[field];
    else cur[field] = val;
  }
  o.days[k] = cur;
  saveHealth(o);
}

function getPeriodStart() { return loadHealth().period_start; }
function setPeriodStart(dateStr) {
  const o = loadHealth();
  o.period_start = dateStr || null;
  saveHealth(o);
}

// Derive the current cycle phase from period_start. Boundaries match
// utils/cycle_utils.py: menstrual 1-5, follicular 6-13, ovulatory 14-17, luteal 18+.
// Returns the matching CYCLE_PHASES object with the real `day` + a `set` flag.
function deriveCycle() {
  const o = loadHealth();
  const start = o.period_start;
  const phases = window.CYCLE_PHASES || [];
  const byId = (id) => phases.find(p => p.id === id) || {};
  if (!start) return { ...byId("follicular"), day: null, set: false };

  const ms = Date.parse(start + "T00:00:00");
  if (Number.isNaN(ms)) return { ...byId("follicular"), day: null, set: false };

  const len = o.cycle_length || 28;
  let diff = Math.floor((Date.now() - ms) / 86400000);
  let day = (((diff % len) + len) % len) + 1;   // recurring 1..len, robust to future dates

  let id;
  if (day <= 5) id = "menstrual";
  else if (day <= 13) id = "follicular";
  else if (day <= 17) id = "ovulatory";
  else id = "luteal";
  return { ...byId(id), day, set: true };
}

// Real-clock day state (replaces the old manual "Time of day" setting).
function currentDayState() {
  const h = new Date().getHours();
  if (h >= 6 && h < 9) return "morning";
  if (h >= 9 && h < 13) return "work";
  if (h >= 13 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "winddown";
}

// Re-render hook: bump a counter whenever the store changes.
function useHealthVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("healthchange", h);
    return () => window.removeEventListener("healthchange", h);
  }, []);
  return v;
}

function openHealthForm() { window.dispatchEvent(new Event("arc-open-health-form")); }

function _fmtMetric(key, val) {
  if (val == null) return "—";
  if (key === "steps") return Number(val).toLocaleString();
  if (key === "sleep_duration" || key === "stand_hours") return `${val}`;
  return `${val}`;
}

// ── HealthLogForm ────────────────────────────────────────────────────────────
// inline=false → rendered inside the App-level modal overlay (opened from Today).
// inline=true  → embedded directly in Health → Data.
function HealthLogForm({ inline = false, onClose }) {
  useHealthVersion();
  const seed = () => {
    const d = getHealthDay();
    const m = {};
    HEALTH_METRICS.forEach(x => { m[x.key] = d[x.key] != null ? String(d[x.key]) : ""; });
    return m;
  };
  const [vals, setVals] = React.useState(seed);
  const [ps, setPs] = React.useState(getPeriodStart() || "");
  const [showMore, setShowMore] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const set = (k, v) => { setVals(o => ({ ...o, [k]: v })); setSaved(false); };

  // Sleep hrs + mins split state (derived from vals.sleep_duration on init)
  const _initSleep = () => {
    const raw = parseFloat(seed().sleep_duration);
    if (isNaN(raw)) return { h: "", m: "" };
    return { h: String(Math.floor(raw)), m: String(Math.round((raw % 1) * 60)) };
  };
  const [sleepHM, setSleepHM] = React.useState(_initSleep);
  const setSleepField = (field, val) => {
    const next = { ...sleepHM, [field]: val };
    setSleepHM(next);
    const h = parseInt(next.h) || 0;
    const m = parseInt(next.m) || 0;
    const combined = h + m / 60;
    set("sleep_duration", combined > 0 ? combined.toFixed(2) : "");
  };

  const save = () => {
    const edits = {};
    HEALTH_METRICS.forEach(x => {
      const raw = vals[x.key];
      edits[x.key] = raw === "" ? null : Number(raw);
    });
    setHealthDay(edits);
    setPeriodStart(ps || null);
    setSaved(true);
    if (!inline && onClose) onClose();
  };

  const field = (m) => {
    if (m.key === "sleep_duration") {
      return (
        <div key={m.key} className="hl-field">
          <span className="hl-lbl">Sleep</span>
          <div className="hl-sleep-split">
            <input className="hl-input hl-sleep-h" type="number" inputMode="numeric"
              min="0" max="16" step="1" placeholder="h"
              value={sleepHM.h} onChange={e => setSleepField("h", e.target.value)} />
            <span className="hl-sleep-sep">h</span>
            <input className="hl-input hl-sleep-m" type="number" inputMode="numeric"
              min="0" max="59" step="5" placeholder="m"
              value={sleepHM.m} onChange={e => setSleepField("m", e.target.value)} />
            <span className="hl-sleep-sep">min</span>
          </div>
        </div>
      );
    }
    return (
      <label key={m.key} className="hl-field">
        <span className="hl-lbl">{m.label}{m.unit && <em> · {m.unit}</em>}</span>
        <input
          className="hl-input" type="number" inputMode="decimal"
          step={m.step} min="0" max={m.max} placeholder="—"
          value={vals[m.key]} onChange={(e) => set(m.key, e.target.value)}
        />
      </label>
    );
  };

  const cyc = deriveCycle();
  return (
    <div className={inline ? "hl-form hl-inline" : "hl-form"}>
      <div className="hl-head">
        <div className="hl-title">Log today</div>
        {!inline && <button className="hl-x" aria-label="Close" onClick={onClose}>✕</button>}
      </div>

      <div className="hl-grid">
        {HEALTH_METRICS.filter(m => m.core).map(field)}
      </div>

      <button type="button" className="hl-more" onClick={() => setShowMore(s => !s)}>
        {showMore ? "− Fewer" : "+ More (sleep stages, calories, stand)"}
      </button>
      {showMore && (
        <div className="hl-grid">
          {HEALTH_METRICS.filter(m => !m.core).map(field)}
        </div>
      )}

      <div className="hl-cycle">
        <label className="hl-field">
          <span className="hl-lbl">Period start <em>· sets cycle phase</em></span>
          <input className="hl-input" type="date" value={ps}
                 onChange={(e) => { setPs(e.target.value); setSaved(false); }} />
        </label>
        <div className="hl-cyclenote">
          {ps ? <>Cycle: <strong>{cyc.set ? `${cyc.label} · day ${cyc.day}` : "—"}</strong></>
              : "Set once — phase updates automatically each day."}
        </div>
      </div>

      <div className="hl-actions">
        <button className="btn-action" onClick={save}>{saved ? "Saved ✓" : "Save"}</button>
        {inline
          ? <span className="hl-hint">Stored on this device. Blank = skip.</span>
          : <button className="btn-action ghost" onClick={onClose}>Cancel</button>}
      </div>
    </div>
  );
}

// ── LogTodayCard ─────────────────────────────────────────────────────────────
// Compact prompt for the Today tab. Shows a summary or a nudge to log.
function LogTodayCard() {
  useHealthVersion();
  const d = getHealthDay();
  const logged = HEALTH_CORE.some(k => d[k] != null);
  const summary = logged
    ? [
        d.sleep_duration != null ? `${d.sleep_duration}h sleep` : null,
        d.hrv != null ? `HRV ${d.hrv}` : null,
        d.resting_hr != null ? `RHR ${d.resting_hr}` : null,
        d.steps != null ? `${Number(d.steps).toLocaleString()} steps` : null,
      ].filter(Boolean).join(" · ")
    : "Not logged yet — tap to add sleep, HRV, steps…";

  return (
    <section className="card logcard" aria-label="Log today's health">
      <button className="logcard-btn" onClick={openHealthForm}>
        <span className="logcard-ico" aria-hidden="true">✎</span>
        <span className="logcard-body">
          <span className="logcard-ttl">Today's health {logged && <span className="logcard-ok">logged</span>}</span>
          <span className="logcard-sum">{summary}</span>
        </span>
        <span className="logcard-add" aria-hidden="true">{logged ? "Edit" : "+"}</span>
      </button>
    </section>
  );
}

Object.assign(window, {
  HEALTH_METRICS, HEALTH_CORE,
  loadHealth, getHealthDay, setHealthDay, getPeriodStart, setPeriodStart,
  deriveCycle, currentDayState, useHealthVersion, openHealthForm,
  HealthLogForm, LogTodayCard,
});
