import { getLogs, getExercises } from '../db';
import { formatDateShort, getWeekKey, el } from '../utils';

// Chart.js loaded via CDN — declare global
declare const Chart: {
  new (canvas: HTMLCanvasElement, config: unknown): { destroy(): void };
};

let progressChart: { destroy(): void } | null = null;
let overloadChart: { destroy(): void } | null = null;

export function renderProgress(): void {
  populateSelects();
}

function populateSelects(): void {
  const exercises = getExercises();
  const opts = exercises.map(e => `<option value="${e.id}">${e.name} (${e.muscleGroup})</option>`).join('');

  const s1 = el<HTMLSelectElement>('progress-exercise-select');
  const s2 = el<HTMLSelectElement>('overload-exercise-select');
  const v1 = s1.value, v2 = s2.value;

  s1.innerHTML = `<option value="">Select Exercise</option>${opts}`;
  s2.innerHTML = `<option value="">Select Exercise</option>${opts}`;

  if (v1) { s1.value = v1; buildProgressChart(v1, el<HTMLSelectElement>('progress-metric-select').value); }
  if (v2) { s2.value = v2; buildOverloadChart(v2); }
}

export function buildProgressChart(exerciseId: string, metric: string): void {
  const logs = getLogs()
    .filter(l => l.exercises.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const labels: string[] = [];
  const data:   number[] = [];

  for (const log of logs) {
    const ex = log.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex?.sets.length) continue;

    const value = metric === 'maxWeight'
      ? Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0))
      : ex.sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);

    labels.push(formatDateShort(log.date));
    data.push(value);
  }

  const canvas = el<HTMLCanvasElement>('progress-chart');
  progressChart?.destroy();
  progressChart = null;

  updateSummary(exerciseId, data, metric);

  if (!labels.length) return;

  progressChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metric === 'maxWeight' ? 'Max Weight (kg)' : 'Volume (reps × kg)',
        data,
        borderColor:     '#ff4d00',
        backgroundColor: 'rgba(255,77,0,0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#ff4d00',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35,
      }],
    },
    options: chartOptions(),
  }) as { destroy(): void };
}

export function buildOverloadChart(exerciseId: string): void {
  const logs = getLogs()
    .filter(l => l.exercises.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekMap: Record<string, number> = {};
  for (const log of logs) {
    const wk = getWeekKey(log.date);
    const ex = log.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) continue;
    const vol = ex.sets.reduce((s, set) =>
      s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
    weekMap[wk] = (weekMap[wk] ?? 0) + vol;
  }

  const weeks   = Object.keys(weekMap).sort();
  const volumes = weeks.map(w => weekMap[w]);
  const bgColors = volumes.map((v, i) =>
    i === 0           ? 'rgba(255,193,7,0.75)' :
    v >= volumes[i-1] ? 'rgba(0,200,83,0.75)'  : 'rgba(244,67,54,0.75)'
  );

  const canvas = el<HTMLCanvasElement>('overload-chart');
  overloadChart?.destroy();
  overloadChart = null;
  if (!weeks.length) return;

  overloadChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weeks,
      datasets: [{
        label: 'Weekly Volume',
        data: volumes,
        backgroundColor: bgColors,
        borderColor: bgColors.map(c => c.replace('0.75', '1')),
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      ...chartOptions(),
      plugins: {
        ...chartOptions().plugins,
        tooltip: {
          callbacks: {
            afterLabel: (ctx: { dataIndex: number }) => {
              const i = ctx.dataIndex;
              if (i === 0) return '(first week)';
              const diff = volumes[i] - volumes[i - 1];
              return diff >= 0
                ? `↑ +${diff.toFixed(0)} vs prev week`
                : `↓ ${diff.toFixed(0)} vs prev week`;
            },
          },
        },
      },
    },
  }) as { destroy(): void };
}

function updateSummary(exerciseId: string, data: number[], metric: string): void {
  const summaryEl = el('progress-summary');
  if (data.length < 2) { summaryEl.classList.add('hidden'); return; }

  const exName = getExercises().find(e => e.id === exerciseId)?.name ?? '';
  const diff   = data[data.length - 1] - data[0];
  const unit   = metric === 'maxWeight' ? 'kg' : ' vol';

  summaryEl.classList.remove('hidden');
  if (diff > 0) {
    summaryEl.textContent = `You've increased ${exName} by ${diff.toFixed(1)}${unit} over ${data.length} sessions 💪`;
    summaryEl.style.cssText = 'color:var(--success);border-color:var(--success)';
  } else if (diff < 0) {
    summaryEl.textContent = `${exName} is down ${Math.abs(diff).toFixed(1)}${unit} — push harder 🔥`;
    summaryEl.style.cssText = 'color:var(--warning);border-color:var(--warning)';
  } else {
    summaryEl.textContent = `${exName} — holding steady. Go for a new PR!`;
    summaryEl.style.cssText = 'color:var(--text-secondary);border-color:var(--border)';
  }
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { labels: { color: '#f5f5f5', font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: '#9e9e9e', maxRotation: 45 }, grid: { color: '#2a2a35' } },
      y: { ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a35' }, beginAtZero: false },
    },
  };
}
