/* skincare-store.jsx — localStorage skin/body/hair-care cupboard
 * key: arc-skincare-v1   shape: { products: [] }
 * Replaces the old Notion Care DB + the hardcoded PersonalCareCupboard sample.
 * Loaded before tabs.jsx / phase4-components.jsx; registers helpers on window.
 *
 * Product shape:
 *   { id, name, brand, category, timing, opened, paoMonths, labelExpiry,
 *     expiry (computed), phases:[], medicated, rating, price, volume, notes, status }
 */

const SKINCARE_STORE_KEY = "arc-skincare-v1";

// Routine sequence: lower number = applied earlier. Used to order AM/PM routines.
const SKINCARE_CATEGORIES = [
  "cleanser", "toner", "essence", "serum", "treatment", "eye",
  "moisturiser", "oil", "spf", "mask", "body", "hair", "dental", "other",
];
const _CAT_ORDER = SKINCARE_CATEGORIES.reduce((m, c, i) => { m[c] = i; return m; }, {});

function _scToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Effective expiry = earlier of label expiry and (opened + PAO months). ISO string or null.
function _effectiveExpiry(labelExpiry, opened, paoMonths) {
  const dates = [];
  if (labelExpiry) { const t = Date.parse(labelExpiry + "T00:00:00"); if (!Number.isNaN(t)) dates.push(t); }
  if (opened && paoMonths) {
    const t = Date.parse(opened + "T00:00:00");
    if (!Number.isNaN(t)) { const d = new Date(t); d.setMonth(d.getMonth() + Number(paoMonths)); dates.push(d.getTime()); }
  }
  if (!dates.length) return null;
  const d = new Date(Math.min(...dates));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function _expiryFlag(expiry) {
  if (!expiry) return "unknown";
  const t = Date.parse(expiry + "T00:00:00");
  if (Number.isNaN(t)) return "unknown";
  const days = Math.floor((t - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "expires_soon";
  if (days <= 90) return "expires_3mo";
  return "ok";
}

function loadSkincare() {
  try {
    const raw = localStorage.getItem(SKINCARE_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { products: Array.isArray(o.products) ? o.products : [] }; }
  } catch (e) { /* private mode / corrupt */ }
  return { products: [] };
}

function saveSkincare(o) {
  try { localStorage.setItem(SKINCARE_STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent("skincarechange"));
}

function addSkincareProduct(p) {
  const o = loadSkincare();
  o.products.push({
    category: "serum", timing: "Both", status: "Active", phases: [], medicated: false,
    ...p,
    id: String(Date.now() + Math.random()),
  });
  saveSkincare(o);
}

function updateSkincareProduct(id, edits) {
  const o = loadSkincare();
  o.products = o.products.map(p => p.id === id ? { ...p, ...edits } : p);
  saveSkincare(o);
}

function deleteSkincareProduct(id) {
  const o = loadSkincare();
  o.products = o.products.filter(p => p.id !== id);
  saveSkincare(o);
}

// Returns products with computed expiry + flag, sorted by urgency then category order.
function getSkincareProducts() {
  return loadSkincare().products.map(p => {
    const expiry = p.expiry || _effectiveExpiry(p.labelExpiry, p.opened, p.paoMonths);
    const expiry_flag = _expiryFlag(expiry);
    let days_left = null;
    if (expiry) { const t = Date.parse(expiry + "T00:00:00"); if (!Number.isNaN(t)) days_left = Math.floor((t - Date.now()) / 86400000); }
    return { ...p, expiry, expiry_flag, days_left };
  }).sort((a, b) => {
    const ao = _CAT_ORDER[a.category] ?? 99, bo = _CAT_ORDER[b.category] ?? 99;
    return ao - bo;
  });
}

// Ordered routine for "AM" or "PM": products whose timing matches (or "Both"),
// sorted by application sequence. Excludes Empty/Considering.
// Phase-aware: products with a non-empty phases[] are only included if the current
// cycle phase matches — intelligence stays here, not in the planner.
function getRoutine(amPm) {
  const want = amPm === "AM" ? ["AM", "Both"] : ["PM", "Both"];
  const phase = (typeof deriveCycle === "function" ? (deriveCycle()?.label || "") : "").toLowerCase();
  return getSkincareProducts()
    .filter(p => {
      if (!want.includes(p.timing) || !(p.status === "Active" || p.status === "Low")) return false;
      if (!p.phases || p.phases.length === 0) return true; // no phase restriction
      return p.phases.some(ph => {
        const s = String(ph).toLowerCase();
        return s === "any" || s === phase;
      });
    })
    .sort((a, b) => (_CAT_ORDER[a.category] ?? 99) - (_CAT_ORDER[b.category] ?? 99));
}

// Products expiring soon or expired (for repurchase / flags).
function getExpiringSkincare() {
  return getSkincareProducts().filter(p => p.expiry_flag === "expired" || p.expiry_flag === "expires_soon");
}

// Compact text summary for injecting into Cara's chat as client_context.
function skincareContextText() {
  const prods = getSkincareProducts().filter(p => p.status === "Active" || p.status === "Low");
  if (!prods.length) return "Skincare shelf is empty.";
  return prods.map(p => {
    const flag = (p.expiry_flag === "expired" || p.expiry_flag === "expires_soon") ? ` [${p.expiry_flag.replace("_", " ")}]` : "";
    const phases = (p.phases && p.phases.length) ? ` {${p.phases.join("/")}}` : "";
    return `${p.name}${p.brand ? " (" + p.brand + ")" : ""} — ${p.category}, ${p.timing}${p.medicated ? ", medicated" : ""}${phases}${flag}`;
  }).join("; ");
}

function useSkincareVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("skincarechange", h);
    return () => window.removeEventListener("skincarechange", h);
  }, []);
  return v;
}

Object.assign(window, {
  SKINCARE_CATEGORIES,
  loadSkincare, saveSkincare, addSkincareProduct, updateSkincareProduct, deleteSkincareProduct,
  getSkincareProducts, getRoutine, getExpiringSkincare, skincareContextText, useSkincareVersion,
});
