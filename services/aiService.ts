
import { GoogleGenAI, Type } from "@google/genai";
import { MuscleGroup, ExerciseDefinition, ExerciseHistoryEntry } from "../types";

function langInstruction(lang: string): string {
  if (lang === 'he') {
    return '\n\nIMPORTANT: Respond entirely in Hebrew (עברית). All exercise names, descriptions, form cues, and weight ranges must be in Hebrew. YouTube search URLs should still use English terms for better results.';
  }
  return '';
}

/**
 * Generate personalized exercises for a single muscle group,
 * taking into account the user's exercise history and recently used exercises.
 */
export async function generatePersonalizedExercises(
  muscleGroup: MuscleGroup,
  volumeLevel: number,
  exerciseHistory: ExerciseHistoryEntry[],
  recentExerciseNames: string[],
  apiKey: string,
  language: string = 'en'
): Promise<ExerciseDefinition[]> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build history context from last 10 entries for this muscle group
    const relevantHistory = exerciseHistory
      .filter((e) => e.muscleGroup === muscleGroup)
      .slice(0, 10);

    let historyContext = "";
    if (relevantHistory.length > 0) {
      historyContext = `\n\nUser's recent training history for ${muscleGroup}:\n`;
      relevantHistory.forEach((entry) => {
        historyContext += `- ${entry.exerciseName}: best weight ${entry.bestWeight}kg x ${entry.bestReps} reps, total volume ${entry.totalVolume}kg (${entry.date})\n`;
      });
      historyContext += `\nBased on this history, suggest progressive overload where appropriate (slightly heavier weights or more volume).`;
    }

    // Build exclusion list
    let exclusionNote = "";
    if (recentExerciseNames.length > 0) {
      exclusionNote = `\n\nAvoid these exercises as the user recently performed them: ${recentExerciseNames.join(", ")}. Suggest different variations or alternatives instead.`;
    }

    const prompt = `Generate ${volumeLevel} unique and effective gym exercises for the ${muscleGroup} muscle group.
${historyContext}
${exclusionNote}

For each exercise, provide:
1. A brief description (max 2 sentences) detailing primary benefits and 2-3 essential form cues.
2. A recommended number of sets (typically 3-4).
3. A target rep range (e.g., "8-12", "5-8").
4. A suggested starting weight range (e.g., "Medium", "Heavy", "10-20kg") based on common gym standards.${relevantHistory.length > 0 ? " Adjust based on the user's history shown above." : ""}
5. A valid YouTube tutorial search link.

Be creative and include variations (e.g., dumbbells, cables, bodyweight, machines).${langInstruction(language)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the exercise" },
              muscleGroup: { type: Type.STRING, description: "The muscle group name" },
              description: { type: Type.STRING, description: "Brief benefits and form cues" },
              tutorialUrl: { type: Type.STRING, description: "A valid YouTube search URL for the exercise tutorial" },
              suggestedSets: { type: Type.INTEGER, description: "Recommended number of sets" },
              suggestedReps: { type: Type.STRING, description: "Recommended rep range string" },
              suggestedWeightRange: { type: Type.STRING, description: "Suggested weight or intensity level" },
            },
            required: [
              "name",
              "muscleGroup",
              "description",
              "tutorialUrl",
              "suggestedSets",
              "suggestedReps",
              "suggestedWeightRange",
            ],
          },
        },
      },
    });

    const text = response.text;
    const parsed = JSON.parse(text);
    return parsed.map((ex: any) => ({
      ...ex,
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      muscleGroup: muscleGroup,
    }));
  } catch (e) {
    console.error("Failed to generate personalized exercises:", e);
    return [];
  }
}

/**
 * Generate a full AI routine for an entire split, covering all muscle groups at once.
 * Returns an array of { muscle, exercises } for each muscle group in the split.
 */
export async function generateAIRoutine(
  split: string,
  muscleGroups: MuscleGroup[],
  volumePerMuscle: number,
  exerciseHistory: ExerciseHistoryEntry[],
  apiKey: string,
  language: string = 'en'
): Promise<{ muscle: MuscleGroup; exercises: ExerciseDefinition[] }[]> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build history context across all relevant muscle groups
    let historyContext = "";
    const historyByMuscle: Record<string, ExerciseHistoryEntry[]> = {};
    muscleGroups.forEach((mg) => {
      historyByMuscle[mg] = exerciseHistory
        .filter((e) => e.muscleGroup === mg)
        .slice(0, 5);
    });

    const hasHistory = Object.values(historyByMuscle).some((entries) => entries.length > 0);
    if (hasHistory) {
      historyContext = "\n\nUser's recent training history:\n";
      for (const [muscle, entries] of Object.entries(historyByMuscle)) {
        if (entries.length > 0) {
          historyContext += `\n${muscle}:\n`;
          entries.forEach((entry) => {
            historyContext += `  - ${entry.exerciseName}: ${entry.bestWeight}kg x ${entry.bestReps} reps (${entry.date})\n`;
          });
        }
      }
      historyContext += "\nUse this history to suggest progressive overload and avoid repeating the exact same exercises.";
    }

    const prompt = `Generate a complete ${split} workout routine covering these muscle groups: ${muscleGroups.join(", ")}.

For each muscle group, provide exactly ${volumePerMuscle} exercises.
${historyContext}

For each exercise provide:
- name: exercise name
- muscleGroup: which muscle group it targets (must match one of: ${muscleGroups.join(", ")})
- description: brief benefits and 2-3 form cues (max 2 sentences)
- tutorialUrl: a YouTube search URL for the exercise tutorial
- suggestedSets: recommended number of sets (3-4)
- suggestedReps: target rep range (e.g., "8-12")
- suggestedWeightRange: suggested weight or intensity

Return the results grouped by muscle group.${langInstruction(language)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              muscle: { type: Type.STRING, description: "The muscle group name" },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    muscleGroup: { type: Type.STRING },
                    description: { type: Type.STRING },
                    tutorialUrl: { type: Type.STRING },
                    suggestedSets: { type: Type.INTEGER },
                    suggestedReps: { type: Type.STRING },
                    suggestedWeightRange: { type: Type.STRING },
                  },
                  required: [
                    "name",
                    "muscleGroup",
                    "description",
                    "tutorialUrl",
                    "suggestedSets",
                    "suggestedReps",
                    "suggestedWeightRange",
                  ],
                },
              },
            },
            required: ["muscle", "exercises"],
          },
        },
      },
    });

    const text = response.text;
    const parsed = JSON.parse(text);

    return parsed.map((group: any) => ({
      muscle: group.muscle as MuscleGroup,
      exercises: group.exercises.map((ex: any) => ({
        ...ex,
        id: `ai-${Math.random().toString(36).substr(2, 9)}`,
        muscleGroup: group.muscle as MuscleGroup,
      })),
    }));
  } catch (e) {
    console.error("Failed to generate AI routine:", e);
    return [];
  }
}

/**
 * Analyze recent workouts and return coaching insights as a string.
 */
export async function getWorkoutInsights(
  recentWorkouts: { date: string; rpe: number; exercises: { name: string; muscleGroup: string; sets: { weight: number; reps: number }[] }[] }[],
  apiKey: string,
  language: string = 'en'
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const workoutSummary = recentWorkouts.slice(0, 10).map((w) => {
      const totalVol = w.exercises.reduce(
        (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0),
        0
      );
      const exerciseNames = w.exercises.map((ex) => ex.name).join(", ");
      return `- Date: ${w.date}, RPE: ${w.rpe}, Exercises: ${exerciseNames}, Total Volume: ${totalVol}kg`;
    }).join("\n");

    const langNote = language === 'he'
      ? '\n\nIMPORTANT: Respond entirely in Hebrew (עברית). All insights and coaching tips must be in Hebrew.'
      : '';

    const prompt = `You are a professional fitness coach. Analyze these recent workout sessions and provide 3-5 short, actionable coaching insights. Focus on:
- Training balance across muscle groups
- Volume and intensity trends
- Recovery suggestions based on RPE patterns
- Progressive overload opportunities

Keep each insight to 1-2 sentences. Be encouraging but honest.

Recent workouts:
${workoutSummary}${langNote}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (e) {
    console.error("Failed to get workout insights:", e);
    return "Unable to generate insights. Please check your API key and try again.";
  }
}
