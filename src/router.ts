import type { ViewName } from './types';
import { el, qsa } from './utils';
import { renderDashboard } from './views/dashboard';
import { renderRoutines }  from './views/routines';
import { renderProgress }  from './views/progress';
import { renderHistory }   from './views/history';
import { renderWorkoutEmpty, isWorkoutActive } from './views/workout';

export const VIEWS: ViewName[] = ['dashboard', 'routines', 'workout', 'progress', 'history'];

export function navigateTo(view: ViewName): void {
  qsa<HTMLElement>('.view').forEach(v => v.classList.remove('active'));
  qsa<HTMLButtonElement>('.nav-btn').forEach(b => b.classList.remove('active'));

  el(`view-${view}`).classList.add('active');
  document.querySelector<HTMLButtonElement>(`.nav-btn[data-view="${view}"]`)?.classList.add('active');

  switch (view) {
    case 'dashboard': renderDashboard(); break;
    case 'routines':  renderRoutines();  break;
    case 'progress':  renderProgress();  break;
    case 'history':   renderHistory();   break;
    case 'workout':
      if (!isWorkoutActive()) renderWorkoutEmpty();
      break;
  }
}
