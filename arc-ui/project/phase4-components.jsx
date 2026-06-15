/* Phase 4 Components: Personal Care Cupboard, Apple Health, Notion Data */

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONAL CARE CUPBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const _SC_EXPIRY_EMOJI = { ok: "✅", expires_3mo: "✅", expires_soon: "⚠️", expired: "❌", unknown: "·" };
const _SC_TIMINGS = ["AM", "PM", "Both", "Weekly", "Flexible"];
const _SC_STATUSES = ["Active", "Low", "Empty", "Considering"];

function PersonalCareCupboard() {
  useSkincareVersion();
  const products = getSkincareProducts();
  const cyc = typeof deriveCycle === "function" ? deriveCycle() : {};
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "", brand: "", category: "serum", timing: "Both",
    opened: "", paoMonths: "", labelExpiry: "", rating: "", volume: "", price: "",
    medicated: false, phases: [], notes: "", status: "Active",
  });

  const expiringCount = products.filter(p => p.expiry_flag === "expires_soon" || p.expiry_flag === "expired").length;

  const doAdd = () => {
    if (!form.name.trim()) return;
    addSkincareProduct({
      ...form,
      name: form.name.trim(),
      paoMonths: form.paoMonths ? Number(form.paoMonths) : null,
      rating: form.rating ? Number(form.rating) : null,
      price: form.price ? Number(form.price) : null,
      opened: form.opened || null,
      labelExpiry: form.labelExpiry || null,
    });
    setForm({ name: "", brand: "", category: "serum", timing: "Both", opened: "", paoMonths: "", labelExpiry: "", rating: "", volume: "", price: "", medicated: false, phases: [], notes: "", status: "Active" });
    setShowForm(false);
  };

  const togglePhase = (ph) =>
    setForm(f => ({ ...f, phases: f.phases.includes(ph) ? f.phases.filter(x => x !== ph) : [...f.phases, ph] }));

  const fieldStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)" };
  const CYCLE_LABELS = (window.CYCLE_PHASES || []).map(p => p.label);

  return (
    <div className="personal-care-cupboard">
      <div className="section-header">
        <h3>Personal Care Cupboard</h3>
        <p className="section-desc">
          {products.length} product{products.length !== 1 ? "s" : ""}
          {expiringCount > 0 ? ` · ${expiringCount} expiring/expired` : ""}
        </p>
      </div>

      {products.length === 0 && !showForm && (
        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Your cupboard is empty — add a product below or tell Nora/Cara about it.
        </div>
      )}

      <div className="product-grid">
        {products.map(p => (
          <div key={p.id} className="product-card" data-status={p.expiry_flag}>
            <div className="product-status-badge">{_SC_EXPIRY_EMOJI[p.expiry_flag] || "·"}</div>
            <button className="product-del" onClick={() => deleteSkincareProduct(p.id)} aria-label="Delete">×</button>
            <div className="product-name">{p.name}</div>
            <div className="product-brand">{p.brand || p.category}</div>
            <div className="product-meta">
              <span>{p.timing}</span>
              {p.volume && <span>{p.volume}</span>}
            </div>
            <div className="product-footer">
              {p.rating ? <span className="rating">⭐ {p.rating}/5</span> : <span className="rating" style={{ opacity: 0.4 }}>{p.category}</span>}
              {p.expiry_flag === "expires_soon" && <span className="expiry-note">{p.days_left}d left</span>}
              {p.expiry_flag === "expired" && <span className="expiry-note expired">Expired</span>}
            </div>
            {p.medicated && <div className="product-med">medicated</div>}
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>New product</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" style={{ ...fieldStyle, gridColumn: "1 / -1" }} />
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand" style={fieldStyle} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={fieldStyle}>
              {(window.SKINCARE_CATEGORIES || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.timing} onChange={e => setForm(f => ({ ...f, timing: e.target.value }))} style={fieldStyle}>
              {_SC_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={fieldStyle}>
              {_SC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ fontSize: 10, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 2 }}>Opened
              <input type="date" value={form.opened} onChange={e => setForm(f => ({ ...f, opened: e.target.value }))} style={fieldStyle} /></label>
            <input type="number" value={form.paoMonths} onChange={e => setForm(f => ({ ...f, paoMonths: e.target.value }))} placeholder="PAO months" style={fieldStyle} />
            <input value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} placeholder="Volume (e.g. 30ml)" style={fieldStyle} />
            <input type="number" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="Rating 1-5" min="1" max="5" style={fieldStyle} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Good for cycle phases (optional)</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {CYCLE_LABELS.map(ph => (
                <button key={ph} type="button" onClick={() => togglePhase(ph)}
                  className={`sc-phase-toggle ${form.phases.includes(ph) ? "on" : ""}`}>{ph}</button>
              ))}
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, margin: "8px 0", color: "var(--text)" }}>
            <input type="checkbox" checked={form.medicated} onChange={e => setForm(f => ({ ...f, medicated: e.target.checked }))} />
            Medicated (retinol / acids / Rx)
          </label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" style={{ ...fieldStyle, width: "100%" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-action" onClick={doAdd} disabled={!form.name.trim()}>Add product</button>
            <button className="btn-action ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-action ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => setShowForm(true)}>+ Add product</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLE HEALTH DATA COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function AppleHealthData() {
  useHealthVersion();
  const d = getHealthDay();
  const cyc = deriveCycle();
  const stepGoal = 10000;
  const steps = d.steps != null ? d.steps : null;
  const stepPct = steps != null ? Math.min(steps / stepGoal * 100, 100) : 0;

  return (
    <div className="apple-health-data">
      <div className="section-header">
        <h3>Health Signals</h3>
        <p className="section-desc">From your daily log · today</p>
      </div>

      <div className="health-cards">
        {/* Cycle Phase */}
        <div className="health-card cycle">
          <div className="card-label">Cycle Phase</div>
          <div className="card-value">{cyc.label}</div>
          <div className="card-detail">{cyc.set ? `Day ${cyc.day} of cycle` : "Set period start below"}</div>
        </div>

        {/* Steps */}
        <div className="health-card">
          <div className="card-label">Steps</div>
          <div className="card-value">{steps != null ? steps.toLocaleString() : "—"}</div>
          <div className="card-detail">{steps != null ? `${Math.round(steps / stepGoal * 100)}% of goal` : "Not logged"}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stepPct}%` }}></div>
          </div>
        </div>

        {/* Heart */}
        <div className="health-card">
          <div className="card-label">Heart</div>
          <div className="card-value">{d.resting_hr != null ? `${d.resting_hr} bpm` : "—"}</div>
          <div className="card-detail">Resting HR · HRV: {d.hrv != null ? d.hrv : "—"}</div>
        </div>

        {/* Sleep */}
        <div className="health-card sleep">
          <div className="card-label">Last Night Sleep</div>
          <div className="card-value">{d.sleep_duration != null ? `${d.sleep_duration}h` : "—"}</div>
          <div className="card-detail">
            {d.deep_sleep_min != null ? `Deep ${d.deep_sleep_min}m` : "Deep —"}
            {" · "}
            {d.rem_sleep_min != null ? `REM ${d.rem_sleep_min}m` : "REM —"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTION DATA LIVE UPDATES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function NotionDataUpdates() {
  useSupplementsVersion();
  const supplements = getActiveSupplements().map(s => ({
    id: s.id, name: s.name, days: s.totalDays, daysLeft: s.daysLeft,
  }));
  const lowSupps = supplements.filter(s => s.daysLeft / (s.days || 1) < 0.25);

  return (
    <div className="notion-data-updates">
      <div className="section-header">
        <h3>Supplement supply</h3>
        <p className="section-desc">
          {supplements.length} active{lowSupps.length ? ` · ${lowSupps.length} running low` : ""}
        </p>
      </div>

      <div className="data-section">
        <div className="data-list">
          {supplements.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 12, padding: "8px 0" }}>No active supplements — add them in Life → Supplements.</div>
          ) : supplements.map(s => (
            <div key={s.id} className="data-item">
              <div className="item-name">{s.name}</div>
              <div className="item-detail">{s.daysLeft}/{s.days} days left</div>
              <div className="progress-tiny">
                <div className="fill" style={{ width: `${Math.min(100, s.daysLeft / (s.days || 1) * 100)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENDED HEALTH TAB (combines Phase 4 components)
// ═══════════════════════════════════════════════════════════════════════════════

function HealthTabExtended({ phase, openAgent }) {
  return (
    <div id="panel-health" role="tabpanel" aria-labelledby="tab-health">
      <PersonalCareCupboard />
      <div style={{ height: "12px" }}></div>
      <AppleHealthData />
      <div style={{ height: "12px" }}></div>
      <NotionDataUpdates />
    </div>
  );
}

// Export for use in app.jsx
Object.assign(window, {
  PersonalCareCupboard,
  AppleHealthData,
  NotionDataUpdates,
  HealthTabExtended
});
