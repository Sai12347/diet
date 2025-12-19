export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum Goal {
  LoseWeight = 'Lose Weight',
  Maintain = 'Maintain',
  GainMuscle = 'Gain Muscle'
}

export enum ActivityLevel {
  Sedentary = 'Sedentary',
  LightlyActive = 'Lightly Active',
  ModeratelyActive = 'Moderately Active',
  VeryActive = 'Very Active'
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  goal: Goal;
  activityLevel: ActivityLevel;
  targetCalories: number;
  targetProtein: number; // New field for daily protein target
  dietaryRestrictions: string;
}

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealLog {
  id: string;
  name: string;
  timestamp: number;
  macros: MacroNutrients;
  image?: string; // base64
  notes?: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: MealLog[];
  weight?: number;
}

export type ViewState = 'ONBOARDING' | 'DASHBOARD' | 'LOG_MEAL' | 'COACH' | 'SETTINGS' | 'LOGIN' | 'REGISTER';