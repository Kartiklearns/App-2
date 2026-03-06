import { getLogs, getExercises } from '../db';
import { formatDate, el, qsa } from '../utils';

export function renderHistory(): void {
  const logs      = [...getLogs()].reverse();
  const exercises = getExercises();
  const container = el('history-list');

  if (!logs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>No workout history yet.</p>
      </div>`;
    return;
  }

  container.innerHTML = logs.map((log, idx) => {
    const setCount = log.exercises.reduce((s, e) => s + e.sets.length, 0);
    const dur      = log.duration ? `${Math.round(log.duration / 60)}min` : '';

    const details = log.exercises.map(ex => {
      const name    = exercises.find(e => e.id === ex.exerciseId)?.name ?? 'Unknown';
      const setsStr = ex.sets
        .map((s, i) => `<span class="set-chip">Set ${i + 1}: ${s.reps || '?'} × ${s.weight || '?'}kg</span>`)
        .join('');
      return `
        <div class="history-exercise">
          <div class="history-exercise-name">${name}</div>
          <div class="history-set-chips">${setsStr}</div>
        </div>`;
    }).join('');

    return `
      <div class="history-item">
        <div class="history-header" data-idx="${idx}">
          <div>
            <div class="history-name">${log.routineName || 'Workout'}</div>
            <div class="history-meta">
              ${log.exercises.length} exercises &middot; ${setCount} sets${dur ? ` &middot; ${dur}` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:.75rem">
            <span class="badge badge-muted">${formatDate(log.date)}</span>
            <span class="history-expand">▼</span>
          </div>
        </div>
        <div class="history-details" id="history-details-${idx}">${details}</div>
      </div>`;
  }).join('');

  qsa<HTMLElement>('.history-header', container).forEach(header => {
    header.addEventListener('click', () => {
      const idx     = header.dataset.idx!;
      const details = el(`history-details-${idx}`);
      const arrow   = header.querySelector<HTMLElement>('.history-expand')!;
      details.classList.toggle('open');
      arrow.classList.toggle('open');
    });
  });
}
