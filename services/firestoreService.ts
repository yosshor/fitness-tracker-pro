
import {
  collection, doc, addDoc, getDocs, getDoc, setDoc, updateDoc,
  deleteDoc, query, orderBy, limit as firestoreLimit, startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import {
  WorkoutSession, ProgressPhoto, UserProfile, UserSettings,
  ExerciseHistoryEntry, MuscleGroup
} from '../types';

// ─── User Profile ───

export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, profile as Record<string, any>);
  } else {
    await setDoc(ref, { ...profile, createdAt: new Date().toISOString() });
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserProfile;
}

// ─── User Settings ───

export async function saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  const ref = doc(db, 'users', userId, 'meta', 'settings');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, settings as Record<string, any>);
  } else {
    await setDoc(ref, settings);
  }
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'meta', 'settings'));
  if (!snap.exists()) return null;
  return snap.data() as UserSettings;
}

// ─── Workouts ───

export async function saveWorkout(
  userId: string,
  workout: Omit<WorkoutSession, 'id'>
): Promise<WorkoutSession> {
  const ref = collection(db, 'users', userId, 'workouts');
  const docRef = await addDoc(ref, workout);
  return { ...workout, id: docRef.id } as WorkoutSession;
}

export async function getWorkouts(
  userId: string,
  limitCount: number = 50,
  cursor?: DocumentSnapshot
): Promise<{ workouts: WorkoutSession[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'users', userId, 'workouts'),
    orderBy('date', 'desc'),
    firestoreLimit(limitCount)
  );
  if (cursor) {
    q = query(
      collection(db, 'users', userId, 'workouts'),
      orderBy('date', 'desc'),
      startAfter(cursor),
      firestoreLimit(limitCount)
    );
  }
  const snap = await getDocs(q);
  const workouts = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession));
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { workouts, lastDoc };
}

export async function getWorkoutById(userId: string, workoutId: string): Promise<WorkoutSession | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'workouts', workoutId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkoutSession;
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'workouts', workoutId));
}

// ─── Photos ───

export async function savePhoto(
  userId: string,
  photo: Omit<ProgressPhoto, 'id'>
): Promise<ProgressPhoto> {
  const ref = collection(db, 'users', userId, 'photos');
  const docRef = await addDoc(ref, photo);
  return { ...photo, id: docRef.id } as ProgressPhoto;
}

export async function getPhotos(userId: string): Promise<ProgressPhoto[]> {
  const q = query(
    collection(db, 'users', userId, 'photos'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgressPhoto));
}

export async function deletePhoto(userId: string, photoId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'photos', photoId));
}

// ─── Exercise History ───

export async function saveExerciseHistory(
  userId: string,
  entry: Omit<ExerciseHistoryEntry, 'id'>
): Promise<void> {
  await addDoc(collection(db, 'users', userId, 'exerciseHistory'), entry);
}

export async function getExerciseHistory(
  userId: string,
  muscleGroup?: MuscleGroup
): Promise<ExerciseHistoryEntry[]> {
  // Use a single-field query to avoid needing a composite Firestore index.
  // Filter by muscleGroup client-side when needed.
  const q = query(
    collection(db, 'users', userId, 'exerciseHistory'),
    orderBy('date', 'desc'),
    firestoreLimit(200)
  );
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExerciseHistoryEntry));
  if (muscleGroup) {
    results = results.filter(e => e.muscleGroup === muscleGroup);
  }
  return results;
}
