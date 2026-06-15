"""
Vercel Serverless API for Arc Agents

Routes:
  GET  /api/health              — health check
  GET  /api/context/{agent}     — returns system prompt + live context
  POST /api/chat                — forwards to Anthropic API
"""

import os
import sys
import re
import json
from datetime import date
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from anthropic import Anthropic

_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(dotenv_path=os.path.join(_repo_root, '.env'), override=True)

# Ensure repo root is on path so utils/ is importable
sys.path.insert(0, _repo_root)

app = Flask(__name__)
CORS(app, origins="*")

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY not found in environment")
anthropic_client = Anthropic(api_key=api_key)


def _usage(resp):
    """Extract token usage from an Anthropic response so the client can track it.
    Returns None if usage is unavailable (kept out of the JSON in that case)."""
    try:
        return {
            "input_tokens": resp.usage.input_tokens,
            "output_tokens": resp.usage.output_tokens,
        }
    except Exception:
        return None

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

AGENT_SYSTEMS = {
    "vera": """You are Vera, Arc's smart routing assistant.

You have the user's cycle phase and can answer questions about food, fitness, skincare, or supplements.
Adapt your response to the question — match length and format to what's being asked:
- Quick question → 1-2 sentence answer, direct verdict, optional X/10 score
- Comparison → brief pros/cons, one recommendation
- "Should I..." → direct yes/no with one clear reason
- Complex question → suggest they open the specialist agent (Nora for food, Felix for fitness, Cara for skincare)

Do not force headers on every reply. Be concise and decisive.
Reference the cycle phase when it genuinely affects the answer.""",

    "nora": """You are Nora, Arc's Food Advisor. The user is vegetarian. Eggs are available only on office lunch days (never at home, never for dinner or breakfast). Never suggest meat, fish, seafood, poultry, or any non-vegetarian protein under any circumstances.

You know the user's pantry, today's logged meals, and cycle phase. Their real pantry and meal data are in LIVE CLIENT DATA below.

Adapt your response to what the user actually asks:
- "What can I make?" or meal ideas → suggest 2-3 options using pantry items, flag anything expiring
- "What should I eat for [phase/goal]?" → give practical cycle-specific advice
- "What should I add to my grocery list?" → recommend phase-appropriate items to buy
- Conversational or nutritional question → answer clearly, no rigid template needed

Keep it practical and specific. Don't suggest items not in the pantry unless asked.
If pantry is empty, acknowledge it and give phase-appropriate suggestions anyway.""",

    "felix": """You are Felix, Arc's Fitness Coach. The user is vegetarian (eggs only on office lunch days).

You know the user's health metrics (HRV, sleep, steps), recent workout history, cycle phase, and macro goals. Their biometric and training data are in LIVE CLIENT DATA below.

Adapt your response to what the user asks:
- "What should I do today?" → recommend workout type, duration, and intensity based on actual HRV and phase
- "Was my workout good?" / "How am I recovering?" → assess against their recent training load and cycle phase
- "I'm tired / sore / low energy" → validate and suggest appropriate reduced-intensity options
- "Set my macro goals" / "goals_mode: true" → guide the user through up to 5 questions: current weight (kg), target weight (kg), timeline (weeks), weekly workout frequency, and one additional goal. After collecting answers, output the macro plan as a JSON block wrapped in <arc-goals>...</arc-goals> tags. Use 1.8g protein/kg, standard TDEE deficit/surplus, phase modifiers built in.
- General fitness question → answer clearly and practically

HRV is your primary recovery signal. Below 35ms = rest day. 35–50ms = moderate. Above 50ms = push hard.
Always give a specific, actionable recommendation — not just general principles.
Be encouraging but honest. The luteal and menstrual phases genuinely require lower intensity.""",

    "cara": """You are Cara, Arc's Personal Care Advisor.

You know the user's skincare shelf (products, opened dates, PAO, expiry) and cycle phase. Their shelf data is in LIVE CLIENT DATA below.

Adapt to what the user asks:
- "What's my routine?" → give a numbered AM and PM routine using only shelf products, in correct application order
- "Is [product] expiring?" or "What's expiring?" → check PAO and expiry, flag anything within 2 months
- "Should I use X with Y?" → check for conflicts (e.g. retinol + AHAs) and give a clear yes/no
- Skincare question → answer directly with shelf products where possible

Sequencing rules — always apply:
- Cleanser → toner/essence → serum → moisturiser → SPF (AM) or oil/sleeping mask (PM)
- Vitamin C: AM only, after toner, before SPF
- Retinol: PM only, after serum, before moisturiser. Not same night as AHAs.
- SPF: always the absolute last step in AM
- Wait 5-10 min after retinol before moisturiser

If the shelf is empty, give phase-appropriate general recommendations.""",

    "eve": """You are Eve, Arc's Evening Coach.

You know the user's cycle phase, today's health metrics (HRV, sleep, steps), mood score, energy score, and any logged symptoms. Their data is in LIVE CLIENT DATA below.

Be conversational and warm — you're a wind-down companion, not a reporting tool. Match energy to context: if they had a hard day (low mood, low HRV), be gentle. If they had a good day, celebrate it briefly then help close it well.

Adapt to what the user shares:
- "How did I do today?" → reflect on their real metrics in a human way, be encouraging
- "Help me wind down" → suggest 2-3 calming activities suited to their phase and energy
- "I feel [emotion]" → validate first, then offer one grounding suggestion
- Journal prompt / reflection → ask one open question and reflect back thoughtfully

Do not use clinical headers or bullet-point reports. Speak like a caring friend who has context.
Keep responses brief unless the user wants to go deeper — follow their lead.
Luteal and menstrual phases: be extra gentle, energy and mood naturally dip.""",

    "scout": """You are Scout, Arc's Shopping Advisor.

You know the user's shopping preference history and current grocery list. Their ratings, notes, and unchecked grocery items are in LIVE CLIENT DATA below.

Adapt to what the user asks:
- "Where should I buy X?" → give a direct store recommendation based on their history first, Irish store strengths if no history
- "Best store for my list?" → group unchecked items by recommended store
- "How did [store] do for X?" → reflect their own rating back and ask for an update if it's old
- General shopping question → answer practically

Irish store strengths (use when user has no history for an item):
- Lidl: fresh produce, excellent value, great seasonal veg and fruit, bakery
- Aldi: best-value staples and store-brand basics, good frozen
- Tesco: widest range, reliable staples and bulk, clubcard offers
- SuperValu: strong fresh Irish produce and local brands, good meat/fish counter
- Dunnes Stores: solid mid-range, Simply Better premium line, good deli
- M&S: quality proteins, fresh herbs, premium ready meals worth the price

After a recommendation, end with a brief "How did it go?" — one sentence — to collect feedback.""",
}

# ═══════════════════════════════════════════════════════════════════════════════
# MEAL ADVICE + TWEAKS SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

_MEAL_ADVICE_SYSTEM = """You are Nora, Arc's Food Advisor. The user is vegetarian. Eggs are only available on office days (not at home). Never suggest red meat or non-vegetarian proteins.

You receive: a recipe, the user's pantry, days remaining in the current cycle phase, recent purchases, and daily macro targets.

You have access to the Epicurean MCP — use it to find flavour pairings and complementary ingredients that make this recipe more interesting while staying nutritious.

Your job: suggest 2-3 improvements. Rules:
1. PANTRY FIRST — if a good ingredient is already in stock, prioritise it and say "you already have X".
2. ANTI-WASTE — only suggest buying something new if days_remaining >= 2 AND it will realistically be used before the phase ends. If days_remaining <= 1, suggest it for the NEXT phase instead.
3. RECALL — if recent_purchases lists an ingredient that fits, reference when it was bought: "the quinoa you picked up on [date]".
4. PHASE-AWARE — improvements must serve the current phase's nutritional needs.
5. FLAVOUR — use Epicurean to suggest one easy taste experiment (e.g. "add a squeeze of lemon and cumin").
6. MACRO-AWARE — if the recipe is short on protein vs. today's target, name the ingredient that helps and by roughly how much.
7. LOW-AFTER-COOKING — list pantry items with status "Low" that are main ingredients in this recipe.

Return ONLY valid JSON, no markdown fences:
{"suggestions":[{"text":"one sentence — ingredient + reason","ingredient":"lowercase name","in_pantry":true,"add_to_grocery":false,"buy_note":"phase timing note if add_to_grocery is true"}],"low_after_cooking":["ingredient_name"]}"""

_MEAL_TWEAKS_SYSTEM = """You are Nora, Arc's Food Advisor. The user is vegetarian (eggs on office days only). Never suggest red meat.

You receive a week of logged meals and the dynamic macro targets for each day. Suggest specific quantity tweaks to help hit the targets.

Rules:
- One tweak per day maximum (the most impactful)
- Only adjust ingredients already in the meal — do not add entirely new meals
- Prefer protein and calorie adjustments
- Tweaks must be practical (round numbers, common quantities)

Return ONLY valid JSON, no markdown fences:
{"tweaks":[{"date":"YYYY-MM-DD","meal":"meal name","ingredient":"ingredient name","change":"increase|decrease","from_qty":"Xg","to_qty":"Yg","reason":"short reason"}]}"""

_SETUP_GOALS_SYSTEM = """You are a nutrition and fitness planner. Compute daily macro targets from the user's goals.

Rules:
- Protein: 1.8g per kg of current body weight (round to nearest 5g)
- Fat: 1g per kg of current body weight minimum (round to nearest 5g)
- Calories: TDEE adjusted for deficit (fat loss) or surplus (muscle build). Use 30 kcal/kg as sedentary TDEE baseline, add 200-300 kcal for 3+ workouts/week
- Carbs: remaining calories after protein and fat (4 kcal/g protein, 9 kcal/g fat, 4 kcal/g carbs)
- For "both" focus: slight deficit (-200 kcal) with high protein
- Phase modifiers: menstrual +100 kcal +20g carbs; follicular +5g protein; ovulatory -50 kcal +10g protein; luteal +150 kcal +30g carbs

Return ONLY valid JSON matching this exact shape, no markdown fences:
{"base":{"kcal":0,"protein":0,"carbs":0,"fat":0},"goals":[{"type":"fat_loss|muscle_build|both","current_kg":0,"target_kg":0,"weeks":0}],"dietary":{"vegetarian":true,"eggs":"office_lunch_only"},"phase_modifiers":{"menstrual":{"kcal":100,"protein":0,"carbs":20,"fat":5},"follicular":{"kcal":0,"protein":5,"carbs":0,"fat":0},"ovulatory":{"kcal":-50,"protein":10,"carbs":-10,"fat":0},"luteal":{"kcal":150,"protein":5,"carbs":30,"fat":5}},"workout_day":{"kcal":200,"protein":20,"carbs":30,"fat":0},"rest_day":{"kcal":-100,"protein":0,"carbs":-20,"fat":0},"refined":true}"""

# ═══════════════════════════════════════════════════════════════════════════════
# REAL CONTEXT BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def _fmt(val, fmt='.0f', unit='', fallback='not logged'):
    if val is None:
        return fallback
    try:
        return f"{val:{fmt}}{unit}"
    except (ValueError, TypeError):
        return fallback


def _health_and_phase():
    """Load today's health row and cycle phase from health_log.json."""
    try:
        from utils.apple_health_reader import get_health_log, get_cycle_phase
        rows = get_health_log(1, demo=False)
        today = rows[-1] if rows else {}
        phase = get_cycle_phase(demo=False)
    except Exception:
        today = {}
        phase = {"name": "Unknown", "day": 0, "energy": "—", "key": ""}
    return today, phase


def _felix_context() -> str:
    today, phase = _health_and_phase()

    no_data = "\n⚠ No health data logged — run `python log_today.py` to add today's metrics." if not today else ""

    phase_guidance = {
        "menstrual":  "Low intensity only — walks, gentle yoga, rest. Skip heavy lifting.",
        "follicular": "Energy rising — build strength, longer cardio OK, try new challenges.",
        "ovulatory":  "Peak performance — push hard, HIIT, heavy compound lifts.",
        "luteal":     "Declining energy — moderate intensity, prioritise consistency over PRs.",
    }.get(phase.get("key", ""), "—")

    return f"""Date: {date.today().strftime('%A, %d %B %Y')}
Cycle phase: {phase['name']} (day {phase['day']}) — {phase['energy']}{no_data}

TODAY'S BIOMETRICS:
HRV: {_fmt(today.get('hrv'), '.0f', ' ms')}
Resting HR: {_fmt(today.get('resting_hr'), '.0f', ' bpm')}
Steps: {_fmt(today.get('steps'), ',.0f')}
Active calories: {_fmt(today.get('active_calories'), '.0f', ' kcal')}
Sleep last night: {_fmt(today.get('sleep_duration'), '.1f', ' hrs')} (deep: {_fmt(today.get('deep_sleep_min'), '.0f', ' min')}, REM: {_fmt(today.get('rem_sleep_min'), '.0f', ' min')})

CYCLE PHASE FITNESS GUIDANCE:
{phase_guidance}"""


def _nora_context() -> str:
    # Pantry + meal data now live in the browser (localStorage) and are injected
    # into the chat request as LIVE CLIENT DATA. No Notion read here.
    _, phase = _health_and_phase()

    phase_nutrition = {
        "menstrual":  "Higher iron, comfort foods, warm meals — lentils, leafy greens, dark chocolate.",
        "follicular": "Build energy — whole grains + protein, lighter meals OK. Metabolism rising.",
        "ovulatory":  "Peak energy — eat more, prioritise complex carbs + protein.",
        "luteal":     "Extra calories needed — carbs + protein + magnesium. Cravings are real.",
    }.get(phase.get("key", ""), "—")

    return f"""Date: {date.today().strftime('%A, %d %B %Y')}
Cycle phase: {phase['name']} (day {phase['day']})

Your pantry and logged meals are provided below as LIVE CLIENT DATA.
Suggest meals using what's in stock; flag anything expiring soon.

CYCLE NUTRITION TODAY ({phase['name']}):
{phase_nutrition}"""


def _cara_context() -> str:
    # Skincare shelf now lives in the browser (localStorage) and is injected into
    # the chat request as LIVE CLIENT DATA. No Notion read here.
    _, phase = _health_and_phase()

    phase_skin = {
        "menstrual":  "Skin sensitive — gentle cleanser only, skip actives, extra moisture.",
        "follicular": "Skin resilient — great time for retinol + vitamin C.",
        "ovulatory":  "Best skin phase — maintain routine, can try new products.",
        "luteal":     "Breakout risk rising — salicylic acid, dial back heavy actives.",
    }.get(phase.get("key", ""), "—")

    return f"""Date: {date.today().strftime('%A, %d %B %Y')}
Cycle phase: {phase['name']} (day {phase['day']})

Your skincare shelf is provided below as LIVE CLIENT DATA.
Recommend AM/PM routines using what's on the shelf; flag expiring products.

CYCLE SKIN STATE TODAY ({phase['name']}):
{phase_skin}

SKINCARE SEQUENCE (always follow this order):
- Cleanser → toner/essence → serum → moisturiser → SPF (AM only)
- Vitamin C: AM only, after toner, before moisturiser
- Retinol: PM only, after serum, before moisturiser. Never the same night as AHAs
- SPF: absolute last step in AM, every day without exception"""


def _eve_context() -> str:
    today, phase = _health_and_phase()
    no_data = "\n⚠ No health data logged — run `python log_today.py` to add today's metrics." if not today else ""

    return f"""Date: {date.today().strftime('%A, %d %B %Y')}
Cycle phase: {phase['name']} (day {phase['day']}) — {phase['energy']}{no_data}

TODAY'S METRICS:
HRV: {_fmt(today.get('hrv'), '.0f', ' ms')}
Steps: {_fmt(today.get('steps'), ',.0f')}
Sleep last night: {_fmt(today.get('sleep_duration'), '.1f', ' hrs')}

SLEEP GOALS:
- Target: 8 hours
- Preferred bedtime: 10:30 PM"""


def _vera_context() -> str:
    _, phase = _health_and_phase()
    return f"""Date: {date.today().strftime('%A, %d %B %Y')}
Cycle phase: {phase['name']} (day {phase['day']}) — {phase['energy']}

Quick compare — health, food, skincare, and fitness products."""


def _scout_context() -> str:
    _, phase = _health_and_phase()
    return f"""Date: {date.today().strftime('%A, %d %B %Y')}
Cycle phase: {phase['name']} (day {phase['day']})

Your shopping preference history and ingredient intelligence (price + quality ratings per store) are provided as LIVE CLIENT DATA.
Make personalised store recommendations based on past ratings, logged prices, and notes.
Irish stores: Lidl (value + fresh produce), Tesco (range + everyday staples), SuperValu (Irish brands + fresh),
Dunnes Stores (quality + value), Aldi (value + seasonal specials), M&S (premium + ready meals).
All prices are in Euro (€). Prioritise value per unit where price data is available.
Never suggest UK-only stores (Waitrose, Sainsbury's, Asda)."""


CONTEXT_BUILDERS = {
    "vera":  _vera_context,
    "nora":  _nora_context,
    "felix": _felix_context,
    "cara":  _cara_context,
    "eve":   _eve_context,
    "scout": _scout_context,
}

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "agents": list(AGENT_SYSTEMS.keys()),
        "timestamp": date.today().isoformat()
    })


@app.route("/api/context/<agent_name>", methods=["GET"])
def get_context(agent_name: str):
    agent = agent_name.lower()
    if agent not in AGENT_SYSTEMS:
        return jsonify({"error": f"Agent '{agent_name}' not found"}), 404
    try:
        context = CONTEXT_BUILDERS[agent]()
    except Exception as e:
        context = f"Context unavailable: {e}"
    return jsonify({
        "system": AGENT_SYSTEMS[agent],
        "context": context,
        "agent": agent,
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        system = data.get("system")
        messages = data.get("messages", [])
        agent = data.get("agent", "unknown")
        client_context = data.get("client_context")  # optional: client-side pantry/meal data

        if not system or not messages:
            return jsonify({"error": "Missing 'system' or 'messages' in request"}), 400

        # Append live client-side data (e.g. localStorage pantry) to the system prompt
        if client_context:
            system = system + "\n\nLIVE CLIENT DATA (from browser):\n" + client_context

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=system,
            messages=messages
        )
        reply = response.content[0].text
        return jsonify({
            "reply": reply,
            "model": response.model,
            "agent": agent,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MACROS ESTIMATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/macros", methods=["POST"])
def estimate_macros():
    try:
        data = request.json
        ingredients = data.get("ingredients", [])
        if not ingredients:
            return jsonify({"error": "No ingredients provided"}), 400

        ingredient_lines = "\n".join(
            f"- {ing.get('name','?')}: {ing.get('qty','')} {ing.get('unit','')}".strip()
            for ing in ingredients
        )

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": (
                    f"Estimate nutritional macros for these ingredients:\n{ingredient_lines}\n\n"
                    "Return a JSON array only — no explanation, no markdown fences.\n"
                    'Format: [{"name":"...","kcal":0,"protein":0,"carbs":0,"fat":0}]\n'
                    "Values are for the quantity/unit given. Protein, carbs, fat in grams. "
                    "Round to one decimal place. If quantity is missing, assume 100g."
                )
            }]
        )

        text = response.content[0].text.strip()
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            return jsonify({"error": "Could not parse macro estimates"}), 422
        macros = json.loads(match.group())
        return jsonify({"macros": macros, "usage": _usage(response)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# "TELL ARC" — natural-language entry → structured store actions
# ═══════════════════════════════════════════════════════════════════════════════

_TELL_ARC_SYSTEM = """You are Arc's data router. The user types one free-text note about their \
health/food/life and you convert it into structured actions against their local data stores. \
Reply with a JSON object only — no prose, no markdown fences.

Shape: {"actions": [ {"store": "<name>", "summary": "<≤8-word human label>", "data": { ... } } ]}
If the text doesn't map to any store, return {"actions": [], "note": "<short clarifying question>"}.

Stores and their data shapes:
- "meal":        {"type":"breakfast|lunch|dinner|snack","name":"optional","ingredients":[{"name":"","qty":number,"unit":"g|ml|pieces|cup|tbsp|tsp|kg|pack"}],"notes":"optional"}
- "pantry":      {"items":[{"name":"","category":"Produce|Protein|Grains|Dairy|Condiments|Snacks|Beverages|Frozen|Other","quantity":number,"unit":"g|kg|ml|L|pieces|pack|can|jar","status":"In Stock|Low|Out","expiry":"YYYY-MM-DD optional"}]}
- "grocery":     {"name":"","qty":number,"unit":"pieces|pack|g|kg|ml|L|can|jar","category":"Produce|Protein|Grains|Dairy|Other"}
- "workout":     {"type":"strength|cardio|yoga|pilates|walk|swim|hiit|other","duration":minutes,"intensity":1-5,"notes":"optional"}
- "supplement_add":   {"name":"","dose":"e.g. 1 tablet","timing":"morning|evening|with_food|as_needed|weekly","totalDays":number}
- "supplement_taken": {"name":"<existing supplement name to mark taken today>"}
- "skincare":    {"name":"","brand":"optional","category":"cleanser|toner|essence|serum|treatment|eye|moisturiser|oil|spf|mask|body|hair|other","timing":"AM|PM|Both|Weekly|Flexible","opened":"YYYY-MM-DD optional","paoMonths":number optional,"medicated":bool,"rating":1-5 optional}
- "schedule":    {"date":"YYYY-MM-DD","type":"grocery_run|meal_prep|chore|workout|supplement_dose|other","label":"","time":"HH:MM optional"}
- "chore":       {"label":"","category":"household|kitchen|laundry|other","frequency":"daily|weekly|biweekly"}
- "health":      {"sleep_duration":hours,"hrv":ms,"resting_hr":bpm,"steps":number,"deep_sleep_min":min,"rem_sleep_min":min,"active_calories":kcal} (only include mentioned fields)
- "period_start": {"date":"YYYY-MM-DD"}
- "symptom":     {"symptom":"e.g. cramps|bloating|fatigue|headache|acne|low mood","severity":1-3 (1 mild, 2 moderate, 3 severe),"notes":"optional","date":"YYYY-MM-DD optional"}
- "blood_test":  {"readings":[{"marker":"Iron|Ferritin|Vitamin B12|Vitamin D3|TSH|Glucose|Hemoglobin|other","value":number,"unit":"optional","date":"YYYY-MM-DD optional","low":number optional,"high":number optional}]}
- "body":        {"weight":kg,"waist":cm,"hip":cm,"chest":cm,"arm":cm,"thigh":cm,"date":"YYYY-MM-DD optional"} (only include mentioned fields)

Rules:
- Resolve relative dates ("today","tomorrow","Friday","last Monday") against TODAY given below.
- One note may produce multiple actions (e.g. logging a meal + adding a low item to grocery).
- Use sensible defaults; omit unknown optional fields. Prefer the most specific store.
- Quantities are numbers, not strings."""


@app.route("/api/parse-entry", methods=["POST"])
def parse_entry():
    try:
        data = request.json or {}
        text = (data.get("text") or "").strip()
        today = data.get("today") or date.today().isoformat()
        phase = data.get("phase")  # optional cycle-phase label for context
        if not text:
            return jsonify({"error": "No text provided"}), 400

        ctx = f"TODAY: {today}"
        if phase:
            ctx += f"\nCYCLE PHASE: {phase}"

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            system=_TELL_ARC_SYSTEM + "\n\n" + ctx,
            messages=[{"role": "user", "content": text}],
        )
        raw = response.content[0].text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return jsonify({"error": "Could not understand that — try rephrasing"}), 422
        parsed = json.loads(match.group())
        parsed["usage"] = _usage(response)
        return jsonify(parsed)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# CROSS-AGENT SYNTHESIS — the Council / Aurora "agents that understand each other"
# ═══════════════════════════════════════════════════════════════════════════════
#
# The client (arc-context.jsx) builds one snapshot across every store + computed
# trends, and asks for a synthesised, cross-domain readout. This is what makes the
# Council and Aurora real instead of static text. Results are cached client-side
# (once per day), so this endpoint is hit at most a couple of times per user/day.

_SYNTH_SYSTEMS = {
    "council": """You are Arc's Council — the synthesis layer that reads signals from \
ALL of a woman's health & life domains at once and surfaces what matters when they interact.

You are given a SNAPSHOT (today's cross-domain state) and TRENDS (recent patterns). Your job is \
to find the 1-3 most important CROSS-DOMAIN connections or conflicts for today — the insights no \
single agent would catch alone — and state them plainly.

Reference the relevant agents by name so it reads like a roundtable:
- Flora (cycle phase) · Felix (fitness) · Nora (food) · Cara (skincare) · Soma (sleep) · Luna (mood/energy) · Scout (shopping)

Examples of the cross-domain thinking you should do:
- Low HRV + follicular phase + a planned strength session → Felix should defer, Soma explains why.
- Trained today + protein short → Nora flags a top-up.
- Luteal phase + fragmented sleep + magnesium running low → connect them.
- Out-of-range blood marker that a supplement or food choice speaks to.

Write 2-4 warm, decisive sentences. Be specific to her actual numbers. No headers, no bullet lists, \
no preamble. If data is thin, say what to log next to unlock better synthesis. \
You are not a doctor — frame everything as supportive guidance, not diagnosis.""",

    "aurora": """You are Aurora, Arc's morning briefing agent. You read a SNAPSHOT of the user's \
cross-domain state and compose a short, warm good-morning that sets up her day.

In 1-2 sentences, name her cycle phase/energy and weave in the single most useful thing across food, \
fitness, sleep, or schedule for today. Sound like a calm, capable friend — not a dashboard. \
No headers, no lists. If little is logged, gently nudge her to log today's basics.""",
}


@app.route("/api/synthesize", methods=["POST"])
def synthesize():
    try:
        data = request.json or {}
        kind = (data.get("kind") or "council").lower()
        if kind not in _SYNTH_SYSTEMS:
            return jsonify({"error": f"Unknown synthesis kind '{kind}'"}), 400

        snapshot = (data.get("snapshot") or "").strip()
        trends = (data.get("trends") or "").strip()
        phase = data.get("phase")

        ctx = f"TODAY: {date.today().strftime('%A, %d %B %Y')}"
        if phase:
            ctx += f"\nCYCLE PHASE: {phase}"
        ctx += f"\n\nSNAPSHOT:\n{snapshot or '(nothing logged yet)'}"
        if trends:
            ctx += f"\n\nTRENDS:\n{trends}"

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=_SYNTH_SYSTEMS[kind],
            messages=[{"role": "user", "content": ctx}],
        )
        return jsonify({"text": response.content[0].text.strip(), "kind": kind, "usage": _usage(response)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MEAL PHOTO PARSING (vision — returns ingredient rows for the MealLogger)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/meals/parse-photo", methods=["POST"])
def parse_meal_photo():
    try:
        data = request.json
        image_b64 = data.get("image")
        mime_type = data.get("mime_type", "image/jpeg")
        if not image_b64:
            return jsonify({"error": "No image provided"}), 400

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=900,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime_type, "data": image_b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Identify the foods in this meal photo and estimate the portion of each.\n"
                            "Return a JSON object only — no explanation, no markdown fences.\n"
                            'Format: {"name":"short meal name","type":"breakfast|lunch|dinner|snack",'
                            '"ingredients":[{"name":"...","qty":100,"unit":"g"}]}\n'
                            "Unit must be one of: g, ml, pieces, cup, tbsp, tsp.\n"
                            "Estimate realistic cooked-portion quantities. List 1-6 main components."
                        ),
                    },
                ],
            }],
        )

        text = response.content[0].text.strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return jsonify({"error": "Could not read the meal — try a clearer photo"}), 422
        meal = json.loads(match.group())
        meal["usage"] = _usage(response)
        return jsonify(meal)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# RECEIPT PARSING (vision — no Notion; pantry itself lives in browser localStorage)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/pantry/parse-receipt", methods=["POST"])
def parse_receipt():
    try:
        data = request.json
        image_b64 = data.get("image")
        mime_type = data.get("mime_type", "image/jpeg")
        if not image_b64:
            return jsonify({"error": "No image provided"}), 400

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime_type, "data": image_b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract grocery items from this receipt or bill photo.\n"
                            "Return a JSON array only — no explanation, no markdown fences.\n"
                            'Format: [{"name":"...","category":"...","quantity":1,"unit":"pieces","status":"In Stock","price_eur":null}]\n'
                            "Category must be one of: Produce, Protein, Grains, Dairy, Condiments, Snacks, Beverages, Frozen, Other\n"
                            "Unit must be one of: g, kg, ml, L, pieces, pack, loaf, can, jar\n"
                            "For quantity use the number of units purchased (not weight unless sold by weight).\n"
                            "If a price is visible for an item, set price_eur to the numeric price in euros (e.g. 1.99). Otherwise null.\n"
                            'If an expiry date is visible, add "expiry": "YYYY-MM-DD".\n'
                            "Skip non-grocery line items (bags, taxes, loyalty points, totals)."
                        ),
                    },
                ],
            }],
        )

        text = response.content[0].text.strip()
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            return jsonify({"error": "Could not parse items from receipt — try a clearer photo"}), 422
        items = json.loads(match.group())
        return jsonify({"items": items, "usage": _usage(response)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MEAL ADVICE — phase-aware recipe improvement with Epicurean MCP
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/meal-advice", methods=["POST"])
def meal_advice():
    try:
        body = request.get_json(force=True)
        recipe          = body.get("recipe", {})
        phase_id        = body.get("phase_id", "")
        phase_label     = body.get("phase_label", "")
        days_remaining  = body.get("days_remaining", 7)
        pantry          = body.get("pantry", "empty")
        recent_purchases = body.get("recent_purchases", "none")
        dynamic_targets = body.get("dynamic_targets", {})
        snapshot        = body.get("snapshot", "")

        ing_lines = "\n".join(
            f"- {i.get('name','')} {i.get('qty','')} {i.get('unit','')}"
            for i in recipe.get("ingredients", [])
        )
        target_str = ", ".join(f"{k}: {v}" for k, v in dynamic_targets.items()) if dynamic_targets else "not set"
        ctx = (
            f"Recipe: {recipe.get('name', '(unnamed)')}\n"
            f"Ingredients:\n{ing_lines}\n\n"
            f"Current phase: {phase_label} ({phase_id})\n"
            f"Days remaining in this phase: {days_remaining}\n"
            f"Pantry (name + status): {pantry}\n"
            f"Recent purchases (last 14 days): {recent_purchases}\n"
            f"Today's macro targets: {target_str}\n\n"
            f"Health snapshot:\n{snapshot}"
        )

        raw = None
        # Try with Epicurean MCP via beta API
        try:
            resp = anthropic_client.beta.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=600,
                betas=["mcp-client-2025-04-04"],
                system=_MEAL_ADVICE_SYSTEM,
                messages=[{"role": "user", "content": ctx}],
                mcp_servers=[{"type": "url", "url": "https://epicure-mcp.kaikaku.ai/mcp", "name": "epicurean"}],
            )
            raw = " ".join(
                block.text for block in resp.content if hasattr(block, "text")
            ).strip()
        except Exception:
            pass

        # Fallback: call without MCP
        if not raw:
            resp = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=600,
                system=_MEAL_ADVICE_SYSTEM,
                messages=[{"role": "user", "content": ctx}],
            )
            raw = resp.content[0].text.strip()

        match = re.search(r'\{.*\}', raw, re.DOTALL)
        result = json.loads(match.group(0)) if match else {"suggestions": [], "low_after_cooking": []}
        result["usage"] = _usage(resp)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MEAL TWEAKS — weekly quantity adjustment suggestions
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/meal-tweaks", methods=["POST"])
def meal_tweaks():
    try:
        body = request.get_json(force=True)
        week_meals      = body.get("week_meals", {})
        daily_targets   = body.get("daily_targets", {})
        dietary         = body.get("dietary", {"vegetarian": True, "eggs": "office_lunch_only"})
        phase_context   = body.get("phase_context", "")

        meal_lines = []
        for d, meals in sorted(week_meals.items()):
            for m in meals:
                ings = ", ".join(f"{i.get('name','')} {i.get('qty','')} {i.get('unit','')}" for i in m.get("ingredients", []))
                macros = m.get("macros", {})
                meal_lines.append(f"{d} — {m.get('name','meal')}: {ings} | {macros.get('kcal',0):.0f} kcal, {macros.get('protein',0):.0f}g P")

        target_lines = [f"{d}: {t.get('kcal',0)} kcal, {t.get('protein',0)}g P, {t.get('carbs',0)}g C, {t.get('fat',0)}g F"
                        for d, t in sorted(daily_targets.items())]

        ctx = (
            f"Dietary: {dietary}\n"
            f"Phase: {phase_context}\n\n"
            f"MEALS THIS WEEK:\n" + "\n".join(meal_lines) + "\n\n"
            f"DAILY TARGETS:\n" + "\n".join(target_lines)
        )

        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=700,
            system=_MEAL_TWEAKS_SYSTEM,
            messages=[{"role": "user", "content": ctx}],
        )
        raw = resp.content[0].text.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        result = json.loads(match.group(0)) if match else {"tweaks": []}
        result["usage"] = _usage(resp)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MEAL PLAN — AI-suggested daily meal plan from saved recipes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/meal-plan", methods=["POST"])
def meal_plan():
    try:
        body = request.get_json(force=True)
        recipes       = body.get("recipes", [])
        already_logged = body.get("already_logged", [])
        phase_id      = body.get("phase_id", "")
        phase_label   = body.get("phase_label", "")
        targets       = body.get("dynamic_targets", {})
        day_type      = body.get("day_type", "wfh")

        recipe_list = "\n".join(
            f"- {r.get('name','?')} | tags: {', '.join(r.get('tags',[]))} | "
            f"ingredients: {', '.join(i.get('name','') for i in r.get('ingredients',[]))}"
            for r in recipes
        ) or "No saved recipes"
        logged_types = [m.get("type","") for m in already_logged]
        target_str = f"{targets.get('kcal','?')} kcal, {targets.get('protein','?')}g protein"

        system = (
            "You are Nora, Arc's Food Advisor. The user is vegetarian (eggs on office days only). "
            "Never suggest meat, fish, or non-vegetarian protein.\n\n"
            "Suggest a balanced meal plan for today using ONLY the saved recipes listed. "
            "Prioritise phase-appropriate ingredients and macro balance.\n\n"
            "Return ONLY valid JSON (no markdown fences):\n"
            '{\"plan\":['
            '{\"type\":\"breakfast\",\"recipe_name\":\"exact name or null\",\"reason\":\"1 sentence\"},'
            '{\"type\":\"lunch\",\"recipe_name\":\"exact name or null\",\"reason\":\"1 sentence\"},'
            '{\"type\":\"dinner\",\"recipe_name\":\"exact name or null\",\"reason\":\"1 sentence\"}'
            ']}'
        )
        user_msg = (
            f"Phase: {phase_label} ({phase_id})\n"
            f"Already logged today: {', '.join(logged_types) if logged_types else 'nothing'}\n"
            f"Daily targets: {target_str}\n"
            f"Day type: {day_type}\n\n"
            f"Saved recipes:\n{recipe_list}"
        )

        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = resp.content[0].text.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        result = json.loads(match.group(0)) if match else {"plan": []}
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# QUICK BUILD — suggest one meal from pantry + time of day
# ═══════════════════════════════════════════════════════════════════════════════

_QUICK_BUILD_SYSTEM = """You are Nora, Arc's Food Advisor. The user is vegetarian (eggs on office days at lunch only; never meat/fish/seafood). You have access to the Epicurean MCP for flavour pairing creativity.

Given pantry ingredients and time of day, suggest ONE simple meal the user can make right now using what they have.

Return ONLY valid JSON (no fences):
{"name":"Meal name","type":"breakfast|lunch|dinner|snack","description":"1 sentence","ingredients":[{"name":"ingredient","qty":"100","unit":"g"}],"instructions":"2-3 brief steps","why":"1 sentence on why good for phase/time"}"""

@app.route("/api/quick-build", methods=["POST"])
def quick_build():
    try:
        body = request.get_json(force=True)
        pantry      = body.get("pantry", "empty")
        time_of_day = body.get("time_of_day", "midday")
        phase_label = body.get("phase_label", "")

        user_msg = f"Pantry: {pantry}\nTime of day: {time_of_day}\nPhase: {phase_label}\n\nSuggest a quick meal I can make right now."

        raw = None
        try:
            resp = anthropic_client.beta.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                betas=["mcp-client-2025-04-04"],
                system=_QUICK_BUILD_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
                mcp_servers=[{"type": "url", "url": "https://epicure-mcp.kaikaku.ai/mcp", "name": "epicurean"}],
            )
            raw = " ".join(b.text for b in resp.content if hasattr(b, "text")).strip()
        except Exception:
            pass

        if not raw:
            resp = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                system=_QUICK_BUILD_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = resp.content[0].text.strip()

        match = re.search(r'\{.*\}', raw, re.DOTALL)
        result = json.loads(match.group(0)) if match else {"error": "Could not parse suggestion"}
        result["usage"] = _usage(resp)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# SETUP GOALS — compute macro targets from user's weight/goal inputs
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/setup-goals", methods=["POST"])
def setup_goals():
    try:
        body = request.get_json(force=True)
        current_kg    = body.get("current_kg", 65)
        target_kg     = body.get("target_kg", 60)
        weeks         = body.get("weeks", 16)
        focus         = body.get("focus", "fat_loss")
        workouts_week = body.get("workouts_week", 3)
        extra_goal    = body.get("extra_goal", "")

        ctx = (
            f"Current weight: {current_kg} kg\n"
            f"Target weight: {target_kg} kg\n"
            f"Timeline: {weeks} weeks\n"
            f"Focus: {focus}\n"
            f"Workouts per week: {workouts_week}\n"
            f"Additional goal: {extra_goal or 'none'}\n"
            f"Today: {date.today().isoformat()}"
        )

        resp = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=_SETUP_GOALS_SYSTEM,
            messages=[{"role": "user", "content": ctx}],
        )
        raw = resp.content[0].text.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            return jsonify({"error": "Could not compute goals"}), 422
        result = json.loads(match.group(0))
        result["refined_at"] = date.today().isoformat()
        result["usage"] = _usage(resp)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE SHEETS SYNC
# ═══════════════════════════════════════════════════════════════════════════════

_gc = None   # gspread client (lazy)
_wb = None   # workbook handle (lazy)
_cal = None  # Google Calendar service (lazy)


def _sheets_client():
    global _gc, _wb
    if _wb:
        return _wb
    creds_raw = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    sheet_id  = os.getenv("GOOGLE_SHEETS_ID")
    if not creds_raw or not sheet_id:
        raise RuntimeError("GOOGLE_SHEETS_CREDENTIALS or GOOGLE_SHEETS_ID not configured")
    import gspread
    from google.oauth2.service_account import Credentials as SACredentials
    creds = SACredentials.from_service_account_info(
        json.loads(creds_raw),
        scopes=[
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive",
        ],
    )
    _gc = gspread.authorize(creds)
    _wb = _gc.open_by_key(sheet_id)
    return _wb


def _get_tab(tab_name: str):
    wb = _sheets_client()
    try:
        return wb.worksheet(tab_name)
    except Exception:
        return wb.add_worksheet(title=tab_name, rows=2000, cols=40)


def _v(val):
    """Normalise a value for writing: lists/dicts → JSON string; None → empty."""
    if val is None:
        return ""
    if isinstance(val, (list, dict)):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, bool):
        return "true" if val else "false"
    return str(val)


def _parse(val):
    """Try to coerce a string back to a typed value."""
    if not isinstance(val, str) or val == "":
        return val
    if val.lower() == "true":
        return True
    if val.lower() == "false":
        return False
    if val.startswith(("[", "{")):
        try:
            return json.loads(val)
        except Exception:
            pass
    try:
        f = float(val)
        return int(f) if f == int(f) else f
    except (ValueError, TypeError):
        pass
    return val


def _write_tab(tab_name: str, headers: list, rows: list):
    ws = _get_tab(tab_name)
    ws.clear()
    payload = [headers] + [[_v(r.get(h)) for h in headers] for r in rows]
    if payload:
        ws.update(payload, value_input_option="RAW")


def _read_tab(tab_name: str) -> tuple:
    ws = _get_tab(tab_name)
    all_rows = ws.get_all_values()
    if not all_rows:
        return [], []
    headers = all_rows[0]
    data = [
        {h: _parse(row[i] if i < len(row) else "") for i, h in enumerate(headers)}
        for row in all_rows[1:]
        if any(v.strip() for v in row)
    ]
    return headers, data


# ── Store specs: maps store-name → tab + how to flatten/reconstruct ──────────

STORE_SPECS = {
    "pantry": {
        "tab": "pantry",
        "headers": ["id","name","category","quantity","unit","status","expiry","protein","calories","carbs","fat","phase"],
        "extract": lambda d: d.get("items", []),
        "wrap":    lambda rows: {"items": rows},
    },
    "supplements": {
        "tab": "supplements",
        "headers": ["id","name","category","dose","dosage","unit","timing","frequency","phases",
                    "daysLeft","totalDays","expiry","purpose","notes","healthGoals","stockStatus",
                    "source","cost","active","takenToday","mealTiming","avoidWith","timingNote"],
        "extract": lambda d: d.get("supplements", []),
        "wrap":    lambda rows: {"supplements": rows, "lastReset": date.today().isoformat()},
    },
    "chores": {
        "tab": "chores",
        "headers": ["id","label","category","frequency","dayType","duration","fixed","lastDone","nextDue"],
        "extract": lambda d: d.get("chores", []),
        "wrap":    lambda rows: {"chores": rows},
    },
    "groceries": {
        "tab": "groceries",
        "headers": ["id","name","qty","unit","category","weekOf","shop","checked","source"],
        "extract": lambda d: d.get("items", []),
        "wrap":    lambda rows: {"items": rows},
    },
    "meals": {
        "tab": "meals",
        "headers": ["id","date","type","name","ingredients","kcal","protein","carbs","fat","notes"],
        "extract": lambda d: [
            {**{k: m.get(k,"") for k in ["id","date","type","name","notes"]},
             "ingredients": m.get("ingredients", []),
             "kcal":    (m.get("macros") or {}).get("kcal",""),
             "protein": (m.get("macros") or {}).get("protein",""),
             "carbs":   (m.get("macros") or {}).get("carbs",""),
             "fat":     (m.get("macros") or {}).get("fat",""),
            } for m in d.get("meals", [])
        ],
        "wrap": lambda rows: {
            "meals": [{
                **{k: r.get(k) for k in ["id","date","type","name","notes"] if r.get(k) is not None},
                "ingredients": r.get("ingredients", []),
                "macros": {"kcal": r.get("kcal") or 0, "protein": r.get("protein") or 0,
                           "carbs": r.get("carbs") or 0, "fat": r.get("fat") or 0},
            } for r in rows],
            "goals": {"kcal": 2000, "protein": 120},
        },
    },
    "health_log": {
        "tab": "health_log",
        "headers": ["date","sleep_duration","deep_sleep_min","rem_sleep_min","hrv","resting_hr",
                    "steps","active_calories","energy","mood","notes","period_start"],
        "extract": lambda d: d.get("log", []),
        "wrap":    lambda rows: {"log": rows},
    },
    "workouts": {
        "tab": "workouts",
        "headers": ["id","date","type","duration","intensity","notes","feedbackEmoji"],
        "extract": lambda d: d.get("workouts", []),
        "wrap":    lambda rows: {"workouts": rows},
    },
    "symptoms": {
        "tab": "symptoms",
        "headers": ["id","date","cycleDay","symptom","severity","notes"],
        "extract": lambda d: d.get("entries", []),
        "wrap":    lambda rows: {"entries": rows},
    },
    "blood_tests": {
        "tab": "blood_tests",
        "headers": ["id","marker","value","unit","date","low","high","notes"],
        "extract": lambda d: d.get("readings", []),
        "wrap":    lambda rows: {"readings": rows},
    },
    "body": {
        "tab": "body",
        "headers": ["date","weight","waist","hip","chest","arm","thigh"],
        "extract": lambda d: [
            {"date": dk, **dv}
            for dk, dv in (d.get("entries") or {}).items()
        ],
        "wrap": lambda rows: {
            "entries": {
                r["date"]: {k: r[k] for k in ["weight","waist","hip","chest","arm","thigh"] if r.get(k) is not None}
                for r in rows if r.get("date")
            }
        },
    },
    "skincare": {
        "tab": "skincare",
        "headers": ["id","name","brand","category","timing","opened","expiry","paoMonths","medicated","rating","notes"],
        "extract": lambda d: d.get("products", []),
        "wrap":    lambda rows: {"products": rows},
    },
    "schedule": {
        "tab": "schedule",
        "headers": ["id","date","time","title","category","duration","completed","gcalEventId"],
        "extract": lambda d: d.get("items", []),
        "wrap":    lambda rows: {"items": rows},
    },
    "water_log": {
        "tab": "water_log",
        "headers": ["date","totalMl","defaultBottleMl","entries"],
        "extract": lambda d: [
            {"date": dk, "totalMl": dv.get("totalMl", 0),
             "defaultBottleMl": d.get("defaultBottleMl", 500),
             "entries": dv.get("entries", [])}
            for dk, dv in (d.get("days") or {}).items()
        ],
        "wrap": lambda rows: {
            "days": {
                r["date"]: {"entries": r.get("entries", []), "totalMl": r.get("totalMl", 0)}
                for r in rows if r.get("date")
            },
            "defaultBottleMl": rows[0].get("defaultBottleMl", 500) if rows else 500,
        },
    },
    "shop_prefs": {
        "tab": "shop_prefs",
        "headers": ["item","preferred","displayName","notes","history"],
        "extract": lambda d: [
            {"item": k, "preferred": v.get("preferred",""), "displayName": v.get("displayName",""),
             "notes": v.get("notes",""), "history": v.get("history",[])}
            for k, v in (d.get("preferences") or {}).items()
        ],
        "wrap": lambda rows: {
            "preferences": {
                r["item"]: {"preferred": r.get("preferred",""), "displayName": r.get("displayName",""),
                            "notes": r.get("notes",""), "history": r.get("history",[])}
                for r in rows if r.get("item")
            }
        },
    },
    "purchase_log": {
        "tab": "purchase_log",
        "headers": ["name","date","phase","weekOf"],
        "extract": lambda d: d.get("entries", []),
        "wrap":    lambda rows: {"entries": rows},
    },
    "macro_goals": {
        "tab": "macro_goals",
        "headers": ["saved_at","base","goals","dietary","phase_modifiers","workout_day","rest_day","refined","refined_at"],
        "extract": lambda d: [{
            "saved_at": date.today().isoformat(),
            "base": d.get("base", {}), "goals": d.get("goals", []),
            "dietary": d.get("dietary", {}), "phase_modifiers": d.get("phase_modifiers", {}),
            "workout_day": d.get("workout_day", {}), "rest_day": d.get("rest_day", {}),
            "refined": d.get("refined", False), "refined_at": d.get("refined_at", ""),
        }] if d else [],
        "wrap": lambda rows: rows[0] if rows else {},
    },
}

# ── Canonical seed data (real user data) ─────────────────────────────────────

_TODAY = date.today().isoformat()

SEED_DATA = {
    "supplements": {"supplements": [
        {"id":"seed-1","name":"Supply6 360","category":"Multivitamin","dose":"1 sachet","dosage":1,"unit":"sachets","timing":"morning","frequency":"Daily","phases":["Any"],"daysLeft":30,"totalDays":30,"expiry":"2027-07-31","purpose":"All-in-one nutrition — 63+ nutrients, probiotics, greens, adaptogens","notes":"Mix 1 sachet in water every morning","healthGoals":["Energy","Immune Support","Hormone Balance"],"stockStatus":"Active","source":"India","cost":18,"active":True,"takenToday":False},
        {"id":"seed-2","name":"Iron Biglycinate","category":"Minerals","dose":"20 mg","dosage":20,"unit":"mg","timing":"morning","frequency":"Daily","phases":["Menstrual","Follicular","Ovulatory"],"daysLeft":0,"totalDays":30,"expiry":None,"purpose":"Anemia — Haemoglobin 11.7 (low)","notes":"Take with Frootcee in the morning. Space 2 hours from magnesium","healthGoals":["Energy","Hair health","Immune Support"],"stockStatus":"On Order","source":"","cost":None,"active":False,"takenToday":False},
        {"id":"seed-3","name":"Biotin","category":"Vitamins","dose":"10 mg","dosage":10,"unit":"mg","timing":"with_food","frequency":"Daily","phases":["Any"],"daysLeft":0,"totalDays":30,"expiry":None,"purpose":"For hairfall, brittle nails","notes":"Take daily with food. Results visible after 8–12 weeks","healthGoals":["Hair health","Skin"],"stockStatus":"On Order","source":"","cost":None,"active":False,"takenToday":False},
        {"id":"seed-4","name":"Zinconia-50","category":"Minerals","dose":"50 mg","dosage":50,"unit":"mg","timing":"with_food","frequency":"Weekly","phases":["Any"],"daysLeft":70,"totalDays":70,"expiry":"2028-01-01","purpose":"Zinc — REDUCE frequency to avoid blocking iron absorption","notes":"Take only weekly. Do NOT take with Frootcee on the same day","healthGoals":["Hair health","Immune Support","Skin"],"stockStatus":"Discontinued","source":"India","cost":4,"active":False,"takenToday":False},
        {"id":"seed-5","name":"Frootcee","category":"Vitamins","dose":"39 mg","dosage":39,"unit":"mg","timing":"morning","frequency":"Alternating","phases":["Any"],"daysLeft":30,"totalDays":30,"expiry":"2027-02-28","purpose":"Vitamin C — enhances iron absorption","notes":"Contains ascorbic acid + zinc. Take with iron. Do NOT take with Zinconia on the same day","healthGoals":["Energy","Immune Support","Hair health"],"stockStatus":"Active","source":"India","cost":2.5,"active":True,"takenToday":False},
        {"id":"seed-6","name":"Magnesium Biglycinate","category":"Minerals","dose":"175 mg","dosage":175,"unit":"mg","timing":"evening","frequency":"Daily","phases":["Menstrual","Luteal"],"daysLeft":180,"totalDays":180,"expiry":"2029-03-31","purpose":"Sleep, stress, hormone balance, hair health","notes":"Take 2 hours after iron, in the evening. Contains L-leucine (105mg)","healthGoals":["Sleep","Hormone Balance","Hair health","Bone health"],"stockStatus":"Active","source":"Amazon.ie","cost":15,"active":True,"takenToday":False},
        {"id":"seed-7","name":"Care D3 Plus Nano Shots","category":"Vitamins","dose":"60000 IU","dosage":60000,"unit":"IU","timing":"with_food","frequency":"As Needed","phases":["Any"],"daysLeft":4,"totalDays":4,"expiry":"2026-12-31","purpose":"Vitamin D3 — critical for Ireland winter / low sun exposure","notes":"Summer = 1 vial every 2 months; Winter = 1 vial every 2 weeks","healthGoals":["Bone health","Immune Support","Mood"],"stockStatus":"Active","source":"India","cost":24,"active":True,"takenToday":False},
        {"id":"seed-8","name":"Neurospire D3","category":"Vitamins","dose":"1 tablet","dosage":1,"unit":"tablets","timing":"morning","frequency":"Alternating","phases":["Any"],"daysLeft":60,"totalDays":60,"expiry":"2027-09-30","purpose":"Methylcobalamin (B12) — critical for deficiency (bloodwork: 200 pg/mL)","notes":"Alternate with M-Strong on non-B12 days. Backup B12 source","healthGoals":["Energy","Hair health","Immune Support"],"stockStatus":"Active","source":"India","cost":5,"active":True,"takenToday":False},
        {"id":"seed-9","name":"M-Strong","category":"Vitamins","dose":"1 capsule","dosage":1,"unit":"capsules","timing":"morning","frequency":"Daily","phases":["Any"],"daysLeft":30,"totalDays":30,"expiry":"2028-01-01","purpose":"B12 + metabolic support (methylcobalamin, folic acid, ALA, myo-inositol)","notes":"Alternate with Neurospire D3 on non-B12 days","healthGoals":["Energy","Hormone Balance"],"stockStatus":"Active","source":"India","cost":17.5,"active":True,"takenToday":False},
    ], "lastReset": _TODAY},

    "pantry": {"items": [
        {"id":"paneer-1","name":"Tesco Paneer","category":"Protein","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-10-03","protein":18,"calories":265,"carbs":3,"fat":20},
        {"id":"cheese-1","name":"Milbona Cheesy Singles Light (Lidl)","category":"Dairy","quantity":2,"unit":"slices","status":"In Stock","expiry":"2026-10-19"},
        {"id":"butter-1","name":"Dairy Manor Creamery Butter (unsalted)","category":"Dairy","quantity":220,"unit":"g","status":"In Stock","expiry":"2026-09-18","calories":717,"fat":81},
        {"id":"almond-milk-1","name":"Alpro Almond Milk","category":"Dairy","quantity":1,"unit":"carton","status":"In Stock","expiry":"2026-10-26"},
        {"id":"prunes-1","name":"Tesco Soft Prunes","category":"Produce","quantity":125,"unit":"g","status":"In Stock","expiry":"2027-02-01"},
        {"id":"tomato-puree-1","name":"Tomato Puree Double Concentrate (Lidl)","category":"Condiments","quantity":200,"unit":"g","status":"In Stock","expiry":"2028-09-12"},
        {"id":"lemon-juice-1","name":"Solvita Lemon Juice from Concentrate","category":"Condiments","quantity":200,"unit":"ml","status":"In Stock","expiry":"2027-04-29"},
        {"id":"rice-1","name":"Rice","category":"Grains","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":130,"carbs":28},
        {"id":"amaranth-1","name":"Amaranth","category":"Grains","quantity":1000,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":371,"protein":14,"carbs":65},
        {"id":"rava-1","name":"Upmava (Rava/Semolina)","category":"Grains","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":360,"carbs":73},
        {"id":"popcorn-1","name":"Raw Popcorn","category":"Grains","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":387,"carbs":77},
        {"id":"besan-1","name":"Besan (Chickpea Flour)","category":"Flour","quantity":625,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":387,"protein":22,"carbs":63},
        {"id":"apf-1","name":"All Purpose Flour","category":"Flour","quantity":625,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":364,"carbs":76},
        {"id":"almonds-1","name":"Almonds","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":579,"protein":21,"fat":50},
        {"id":"cashews-1","name":"Cashews","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":553,"protein":18,"fat":44},
        {"id":"pistachios-1","name":"Pistachios","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":560,"protein":20,"fat":45},
        {"id":"peanuts-1","name":"Raw Peanuts","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":567,"protein":26,"fat":49},
        {"id":"flaxseeds-1","name":"Flaxseeds","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":534,"protein":18,"fat":42,"phase":"Follicular"},
        {"id":"sesame-seeds-1","name":"Sesame Seeds","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":563,"protein":17,"fat":50,"phase":"Luteal"},
        {"id":"pumpkin-seeds-1","name":"Pumpkin Seeds","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":541,"protein":24,"fat":45,"phase":"Follicular"},
        {"id":"sunflower-seeds-1","name":"Sunflower Seeds","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":584,"protein":24,"fat":51,"phase":"Luteal"},
        {"id":"chia-seeds-1","name":"Chia Seeds","category":"Nuts/Seeds","quantity":175,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":486,"protein":17,"carbs":42,"fat":31},
        {"id":"chickpeas-dried-1","name":"Dehydrated Chickpeas","category":"Protein","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":120,"protein":7,"carbs":20},
        {"id":"black-channa-1","name":"Dehydrated Black Channa","category":"Protein","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":132,"protein":9,"carbs":24},
        {"id":"kidney-beans-1","name":"Dehydrated Kidney Beans","category":"Protein","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":127,"protein":9,"carbs":23},
        {"id":"olive-oil-light-1","name":"Light Olive Oil (Tesco)","category":"Oils","quantity":750,"unit":"ml","status":"In Stock","expiry":"2026-12-31","calories":824},
        {"id":"olive-oil-evoo-1","name":"Extra Virgin Olive Oil","category":"Oils","quantity":500,"unit":"ml","status":"In Stock","expiry":"2026-12-31","calories":824},
        {"id":"vanilla-extract-1","name":"Vanilla Extract (Tesco)","category":"Condiments","quantity":1,"unit":"bottle","status":"In Stock","expiry":"2026-12-31"},
        {"id":"monk-fruit-1","name":"Monk Fruit Extract (100%)","category":"Condiments","quantity":1,"unit":"bottle","status":"In Stock","expiry":"2026-12-31"},
        {"id":"cinnamon-1","name":"Cinnamon","category":"Spices","quantity":1,"unit":"bottle","status":"In Stock","expiry":"2026-12-31"},
        {"id":"garam-masala-1","name":"Garam Masala","category":"Spices","quantity":1,"unit":"bottle","status":"In Stock","expiry":"2026-12-31"},
        {"id":"chili-powder-1","name":"Red Chili Powder","category":"Spices","quantity":1,"unit":"bottle","status":"In Stock","expiry":"2026-12-31"},
        {"id":"coriander-powder-1","name":"Coriander Powder","category":"Spices","quantity":1,"unit":"bottle","status":"In Stock","expiry":"2026-12-31"},
        {"id":"chana-dal-1","name":"Chana Dal","category":"Spices","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"mustard-seeds-1","name":"Mustard Seeds (Rai)","category":"Spices","quantity":200,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"cumin-seeds-1","name":"Cumin Seeds (Jeera)","category":"Spices","quantity":200,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"turmeric-1","name":"Turmeric","category":"Spices","quantity":200,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"chili-flakes-1","name":"Chili Flakes","category":"Spices","quantity":100,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"dried-chilies-1","name":"Dried Red Chilies","category":"Spices","quantity":100,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"salt-1","name":"Salt","category":"Condiments","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31"},
        {"id":"red-lentils-1","name":"Red Lentils (Masoor Dal)","category":"Protein","quantity":500,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":353,"protein":25,"carbs":60},
        {"id":"sourdough-1","name":"Sourdough Bread","category":"Grains","quantity":6,"unit":"slices","status":"In Stock","expiry":"2026-06-19","calories":265,"protein":9,"carbs":48},
        {"id":"edamame-frozen-1","name":"Frozen Edamame (Tesco)","category":"Protein","quantity":250,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":95,"protein":11,"carbs":7},
        {"id":"cream-cheese-1","name":"Tesco Cream Cheese","category":"Dairy","quantity":150,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":342,"fat":34},
        {"id":"sweetcorn-1","name":"Sweetcorn (frozen)","category":"Produce","quantity":300,"unit":"g","status":"In Stock","expiry":"2026-12-31","calories":86,"carbs":19},
    ]},

    "chores": {"chores": [
        {"id":"fc-dishes",   "label":"Wash dishes",              "category":"Kitchen",   "frequency":"daily",     "dayType":"any",     "duration":10, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-counters", "label":"Wipe counters",            "category":"Kitchen",   "frequency":"daily",     "dayType":"any",     "duration":5,  "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-tidy",     "label":"Tidy room reset",          "category":"Household", "frequency":"daily",     "dayType":"any",     "duration":5,  "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-laundry",  "label":"Laundry",                  "category":"Household", "frequency":"weekly",    "dayType":"wfh",     "duration":30, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-floors",   "label":"Vacuum + mop floors",      "category":"Household", "frequency":"weekly",    "dayType":"wfh",     "duration":30, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-bathroom", "label":"Clean bathroom",           "category":"Household", "frequency":"weekly",    "dayType":"wfh",     "duration":20, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-pantry",   "label":"Refresh pantry drawer",    "category":"Kitchen",   "frequency":"weekly",    "dayType":"any",     "duration":10, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-bottles",  "label":"Clean bottles + containers","category":"Kitchen",  "frequency":"weekly",    "dayType":"any",     "duration":15, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-desk",     "label":"Desk clear + organise",    "category":"Household", "frequency":"weekly",    "dayType":"any",     "duration":10, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-cosm",     "label":"Organise cosmetics",       "category":"Household", "frequency":"weekly",    "dayType":"any",     "duration":10, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-dust",     "label":"Dust surfaces",            "category":"Household", "frequency":"weekly",    "dayType":"wfh",     "duration":15, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-plant",    "label":"Water + wipe Monstera",    "category":"Household", "frequency":"weekly",    "dayType":"any",     "duration":5,  "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-sheets",   "label":"Change bed sheets",        "category":"Household", "frequency":"biweekly",  "dayType":"wfh",     "duration":15, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-oven",     "label":"Deep clean oven",          "category":"Kitchen",   "frequency":"monthly",   "dayType":"weekend", "duration":30, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-cupboards","label":"Wipe down cupboards",      "category":"Household", "frequency":"monthly",   "dayType":"any",     "duration":20, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-kettle",   "label":"Descale kettle",           "category":"Kitchen",   "frequency":"monthly",   "dayType":"any",     "duration":10, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-wardrobe", "label":"Organise wardrobe",        "category":"Household", "frequency":"monthly",   "dayType":"any",     "duration":20, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-laundr2",  "label":"Laundromat run",           "category":"Household", "frequency":"bimonthly", "dayType":"weekend", "duration":90, "fixed":True, "lastDone":None, "nextDue":_TODAY},
        {"id":"fc-kettle2",  "label":"Kettle limescale check",   "category":"Kitchen",   "frequency":"bimonthly", "dayType":"any",     "duration":5,  "fixed":True, "lastDone":None, "nextDue":_TODAY},
    ]},

    "groceries": {"items": [
        {"id":"grocery-1","name":"Fresh Spinach",          "qty":1,   "unit":"bag",    "category":"Produce", "weekOf":"2026-06-15","shop":"Lidl",         "checked":False},
        {"id":"grocery-2","name":"Blueberries",            "qty":1,   "unit":"punnet", "category":"Produce", "weekOf":"2026-06-15","shop":"Lidl",         "checked":False},
        {"id":"grocery-3","name":"Frozen Tender Stem Broccoli","qty":1,"unit":"bag",  "category":"Produce", "weekOf":"2026-06-15","shop":"Lidl",         "checked":False},
        {"id":"grocery-4","name":"Skyr Yogurt",            "qty":500, "unit":"g",      "category":"Dairy",   "weekOf":"2026-06-15","shop":"Lidl",         "checked":False},
        {"id":"grocery-5","name":"Avocado",                "qty":2,   "unit":"pieces", "category":"Produce", "weekOf":"2026-06-15","shop":"Tesco",        "checked":False},
        {"id":"grocery-6","name":"Frozen Edamame (top-up)","qty":1,   "unit":"bag",    "category":"Produce", "weekOf":"2026-06-15","shop":"Tesco",        "checked":False},
        {"id":"grocery-7","name":"Fresh Coriander",        "qty":1,   "unit":"bunch",  "category":"Produce", "weekOf":"2026-06-15","shop":"Indian Store", "checked":False},
        {"id":"grocery-8","name":"Fresh Ginger",           "qty":1,   "unit":"piece",  "category":"Produce", "weekOf":"2026-06-15","shop":"Indian Store", "checked":False},
    ]},

    "blood_tests": {"readings": [
        {"id":"bt-1","marker":"Hemoglobin","value":11.7,"unit":"g/dL","date":"2026-04-10","low":12.0,"high":16.0,"notes":"Low — taking Iron Biglycinate on order"},
        {"id":"bt-2","marker":"Vitamin B12","value":200,"unit":"pg/mL","date":"2026-04-10","low":200,"high":900,"notes":"Borderline deficient — taking Neurospire D3 + M-Strong"},
    ]},
}


@app.route("/api/sheets/seed", methods=["POST"])
def sheets_seed():
    """Populate Google Sheets tabs with the canonical seed data."""
    try:
        body = request.get_json(silent=True) or {}
        stores = body.get("stores") or list(SEED_DATA.keys())
        seeded = []
        errors = {}
        for store in stores:
            if store not in SEED_DATA:
                continue
            if store not in STORE_SPECS:
                continue
            try:
                spec = STORE_SPECS[store]
                rows = spec["extract"](SEED_DATA[store])
                _write_tab(spec["tab"], spec["headers"], rows)
                seeded.append(store)
            except Exception as e:
                errors[store] = str(e)
        return jsonify({"seeded": seeded, "errors": errors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sheets/sync", methods=["POST"])
def sheets_sync():
    """Write one store's localStorage data to its Google Sheet tab."""
    try:
        body = request.get_json(force=True) or {}
        store = body.get("store")
        data  = body.get("data")
        if not store or data is None:
            return jsonify({"error": "Missing 'store' or 'data'"}), 400
        if store not in STORE_SPECS:
            return jsonify({"error": f"Unknown store '{store}'"}), 400
        spec = STORE_SPECS[store]
        rows = spec["extract"](data)
        _write_tab(spec["tab"], spec["headers"], rows)
        return jsonify({"ok": True, "store": store, "rows": len(rows)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sheets/load", methods=["GET", "POST"])
def sheets_load():
    """Read one or all stores from Google Sheets and return localStorage-ready shapes."""
    try:
        body = request.get_json(silent=True) or {}
        stores = body.get("stores") or list(STORE_SPECS.keys())
        result = {}
        errors = {}
        for store in stores:
            if store not in STORE_SPECS:
                continue
            try:
                spec = STORE_SPECS[store]
                _, rows = _read_tab(spec["tab"])
                result[store] = spec["wrap"](rows)
            except Exception as e:
                errors[store] = str(e)
        return jsonify({"data": result, "errors": errors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE CALENDAR INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

def _calendar_service():
    global _cal
    if _cal:
        return _cal
    creds_raw = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not creds_raw:
        raise RuntimeError("GOOGLE_SHEETS_CREDENTIALS not configured")
    from google.oauth2.service_account import Credentials as SACredentials
    from googleapiclient.discovery import build
    creds = SACredentials.from_service_account_info(
        json.loads(creds_raw),
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    _cal = build("calendar", "v3", credentials=creds)
    return _cal


def _calendar_id():
    raw = os.getenv("GOOGLE_CALENDAR_ID", "")
    # Strip accidental @group.calendar.google.com suffix appended to a plain email
    if raw.count("@") > 1:
        raw = raw.split("@group.calendar.google.com")[0]
    return raw or "primary"


@app.route("/api/calendar/events", methods=["GET"])
def calendar_events():
    """Return upcoming calendar events (next 14 days)."""
    try:
        svc = _calendar_service()
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        end = now + timedelta(days=14)
        result = svc.events().list(
            calendarId=_calendar_id(),
            timeMin=now.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=50,
        ).execute()
        events = [
            {
                "id":       e.get("id"),
                "title":    e.get("summary",""),
                "date":     (e.get("start",{}).get("date") or e.get("start",{}).get("dateTime",""))[:10],
                "time":     (e.get("start",{}).get("dateTime",""))[11:16],
                "duration": None,
                "location": e.get("location",""),
                "description": e.get("description",""),
            }
            for e in result.get("items", [])
        ]
        return jsonify({"events": events})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/calendar/event", methods=["POST"])
def calendar_create_event():
    """Create or update a Google Calendar event from a schedule item."""
    try:
        body = request.get_json(force=True) or {}
        title     = body.get("title", "Arc event")
        ev_date   = body.get("date", date.today().isoformat())
        ev_time   = body.get("time", "09:00")
        duration  = int(body.get("duration", 30))
        category  = body.get("category", "")
        notes     = body.get("notes", "")
        event_id  = body.get("eventId")  # present → update

        from datetime import datetime, timezone, timedelta
        start_dt = datetime.fromisoformat(f"{ev_date}T{ev_time}:00")
        end_dt   = start_dt + timedelta(minutes=duration)

        event_body = {
            "summary":     title,
            "description": f"Arc · {category}\n{notes}".strip(" \n·"),
            "start":       {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Dublin"},
            "end":         {"dateTime": end_dt.isoformat(),   "timeZone": "Europe/Dublin"},
            "source":      {"title": "Arc Agents", "url": "https://arc-life-mgmt-hrish.netlify.app"},
        }

        svc = _calendar_service()
        cid = _calendar_id()
        if event_id:
            result = svc.events().update(calendarId=cid, eventId=event_id, body=event_body).execute()
        else:
            result = svc.events().insert(calendarId=cid, body=event_body).execute()

        return jsonify({"ok": True, "eventId": result.get("id"), "link": result.get("htmlLink","")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/calendar/event/<event_id>", methods=["DELETE"])
def calendar_delete_event(event_id: str):
    """Remove a Google Calendar event."""
    try:
        svc = _calendar_service()
        svc.events().delete(calendarId=_calendar_id(), eventId=event_id).execute()
        return jsonify({"ok": True, "deleted": event_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# STATIC FILE SERVING
# ═══════════════════════════════════════════════════════════════════════════════

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'arc-ui', 'project'))


def _no_cache(resp):
    resp.headers["Cache-Control"] = "no-cache, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.route('/')
@app.route('/index.html')
def index():
    try:
        return _no_cache(send_from_directory(STATIC_DIR, 'Arc Agents.html'))
    except Exception:
        return jsonify({"error": "App not found"}), 404


@app.route('/<path:filename>')
def serve_static(filename):
    if filename.startswith('api/'):
        return jsonify({"error": "Endpoint not found"}), 404
    try:
        return _no_cache(send_from_directory(STATIC_DIR, filename))
    except Exception:
        if filename and '.' not in filename:
            return _no_cache(send_from_directory(STATIC_DIR, 'Arc Agents.html'))
        return jsonify({"error": "File not found"}), 404


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

# Vercel serverless function export

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
