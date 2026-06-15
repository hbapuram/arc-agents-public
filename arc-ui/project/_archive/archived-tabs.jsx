/* ─────────────────────────────────────────────────────────────────────────────
   ARCHIVED: CareerTab + LifeTab (and all sub-components)
   Removed June 2026 — see _archive/README.md for restore instructions.

   To restore: copy functions back into tabs.jsx, add CareerTab + LifeTab to
   the Object.assign(window, {...}) export at the bottom of tabs.jsx, re-add
   "career" and "life" to TAB_LIST in app.jsx, and add their panel renderings.
   ───────────────────────────────────────────────────────────────────────────── */

/* ─── CAREER ─── */
function CareerTab({ openAgent }) {
  const [sub, setSub] = React.useState("briefing");
  return (
    <div role="tabpanel" id="panel-career" aria-labelledby="tab-career">
      <section className="card dark scorebox" aria-label="Cleo: AI Engineer role match score">
        <div className="lbl"><AgentDot id="cleo"/> Cleo · Role match score</div>
        <div className="num">74<small>%</small></div>
        <div className="sub">AI Engineer · FinTech · Dublin</div>
        <div className="gap-list">
          <div className="lbl">Top gaps to close</div>
          <div className="row">→ LangChain (Ch 5 · in plan)</div>
          <div className="row">→ Production deployment (Ch 15)</div>
          <div className="row">→ Vector databases (Ch 7)</div>
        </div>
      </section>

      <div className="subnav" role="tablist" aria-label="Career sections">
        {[
          ["briefing", "Briefing"], ["coach", "Coach"], ["plan", "Plan"],
          ["learning", "Learning"], ["jobs", "Jobs"], ["presence", "Presence"],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-pressed={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>

      {sub === "briefing" && (
        <div>
          {NEWS_ITEMS.map((n, i) => (
            <article key={i} className="card" style={{ padding: "12px 14px" }}>
              <div className="lbl"><AgentDot id="aria"/> {n.source}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{n.hl}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{n.why}</div>
            </article>
          ))}
        </div>
      )}
      {sub === "coach" && (
        <section className="card">
          <div className="lbl"><AgentDot id="kai"/> Kai · Daily message</div>
          <h2 style={{ fontSize: 18 }}>Today: ship the Ch.2 prototype</h2>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Don't context-switch before lunch. One action: open <code>arc_export.js</code> and review the RAG diff.</p>
          <button className="btn-action" style={{ marginTop: 10 }} onClick={() => openAgent("kai")}>Chat with Kai</button>
        </section>
      )}
      {sub === "plan" && (
        <section className="card">
          <div className="lbl"><AgentDot id="rex"/> Rex · Today's 3 priorities</div>
          <ol style={{ paddingLeft: 18, marginTop: 6 }}>
            <li style={{ marginBottom: 8 }}><strong>Ch.2 prototype</strong> — 2 hr deep work · personal</li>
            <li style={{ marginBottom: 8 }}><strong>AXA model review</strong> — 1.5 hr · work</li>
            <li><strong>Felix strength session</strong> — 40 min · personal</li>
          </ol>
        </section>
      )}
      {sub === "learning" && (
        <section className="card">
          <div className="lbl"><AgentDot id="scout"/> Scout · Ch.2 progress</div>
          <h2 style={{ fontSize: 17 }}>RAG basics + arc_export.js</h2>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>45-min block scheduled 11:00 · streak 14 days</p>
          <div style={{ background: "var(--surface-2)", borderRadius: 8, height: 8, marginTop: 10 }}>
            <div style={{ width: "32%", height: "100%", background: "var(--blue)", borderRadius: 8 }}></div>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Chapter 2 · session 1 of 6</div>
        </section>
      )}
      {sub === "jobs" && (
        <section className="card">
          <div className="lbl"><AgentDot id="cleo"/> Cleo · Today's matches</div>
          <JobRow title="AI Engineer · FinTech" company="Stripe Dublin" match={82} />
          <JobRow title="ML Engineer · Platform" company="Intercom" match={71} />
          <JobRow title="AI Solutions Architect" company="Workday" match={68} />
        </section>
      )}
      {sub === "presence" && (
        <>
          <section className="card">
            <div className="lbl"><AgentDot id="vox"/> Vox · LinkedIn + GitHub</div>
            <p style={{ fontSize: 13, marginBottom: 8 }}>Vox has a draft on Ch.2 ready — 180 words.</p>
            <button className="btn-action" onClick={() => openAgent("vox")}>Review draft</button>
            <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>GitHub · 7-day activity</div>
            <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
              {[2,3,1,4,2,0,3].map((v, i) => (
                <div key={i} style={{ flex: 1, height: 28, background: `rgba(46,107,158,${0.15 + v * 0.18})`, borderRadius: 3 }} aria-hidden="true"></div>
              ))}
            </div>
          </section>
          <SubstackPicks />
        </>
      )}
    </div>
  );
}

function JobRow({ title, company, match }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{company}</div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--deep)", fontSize: 22 }}>{match}<small style={{ fontSize: 11, color: "var(--muted)" }}>%</small></div>
    </div>
  );
}

const SS_PICKS = [
  { day: "Mon", pub: "Latent Space",       auth: "swyx + Alessio",        title: "Architecting RAG at scale — beyond toy demos", topic: "AI Engineering", read: "11 min", why: "Maps to Cleo's LangChain + vector-DB gap (Ch 5 + 7)." },
  { day: "Tue", pub: "Lenny's Newsletter", auth: "Lenny Rachitsky",       title: "How three engineers broke into AI roles in 2025", topic: "Career",         read: "9 min",  why: "Direct pattern-match to your AI Engineer transition." },
  { day: "Wed", pub: "Anthropic",          auth: "Anthropic Engineering", title: "Building reliable agent loops with Haiku 3.5", topic: "Agents",         read: "14 min", why: "Tomorrow's Scout session reads from this paper." },
  { day: "Thu", pub: "Study Hacks",        auth: "Cal Newport",           title: "Deep work for builders mid-career",            topic: "Focus",          read: "7 min",  why: "Follicular = focus mode. Kai will reference this." },
  { day: "Fri", pub: "Stripe Engineering", auth: "Stripe",                title: "FinTech AI in production — five lessons",       topic: "FinTech",        read: "16 min", why: "Your target sector + role. Aria flagged Stripe roles up." },
  { day: "Sat", pub: "Sahil's Notes",      auth: "Sahil Lavingia",        title: "Building in public, mid-transition",            topic: "Reflection",     read: "6 min",  why: "Saturday read · slower pace · weekly review prep." },
  { day: "Sun", pub: "Stratechery",        auth: "Ben Thompson",          title: "The agent-OS future and what it absorbs",       topic: "Long-form",      read: "22 min", why: "Sunday Council read. Sets up next week's framing." },
];

function SubstackPicks() {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const today = SS_PICKS[todayIdx];
  const queue = SS_PICKS.map((p, i) => ({ ...p, _i: i })).filter(p => p._i !== todayIdx);

  return (
    <section className="card substack-card" aria-label="Substack daily picks">
      <div className="lbl">
        <span className="ss-mark" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 4h18v3H3zM3 9h18v3H3zM3 14h18v6l-9-4-9 4z"/>
          </svg>
        </span>
        <span>Substack</span>
        <span style={{ fontStyle: "italic", fontFamily: "var(--font-display)", textTransform: "none", letterSpacing: 0, fontSize: 13, color: "var(--text-2)", marginLeft: 4 }}>· curated daily</span>
        <span className="ss-now">Today · {today.day}</span>
      </div>

      <article className="ss-today">
        <div className="ss-row">
          <span className="ss-avatar" aria-hidden="true">{today.pub[0]}</span>
          <div className="ss-pub-meta">
            <div className="ss-pubname">{today.pub}</div>
            <div className="ss-pubauth">by {today.auth} · {today.read} read</div>
          </div>
          <span className="ss-topic">{today.topic}</span>
        </div>
        <h3 className="ss-title">{today.title}</h3>
        <div className="ss-why"><strong>Why today:</strong> {today.why}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button type="button" className="btn-action">Read in Substack</button>
          <button type="button" className="btn-action ghost">Save to Mira</button>
        </div>
      </article>

      <div className="ss-queue-lbl">This week's queue</div>
      <ol className="ss-queue">
        {queue.map((p) => (
          <li key={p._i}>
            <span className="ss-q-day">{p.day}</span>
            <div className="ss-q-body">
              <div className="ss-q-title">{p.title}</div>
              <div className="ss-q-pub">{p.pub} · {p.topic} · {p.read}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="ss-foot">
        Suggestions blend cycle phase · Cleo's role-gap · Aria's news · Scout's chapter focus. One pick per day, swappable from Mira.
      </div>
    </section>
  );
}

/* ─── LIFE ─── */
function LifeTab({ openAgent }) {
  const [sub, setSub] = React.useState("finance");
  return (
    <div role="tabpanel" id="panel-life" aria-labelledby="tab-life">
      <div className="subnav" role="tablist" aria-label="Life sections">
        {[
          ["finance", "Finance"], ["discover", "Discover"], ["wardrobe", "Wardrobe"],
          ["social", "Social"], ["home", "Home"], ["travel", "Travel"],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-pressed={sub === id} onClick={() => setSub(id)}>{label}</button>
        ))}
      </div>

      {sub === "finance"  && <LifeFinance />}
      {sub === "discover" && <LifeDiscover />}
      {sub === "wardrobe" && <LifeWardrobe />}
      {sub === "social"   && <LifeSocial />}
      {sub === "home"     && <LifeHome />}
      {sub === "travel"   && <LifeTravel />}
    </div>
  );
}

function LifeFinance() {
  return (
    <section className="card">
      <div className="lbl"><AgentDot id="finn"/> Finn · May budget</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 4 }}>
        <div className="donut" style={{ background: "conic-gradient(var(--sage) 0% 62%, var(--border) 62% 100%)" }}>
          <div className="inner">62%</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 28, color: "var(--deep)" }}>€1,240</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>of €2,000</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14 }}>
        <BudgetCell label="Groceries" v="€180/€250" />
        <BudgetCell label="Eating out" v="€95/€80 ⚠" color="var(--terra)" />
        <BudgetCell label="Savings" v="28%" color="var(--sage)" />
      </div>
    </section>
  );
}

function BudgetCell({ label, v, color }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 4px", background: "var(--surface-2)", borderRadius: 8 }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color || "var(--text)", marginTop: 2 }}>{v}</div>
    </div>
  );
}

function LifeDiscover() {
  return (
    <>
      <section className="card">
        <div className="lbl"><AgentDot id="ivy"/> Ivy · Tonight in Dublin</div>
        <DiscoverRow title="Contemporary art opening" sub="Hugh Lane Gallery · free · 19:30" />
        <DiscoverRow title="Roe & Co distillery tour" sub="The Liberties · €30 · 20:00" />
        <DiscoverRow title="Yoga at Flow studio" sub="Smithfield · €18 · 19:00" />
      </section>
      <section className="card">
        <div className="lbl"><AgentDot id="bea"/> Bea · Hobby nudge</div>
        <p style={{ fontSize: 13 }}>You haven't played guitar in 9 days. 15-minute session tonight would keep the streak warm.</p>
      </section>
    </>
  );
}

function DiscoverRow({ title, sub }) {
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>
    </div>
  );
}

function LifeWardrobe() {
  return (
    <section className="card">
      <div className="lbl"><AgentDot id="zara"/> Zara · Today's outfits</div>
      <div className="outfits">
        <div className="outfit"><div className="img">outfit 1</div><div className="cap">Office <small>13°C · meetings</small></div></div>
        <div className="outfit"><div className="img">outfit 2</div><div className="cap">Casual <small>13°C · home day</small></div></div>
        <div className="outfit"><div className="img">outfit 3</div><div className="cap">Evening <small>art opening</small></div></div>
      </div>
    </section>
  );
}

function LifeSocial() {
  return (
    <section className="card">
      <div className="lbl"><AgentDot id="rue"/> Rue · This week</div>
      <DiscoverRow title="Mum's birthday — Thursday" sub="Card sent? Call planned 18:00" />
      <DiscoverRow title="Catch up with Sam" sub="Overdue 23 days · draft message ready" />
      <DiscoverRow title="Adi's wedding RSVP" sub="By Friday" />
    </section>
  );
}

function LifeHome() {
  return (
    <>
      <section className="card">
        <div className="lbl"><AgentDot id="ember"/> Ember · Today</div>
        <DiscoverRow title="Laundry — whites" sub="Estimated 1.5 hrs" />
        <DiscoverRow title="Kitchen counters" sub="10 min · before bed" />
      </section>
      <section className="card">
        <div className="lbl"><AgentDot id="mira"/> Mira · Today's pick</div>
        <p style={{ fontSize: 13, fontWeight: 500 }}>"Building reliable RAG pipelines"</p>
        <p style={{ fontSize: 11.5, color: "var(--muted)" }}>14 min read · Anthropic blog · matched to your follicular focus mode</p>
      </section>
    </>
  );
}

function LifeTravel() {
  return (
    <section className="card">
      <div className="lbl"><AgentDot id="atlas"/> Atlas · Weekend ideas</div>
      <DiscoverRow title="Kerry · 2 nights" sub="€340 · budget OK per Finn" />
      <DiscoverRow title="Galway day trip" sub="€85 · train + lunch" />
    </section>
  );
}
