
export enum MuscleGroup {
  Chest = 'Chest',
  Back = 'Back',
  Legs = 'Legs',
  Shoulders = 'Shoulders',
  Arms = 'Arms'
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  description?: string;
  tutorialUrl?: string;
  suggestedSets?: number;
  suggestedReps?: string;
  suggestedWeightRange?: string;
}

export interface ExerciseSet {
  reps: number;
  weight: number;
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  description?: string;
  sets: ExerciseSet[];
  tutorialUrl?: string;
  suggestedReps?: string;
  suggestedWeightRange?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  rpe: number;
  notes: string;
  exercises: LoggedExercise[];
}

export interface ProgressPhoto {
  id: string;
  url: string;
  storagePath?: string;
  thumbnailUrl?: string;
  date: string;
  caption?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  profilePhotoUrl?: string;
  currentSplit: 'A' | 'B' | 'C' | 'Full Body';
  volumePerMuscle: number;
  language?: 'en' | 'he';
  createdAt?: string;
}

export interface UserSettings {
  geminiApiKey: string;
  language: 'en' | 'he';
}

export interface ExerciseHistoryEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  date: string;
  bestWeight: number;
  bestReps: number;
  totalVolume: number;
  sets: ExerciseSet[];
}
