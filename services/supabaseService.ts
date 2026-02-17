import { supabase } from './supabase';
import {
  WorkoutSession, ProgressPhoto, UserProfile, UserSettings,
  ExerciseHistoryEntry, MuscleGroup
} from '../types';

// ─── User Profile ───

export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  const row: Record<string, any> = { id: userId };
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.displayName !== undefined) row.display_name = profile.displayName;
  if (profile.profilePhotoUrl !== undefined) row.profile_photo_url = profile.profilePhotoUrl;
  if (profile.currentSplit !== undefined) row.current_split = profile.currentSplit;
  if (profile.volumePerMuscle !== undefined) row.volume_per_muscle = profile.volumePerMuscle;
  if (profile.language !== undefined) row.language = profile.language;
  if (profile.createdAt !== undefined) row.created_at = profile.createdAt;

  const { error } = await supabase.from('profiles').upsert(row);
  if (error) throw error;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    profilePhotoUrl: data.profile_photo_url,
    currentSplit: data.current_split,
    volumePerMuscle: data.volume_per_muscle,
    language: data.language,
    createdAt: data.created_at,
  } as UserProfile;
}

// ─── User Settings ───

export async function saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  const row: Record<string, any> = { id: userId, updated_at: new Date().toISOString() };
  if (settings.geminiApiKey !== undefined) row.gemini_api_key = settings.geminiApiKey;
  if (settings.language !== undefined) row.language = settings.language;

  const { error } = await supabase.from('user_settings').upsert(row);
  if (error) throw error;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    geminiApiKey: data.gemini_api_key || '',
    language: data.language || 'en',
  } as UserSettings;
}

// ─── Workouts ───

export async function saveWorkout(
  userId: string,
  workout: Omit<WorkoutSession, 'id'>
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      date: workout.date,
      rpe: workout.rpe,
      notes: workout.notes,
      exercises: workout.exercises,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    date: data.date,
    rpe: data.rpe,
    notes: data.notes,
    exercises: data.exercises,
  } as WorkoutSession;
}

export async function getWorkouts(
  userId: string,
  limitCount: number = 50
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limitCount);

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    rpe: row.rpe,
    notes: row.notes,
    exercises: row.exercises,
  } as WorkoutSession));
}

export async function getWorkoutById(userId: string, workoutId: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    date: data.date,
    rpe: data.rpe,
    notes: data.notes,
    exercises: data.exercises,
  } as WorkoutSession;
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ─── Photos ───

export async function savePhoto(
  userId: string,
  photo: Omit<ProgressPhoto, 'id'>
): Promise<ProgressPhoto> {
  const { data, error } = await supabase
    .from('photos')
    .insert({
      user_id: userId,
      url: photo.url,
      storage_path: photo.storagePath || null,
      thumbnail_url: photo.thumbnailUrl || null,
      date: photo.date,
      caption: photo.caption || null,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    url: data.url,
    storagePath: data.storage_path,
    thumbnailUrl: data.thumbnail_url,
    date: data.date,
    caption: data.caption,
  } as ProgressPhoto;
}

export async function getPhotos(userId: string): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    url: row.url,
    storagePath: row.storage_path,
    thumbnailUrl: row.thumbnail_url,
    date: row.date,
    caption: row.caption,
  } as ProgressPhoto));
}

export async function deletePhoto(userId: string, photoId: string): Promise<void> {
  // Get storage path before deleting record
  const { data } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single();

  // Delete from storage if path exists
  if (data?.storage_path) {
    await supabase.storage.from('photos').remove([data.storage_path]);
  }

  // Delete record
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ─── Exercise History ───

export async function saveExerciseHistory(
  userId: string,
  entry: Omit<ExerciseHistoryEntry, 'id'>
): Promise<void> {
  const { error } = await supabase
    .from('exercise_history')
    .insert({
      user_id: userId,
      exercise_id: entry.exerciseId,
      exercise_name: entry.exerciseName,
      muscle_group: entry.muscleGroup,
      date: entry.date,
      best_weight: entry.bestWeight,
      best_reps: entry.bestReps,
      total_volume: entry.totalVolume,
      sets: entry.sets,
    });

  if (error) throw error;
}

export async function getExerciseHistory(
  userId: string,
  muscleGroup?: MuscleGroup
): Promise<ExerciseHistoryEntry[]> {
  let q = supabase
    .from('exercise_history')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(200);

  if (muscleGroup) {
    q = q.eq('muscle_group', muscleGroup);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group as MuscleGroup,
    date: row.date,
    bestWeight: row.best_weight,
    bestReps: row.best_reps,
    totalVolume: row.total_volume,
    sets: row.sets,
  } as ExerciseHistoryEntry));
}
