/* grocery-store.jsx — grocery list store
 * key: arc-groceries-v1  shape: { items: [] }
 * Loaded before tabs.jsx; registers helpers on window.
 */

const GROCERY_STORE_KEY = "arc-groceries-v1";

// Returns the ISO date string of Monday of the current week
function currentWeekOf() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
}

// Returns the ISO date string of Monday for a given date string
function weekOfDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
}

function loadGroceries() {
  try {
    const raw = localStorage.getItem(GROCERY_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { items: Array.isArray(o.items) ? o.items : [] };
    }
  } catch (e) {}
  return { items: [] };
}

function saveGroceries(o) {
  try { localStorage.setItem(GROCERY_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("grocerieschange"));
}

function addGroceryItem(item) {
  const o = loadGroceries();
  o.items.push({
    qty: 1,
    unit: "pieces",
    category: "Other",
    checked: false,
    source: "manual",
    weekOf: currentWeekOf(),
    ...item,
    id: String(Date.now() + Math.random()),
  });
  saveGroceries(o);
}

function addGroceryItems(items) {
  const o = loadGroceries();
  const wk = currentWeekOf();
  items.forEach((item, i) => {
    o.items.push({
      qty: 1, unit: "pieces", category: "Other", checked: false,
      source: "manual", weekOf: wk,
      ...item,
      id: String(Date.now() + i + Math.random()),
    });
  });
  saveGroceries(o);
}

function updateGroceryItem(id, edits) {
  const o = loadGroceries();
  o.items = o.items.map(it => it.id === id ? { ...it, ...edits } : it);
  saveGroceries(o);
}

function deleteGroceryItem(id) {
  const o = loadGroceries();
  o.items = o.items.filter(it => it.id !== id);
  saveGroceries(o);
}

const PURCHASE_LOG_KEY = "arc-purchase-log-v1";

function _groceryToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function toggleGroceryItem(id, opts) {
  const { logPurchase = false, name = "", phase = "" } = opts || {};
  const o = loadGroceries();
  let isNowChecked = false;
  o.items = o.items.map(it => {
    if (it.id !== id) return it;
    isNowChecked = !it.checked;
    return { ...it, checked: isNowChecked };
  });
  saveGroceries(o);
  if (logPurchase && isNowChecked && name) {
    try {
      const log = JSON.parse(localStorage.getItem(PURCHASE_LOG_KEY) || '{"entries":[]}');
      log.entries.unshift({ name: name.toLowerCase(), date: _groceryToday(), phase, weekOf: currentWeekOf() });
      if (log.entries.length > 50) log.entries = log.entries.slice(0, 50);
      localStorage.setItem(PURCHASE_LOG_KEY, JSON.stringify(log));
    } catch (e) {}
  }
}

function getRecentPurchases(days) {
  const daysBack = days || 14;
  try {
    const log = JSON.parse(localStorage.getItem(PURCHASE_LOG_KEY) || '{"entries":[]}');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    return log.entries.filter(e => new Date(e.date + "T00:00:00") >= cutoff);
  } catch (e) { return []; }
}

function clearCheckedGroceries(weekOf) {
  const o = loadGroceries();
  o.items = o.items.filter(it => !(it.checked && it.weekOf === weekOf));
  saveGroceries(o);
}

function getGroceriesForWeek(weekOf) {
  return loadGroceries().items.filter(it => it.weekOf === weekOf);
}

function useGroceriesVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("grocerieschange", h);
    return () => window.removeEventListener("grocerieschange", h);
  }, []);
  return v;
}

Object.assign(window, {
  currentWeekOf, weekOfDate,
  loadGroceries, saveGroceries,
  addGroceryItem, addGroceryItems, updateGroceryItem, deleteGroceryItem,
  toggleGroceryItem, clearCheckedGroceries, getGroceriesForWeek,
  getRecentPurchases,
  useGroceriesVersion,
});
