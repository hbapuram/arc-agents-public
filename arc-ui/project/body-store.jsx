/* body-store.jsx — optional, no-pressure body tracking (weight + measurements).
 * key: arc-body-v1   shape: { entries: { "YYYY-MM-DD": { weight, waist, ... } } }
 *
 * Kept separate from the daily health log (arc-health-v1) so it's clearly opt-in
 * and easy to ignore. One record per date; setBodyEntry upserts (like setHealthDay).
 * Loaded before tabs.jsx; registers helpers (+ bodyContextText) on window.
 */

const BODY_STORE_KEY = "arc-body-v1";

// First (weight) is the headline metric; measurements are all optional.
const BODY_METRICS = [
  { key: "weight", label: "Weight", unit: "kg", step: 0.1, max: 400, primary: true },
  { key: "waist",  label: "Waist",  unit: "cm", step: 0.5, max: 250 },
  { key: "hip",    label: "Hip",    unit: "cm", step: 0.5, max: 250 },
  { key: "chest",  label: "Chest",  unit: "cm", step: 0.5, max: 250 },
  { key: "arm",    label: "Arm",    unit: "cm", step: 0.5, max: 100 },
  { key: "thigh",  label: "Thigh",  unit: "cm", step: 0.5, max: 150 },
];

function _bodyToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadBody() {
  try {
    const raw = localStorage.getItem(BODY_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { entries: o.entries || {} }; }
  } catch (e) { /* private mode / corrupt */ }
  return { entries: {} };
}

function saveBody(o) {
  try { localStorage.setItem(BODY_STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent("bodychange"));
}

function getBodyDay(dateKey) {
  return loadBody().entries[dateKey || _bodyToday()] || {};
}

// edits: { metricKey: number|null }. null/""/undefined removes the field; an
// entry with no remaining fields is dropped entirely.
function setBodyEntry(edits, dateKey) {
  const o = loadBody();
  const k = dateKey || _bodyToday();
  const cur = { ...(o.entries[k] || {}) };
  for (const [field, val] of Object.entries(edits)) {
    if (val === null || val === "" || val === undefined || Number.isNaN(val)) delete cur[field];
    else cur[field] = Number(val);
  }
  if (Object.keys(cur).length === 0) delete o.entries[k];
  else o.entries[k] = cur;
  saveBody(o);
}

function deleteBodyEntry(dateKey) {
  const o = loadBody();
  delete o.entries[dateKey];
  saveBody(o);
}

// Newest first: [{ date, ...metrics }]
function getBodyEntries() {
  const { entries } = loadBody();
  return Object.keys(entries)
    .sort((a, b) => (a < b ? 1 : -1))
    .map(date => ({ date, ...entries[date] }));
}

function getLatestBody() {
  return getBodyEntries()[0] || null;
}

// Trend for one metric, oldest → newest, with the net delta. null if <1 reading.
function getBodyTrend(metric) {
  const series = getBodyEntries()
    .filter(e => e[metric] != null)
    .map(e => ({ date: e.date, value: e[metric] }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!series.length) return null;
  const delta = series.length > 1 ? Math.round((series[series.length - 1].value - series[0].value) * 10) / 10 : 0;
  return { series, delta, first: series[0], last: series[series.length - 1] };
}

// Compact summary for agent chats.
function bodyContextText() {
  const latest = getLatestBody();
  if (!latest) return "No body measurements logged.";
  const parts = BODY_METRICS
    .filter(m => latest[m.key] != null)
    .map(m => `${m.label} ${latest[m.key]}${m.unit}`);
  return `Latest (${latest.date}): ${parts.join(", ")}`;
}

function useBodyVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("bodychange", h);
    return () => window.removeEventListener("bodychange", h);
  }, []);
  return v;
}

Object.assign(window, {
  BODY_METRICS,
  loadBody, saveBody, getBodyDay, setBodyEntry, deleteBodyEntry,
  getBodyEntries, getLatestBody, getBodyTrend, bodyContextText, useBodyVersion,
});
