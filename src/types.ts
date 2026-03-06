// ===== Domain Types =====

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';

export interface Routine {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface SetLog {
  reps: string;
  weight: string;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  date: string;           // YYYY-MM-DD
  routineId: string;
  routineName: string;
  duration: number;       // seconds
  exercises: ExerciseLog[];
}

// ===== Active Workout State =====

export interface ActiveSet {
  reps: string;
  weight: string;
  logged: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: ActiveSet[];
  completed: boolean;
}

export interface ActiveWorkout {
  id: string;
  routineId: string;
  routineName: string;
  startTime: number;
  exercises: ActiveExercise[];
}

// ===== View Names =====
export type ViewName = 'dashboard' | 'routines' | 'workout' | 'progress' | 'history';
