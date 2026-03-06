import { getLogs, getRoutines } from '../db';
import { calcStreak, formatDateShort, el } from '../utils';
import { navigateTo } from '../router';
import { openSelectRoutineModal } from './routines';

export function renderDashboard(): void {
  const logs     = getLogs();
  const streak   = calcStreak(logs.map(l => l.date));

  const now       = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const thisWeek  = logs.filter(l => new Date(l.date) >= weekStart).length;

  // Header streak
  el('header-streak').textContent = streak > 0 ? `🔥 ${streak} day streak` : '';

  // Date
  el('current-date').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Stats
  el('dashboard-stats').innerHTML = `
    <div class="stat-card accent">
      <div class="stat-value">${streak}</div>
      <div class="stat-label">Streak 🔥</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${logs.length}</div>
      <div class="stat-label">Total Workouts</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${thisWeek}</div>
      <div class="stat-label">This Week</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${getRoutines().length}</div>
      <div class="stat-label">Routines</div>
    </div>
  `;

  // Recent workouts
  const recent = [...logs].reverse().slice(0, 5);
  const recentEl = el('recent-workouts');

  if (!recent.length) {
    recentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p>No workouts yet — hit Start Workout to begin!</p>
      </div>`;
    return;
  }

  recentEl.innerHTML = recent.map(log => {
    const setCount = log.exercises.reduce((s, e) => s + e.sets.length, 0);
    const dur = log.duration ? `${Math.round(log.duration / 60)}min` : '';
    return `
      <div class="card recent-card">
        <div class="recent-workout-header">
          <span class="recent-workout-name">${log.routineName || 'Workout'}</span>
          <span class="badge badge-muted">${formatDateShort(log.date)}</span>
        </div>
        <div class="recent-workout-meta">
          ${log.exercises.length} exercises &middot; ${setCount} sets${dur ? ` &middot; ${dur}` : ''}
        </div>
      </div>`;
  }).join('');

  // Quick-start binds view changes
  recentEl.querySelectorAll<HTMLElement>('.recent-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      navigateTo('history');
      // Small delay so history renders
      setTimeout(() => {
        const headers = document.querySelectorAll<HTMLElement>('.history-header');
        if (headers[i]) headers[i].click();
      }, 50);
    });
  });
}

// Quick-start button handler — called from main
export { openSelectRoutineModal as quickStart };
