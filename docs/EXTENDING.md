# Extending Arc Agents — Add Your Own Agents & Stores

Arc Agents is built to be extended. You can add new agents (AI roles), new data stores, and new integrations without touching core code.

---

## Quick Start: Add a New Agent (10 minutes)

Let's say you want to add **"Ash"**, a stress-and-recovery advisor.

### Step 1: Add Agent Metadata

In `arc-ui/project/data.jsx`, find the `AGENTS` array and add:

```javascript
{
  id: 'ash',
  name: 'Ash',
  title: 'Stress & Recovery Guide',
  emoji: '🧘',
  description: 'Analyzes your stress levels, sleep quality, and recovery needs to give personalized guidance.',
  approach: 'Listens to stress indicators and workout history',
  asks: 'How stressed am I? Am I recovering well?',
  color: '#7C4DFF',
  cost: '~20 tokens',
  url: '/chat?agent=ash',
}
```

### Step 2: Create the Backend Context Builder

In `api/index.py`, add a function:

```python
def _context_ash():
    """Stress & recovery context builder"""
    phase = get_cycle_phase()
    health = get_health_log()  # sleep, HRV, mood, etc.
    workouts = get_workouts()
    
    context = f"""
You are Ash, a stress and recovery advisor.
Your role is to help {USER} understand their stress levels and recovery capacity.

Context:
- Current cycle phase: {phase}
- Sleep last night: {health.get('sleep_hours', 'not logged')} hours
- HRV: {health.get('hrv', 'unknown')} (high = good recovery)
- Workouts this week: {len(workouts)} (high volume = higher recovery need)
- Mood: {health.get('mood', 'not logged')}

Stress & recovery guidance for {phase} phase:
- Menstrual: prioritize rest, lower intensity workouts
- Follicular: increasing energy, higher intensity possible
- Ovulatory: peak stress tolerance, good for intensity
- Luteal: manage stress carefully, recovery is key

Ask clarifying questions about stress sources. Give practical recovery tips.
"""
    return {
        "system_prompt": context,
        "context_text": context,
        "model": "claude-haiku-4-5-20251001",
    }

# Register it
CONTEXT_BUILDERS['ash'] = _context_ash
```

### Step 3: Test in the UI

1. Refresh the app
2. Go to **Agents tab**
3. You should see "Ash" in the list
4. Click to chat

---

## Quick Start: Add a New Data Store (15 minutes)

Let's say you want to track **stress levels** (1-5 scale, daily).

### Step 1: Create the Store

Create `arc-ui/project/stress-store.jsx`:

```javascript
// ============================================
// Stress Store (arc-stress-v1)
// ============================================

const STRESS_STORE_KEY = 'arc-stress-v1';

function getStressEntries() {
  const data = JSON.parse(localStorage.getItem(STRESS_STORE_KEY) || '{"entries":[]}');
  return data.entries || [];
}

function addStressEntry(date, level, notes = '') {
  // level: 1-5
  if (level < 1 || level > 5) throw new Error('Stress level must be 1-5');
  
  const entries = getStressEntries();
  entries.push({
    id: Date.now().toString(),
    date,
    level,
    notes,
    logged_at: new Date().toISOString(),
  });
  
  localStorage.setItem(STRESS_STORE_KEY, JSON.stringify({ entries }));
  window.dispatchEvent(new Event('arc-stress-change'));
  return entries[entries.length - 1];
}

function getStressForDate(date) {
  const entries = getStressEntries();
  return entries.find(e => e.date === date);
}

function getAverageStress(days = 7) {
  const entries = getStressEntries();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const recent = entries.filter(e => new Date(e.date) >= cutoff);
  if (recent.length === 0) return null;
  
  const sum = recent.reduce((acc, e) => acc + e.level, 0);
  return (sum / recent.length).toFixed(1);
}

function stressContextText() {
  const today = getStressForDate(new Date().toISOString().split('T')[0]);
  const avg = getAverageStress(7);
  
  let text = 'Stress tracking:\n';
  if (today) text += `- Today: ${today.level}/5`;
  if (avg) text += `- 7-day average: ${avg}/5`;
  if (!today && !avg) text += '- No stress data logged yet';
  
  return text;
}

function useStressVersion() {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('arc-stress-change', handler);
    return () => window.removeEventListener('arc-stress-change', handler);
  }, []);
  return version;
}
```

### Step 2: Add UI Component

Add to `arc-ui/project/tabs.jsx` (in the HealthTab):

```javascript
function StressTracker() {
  const [level, setLevel] = React.useState(3);
  const [notes, setNotes] = React.useState('');
  const version = useStressVersion();
  
  const today = new Date().toISOString().split('T')[0];
  const entry = getStressForDate(today);
  
  const handleLog = () => {
    addStressEntry(today, level, notes);
    setNotes('');
  };
  
  return (
    <div className="stress-tracker">
      <h3>Stress Level</h3>
      <div className="stress-slider">
        <input
          type="range"
          min="1"
          max="5"
          value={level}
          onChange={(e) => setLevel(parseInt(e.target.value))}
        />
        <span className="stress-label">{level}/5</span>
      </div>
      <textarea
        placeholder="What's stressing you?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button onClick={handleLog}>Log Stress</button>
      {entry && <p>Today's entry: {entry.level}/5</p>}
    </div>
  );
}
```

### Step 3: Add CSS

Add to `arc-ui/project/styles.css`:

```css
.stress-tracker {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin: 1rem 0;
}

.stress-slider {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
}

.stress-slider input[type="range"] {
  flex: 1;
}

.stress-label {
  font-weight: bold;
  font-size: 1.2rem;
}

.stress-tracker textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

.stress-tracker button {
  padding: 0.5rem 1rem;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}
```

### Step 4: Wire It Into Cross-Domain Context

Edit `arc-ui/project/arc-context.jsx`:

```javascript
function buildArcSnapshot() {
  // ... existing stores ...
  
  // Add stress
  const stressEntry = getStressForDate(new Date().toISOString().split('T')[0]);
  
  return {
    // ... existing ...
    stress: stressEntry ? stressEntry.level : null,
  };
}

function snapshotText() {
  // ... existing ...
  const stress = buildArcSnapshot().stress;
  
  return `
...
Stress: ${stress ? `${stress}/5 today` : 'not logged'}
...
  `;
}
```

### Step 5: Test

1. Refresh the app
2. Go to **Health → [New Tab]**
3. See your StressTracker component
4. Log a stress level
5. Check **Council tab** → refresh → Claude now sees stress data in the context

---

## Advanced: Add a New Endpoint

Let's say you want `/api/recommend-recovery` that returns recovery tips.

### In `api/index.py`:

```python
@app.route('/api/recommend-recovery', methods=['POST'])
def recommend_recovery():
    """Recovery recommendation based on current state"""
    data = request.json
    phase = get_cycle_phase()
    health = get_health_log()
    
    context = f"""
You are a recovery advisor. Given the user's current state, recommend 1-3 recovery actions.

Current state:
- Cycle phase: {phase}
- Sleep last night: {health.get('sleep_hours')} hours
- HRV: {health.get('hrv')}
- Stress: {data.get('stress', 'unknown')}/5
- Workouts this week: {data.get('workouts_week', '?')}

Recommend practical recovery actions (e.g., "Take a walk", "Drink water", "Sleep earlier").
Keep it short (2-3 sentences max).
"""
    
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=context,
        messages=[{"role": "user", "content": "What should I do to recover today?"}],
    )
    
    return {
        "recommendation": response.content[0].text,
        "usage": _usage(response),
    }
```

### In the UI:

```javascript
async function getRecoveryRecommendation(stress, workoutsWeek) {
  const response = await fetch('/api/recommend-recovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stress, workouts_week: workoutsWeek }),
  });
  return response.json();
}

// Use it:
const rec = await getRecoveryRecommendation(4, 3);
console.log(rec.recommendation);
```

---

## Patterns to Follow

### Naming Conventions

- **Stores**: `arc-{{domain}}-v{{version}}` (e.g., `arc-stress-v1`)
- **Functions**: `{{verb}}{{Domain}}` (e.g., `addStressEntry`, `getStressForDate`)
- **Events**: `arc-{{domain}}-change` (e.g., `arc-stress-change`)
- **Agents**: lowercase, short (e.g., `ash`, `nora`, `felix`)

### Store Pattern

```javascript
const STORE_KEY = 'arc-{{domain}}-v1';

function get{{Domain}}() {
  return JSON.parse(localStorage.getItem(STORE_KEY) || '{"entries":[]}');
}

function add{{Domain}}(data) {
  const store = get{{Domain}}();
  store.entries.push(data);
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event('arc-{{domain}}-change'));
}

function use{{Domain}}Version() {
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setVersion(v => v + 1);
    window.addEventListener('arc-{{domain}}-change', handler);
    return () => window.removeEventListener('arc-{{domain}}-change', handler);
  }, []);
  return version;
}
```

### Agent Pattern

```python
def _context_{{agent_id}}():
    """{{Agent name}} context builder"""
    phase = get_cycle_phase()
    # Read relevant data
    data = get_{{domain}}()
    
    system_prompt = f"""
You are {{name}}, a {{role}}.
Your approach: {{approach}}.

Context:
- Cycle phase: {phase}
- {{relevant data}}

Give personalized advice for {{domain}}.
"""
    return {
        "system_prompt": system_prompt,
        "context_text": system_prompt,
        "model": "claude-haiku-4-5-20251001",
    }

CONTEXT_BUILDERS['{{agent_id}}'] = _context_{{agent_id}}
```

---

## Testing Your Extension

1. **Add to demo data**: So new users see it working
2. **Test locally**: `python api/index.py` → refresh → verify
3. **Check token cost**: Is your new agent expensive? (> 500 tokens per request = rethink)
4. **Test integration**: Make sure it shows up in cross-domain context
5. **Write a test**: See `docs/TESTING.md` (coming soon)

---

## Common Questions

**Q: Can I add a new agent without adding a data store?**  
A: Yes. Agent just reads existing stores (health, meals, workouts, etc.) and synthesizes.

**Q: Can I modify system prompts?**  
A: Yes. They're in `api/index.py` (CONTEXT_BUILDERS functions) and `arc-ui/project/data.jsx` (agent metadata).

**Q: Can I add multiple versions of the same store?**  
A: Not recommended. Instead, extend the existing store (add fields) or create a new domain.

**Q: How do I handle breaking changes?**  
A: Increment the version (`arc-stress-v1` → `arc-stress-v2`) and add a migration function.

**Q: Can I sync my new store to Google Sheets?**  
A: Yes, add it to `sync-store.jsx` with a serialize/deserialize pair.

---

## Next Steps

1. Fork the repo
2. Pick a domain (sleep optimization? meal planning? fitness coaching?)
3. Create a store + agent + UI component
4. Test locally
5. Open a PR or share your fork

---

For more help, see:
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the system works
- [`docs/AGENTS.md`](AGENTS.md) — detailed agent descriptions
- `arc-ui/project/data.jsx` — existing agent examples
