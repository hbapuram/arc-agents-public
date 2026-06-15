/* Arc — real token-usage tracker (arc-tokens-v1).

   Captures actual input/output token counts from every /api/* JSON response
   that carries a `usage` field, accumulates them per-day in localStorage, and
   exposes stats for the "Token usage" card on the Agents tab. A single fetch
   wrapper does the capture, so no individual call site needs to change — any
   endpoint that returns `{ usage: { input_tokens, output_tokens } }` is counted.

   Pricing note: cost is *estimated* from public Claude Haiku 4.5 rates and is a
   guide, not a billing figure. */
(function () {
  const KEY = "arc-tokens-v1";

  // Haiku 4.5 list price (USD per million tokens). Blended estimate.
  const PRICE_IN_PER_M  = 1.00;
  const PRICE_OUT_PER_M = 5.00;

  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { days: {} }; }
    catch (e) { return { days: {} }; }
  }
  function _save(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    try { window.dispatchEvent(new Event("arc-tokens-change")); } catch (e) {}
  }
  function _key(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function recordTokens(input, output) {
    input = Number(input) || 0;
    output = Number(output) || 0;
    if (input <= 0 && output <= 0) return;
    const o = _load();
    const k = _key(new Date());
    const day = o.days[k] || { input: 0, output: 0, calls: 0 };
    day.input += input;
    day.output += output;
    day.calls += 1;
    o.days[k] = day;
    _save(o);
  }

  function _sumRange(days, n) {
    let input = 0, output = 0, calls = 0;
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const e = days[_key(d)];
      if (e) { input += e.input; output += e.output; calls += e.calls; }
    }
    return { input, output, calls, total: input + output };
  }

  // Estimated USD cost for an {input, output} pair.
  function estCost(stat) {
    const c = (stat.input * PRICE_IN_PER_M + stat.output * PRICE_OUT_PER_M) / 1_000_000;
    return c;
  }

  function getTokenStats() {
    const o = _load();
    const days = o.days || {};
    const letters = ["S", "M", "T", "W", "T", "F", "S"];
    const series = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const e = days[_key(d)];
      series.push({ label: letters[d.getDay()], total: e ? e.input + e.output : 0, isToday: i === 0 });
    }
    const vals = Object.values(days);
    const all = {
      input:  vals.reduce((a, b) => a + b.input, 0),
      output: vals.reduce((a, b) => a + b.output, 0),
      calls:  vals.reduce((a, b) => a + b.calls, 0),
    };
    all.total = all.input + all.output;
    return {
      today: _sumRange(days, 1),
      week:  _sumRange(days, 7),
      month: _sumRange(days, 30),
      all,
      series,
      hasData: all.calls > 0,
    };
  }

  // Re-render hook for components showing token stats.
  function useTokenVersion() {
    const [, set] = React.useState(0);
    React.useEffect(() => {
      const h = () => set(v => v + 1);
      window.addEventListener("arc-tokens-change", h);
      return () => window.removeEventListener("arc-tokens-change", h);
    }, []);
  }

  // ── Fetch interceptor: capture `usage` from any /api/* JSON response ──
  // Installed once. Clones the response (so the original body stays readable by
  // the caller) and records token counts off the main path.
  if (!window.__arcTokenFetchWrapped && typeof window.fetch === "function") {
    window.__arcTokenFetchWrapped = true;
    const _origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const resp = await _origFetch(input, init);
      try {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        const ct = resp.headers.get("content-type") || "";
        if (url.indexOf("/api/") !== -1 && ct.indexOf("application/json") !== -1) {
          resp.clone().json().then(data => {
            const u = data && data.usage;
            if (u) recordTokens(u.input_tokens, u.output_tokens);
          }).catch(() => {});
        }
      } catch (e) { /* never let tracking break a request */ }
      return resp;
    };
  }

  Object.assign(window, { recordTokens, getTokenStats, useTokenVersion, estTokenCost: estCost });
})();
