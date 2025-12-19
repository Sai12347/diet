import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Goal, MealLog } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Calculate Daily Targets based on specific user requirements
export const calculateTargets = async (user: UserProfile) => {
  // Protein Multipliers: Gain(1.5), Maintain(1), Lose(1.2)
  let proteinMultiplier = 1.0;
  if (user.goal === Goal.LoseWeight) proteinMultiplier = 1.2;
  if (user.goal === Goal.GainMuscle) proteinMultiplier = 1.5;

  const protein = Math.round(user.weight * proteinMultiplier);

  // Mifflin-St Jeor Equation for BMR
  let bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age;
  bmr += user.gender === 'Male' ? 5 : -161;
  
  // Activity Multipliers
  const activityMultipliers = {
    'Sedentary': 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725
  };
  
  let tdee = bmr * (activityMultipliers[user.activityLevel as keyof typeof activityMultipliers] || 1.2);
  
  // Goal Adjustment
  if (user.goal === Goal.LoseWeight) tdee -= 500;
  if (user.goal === Goal.GainMuscle) tdee += 300;

  return {
    calories: Math.round(tdee),
    protein: protein
  };
};

export const chatWithCoach = async (history: any[], message: string) => {
  const model = "gemini-2.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: "You are a helpful, encouraging diet coach named FitBot. Keep answers concise.",
      }
    });
    return response.text || "I'm having trouble thinking right now.";
  } catch (e) {
    console.error("Chat Error", e);
    return "I'm having trouble connecting right now.";
  }
};

export const getDietAdjustments = async (user: UserProfile, meals: MealLog[]) => {
  const model = "gemini-2.5-flash";
  const prompt = `
    User: ${user.name}, Goal: ${user.goal}, Target Cal: ${user.targetCalories}, Target Protein: ${user.targetProtein}g.
    Today's Meals: ${JSON.stringify(meals.map(m => ({ name: m.name, macros: m.macros })))}.
    
    Provide a JSON response with:
    1. missingMacros: What specific macro (Protein, Carbs, or Fat) they need more of in the next meal.
    2. suggestion: A specific food suggestion to hit that macro.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missingMacros: { type: Type.STRING },
            suggestion: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { missingMacros: "Nutrients", suggestion: "Balanced meal" };
  }
};

export const analyzeMealImageOrText = async (input: string, isImage: boolean) => {
  const model = "gemini-2.5-flash"; 
  const parts: any[] = [];
  
  if (isImage) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: input } });
    parts.push({ text: "Analyze this meal. Estimate name and macros." });
  } else {
    parts.push({ text: `Analyze this meal description: "${input}". Estimate macros.` });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            macros: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER }
              }
            },
            advice: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (e) {
    throw new Error("Analysis failed");
  }
};

// Meal Plan Schema with Recipes
const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    calories: { type: Type.NUMBER },
    protein: { type: Type.NUMBER },
    carbs: { type: Type.NUMBER },
    fat: { type: Type.NUMBER },
    ingredients: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of ingredients with quantities"
    },
    instructions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Step by step cooking instructions"
    }
  }
};

export const generateMealPlan = async (user: UserProfile) => {
  const model = "gemini-2.5-flash";
  
  // Calculate per-meal splits to prevent exceeding daily limits
  // Breakfast: 30%, Lunch: 35%, Dinner: 35%
  const bCal = Math.round(user.targetCalories * 0.3);
  const lCal = Math.round(user.targetCalories * 0.35);
  const dCal = Math.round(user.targetCalories * 0.35);

  const bPro = Math.round(user.targetProtein * 0.3);
  const lPro = Math.round(user.targetProtein * 0.35);
  const dPro = Math.round(user.targetProtein * 0.35);

  const prompt = `
    Create a daily meal plan with 3 distinct options for each meal time (Breakfast, Lunch, Dinner) for:
    Height: ${user.height}cm, Weight: ${user.weight}kg, Goal: ${user.goal}.
    Daily Total Targets: ${user.targetCalories} Calories, ${user.targetProtein}g Protein.
    Dietary Restrictions: ${user.dietaryRestrictions}.
    
    IMPORTANT: You must STRICTLY adhere to these per-meal macro targets so the total equals the daily goal:
    - Breakfast Options: Approx ${bCal} kcal and ${bPro}g protein.
    - Lunch Options: Approx ${lCal} kcal and ${lPro}g protein.
    - Dinner Options: Approx ${dCal} kcal and ${dPro}g protein.
    
    Ensure the recipes provided do not exceed these per-meal values significantly.
    For each meal category (breakfast, lunch, dinner), provide 3 different healthy recipe options that fit these specific per-meal macros.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.ARRAY, items: mealSchema },
            lunch: { type: Type.ARRAY, items: mealSchema },
            dinner: { type: Type.ARRAY, items: mealSchema }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const generateMealImage = async (mealName: string) => {
  const model = "gemini-2.5-flash-image";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: { 
        parts: [{ text: `A delicious, professional high-resolution food photography shot of ${mealName}. Appetizing, restaurant quality, cinematic lighting.` }] 
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image gen error", e);
    return null;
  }
};