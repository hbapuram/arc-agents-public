/* meal-store.jsx — meals + macros + recipes
 * keys: arc-meals-v1, arc-recipes-v1
 * Loaded before tabs.jsx; registers helpers on window.
 */

// ── Nutrition mini-DB (per 100g unless noted) ────────────────────────────────
const NUTRITION_DB = {
  "rice":           { kcal: 130, protein: 2.7, carbs: 28,   fat: 0.3 },
  "basmati":        { kcal: 121, protein: 2.7, carbs: 26,   fat: 0.2 },
  "chicken breast": { kcal: 165, protein: 31,  carbs: 0,    fat: 3.6 },
  "chicken":        { kcal: 165, protein: 31,  carbs: 0,    fat: 3.6 },
  "eggs":           { kcal: 155, protein: 13,  carbs: 1.1,  fat: 11  },
  "egg":            { kcal: 155, protein: 13,  carbs: 1.1,  fat: 11  },
  "oats":           { kcal: 389, protein: 17,  carbs: 66,   fat: 7   },
  "lentils":        { kcal: 116, protein: 9,   carbs: 20,   fat: 0.4 },
  "dal":            { kcal: 116, protein: 9,   carbs: 20,   fat: 0.4 },
  "spinach":        { kcal: 23,  protein: 2.9, carbs: 3.6,  fat: 0.4 },
  "paneer":         { kcal: 265, protein: 18,  carbs: 3.4,  fat: 20  },
  "banana":         { kcal: 89,  protein: 1.1, carbs: 23,   fat: 0.3 },
  "greek yogurt":   { kcal: 59,  protein: 10,  carbs: 3.6,  fat: 0.4 },
  "yogurt":         { kcal: 59,  protein: 5,   carbs: 7,    fat: 0.4 },
  "kefir":          { kcal: 61,  protein: 3.4, carbs: 4.7,  fat: 3.5 },
  "almonds":        { kcal: 579, protein: 21,  carbs: 22,   fat: 50  },
  "blueberries":    { kcal: 57,  protein: 0.7, carbs: 14,   fat: 0.3 },
  "broccoli":       { kcal: 34,  protein: 2.8, carbs: 7,    fat: 0.4 },
  "salmon":         { kcal: 208, protein: 20,  carbs: 0,    fat: 13  },
  "olive oil":      { kcal: 884, protein: 0,   carbs: 0,    fat: 100 },
  "whole milk":     { kcal: 61,  protein: 3.2, carbs: 4.8,  fat: 3.3 },
  "milk":           { kcal: 61,  protein: 3.2, carbs: 4.8,  fat: 3.3 },
  "bread":          { kcal: 265, protein: 9,   carbs: 49,   fat: 3.2 },
  "potato":         { kcal: 77,  protein: 2,   carbs: 17,   fat: 0.1 },
  "tomato":         { kcal: 18,  protein: 0.9, carbs: 3.9,  fat: 0.2 },
  "onion":          { kcal: 40,  protein: 1.1, carbs: 9.3,  fat: 0.1 },
  "garlic":         { kcal: 149, protein: 6.4, carbs: 33,   fat: 0.5 },
  "tofu":           { kcal: 76,  protein: 8,   carbs: 1.9,  fat: 4.8 },
  "chickpeas":      { kcal: 164, protein: 8.9, carbs: 27,   fat: 2.6 },
  "quinoa":         { kcal: 120, protein: 4.4, carbs: 21,   fat: 1.9 },
};

// Unit-to-gram conversions for common units
const UNIT_TO_G = {
  "g": 1, "kg": 1000, "ml": 1, "L": 1000,
  "cup": 240, "tbsp": 15, "tsp": 5,
  "pieces": 100, "piece": 100,
};

// ── Macro helpers ─────────────────────────────────────────────────────────────

// Looks up nutrition for a named ingredient at given qty+unit.
// Returns { kcal, protein, carbs, fat } or null if unknown.
function lookupNutrition(name, qty, unit) {
  const key = (name || "").toLowerCase().trim();
  const entry = NUTRITION_DB[key];
  if (!entry) return null;
  const grams = (Number(qty) || 100) * (UNIT_TO_G[unit] || 100);
  const scale = grams / 100;
  return {
    kcal:    Math.round(entry.kcal    * scale * 10) / 10,
    protein: Math.round(entry.protein * scale * 10) / 10,
    carbs:   Math.round(entry.carbs   * scale * 10) / 10,
    fat:     Math.round(entry.fat     * scale * 10) / 10,
  };
}

// Sums macros across an ingredient array (each may have kcal/protein/carbs/fat).
function sumMacros(ingredients) {
  return (ingredients || []).reduce(
    (acc, ing) => ({
      kcal:    Math.round((acc.kcal    + (Number(ing.kcal)    || 0)) * 10) / 10,
      protein: Math.round((acc.protein + (Number(ing.protein) || 0)) * 10) / 10,
      carbs:   Math.round((acc.carbs   + (Number(ing.carbs)   || 0)) * 10) / 10,
      fat:     Math.round((acc.fat     + (Number(ing.fat)     || 0)) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ── Meals store ───────────────────────────────────────────────────────────────
const MEAL_STORE_KEY = "arc-meals-v1";

function loadMeals() {
  try {
    const raw = localStorage.getItem(MEAL_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return {
        meals: Array.isArray(o.meals) ? o.meals : [],
        goals: o.goals || { kcal: 2000, protein: 120 },
      };
    }
  } catch (e) { /* corrupt */ }
  return { meals: [], goals: { kcal: 2000, protein: 120 } };
}

function saveMeals(o) {
  try { localStorage.setItem(MEAL_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("mealschange"));
}

function addMeal(meal) {
  const o = loadMeals();
  o.meals.push({ ...meal, id: String(Date.now() + Math.random()) });
  saveMeals(o);
}

function updateMeal(id, edits) {
  const o = loadMeals();
  o.meals = o.meals.map(m => m.id === id ? { ...m, ...edits } : m);
  saveMeals(o);
}

function deleteMeal(id) {
  const o = loadMeals();
  o.meals = o.meals.filter(m => m.id !== id);
  saveMeals(o);
}

function getMealsForDate(dateKey) {
  return loadMeals().meals.filter(m => m.date === dateKey);
}

function getDailyMacros(dateKey) {
  const meals = getMealsForDate(dateKey);
  const allIngs = meals.flatMap(m => m.ingredients || []);
  return sumMacros(allIngs);
}

function setMacroGoals(goals) {
  const o = loadMeals();
  o.goals = { ...o.goals, ...goals };
  saveMeals(o);
}

// ── Dynamic macro goals (arc-macro-goals-v1) ─────────────────────────────────
const MACRO_GOALS_KEY = "arc-macro-goals-v1";

function getMacroGoals() {
  try { const raw = localStorage.getItem(MACRO_GOALS_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}

function saveMacroGoals(mg) {
  try { localStorage.setItem(MACRO_GOALS_KEY, JSON.stringify(mg)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("mealschange"));
}

function getDynamicTargets() {
  const mg = getMacroGoals();
  if (!mg || !mg.base) return loadMeals().goals;
  const base = { kcal: mg.base.kcal || 2000, protein: mg.base.protein || 120, carbs: mg.base.carbs || 0, fat: mg.base.fat || 0 };

  const phaseId = (() => {
    try { if (typeof deriveCycle === "function") { const c = deriveCycle(); return c ? c.id : null; } } catch(e) {}
    return null;
  })();
  if (phaseId && mg.phase_modifiers && mg.phase_modifiers[phaseId]) {
    const m = mg.phase_modifiers[phaseId];
    Object.keys(m).forEach(k => { if (base[k] != null) base[k] += m[k]; });
  }

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const workedOut = (() => {
    try { if (typeof loadWorkouts === "function") return (loadWorkouts().entries || []).some(w => w.date === today); } catch(e) {}
    return false;
  })();
  const dayMod = workedOut ? mg.workout_day : mg.rest_day;
  if (dayMod) Object.keys(dayMod).forEach(k => { if (base[k] != null) base[k] += dayMod[k]; });

  const fatigued = (() => {
    try {
      if (typeof getSymptomsForDate === "function") {
        const KEYWORDS = ["fatigue","cramps","headache","low energy","exhausted"];
        return (getSymptomsForDate(today) || []).some(s =>
          KEYWORDS.some(k => (s.symptom || "").toLowerCase().includes(k)) && s.severity >= 2
        );
      }
    } catch(e) {}
    return false;
  })();
  if (fatigued) base.kcal = Math.max(base.kcal, mg.base.kcal || 2000);

  return {
    kcal: Math.round(base.kcal),
    protein: Math.round(base.protein),
    ...(base.carbs > 0 ? { carbs: Math.round(base.carbs) } : {}),
    ...(base.fat > 0 ? { fat: Math.round(base.fat) } : {}),
  };
}

function useMealsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("mealschange", h);
    return () => window.removeEventListener("mealschange", h);
  }, []);
  return v;
}

// ── Recipes store ─────────────────────────────────────────────────────────────
const RECIPE_STORE_KEY = "arc-recipes-v1";

function loadRecipes() {
  try {
    const raw = localStorage.getItem(RECIPE_STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { recipes: Array.isArray(o.recipes) ? o.recipes : [] };
    }
  } catch (e) {}
  return { recipes: [] };
}

function saveRecipes(o) {
  try { localStorage.setItem(RECIPE_STORE_KEY, JSON.stringify(o)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("recipeschange"));
}

function addRecipe(recipe) {
  const o = loadRecipes();
  o.recipes.push({ ...recipe, id: String(Date.now() + Math.random()) });
  saveRecipes(o);
}

function updateRecipe(id, edits) {
  const o = loadRecipes();
  o.recipes = o.recipes.map(r => r.id === id ? { ...r, ...edits } : r);
  saveRecipes(o);
}

function deleteRecipe(id) {
  const o = loadRecipes();
  o.recipes = o.recipes.filter(r => r.id !== id);
  saveRecipes(o);
}

function getRecipes() { return loadRecipes().recipes; }
function getRecipe(id) { return loadRecipes().recipes.find(r => r.id === id); }

function useRecipesVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const h = () => setV(x => x + 1);
    window.addEventListener("recipeschange", h);
    return () => window.removeEventListener("recipeschange", h);
  }, []);
  return v;
}

Object.assign(window, {
  NUTRITION_DB,
  lookupNutrition, sumMacros,
  loadMeals, saveMeals, addMeal, updateMeal, deleteMeal,
  getMealsForDate, getDailyMacros, setMacroGoals, useMealsVersion,
  getMacroGoals, saveMacroGoals, getDynamicTargets,
  loadRecipes, saveRecipes, addRecipe, updateRecipe, deleteRecipe,
  getRecipes, getRecipe, useRecipesVersion,
});
