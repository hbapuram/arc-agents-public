/* sync-store.jsx — Google Sheets + Calendar sync layer (v20260614g) */

const { useState, useEffect, useCallback } = React;

// Maps store name (used by API) → localStorage key
const SYNC_STORE_KEYS = {
  pantry:       "arc-pantry-v1",
  supplements:  "arc-supplements-v2",
  chores:       "arc-chores-v1",
  groceries:    "arc-groceries-v1",
  meals:        "arc-meals-v1",
  health_log:   "arc-health-v1",
  workouts:     "arc-workouts-v1",
  symptoms:     "arc-symptoms-v1",
  blood_tests:  "arc-bloodtests-v1",
  body:         "arc-body-v1",
  skincare:     "arc-skincare-v1",
  schedule:     "arc-schedule-v1",
  water_log:    "arc-water-v1",
  shop_prefs:   "arc-shops-v1",
  purchase_log: "arc-purchase-log-v1",
  macro_goals:  "arc-macro-goals-v1",
};

// Events each store fires on mutation → used for auto-sync
const SYNC_EVENTS = {
  pantry:       "pantrychange",
  supplements:  "supplementschange",
  chores:       "choreschange",
  groceries:    "grocerieschange",
  meals:        "mealschange",
  health_log:   "healthchange",
  workouts:     "workoutschange",
  symptoms:     "symptomschange",
  blood_tests:  "bloodtestschange",
  body:         "bodychange",
  skincare:     "skincarechange",
  schedule:     "schedulechange",
  water_log:    "waterchange",
  shop_prefs:   "shopschange",
};

const SYNC_STATUS_KEY = "arc-sync-status-v1";

function _loadSyncStatus() {
  try { return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY) || "{}"); } catch { return {}; }
}
function _saveSyncStatus(s) {
  try { localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new CustomEvent("syncstorage"));
}

// ── Core API calls ────────────────────────────────────────────────────────────

async function syncToSheets(store, data) {
  const res = await fetch("/api/sheets/sync", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ store, data }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Sync failed");
  return json;
}

async function loadFromSheets(stores) {
  const res = await fetch("/api/sheets/load", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ stores: stores || Object.keys(SYNC_STORE_KEYS) }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Load failed");
  return json.data || {};
}

async function seedSheets(stores) {
  const res = await fetch("/api/sheets/seed", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ stores: stores || ["supplements","pantry","chores","groceries","blood_tests"] }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Seed failed");
  return json;
}

async function scheduleInCalendar(item) {
  const res = await fetch("/api/calendar/event", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(item),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Calendar failed");
  return json; // { ok, eventId, link }
}

async function deleteFromCalendar(eventId) {
  const res = await fetch(`/api/calendar/event/${eventId}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Delete failed");
  return json;
}

async function getCalendarEvents() {
  const res = await fetch("/api/calendar/events");
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Fetch failed");
  return json.events || [];
}

// ── Bulk sync / restore ───────────────────────────────────────────────────────

async function syncAllToSheets(onProgress) {
  const stores = Object.keys(SYNC_STORE_KEYS);
  const errors = {};
  let done = 0;
  for (const store of stores) {
    try {
      const raw = localStorage.getItem(SYNC_STORE_KEYS[store]);
      if (!raw) { done++; onProgress && onProgress(done, stores.length, store); continue; }
      const data = JSON.parse(raw);
      await syncToSheets(store, data);
    } catch (e) {
      errors[store] = e.message;
    }
    done++;
    onProgress && onProgress(done, stores.length, store);
  }
  const status = { lastSync: new Date().toISOString(), errors };
  _saveSyncStatus(status);
  return status;
}

async function restoreFromSheets(onProgress) {
  const stores = Object.keys(SYNC_STORE_KEYS);
  onProgress && onProgress(0, stores.length, "loading…");
  const result = await loadFromSheets(stores);
  const errors = {};
  let done = 0;
  for (const store of stores) {
    if (result[store]) {
      try {
        localStorage.setItem(SYNC_STORE_KEYS[store], JSON.stringify(result[store]));
        // Fire change events so React components re-render
        const ev = SYNC_EVENTS[store];
        if (ev) window.dispatchEvent(new CustomEvent(ev));
      } catch (e) {
        errors[store] = e.message;
      }
    }
    done++;
    onProgress && onProgress(done, stores.length, store);
  }
  const status = { lastRestore: new Date().toISOString(), errors };
  _saveSyncStatus({ ..._loadSyncStatus(), ...status });
  return status;
}

// ── Auto-sync (debounced, 4 s after last change) ──────────────────────────────

const _pending = {};

function _debouncedSync(store, ms = 4000) {
  if (_pending[store]) clearTimeout(_pending[store]);
  _pending[store] = setTimeout(async () => {
    try {
      const raw = localStorage.getItem(SYNC_STORE_KEYS[store]);
      if (!raw) return;
      await syncToSheets(store, JSON.parse(raw));
      const s = _loadSyncStatus();
      s.autoSync = s.autoSync || {};
      s.autoSync[store] = new Date().toISOString();
      _saveSyncStatus(s);
    } catch (_) { /* silent — auto-sync failures don't need to surface */ }
  }, ms);
}

function setupAutoSync() {
  Object.entries(SYNC_EVENTS).forEach(([store, event]) => {
    window.addEventListener(event, () => _debouncedSync(store));
  });
}

// ── useSyncStatus hook ────────────────────────────────────────────────────────

function useSyncStatus() {
  const [status, setStatus] = useState(_loadSyncStatus);
  useEffect(() => {
    const h = () => setStatus(_loadSyncStatus());
    window.addEventListener("syncstorage", h);
    return () => window.removeEventListener("syncstorage", h);
  }, []);
  return status;
}

// Start auto-sync wiring immediately when this script loads
setupAutoSync();

Object.assign(window, {
  syncToSheets,
  loadFromSheets,
  seedSheets,
  syncAllToSheets,
  restoreFromSheets,
  scheduleInCalendar,
  deleteFromCalendar,
  getCalendarEvents,
  useSyncStatus,
  SYNC_STORE_KEYS,
});
