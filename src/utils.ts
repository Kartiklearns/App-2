export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const todayStr = (): string =>
  new Date().toISOString().split('T')[0];

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

export function calcStreak(logDates: string[]): number {
  if (!logDates.length) return 0;
  const days = [...new Set(logDates)].sort().reverse();
  let streak = 0;
  let cursor = new Date(todayStr());
  for (const day of days) {
    const d = new Date(day);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

export function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function qs<T extends Element>(selector: string, parent: Element | Document = document): T {
  return parent.querySelector<T>(selector) as T;
}

export function qsa<T extends Element>(selector: string, parent: Element | Document = document): T[] {
  return [...parent.querySelectorAll<T>(selector)];
}
