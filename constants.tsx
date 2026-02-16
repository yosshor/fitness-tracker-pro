
import { MuscleGroup, ExerciseDefinition } from './types';

export const FALLBACK_EXERCISES: ExerciseDefinition[] = [
  { id: 'bp-1', name: 'Bench Press', muscleGroup: MuscleGroup.Chest, tutorialUrl: 'https://www.youtube.com/watch?v=rT7DgVCn7iI' },
  { id: 'db-f-1', name: 'Dumbbell Flyes', muscleGroup: MuscleGroup.Chest, tutorialUrl: 'https://www.youtube.com/watch?v=eGjt4lk6g34' },
  { id: 'ip-1', name: 'Incline Press', muscleGroup: MuscleGroup.Chest, tutorialUrl: 'https://www.youtube.com/watch?v=0G2_XP765IA' },
  { id: 'pull-1', name: 'Pull-Ups', muscleGroup: MuscleGroup.Back, tutorialUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
  { id: 'row-1', name: 'Bent Over Rows', muscleGroup: MuscleGroup.Back, tutorialUrl: 'https://www.youtube.com/watch?v=6TSzxhf33nk' },
  { id: 'lat-1', name: 'Lat Pulldown', muscleGroup: MuscleGroup.Back, tutorialUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },
  { id: 'sq-1', name: 'Squats', muscleGroup: MuscleGroup.Legs, tutorialUrl: 'https://www.youtube.com/watch?v=gcNh17Ckjgg' },
  { id: 'dl-1', name: 'Deadlift', muscleGroup: MuscleGroup.Legs, tutorialUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
  { id: 'le-1', name: 'Leg Extensions', muscleGroup: MuscleGroup.Legs, tutorialUrl: 'https://www.youtube.com/watch?v=YyvSfVkoQ90' },
  { id: 'ohp-1', name: 'Overhead Press', muscleGroup: MuscleGroup.Shoulders, tutorialUrl: 'https://www.youtube.com/watch?v=_RlRDWO2jfg' },
  { id: 'lr-1', name: 'Lateral Raises', muscleGroup: MuscleGroup.Shoulders, tutorialUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
  { id: 'bc-1', name: 'Bicep Curls', muscleGroup: MuscleGroup.Arms, tutorialUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo' },
  { id: 'td-1', name: 'Tricep Dips', muscleGroup: MuscleGroup.Arms, tutorialUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As' },
  { id: 'sk-1', name: 'Skull Crushers', muscleGroup: MuscleGroup.Arms, tutorialUrl: 'https://www.youtube.com/watch?v=ir5PsA5-47Q' },
];

// Backward compatibility alias
export { FALLBACK_EXERCISES as EXERCISES };

export const SPLITS = [
  { id: 'A', name: 'Split A (Chest&Biceps)', muscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms] },
  { id: 'B', name: 'Split B (Back&Arms)', muscleGroups: [MuscleGroup.Back, MuscleGroup.Arms] },
  { id: 'C', name: 'Split C (Legs)', muscleGroups: [MuscleGroup.Legs] },
  { id: 'Full Body', name: 'Full Body', muscleGroups: Object.values(MuscleGroup) },
];
