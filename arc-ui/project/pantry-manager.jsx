/* Arc Agents — Pantry Manager (Quick Add + Receipt Scanner + List)
 * Rewired to use localStorage via pantry-store.jsx (no API calls except receipt parse).
 */

const { useState: _useState, useRef: _useRef } = React;

const PANTRY_CATEGORIES = ["Produce", "Protein", "Grains", "Dairy", "Condiments", "Snacks", "Beverages", "Frozen", "Flour", "Nuts/Seeds", "Oils", "Spices", "Other"];
const PANTRY_UNITS      = ["pieces", "pack", "g", "kg", "ml", "L", "loaf", "can", "jar", "cup", "tbsp", "slices", "bottle", "carton", "bunch", "piece"];
const PANTRY_STATUSES   = ["In Stock", "Low", "Out"];

/* ─── Quick Add Form ─── */
function QuickAddForm() {
  const [form, setForm] = _useState({ name: "", category: "Other", quantity: 1, unit: "pieces", status: "In Stock", expiry: "" });
  const [nutrition, setNutrition] = _useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [showNutrition, setShowNutrition] = _useState(false);
  const [msg, setMsg] = _useState(null);

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setN = (k, v) => setNutrition(n => ({ ...n, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const item = { ...form, quantity: Number(form.quantity) };
    if (!item.expiry) delete item.expiry;
    if (showNutrition) {
      if (nutrition.calories) item.calories = Number(nutrition.calories);
      if (nutrition.protein)  item.protein  = Number(nutrition.protein);
      if (nutrition.carbs)    item.carbs    = Number(nutrition.carbs);
      if (nutrition.fat)      item.fat      = Number(nutrition.fat);
    }
    addPantryItems([item]);
    setMsg({ ok: true, text: `"${form.name}" added to pantry.` });
    setForm({ name: "", category: "Other", quantity: 1, unit: "pieces", status: "In Stock", expiry: "" });
    setNutrition({ calories: "", protein: "", carbs: "", fat: "" });
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <form className="pantry-form" onSubmit={submit}>
      <div className="pantry-field">
        <label htmlFor="pantry-name">Item name</label>
        <input id="pantry-name" type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Greek yogurt" required />
      </div>
      <div className="pantry-row2">
        <div className="pantry-field">
          <label htmlFor="pantry-cat">Category</label>
          <select id="pantry-cat" value={form.category} onChange={e => set("category", e.target.value)}>
            {PANTRY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="pantry-field">
          <label htmlFor="pantry-status">Status</label>
          <select id="pantry-status" value={form.status} onChange={e => set("status", e.target.value)}>
            {PANTRY_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="pantry-row2">
        <div className="pantry-field">
          <label htmlFor="pantry-qty">Quantity</label>
          <input id="pantry-qty" type="number" min="0" step="0.1" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
        </div>
        <div className="pantry-field">
          <label htmlFor="pantry-unit">Unit</label>
          <select id="pantry-unit" value={form.unit} onChange={e => set("unit", e.target.value)}>
            {PANTRY_UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="pantry-field">
        <label htmlFor="pantry-expiry">Expiry date <span className="pantry-opt">(optional)</span></label>
        <input id="pantry-expiry" type="date" value={form.expiry} onChange={e => set("expiry", e.target.value)} />
      </div>

      <button type="button" className="hl-more" onClick={() => setShowNutrition(s => !s)}>
        {showNutrition ? "− Hide nutrition" : "+ Add nutrition (kcal / protein / carbs / fat)"}
      </button>
      {showNutrition && (
        <div className="pantry-row2" style={{ gap: 6 }}>
          {[["calories","kcal"],["protein","g protein"],["carbs","g carbs"],["fat","g fat"]].map(([k, ph]) => (
            <div key={k} className="pantry-field">
              <label>{ph}</label>
              <input type="number" min="0" step="0.1" value={nutrition[k]} onChange={e => setN(k, e.target.value)} placeholder="—" style={{ fontSize: 12 }} />
            </div>
          ))}
        </div>
      )}

      {msg && <div className={`pantry-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <button type="submit" className="btn-action" disabled={!form.name.trim()}>
        Add to Pantry
      </button>
    </form>
  );
}

/* ─── Receipt Parser ─── */
function ReceiptParser() {
  const [image, setImage]   = _useState(null);
  const [parsing, setParsing] = _useState(false);
  const [draft, setDraft]   = _useState(null);
  const [saving, setSaving] = _useState(false);
  const [msg, setMsg]       = _useState(null);
  const fileRef = _useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      setImage({ src, b64: src.split(",")[1], mime: file.type || "image/jpeg" });
      setDraft(null); setMsg(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const parse = async () => {
    if (!image) return;
    setParsing(true); setMsg(null);
    try {
      const r = await fetch("/api/pantry/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image.b64, mime_type: image.mime }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setDraft(data.items.map((item, i) => ({ ...item, _id: i })));
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally { setParsing(false); }
  };

  const updateItem = (id, key, val) =>
    setDraft(d => d.map(item => item._id === id ? { ...item, [key]: val } : item));
  const removeItem = (id) =>
    setDraft(d => d.filter(item => item._id !== id));

  const confirm = () => {
    if (!draft?.length) return;
    setSaving(true);
    const items = draft.map(({ _id, ...rest }) => ({ ...rest, quantity: Number(rest.quantity) || 1 }));
    addPantryItems(items);
    setMsg({ ok: true, text: `Added ${items.length} item${items.length !== 1 ? "s" : ""} to your pantry.` });
    setDraft(null); setImage(null);
    setSaving(false);
  };

  return (
    <div className="receipt-parser">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      {!image && !msg && (
        <button className="receipt-upload-btn" onClick={() => fileRef.current?.click()}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>
          </svg>
          <span>Take a photo of your receipt</span>
          <span className="receipt-hint">or tap to choose from gallery</span>
        </button>
      )}

      {msg && !draft && (
        <div className="receipt-done">
          <div className={`pantry-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>
          <button className="btn-action ghost" style={{ marginTop: 10 }} onClick={() => { setMsg(null); setImage(null); }}>
            Scan another receipt
          </button>
        </div>
      )}

      {image && !draft && (
        <div className="receipt-preview">
          <img src={image.src} alt="Receipt to parse" className="receipt-img" />
          {parsing && (
            <div className="receipt-thinking">
              <span className="receipt-dot" aria-hidden="true" />
              Claude is reading your receipt…
            </div>
          )}
          {!parsing && (
            <div className="receipt-actions">
              <button className="btn-action" onClick={parse}>Parse items</button>
              <button className="btn-action ghost" onClick={() => { setImage(null); setMsg(null); }}>Retake</button>
            </div>
          )}
          {msg && <div className="pantry-msg err" style={{ marginTop: 10 }}>{msg.text}</div>}
        </div>
      )}

      {draft && (
        <div className="draft-list">
          <div className="draft-header">
            <span className="draft-count">{draft.length} item{draft.length !== 1 ? "s" : ""} found — review &amp; edit before adding</span>
          </div>
          {draft.map(item => (
            <div key={item._id} className="draft-item">
              <div className="draft-item-main">
                <input className="draft-name" type="text" value={item.name}
                  onChange={e => updateItem(item._id, "name", e.target.value)} aria-label="Item name" />
                <button className="draft-remove" type="button" onClick={() => removeItem(item._id)} aria-label={`Remove ${item.name}`}>×</button>
              </div>
              <div className="draft-item-meta">
                <select value={item.category || "Other"} onChange={e => updateItem(item._id, "category", e.target.value)} aria-label="Category">
                  {PANTRY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="number" min="0" step="0.1" value={item.quantity || 1}
                  onChange={e => updateItem(item._id, "quantity", e.target.value)} style={{ width: 56 }} aria-label="Quantity" />
                <select value={item.unit || "pieces"} onChange={e => updateItem(item._id, "unit", e.target.value)} aria-label="Unit">
                  {PANTRY_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          ))}
          {draft.length === 0 && <div className="draft-empty">All items removed.</div>}
          <div className="draft-footer">
            <button className="btn-action" onClick={confirm} disabled={saving || draft.length === 0}>
              {saving ? "Adding…" : `Add ${draft.length} item${draft.length !== 1 ? "s" : ""} to Pantry`}
            </button>
            <button className="btn-action ghost" onClick={() => { setDraft(null); setImage(null); setMsg(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Inline Edit Form ─── */
function PantryEditRow({ item, onSave, onCancel }) {
  const [form, setForm] = _useState({
    name:     item.name     || "",
    category: item.category || "Other",
    quantity: item.quantity != null ? String(item.quantity) : "",
    unit:     item.unit     || "pieces",
    status:   item.status   || "In Stock",
    expiry:   item.expiry   || "",
  });
  const [nutrition, setNutrition] = _useState({
    calories: item.calories != null ? String(item.calories) : "",
    protein:  item.protein  != null ? String(item.protein)  : "",
    carbs:    item.carbs    != null ? String(item.carbs)    : "",
    fat:      item.fat      != null ? String(item.fat)      : "",
  });
  const [showNutrition, setShowNutrition] = _useState(
    !!(item.calories || item.protein || item.carbs || item.fat)
  );
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setN = (k, v) => setNutrition(n => ({ ...n, [k]: v }));

  const save = () => {
    const edits = {
      ...form,
      quantity: form.quantity !== "" ? Number(form.quantity) : null,
    };
    if (!edits.expiry) delete edits.expiry; else edits.expiry = form.expiry;
    if (showNutrition) {
      edits.calories = nutrition.calories !== "" ? Number(nutrition.calories) : null;
      edits.protein  = nutrition.protein  !== "" ? Number(nutrition.protein)  : null;
      edits.carbs    = nutrition.carbs    !== "" ? Number(nutrition.carbs)    : null;
      edits.fat      = nutrition.fat      !== "" ? Number(nutrition.fat)      : null;
      // remove nulls
      Object.keys(edits).forEach(k => { if (edits[k] === null) delete edits[k]; });
    } else {
      // clear nutrition if hidden
      delete edits.calories; delete edits.protein; delete edits.carbs; delete edits.fat;
    }
    updatePantryItem(item.id, edits);
    onSave();
  };

  return (
    <div className="pantry-edit-row">
      <div className="pantry-field">
        <label>Item name</label>
        <input type="text" value={form.name} onChange={e => set("name", e.target.value)} />
      </div>
      <div className="pantry-row2">
        <div className="pantry-field">
          <label>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}>
            {PANTRY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="pantry-field">
          <label>Status</label>
          <select value={form.status} onChange={e => set("status", e.target.value)}>
            {PANTRY_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="pantry-row2">
        <div className="pantry-field">
          <label>Quantity</label>
          <input type="number" min="0" step="0.1" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
        </div>
        <div className="pantry-field">
          <label>Unit</label>
          <select value={form.unit} onChange={e => set("unit", e.target.value)}>
            {PANTRY_UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="pantry-field">
        <label>Expiry date <span className="pantry-opt">(optional)</span></label>
        <input type="date" value={form.expiry} onChange={e => set("expiry", e.target.value)} />
      </div>
      <button type="button" className="hl-more" onClick={() => setShowNutrition(s => !s)}>
        {showNutrition ? "− Hide nutrition" : "+ Edit nutrition (kcal / protein / carbs / fat)"}
      </button>
      {showNutrition && (
        <div className="pantry-row2" style={{ gap: 6 }}>
          {[["calories","kcal"],["protein","g protein"],["carbs","g carbs"],["fat","g fat"]].map(([k, ph]) => (
            <div key={k} className="pantry-field">
              <label>{ph}</label>
              <input type="number" min="0" step="0.1" value={nutrition[k]}
                onChange={e => setN(k, e.target.value)} placeholder="—" style={{ fontSize: 12 }} />
            </div>
          ))}
        </div>
      )}
      <div className="pantry-edit-actions">
        <button className="btn-action" style={{ fontSize: 12, padding: "6px 14px" }} onClick={save} disabled={!form.name.trim()}>Save</button>
        <button className="btn-action ghost" style={{ fontSize: 12, padding: "6px 14px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Pantry List ─── */
function PantryList() {
  usePantryVersion();
  const [editingId, setEditingId] = _useState(null);
  const items = getPantryItems();

  if (!items.length) return (
    <div className="pantry-empty">
      Your pantry is empty — use Quick Add or Scan Receipt to get started.
    </div>
  );

  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  return (
    <div className="pantry-list">
      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className="pantry-cat">
          <div className="pantry-cat-name">{cat}</div>
          {catItems.map((item) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <PantryEditRow
                  item={item}
                  onSave={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className={`pantry-row ${item.expiry_flag === "expired" ? "expired" : item.expiry_flag === "expires_soon" ? "expiring" : ""}`}>
                  <span className="pantry-row-name">{item.name}</span>
                  <span className="pantry-row-right">
                    {item.quantity != null ? `${item.quantity}${item.unit ? " " + item.unit : ""}` : ""}
                    <button
                      className={`pantry-badge ${item.status === "Low" ? "low" : item.status === "Out" ? "out" : "in-stock"}`}
                      onClick={() => cyclePantryStatus(item.id)}
                      title="Click to cycle status"
                      style={{ cursor: "pointer", marginLeft: 4 }}
                    >
                      {item.status}
                    </button>
                    {item.expiry_flag === "expired"      && <span className="pantry-badge expired">Expired</span>}
                    {item.expiry_flag === "expires_soon" && <span className="pantry-badge expiring">Soon</span>}
                    <button
                      className="pantry-edit-btn"
                      onClick={() => setEditingId(item.id)}
                      aria-label={`Edit ${item.name}`}
                      title="Edit item"
                    >✎</button>
                    <button
                      className="pantry-del"
                      onClick={() => deletePantryItem(item.id)}
                      aria-label={`Delete ${item.name}`}
                      title="Remove from pantry"
                    >×</button>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── PantryManager (root) ─── */
function PantryManager() {
  const [tab, setTab] = _useState("add");

  return (
    <section className="card pantry-manager">
      <div className="lbl"><AgentDot id="nora" /> Nora · Pantry</div>
      <div className="subnav" role="tablist" aria-label="Pantry sections" style={{ marginBottom: 12 }}>
        {[["add", "Quick Add"], ["receipt", "Scan Receipt"], ["list", "My Pantry"]].map(([id, label]) => (
          <button key={id} role="tab" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "add"     && <QuickAddForm />}
      {tab === "receipt" && <ReceiptParser />}
      {tab === "list"    && <PantryList />}
    </section>
  );
}

window.PantryManager = PantryManager;
