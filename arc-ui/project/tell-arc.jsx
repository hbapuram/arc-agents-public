/* tell-arc.jsx — universal natural-language input.
 * "add 500g chicken expiring Friday", "log breakfast: yogurt + banana",
 * "45min strength, intensity 4", "took my magnesium", "slept 7.5h, hrv 45".
 *
 * Posts to /api/parse-entry, shows parsed actions for confirmation, then applies
 * them to the relevant localStorage store. Loaded before tabs.jsx; registers
 * TellArcBar on window.
 */

const TELL_ARC_EXAMPLES = [
  "add 500g chicken breast, expires Friday",
  "log lunch: dal 1 cup, rice 150g, salad",
  "45 min strength workout, intensity 4",
  "took my magnesium and M-Strong",
  "slept 7.5h, hrv 45, 9200 steps",
  "started Timeless vitamin C serum, PM, PAO 6 months",
  "add oat milk to the grocery list",
];

// Apply a single parsed action to the matching store. Returns true on success.
function _applyArcAction(a) {
  const today = (typeof _todayKey === "function") ? _todayKey() : new Date().toISOString().slice(0, 10);
  const cyc = (typeof deriveCycle === "function") ? deriveCycle() : {};
  const d = a.data || {};
  try {
    switch (a.store) {
      case "meal":
        if (typeof addMeal !== "function") return false;
        addMeal({ date: today, type: d.type || "snack", name: d.name,
          ingredients: (d.ingredients || []).map(i => ({ name: i.name, qty: i.qty, unit: i.unit || "g" })),
          notes: d.notes });
        return true;
      case "pantry":
        if (typeof addPantryItems !== "function") return false;
        addPantryItems((d.items || []).map(i => ({ status: "In Stock", category: "Other", unit: "pieces", ...i })));
        return true;
      case "grocery":
        if (typeof addGroceryItem !== "function") return false;
        addGroceryItem({ name: d.name, qty: d.qty || 1, unit: d.unit || "pieces", category: d.category || "Other",
          weekOf: typeof currentWeekOf === "function" ? currentWeekOf() : today });
        return true;
      case "workout":
        if (typeof addWorkout !== "function") return false;
        addWorkout({ date: today, type: d.type || "other", duration: Number(d.duration) || 0,
          intensity: d.intensity || 3, notes: d.notes, phase: cyc.id });
        return true;
      case "supplement_add":
        if (typeof addSupplement !== "function") return false;
        addSupplement({ name: d.name, dose: d.dose || "1 tablet", timing: d.timing || "morning",
          totalDays: Number(d.totalDays) || 30 });
        return true;
      case "supplement_taken": {
        if (typeof getActiveSupplements !== "function") return false;
        const want = String(d.name || "").toLowerCase();
        const match = getActiveSupplements().find(s => s.name.toLowerCase().includes(want) || want.includes(s.name.toLowerCase()));
        if (match && !match.takenToday) { toggleSupplementTaken(match.id); return true; }
        return !!match; // already taken counts as success
      }
      case "skincare":
        if (typeof addSkincareProduct !== "function") return false;
        addSkincareProduct({ name: d.name, brand: d.brand, category: d.category || "serum",
          timing: d.timing || "Both", opened: d.opened || null,
          paoMonths: d.paoMonths ? Number(d.paoMonths) : null, medicated: !!d.medicated,
          rating: d.rating ? Number(d.rating) : null });
        return true;
      case "schedule":
        if (typeof addScheduleItem !== "function") return false;
        addScheduleItem({ date: d.date || today, type: d.type || "other", label: d.label, time: d.time });
        return true;
      case "chore":
        if (typeof addChore !== "function") return false;
        addChore({ label: d.label, category: d.category || "household", frequency: d.frequency || "weekly" });
        return true;
      case "health":
        if (typeof setHealthDay !== "function") return false;
        setHealthDay(d);
        return true;
      case "period_start":
        if (typeof setPeriodStart !== "function") return false;
        setPeriodStart(d.date);
        return true;
      case "symptom":
        if (typeof logSymptom !== "function") return false;
        logSymptom({ symptom: d.symptom || d.name, severity: Number(d.severity) || 2,
          notes: d.notes, date: d.date || today });
        return true;
      case "blood_test":
        if (typeof addBloodTest !== "function") return false;
        (d.readings || [d]).forEach(r => addBloodTest({ marker: r.marker, value: Number(r.value),
          unit: r.unit, date: r.date || d.date || today,
          low: r.low != null ? Number(r.low) : undefined,
          high: r.high != null ? Number(r.high) : undefined }));
        return true;
      case "body":
        if (typeof setBodyEntry !== "function") return false;
        setBodyEntry({ weight: d.weight, waist: d.waist, hip: d.hip,
          chest: d.chest, arm: d.arm, thigh: d.thigh }, d.date || today);
        return true;
      default:
        return false;
    }
  } catch (e) { return false; }
}

const _STORE_ICON = {
  meal: "🍽", pantry: "🥫", grocery: "🛒", workout: "🏋", supplement_add: "💊",
  supplement_taken: "✓", skincare: "🧴", schedule: "📅", chore: "🧹",
  health: "❤", period_start: "✦", symptom: "🩹", blood_test: "🩸", body: "⚖",
};

function TellArcBar() {
  const [text, setText]             = React.useState("");
  const [loading, setLoading]       = React.useState(false);
  const [photoLoading, setPhotoLoading] = React.useState(false);
  const [listening, setListening]   = React.useState(false);
  const [actions, setActions]       = React.useState(null);
  const [note, setNote]             = React.useState(null);
  const [done, setDone]             = React.useState(null);

  const fileInputRef   = React.useRef(null);
  const recognitionRef = React.useRef(null);

  const busy = loading || photoLoading;

  const parse = async () => {
    if (!text.trim() || busy) return;
    setLoading(true); setActions(null); setNote(null); setDone(null);
    try {
      const cyc = typeof deriveCycle === "function" ? deriveCycle() : {};
      const r = await fetch("/api/parse-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          today: typeof _todayKey === "function" ? _todayKey() : new Date().toISOString().slice(0, 10),
          phase: cyc.label || undefined,
        }),
      });
      const data = await r.json();
      if (data.error) { setNote(data.error); }
      else if (!data.actions || data.actions.length === 0) { setNote(data.note || "Couldn't map that to anything — try rephrasing."); }
      else { setActions(data.actions); }
    } catch (e) {
      setNote("Couldn't reach Arc — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true); setActions(null); setNote(null); setDone(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result;
      const base64 = src.split(",")[1];
      const mime = file.type || "image/jpeg";
      try {
        const r = await fetch("/api/meals/parse-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mime_type: mime }),
        });
        const data = await r.json();
        if (data.name || data.ingredients?.length) {
          setActions([{
            store: "meal",
            summary: `${data.type || "Meal"}: ${data.name || "meal"}${data.ingredients?.length ? ` — ${data.ingredients.map(i => i.name).join(", ")}` : ""}`,
            data: { name: data.name || "meal", type: data.type || "meal", ingredients: data.ingredients || [] },
          }]);
        } else {
          setNote("Couldn't read this photo — try a clearer image.");
        }
      } catch (_) {
        setNote("Photo scan failed — is the server running?");
      } finally {
        setPhotoLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNote("Voice input isn't supported in this browser."); return; }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript;
      setText(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const applyAll = () => {
    let ok = 0;
    (actions || []).forEach(a => { if (_applyArcAction(a)) ok++; });
    setDone(`Saved ${ok} ${ok === 1 ? "entry" : "entries"}.`);
    setActions(null); setText("");
    setTimeout(() => setDone(null), 2600);
  };

  const removeAction = (idx) => setActions(prev => prev.filter((_, i) => i !== idx));

  return (
    <section className="tellarc card">
      <div className="tellarc-row">
        {/* photo */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} aria-hidden="true" />
        <button
          className={`tellarc-aux${photoLoading ? " loading" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || listening}
          aria-label="Scan a meal photo"
          title="Snap a meal photo"
        >
          {photoLoading
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" strokeDasharray="28 56" strokeDashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>
          }
        </button>

        <input
          className="tellarc-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") parse(); }}
          placeholder={listening ? "Listening…" : "Tell Arc anything…"}
          aria-label="Tell Arc — natural language entry"
        />

        {/* mic */}
        <button
          className={`tellarc-aux${listening ? " active" : ""}`}
          onClick={toggleMic}
          disabled={busy}
          aria-label={listening ? "Stop listening" : "Speak to Tell Arc"}
          title={listening ? "Tap to stop" : "Speak"}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>
          </svg>
        </button>

        <button className="tellarc-send" onClick={parse} disabled={!text.trim() || busy}>
          {busy ? "…" : "Add"}
        </button>
      </div>

      {!actions && !note && !done && !listening && (
        <div className="tellarc-hint">
          Type, speak, or snap a photo — Arc files it to the right place.
        </div>
      )}
      {listening && (
        <div className="tellarc-hint" style={{ color: "var(--terra)" }}>
          🎤 Listening… tap the mic again to stop.
        </div>
      )}

      {note && <div className="tellarc-note">{note}</div>}
      {done && <div className="tellarc-done">{done}</div>}

      {actions && actions.length > 0 && (
        <div className="tellarc-actions">
          <div className="tellarc-actions-head">Arc understood:</div>
          {actions.map((a, i) => (
            <div key={i} className="tellarc-action">
              <span className="tellarc-action-ico">{_STORE_ICON[a.store] || "•"}</span>
              <span className="tellarc-action-sum">{a.summary || a.store}</span>
              <button className="tellarc-action-del" onClick={() => removeAction(i)} aria-label="Remove">×</button>
            </div>
          ))}
          <div className="tellarc-confirm">
            <button className="btn-action" onClick={applyAll}>Save {actions.length > 1 ? `all ${actions.length}` : ""}</button>
            <button className="btn-action ghost" onClick={() => { setActions(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

Object.assign(window, { TellArcBar, _applyArcAction });
