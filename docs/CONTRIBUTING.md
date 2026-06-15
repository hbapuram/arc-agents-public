# Contributing to Arc Agents

Thanks for your interest! This project welcomes contributions of all kinds.

## How to Contribute

### 1. Report a Bug

Found something broken? Open an issue on GitHub with:
- **What you did**: Steps to reproduce
- **What happened**: The bug
- **What you expected**: Desired behavior
- **Environment**: Browser, OS, Python version

### 2. Suggest a Feature

Have an idea? Open an issue with:
- **Problem**: What's missing or hard?
- **Solution**: Your idea
- **Alternative**: Have you considered other approaches?

Please search existing issues first (might already be planned).

### 3. Contribute Code

**For small fixes** (typos, one-liners):
1. Fork the repo
2. Make the change
3. Open a PR with a clear description

**For new features** (agents, stores, integrations):
1. Open an issue first (discuss design)
2. Wait for feedback
3. Fork and implement
4. Open a PR

See [`EXTENDING.md`](EXTENDING.md) for patterns and best practices.

### 4. Improve Docs

- Spotted unclear explanations?
- Found a broken link?
- Have a better example?

Open a PR! Docs are just `.md` files in `docs/`.

### 5. Share Your Experience

Built something with Arc? Found a cool use case? Have feedback? Share in discussions or open an issue.

---

## Development Setup

```bash
git clone https://github.com/yourusername/arc-agents-public.git
cd arc-agents-public

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run locally
export ANTHROPIC_API_KEY=sk-ant-...
python api/index.py

# Open http://localhost:5000
```

## Code Style

- **Python**: PEP 8 (use `black` if you have it)
- **JavaScript**: Standard JavaScript (2-space indent, no semicolons)
- **CSS**: BEM-like naming (`block-element--modifier`)
- **Comments**: Only if *why* is non-obvious

## Testing

```bash
# Manual testing
# 1. Load demo data
# 2. Log a real entry
# 3. Chat with an agent
# 4. Check Council tab
# 5. Test token tracking

# If you add a new agent:
# - Does it show up in the Agents list?
# - Does context injection work?
# - Can you chat with it?

# If you add a new store:
# - Do entries persist in localStorage?
# - Do events fire on change?
# - Does it show up in Council context?
```

## PR Guidelines

- **Title**: Short, imperative ("Add stress tracker", not "Adds stress tracker")
- **Description**: What, why, how (reference issue if applicable)
- **Changes**: One feature per PR (easier to review)
- **Testing**: Mention how you tested it

Example:

```
Add stress tracker agent (Ash)

Closes #42

## What
Added Ash agent for stress & recovery recommendations.
Also added `arc-stress-v1` store for daily 1-5 stress logging.

## Why
Users wanted advice tailored to stress levels + recovery needs.
Stress feeds into Aurora/Council synthesis.

## How
- New agent in data.jsx + context builder in api/index.py
- New store in stress-store.jsx + UI in tabs.jsx
- Integrated into arc-context.jsx (snapshotText, buildArcSnapshot)
- Token cost: ~30 tokens per request

## Testing
- [x] Logged stress level, persists in localStorage
- [x] Ash sees stress in context
- [x] Council synthesis mentions stress
- [x] Demo data includes sample stress entries
```

## Getting Help

- **Questions?** Open a discussion on GitHub
- **Stuck?** Comment on the PR or issue
- **Security issue?** Open a private security advisory on GitHub (don't post publicly)

---

## What We're Looking For

- **New agents**: Stress, recovery, meal timing, injury prevention, etc.
- **Data stores**: Injury tracking, water intake, caffeine timing, mindfulness
- **Integrations**: Real Apple Health, Oura, Whoop, MyFitnessPal, Cronometer
- **UI polish**: Mobile responsiveness, dark mode, accessibility (a11y)
- **Docs**: Tutorials, architecture docs, troubleshooting guides
- **Examples**: Demo use cases, example workflows, real-world scenarios

## What We're Not Looking For

- **Auth/user databases**: Arc is personal-first, single-user
- **Commercial features**: Meal tracking should stay free
- **Breaking changes**: We'll discuss before merging
- **Telemetry/analytics**: Privacy-first means no tracking

---

## Branches

- `main`: Production code (always stable)
- `develop`: Active development (if you want to PR there)
- Feature branches: `feature/your-feature-name`

## Commit Messages

```
Short summary (50 chars max)

Longer explanation if needed (wrap at 72 chars).
Mention issue numbers: Closes #42, Related to #17.

- Use bullet points for multiple changes
- Be specific (not "fix bug", but "fix off-by-one in phase calc")
```

## License

By contributing, you agree your work will be MIT licensed. See `LICENSE`.

---

## Recognition

We'll mention contributors in:
- GitHub contributors page
- README (if major contribution)
- Release notes (with your permission)

## Questions?

Open a discussion on GitHub or submit an issue.

Thank you for contributing to Arc Agents! 🎉
