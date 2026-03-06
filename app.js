// =====================================================
// GymTracker — app.js
// Full SPA: Dashboard | Routines | Workout | Progress | History
// Data: LocalStorage | Charts: Chart.js | Audio: Web Audio API
// =====================================================

// ===== Data Layer =====
const DB = {
  KEY_EXERCISES: 'gt_exercises',
  KEY_ROUTINES:  'gt_routines',
  KEY_LOGS:      'gt_workoutLogs',

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  getExercises()  { return this.get(this.KEY_EXERCISES); },
  getRoutines()   { return this.get(this.KEY_ROUTINES); },
  getLogs()       { return this.get(this.KEY_LOGS); },

  saveExercises(data) { this.set(this.KEY_EXERCISES, data); },
  saveRoutines(data)  { this.set(this.KEY_ROUTINES, data); },
  saveLogs(data)      { this.set(this.KEY_LOGS, data); },

  addLog(log)  { const logs = this.getLogs(); logs.push(log); this.saveLogs(logs); },
  addRoutine(r){ const rs = this.getRoutines(); rs.push(r); this.saveRoutines(rs); },

  deleteRoutine(id) {
    this.saveRoutines(this.getRoutines().filter(r => r.id !== id));
  },
  updateRoutine(updated) {
    this.saveRoutines(this.getRoutines().map(r => r.id === updated.id ? updated : r));
  },
};

// ===== ID Generator =====
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ===== Seed Default Exercises =====
const DEFAULT_EXERCISES = [
  // Chest
  { id:'e01', name:'Bench Press',          muscleGroup:'Chest' },
  { id:'e02', name:'Incline Bench Press',  muscleGroup:'Chest' },
  { id:'e03', name:'Cable Fly',            muscleGroup:'Chest' },
  { id:'e04', name:'Push-Up',              muscleGroup:'Chest' },
  // Back
  { id:'e05', name:'Deadlift',             muscleGroup:'Back' },
  { id:'e06', name:'Barbell Row',          muscleGroup:'Back' },
  { id:'e07', name:'Pull-Up',              muscleGroup:'Back' },
  { id:'e08', name:'Lat Pulldown',         muscleGroup:'Back' },
  { id:'e09', name:'Seated Cable Row',     muscleGroup:'Back' },
  // Legs
  { id:'e10', name:'Squat',                muscleGroup:'Legs' },
  { id:'e11', name:'Leg Press',            muscleGroup:'Legs' },
  { id:'e12', name:'Romanian Deadlift',    muscleGroup:'Legs' },
  { id:'e13', name:'Leg Curl',             muscleGroup:'Legs' },
  { id:'e14', name:'Calf Raise',           muscleGroup:'Legs' },
  // Shoulders
  { id:'e15', name:'Overhead Press',       muscleGroup:'Shoulders' },
  { id:'e16', name:'Lateral Raise',        muscleGroup:'Shoulders' },
  { id:'e17', name:'Front Raise',          muscleGroup:'Shoulders' },
  // Arms
  { id:'e18', name:'Barbell Curl',         muscleGroup:'Arms' },
  { id:'e19', name:'Tricep Pushdown',      muscleGroup:'Arms' },
  { id:'e20', name:'Hammer Curl',          muscleGroup:'Arms' },
  { id:'e21', name:'Skull Crusher',        muscleGroup:'Arms' },
  { id:'e22', name:'Dips',                 muscleGroup:'Arms' },
  // Core
  { id:'e23', name:'Plank',                muscleGroup:'Core' },
  { id:'e24', name:'Cable Crunch',         muscleGroup:'Core' },
  { id:'e25', name:'Hanging Leg Raise',    muscleGroup:'Core' },
];

function seedExercises() {
  if (DB.getExercises().length === 0) {
    DB.saveExercises(DEFAULT_EXERCISES);
  }
}

// ===== Utility =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const wk = getWeekNumber(dateStr);
  return `${year}-W${String(wk).padStart(2,'0')}`;
}

// ===== Audio Beep =====
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch(e) { console.warn('Audio not available'); }
}

// ===== Navigation =====
const VIEWS = ['dashboard','routines','workout','progress','history'];
let activeView = 'dashboard';

function navigateTo(view) {
  if (!VIEWS.includes(view)) return;
  activeView = view;

  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  const navBtn = document.querySelector(`.nav-btn[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Render view
  switch(view) {
    case 'dashboard': renderDashboard(); break;
    case 'routines':  renderRoutines(); break;
    case 'progress':  renderProgress(); break;
    case 'history':   renderHistory(); break;
    case 'workout':
      if (!activeWorkout) renderWorkoutEmpty();
      break;
  }
}

// ===== Rest Timer =====
let restTimerInterval = null;
let restRemaining = 0;
let restDuration = 90;

function startRestTimer(duration) {
  clearInterval(restTimerInterval);
  restDuration = duration || parseInt(document.getElementById('rest-duration-select').value) || 90;
  restRemaining = restDuration;
  document.getElementById('rest-timer-overlay').classList.remove('hidden');
  updateRestDisplay();
  restTimerInterval = setInterval(() => {
    restRemaining--;
    updateRestDisplay();
    if (restRemaining <= 0) {
      clearInterval(restTimerInterval);
      playBeep();
      setTimeout(() => stopRestTimer(), 1500);
    }
  }, 1000);
}

function stopRestTimer() {
  clearInterval(restTimerInterval);
  document.getElementById('rest-timer-overlay').classList.add('hidden');
}

function updateRestDisplay() {
  const m = Math.floor(restRemaining / 60);
  const s = restRemaining % 60;
  document.getElementById('rest-timer-display').textContent =
    `${m}:${String(s).padStart(2,'0')}`;
}

// ===== Active Workout State =====
let activeWorkout = null; // { routineId, routineName, startTime, exercises: [{exerciseId, sets:[{reps,weight,logged}], completed}] }
let workoutTimerInterval = null;

function startWorkout(routineId) {
  const routine = DB.getRoutines().find(r => r.id === routineId);
  if (!routine) return;
  const exercises = DB.getExercises();

  activeWorkout = {
    id: uid(),
    routineId,
    routineName: routine.name,
    startTime: Date.now(),
    exercises: routine.exerciseIds.map(eid => {
      const ex = exercises.find(e => e.id === eid);
      return {
        exerciseId: eid,
        name: ex ? ex.name : 'Unknown',
        muscleGroup: ex ? ex.muscleGroup : '',
        sets: [{ reps: '', weight: '', logged: false }],
        completed: false,
      };
    }),
  };

  navigateTo('workout');
  renderActiveWorkout();
  startWorkoutTimer();
  closeModal('modal-select-routine');
}

function startWorkoutTimer() {
  clearInterval(workoutTimerInterval);
  workoutTimerInterval = setInterval(() => {
    if (!activeWorkout) { clearInterval(workoutTimerInterval); return; }
    const elapsed = Math.floor((Date.now() - activeWorkout.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const el = document.getElementById('workout-timer-display');
    if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 1000);
}

function finishWorkout() {
  if (!activeWorkout) return;
  clearInterval(workoutTimerInterval);

  // Only save exercises that have at least one logged set
  const exercisesToSave = activeWorkout.exercises
    .map(ex => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.filter(s => s.logged && (s.reps || s.weight)),
    }))
    .filter(ex => ex.sets.length > 0);

  if (exercisesToSave.length === 0) {
    if (!confirm('No sets logged. Discard workout?')) return;
    cancelWorkout();
    return;
  }

  const log = {
    id: activeWorkout.id,
    date: todayStr(),
    routineId: activeWorkout.routineId,
    routineName: activeWorkout.routineName,
    duration: Math.floor((Date.now() - activeWorkout.startTime) / 1000),
    exercises: exercisesToSave,
  };

  DB.addLog(log);
  activeWorkout = null;
  stopRestTimer();
  navigateTo('dashboard');
}

function cancelWorkout() {
  clearInterval(workoutTimerInterval);
  activeWorkout = null;
  stopRestTimer();
  navigateTo('dashboard');
}

// ===== Render: Active Workout =====
function renderActiveWorkout() {
  if (!activeWorkout) { renderWorkoutEmpty(); return; }

  const container = document.getElementById('workout-exercises');
  const emptyEl   = document.getElementById('workout-empty');
  const titleEl   = document.getElementById('workout-title');

  titleEl.textContent = activeWorkout.routineName;
  emptyEl.classList.add('hidden');
  container.innerHTML = '';

  activeWorkout.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = `exercise-workout-card${ex.completed ? ' completed' : ''}`;
    card.dataset.exIdx = exIdx;

    card.innerHTML = `
      <div class="exercise-card-header">
        <div>
          <div class="exercise-card-name">${ex.name}</div>
          <div class="exercise-card-group">${ex.muscleGroup}</div>
        </div>
        <button class="complete-btn ${ex.completed ? 'done' : ''}" data-ex="${exIdx}" title="Mark complete">
          ${ex.completed ? '✓' : '○'}
        </button>
      </div>
      <div class="sets-table" id="sets-table-${exIdx}">
        ${ex.sets.map((set, si) => renderSetRow(exIdx, si, set)).join('')}
      </div>
      <div class="add-set-row">
        <button class="btn btn-ghost btn-sm add-set-btn" data-ex="${exIdx}">+ Add Set</button>
      </div>
    `;
    container.appendChild(card);
  });

  // Bind events
  container.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.ex);
      activeWorkout.exercises[idx].completed = !activeWorkout.exercises[idx].completed;
      renderActiveWorkout();
    });
  });

  container.querySelectorAll('.add-set-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.ex);
      activeWorkout.exercises[idx].sets.push({ reps: '', weight: '', logged: false });
      // Re-render just the sets table
      const table = document.getElementById(`sets-table-${idx}`);
      table.innerHTML = activeWorkout.exercises[idx].sets.map((s,si) => renderSetRow(idx,si,s)).join('');
      bindSetTableEvents(idx);
    });
  });

  activeWorkout.exercises.forEach((_, idx) => bindSetTableEvents(idx));
}

function renderSetRow(exIdx, setIdx, set) {
  return `
    <div class="set-row" data-ex="${exIdx}" data-set="${setIdx}">
      <span class="set-num">${setIdx + 1}</span>
      <input class="set-input" type="number" placeholder="Reps" min="0" step="1"
        data-field="reps" data-ex="${exIdx}" data-set="${setIdx}"
        value="${set.reps}" ${set.logged ? 'disabled' : ''}/>
      <input class="set-input" type="number" placeholder="kg" min="0" step="0.5"
        data-field="weight" data-ex="${exIdx}" data-set="${setIdx}"
        value="${set.weight}" ${set.logged ? 'disabled' : ''}/>
      <button class="log-set-btn ${set.logged ? 'logged' : ''}"
        data-ex="${exIdx}" data-set="${setIdx}" ${set.logged ? 'disabled' : ''}>
        ${set.logged ? '✓' : 'Log'}
      </button>
    </div>
  `;
}

function bindSetTableEvents(exIdx) {
  const table = document.getElementById(`sets-table-${exIdx}`);
  if (!table) return;

  table.querySelectorAll('.set-input').forEach(input => {
    input.addEventListener('input', () => {
      const si = parseInt(input.dataset.set);
      const field = input.dataset.field;
      activeWorkout.exercises[exIdx].sets[si][field] = input.value;
    });
  });

  table.querySelectorAll('.log-set-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const si = parseInt(btn.dataset.set);
      const set = activeWorkout.exercises[exIdx].sets[si];
      if (!set.reps && !set.weight) return;
      set.logged = true;
      btn.textContent = '✓';
      btn.classList.add('logged');
      btn.disabled = true;
      table.querySelectorAll(`input[data-set="${si}"]`).forEach(i => i.disabled = true);

      // Start rest timer
      const dur = parseInt(document.getElementById('rest-duration-select').value) || 90;
      startRestTimer(dur);
    });
  });
}

function renderWorkoutEmpty() {
  document.getElementById('workout-exercises').innerHTML = '';
  document.getElementById('workout-empty').classList.remove('hidden');
  document.getElementById('workout-title').textContent = 'Active Workout';
  document.getElementById('workout-timer-display').textContent = '00:00';
}

// ===== Render: Dashboard =====
function renderDashboard() {
  const logs = DB.getLogs();
  const today = todayStr();

  // Stats
  const totalWorkouts = logs.length;
  const thisWeekLogs = logs.filter(l => {
    const d = new Date(l.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return d >= weekStart;
  });

  // Streak
  const streak = calcStreak(logs);
  document.getElementById('header-streak').textContent = streak > 0 ? `🔥 ${streak} day streak` : '';
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  const statsEl = document.getElementById('dashboard-stats');
  statsEl.innerHTML = `
    <div class="stat-card accent">
      <div class="stat-value">${streak}</div>
      <div class="stat-label">Day Streak 🔥</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalWorkouts}</div>
      <div class="stat-label">Total Workouts</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${thisWeekLogs.length}</div>
      <div class="stat-label">This Week</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${DB.getRoutines().length}</div>
      <div class="stat-label">Routines</div>
    </div>
  `;

  // Recent workouts
  const recentEl = document.getElementById('recent-workouts');
  const recent = [...logs].reverse().slice(0, 5);
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><p>No workouts yet. Hit Start Workout!</p></div>`;
  } else {
    recentEl.innerHTML = recent.map(log => {
      const exCount = log.exercises.length;
      const setCount = log.exercises.reduce((s,e)=>s+e.sets.length,0);
      const dur = log.duration ? `${Math.round(log.duration/60)}min` : '';
      return `
        <div class="card">
          <div class="recent-workout-header">
            <span class="recent-workout-name">${log.routineName || 'Workout'}</span>
            <span class="recent-workout-date">${formatDateShort(log.date)}</span>
          </div>
          <div class="recent-workout-meta">${exCount} exercises · ${setCount} sets${dur ? ` · ${dur}` : ''}</div>
        </div>
      `;
    }).join('');
  }
}

function calcStreak(logs) {
  if (!logs.length) return 0;
  const days = [...new Set(logs.map(l => l.date))].sort().reverse();
  let streak = 0;
  const today = todayStr();
  let cursor = new Date(today);

  for (const day of days) {
    const d = new Date(day);
    const diff = Math.round((cursor - d) / 86400000);
    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else break;
  }
  return streak;
}

// ===== Render: Routines =====
function renderRoutines() {
  const routines = DB.getRoutines();
  const exercises = DB.getExercises();
  const container = document.getElementById('routines-list');

  if (routines.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No routines yet. Tap + New Routine to create one.</p></div>`;
    return;
  }

  container.innerHTML = routines.map(r => {
    const exNames = r.exerciseIds.map(id => {
      const ex = exercises.find(e => e.id === id);
      return ex ? ex.name : '';
    }).filter(Boolean);

    return `
      <div class="routine-card">
        <div class="routine-header">
          <span class="routine-name">${r.name}</span>
          <div class="routine-actions">
            <button class="btn btn-primary btn-sm start-routine-btn" data-id="${r.id}">▶ Start</button>
            <button class="btn btn-ghost btn-sm edit-routine-btn" data-id="${r.id}">Edit</button>
            <button class="btn btn-danger btn-sm delete-routine-btn" data-id="${r.id}">✕</button>
          </div>
        </div>
        <div class="routine-exercises">
          ${exNames.map(n => `<span class="exercise-tag">${n}</span>`).join('')}
        </div>
        <div class="text-muted" style="font-size:0.8rem">${exNames.length} exercises</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.start-routine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeWorkout) {
        if (!confirm('A workout is already in progress. Start a new one?')) return;
        cancelWorkout();
      }
      startWorkout(btn.dataset.id);
    });
  });

  container.querySelectorAll('.edit-routine-btn').forEach(btn => {
    btn.addEventListener('click', () => openRoutineModal(btn.dataset.id));
  });

  container.querySelectorAll('.delete-routine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this routine?')) {
        DB.deleteRoutine(btn.dataset.id);
        renderRoutines();
      }
    });
  });
}

// ===== Routine Modal =====
let routineModalState = {
  editId: null,
  selectedIds: [],
  activeMuscle: 'Chest',
};

function openRoutineModal(editId = null) {
  const modal = document.getElementById('modal-routine');
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-routine-title');
  const nameInput = document.getElementById('routine-name-input');

  routineModalState.editId = editId;
  routineModalState.selectedIds = [];
  routineModalState.activeMuscle = 'Chest';

  if (editId) {
    const r = DB.getRoutines().find(x => x.id === editId);
    if (r) {
      nameInput.value = r.name;
      routineModalState.selectedIds = [...r.exerciseIds];
      titleEl.textContent = 'Edit Routine';
    }
  } else {
    nameInput.value = '';
    titleEl.textContent = 'Create Routine';
  }

  renderMuscleTabs();
  renderExerciseSelector();
  renderSelectedExercises();
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function renderMuscleTabs() {
  const groups = [...new Set(DB.getExercises().map(e => e.muscleGroup))];
  const container = document.getElementById('muscle-tabs');
  container.innerHTML = groups.map(g => `
    <button class="muscle-tab ${g === routineModalState.activeMuscle ? 'active' : ''}" data-group="${g}">${g}</button>
  `).join('');
  container.querySelectorAll('.muscle-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      routineModalState.activeMuscle = btn.dataset.group;
      renderMuscleTabs();
      renderExerciseSelector();
    });
  });
}

function renderExerciseSelector() {
  const exercises = DB.getExercises().filter(e => e.muscleGroup === routineModalState.activeMuscle);
  const container = document.getElementById('exercise-selector');
  container.innerHTML = exercises.map(ex => {
    const selected = routineModalState.selectedIds.includes(ex.id);
    return `
      <label class="exercise-option ${selected ? 'selected' : ''}" data-id="${ex.id}">
        <input type="checkbox" value="${ex.id}" ${selected ? 'checked' : ''}/>
        <span>${ex.name}</span>
      </label>
    `;
  }).join('');

  container.querySelectorAll('.exercise-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const id = opt.dataset.id;
      const idx = routineModalState.selectedIds.indexOf(id);
      if (idx === -1) routineModalState.selectedIds.push(id);
      else routineModalState.selectedIds.splice(idx, 1);
      renderExerciseSelector();
      renderSelectedExercises();
    });
  });
}

function renderSelectedExercises() {
  const exercises = DB.getExercises();
  const container = document.getElementById('selected-exercises-list');
  if (routineModalState.selectedIds.length === 0) {
    container.innerHTML = `<div class="text-muted" style="font-size:0.85rem;padding:0.5rem">No exercises selected</div>`;
    return;
  }
  container.innerHTML = routineModalState.selectedIds.map(id => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return '';
    return `
      <div class="selected-item">
        <span>${ex.name} <span class="text-muted" style="font-size:0.75rem">${ex.muscleGroup}</span></span>
        <button class="remove-exercise-btn" data-id="${id}">✕</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.remove-exercise-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      routineModalState.selectedIds = routineModalState.selectedIds.filter(id => id !== btn.dataset.id);
      renderExerciseSelector();
      renderSelectedExercises();
    });
  });
}

function saveRoutine() {
  const name = document.getElementById('routine-name-input').value.trim();
  if (!name) { alert('Please enter a routine name'); return; }
  if (routineModalState.selectedIds.length === 0) { alert('Please select at least one exercise'); return; }

  if (routineModalState.editId) {
    DB.updateRoutine({ id: routineModalState.editId, name, exerciseIds: [...routineModalState.selectedIds] });
  } else {
    DB.addRoutine({ id: uid(), name, exerciseIds: [...routineModalState.selectedIds] });
  }

  closeModal('modal-routine');
  renderRoutines();
}

// ===== Select Routine Modal =====
function openSelectRoutineModal() {
  const routines = DB.getRoutines();
  const container = document.getElementById('select-routine-list');

  if (routines.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No routines yet. Create one first!</p></div>`;
  } else {
    container.innerHTML = routines.map(r => `
      <div class="routine-card" data-id="${r.id}" style="cursor:pointer">
        <div class="routine-name">${r.name}</div>
        <div class="text-muted" style="font-size:0.8rem;margin-top:0.25rem">${r.exerciseIds.length} exercises</div>
      </div>
    `).join('');

    container.querySelectorAll('.routine-card').forEach(card => {
      card.addEventListener('click', () => {
        if (activeWorkout) {
          if (!confirm('A workout is in progress. Start a new one?')) return;
          cancelWorkout();
        }
        startWorkout(card.dataset.id);
      });
    });
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-select-routine').classList.remove('hidden');
}

// ===== Modal Helpers =====
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  // Hide overlay if no modals visible
  const anyOpen = ['modal-routine','modal-select-routine']
    .some(id => !document.getElementById(id).classList.contains('hidden'));
  if (!anyOpen) document.getElementById('modal-overlay').classList.add('hidden');
}

// ===== Render: Progress =====
let progressChartInstance = null;
let overloadChartInstance = null;

function renderProgress() {
  populateProgressSelects();
}

function populateProgressSelects() {
  const exercises = DB.getExercises();
  const opts = exercises.map(e => `<option value="${e.id}">${e.name} (${e.muscleGroup})</option>`).join('');

  const sel1 = document.getElementById('progress-exercise-select');
  const sel2 = document.getElementById('overload-exercise-select');
  const currentVal1 = sel1.value;
  const currentVal2 = sel2.value;

  sel1.innerHTML = `<option value="">Select Exercise</option>${opts}`;
  sel2.innerHTML = `<option value="">Select Exercise</option>${opts}`;

  if (currentVal1) sel1.value = currentVal1;
  if (currentVal2) sel2.value = currentVal2;
}

function buildProgressChart(exerciseId, metric) {
  const logs = DB.getLogs().filter(l =>
    l.exercises.some(e => e.exerciseId === exerciseId)
  ).sort((a,b) => a.date.localeCompare(b.date));

  const labels = [];
  const data   = [];

  logs.forEach(log => {
    const ex = log.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex || !ex.sets.length) return;

    const weights = ex.sets.map(s => parseFloat(s.weight) || 0);
    const reps    = ex.sets.map(s => parseInt(s.reps) || 0);

    let value;
    if (metric === 'maxWeight') {
      value = Math.max(...weights);
    } else {
      value = ex.sets.reduce((sum, s, i) => sum + ((parseFloat(s.weight)||0) * (parseInt(s.reps)||0)), 0);
    }

    labels.push(formatDateShort(log.date));
    data.push(value);
  });

  const canvas = document.getElementById('progress-chart');
  if (progressChartInstance) { progressChartInstance.destroy(); progressChartInstance = null; }

  if (!labels.length) {
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    document.getElementById('progress-summary').classList.add('hidden');
    return;
  }

  // Summary
  if (data.length >= 2) {
    const first = data[0], last = data[data.length-1];
    const diff = last - first;
    const exName = DB.getExercises().find(e=>e.id===exerciseId)?.name || '';
    const unit = metric === 'maxWeight' ? 'kg' : 'vol';
    const summaryEl = document.getElementById('progress-summary');
    summaryEl.classList.remove('hidden');
    if (diff > 0) {
      summaryEl.textContent = `You've increased ${exName} by ${diff.toFixed(1)}${unit} over ${data.length} sessions 💪`;
      summaryEl.style.color = 'var(--success)';
      summaryEl.style.borderColor = 'var(--success)';
    } else if (diff < 0) {
      summaryEl.textContent = `${exName} is down ${Math.abs(diff).toFixed(1)}${unit} — time to push harder 🔥`;
      summaryEl.style.color = 'var(--warning)';
      summaryEl.style.borderColor = 'var(--warning)';
    } else {
      summaryEl.textContent = `${exName} — holding steady. Push for a new PR!`;
      summaryEl.style.color = 'var(--text-secondary)';
      summaryEl.style.borderColor = 'var(--border)';
    }
  } else {
    document.getElementById('progress-summary').classList.add('hidden');
  }

  progressChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metric === 'maxWeight' ? 'Max Weight (kg)' : 'Volume (sets×reps×kg)',
        data,
        borderColor: '#ff4d00',
        backgroundColor: 'rgba(255,77,0,0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#ff4d00',
        pointRadius: 5,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f5f5f5', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#9e9e9e', maxRotation: 45 }, grid: { color: '#2a2a35' } },
        y: { ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a35' }, beginAtZero: false },
      },
    },
  });
}

function buildOverloadChart(exerciseId) {
  const logs = DB.getLogs().filter(l =>
    l.exercises.some(e => e.exerciseId === exerciseId)
  ).sort((a,b) => a.date.localeCompare(b.date));

  // Group by week
  const weekMap = {};
  logs.forEach(log => {
    const wk = getWeekKey(log.date);
    const ex = log.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) return;
    const vol = ex.sets.reduce((s,set) => s + (parseFloat(set.weight)||0)*(parseInt(set.reps)||0), 0);
    if (!weekMap[wk]) weekMap[wk] = 0;
    weekMap[wk] += vol;
  });

  const weeks = Object.keys(weekMap).sort();
  const volumes = weeks.map(w => weekMap[w]);

  const bgColors = volumes.map((v, i) => {
    if (i === 0) return 'rgba(255,193,7,0.7)';
    return v >= volumes[i-1] ? 'rgba(0,200,83,0.7)' : 'rgba(244,67,54,0.7)';
  });

  const canvas = document.getElementById('overload-chart');
  if (overloadChartInstance) { overloadChartInstance.destroy(); overloadChartInstance = null; }

  if (!weeks.length) { canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); return; }

  overloadChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weeks,
      datasets: [{
        label: 'Weekly Volume (reps×weight)',
        data: volumes,
        backgroundColor: bgColors,
        borderColor: bgColors.map(c => c.replace('0.7','1')),
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f5f5f5', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const i = ctx.dataIndex;
              if (i === 0) return '(first week)';
              const diff = volumes[i] - volumes[i-1];
              return diff >= 0 ? `↑ +${diff.toFixed(0)} vs prev` : `↓ ${diff.toFixed(0)} vs prev`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a35' } },
        y: { ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a35' }, beginAtZero: true },
      },
    },
  });
}

// ===== Render: History =====
function renderHistory() {
  const logs = [...DB.getLogs()].reverse();
  const exercises = DB.getExercises();
  const container = document.getElementById('history-list');

  if (!logs.length) {
    container.innerHTML = `<div class="empty-state"><p>No workout history yet.</p></div>`;
    return;
  }

  container.innerHTML = logs.map((log, idx) => {
    const exCount = log.exercises.length;
    const setCount = log.exercises.reduce((s,e)=>s+e.sets.length,0);
    const dur = log.duration ? `${Math.round(log.duration/60)}min` : '';

    const detailsHtml = log.exercises.map(ex => {
      const exObj = exercises.find(e => e.id === ex.exerciseId);
      const name = exObj ? exObj.name : 'Unknown';
      const setsStr = ex.sets.map((s,i) => `Set ${i+1}: ${s.reps||'?'} reps × ${s.weight||'?'}kg`).join(' | ');
      return `
        <div class="history-exercise">
          <div class="history-exercise-name">${name}</div>
          <div class="history-set-list">${setsStr}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="history-item">
        <div class="history-header" data-idx="${idx}">
          <div>
            <div class="history-name">${log.routineName || 'Workout'}</div>
            <div class="history-meta">${exCount} exercises · ${setCount} sets${dur ? ` · ${dur}` : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span class="history-date">${formatDate(log.date)}</span>
            <span class="history-expand">▼</span>
          </div>
        </div>
        <div class="history-details" id="history-details-${idx}">
          ${detailsHtml}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.history-header').forEach(header => {
    header.addEventListener('click', () => {
      const idx = header.dataset.idx;
      const details = document.getElementById(`history-details-${idx}`);
      const arrow = header.querySelector('.history-expand');
      details.classList.toggle('open');
      arrow.classList.toggle('open');
    });
  });
}

// ===== Event Wiring =====
function initEvents() {
  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // Quick start
  document.getElementById('quick-start-btn').addEventListener('click', openSelectRoutineModal);

  // Create routine
  document.getElementById('create-routine-btn').addEventListener('click', () => openRoutineModal());

  // Save routine
  document.getElementById('save-routine-btn').addEventListener('click', saveRoutine);

  // Finish / cancel workout
  document.getElementById('finish-workout-btn').addEventListener('click', finishWorkout);
  document.getElementById('cancel-workout-btn').addEventListener('click', () => {
    if (confirm('Cancel this workout?')) cancelWorkout();
  });

  // Rest timer controls
  document.getElementById('rest-skip-btn').addEventListener('click', stopRestTimer);
  document.getElementById('rest-restart-btn').addEventListener('click', () => startRestTimer(restDuration));

  // Modal close buttons
  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) closeModal(modalId);
    });
  });

  // Modal overlay click
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) {
      ['modal-routine','modal-select-routine'].forEach(id => {
        if (!document.getElementById(id).classList.contains('hidden')) closeModal(id);
      });
    }
  });

  // Progress chart selects
  document.getElementById('progress-exercise-select').addEventListener('change', e => {
    const metric = document.getElementById('progress-metric-select').value;
    if (e.target.value) buildProgressChart(e.target.value, metric);
  });
  document.getElementById('progress-metric-select').addEventListener('change', e => {
    const exId = document.getElementById('progress-exercise-select').value;
    if (exId) buildProgressChart(exId, e.target.value);
  });
  document.getElementById('overload-exercise-select').addEventListener('change', e => {
    if (e.target.value) buildOverloadChart(e.target.value);
  });
}

// ===== Init =====
function init() {
  seedExercises();
  initEvents();
  // Handle PWA shortcut URLs (?view=workout etc.)
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  navigateTo(viewParam && VIEWS.includes(viewParam) ? viewParam : 'dashboard');
}

document.addEventListener('DOMContentLoaded', init);
