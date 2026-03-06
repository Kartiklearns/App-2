import { seed } from './db';
import { navigateTo, VIEWS } from './router';
import { openSelectRoutineModal, openRoutineModal, saveRoutine, closeModal } from './views/routines';
import { finishWorkout, cancelWorkout } from './views/workout';
import { stopRestTimer, restartRestTimer } from './timer';
import { buildProgressChart, buildOverloadChart } from './views/progress';
import { el, qsa } from './utils';
import type { ViewName } from './types';

// ===== Boot =====
function init(): void {
  seed();
  bindEvents();

  // Support ?view= PWA shortcuts
  const params    = new URLSearchParams(window.location.search);
  const viewParam = params.get('view') as ViewName | null;
  navigateTo(viewParam && VIEWS.includes(viewParam) ? viewParam : 'dashboard');

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/App-2/sw.js')
      .catch(err => console.warn('[SW] failed:', err));
  }
}

function bindEvents(): void {
  // Nav buttons
  qsa<HTMLButtonElement>('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view as ViewName));
  });

  // Dashboard quick-start
  el('quick-start-btn').addEventListener('click', openSelectRoutineModal);

  // Routines
  el('create-routine-btn').addEventListener('click', () => openRoutineModal());
  el('save-routine-btn').addEventListener('click', saveRoutine);

  // Workout
  el('finish-workout-btn').addEventListener('click', finishWorkout);
  el('cancel-workout-btn').addEventListener('click', () => {
    if (confirm('Cancel this workout?')) cancelWorkout();
  });

  // Rest timer
  el('rest-skip-btn').addEventListener('click', stopRestTimer);
  el('rest-restart-btn').addEventListener('click', restartRestTimer);
  el<HTMLSelectElement>('rest-duration-select').addEventListener('change', () => {
    // Duration change takes effect on next timer start
  });

  // Modal close — data-modal attribute buttons
  qsa<HTMLButtonElement>('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal!));
  });

  // Overlay click to dismiss
  el('modal-overlay').addEventListener('click', e => {
    if (e.target === el('modal-overlay')) {
      ['modal-routine', 'modal-select-routine'].forEach(id => {
        if (!el(id).classList.contains('hidden')) closeModal(id);
      });
    }
  });

  // Progress selects
  el<HTMLSelectElement>('progress-exercise-select').addEventListener('change', e => {
    const metric = el<HTMLSelectElement>('progress-metric-select').value;
    if ((e.target as HTMLSelectElement).value)
      buildProgressChart((e.target as HTMLSelectElement).value, metric);
  });

  el<HTMLSelectElement>('progress-metric-select').addEventListener('change', () => {
    const exId = el<HTMLSelectElement>('progress-exercise-select').value;
    if (exId) buildProgressChart(exId, el<HTMLSelectElement>('progress-metric-select').value);
  });

  el<HTMLSelectElement>('overload-exercise-select').addEventListener('change', e => {
    if ((e.target as HTMLSelectElement).value)
      buildOverloadChart((e.target as HTMLSelectElement).value);
  });
}

document.addEventListener('DOMContentLoaded', init);
