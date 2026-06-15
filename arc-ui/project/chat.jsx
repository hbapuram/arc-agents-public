/* Arc Agents — chat sheet (per-agent, live API) */

const { useState, useRef, useEffect } = React;

// Agents that have a context builder in the API
const API_AGENTS = new Set(["vera", "nora", "felix", "cara", "eve", "scout"]);

// Rich intro data for each live-chat agent
const AGENT_INTROS = {
  vera: {
    what: "I'm your quick-answer assistant and smart router. Ask me anything about food, fitness, skincare, or supplements — I'll give a direct verdict or point you to the right specialist.",
    best: ["Is ashwagandha worth taking in luteal phase?", "Should I train legs today?", "Is this moisturiser good for oily skin?"],
    works_with: ["Nora — food & pantry", "Felix — fitness", "Cara — skincare"],
    privacy: "Only your cycle phase is sent to the API. Minimal data exposure.",
    tokens: "Low — short Q&A, typically 50–200 tokens per reply (~$0.00005).",
  },
  nora: {
    what: "I'm your food advisor. I see your actual pantry and today's logged meals, and suggest meals tuned to your cycle phase — prioritising the right macros for where you are.",
    best: ["What can I make tonight?", "What's expiring soon?", "What should I eat this week for follicular phase?"],
    works_with: ["Flora — provides cycle phase", "Scout — covers where to buy groceries"],
    privacy: "Your pantry list and today's meals are sent to the API each chat. Nothing is stored after the request.",
    tokens: "Low–medium — meal suggestions run 200–500 tokens (~$0.0002).",
  },
  felix: {
    what: "I'm your fitness coach. I read your health log (HRV, sleep, steps), your last 7 workouts, and cycle phase to recommend the right training intensity and type for today.",
    best: ["Should I work out today?", "I'm tired and low HRV — what should I do?", "Rate my training this week"],
    works_with: ["Flora — cycle phase affects intensity targets", "Luna — mood & energy signal", "Soma — sleep recovery score"],
    privacy: "Health log, workouts, blood tests, and body measurements are sent to the API. Most data-rich agent — be mindful on shared devices.",
    tokens: "Medium — workout plans run 300–600 tokens (~$0.0003). Conversational replies are shorter.",
  },
  cara: {
    what: "I'm your skincare advisor. I read your Personal Care Cupboard — every product, opened date, PAO, and expiry — and build routines matched to your cycle phase, flagging conflicts and near-expiry.",
    best: ["What's my morning routine?", "What's expiring in the next 2 months?", "Can I use retinol and glycolic acid together?"],
    works_with: ["Flora — cycle phase changes skin barrier, sebum, and sensitivity"],
    privacy: "Skincare shelf (product names, dates, PAO) is sent to the API. No financial or medical data.",
    tokens: "Low–medium — routine outputs run 200–400 tokens (~$0.0002).",
  },
  eve: {
    what: "I'm your evening coach — a conversational wind-down companion. I know your mood, energy, HRV, and cycle phase so I can meet you where you actually are, not give generic advice.",
    best: ["Help me wind down — I've had a rough day", "How did I do today?", "I feel really anxious right now"],
    works_with: ["Flora — cycle phase affects mood and energy", "Halo — evening reflection prompts"],
    privacy: "Today's health log (mood, energy, HRV, sleep, steps) and symptoms are sent to the API. Keep in mind if health data is sensitive.",
    tokens: "Medium–high — conversations can run long. Each exchange ~200–500 tokens; a full session can reach 2–4K total (~$0.002). Watch this one.",
  },
  scout: {
    what: "I'm your shopping advisor. I remember where you've bought things and how you rated them, then suggest the best store for each item. I can also group your whole grocery list by store.",
    best: ["Where should I buy chicken breast?", "Which store is best for my grocery list?", "How was Lidl for avocados last week?"],
    works_with: ["Nora — grocery list items come from her recommendations"],
    privacy: "Your shopping ratings and unchecked grocery list are sent to the API. No financial data.",
    tokens: "Low — store picks are concise, 100–300 tokens (~$0.0001).",
  },
};

function AgentIntroCard({ info, onUseTip }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "var(--text)" }}>{info.what}</p>

      <div>
        <div className="intro-lbl">Try asking</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 5 }}>
          {info.best.map((tip, i) => (
            <button key={i} className="intro-tip" onClick={() => onUseTip(tip)}>"{tip}"</button>
          ))}
        </div>
      </div>

      {info.works_with && info.works_with.length > 0 && (
        <div>
          <div className="intro-lbl">Works with</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3, lineHeight: 1.5 }}>
            {info.works_with.join(" · ")}
          </div>
        </div>
      )}

      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>🔒 Privacy · </span>{info.privacy}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: info.tokens.startsWith("Medium–high") ? "var(--terra)" : "var(--text)" }}>⚡ Cost · </span>{info.tokens}
        </div>
      </div>
    </div>
  );
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ─── attachment chip components ─── */
function ImageChip({ src, onRemove, small }) {
  return (
    <div className={`attach-chip ${small ? "small" : ""}`}>
      <img src={src} alt="attached image" />
      <span>image</span>
      {onRemove && <button type="button" aria-label="Remove image" onClick={onRemove}>×</button>}
    </div>
  );
}

function AudioChip({ duration, onRemove, small }) {
  return (
    <div className={`attach-chip audio ${small ? "small" : ""}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
      </svg>
      <span>voice · {fmtDuration(duration)}</span>
      {onRemove && <button type="button" aria-label="Remove voice memo" onClick={onRemove}>×</button>}
    </div>
  );
}

function AgentChat({ agent, onClose }) {
  const isVera = agent.id === "vera";
  const _introInfo = AGENT_INTROS[agent.id];
  const _initMsg = _introInfo
    ? { from: "agent", isIntro: true, introInfo: _introInfo }
    : { from: "agent", text: isVera
        ? "Hi — I'm Vera. Ask me anything. You can also snap a photo or hold to record a voice note."
        : `Hi — I'm ${agent.name}. I've loaded your context for today. Type, snap a photo, or hold the mic.` };

  const [messages, setMessages] = useState([_initMsg]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [route, setRoute] = useState(null);

  // API context
  const [systemPrompt, setSystemPrompt] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(null); // null=loading, true, false
  const [clientContext, setClientContext] = useState(null); // pantry/meal data from localStorage

  // attachments
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingAudio, setPendingAudio] = useState(null);

  // recording
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recordIntervalRef = useRef(null);
  const recordStartRef = useRef(0);

  const fileInputRef = useRef(null);
  const composerRef = useRef(null);
  const threadRef = useRef(null);
  const closeRef = useRef(null);

  // Fetch real context on mount
  useEffect(() => {
    if (!API_AGENTS.has(agent.id)) {
      setApiAvailable(false);
      // Explain what automatic agents do instead of a generic "not set up" message
      const autoMsg = agent.chat === false
        ? `I'm ${agent.name} — I work automatically in the background.\n\n${agent.desc || ""}\n\nCheck the Today or Health tabs to see my output.`
        : `${agent.name} chat isn't available in this environment.`;
      setMessages(m => [...m, { from: "agent", text: autoMsg }]);
      return;
    }
    fetch(`/api/context/${agent.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setSystemPrompt(`${data.system}\n\nCURRENT CONTEXT:\n${data.context}`);
        setApiAvailable(true);
        // All personal data lives in the browser (localStorage). Each agent gets
        // (1) deep detail for its OWN domain, then (2) a compact cross-domain
        // snapshot of every other store — that second part is what makes the
        // agents aware of each other ("you trained today, protein is short").
        try {
          const todayKey = new Date().toISOString().slice(0, 10);
          const parts = [];

          if (agent.id === "nora") {
            const pantryItems = typeof getPantryItems === "function" ? getPantryItems() : [];
            const pantryText = pantryItems.length
              ? pantryItems.map(i => `${i.name} (${i.status}, ${i.quantity}${i.unit ? " " + i.unit : ""})`).join(", ")
              : "Pantry is empty";
            const todayMeals = typeof getMealsForDate === "function" ? getMealsForDate(todayKey) : [];
            const mealsText = todayMeals.length
              ? todayMeals.map(m => {
                  const ings = (m.ingredients || []).map(i => i.name).join(", ");
                  return `${m.type}: ${m.name || ings || "unnamed"}`;
                }).join("; ")
              : "No meals logged today";
            parts.push(`Pantry: ${pantryText}`, `Meals today: ${mealsText}`);
          } else if (agent.id === "cara") {
            const shelf = typeof skincareContextText === "function" ? skincareContextText() : "Skincare shelf empty.";
            parts.push(`Skincare shelf: ${shelf}`);
          } else if (agent.id === "felix") {
            if (typeof bloodTestContextText === "function") parts.push(`Blood tests: ${bloodTestContextText()}`);
            if (typeof bodyContextText === "function") parts.push(bodyContextText());
            // Recent workouts give Felix real training history (with notes + feedback).
            try {
              const wks = (typeof loadWorkouts === "function") ? loadWorkouts().entries : [];
              if (Array.isArray(wks) && wks.length) {
                const recent = wks.slice(-7).map(w =>
                  `${w.date}: ${w.type} ${w.duration}min intensity ${w.intensity}/5${w.notes ? ` (${w.notes})` : ""}${w.feedback ? ` feedback:${w.feedback}` : ""}`
                ).join("; ");
                parts.push(`Recent workouts (last 7): ${recent}`);
              }
            } catch (_) {}
          } else if (agent.id === "eve") {
            if (typeof symptomsContextText === "function") parts.push(`Symptoms: ${symptomsContextText()}`);
            if (typeof bloodTestContextText === "function") parts.push(`Blood tests: ${bloodTestContextText()}`);
          } else if (agent.id === "scout") {
            if (typeof shopContextText === "function") parts.push(shopContextText());
            if (typeof getPantryItems === "function") {
              const pantry = getPantryItems();
              if (pantry.length) parts.push(`Pantry items: ${pantry.map(i => i.name).join(", ")}`);
            }
          }

          // Cross-domain awareness for EVERY agent (incl. Vera) — the shared brain.
          if (typeof snapshotText === "function") {
            const xd = snapshotText();
            if (xd) parts.push("── OTHER DOMAINS (cross-agent awareness — reference only if it changes your answer) ──\n" + xd);
          }

          if (parts.length) setClientContext(parts.join("\n\n"));
        } catch (e) { /* ignore */ }
      })
      .catch(() => {
        setApiAvailable(false);
        setMessages(m => [...m, {
          from: "agent",
          text: "Couldn't load my context — is the Flask server running?",
        }]);
      });
  }, [agent.id]);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, thinking]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => () => { if (recordIntervalRef.current) clearInterval(recordIntervalRef.current); }, []);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage({ src: reader.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startRecording = () => {
    if (recording || thinking) return;
    setRecording(true);
    setRecordSec(0);
    recordStartRef.current = Date.now();
    recordIntervalRef.current = setInterval(() => {
      setRecordSec((Date.now() - recordStartRef.current) / 1000);
    }, 100);
  };
  const stopRecording = () => {
    if (!recording) return;
    clearInterval(recordIntervalRef.current);
    setRecording(false);
    const dur = (Date.now() - recordStartRef.current) / 1000;
    if (dur >= 0.4) setPendingAudio({ duration: dur });
    setRecordSec(0);
  };
  const cancelRecording = () => {
    clearInterval(recordIntervalRef.current);
    setRecording(false);
    setRecordSec(0);
  };

  const hasAttachment = !!(pendingImage || pendingAudio);
  const canSend = (input.trim() || hasAttachment) && !thinking && !recording && apiAvailable === true;

  const send = (e) => {
    e?.preventDefault();
    if (!canSend) return;

    // Build text — note attachments since we can't send binary to the API here
    let text = input.trim();
    if (pendingImage && !text) text = "(sent an image)";
    if (pendingAudio && !text) text = "(sent a voice note)";
    if (pendingImage && input.trim()) text = `${text} (image attached)`;
    if (pendingAudio && input.trim()) text = `${text} (voice note attached)`;
    if (route) text = `[${route}] ${text}`;

    const userMsg = { from: "user", text: input.trim(), image: pendingImage, audio: pendingAudio };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setPendingImage(null);
    setPendingAudio(null);
    setThinking(true);
    if (composerRef.current) composerRef.current.blur();

    // Build Anthropic message history from thread (skip intro cards + first agent message)
    const history = [...messages, userMsg]
      .filter(m => !m.isIntro && m.text && m.text.trim())
      .map((m, i) => {
        if (i === 0 && m.from === "agent") return null;
        return { role: m.from === "user" ? "user" : "assistant", content: m.text };
      })
      .filter(Boolean);

    // Replace last user message with the annotated version (route + attachments)
    if (history.length && history[history.length - 1].role === "user") {
      history[history.length - 1].content = text;
    }

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: systemPrompt, messages: history, agent: agent.id,
        ...(clientContext ? { client_context: clientContext } : {}),
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setMessages(m => [...m, { from: "agent", text: data.reply }]);
      })
      .catch(err => {
        setMessages(m => [...m, { from: "agent", text: `Sorry — something went wrong. (${err.message})` }]);
      })
      .finally(() => {
        setThinking(false);
        setRoute(null);
        if (window.innerWidth > 768) composerRef.current?.focus();
      });
  };

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => { if (e.target.classList.contains("scrim")) onClose(); }}>
      <div className="sheet">
        <header>
          <div className="grab" aria-hidden="true"></div>
          <div style={{ paddingTop: 8 }}>
            <h1 id="sheet-title">Chat with <em>{agent.name}</em></h1>
            <div className="role">{agent.role}</div>
          </div>
          <button ref={closeRef} className="closebtn" aria-label="Close chat" onClick={onClose}>×</button>
        </header>
        <div className="body" ref={threadRef}>
          <div className="chat-thread" role="log" aria-live="polite" aria-atomic="false">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.from === "agent" && <div className="meta">{agent.name}</div>}
                {m.image && (
                  <div style={{ marginBottom: m.text ? 6 : 0 }}>
                    <img src={m.image.src} alt="attached" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
                  </div>
                )}
                {m.audio && (
                  <div style={{ marginBottom: m.text ? 6 : 0 }}>
                    <AudioChip duration={m.audio.duration} small />
                  </div>
                )}
                {m.isIntro
                  ? <AgentIntroCard info={m.introInfo} onUseTip={(tip) => { setInput(tip); setTimeout(() => composerRef.current?.focus(), 0); }} />
                  : m.text}
                {isVera && i === 0 && (
                  <div className="routechips" role="group" aria-label="Suggested domains">
                    {["food", "skin", "supplements", "fitness"].map((r) => (
                      <button key={r} type="button" onClick={() => { setRoute(r); composerRef.current?.focus(); }} aria-pressed={route === r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="bubble agent thinking">
                <div className="meta">{agent.name}</div>
                thinking…
              </div>
            )}
          </div>
        </div>

        {(pendingImage || pendingAudio) && (
          <div className="attach-row" aria-label="Staged attachments">
            {pendingImage && <ImageChip src={pendingImage.src} onRemove={() => setPendingImage(null)} />}
            {pendingAudio && <AudioChip duration={pendingAudio.duration} onRemove={() => setPendingAudio(null)} />}
          </div>
        )}

        {recording && (
          <div className="rec-overlay" role="status" aria-live="polite">
            <span className="rec-dot" aria-hidden="true"></span>
            <div className="rec-wave" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.06}s` }} />)}
            </div>
            <span className="rec-time">{fmtDuration(recordSec)}</span>
            <button type="button" className="rec-cancel" onClick={cancelRecording} aria-label="Cancel recording">Cancel</button>
            <button type="button" className="rec-send" onClick={stopRecording} aria-label="Stop recording">Stop</button>
          </div>
        )}

        <form className="composer" onSubmit={send}>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagePick} style={{ display: "none" }} aria-hidden="true" />
          <button type="button" className="composer-aux" aria-label="Attach photo" onClick={() => fileInputRef.current?.click()} disabled={recording || thinking}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>
            </svg>
          </button>

          <label htmlFor="chat-input" style={{ position: "absolute", left: -9999 }}>Message {agent.name}</label>
          <input
            id="chat-input"
            ref={composerRef}
            type="text"
            autoComplete="off"
            placeholder={
              apiAvailable === null ? "Loading context…" :
              apiAvailable === false ? `${agent.name} isn't available` :
              recording ? "Recording…" :
              route ? `Ask about ${route}…` :
              `Message ${agent.name}…`
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={thinking || recording || apiAvailable !== true}
          />

          {!input.trim() && !pendingImage && !pendingAudio ? (
            <button
              type="button"
              className={`composer-aux mic ${recording ? "active" : ""}`}
              aria-label={recording ? "Stop recording" : "Hold to record voice note"}
              onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
              onPointerUp={(e) => { e.preventDefault(); stopRecording(); }}
              onPointerLeave={() => { if (recording) stopRecording(); }}
              disabled={thinking || apiAvailable !== true}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>
              </svg>
            </button>
          ) : (
            <button type="submit" className="composer-send" disabled={!canSend} aria-label="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l14-7-5 14-2.5-5.5L5 12z"/>
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

window.AgentChat = AgentChat;
