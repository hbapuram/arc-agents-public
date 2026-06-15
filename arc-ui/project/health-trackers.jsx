/* health-trackers.jsx — UI surfaces for the symptoms, blood-test, and body stores.
 *   SymptomsTracker  → Health → Cycle (below the phase report)
 *   BloodTestPanel   → Health → Data
 *   BodyTracker      → Health → Data
 * Loaded after the stores and before tabs.jsx (which renders these). All store
 * helpers are resolved on window at render time, so load order is flexible.
 */

/* ─── Symptoms ─── */
function _sevLabel(n) { return { 1: "Mild", 2: "Moderate", 3: "Severe" }[n] || String(n); }

function SymptomsTracker() {
  useSymptomsVersion();
  const cyc = typeof deriveCycle === "function" ? deriveCycle() : {};
  const today  = getSymptomsForDate();
  const recent = getRecentSymptoms(14).filter(e => e.date !== (today[0] && today[0].date));
  const [picked,   setPicked]   = React.useState("");
  const [custom,   setCustom]   = React.useState("");
  const [severity, setSeverity] = React.useState(2);
  const [notes,    setNotes]    = React.useState("");

  const name = (custom.trim() || picked).trim();
  const add = () => {
    if (!name) return;
    logSymptom({ symptom: name, severity, notes: notes.trim() || undefined });
    setPicked(""); setCustom(""); setSeverity(2); setNotes("");
  };

  return (
    <section className="card symptoms-card">
      <div className="lbl"><AgentDot id="flora" /> Flora · Symptoms{cyc.day ? ` · cycle day ${cyc.day}` : ""}</div>

      <div className="symptom-chips">
        {SYMPTOM_TYPES.map(s => (
          <button key={s} type="button"
            className={`symptom-chip ${picked === s && !custom.trim() ? "on" : ""}`}
            onClick={() => { setPicked(s); setCustom(""); }}>{s}</button>
        ))}
      </div>

      <div className="symptom-form">
        <input className="symptom-input" value={custom} placeholder="…or type a symptom"
          onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <div className="symptom-sev">
          {[1, 2, 3].map(n => (
            <button key={n} type="button" className={`symptom-sev-dot s${n} ${severity === n ? "on" : ""}`}
              onClick={() => setSeverity(n)} title={_sevLabel(n)}>{n}</button>
          ))}
        </div>
        <button className="btn-action" onClick={add} disabled={!name}>Log</button>
      </div>
      <input className="symptom-note" value={notes} placeholder="Note (optional)…"
        onChange={e => setNotes(e.target.value)} />

      {today.length > 0 && (
        <div className="symptom-list">
          <div className="symptom-list-head">Today</div>
          {today.map(e => (
            <div key={e.id} className="symptom-row">
              <span className={`symptom-sev-tag s${e.severity}`}>{_sevLabel(e.severity)}</span>
              <span className="symptom-row-name">{e.symptom}</span>
              {e.notes && <span className="symptom-row-note">{e.notes}</span>}
              <button className="symptom-del" onClick={() => deleteSymptom(e.id)} aria-label="Delete">×</button>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <details className="symptom-recent">
          <summary>Recent (last 14 days · {recent.length})</summary>
          {recent.map(e => (
            <div key={e.id} className="symptom-row">
              <span className={`symptom-sev-tag s${e.severity}`}>{_sevLabel(e.severity)}</span>
              <span className="symptom-row-name">{e.symptom}</span>
              <span className="symptom-row-meta">{e.date}{e.cycleDay != null ? ` · day ${e.cycleDay}` : ""}</span>
              <button className="symptom-del" onClick={() => deleteSymptom(e.id)} aria-label="Delete">×</button>
            </div>
          ))}
        </details>
      )}

      {today.length === 0 && recent.length === 0 && (
        <div className="symptom-empty">No symptoms logged yet — tap one above or type your own.</div>
      )}
    </section>
  );
}

/* ─── Blood tests ─── */
const _TREND_ARROW = { up: "↑", down: "↓", flat: "→" };

function BloodTestPanel() {
  useBloodTestsVersion();
  const rows = getLatestByMarker();
  const [showForm, setShowForm] = React.useState(false);
  const [openMarker, setOpenMarker] = React.useState(null);
  const blank = { marker: BLOODTEST_MARKERS[0].marker, value: "", unit: BLOODTEST_MARKERS[0].unit,
                  date: new Date().toISOString().slice(0, 10), low: BLOODTEST_MARKERS[0].low, high: BLOODTEST_MARKERS[0].high };
  const [form, setForm] = React.useState(blank);

  const pickMarker = (marker) => {
    const def = BLOODTEST_MARKERS.find(m => m.marker === marker) || {};
    setForm(f => ({ ...f, marker, unit: def.unit || "", low: def.low ?? "", high: def.high ?? "" }));
  };

  const submit = () => {
    if (form.value === "" || isNaN(Number(form.value))) return;
    addBloodTest({
      marker: form.marker, value: Number(form.value), unit: form.unit, date: form.date,
      low: form.low === "" ? null : Number(form.low),
      high: form.high === "" ? null : Number(form.high),
    });
    setForm(blank); setShowForm(false);
  };

  const fieldStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)" };

  return (
    <div className="bloodtest-panel">
      <div className="section-header">
        <h3>Blood test results</h3>
        <p className="section-desc">{rows.length ? `${rows.length} marker${rows.length !== 1 ? "s" : ""} tracked` : "No results logged yet"}</p>
      </div>

      {rows.length > 0 && (
        <div className="bloodtest-table">
          <div className="bloodtest-th">
            <span>Marker</span><span>Value</span><span>Range</span><span>Trend</span>
          </div>
          {rows.map(r => (
            <div key={r.marker}>
              <div className={`bloodtest-tr status-${r.status}`} onClick={() => r.count > 1 && setOpenMarker(openMarker === r.marker ? null : r.marker)}
                style={{ cursor: r.count > 1 ? "pointer" : "default" }}>
                <span className="bt-marker">{r.marker}</span>
                <span className="bt-value">{r.value}<em> {r.unit}</em></span>
                <span className="bt-range">{r.low != null ? r.low : "—"}–{r.high != null ? r.high : "—"}</span>
                <span className={`bt-trend trend-${r.trend || "none"}`}>
                  {r.trend ? _TREND_ARROW[r.trend] : "·"}
                  {r.status !== "normal" && r.status !== "unknown" && <em className={`bt-flag ${r.status}`}>{r.status}</em>}
                </span>
              </div>
              {openMarker === r.marker && (
                <div className="bt-history">
                  {getMarkerHistory(r.marker).slice().reverse().map(h => (
                    <div key={h.id} className="bt-history-row">
                      <span>{h.date}</span><span>{h.value} {h.unit}</span>
                      <button className="symptom-del" onClick={() => deleteBloodTest(h.id)} aria-label="Delete">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>New reading</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select value={form.marker} onChange={e => pickMarker(e.target.value)} style={fieldStyle}>
              {BLOODTEST_MARKERS.map(m => <option key={m.marker}>{m.marker}</option>)}
            </select>
            <input type="number" step="0.1" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Value" style={fieldStyle} />
            <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unit" style={fieldStyle} />
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={fieldStyle} />
            <input type="number" step="0.1" value={form.low} onChange={e => setForm(f => ({ ...f, low: e.target.value }))} placeholder="Range low" style={fieldStyle} />
            <input type="number" step="0.1" value={form.high} onChange={e => setForm(f => ({ ...f, high: e.target.value }))} placeholder="Range high" style={fieldStyle} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-action" onClick={submit} disabled={form.value === ""}>Add reading</button>
            <button className="btn-action ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-action ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => setShowForm(true)}>+ Add blood test result</button>
      )}
    </div>
  );
}

/* ─── Body tracking ─── */
function BodyTracker() {
  useBodyVersion();
  const latest = getLatestBody();
  const [showForm, setShowForm] = React.useState(false);
  const seed = () => {
    const d = getBodyDay();
    const m = { date: new Date().toISOString().slice(0, 10) };
    BODY_METRICS.forEach(x => { m[x.key] = d[x.key] != null ? String(d[x.key]) : ""; });
    return m;
  };
  const [form, setForm] = React.useState(seed);

  const save = () => {
    const edits = {};
    BODY_METRICS.forEach(x => { edits[x.key] = form[x.key] === "" ? null : Number(form[x.key]); });
    setBodyEntry(edits, form.date);
    setShowForm(false);
  };

  const fieldStyle = { font: "inherit", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)" };

  return (
    <div className="body-tracker">
      <div className="section-header">
        <h3>Body</h3>
        <p className="section-desc">Optional · {latest ? `last logged ${latest.date}` : "no entries yet"}</p>
      </div>

      <div className="body-metric-grid">
        {BODY_METRICS.map(m => {
          const trend = getBodyTrend(m.key);
          const val = latest && latest[m.key] != null ? latest[m.key] : null;
          return (
            <div key={m.key} className={`body-metric ${m.primary ? "primary" : ""}`}>
              <div className="body-metric-label">{m.label}</div>
              <div className="body-metric-value">{val != null ? `${val}` : "—"}<em> {m.unit}</em></div>
              {trend && trend.series.length > 1 && (
                <div className={`body-metric-trend ${trend.delta < 0 ? "down" : trend.delta > 0 ? "up" : ""}`}>
                  {trend.delta > 0 ? "+" : ""}{trend.delta}{m.unit} over {trend.series.length} logs
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>Log measurements</div>
          <label style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 6 }}>Date
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...fieldStyle, width: "100%", marginTop: 2 }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {BODY_METRICS.map(m => (
              <label key={m.key} style={{ fontSize: 10, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 2 }}>
                {m.label} · {m.unit}
                <input type="number" step={m.step} min="0" max={m.max} value={form[m.key]}
                  onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))} placeholder="—" style={fieldStyle} />
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-action" onClick={save}>Save</button>
            <button className="btn-action ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-action ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => { setForm(seed()); setShowForm(true); }}>+ Log body measurements</button>
      )}
    </div>
  );
}

Object.assign(window, { SymptomsTracker, BloodTestPanel, BodyTracker });
