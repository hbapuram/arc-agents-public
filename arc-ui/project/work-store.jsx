/* work-store.jsx — day type + work time stamps
 * key: arc-work-v1
 * shape: { days: { "YYYY-MM-DD": { dayType, loginTime, lunchStart, lunchEnd, logoutTime } } }
 * Default pattern: Mon=wfh, Tue=office, Wed=office, Thu=wfh, Fri=office, Sat/Sun=off
 */

const WORK_STORE_KEY = "arc-work-v1";

// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DEFAULT_DAY_TYPE = ["off", "wfh", "office", "office", "wfh", "office", "off"];
const DAY_TYPE_LABELS  = { office: "Office", wfh: "WFH", off: "Day off" };
const DAY_TYPE_ICONS   = { office: "🏢", wfh: "🏠", off: "🌿" };

function _workTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function loadWork() {
  try {
    const raw = localStorage.getItem(WORK_STORE_KEY);
    if (raw) { const o = JSON.parse(raw); return { days: (o.days && typeof o.days === "object") ? o.days : {} }; }
  } catch (e) {}
  return { days: {} };
}

function saveWork(o) {
  try { localStorage.setItem(WORK_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("workchange"));
}

function getDayType(dateStr) {
  const key = dateStr || _workTodayKey();
  const o = loadWork();
  if (o.days[key] && o.days[key].dayType) return o.days[key].dayType;
  const dow = new Date(key + "T00:00:00").getDay();
  return DEFAULT_DAY_TYPE[dow];
}

function setDayType(type, dateStr) {
  const key = dateStr || _workTodayKey();
  const o = loadWork();
  o.days[key] = { ...(o.days[key] || {}), dayType: type };
  saveWork(o);
}

function getTodayWork() {
  return loadWork().days[_workTodayKey()] || {};
}

function stampWork(edits) {
  const key = _workTodayKey();
  const o = loadWork();
  o.days[key] = { ...(o.days[key] || {}), ...edits };
  saveWork(o);
}

// Returns total hours worked (login→logout minus lunch break), or partial if still working
function calcHoursWorked(work) {
  const { loginTime, lunchStart, lunchEnd, logoutTime } = work || {};
  if (!loginTime) return null;
  const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const d = new Date();
  const nowMins = d.getHours() * 60 + d.getMinutes();
  const endMins = logoutTime ? toMins(logoutTime) : nowMins;
  let worked = endMins - toMins(loginTime);
  if (lunchStart && lunchEnd) {
    worked -= (toMins(lunchEnd) - toMins(lunchStart));
  } else if (lunchStart && !lunchEnd) {
    worked -= (nowMins - toMins(lunchStart));
  }
  return Math.max(0, worked / 60);
}

function useWorkVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("workchange", h);
    return () => window.removeEventListener("workchange", h);
  }, []);
  return v;
}

// ── DayTypePill ──────────────────────────────────────────────────────────────
function DayTypePill() {
  useWorkVersion();
  const dayType = getDayType();
  const cycle = () => {
    const next = { office: "wfh", wfh: "off", off: "office" }[dayType] || "wfh";
    setDayType(next);
  };
  return (
    <button className="day-type-pill" onClick={cycle} title="Tap to change day type">
      <span>{DAY_TYPE_ICONS[dayType]}</span>
      <span>{DAY_TYPE_LABELS[dayType] || "WFH"}</span>
      <span className="day-type-pill-change">change</span>
    </button>
  );
}

// ── WorkTracker ──────────────────────────────────────────────────────────────
function WorkTracker() {
  useWorkVersion();
  const work    = getTodayWork();
  const dayType = getDayType();
  const [editing, setEditing] = React.useState(false);
  const [form,    setForm]    = React.useState({
    loginTime: "", lunchStart: "", lunchEnd: "", logoutTime: "",
  });

  if (dayType === "off") return null;

  const nowStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const stamp = (field) => stampWork({ [field]: nowStr() });

  const openEdit = () => {
    setForm({
      loginTime:  work.loginTime  || "",
      lunchStart: work.lunchStart || "",
      lunchEnd:   work.lunchEnd   || "",
      logoutTime: work.logoutTime || "",
    });
    setEditing(true);
  };

  const saveEdit = () => { stampWork(form); setEditing(false); };

  const hours    = calcHoursWorked(work);
  const hoursStr = hours != null
    ? `${Math.floor(hours)}h ${String(Math.round((hours % 1) * 60)).padStart(2,"0")}m`
    : null;

  // Determine which button is "next" to tap
  const nextField = !work.loginTime ? "loginTime"
    : !work.lunchStart              ? "lunchStart"
    : work.lunchStart && !work.lunchEnd ? "lunchEnd"
    : !work.logoutTime              ? "logoutTime"
    : null;

  const isDisabled = (field) => {
    if (field === "loginTime")  return !!work.loginTime;
    if (field === "lunchStart") return !work.loginTime || !!work.lunchStart;
    if (field === "lunchEnd")   return !work.lunchStart || !!work.lunchEnd;
    if (field === "logoutTime") return !work.loginTime  || !!work.logoutTime;
    return false;
  };

  const STAMPS = [
    { field: "loginTime",  label: "Login"     },
    { field: "lunchStart", label: "Lunch"     },
    { field: "lunchEnd",   label: "Lunch end" },
    { field: "logoutTime", label: "Logout"    },
  ];

  return (
    <section className="card work-tracker">
      <div className="lbl work-tracker-lbl">
        {DAY_TYPE_ICONS[dayType]} {DAY_TYPE_LABELS[dayType]} · Work tracker
      </div>
      {!editing ? (
        <>
          <div className="work-stamps">
            {STAMPS.map(({ field, label }) => (
              <button
                key={field}
                className={`work-stamp-btn${work[field] ? " stamped" : ""}${nextField === field ? " next" : ""}`}
                onClick={() => !isDisabled(field) && stamp(field)}
                disabled={isDisabled(field)}
                title={work[field] ? `${label}: ${work[field]}` : `Tap to stamp ${label}`}
              >
                <span className="work-stamp-label">{label}</span>
                <span className="work-stamp-time">
                  {work[field] || (nextField === field ? "tap" : "—")}
                </span>
              </button>
            ))}
          </div>
          {hoursStr && (
            <div className="work-hours">
              {work.logoutTime ? `${hoursStr} worked today` : `${hoursStr} so far`}
              {work.lunchStart && work.lunchEnd && ` · lunch ${work.lunchStart}–${work.lunchEnd}`}
            </div>
          )}
          <button className="work-edit-link" onClick={openEdit}>Edit times</button>
        </>
      ) : (
        <div className="work-edit-form">
          {STAMPS.map(({ field, label }) => (
            <label key={field} className="work-edit-field">
              <span>{label}</span>
              <input
                type="time"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              />
            </label>
          ))}
          <div className="work-edit-actions">
            <button className="btn-action" style={{ fontSize: 12, padding: "6px 14px" }} onClick={saveEdit}>Save</button>
            <button className="btn-action ghost" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

Object.assign(window, {
  WORK_STORE_KEY, DEFAULT_DAY_TYPE, DAY_TYPE_LABELS, DAY_TYPE_ICONS,
  loadWork, saveWork, getDayType, setDayType,
  getTodayWork, stampWork, calcHoursWorked, useWorkVersion,
  DayTypePill, WorkTracker,
});
