import { getRoutines, getExercises, addRoutine, updateRoutine, deleteRoutine, MUSCLE_GROUPS } from '../db';
import type { MuscleGroup } from '../types';
import { uid, el, qsa } from '../utils';
import { startWorkout, isWorkoutActive } from './workout';

// ===== Render Routines List =====
export function renderRoutines(): void {
  const routines  = getRoutines();
  const exercises = getExercises();
  const container = el('routines-list');

  if (!routines.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No routines yet. Tap <strong>+ New Routine</strong> to create one.</p>
      </div>`;
    return;
  }

  container.innerHTML = routines.map(r => {
    const names = r.exerciseIds
      .map(id => exercises.find(e => e.id === id)?.name ?? '')
      .filter(Boolean);
    return `
      <div class="routine-card" data-id="${r.id}">
        <div class="routine-header">
          <span class="routine-name">${r.name}</span>
          <div class="routine-actions">
            <button class="btn btn-primary btn-sm start-routine-btn" data-id="${r.id}">▶ Start</button>
            <button class="btn btn-ghost btn-sm edit-routine-btn"  data-id="${r.id}">Edit</button>
            <button class="btn btn-danger btn-sm del-routine-btn"  data-id="${r.id}">✕</button>
          </div>
        </div>
        <div class="routine-exercises">
          ${names.map(n => `<span class="exercise-tag">${n}</span>`).join('')}
        </div>
        <div class="routine-footer text-muted">${names.length} exercise${names.length !== 1 ? 's' : ''}</div>
      </div>`;
  }).join('');

  qsa<HTMLButtonElement>('.start-routine-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      if (isWorkoutActive() && !confirm('A workout is in progress. Start a new one?')) return;
      startWorkout(btn.dataset.id!);
    });
  });

  qsa<HTMLButtonElement>('.edit-routine-btn', container).forEach(btn => {
    btn.addEventListener('click', () => openRoutineModal(btn.dataset.id));
  });

  qsa<HTMLButtonElement>('.del-routine-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this routine?')) {
        deleteRoutine(btn.dataset.id!);
        renderRoutines();
      }
    });
  });
}

// ===== Select Routine Modal =====
export function openSelectRoutineModal(): void {
  const routines  = getRoutines();
  const container = el('select-routine-list');

  if (!routines.length) {
    container.innerHTML = `<div class="empty-state"><p>No routines yet — create one first!</p></div>`;
  } else {
    container.innerHTML = routines.map(r => `
      <div class="routine-card selectable" data-id="${r.id}">
        <div class="routine-name">${r.name}</div>
        <div class="text-muted" style="font-size:.8rem;margin-top:.2rem">${r.exerciseIds.length} exercises</div>
      </div>`).join('');

    qsa<HTMLElement>('.routine-card.selectable', container).forEach(card => {
      card.addEventListener('click', () => {
        if (isWorkoutActive() && !confirm('A workout is in progress. Start a new one?')) return;
        startWorkout(card.dataset.id!);
        closeModal('modal-select-routine');
      });
    });
  }

  showModal('modal-select-routine');
}

// ===== Routine Create/Edit Modal =====
interface ModalState {
  editId: string | null;
  selectedIds: string[];
  activeMuscle: MuscleGroup;
}

const state: ModalState = { editId: null, selectedIds: [], activeMuscle: 'Chest' };

export function openRoutineModal(editId?: string | null): void {
  state.editId       = editId ?? null;
  state.selectedIds  = [];
  state.activeMuscle = 'Chest';

  const nameInput = el<HTMLInputElement>('routine-name-input');

  if (editId) {
    const r = getRoutines().find(x => x.id === editId);
    if (r) {
      nameInput.value       = r.name;
      state.selectedIds     = [...r.exerciseIds];
      el('modal-routine-title').textContent = 'Edit Routine';
    }
  } else {
    nameInput.value = '';
    el('modal-routine-title').textContent = 'Create Routine';
  }

  renderMuscleTabs();
  renderExerciseSelector();
  renderSelectedExercises();
  showModal('modal-routine');
}

function renderMuscleTabs(): void {
  const container = el('muscle-tabs');
  container.innerHTML = MUSCLE_GROUPS.map(g => `
    <button class="muscle-tab ${g === state.activeMuscle ? 'active' : ''}" data-group="${g}">${g}</button>
  `).join('');

  qsa<HTMLButtonElement>('.muscle-tab', container).forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeMuscle = btn.dataset.group as MuscleGroup;
      renderMuscleTabs();
      renderExerciseSelector();
    });
  });
}

function renderExerciseSelector(): void {
  const exercises = getExercises().filter(e => e.muscleGroup === state.activeMuscle);
  const container = el('exercise-selector');
  container.innerHTML = exercises.map(ex => `
    <label class="exercise-option ${state.selectedIds.includes(ex.id) ? 'selected' : ''}" data-id="${ex.id}">
      <input type="checkbox" value="${ex.id}" ${state.selectedIds.includes(ex.id) ? 'checked' : ''}/>
      <span>${ex.name}</span>
    </label>`).join('');

  qsa<HTMLElement>('.exercise-option', container).forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      const id  = opt.dataset.id!;
      const idx = state.selectedIds.indexOf(id);
      if (idx === -1) state.selectedIds.push(id);
      else state.selectedIds.splice(idx, 1);
      renderExerciseSelector();
      renderSelectedExercises();
    });
  });
}

function renderSelectedExercises(): void {
  const exercises = getExercises();
  const container = el('selected-exercises-list');

  if (!state.selectedIds.length) {
    container.innerHTML = `<div class="text-muted" style="font-size:.85rem;padding:.5rem">No exercises selected</div>`;
    return;
  }

  container.innerHTML = state.selectedIds.map(id => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return '';
    return `
      <div class="selected-item">
        <span>${ex.name} <span class="text-muted" style="font-size:.75rem">${ex.muscleGroup}</span></span>
        <button class="remove-exercise-btn" data-id="${id}">✕</button>
      </div>`;
  }).join('');

  qsa<HTMLButtonElement>('.remove-exercise-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedIds = state.selectedIds.filter(id => id !== btn.dataset.id);
      renderExerciseSelector();
      renderSelectedExercises();
    });
  });
}

export function saveRoutine(): void {
  const name = el<HTMLInputElement>('routine-name-input').value.trim();
  if (!name) { alert('Please enter a routine name'); return; }
  if (!state.selectedIds.length) { alert('Please select at least one exercise'); return; }

  if (state.editId) {
    updateRoutine({ id: state.editId, name, exerciseIds: [...state.selectedIds] });
  } else {
    addRoutine({ id: uid(), name, exerciseIds: [...state.selectedIds] });
  }

  closeModal('modal-routine');
  renderRoutines();
}

// ===== Modal Helpers =====
export function showModal(id: string): void {
  el('modal-overlay').classList.remove('hidden');
  el(id).classList.remove('hidden');
}

export function closeModal(id: string): void {
  el(id).classList.add('hidden');
  const open = ['modal-routine', 'modal-select-routine']
    .some(mid => !el(mid).classList.contains('hidden'));
  if (!open) el('modal-overlay').classList.add('hidden');
}
