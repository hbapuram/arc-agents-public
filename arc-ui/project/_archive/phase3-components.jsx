/* Phase 3 Components: Goals, Habits, Proposals, Feedback Loop */
/* Styles live in styles.css (scoped under .goal-cascade / .habit-tracker /
   .proposal-card / .feedback-loop). Do NOT use <style jsx> here — styled-jsx
   is not active in this plain-React/Babel-standalone setup and would leak
   unscoped global rules. */

// ═══════════════════════════════════════════════════════════════════════════════
// GOAL CASCADE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function GoalCascade() {
  const goals = [
    { id: 1, level: "annual",    name: "Build autonomous life OS",          progress: 35,  icon: "🎯", color: "--blue" },
    { id: 2, level: "quarterly", name: "Master health data integration",    progress: 60,  icon: "⚕️", color: "--sage" },
    { id: 3, level: "quarterly", name: "Establish fitness routine",         progress: 75,  icon: "💪", color: "--blue" },
    { id: 4, level: "weekly",    name: "Log meals 5/7 days",                progress: 100, icon: "🍎", color: "--sage" },
    { id: 5, level: "weekly",    name: "3 workouts + 2 recovery",           progress: 80,  icon: "🏃", color: "--blue" },
    { id: 6, level: "daily",     name: "Morning routine + meditation",      progress: 90,  icon: "🧘", color: "--lav" },
  ];

  return (
    <div className="goal-cascade">
      <div className="section-header">
        <h2>Goal Cascade</h2>
        <p className="section-desc">Annual → Quarterly → Weekly → Daily</p>
      </div>

      <div className="goal-list">
        {goals.map(g => (
          <div key={g.id} className="goal-item" data-level={g.level}>
            <div className="goal-left">
              <span className="goal-icon">{g.icon}</span>
              <div>
                <div className="goal-name">{g.name}</div>
                <div className="goal-level">{g.level}</div>
              </div>
            </div>
            <div className="goal-progress">
              <div className="progress-ring">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="2" fill="none"/>
                  <circle cx="20" cy="20" r="18" stroke={`var(${g.color})`} strokeWidth="2" fill="none"
                    strokeDasharray={`${113.097 * g.progress / 100} 113.097`}
                    strokeLinecap="round"
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                <div className="progress-text">{g.progress}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HABIT TRACKER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const HABITS_STORAGE_KEY = "arc-habits-v1";
const HABIT_EMOJIS = ["🌅","🧘","🍎","💧","💪","🏃","😴","📖","🧠","🥗","🚶","🧴","💊","✍️","🙏","🎯","🌙","☀️"];

const DEFAULT_HABITS = [
  { id: 1, name: "Morning routine", emoji: "🌅", completed: [true, true, false, true, true, true, false] },
  { id: 2, name: "Meditation", emoji: "🧘", completed: [false, true, true, false, true, true, true] },
  { id: 3, name: "Log meals", emoji: "🍎", completed: [true, true, true, true, true, false, false] },
  { id: 4, name: "Water intake", emoji: "💧", completed: [true, true, true, true, true, true, true] },
  { id: 5, name: "Workout", emoji: "💪", completed: [true, false, true, true, false, true, false] },
];

function loadHabits() {
  try {
    const raw = window.localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return DEFAULT_HABITS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (e) { /* fall through */ }
  return DEFAULT_HABITS;
}

function HabitTracker() {
  const [habits, setHabits] = React.useState(loadHabits);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState(HABIT_EMOJIS[0]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6

  React.useEffect(() => {
    try { window.localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits)); }
    catch (e) { /* ignore quota errors */ }
  }, [habits]);

  const toggle = (habitId, dayIdx) => {
    setHabits(habits.map(h => h.id === habitId
      ? { ...h, completed: h.completed.map((c, i) => i === dayIdx ? !c : c) }
      : h));
  };

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    const id = (habits.reduce((m, h) => Math.max(m, h.id), 0) || 0) + 1;
    setHabits([...habits, { id, name, emoji: newEmoji, completed: [false, false, false, false, false, false, false] }]);
    setNewName("");
    setNewEmoji(HABIT_EMOJIS[0]);
    setAdding(false);
  };

  const removeHabit = (id) => setHabits(habits.filter(h => h.id !== id));

  return (
    <div className="habit-tracker">
      <div className="section-header">
        <h2>Weekly Habits</h2>
        <p className="section-desc">Tap a cell to toggle · add your own below</p>
      </div>

      <div className="habits-grid">
        <div className="day-headers">
          <div className="habit-name"></div>
          {days.map((day, i) => (
            <div key={day} className="day-header" data-today={i === today ? "true" : "false"}>
              {day}
            </div>
          ))}
        </div>

        {habits.map(habit => (
          <div key={habit.id} className="habit-row">
            <div className="habit-label">
              <span className="habit-emoji">{habit.emoji}</span>
              <span className="habit-name">{habit.name}</span>
              <button
                type="button"
                className="habit-remove"
                aria-label={`Remove ${habit.name}`}
                title="Remove habit"
                onClick={() => removeHabit(habit.id)}
              >×</button>
            </div>
            {habit.completed.map((done, i) => (
              <button
                key={i}
                type="button"
                className="habit-cell"
                data-done={done ? "true" : "false"}
                data-today={i === today ? "true" : "false"}
                aria-label={`${habit.name}, ${days[i]}: ${done ? "done" : "not done"}`}
                aria-pressed={done}
                onClick={() => toggle(habit.id, i)}
              >
                {done ? "✓" : ""}
              </button>
            ))}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="habit-add-form">
          <div className="habit-emoji-picker">
            {HABIT_EMOJIS.map(em => (
              <button
                key={em}
                type="button"
                className="emoji-option"
                data-selected={em === newEmoji ? "true" : "false"}
                aria-label={`Use ${em}`}
                aria-pressed={em === newEmoji}
                onClick={() => setNewEmoji(em)}
              >{em}</button>
            ))}
          </div>
          <div className="habit-add-row">
            <input
              type="text"
              className="habit-name-input"
              placeholder="New habit name…"
              value={newName}
              maxLength={28}
              autoFocus
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
            />
            <button type="button" className="habit-add-confirm" onClick={addHabit} disabled={!newName.trim()}>Add</button>
            <button type="button" className="habit-add-cancel" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="habit-add-trigger" onClick={() => setAdding(true)}>
          + Add habit
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSAL CARD COMPONENT (Lyra's habit suggestions)
// ═══════════════════════════════════════════════════════════════════════════════

function ProposalCard() {
  const [proposals, setProposals] = React.useState([
    { id: 1, agent: "Lyra", suggestion: "Add evening wind-down routine", reason: "You're sleeping 6.5 hours on average. A 30-min wind-down could improve sleep quality.", status: null },
    { id: 2, agent: "Lyra", suggestion: "Increase water intake to 3L", reason: "Cycle phase (luteal) needs more hydration. Current intake is 2.2L/day.", status: null },
    { id: 3, agent: "Lyra", suggestion: "Add magnesium supplement", reason: "Low energy in luteal phase. Magnesium glycinate 350mg evening could help.", status: "approved" },
  ]);

  const handleProposal = (id, status) => {
    setProposals(proposals.map(p => p.id === id ? { ...p, status } : p));
  };

  return (
    <div className="proposal-card">
      <div className="section-header">
        <h2>Lyra's Suggestions</h2>
        <p className="section-desc">Weekly habit change proposals</p>
      </div>

      <div className="proposals-list">
        {proposals.map(p => (
          <div key={p.id} className="proposal-item" data-status={p.status || "pending"}>
            <div className="proposal-header">
              <div className="proposal-suggestion">{p.suggestion}</div>
              {p.status && (
                <div className="proposal-status">
                  {p.status === "approved" && "✓ Approved"}
                  {p.status === "declined" && "✗ Declined"}
                  {p.status === "modified" && "~ Modified"}
                </div>
              )}
            </div>
            <div className="proposal-reason">{p.reason}</div>
            {!p.status && (
              <div className="proposal-actions">
                <button className="btn-approve" onClick={() => handleProposal(p.id, "approved")}>Approve</button>
                <button className="btn-modify" onClick={() => handleProposal(p.id, "modified")}>Modify</button>
                <button className="btn-decline" onClick={() => handleProposal(p.id, "declined")}>Decline</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK LOOP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function FeedbackLoop() {
  const [feedback, setFeedback] = React.useState([
    { id: 1, week: "Week of May 18-24", question: "What worked well this week?", answer: "Morning workouts, consistent meditation, good sleep Thu-Sat", mood: "positive" },
    { id: 2, week: "Week of May 11-17", question: "What was challenging?", answer: "Energy crashes mid-afternoon, skipped 2 workouts", mood: "neutral" },
  ]);

  const moodEmoji = { positive: "✨", neutral: "→", challenging: "⚠️" };

  return (
    <div className="feedback-loop">
      <div className="section-header">
        <h2>Feedback Loop</h2>
        <p className="section-desc">Weekly reflections from Lyra</p>
      </div>

      <div className="feedback-list">
        {feedback.map(fb => (
          <div key={fb.id} className="feedback-item" data-mood={fb.mood}>
            <div className="feedback-meta">
              <span className="feedback-emoji">{moodEmoji[fb.mood] || "→"}</span>
              <span className="feedback-week">{fb.week}</span>
            </div>
            <div className="feedback-question">{fb.question}</div>
            <div className="feedback-answer">{fb.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS TAB (combines all Phase 3 components)
// ═══════════════════════════════════════════════════════════════════════════════

function GoalsTab() {
  return (
    <div id="panel-goals" role="tabpanel" aria-labelledby="tab-goals">
      <GoalCascade />
      <div style={{ height: "12px" }}></div>
      <HabitTracker />
      <div style={{ height: "12px" }}></div>
      <ProposalCard />
      <div style={{ height: "12px" }}></div>
      <FeedbackLoop />
    </div>
  );
}

// Export for use in app.jsx
Object.assign(window, {
  GoalCascade,
  HabitTracker,
  ProposalCard,
  FeedbackLoop,
  GoalsTab
});
