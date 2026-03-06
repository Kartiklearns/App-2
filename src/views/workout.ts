import type { ActiveWorkout, ActiveSet } from '../types';
import { getExercises, getRoutines, addLog } from '../db';
import { uid, todayStr, el, qsa } from '../utils';
import { navigateTo } from '../router';
import { startRestTimer, stopRestTimer, startWorkoutTimer, clearWorkoutTimer } from '../timer';

let activeWorkout: ActiveWorkout | null = null;

export const isWorkoutActive = (): boolean => activeWorkout !== null;

// ===== Start / Finish / Cancel =====
export function startWorkout(routineId: string): void {
  const routine   = getRoutines().find(r => r.id === routineId);
  if (!routine) return;
  const exercises = getExercises();

  activeWorkout = {
    id: uid(),
    routineId,
    routineName: routine.name,
    startTime:   Date.now(),
    exercises:   routine.exerciseIds.map(eid => {
      const ex = exercises.find(e => e.id === eid);
      return {
        exerciseId:  eid,
        name:        ex?.name        ?? 'Unknown',
        muscleGroup: ex?.muscleGroup ?? '',
        sets:        [{ reps: '', weight: '', logged: false }],
        completed:   false,
      };
    }),
  };

  navigateTo('workout');
  renderActiveWorkout();
  startWorkoutTimer(activeWorkout.startTime);
}

export function finishWorkout(): void {
  if (!activeWorkout) return;
  clearWorkoutTimer();

  const toSave = activeWorkout.exercises
    .map(ex => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets
        .filter(s => s.logged && (s.reps || s.weight))
        .map(s => ({ reps: s.reps, weight: s.weight })),
    }))
    .filter(ex => ex.sets.length > 0);

  if (!toSave.length) {
    if (!confirm('No sets logged. Discard workout?')) return;
    cancelWorkout();
    return;
  }

  addLog({
    id:          activeWorkout.id,
    date:        todayStr(),
    routineId:   activeWorkout.routineId,
    routineName: activeWorkout.routineName,
    duration:    Math.floor((Date.now() - activeWorkout.startTime) / 1000),
    exercises:   toSave,
  });

  activeWorkout = null;
  stopRestTimer();
  navigateTo('dashboard');
}

export function cancelWorkout(): void {
  clearWorkoutTimer();
  activeWorkout = null;
  stopRestTimer();
  navigateTo('dashboard');
}

// ===== Render =====
export function renderActiveWorkout(): void {
  if (!activeWorkout) { renderWorkoutEmpty(); return; }

  el('workout-title').textContent = activeWorkout.routineName;
  el('workout-empty').classList.add('hidden');

  const container = el('workout-exercises');
  container.innerHTML = '';

  activeWorkout.exercises.forEach((ex, exIdx) => {
    const card = document.createElement('div');
    card.className = `exercise-workout-card${ex.completed ? ' completed' : ''}`;

    card.innerHTML = `
      <div class="exercise-card-header">
        <div>
          <div class="exercise-card-name">${ex.name}</div>
          <div class="exercise-card-group">${ex.muscleGroup}</div>
        </div>
        <button class="complete-btn ${ex.completed ? 'done' : ''}" data-ex="${exIdx}">
          ${ex.completed ? '✓' : '○'}
        </button>
      </div>
      <div class="sets-table" id="sets-table-${exIdx}">
        ${ex.sets.map((s, si) => setRowHTML(exIdx, si, s)).join('')}
      </div>
      <div class="add-set-row">
        <button class="btn btn-ghost btn-sm add-set-btn" data-ex="${exIdx}">+ Add Set</button>
      </div>`;

    container.appendChild(card);
  });

  // Complete buttons
  qsa<HTMLButtonElement>('.complete-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.ex!);
      activeWorkout!.exercises[idx].completed = !activeWorkout!.exercises[idx].completed;
      renderActiveWorkout();
    });
  });

  // Add set buttons
  qsa<HTMLButtonElement>('.add-set-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.ex!);
      activeWorkout!.exercises[idx].sets.push({ reps: '', weight: '', logged: false });
      const table = el(`sets-table-${idx}`);
      table.innerHTML = activeWorkout!.exercises[idx].sets.map((s, si) => setRowHTML(idx, si, s)).join('');
      bindSetEvents(idx);
    });
  });

  activeWorkout.exercises.forEach((_, idx) => bindSetEvents(idx));
}

function setRowHTML(exIdx: number, setIdx: number, set: ActiveSet): string {
  return `
    <div class="set-row" data-ex="${exIdx}" data-set="${setIdx}">
      <span class="set-num">${setIdx + 1}</span>
      <input class="set-input" type="number" inputmode="decimal" placeholder="Reps"
        data-field="reps" data-ex="${exIdx}" data-set="${setIdx}"
        value="${set.reps}" ${set.logged ? 'disabled' : ''}/>
      <input class="set-input" type="number" inputmode="decimal" placeholder="kg"
        data-field="weight" data-ex="${exIdx}" data-set="${setIdx}"
        value="${set.weight}" ${set.logged ? 'disabled' : ''}/>
      <button class="log-set-btn ${set.logged ? 'logged' : ''}"
        data-ex="${exIdx}" data-set="${setIdx}" ${set.logged ? 'disabled' : ''}>
        ${set.logged ? '✓' : 'Log'}
      </button>
    </div>`;
}

function bindSetEvents(exIdx: number): void {
  const table = el(`sets-table-${exIdx}`);
  if (!table || !activeWorkout) return;

  qsa<HTMLInputElement>('.set-input', table).forEach(input => {
    input.addEventListener('input', () => {
      const si    = parseInt(input.dataset.set!);
      const field = input.dataset.field as 'reps' | 'weight';
      activeWorkout!.exercises[exIdx].sets[si][field] = input.value;
    });
  });

  qsa<HTMLButtonElement>('.log-set-btn', table).forEach(btn => {
    btn.addEventListener('click', () => {
      const si  = parseInt(btn.dataset.set!);
      const set = activeWorkout!.exercises[exIdx].sets[si];
      if (!set.reps && !set.weight) return;
      set.logged = true;
      btn.textContent = '✓';
      btn.classList.add('logged');
      btn.disabled = true;
      qsa<HTMLInputElement>(`input[data-set="${si}"]`, table).forEach(i => { i.disabled = true; });

      const dur = parseInt(el<HTMLSelectElement>('rest-duration-select').value) || 90;
      startRestTimer(dur);
    });
  });
}

export function renderWorkoutEmpty(): void {
  el('workout-exercises').innerHTML = '';
  el('workout-empty').classList.remove('hidden');
  el('workout-title').textContent = 'Active Workout';
  el('workout-timer-display').textContent = '00:00';
}
