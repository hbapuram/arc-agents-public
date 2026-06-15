/* symptoms-store.jsx — daily symptom log (severity 1-3), tagged to the cycle day.
 * key: arc-symptoms-v1   shape: { entries: [] }
 *
 * Entry shape:
 *   { id, date (YYYY-MM-DD), symptom, severity (1-3), cycleDay|null, phase|null, notes }
 *
 * Loaded before tabs.jsx; registers helpers (+ symptomsContextText for Flora/Eve
 * chats) on window. Follows the schedule-store store pattern.
 */

const SYMPTOMS_STORE_KEY = "arc-symptoms-v1";

// Common cycle-aware symptoms offered in the quick logger (free text also allowed).
const SYMPTOM_TYPES = [
  "cramps", "bloating", "fatigue", "low mood", "anxiety", "headache",
  "acne", "breast tenderness", "cravings", "insomnia", "back pain", "nausea",
];

// 1 = mild, 2 = moderate, 3 = severe.
const SYMPTOM_SEVERITY = [
  { value: 1, label: "Mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
];

function _symToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadSymptoms() {
  try {
    const raw = localStorage.getItem(SYMPTOMS_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { entries: Array.isArray(o.entries) ? o.entries : [] }; }
  } catch (e) { /* private mode / corrupt */ }
  return { entries: [] };
}

function saveSymptoms(o) {
  try { localStorage.setItem(SYMPTOMS_STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent("symptomschange"));
}

// Log a symptom. Captures the current cycle day/phase automatically when available.
function logSymptom(entry) {
  const o = loadSymptoms();
  const cyc = (typeof deriveCycle === "function") ? deriveCycle() : {};
  o.entries.push({
    date: _symToday(),
    severity: 2,
    cycleDay: cyc.day != null ? cyc.day : null,
    phase: cyc.label || null,
    ...entry,
    id: String(Date.now() + Math.random()),
  });
  saveSymptoms(o);
}

function updateSymptom(id, edits) {
  const o = loadSymptoms();
  o.entries = o.entries.map(e => e.id === id ? { ...e, ...edits } : e);
  saveSymptoms(o);
}

function deleteSymptom(id) {
  const o = loadSymptoms();
  o.entries = o.entries.filter(e => e.id !== id);
  saveSymptoms(o);
}

function getSymptomsForDate(dateKey) {
  const k = dateKey || _symToday();
  return loadSymptoms().entries.filter(e => e.date === k);
}

// Most recent entries first, optionally limited to the last `days` days.
function getRecentSymptoms(days) {
  const entries = loadSymptoms().entries.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!days) return entries;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const cut = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return entries.filter(e => e.date >= cut);
}

// Compact text summary for injecting into Flora / Eve chats as client_context.
function symptomsContextText() {
  const recent = getRecentSymptoms(7);
  if (!recent.length) return "No symptoms logged in the last 7 days.";
  const sevWord = { 1: "mild", 2: "moderate", 3: "severe" };
  return recent.slice(0, 12).map(e => {
    const day = e.cycleDay != null ? ` (cycle day ${e.cycleDay})` : "";
    return `${e.date}: ${e.symptom} — ${sevWord[e.severity] || e.severity}${day}`;
  }).join("; ");
}

function useSymptomsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("symptomschange", h);
    return () => window.removeEventListener("symptomschange", h);
  }, []);
  return v;
}

Object.assign(window, {
  SYMPTOM_TYPES, SYMPTOM_SEVERITY,
  loadSymptoms, saveSymptoms, logSymptom, updateSymptom, deleteSymptom,
  getSymptomsForDate, getRecentSymptoms, symptomsContextText, useSymptomsVersion,
});
