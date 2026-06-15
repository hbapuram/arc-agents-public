/* pantry-store.jsx — localStorage-backed pantry (replaces Notion API)
 * key: arc-pantry-v1  shape: { items: [] }
 * Loaded before tabs.jsx; registers helpers on window.
 */

const PANTRY_STORE_KEY = "arc-pantry-v1";

function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function loadPantry() {
  try {
    const raw = localStorage.getItem(PANTRY_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { items: Array.isArray(o.items) ? o.items : [] };
    }
  } catch (e) { /* private mode / corrupt */ }
  return { items: [] };
}

function savePantry(o) {
  try { localStorage.setItem(PANTRY_STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent("pantrychange"));
}

// items: array of { name, category, quantity, unit, status, expiry?, protein?, calories?, carbs?, fat?, notes? }
function addPantryItems(items) {
  const o = loadPantry();
  const now = Date.now();
  items.forEach((item, i) => {
    o.items.push({
      ...item,
      id: String(now + i + Math.random()),
      quantity: Number(item.quantity) || 0,
    });
  });
  savePantry(o);
}

function updatePantryItem(id, edits) {
  const o = loadPantry();
  o.items = o.items.map(it => it.id === id ? { ...it, ...edits } : it);
  savePantry(o);
}

function deletePantryItem(id) {
  const o = loadPantry();
  o.items = o.items.filter(it => it.id !== id);
  savePantry(o);
}

// Returns items with computed expiry_flag
function getPantryItems() {
  const today = _todayStr();
  return loadPantry().items.map(it => {
    let expiry_flag = null;
    if (it.expiry) {
      const diff = Math.floor((new Date(it.expiry) - new Date(today)) / 86400000);
      if (diff < 0) expiry_flag = "expired";
      else if (diff <= 5) expiry_flag = "expires_soon";
    }
    return { ...it, expiry_flag };
  });
}

// Status cycle: In Stock → Low → Out → In Stock
function cyclePantryStatus(id) {
  const cycle = ["In Stock", "Low", "Out"];
  const o = loadPantry();
  const item = o.items.find(it => it.id === id);
  if (!item) return;
  const next = cycle[(cycle.indexOf(item.status) + 1) % cycle.length];
  updatePantryItem(id, { status: next });
}

function usePantryVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("pantrychange", h);
    return () => window.removeEventListener("pantrychange", h);
  }, []);
  return v;
}

Object.assign(window, {
  loadPantry, savePantry, addPantryItems, updatePantryItem, deletePantryItem,
  getPantryItems, cyclePantryStatus, usePantryVersion,
});
