const { useState, useEffect, useCallback, useRef } = React;

// ─── PROGRAM DATA ──────────────────────────────────────────────────────────────
const PROGRAM = {
  mon: {
    id: "mon", label: "Monday", name: "Lower Strength", focus: "Squat · RDL · Rehab",
    rehab: ["Couch Stretch"],
    exercises: [
      { id: "squat", name: "Barbell Squat", sets: 4, reps: "5", prescription: "4×5", note: "Heavy. 3–4 min rest. Strength work." },
      { id: "rdl", name: "Romanian Deadlift", sets: 3, reps: "8", prescription: "3×8", note: "Control the eccentric. 2 min rest." },
      { id: "patrick", name: "Patrick Step Down", sets: 3, reps: "15 ea", prescription: "3×15", note: "Slow 3–4 sec lowering. Knee rehab cornerstone.", bodyweight: true },
      { id: "tibialis", name: "Tibialis Raise", sets: 3, reps: "25", prescription: "3×25", note: "Toes up against wall.", bodyweight: true },
      { id: "calf", name: "Seated Calf Raise", sets: 3, reps: "20", prescription: "3×20", note: "Soleus focus. Pause at bottom stretch." },
    ]
  },
  tue: {
    id: "tue", label: "Tuesday", name: "Upper Push", focus: "Bench · OHP · Tris",
    rehab: [],
    exercises: [
      { id: "bench", name: "Barbell Bench Press", sets: 4, reps: "5", prescription: "4×5", note: "Heavy. 3–4 min rest." },
      { id: "incline", name: "Incline DB Press", sets: 3, reps: "10", prescription: "3×10", note: "Full range. Pause at bottom." },
      { id: "ohp", name: "Overhead Press", sets: 3, reps: "8", prescription: "3×8", note: "Strict form. No leg drive.", injuryFlag: "⚠ Shoulder — manage load. Note any pain." },
      { id: "lateral", name: "Lateral Raise", sets: 3, reps: "15", prescription: "3×15", note: "Light. Control throughout." },
      { id: "tricep", name: "Tricep Pushdown", sets: 3, reps: "12", prescription: "3×12", note: "Cable or band." },
    ]
  },
  wed: {
    id: "wed", label: "Wednesday", name: "Conditioning", focus: "Intervals · Tempo",
    rehab: [], conditioning: true, exercises: [],
  },
  thu: {
    id: "thu", label: "Thursday", name: "Lower Athletic", focus: "Trap Bar · Hinge · Glutes",
    rehab: ["Couch Stretch"],
    exercises: [
      { id: "trapbar", name: "Trap Bar Deadlift", sets: 4, reps: "6", prescription: "4×6", note: "Athletic hinge. 2–3 min rest." },
      { id: "atg", name: "ATG Split Squat", sets: 3, reps: "10 ea", prescription: "3×10", note: "Bodyweight only until hip flexor resolves.", injuryFlag: "⚠ Left hip flexor — bodyweight only.", bodyweight: true },
      { id: "slantboard", name: "Slant Board Squat", sets: 3, reps: "12", prescription: "3×12", note: "Heels elevated ~30°. Knees forward intentionally.", bodyweight: true },
      { id: "nordic", name: "Nordic Curl", sets: 3, reps: "5", prescription: "3×5", note: "Partial negatives OK. Anchor feet under something heavy.", bodyweight: true },
      { id: "hipthrust", name: "Hip Thrust", sets: 3, reps: "12", prescription: "3×12", note: "Full extension at top. Pause 1 sec." },
    ]
  },
  fri: {
    id: "fri", label: "Friday", name: "Upper Pull", focus: "Pull-ups · Rows · Curls",
    rehab: [],
    exercises: [
      { id: "pullup", name: "Weighted Pull-Up", sets: 4, reps: "6", prescription: "4×6", note: "Pull-ups preferred. Full hang at bottom." },
      { id: "row", name: "Barbell Row", sets: 3, reps: "8", prescription: "3×8", note: "Chest supported or bent over. Heavy." },
      { id: "facepull", name: "Face Pull", sets: 3, reps: "15", prescription: "3×15", note: "Cable. External rotation. Shoulder health." },
      { id: "hammer", name: "Hammer Curl", sets: 3, reps: "12", prescription: "3×12", note: "Neutral grip. No swinging." },
      { id: "pullpart", name: "Band Pull Apart", sets: 3, reps: "20", prescription: "3×20", note: "Shoulder health. Light band, perfect form.", bodyweight: true },
    ]
  },
  sat: {
    id: "sat", label: "Saturday", name: "Zone 2", focus: "Aerobic base",
    rehab: [], conditioning: true, exercises: [],
  },
};

const DAYS_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat"];
const DELOAD_WEEKS = [4, 8];
const DELOAD_FACTOR = 0.55;

// ─── LOCAL STORAGE ENGINE ─────────────────────────────────────────────────────────
const storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  list: () => {
    try { return Object.keys(localStorage); } catch { return []; }
  }
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getPreviousData(dayId, exerciseId) {
  const keys = storage.list().filter(k => k.startsWith(`workout:${dayId}:`)).sort().reverse();
  for (const key of keys) {
    const session = storage.get(key);
    if (session?.sets?.[exerciseId]) return session.sets[exerciseId];
  }
  return null;
}

function suggestNextWeight(prevSets, isDeload) {
  if (!prevSets?.length) return "";
  const doneSets = prevSets.filter(s => s.done);
  if (!doneSets.length) return prevSets[0].weight || "";
  const lastWeight = parseFloat(doneSets[doneSets.length - 1].weight) || 0;
  const allComplete = doneSets.length >= prevSets.length;
  const targetReps = parseInt(doneSets[0].targetReps) || 0;
  const allMaxReps = doneSets.every(s => parseInt(s.reps) >= targetReps);
  
  let suggested = lastWeight;
  if (allComplete && allMaxReps && !isDeload) suggested = lastWeight + 5;
  if (isDeload) suggested = Math.round((lastWeight * DELOAD_FACTOR) / 5) * 5;
  return suggested > 0 ? String(suggested) : "";
}

function initSets(ex, prevSets, isDeload) {
  const targetSets = isDeload ? Math.ceil(ex.sets * 0.5) : ex.sets;
  const suggested = ex.bodyweight ? "BW" : suggestNextWeight(prevSets, isDeload);
  return Array.from({ length: targetSets }, (_, i) => {
    let weight = suggested;
    if (prevSets?.[i]) {
      if (ex.bodyweight) weight = "BW";
      else if (isDeload) weight = String(Math.round((parseFloat(prevSets[i].weight) || 0) * DELOAD_FACTOR / 5) * 5) || suggested;
      else weight = prevSets[i].weight;
    }
    return { weight, reps: String(ex.reps), targetReps: String(ex.reps), done: false };
  });
}

// ─── STYLES (CSS INJECT) ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
  :root {
    --bg: #0f1117; --surface: #181c26; --surface2: #1e2435; --border: #2a3045;
    --accent: #c8f03a; --text: #e8ecf4; --text-dim: #7a8299; --text-dimmer: #4a5268;
    --red: #ff4f4f; --red-dim: rgba(255,79,79,0.12);
    --orange: #f0923a; --green: #3af09a; --green-dim: rgba(58,240,154,0.12);
    --mono: 'JetBrains Mono', monospace;
    --radius: 12px; --radius-sm: 8px;
  }
  .jt-root * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  .jt-root { background: var(--bg); color: var(--text); font-family: -apple-system, system-ui, sans-serif; font-size: 15px; min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 80px; }
  .jt-header { background: var(--bg); border-bottom: 1px solid var(--border); padding: 16px; display: flex; align-items: center; justify-content: space-between; }
  .jt-header-title { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); font-family: var(--mono); }
  .jt-header-sub { font-size: 11px; color: var(--text-dim); font-family: var(--mono); }
  .jt-screen { flex: 1; overflow-y: auto; }
  .jt-week-bar { display: flex; gap: 8px; padding: 12px 16px; overflow-x: auto; scrollbar-width: none; }
  .jt-week-bar::-webkit-scrollbar { display: none; }
  .jt-week-pill { flex-shrink: 0; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); font-size: 12px; font-family: var(--mono); cursor: pointer; color: var(--text-dim); background: var(--surface); white-space: nowrap; transition: all 0.15s; }
  .jt-week-pill.active { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 700; }
  .jt-week-pill.deload { border-color: var(--orange); color: var(--orange); }
  .jt-week-pill.deload.active { background: var(--orange); color: var(--bg); }
  .jt-section-header { padding: 20px 16px 8px; display: flex; align-items: center; gap: 10px; }
  .jt-section-title { font-size: 11px; font-family: var(--mono); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-dim); }
  .jt-divider { flex: 1; height: 1px; background: var(--border); }
  .jt-day-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
  .jt-day-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 14px; cursor: pointer; position: relative; overflow: hidden; }
  .jt-day-card.done { border-color: rgba(58,240,154,0.3); }
  .jt-day-label { font-size: 10px; font-family: var(--mono); color: var(--text-dim); margin-bottom: 4px; }
  .jt-day-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .jt-day-focus { font-size: 12px; color: var(--text-dim); }
  .jt-done-badge { position: absolute; top: 12px; right: 12px; width: 18px; height: 18px; border-radius: 50%; background: var(--green-dim); border: 1px solid var(--green); color: var(--green); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .jt-back-bar { display: flex; align-items: center; gap: 12px; padding: 16px; }
  .jt-back-btn { background: none; border: none; color: var(--accent); font-size: 14px; cursor: pointer; font-family: var(--mono); }
  .jt-workout-title { font-size: 20px; font-weight: 800; color: var(--text); }
  .jt-workout-sub { font-size: 11px; color: var(--text-dim); font-family: var(--mono); }
  .jt-ex-card { margin: 0 16px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
  .jt-ex-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .jt-ex-name { font-size: 16px; font-weight: 700; color: var(--text); }
  .jt-ex-rx { font-size: 11px; font-family: var(--mono); color: var(--text-dim); background: var(--surface2); padding: 3px 8px; border-radius: 4px; }
  .jt-ex-note { font-size: 12px; color: var(--text-dim); font-style: italic; margin-bottom: 12px; }
  .jt-injury { padding: 6px 10px; background: var(--red-dim); border-left: 2px solid var(--red); border-radius: 4px; font-size: 12px; color: var(--red); margin-bottom: 10px; }
  .jt-set-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .jt-set-label { font-size: 12px; font-family: var(--mono); color: var(--text-dimmer); width: 24px; }
  .jt-stepper-group { display: flex; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .jt-step-btn { width: 32px; height: 40px; background: transparent; border: none; color: var(--text-dim); font-size: 18px; font-weight: 600; cursor: pointer; }
  .jt-step-btn:active { background: rgba(255,255,255,0.05); }
  .jt-set-input { width: 50px; height: 40px; background: transparent; border: none; color: var(--text); font-size: 15px; font-family: var(--mono); font-weight: 600; text-align: center; outline: none; -webkit-appearance: none; }
  .jt-set-input.done { color: var(--green); }
  .jt-bw-lbl { width: 114px; text-align: center; font-size: 14px; font-family: var(--mono); color: var(--text-dim); font-weight: 600; }
  .jt-unit-lbl { font-size: 11px; font-family: var(--mono); color: var(--text-dimmer); margin-left: 2px; }
  .jt-done-btn { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface2); cursor: pointer; color: var(--text-dimmer); font-size: 16px; font-weight: 700; transition: all 0.15s; margin-left: auto; }
  .jt-done-btn.done { background: var(--green-dim); border-color: var(--green); color: var(--green); }
  .jt-add-set-btn { width: 100%; padding: 10px; background: transparent; border: 1px dashed var(--border); border-radius: var(--radius-sm); color: var(--text-dim); font-size: 12px; cursor: pointer; font-family: var(--mono); }
  .jt-cond-card { margin: 0 16px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .jt-cond-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 12px; line-height: 1.4; }
  .jt-duration-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .jt-duration-input { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--accent); font-size: 22px; font-family: var(--mono); font-weight: 700; text-align: center; padding: 8px; width: 80px; outline: none; }
  .jt-cond-textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: 14px; padding: 12px; min-height: 90px; resize: none; outline: none; font-family: inherit; }
  .jt-rehab-card { margin: 0 16px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px 14px; }
  .jt-rehab-item { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .jt-rehab-item:last-child { border-bottom: none; }
  .jt-rehab-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 12px; color: transparent; transition: all 0.15s; }
  .jt-rehab-item.done .jt-rehab-check { background: var(--green-dim); border-color: var(--green); color: var(--green); }
  .jt-rehab-text { font-size: 15px; font-weight: 600; }
  .jt-rehab-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
  .jt-save-area { padding: 16px; margin-top: 10px; }
  .jt-save-btn { width: 100%; padding: 16px; background: var(--accent); color: var(--bg); border: none; border-radius: var(--radius); font-size: 14px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; font-family: var(--mono); cursor: pointer; }
  .jt-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg); border-top: 1px solid var(--border); display: flex; height: 64px; z-index: 200; }
  .jt-nav-btn { flex: 1; background: none; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--text-dimmer); }
  .jt-nav-btn.active { color: var(--accent); }
  .jt-nav-icon { font-size: 18px; }
  .jt-nav-label { font-size: 10px; font-family: var(--mono); font-weight: 700; letter-spacing: 0.04em; }
  .jt-toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); background: var(--accent); color: var(--bg); padding: 12px 24px; border-radius: 24px; font-size: 13px; font-weight: 700; font-family: var(--mono); z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.2s ease; opacity: 0; pointer-events: none; }
  .jt-toast.show { opacity: 1; }
  .jt-empty { text-align: center; padding: 48px 24px; color: var(--text-dim); }
  .jt-history-entry { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin: 0 16px 10px; overflow: hidden; }
  .jt-history-header { padding: 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
  .jt-history-title { font-size: 15px; font-weight: 700; }
  .jt-history-date { font-size: 11px; color: var(--text-dim); font-family: var(--mono); }
  .jt-history-body { padding: 0 14px 14px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.1); }
  .jt-history-row { font-size: 13px; font-family: var(--mono); color: var(--text-dim); padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; }
  .jt-history-row:last-child { border-bottom: none; }
  .jt-history-val { color: var(--accent); font-weight: 600; }
`;

// ─── COMPONENTS ────────────────────────────────────────────────────────────────
function StepperInput({ value, onChange, isDone, step, placeholder, unit }) {
  const handleStep = (dir) => {
    const current = parseFloat(value) || 0;
    const next = Math.max(0, current + dir * step);
    onChange(String(next));
  };

  return (
    <div className="jt-stepper-group">
      <button className="jt-step-btn" onClick={() => handleStep(-1)}>-</button>
      <input type="number" inputMode="decimal" className={`jt-set-input ${isDone ? 'done' : ''}`}
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      <button className="jt-step-btn" onClick={() => handleStep(1)}>+</button>
    </div>
  );
}

function ExerciseCard({ ex, sets, onUpdateSet, onToggleDone, onAddSet }) {
  return (
    <div className="jt-ex-card">
      <div className="jt-ex-header">
        <div className="jt-ex-name">{ex.name}</div>
        <div className="jt-ex-rx">{ex.prescription}</div>
      </div>
      {ex.injuryFlag && <div className="jt-injury">{ex.injuryFlag}</div>}
      {ex.note && <div className="jt-ex-note">{ex.note}</div>}
      <div>
        {sets.map((set, i) => (
          <div className="jt-set-row" key={i}>
            <div className="jt-set-label">S{i + 1}</div>
            {ex.bodyweight ? (
              <div className="jt-bw-lbl">BW</div>
            ) : (
              <>
                <StepperInput value={set.weight} step={5} isDone={set.done} placeholder="lbs" onChange={val => onUpdateSet(i, "weight", val)} />
                <span className="jt-unit-lbl">lbs</span>
              </>
            )}
            <span style={{ color: 'var(--text-dimmer)', margin: '0 4px', fontFamily: 'var(--mono)' }}>×</span>
            <StepperInput value={set.reps} step={1} isDone={set.done} placeholder="reps" onChange={val => onUpdateSet(i, "reps", val)} />
            <span className="jt-unit-lbl">reps</span>
            <button className={`jt-done-btn ${set.done ? 'done' : ''}`} onClick={() => onToggleDone(i)}>✓</button>
          </div>
        ))}
        <button className="jt-add-set-btn" onClick={onAddSet}>+ Add Custom Set</button>
      </div>
    </div>
  );
}

function RehabItem({ name, done, onToggle }) {
  const subs = {
    "Patrick Step Down": "3×15 ea — slow 3–4 sec lowering phase",
    "Tibialis Raise": "3×25 reps — toes up locked against wall",
    "Couch Stretch": "2 mins static hold per side",
  };
  return (
    <div className={`jt-rehab-item ${done ? 'done' : ''}`} onClick={onToggle}>
      <div className="jt-rehab-check">✓</div>
      <div>
        <div className="jt-rehab-text">{name}</div>
        <div className="jt-rehab-sub">{subs[name] || "Structure longevity recovery work"}</div>
      </div>
    </div>
  );
}

function ConditioningCard({ day, condData, onUpdateCond }) {
  const isWed = day.id === "wed";
  return (
    <div className="jt-cond-card">
      <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', fontWeight: '700', color: 'var(--orange)', marginBottom: '6px', textTransform: 'uppercase' }}>
        {isWed ? "Interval / Tempo Framework" : "Aerobic Base Target"}
      </div>
      <div className="jt-cond-desc">
        {isWed
          ? "Intervals: 6–8 × 400m @ 90 sec rest | Tempo: 20–25 min Zone 3–4. Alternating weeks."
          : "60–75 min continuous Zone 2 run. HRM enforced. Add 5 mins every 2–3 weeks."
        }
      </div>
      <div className="jt-duration-row">
        <input type="number" inputMode="numeric" className="jt-duration-input" placeholder="—" value={condData.duration} onChange={e => onUpdateCond("duration", e.target.value)} />
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>mins elapsed</div>
      </div>
      <textarea className="jt-cond-textarea" placeholder={isWed ? "Log metrics — intervals completed, target pacing, split times, overall feel..." : "Log metrics — average heart rate metrics, selected trail route, weather conditions..."} value={condData.notes} onChange={e => onUpdateCond("notes", e.target.value)} />
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="jt-section-header">
      <span className="jt-section-title">{title}</span>
      <div className="jt-divider" />
    </div>
  );
}

// ─── SCREENS ───────────────────────────────────────────────────────────────────
function HomeScreen({ currentWeek, setCurrentWeek, completedDays, onSelectDay }) {
  return (
    <div className="jt-screen">
      <SectionHeader title="Training Week" />
      <div className="jt-week-bar">
        {Array.from({ length: 8 }, (_, i) => i + 1).map(w => {
          const isDeload = DELOAD_WEEKS.includes(w);
          return (
            <div key={w} className={`jt-week-pill ${isDeload ? 'deload' : ''} ${w === currentWeek ? 'active' : ''}`} onClick={() => setCurrentWeek(w)}>
              {isDeload ? `Wk ${w} ⚡ Deload` : `Week ${w}`}
            </div>
          );
        })}
      </div>
      <SectionHeader title="Select Routine" />
      <div className="jt-day-grid">
        {DAYS_ORDER.map(id => {
          const day = PROGRAM[id];
          const done = completedDays.has(id);
          return (
            <div key={id} className={`jt-day-card ${done ? 'done' : ''}`} onClick={() => onSelectDay(id)}>
              <div className="jt-day-label">{day.label}</div>
              <div className="jt-day-name">{day.name}</div>
              <div className="jt-day-focus">{day.focus}</div>
              {done && <div className="jt-done-badge">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkoutScreen({ dayId, currentWeek, sessionSets, sessionRehab, condData, onUpdateSet, onToggleDone, onAddSet, onToggleRehab, onUpdateCond, onSave, onBack }) {
  const day = PROGRAM[dayId];
  const isDeload = DELOAD_WEEKS.includes(currentWeek);

  return (
    <div className="jt-screen">
      <div className="jt-back-bar">
        <button className="jt-back-btn" onClick={onBack}>← Dashboard</button>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div className="jt-workout-title">{day.name}</div>
          <div className="jt-workout-sub">Week {currentWeek} {isDeload ? "⚡ Deload" : ""}</div>
        </div>
      </div>

      {day.conditioning ? (
        <>
          <SectionHeader title="Conditioning Tracking" />
          <ConditioningCard day={day} condData={condData} onUpdateCond={onUpdateCond} />
        </>
      ) : (
        <>
          <SectionHeader title={isDeload ? "⚡ Deload Target — 50% Volume Cut Applied" : "Exercises"} />
          {day.exercises.map(ex => (
            <ExerciseCard key={ex.id} ex={ex} sets={sessionSets[ex.id] || []} onUpdateSet={(i, field, val) => onUpdateSet(ex.id, i, field, val)} onToggleDone={(i) => onToggleDone(ex.id, i)} onAddSet={() => onAddSet(ex.id, ex)} />
          ))}
        </>
      )}

      {day.rehab?.length > 0 && (
        <>
          <SectionHeader title="Rehab & Structural Longevity" />
          <div className="jt-rehab-card">
            {day.rehab.map(name => (
              <RehabItem key={name} name={name} done={!!sessionRehab[name]} onToggle={() => onToggleRehab(name)} />
            ))}
          </div>
        </>
      )}

      <div className="jt-save-area">
        <button className="jt-save-btn" onClick={onSave}>Commit Workout to Logs</button>
      </div>
    </div>
  );
}

function HistoryScreen({ sessions }) {
  const [expanded, setExpanded] = useState(new Set());

  if (!sessions.length) {
    return (
      <div className="jt-screen">
        <SectionHeader title="Database Logs" />
        <div className="jt-empty">
          <p>No logged training operations found.<br />Check off a workout session to build local history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jt-screen">
      <SectionHeader title="Performance History Logs" />
      <div>
        {sessions.map((session, idx) => {
          const day = PROGRAM[session.dayId];
          const isOpen = expanded.has(idx);
          return (
            <div key={idx} className="jt-history-entry">
              <div className="jt-history-header" onClick={() => {
                const next = new Set(expanded);
                isOpen ? next.delete(idx) : next.add(idx);
                setExpanded(next);
              }}>
                <div>
                  <div className="jt-history-title">{day?.name ?? session.dayId} — Wk {session.week}</div>
                  <div className="jt-history-date">{formatDate(session.date)}</div>
                </div>
                <div style={{ color: "var(--text-dimmer)", fontSize: "14px" }}>{isOpen ? "▲" : "▼"}</div>
              </div>
              {isOpen && (
                <div className="jt-history-body">
                  {session.sets && Object.entries(session.sets).map(([exId, sets]) => {
                    const ex = day?.exercises?.find(e => e.id === exId);
                    const setsStr = sets.map(s => `${s.weight || "BW"}×${s.reps}`).join(", ");
                    return (
                      <div key={exId} className="jt-history-row">
                        <span>{ex?.name ?? exId}</span>
                        <span className="jt-history-val">{setsStr}</span>
                      </div>
                    );
                  })}
                  {session.conditioning?.duration && (
                    <div className="jt-history-row">
                      <span>Duration Metric</span>
                      <span className="jt-history-val">{session.conditioning.duration} mins</span>
                    </div>
                  )}
                  {session.conditioning?.notes && (
                    <div style={{ fontSize: "12px", color: "var(--text-dim)", padding: "8px 0", fontStyle: "italic" }}>
                      {session.conditioning.notes}
                    </div>
                  )}
                  {session.rehab && Object.entries(session.rehab).filter(([,v]) => v).length > 0 && (
                    <div className="jt-history-row">
                      <span>Rehab Protocols Completed</span>
                      <span style={{ color: "var(--orange)", fontFamily: "var(--mono)", fontSize: "12px" }}>
                        {Object.entries(session.rehab).filter(([,v]) => v).map(([k]) => k.split(" ")[0]).join(" · ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP SYSTEM ───────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState("home");
  const [currentWeek, setCurrentWeek] = useState(() => storage.get("jt_current_week") || 1);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [activeDay, setActiveDay] = useState(null);
  const [sessionSets, setSessionSets] = useState({});
  const [sessionRehab, setSessionRehab] = useState({});
  const [condData, setCondData] = useState({ duration: "", notes: "" });
  const [sessions, setSessions] = useState([]);
  const [toast, setToast] = useState({ msg: "", show: false });
  const toastTimer = useRef(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    storage.set("jt_current_week", currentWeek);
    const keys = storage.list().filter(k => k.startsWith("workout:"));
    const done = new Set();
    for (const k of keys) {
      const s = storage.get(k);
      if (s?.week === currentWeek) done.add(s.dayId);
    }
    setCompletedDays(done);
  }, [currentWeek]);

  useEffect(() => {
    if (tab !== "history") return;
    const keys = storage.list().filter(k => k.startsWith("workout:")).sort().reverse().slice(0, 50);
    const loaded = [];
    for (const k of keys) {
      const s = storage.get(k);
      if (s) loaded.push(s);
    }
    setSessions(loaded);
  }, [tab]);

  const handleSelectDay = useCallback(async (dayId) => {
    const day = PROGRAM[dayId];
    const isDeload = DELOAD_WEEKS.includes(currentWeek);
    const sets = {};
    for (const ex of day.exercises) {
      const prev = getPreviousData(dayId, ex.id);
      sets[ex.id] = initSets(ex, prev, isDeload);
    }
    const rehab = {};
    for (const r of (day.rehab || [])) rehab[r] = false;
    setSessionSets(sets);
    setSessionRehab(rehab);
    setCondData({ duration: "", notes: "" });
    setActiveDay(dayId);
    setTab("workout");
  }, [currentWeek]);

  const handleUpdateSet = useCallback((exId, i, field, val) => {
    setSessionSets(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    }));
  }, []);

  const handleToggleDone = useCallback((exId, i) => {
    setSessionSets(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, idx) => idx === i ? { ...s, done: !s.done } : s)
    }));
  }, []);

  const handleAddSet = useCallback((exId, ex) => {
    setSessionSets(prev => {
      const sets = prev[exId] || [];
      const last = sets[sets.length - 1];
      return {
        ...prev,
        [exId]: [...sets, { weight: last?.weight ?? "", reps: last?.reps ?? String(ex.reps), targetReps: String(ex.reps), done: false }]
      };
    });
  }, []);

  const handleToggleRehab = useCallback((name) => {
    setSessionRehab(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const handleUpdateCond = useCallback((field, val) => {
    setCondData(prev => ({ ...prev, [field]: val }));
  }, []);

  const handleSave = useCallback(() => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timestamp = now.getTime();
    const key = `workout:${activeDay}:${dateStr}:${timestamp}`;
    
    storage.set(key, {
      dayId: activeDay, week: currentWeek, date: dateStr, timestamp,
      sets: sessionSets, rehab: sessionRehab, conditioning: condData,
    });
    
    setCompletedDays(prev => new Set([...prev, activeDay]));
    showToast("Workout Tracked ✓");
    setTab("home");
    setActiveDay(null);
  }, [activeDay, currentWeek, sessionSets, sessionRehab, condData]);

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, show: true });
    toastTimer.current = setTimeout(() => setToast({ msg: "", show: false }), 2200);
  };

  return (
    <div className="jt-root">
      <div className="jt-header">
        <div className="jt-header-title">Jake's Trainer</div>
        <div className="jt-header-sub">System Online</div>
      </div>

      {tab === "home" && (
        <HomeScreen currentWeek={currentWeek} setCurrentWeek={setCurrentWeek} completedDays={completedDays} onSelectDay={handleSelectDay} />
      )}

      {tab === "workout" && activeDay && (
        <WorkoutScreen dayId={activeDay} currentWeek={currentWeek} sessionSets={sessionSets} sessionRehab={sessionRehab} condData={condData} onUpdateSet={handleUpdateSet} onToggleDone={handleToggleDone} onAddSet={handleAddSet} onToggleRehab={handleToggleRehab} onUpdateCond={handleUpdateCond} onSave={handleSave} onBack={() => { setTab("home"); setActiveDay(null); }} />
      )}

      {tab === "history" && <HistoryScreen sessions={sessions} />}

      <div className="jt-bottom-nav">
        <button className={`jt-nav-btn ${tab === "home" || tab === "workout" ? 'active' : ''}`} onClick={() => { setActiveDay(null); setTab("home"); }}>
          <span className="jt-nav-icon">■</span>
          <span className="jt-nav-label">Train</span>
        </button>
        <button className={`jt-nav-btn ${tab === "history" ? 'active' : ''}`} onClick={() => setTab("history")}>
          <span className="jt-nav-icon">◎</span>
          <span className="jt-nav-label">History</span>
        </button>
      </div>

      <div className={`jt-toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}

// Render root element initialization sequence
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
