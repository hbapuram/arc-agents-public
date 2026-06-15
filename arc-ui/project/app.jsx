/* Arc Agents — root app */

const { useState, useEffect, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "userName": "Hrish",
  "defaultTab": "today",
  "theme": "light",
  "accent": "auto",
  "fontSize": 100,
  "contrast": "normal",
  "motion": "on",
  "showVeraFab": true
}/*EDITMODE-END*/;

// Preset accent colors. "auto" defers to the time-of-day --deep palette.
const ACCENT_OPTIONS = [
  { value: "auto",  label: "Auto" },
  { value: "forest", label: "Forest" },
  { value: "ocean",  label: "Ocean" },
  { value: "plum",   label: "Plum" },
  { value: "terra",  label: "Terracotta" },
  { value: "teal",   label: "Teal" },
  { value: "gold",   label: "Gold" },
];
const ACCENT_HEX = {
  forest: "#1A3A2A",
  ocean:  "#2E6B9E",
  plum:   "#5A4F7A",
  terra:  "#B5543F",
  teal:   "#2A6B6B",
  gold:   "#9A7B3F",
};

// ── Settings persistence ──────────────────────────────────────────────────────
// useTweaks persists via the edit-mode host (window.parent postMessage), which
// only exists inside the prototype harness. On the live site there's no host, so
// settings would reset every reload. Mirror them to localStorage so user choices
// actually stick in production.
const TWEAK_STORAGE_KEY = "arc-tweaks-v1";
function loadStoredTweaks(defaults) {
  try {
    const raw = localStorage.getItem(TWEAK_STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch (e) { /* private mode / disabled storage — fall back to defaults */ }
  return defaults;
}
function persistTweaks(edits) {
  try {
    const cur = JSON.parse(localStorage.getItem(TWEAK_STORAGE_KEY) || "{}");
    localStorage.setItem(TWEAK_STORAGE_KEY, JSON.stringify({ ...cur, ...edits }));
  } catch (e) { /* ignore */ }
}

const TAB_LIST = [
  { id: "today",    label: "Today",    icon: "today" },
  { id: "health",   label: "Health",   icon: "health" },
  { id: "life",     label: "Life",     icon: "life" },
  { id: "agents",   label: "Agents",   icon: "agents" },
  { id: "council",  label: "Council",  icon: "council" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function clockFromHour(h) {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function CloudSyncSection() {
  const status   = useSyncStatus();
  const [busy, setBusy]     = React.useState(null); // "seed"|"sync"|"restore"
  const [progress, setProg] = React.useState("");
  const [msg, setMsg]       = React.useState(null); // {ok, text}

  const fmt = (iso) => iso ? new Date(iso).toLocaleString("en-IE", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : null;

  const onProgress = (done, total, store) =>
    setProg(`${store} (${done}/${total})`);

  async function handleSeed() {
    setBusy("seed"); setMsg(null); setProg("preparing…");
    try {
      const r = await seedSheets();
      setMsg({ ok: true, text: `Seeded: ${(r.seeded||[]).join(", ") || "none"}` });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(null); setProg("");
  }

  async function handleSync() {
    setBusy("sync"); setMsg(null);
    try {
      const r = await syncAllToSheets(onProgress);
      const errs = Object.keys(r.errors || {}).length;
      setMsg({ ok: !errs, text: errs ? `Synced with ${errs} error(s)` : "All stores synced ✓" });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(null); setProg("");
  }

  async function handleRestore() {
    if (!window.confirm("Overwrite ALL local data from Google Sheets? This cannot be undone.")) return;
    setBusy("restore"); setMsg(null);
    try {
      const r = await restoreFromSheets(onProgress);
      const errs = Object.keys(r.errors || {}).length;
      setMsg({ ok: !errs, text: errs ? `Restored with ${errs} error(s)` : "Data restored from cloud ✓" });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(null); setProg("");
  }

  return (
    <section className="card sync-card">
      <div className="sync-header">
        <span className="sync-title">Cloud Sync</span>
        <span className="sync-badge">Google Sheets</span>
      </div>
      {status.lastSync && (
        <div className="sync-meta">Last synced {fmt(status.lastSync)}</div>
      )}
      {status.lastRestore && (
        <div className="sync-meta">Last restored {fmt(status.lastRestore)}</div>
      )}

      <div className="sync-actions">
        <button className="btn-action" disabled={!!busy} onClick={handleSeed}>
          {busy === "seed" ? `Seeding… ${progress}` : "Seed sheets with my data"}
        </button>
        <button className="btn-action ghost" disabled={!!busy} onClick={handleSync}>
          {busy === "sync" ? `Syncing… ${progress}` : "Sync all → Sheets ↑"}
        </button>
        <button className="btn-action ghost" disabled={!!busy} onClick={handleRestore}
          style={{ color: "var(--terra)" }}>
          {busy === "restore" ? `Restoring… ${progress}` : "Restore from cloud ↓"}
        </button>
      </div>

      {msg && (
        <div className={`sync-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>
      )}

      <div className="sync-hint">
        Auto-sync is active — changes write to Sheets ~4 s after each update.
        Calendar events sync when you add schedule items via the Life tab.
      </div>
    </section>
  );
}

function SettingsTab({ tweaks, setTweak, resetTweaks }) {
  const HELP_ITEMS = [
    { icon: "✦", title: "Tell Arc", body: "The bar at the top of Today — your fastest way in. Type, speak with the mic, or snap a meal photo and Arc files it to the right place automatically. One note can carry several facts at once: \"slept 7.5h, hrv 48, 45 min strength, add oat milk to grocery\" logs all four in a single pass." },
    { icon: "◉", title: "Today", body: "Your daily command centre in one scroll: a period check when it's due, your morning (Aurora) or evening (Eve) briefing, then quick loggers for sleep & HRV, work hours, and water. Below that, live nudges from your agents and today's schedule." },
    { icon: "🤖", title: "Agents", body: "Tap any card with a green CHAT badge to open a live conversation with your full context already loaded — Nora (food & pantry), Felix (fitness & recovery), Cara (skincare), Eve (evening wind-down), and more. Grey AUTO agents work silently; their output appears inside the relevant tabs." },
    { icon: "❤", title: "Health tab", body: "Seven sub-tabs: Today (signals), Meals (log food, recipes, pantry, grocery), Fitness, Cycle (symptoms + calendar), Sleep, Care (AM/PM skincare + dental), and Data — the single edit hub for your health log, supplements, blood tests, and body measurements." },
    { icon: "🏠", title: "Life tab", body: "Your weekly schedule and chores. Tap ↻ Plan to auto-build today's time blocks from your real data, drag blocks to reorder or move them between days, and use 📅 to push any timed block to your Google Calendar. Chores show their best day type and are fully editable inline." },
    { icon: "✿", title: "Cycle phase", body: "Open Log today (the card on Today, or Health → Data) and fill the Period start field once. Arc derives your phase (menstrual / follicular / ovulatory / luteal), tints the whole app to match, and shifts every agent's guidance for food, fitness, skincare, and supplements — no daily input needed. The Cycle sub-tab then shows your full phase report." },
    { icon: "🛒", title: "Grocery & Scout", body: "Under Health → Meals. Add items by hand or scan a receipt to log real prices and quality. Scout then groups your unchecked list by the best Irish store (Lidl, Tesco, SuperValu, Dunnes, Aldi, M&S) and learns your preferences as you check things off." },
    { icon: "🔒", title: "Your data", body: "Everything lives in this browser (localStorage) — no account, no tracking. Nothing leaves your device except when you actively chat with an agent or use Tell Arc. Optional Cloud Sync (below) backs everything up to your own Google Sheet so you can restore it on another device." },
  ];

  // Token-aware education: most of Arc is instant & offline. Only a handful of
  // actions call the Claude API — knowing which keeps usage lean.
  const AI_TIPS = [
    { icon: "⚡", title: "Most of Arc is instant", body: "Logging, editing, trackers, schedules, and routines all run locally with no AI call. Only these touch the API: Tell Arc, agent chats, photo scans (Snap meal / Scan bill), unknown-food macro look-ups, and the daily briefings." },
    { icon: "♻", title: "Briefings cache once a day", body: "Aurora's morning brief and the Council synthesis are generated once per day and saved. Reopening them — or revisiting the tab — costs nothing until tomorrow. Use the ↻ button only if you genuinely want a fresh take." },
    { icon: "🗂", title: "Batch what you tell Arc", body: "Stack several facts into a single Tell Arc note instead of sending them one by one. Inside an agent chat, ask follow-ups in the same thread — the agent keeps your context, so you don't pay to reload it by reopening." },
    { icon: "🍎", title: "Database first for macros", body: "About 30 common foods return macros instantly with no AI call — only unfamiliar ingredients fall back to \"Ask AI\". Spelling items the common way (e.g. \"oats\", \"tofu\") keeps look-ups free." },
    { icon: "🎯", title: "Ask specific questions", body: "A focused question (\"I'm 40g short on protein — what's the quickest veg fix?\") returns a tighter, cheaper answer than an open-ended one, and gives you something you can act on straight away." },
  ];

  return (
    <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings">

      <div className="sec-title" style={{ marginTop: 8 }}>How to use <em>Arc</em></div>
      <section className="card">
        <div className="settings-help-block">
          {HELP_ITEMS.map((it) => (
            <div key={it.title} className="settings-help-item">
              <span className="settings-help-icon">{it.icon}</span>
              <div><strong>{it.title}</strong> — {it.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="sec-title">Getting the most from Arc's AI</div>
      <section className="card">
        <p style={{ margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.6, color: "var(--text-2)" }}>
          Arc's intelligence runs on Claude. A few habits keep it fast, focused, and light on usage — without giving anything up.
        </p>
        <div className="settings-help-block">
          {AI_TIPS.map((it) => (
            <div key={it.title} className="settings-help-item">
              <span className="settings-help-icon">{it.icon}</span>
              <div><strong>{it.title}</strong> — {it.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="sec-title">Profile</div>
      <section className="card">
        <label className="lbl" htmlFor="st-name" style={{ marginBottom: 8 }}>Your name</label>
        <input id="st-name" type="text" className="st-input"
          value={tweaks.userName} placeholder="Your name"
          onChange={(e) => setTweak("userName", e.target.value)} />
      </section>

      <div className="sec-title">Appearance</div>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Theme</div>
          <div className="st-seg">
            {["light", "dark"].map(v => (
              <button key={v} className={`st-seg-btn${tweaks.theme === v ? " active" : ""}`}
                onClick={() => setTweak("theme", v)}>
                {v === "light" ? "☀ Light" : "☾ Dark"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Accent colour</div>
          <div className="st-seg" style={{ flexWrap: "wrap" }}>
            {ACCENT_OPTIONS.map(opt => (
              <button key={opt.value}
                className={`st-seg-btn${tweaks.accent === opt.value ? " active" : ""}`}
                onClick={() => setTweak("accent", opt.value)}
                style={{ flex: "0 0 auto" }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="lbl" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Font size</span>
            <span style={{ color: "var(--deep)", fontVariantNumeric: "tabular-nums" }}>{tweaks.fontSize}%</span>
          </div>
          <input type="range" className="st-slider"
            value={tweaks.fontSize} min={85} max={140} step={5}
            onChange={(e) => setTweak("fontSize", Number(e.target.value))} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
            <span>Aa small</span><span>Aa large</span>
          </div>
        </div>
      </section>

      <div className="sec-title">Accessibility & layout</div>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {[
          { key: "contrast",    label: "High contrast",  desc: "Stronger borders and text",       isOn: tweaks.contrast === "high",  toggle: () => setTweak("contrast", tweaks.contrast === "high" ? "normal" : "high") },
          { key: "motion",      label: "Animations",     desc: "Smooth transitions and effects",  isOn: tweaks.motion === "on",       toggle: () => setTweak("motion", tweaks.motion === "on" ? "off" : "on") },
          { key: "showVeraFab", label: "Vera quick-chat",desc: "Floating button for fast questions", isOn: tweaks.showVeraFab,        toggle: () => setTweak("showVeraFab", !tweaks.showVeraFab) },
        ].map(row => (
          <div key={row.key} className="st-row">
            <div>
              <div className="st-row-lbl">{row.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{row.desc}</div>
            </div>
            <button className={`st-toggle${row.isOn ? " on" : ""}`}
              onClick={row.toggle} aria-pressed={row.isOn} aria-label={`Toggle ${row.label}`} />
          </div>
        ))}
      </section>

      <div className="sec-title">Cloud Sync</div>
      <CloudSyncSection />

      <section className="card" style={{ marginTop: 4 }}>
        <button className="btn-action ghost"
          style={{ width: "100%", textAlign: "center", padding: "10px 16px", fontSize: 13 }}
          onClick={resetTweaks}>
          Reset all settings to defaults
        </button>
      </section>

      <div style={{ height: 16 }} />
    </div>
  );
}

function App() {
  const [activeAgent, setActiveAgent] = useState(null);
  const [healthFormOpen, setHealthFormOpen] = useState(false);
  const [tweaks, setTweakBase] = useTweaks(loadStoredTweaks(TWEAK_DEFAULTS));
  const [tab, setTab] = useState(() => {
    const t = loadStoredTweaks(TWEAK_DEFAULTS).defaultTab;
    return TAB_LIST.some(x => x.id === t) ? t : "today";
  });

  // Day state ("morning"/"work"/…) follows the real clock now, not a manual setting.
  const [state, setState] = useState(currentDayState());
  useEffect(() => {
    const tick = () => setState(currentDayState());
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);

  // Cycle phase is derived from the period-start date in the health log.
  const healthVer = useHealthVersion();
  const cycle = deriveCycle();   // { id, label, day, energy, note, …, set }

  // Open the daily-log form from anywhere via the global event.
  useEffect(() => {
    const open = () => setHealthFormOpen(true);
    window.addEventListener("arc-open-health-form", open);
    return () => window.removeEventListener("arc-open-health-form", open);
  }, []);

  // setTweak wrapper: update state + mirror to localStorage so choices persist
  // on the live site (where the edit-mode host isn't present).
  const setTweak = useCallback((keyOrEdits, val) => {
    setTweakBase(keyOrEdits, val);
    const edits = (typeof keyOrEdits === "object" && keyOrEdits !== null)
      ? keyOrEdits : { [keyOrEdits]: val };
    persistTweaks(edits);
  }, [setTweakBase]);

  const resetTweaks = useCallback(() => {
    try { localStorage.removeItem(TWEAK_STORAGE_KEY); } catch (e) { /* ignore */ }
    setTweakBase(TWEAK_DEFAULTS);
    setTab(TWEAK_DEFAULTS.defaultTab);
  }, [setTweakBase]);

  // Apply tweak CSS vars
  useEffect(() => {
    document.documentElement.style.setProperty("--fs-scale", String(tweaks.fontSize / 100));
    document.documentElement.dataset.contrast = tweaks.contrast;
    document.documentElement.dataset.motion = tweaks.motion;
  }, [tweaks.fontSize, tweaks.contrast, tweaks.motion]);

  // Apply accent: override the brand --deep token, or clear to defer to the
  // time-of-day atmosphere when "auto".
  useEffect(() => {
    const el = document.querySelector(".device");
    if (!el) return;
    const hex = ACCENT_HEX[tweaks.accent];
    if (hex) el.style.setProperty("--deep", hex);
    else el.style.removeProperty("--deep");
  }, [tweaks.accent, state]);

  const openAgent = useCallback((id) => {
    const a = AGENTS.find(x => x.id === id);
    if (a) setActiveAgent(a);
  }, []);

  // Keyboard nav across bottom tab bar (left/right arrows)
  const tabRefs = useRef({});
  const onTabKeyDown = (e) => {
    const idx = TAB_LIST.findIndex(t => t.id === tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = TAB_LIST[(idx + dir + TAB_LIST.length) % TAB_LIST.length];
      setTab(next.id);
      requestAnimationFrame(() => tabRefs.current[next.id]?.focus());
    } else if (e.key === "Home") {
      e.preventDefault(); setTab(TAB_LIST[0].id); requestAnimationFrame(() => tabRefs.current[TAB_LIST[0].id]?.focus());
    } else if (e.key === "End") {
      e.preventDefault(); setTab(TAB_LIST[TAB_LIST.length - 1].id); requestAnimationFrame(() => tabRefs.current[TAB_LIST[TAB_LIST.length - 1].id]?.focus());
    }
  };

  // When tab changes, scroll the panel container back to top
  const panelRef = useRef(null);
  useEffect(() => { panelRef.current?.scrollTo({ top: 0, behavior: tweaks.motion === "off" ? "auto" : "smooth" }); }, [tab]);

  const stateMeta = DAY_STATES.find(s => s.id === state) || DAY_STATES[0];
  const _now = new Date();
  const clock = `${String(_now.getHours()).padStart(2, "0")}:${String(_now.getMinutes()).padStart(2, "0")}`;

  const who = (tweaks.userName || "").trim() || "there";
  const greetByState = {
    morning:   { hi: "Good morning,", em: who },
    work:      { hi: "Focus time,",   em: who },
    afternoon: { hi: "Afternoon,",    em: who },
    evening:   { hi: "Good evening,", em: who },
    winddown:  { hi: "Wind it down,", em: who },
  }[state];

  return (
    <div className="app-stage">
      <a className="skip" href="#panel-today" onClick={(e) => { e.preventDefault(); panelRef.current?.querySelector("[role='tabpanel']")?.focus(); }}>Skip to content</a>

      <div className="device" role="application" aria-label="Arc Agents — daily companion" data-state={state} data-phase={cycle.id} data-theme={tweaks.theme}>
        {/* app bar */}
        <header className="appbar">
          <div>
            <div className="greet">{greetByState.hi} <em>{greetByState.em}</em></div>
            <div className="meta">{stateMeta.range}{cycle.day > 0 ? ` · ${cycle.label} day ${cycle.day}` : ` · ${cycle.label}`}</div>
          </div>
          <div className="appbar-right">
            <div className="appbar-clock" role="status" aria-live="polite" aria-label={`Current time ${clock}`}>
              <span className="pulse" aria-hidden="true"></span>
              <span className="appbar-time">{clock}</span>
            </div>
          </div>
        </header>

        {/* panels */}
        <main className="tabpanels" ref={panelRef} id="main-content" tabIndex="-1">
          {tab === "today"    && <TodayTab        state={state} phase={cycle} openAgent={openAgent} who={who} />}
          {tab === "health"   && <HealthTab        phase={cycle} openAgent={openAgent} />}
          {tab === "life"     && <LifeScheduleTab  openAgent={openAgent} />}
          {tab === "agents"   && <AgentsTab        openAgent={openAgent} />}
          {tab === "council"  && <CouncilTab       openAgent={openAgent} />}
          {tab === "settings" && <SettingsTab      tweaks={tweaks} setTweak={setTweak} resetTweaks={resetTweaks} />}
        </main>

        {/* Vera floating chat fab */}
        {tweaks.showVeraFab && tab !== "agents" && !activeAgent && (
          <button
            className="vera-fab"
            onClick={() => openAgent("vera")}
            aria-label="Ask Vera — quick compare"
            style={{
              position: "absolute", right: 18, bottom: 96,
              background: "var(--deep)", color: "#fff",
              border: 0, borderRadius: 999,
              padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em",
              boxShadow: "0 10px 28px rgba(0,0,0,0.32)",
              cursor: "pointer",
              zIndex: 30,
            }}
          >
            <Icon name="chat" size={16} />
            Ask Vera
          </button>
        )}

        {/* bottom tab bar */}
        <nav className="tabbar" role="tablist" aria-label="Main sections" onKeyDown={onTabKeyDown}
          style={{ "--tab-idx": TAB_LIST.findIndex(t => t.id === tab) }}>
          <div className="tabbar-pill" aria-hidden="true" />
          {TAB_LIST.map((t) => {
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[t.id] = el)}
                role="tab"
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setTab(t.id)}
              >
                <span className="ico"><Icon name={t.icon} size={17} /></span>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* chat sheet */}
        {activeAgent && <AgentChat agent={activeAgent} onClose={() => setActiveAgent(null)} />}

        {/* daily health-log form (opened from Today card / vitals button) */}
        {healthFormOpen && (
          <div className="health-form-overlay"
               onClick={(e) => { if (e.target === e.currentTarget) setHealthFormOpen(false); }}>
            <HealthLogForm onClose={() => setHealthFormOpen(false)} />
          </div>
        )}
      </div>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
