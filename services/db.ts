import { UserProfile, DailyLog, MealLog, Goal, ActivityLevel, Gender } from '../types';
import { getCurrentUserEmail } from './auth';

const API_URL = 'http://localhost:3001/api';
const FB_PROFILES_KEY = 'befit_fb_profiles';
const FB_LOGS_KEY = 'befit_fb_logs';

// Helper to check if backend is down and run fallback
const tryApi = async <T>(apiCall: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return fallback();
    }
    throw error;
  }
};

// Seeder for Fallback Mode
const seedFallbackData = () => {
  if (localStorage.getItem('befit_seeded')) return;
  
  console.log("Seeding local fallback data...");
  const profiles = JSON.parse(localStorage.getItem(FB_PROFILES_KEY) || '{}');
  const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  const goals = [Goal.LoseWeight, Goal.Maintain, Goal.GainMuscle];
  const activities = [ActivityLevel.Sedentary, ActivityLevel.LightlyActive, ActivityLevel.ModeratelyActive, ActivityLevel.VeryActive];

  for (let i = 0; i < 100; i++) {
      const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fname} ${lname}`;
      const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@example.com`;
      
      profiles[email] = {
          name,
          age: 20 + Math.floor(Math.random() * 40),
          gender: Math.random() > 0.5 ? Gender.Male : Gender.Female,
          height: 160 + Math.floor(Math.random() * 30),
          weight: 60 + Math.floor(Math.random() * 40),
          goal: goals[Math.floor(Math.random() * 3)],
          activityLevel: activities[Math.floor(Math.random() * 4)],
          targetCalories: 2000 + Math.floor(Math.random() * 1000),
          targetProtein: 100 + Math.floor(Math.random() * 100),
          dietaryRestrictions: 'None'
      };
  }
  localStorage.setItem(FB_PROFILES_KEY, JSON.stringify(profiles));
  localStorage.setItem('befit_seeded', 'true');
};

export const saveUser = async (user: UserProfile): Promise<void> => {
  const email = getCurrentUserEmail();
  if (!email) return;

  return tryApi(
    async () => {
      await fetch(`${API_URL}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, profile: user })
      });
    },
    () => {
      const profiles = JSON.parse(localStorage.getItem(FB_PROFILES_KEY) || '{}');
      profiles[email] = user;
      localStorage.setItem(FB_PROFILES_KEY, JSON.stringify(profiles));
    }
  );
};

export const getUser = async (): Promise<UserProfile | null> => {
  const email = getCurrentUserEmail();
  if (!email) return null;

  return tryApi(
    async () => {
      const res = await fetch(`${API_URL}/user?email=${email}`);
      if (!res.ok) return null;
      return await res.json();
    },
    () => {
      seedFallbackData(); // Ensure we have random users
      const profiles = JSON.parse(localStorage.getItem(FB_PROFILES_KEY) || '{}');
      return profiles[email] || null;
    }
  );
};

export const saveLog = async (log: DailyLog): Promise<void> => {
  const email = getCurrentUserEmail();
  if (!email) return;

  return tryApi(
    async () => {
      await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, log })
      });
    },
    () => {
      const allLogs = JSON.parse(localStorage.getItem(FB_LOGS_KEY) || '{}');
      if (!allLogs[email]) allLogs[email] = {};
      allLogs[email][log.date] = log;
      localStorage.setItem(FB_LOGS_KEY, JSON.stringify(allLogs));
    }
  );
};

export const getTodayLog = async (): Promise<DailyLog> => {
  const email = getCurrentUserEmail();
  const today = new Date().toISOString().split('T')[0];
  
  if (!email) {
     return { date: today, meals: [] };
  }

  return tryApi(
    async () => {
      const res = await fetch(`${API_URL}/logs/today?email=${email}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    },
    () => {
      const allLogs = JSON.parse(localStorage.getItem(FB_LOGS_KEY) || '{}');
      return allLogs[email]?.[today] || { date: today, meals: [] };
    }
  );
};

export const addMealToToday = async (meal: MealLog): Promise<DailyLog> => {
  const currentLog = await getTodayLog();
  currentLog.meals.push(meal);
  await saveLog(currentLog);
  return currentLog;
};

export const clearData = (): void => {
  localStorage.removeItem('befit_session');
};