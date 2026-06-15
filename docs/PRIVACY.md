# Privacy & Security Policy

## TL;DR

✅ **All your health data stays in your browser** (never sent to our servers)  
✅ **No user database** (you own your data)  
✅ **Only your API key talks to Claude** (encrypted in transit, never logged)  
✅ **Demo data is clearly marked** (different styling, watermark)  
✅ **Completely offline-first** (app works with 0 internet)  
✅ **Optional Google Sheets sync** (only if you enable it)  
✅ **No telemetry, no tracking, no ads**  

---

## Data Storage

### Browser Storage (localStorage)

All your personal health data lives **only** in your browser's localStorage:

- Health log (sleep, HRV, HR, symptoms, blood tests, body metrics)
- Meals & recipes
- Pantry & grocery list
- Supplements & dosing
- Skincare & cupboard
- Schedule & chores
- Workouts & feedback
- Water intake
- Work stamps

**This data is:**
- Not sent to our servers
- Not encrypted (browser localStorage is per-domain, isolated by browser)
- Not backed up (if you clear browser data, it's gone)
- Not shared with third parties

### Google Sheets (Optional)

If you enable cloud sync in Settings:
- **Only if you explicitly turn it on**
- You must provide your own Google service account credentials
- We don't store your credentials (you paste them directly)
- We never access your Sheets without your explicit action (Sync/Restore buttons)
- You control the spreadsheet (it's in your Google account)

**This is your backup mechanism.** If you want offline-first privacy, don't enable it.

### Google Calendar (Optional)

Same as Google Sheets:
- **Only if you explicitly enable it**
- Your own credentials
- We create events only when you click the 📅 button on schedule items
- You control the calendar

---

## API Communication

### What Gets Sent to Anthropic

When you chat with an agent or trigger synthesis:

```
POST /api/chat
{
  "message": "What should I eat today?",
  "system_prompt": "[Agent-specific guidance]",
  "context_text": "[Your health snapshot from localStorage]",
  "client_context": "[Personal data from your stores]"
}
```

**In plain English:**
- Your message
- The agent's role (e.g., "You are Nora, a nutrition advisor")
- A summary of your health data (phase, sleep, workout, etc.)
- Your personal pantry/meal data

**What does NOT get sent:**
- Your email
- Your identity
- Your credentials
- Raw health_log.json

**Is it encrypted?**
- Yes, HTTPS (TLS) on Vercel

**Can Anthropic see it?**
- Yes, they process your message + context to generate a response
- Per Anthropic API terms, inputs may be used to improve Claude (unless you have an enterprise agreement)
- You can disable API logging in your Anthropic dashboard (settings → "Don't store conversations")

### What Gets Returned

Claude returns a response + token count:

```
{
  "text": "[Agent's recommendation]",
  "usage": {
    "input_tokens": 512,
    "output_tokens": 256
  }
}
```

Token counts are captured locally (in `arc-tokens-v1` localStorage store) for transparency, not sent back to us.

---

## What We (The Maintainers) See

**We see:**
- GitHub stars, forks, issues
- Nothing else

**We don't see:**
- Any of your health data
- Which agent you asked
- Your responses
- Your API usage
- Your identity

This is a truly **zero-knowledge** architecture.

---

## Data Deletion

You can delete your data in three ways:

1. **In-app**: Settings → "Clear All Data" (clears localStorage)
2. **Browser settings**: Clear browser data → cookies & cache → Arc Agents.html
3. **Hard reset**: localStorage.clear() in browser console

**Once deleted, it's gone.** (We don't have a copy.)

If you used Google Sheets sync, you'll also need to delete the spreadsheet in Google Drive.

---

## Security Measures

### API Key Handling

- Your `ANTHROPIC_API_KEY` is stored in Vercel environment variables
- Never exposed to the browser
- Never logged or transmitted except to Anthropic API
- Only our serverless function can access it

### Frontend Security

- No inline eval, no dynamic code execution
- All code is open-source (no hidden trackers)
- Content Security Policy: no external scripts loaded
- API responses are validated before use

### localStorage Security

- Per-browser, per-domain isolation
- Not accessible from other websites
- Clear-text (not encrypted), but:
  - Only readable by code running on arc-agents.vercel.app
  - Browser treats it as secure per-domain

**If your device is compromised** (malware, physical access), localStorage can be read. This is inherent to browser storage. If this is a concern, use a separate browser profile or device for sensitive health tracking.

### Vercel Hosting

- Automatic HTTPS (TLS 1.2+)
- DDoS protection
- Automatic security updates
- Serverless = no persistent state = nothing to hack

See Vercel's [trust center](https://vercel.com/trust).

---

## Demo Data

The app ships with demo data for testing. It's clearly marked:

- Demo entries show a watermark: "DEMO MODE"
- Different styling (gray, muted colors)
- Settings tab explains it's demo data
- One-click "Load Demo Data" to reset

Demo data includes:
- Sample meals (oatmeal, chicken breast, greek yogurt, etc.)
- Sample schedule
- Sample supplements
- Sample workouts & sleep logs

**No real health data is included.** The demo is designed so you can see the app in action without worrying about privacy.

---

## Regional Considerations

### GDPR (if you're in the EU)

✅ **Compliant**:
- No personal data sent to us (only to Anthropic)
- You control all your data (in localStorage)
- Easy data deletion (one click)
- No cookies or tracking

⚠️ **Gray area**:
- Anthropic is US-based, data goes to US servers (Anthropic has their own privacy policy)
- If you want to stay in EU, don't use the Anthropic API integration (use the offline mode)

### CCPA (if you're in California)

✅ **Compliant**:
- We don't collect personal information
- No third-party data sharing (you decide if you sync to Google)
- Right to delete (Settings → "Clear All Data")

### Other Regions

Check your local laws. Arc Agents is designed to be privacy-first, so it's likely compliant with most regulations. If you have specific concerns, consult your legal team.

---

## Third-Party Services

### Anthropic (Claude API)

- **What you send**: Your messages + health context
- **What they do**: Generate responses
- **Privacy policy**: [anthropic.com/privacy](https://www.anthropic.com/privacy)
- **How to disable**: Don't use Arc Agents (or don't enable API, read docs offline)

### Google (Sheets & Calendar, optional)

- **What you send**: Only if you enable sync (your choice)
- **What they do**: Store your spreadsheet & calendar events
- **Privacy policy**: [google.com/privacy](https://www.google.com/privacy)
- **How to disable**: Don't enable cloud sync in Settings

### Vercel (Hosting)

- **What they see**: HTTP logs (IP, URL, timestamp, response code—standard web server logs)
- **What they don't see**: Your requests' content (encrypted in transit)
- **Privacy policy**: [vercel.com/privacy](https://vercel.com/privacy)
- **How to disable**: Self-host locally (see SETUP.md)

---

## Minimum Data Collection

Arc Agents collects **zero data** about you or usage, except:

- **Errors**: If the app crashes, Vercel logs the error (standard server behavior)
- **Usage metrics**: You can see your own token usage in Agents tab (cached locally, never sent to us)

That's it. No analytics, no metrics, no tracking.

---

## Open Source = Trust

The entire codebase is public on GitHub. You can:
- Audit the system prompts (are they doing what they claim?)
- Audit the API routes (what gets sent where?)
- Audit the localStorage stores (what data is stored where?)
- Self-host locally (run your own copy)
- Fork and modify (build your own version)

If something looks wrong, open an issue. Or fork and fix it yourself.

---

## Incident Response

If a security issue is discovered:

1. **Reporting**: Open a private security advisory on GitHub (don't post publicly)
2. **Investigation**: We'll assess the impact
3. **Fix**: We'll patch and deploy (usually within 24-48 hours)
4. **Notification**: We'll post an advisory explaining the issue + mitigation steps

For users who self-host: pull the latest code.

---

## Terms of Use (TL;DR)

1. **Personal use only**: Arc Agents is for personal health tracking, not commercial use
2. **No medical advice**: This is not a medical device. Don't replace your doctor with Claude.
3. **No liability**: We're not responsible if something goes wrong (you own the code + your data)
4. **Attribution**: If you fork, please credit the original (MIT license)
5. **No warranty**: "As-is" software, no SLA, no guarantees

For full legal details, see LICENSE.

---

## Questions?

- **"Is my data really safe?"** Yes. Open the browser DevTools (F12) and look at localStorage. Your data is there, not on our servers.
- **"What if Arc Agents shuts down?"** Your data stays in your browser. The app will work locally forever.
- **"Can I self-host?"** Yes. See SETUP.md for local/Docker setup. You control everything.
- **"What if you get hacked?"** We don't have your data. Hackers would see HTTP logs, not your health logs.
- **"Can I download my data?"** Yes. localStorage is JSON. Export it manually (Settings → Data Export) or write a script to read it.

---

## Privacy Checklist

Before using Arc Agents, verify:

- [ ] You understand localStorage is per-browser
- [ ] You're okay with your context being sent to Anthropic (or you're self-hosting)
- [ ] You've read Anthropic's privacy policy
- [ ] You're not using this as a medical device
- [ ] You have a backup strategy (optional Google Sheets sync, or manual export)
- [ ] You understand demo data is included and should be deleted before adding real data

---

**Last updated**: 2026-06-15  
**Version**: 1.0  
**License**: Same as Arc Agents (MIT)
