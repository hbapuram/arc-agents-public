/* bloodtest-store.jsx — blood marker readings with reference ranges + trends.
 * key: arc-bloodtests-v1   shape: { readings: [] }
 *
 * Reading shape:
 *   { id, marker, value (number), unit, date (YYYY-MM-DD), low|null, high|null, notes }
 *
 * Loaded before tabs.jsx; registers helpers (+ bloodTestContextText) on window.
 * Follows the schedule-store store pattern.
 */

const BLOODTESTS_STORE_KEY = "arc-bloodtests-v1";

// Common markers the user tracks, with default unit + reference range. Used to
// prefill the add form and to flag low/normal/high. Ranges are general adult
// female references — editable per reading.
const BLOODTEST_MARKERS = [
  { marker: "Iron",        unit: "µmol/L", low: 10,   high: 30   },
  { marker: "Ferritin",    unit: "ng/mL",  low: 30,   high: 200  },
  { marker: "Vitamin B12", unit: "pg/mL",  low: 200,  high: 900  },
  { marker: "Vitamin D3",  unit: "ng/mL",  low: 30,   high: 100  },
  { marker: "TSH",         unit: "mIU/L",  low: 0.4,  high: 4.0  },
  { marker: "Glucose",     unit: "mg/dL",  low: 70,   high: 99   },
  { marker: "Hemoglobin",  unit: "g/dL",   low: 12,   high: 15.5 },
];

const _MARKER_DEFAULTS = BLOODTEST_MARKERS.reduce((m, x) => { m[x.marker.toLowerCase()] = x; return m; }, {});

function loadBloodTests() {
  try {
    const raw = localStorage.getItem(BLOODTESTS_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { readings: Array.isArray(o.readings) ? o.readings : [] }; }
  } catch (e) { /* private mode / corrupt */ }
  return { readings: [] };
}

function saveBloodTests(o) {
  try { localStorage.setItem(BLOODTESTS_STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent("bloodtestschange"));
}

// Fills unit + reference range from BLOODTEST_MARKERS when omitted.
function addBloodTest(r) {
  const o = loadBloodTests();
  const def = _MARKER_DEFAULTS[String(r.marker || "").toLowerCase()] || {};
  o.readings.push({
    date: new Date().toISOString().slice(0, 10),
    unit: r.unit || def.unit || "",
    low: r.low != null ? r.low : (def.low != null ? def.low : null),
    high: r.high != null ? r.high : (def.high != null ? def.high : null),
    ...r,
    value: Number(r.value),
    id: String(Date.now() + Math.random()),
  });
  saveBloodTests(o);
}

function updateBloodTest(id, edits) {
  const o = loadBloodTests();
  o.readings = o.readings.map(r => r.id === id ? { ...r, ...edits } : r);
  saveBloodTests(o);
}

function deleteBloodTest(id) {
  const o = loadBloodTests();
  o.readings = o.readings.filter(r => r.id !== id);
  saveBloodTests(o);
}

function _statusFor(value, low, high) {
  if (value == null) return "unknown";
  if (low != null && value < low) return "low";
  if (high != null && value > high) return "high";
  return "normal";
}

// All readings for one marker, oldest → newest.
function getMarkerHistory(marker) {
  const m = String(marker || "").toLowerCase();
  return loadBloodTests().readings
    .filter(r => String(r.marker || "").toLowerCase() === m)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// One row per marker: latest value, status vs range, and trend vs the previous
// reading ("up" / "down" / "flat" / null when only one reading exists).
function getLatestByMarker() {
  const byMarker = {};
  loadBloodTests().readings.forEach(r => {
    const key = r.marker;
    (byMarker[key] = byMarker[key] || []).push(r);
  });
  return Object.entries(byMarker).map(([marker, list]) => {
    const sorted = list.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const latest = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    let trend = null;
    if (prev) {
      if (latest.value > prev.value) trend = "up";
      else if (latest.value < prev.value) trend = "down";
      else trend = "flat";
    }
    return {
      ...latest,
      status: _statusFor(latest.value, latest.low, latest.high),
      trend,
      prevValue: prev ? prev.value : null,
      count: sorted.length,
    };
  }).sort((a, b) => a.marker.localeCompare(b.marker));
}

// Compact summary for injecting into Felix / Eve chats as client_context.
function bloodTestContextText() {
  const rows = getLatestByMarker();
  if (!rows.length) return "No blood test results logged.";
  return rows.map(r => {
    const flag = r.status === "low" ? " (LOW)" : r.status === "high" ? " (HIGH)" : "";
    return `${r.marker}: ${r.value}${r.unit ? " " + r.unit : ""}${flag} [${r.date}]`;
  }).join("; ");
}

function useBloodTestsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("bloodtestschange", h);
    return () => window.removeEventListener("bloodtestschange", h);
  }, []);
  return v;
}

Object.assign(window, {
  BLOODTEST_MARKERS,
  loadBloodTests, saveBloodTests, addBloodTest, updateBloodTest, deleteBloodTest,
  getMarkerHistory, getLatestByMarker, bloodTestContextText, useBloodTestsVersion,
});
