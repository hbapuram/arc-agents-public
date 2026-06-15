/* water-store.jsx — daily water / hydration tracker
 * localStorage key: arc-water-v1
 * Loaded after shop-store.jsx, before arc-context.jsx
 */

const WATER_STORE_KEY = "arc-water-v1";
const WATER_GOAL_ML   = 2000;

function _waterDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function loadWater() {
  try {
    const raw = localStorage.getItem(WATER_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { days: o.days || {}, defaultBottleMl: o.defaultBottleMl || 500 };
    }
  } catch (e) {}
  return { days: {}, defaultBottleMl: 500 };
}

function saveWater(o) {
  try { localStorage.setItem(WATER_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("waterchange"));
}

function logWaterMl(ml, label) {
  const amount = Math.round(Number(ml));
  if (!amount || amount <= 0) return;
  const o   = loadWater();
  const key = _waterDateStr();
  if (!o.days[key]) o.days[key] = { entries: [], totalMl: 0 };
  const now     = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  o.days[key].entries.push({ ml: amount, time: timeStr, label: label || `${amount}ml` });
  o.days[key].totalMl = (o.days[key].totalMl || 0) + amount;
  saveWater(o);
}

function undoLastWater() {
  const o   = loadWater();
  const key = _waterDateStr();
  const day = o.days[key];
  if (!day || !day.entries || day.entries.length === 0) return;
  const last = day.entries.pop();
  day.totalMl = Math.max(0, (day.totalMl || 0) - last.ml);
  saveWater(o);
}

function getTodayWaterMl() {
  const o = loadWater();
  const d = o.days[_waterDateStr()];
  return (d && d.totalMl) || 0;
}

function getTodayWaterEntries() {
  const o = loadWater();
  const d = o.days[_waterDateStr()];
  return (d && d.entries) || [];
}

function setDefaultBottleMl(ml) {
  const o = loadWater();
  o.defaultBottleMl = Math.round(Number(ml)) || 500;
  saveWater(o);
}

function getDefaultBottleMl() {
  return loadWater().defaultBottleMl || 500;
}

function getWaterHistory(n) {
  const o     = loadWater();
  const today = _waterDateStr();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - (n - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return {
      date:    key,
      label:   ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()],
      totalMl: (o.days[key] && o.days[key].totalMl) || 0,
    };
  });
}

function useWaterVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("waterchange", h);
    return () => window.removeEventListener("waterchange", h);
  }, []);
  return v;
}

Object.assign(window, {
  WATER_GOAL_ML,
  loadWater, saveWater, logWaterMl, undoLastWater,
  getTodayWaterMl, getTodayWaterEntries,
  setDefaultBottleMl, getDefaultBottleMl,
  getWaterHistory, useWaterVersion,
});
