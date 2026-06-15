/* shop-store.jsx — shopping preferences & store ratings
 * key: arc-shops-v1
 * shape: { preferences: { [normalizedName]: { preferred, notes, history, displayName } } }
 */

const SHOP_STORE_KEY = "arc-shops-v1";
const INTEL_KEY = "arc-ingredient-ratings-v1";
const KNOWN_STORES = ["Lidl", "Tesco", "SuperValu", "Dunnes Stores", "Aldi", "M&S", "Other"];

function _shopNorm(item) {
  return String(item).toLowerCase().trim().replace(/\s+/g, " ");
}

function loadShops() {
  try {
    const raw = localStorage.getItem(SHOP_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { preferences: (o && o.preferences) ? o.preferences : {} }; }
  } catch (e) {}
  return { preferences: {} };
}

function saveShops(o) {
  try { localStorage.setItem(SHOP_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("shopschange"));
}

function addShopRating(itemName, store, rating, note) {
  const key = _shopNorm(itemName);
  const today = new Date().toISOString().slice(0, 10);
  const o = loadShops();
  const prev = o.preferences[key] || { preferred: null, notes: "", history: [] };
  const history = [
    { store, rating: Number(rating) || 3, note: note || "", date: today },
    ...(prev.history || []),
  ].slice(0, 10);
  const totals = {}; const counts = {};
  history.forEach(h => {
    totals[h.store] = (totals[h.store] || 0) + h.rating;
    counts[h.store] = (counts[h.store] || 0) + 1;
  });
  const preferred = Object.keys(totals)
    .sort((a, b) => (totals[b] / counts[b]) - (totals[a] / counts[a]))[0] || store;
  o.preferences[key] = { preferred, notes: note || prev.notes || "", history, displayName: itemName };
  saveShops(o);
}

function getShopPref(itemName) {
  return loadShops().preferences[_shopNorm(itemName)] || null;
}

function getAllPrefs() {
  return loadShops().preferences;
}

function deleteShopPref(itemName) {
  const o = loadShops();
  delete o.preferences[_shopNorm(itemName)];
  saveShops(o);
}

function shopContextText() {
  const entries = Object.values(getAllPrefs());
  if (!entries.length) return "No shopping preferences logged yet.";
  return "SHOPPING PREFERENCES:\n" + entries.map(p => {
    const recent = (p.history || []).slice(0, 3).map(h => `${h.store} ${h.rating}/5`).join(", ");
    return `${p.displayName || "?"}: prefer ${p.preferred}${p.notes ? ` — ${p.notes}` : ""}${recent ? ` (${recent})` : ""}`;
  }).join("\n");
}

// ── Ingredient intelligence store (arc-ingredient-ratings-v1) ────────────────
function _todayKeyShop() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function loadIntel() {
  try { const r = localStorage.getItem(INTEL_KEY); if (r) return JSON.parse(r); } catch (e) {}
  return { entries: [] };
}

function saveIntel(o) {
  try { localStorage.setItem(INTEL_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("shopschange"));
}

function addIngredientEntry({ name, store, price_eur, quantity, unit, quality, taste, packaging, phase }) {
  const o = loadIntel();
  o.entries.unshift({
    id: Date.now().toString(36),
    name: String(name).toLowerCase().trim(),
    store: store || "",
    price_eur: price_eur != null ? Number(price_eur) : null,
    quantity: quantity || "",
    unit: unit || "",
    date: _todayKeyShop(),
    phase: phase || "",
    quality: quality != null ? Number(quality) : null,
    taste: taste != null ? Number(taste) : null,
    packaging: packaging != null ? Number(packaging) : null,
  });
  if (o.entries.length > 500) o.entries = o.entries.slice(0, 500);
  saveIntel(o);
}

function getIngredientHistory(name) {
  const n = String(name).toLowerCase().trim();
  return loadIntel().entries.filter(e => e.name.includes(n) || n.includes(e.name));
}

function getIntelligenceSummary() {
  const entries = loadIntel().entries;
  const byKey = {};
  entries.forEach(e => {
    const key = `${e.name}__${e.store}`;
    if (!byKey[key]) byKey[key] = { name: e.name, store: e.store, prices: [], quality: [], taste: [], packaging: [], count: 0 };
    byKey[key].count++;
    if (e.price_eur != null) byKey[key].prices.push(e.price_eur);
    if (e.quality != null)   byKey[key].quality.push(e.quality);
    if (e.taste != null)     byKey[key].taste.push(e.taste);
    if (e.packaging != null) byKey[key].packaging.push(e.packaging);
  });
  const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  return Object.values(byKey).map(g => ({
    name: g.name, store: g.store, count: g.count,
    avg_price: avg(g.prices) != null ? Number(avg(g.prices).toFixed(2)) : null,
    avg_quality: avg(g.quality) != null ? Number(avg(g.quality).toFixed(1)) : null,
    avg_taste: avg(g.taste) != null ? Number(avg(g.taste).toFixed(1)) : null,
    avg_packaging: avg(g.packaging) != null ? Number(avg(g.packaging).toFixed(1)) : null,
  }));
}

function intelligenceContextText() {
  const summary = getIntelligenceSummary();
  if (!summary.length) return "No ingredient intelligence yet.";
  return "INGREDIENT INTELLIGENCE (price + quality by store in Ireland):\n" +
    summary.map(s => {
      const parts = [];
      if (s.avg_price != null) parts.push(`€${s.avg_price}`);
      if (s.avg_quality != null) parts.push(`quality ${s.avg_quality}/5`);
      if (s.avg_taste != null) parts.push(`taste ${s.avg_taste}/5`);
      return `${s.name} @ ${s.store}: ${parts.join(", ")} (${s.count} log${s.count!==1?"s":""})`;
    }).join("\n");
}

function useShopsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("shopschange", h);
    return () => window.removeEventListener("shopschange", h);
  }, []);
  return v;
}

// Small inline store badge
function StoreBadge({ itemName }) {
  useShopsVersion();
  const pref = getShopPref(itemName);
  if (!pref || !pref.preferred) return null;
  return (
    <span className="shop-badge" title={pref.notes || `Preferred: ${pref.preferred}`}>
      {pref.preferred}
    </span>
  );
}

// Inline rating widget
function ShopRater({ itemName, onDone }) {
  const [store,  setStore]  = React.useState(KNOWN_STORES[0]);
  const [rating, setRating] = React.useState(3);
  const [note,   setNote]   = React.useState("");
  const save = () => { addShopRating(itemName, store, rating, note); onDone(); };
  return (
    <div className="shop-rater">
      <div className="shop-rater-label">Rate <strong>{itemName}</strong></div>
      <div className="shop-rater-row">
        <select className="shop-rater-sel" value={store} onChange={e => setStore(e.target.value)}>
          {KNOWN_STORES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="shop-rater-stars">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`star-btn${rating >= n ? " on" : ""}`} onClick={() => setRating(n)} type="button">★</button>
          ))}
        </div>
      </div>
      <input className="shop-rater-note" value={note} onChange={e => setNote(e.target.value)}
        placeholder="e.g. stays fresh longer, cheaper here…" />
      <div className="shop-rater-actions">
        <button className="btn-action" style={{ fontSize: 11, padding: "5px 12px" }} onClick={save}>Save rating</button>
        <button className="btn-action ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={onDone}>Skip</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  SHOP_STORE_KEY, KNOWN_STORES, INTEL_KEY,
  loadShops, saveShops, addShopRating, getShopPref, getAllPrefs, deleteShopPref,
  shopContextText, useShopsVersion, StoreBadge, ShopRater,
  loadIntel, addIngredientEntry, getIngredientHistory, getIntelligenceSummary, intelligenceContextText,
});
