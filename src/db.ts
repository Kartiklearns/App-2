import type { Exercise, Routine, WorkoutLog, MuscleGroup } from './types';

const KEYS = {
  EXERCISES: 'gy_exercises',
  ROUTINES:  'gy_routines',
  LOGS:      'gy_logs',
} as const;

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ===== Exercises =====
export function getExercises(): Exercise[] { return read<Exercise>(KEYS.EXERCISES); }
export function saveExercises(data: Exercise[]): void { write(KEYS.EXERCISES, data); }

// ===== Routines =====
export function getRoutines(): Routine[] { return read<Routine>(KEYS.ROUTINES); }
export function saveRoutines(data: Routine[]): void { write(KEYS.ROUTINES, data); }
export function addRoutine(r: Routine): void { saveRoutines([...getRoutines(), r]); }
export function updateRoutine(updated: Routine): void {
  saveRoutines(getRoutines().map(r => r.id === updated.id ? updated : r));
}
export function deleteRoutine(id: string): void {
  saveRoutines(getRoutines().filter(r => r.id !== id));
}

// ===== Workout Logs =====
export function getLogs(): WorkoutLog[] { return read<WorkoutLog>(KEYS.LOGS); }
export function saveLogs(data: WorkoutLog[]): void { write(KEYS.LOGS, data); }
export function addLog(log: WorkoutLog): void { saveLogs([...getLogs(), log]); }

// ===== Seed =====
export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'e01', name: 'Bench Press',         muscleGroup: 'Chest' },
  { id: 'e02', name: 'Incline Bench Press', muscleGroup: 'Chest' },
  { id: 'e03', name: 'Cable Fly',           muscleGroup: 'Chest' },
  { id: 'e04', name: 'Push-Up',             muscleGroup: 'Chest' },
  { id: 'e05', name: 'Deadlift',            muscleGroup: 'Back' },
  { id: 'e06', name: 'Barbell Row',         muscleGroup: 'Back' },
  { id: 'e07', name: 'Pull-Up',             muscleGroup: 'Back' },
  { id: 'e08', name: 'Lat Pulldown',        muscleGroup: 'Back' },
  { id: 'e09', name: 'Seated Cable Row',    muscleGroup: 'Back' },
  { id: 'e10', name: 'Squat',               muscleGroup: 'Legs' },
  { id: 'e11', name: 'Leg Press',           muscleGroup: 'Legs' },
  { id: 'e12', name: 'Romanian Deadlift',   muscleGroup: 'Legs' },
  { id: 'e13', name: 'Leg Curl',            muscleGroup: 'Legs' },
  { id: 'e14', name: 'Calf Raise',          muscleGroup: 'Legs' },
  { id: 'e15', name: 'Overhead Press',      muscleGroup: 'Shoulders' },
  { id: 'e16', name: 'Lateral Raise',       muscleGroup: 'Shoulders' },
  { id: 'e17', name: 'Front Raise',         muscleGroup: 'Shoulders' },
  { id: 'e18', name: 'Barbell Curl',        muscleGroup: 'Arms' },
  { id: 'e19', name: 'Tricep Pushdown',     muscleGroup: 'Arms' },
  { id: 'e20', name: 'Hammer Curl',         muscleGroup: 'Arms' },
  { id: 'e21', name: 'Skull Crusher',       muscleGroup: 'Arms' },
  { id: 'e22', name: 'Dips',               muscleGroup: 'Arms' },
  { id: 'e23', name: 'Plank',              muscleGroup: 'Core' },
  { id: 'e24', name: 'Cable Crunch',       muscleGroup: 'Core' },
  { id: 'e25', name: 'Hanging Leg Raise',  muscleGroup: 'Core' },
];

export function seed(): void {
  if (getExercises().length === 0) saveExercises(DEFAULT_EXERCISES);
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest','Back','Legs','Shoulders','Arms','Core'];
