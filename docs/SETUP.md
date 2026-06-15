# Setup & Deployment Guide

## Local Development (5 minutes)

### Prerequisites

- Python 3.9+
- A terminal
- `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/arc-agents-public.git
cd arc-agents-public

# 2. Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables
export ANTHROPIC_API_KEY=sk-ant-...

# 5. Run the app
python api/index.py

# 6. Open your browser
# http://localhost:5000
```

That's it. The Flask app serves both the API (`/api/*`) and the SPA (`/`).

### First Use

1. **Load demo data**: Settings tab → "Load Demo Data" → play around
2. **Chat with an agent**: Click "Nora" (nutrition) → ask "What should I eat today?"
3. **View synthesis**: Go to Council tab → click ↻ to refresh (generates real Aurora/Council synthesis)
4. **Log real data**: Health tab → Data sub-tab → fill in today's vitals
5. **Check token usage**: Agents tab → scroll down → see real token costs

---

## Vercel Deployment (10 minutes)

### Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- GitHub repo forked/pushed
- `ANTHROPIC_API_KEY` ready

### Steps

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Follow prompts
# → Link to GitHub repo
# → Deploy to production
# → Set environment variables (see below)

# 4. Verify
# Open the Vercel dashboard, your app is live
```

### Environment Variables (Vercel Dashboard)

Go to **Settings → Environment Variables**:

**Required:**
- `ANTHROPIC_API_KEY`: Your Claude API key

**Optional (for Google Sheets + Calendar sync):**
- `GOOGLE_SHEETS_ID`: Your spreadsheet ID (from the URL)
- `GOOGLE_SHEETS_CREDENTIALS`: Full service account JSON (copy from Google Cloud)
- `GOOGLE_CALENDAR_ID`: Your email address (e.g., you@gmail.com)

### Example Vercel Deploy Output

```
✔ Linked to yourname/arc-agents-public (created .vercel/)
✔ Inspect: https://vercel.com/yourname/arc-agents-public/...
✔ Production: https://arc-agents-prod.vercel.app [in 3s]

Visit https://arc-agents-prod.vercel.app to see your live app
```

---

## Self-Hosted (Docker, 15 minutes)

### Prerequisites

- Docker & Docker Compose installed
- `ANTHROPIC_API_KEY` ready

### Dockerfile

Create `Dockerfile` in the repo root:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY arc-ui/ ./arc-ui/

ENV FLASK_ENV=production
ENV ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

EXPOSE 5000

CMD ["python", "api/index.py"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  arc:
    build: .
    ports:
      - "5000:5000"
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      GOOGLE_SHEETS_ID: ${GOOGLE_SHEETS_ID:-}
      GOOGLE_SHEETS_CREDENTIALS: ${GOOGLE_SHEETS_CREDENTIALS:-}
      GOOGLE_CALENDAR_ID: ${GOOGLE_CALENDAR_ID:-}
    volumes:
      - ./arc-ui/project:/app/arc-ui/project  # Live edit
```

### Run

```bash
# 1. Set env vars
export ANTHROPIC_API_KEY=sk-ant-...

# 2. Build and run
docker-compose up

# 3. Open browser
# http://localhost:5000
```

### For Production

Add reverse proxy (nginx), SSL (Let's Encrypt), and monitoring as needed.

---

## Google Sheets Integration (Optional)

### Why?

Cloud backup of your health data. If you enable sync, your stores are mirrored to Google Sheets.

### Setup

#### Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g., "Arc Agents")
3. Enable **Google Sheets API** (search for it, click Enable)
4. Enable **Google Calendar API** (if you want calendar sync)

#### Step 2: Create a Service Account

1. Go to **Credentials** (left sidebar)
2. Click **Create Credentials** → Service Account
3. Fill in: Name: "arc-agents", Description: "Personal health app"
4. Click **Create and Continue**
5. Grant role: **Editor** (to access Sheets + Calendar)
6. Click **Continue** → **Done**

#### Step 3: Get the Key

1. Click the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → Create New Key → **JSON**
4. Copy the entire JSON (you'll paste this into Vercel)

#### Step 4: Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new sheet (name: "Arc Agents Backup")
3. In the URL, copy the ID: `https://docs.google.com/spreadsheets/d/[ID-HERE]/...`
4. Share the sheet with the service account email (from the JSON)

#### Step 5: Configure Arc Agents

Local (`.env`):
```bash
GOOGLE_SHEETS_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"arc-agents-123",...}'
```

Vercel (Settings → Environment Variables):
- `GOOGLE_SHEETS_ID`: Your spreadsheet ID
- `GOOGLE_SHEETS_CREDENTIALS`: The full service account JSON

#### Step 6: Test

1. Open Arc Agents
2. Settings → Cloud Sync → Seed (populates the sheet with demo data)
3. Check your Google Sheet → should see columns for each store
4. Make a change in Arc → Cloud Sync → Sync → check the sheet
5. Make a change in the sheet → Cloud Sync → Restore → should appear in Arc

---

## Google Calendar Integration (Optional)

Similar to Google Sheets:

1. Same Google Cloud Project (if already set up for Sheets)
2. Same Service Account (already created)
3. In Arc Agents, each schedule item with a time gets a 📅 button
4. Click it → creates/updates a Google Calendar event
5. Calendar ID: your email address (e.g., you@gmail.com)

---

## Environment Variable Reference

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | ✅ Yes | `sk-ant-...` | Claude API access |
| `GOOGLE_SHEETS_ID` | ❌ No | `1AbCdEfGhIjKlMnOpQrStUvWxYz` | Sheets sync (optional) |
| `GOOGLE_SHEETS_CREDENTIALS` | ❌ No | `{"type":"service_account",...}` | Service account JSON |
| `GOOGLE_CALENDAR_ID` | ❌ No | `you@gmail.com` | Calendar sync (optional) |
| `FLASK_ENV` | ❌ No | `production` | Flask mode (default: development) |
| `DEMO_MODE` | ❌ No | `false` | Load demo data on startup |

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'flask'"

You didn't install dependencies.

```bash
pip install -r requirements.txt
```

### "ANTHROPIC_API_KEY not set"

Environment variable not exported.

```bash
export ANTHROPIC_API_KEY=sk-ant-...  # Linux/Mac
set ANTHROPIC_API_KEY=sk-ant-...     # Windows CMD
$env:ANTHROPIC_API_KEY="sk-ant-..."  # Windows PowerShell
```

### "Address already in use :5000"

Another app is using port 5000. Either:
1. Kill the other process: `lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9`
2. Use a different port: `python api/index.py --port 8000`

### "Google Sheets sync not working"

1. Did you set `GOOGLE_SHEETS_ID` and `GOOGLE_SHEETS_CREDENTIALS`?
2. Did you share the sheet with the service account email?
3. Check browser console (F12) → Network tab → see what error the API returns

### "Vercel deploy failing"

1. Check you have `vercel.json` in the root
2. Check `api/index.py` exists
3. Check requirements.txt is up to date: `pip freeze > requirements.txt`
4. View logs in Vercel dashboard: Deployments → Failed → Logs

---

## Next Steps

1. ✅ **Load demo data** (Settings tab)
2. ✅ **Chat with an agent** (Nora, Felix, etc.)
3. ✅ **Log real data** (Health → Data sub-tab)
4. ✅ **Review synthesis** (Council tab)
5. ✅ **Set up optional sync** (Google Sheets + Calendar)

---

## Questions?

- **Local dev?** See this file, or raise an issue
- **Deploy problems?** Check Vercel logs
- **Google integration?** Verify service account has Sheets + Calendar API enabled
- **Everything else?** Check `docs/ARCHITECTURE.md` or `docs/FAQ.md`
