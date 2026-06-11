import type { NutritionTargets, UserProfile } from "@/types";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  weight_loss: -400,
  muscle_gain: 300,
};

function ageFromDob(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Estimate daily targets with Mifflin–St Jeor when the user hasn't set
 * explicit targets. Falls back to sensible defaults when body metrics
 * are missing. Macro split: 30% protein / 40% carbs / 30% fat.
 */
export function estimateTargets(profile?: UserProfile | null): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  estimated: boolean;
} {
  const explicit = profile?.preferences;
  if (explicit?.calorieTarget) {
    const calories = explicit.calorieTarget;
    return {
      calories,
      proteinG: explicit.proteinTargetG ?? Math.round((calories * 0.3) / 4),
      carbsG: explicit.carbTargetG ?? Math.round((calories * 0.4) / 4),
      fatG: explicit.fatTargetG ?? Math.round((calories * 0.3) / 9),
      estimated: false,
    };
  }

  let calories = 2000;
  if (profile?.weightKg && profile?.heightCm && profile?.dateOfBirth) {
    const age = ageFromDob(profile.dateOfBirth);
    const s = profile.gender === "male" ? 5 : -161;
    const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age + s;
    const multiplier =
      ACTIVITY_MULTIPLIERS[profile.activityLevel ?? "light"] ?? 1.375;
    const adjustment = GOAL_CALORIE_ADJUSTMENT[profile.healthGoal ?? ""] ?? 0;
    calories = Math.max(1200, Math.round(bmr * multiplier + adjustment));
  }

  return {
    calories,
    proteinG: Math.round((calories * 0.3) / 4),
    carbsG: Math.round((calories * 0.4) / 4),
    fatG: Math.round((calories * 0.3) / 9),
    estimated: true,
  };
}

/** Merge API-provided targets with estimates so the UI always has numbers. */
export function resolveTargets(
  apiTargets: NutritionTargets | null | undefined,
  profile?: UserProfile | null
) {
  const estimate = estimateTargets(profile);
  return {
    calories: apiTargets?.calories ?? estimate.calories,
    proteinG: apiTargets?.proteinG ?? estimate.proteinG,
    carbsG: apiTargets?.carbsG ?? estimate.carbsG,
    fatG: apiTargets?.fatG ?? estimate.fatG,
    estimated: !apiTargets?.calories && estimate.estimated,
  };
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
