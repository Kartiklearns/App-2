import { playBeep } from './audio';
import { el } from './utils';

// ===== Rest Timer =====
let restInterval: ReturnType<typeof setInterval> | null = null;
let restRemaining = 0;
let restDuration  = 90;

export function startRestTimer(duration?: number): void {
  if (restInterval) clearInterval(restInterval);
  restDuration   = duration ?? parseInt((el<HTMLSelectElement>('rest-duration-select')).value) ?? 90;
  restRemaining  = restDuration;
  el('rest-timer-overlay').classList.remove('hidden');
  updateRestDisplay();

  restInterval = setInterval(() => {
    restRemaining--;
    updateRestDisplay();
    if (restRemaining <= 0) {
      clearInterval(restInterval!);
      restInterval = null;
      playBeep();
      setTimeout(stopRestTimer, 1800);
    }
  }, 1000);
}

export function stopRestTimer(): void {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  el('rest-timer-overlay').classList.add('hidden');
}

export function restartRestTimer(): void {
  startRestTimer(restDuration);
}

function updateRestDisplay(): void {
  const m = Math.floor(restRemaining / 60);
  const s = restRemaining % 60;
  el('rest-timer-display').textContent = `${m}:${String(s).padStart(2, '0')}`;
}

// ===== Workout Elapsed Timer =====
let workoutInterval: ReturnType<typeof setInterval> | null = null;

export function startWorkoutTimer(startTime: number): void {
  clearWorkoutTimer();
  workoutInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const display = el('workout-timer-display');
    if (display) display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

export function clearWorkoutTimer(): void {
  if (workoutInterval) { clearInterval(workoutInterval); workoutInterval = null; }
}
