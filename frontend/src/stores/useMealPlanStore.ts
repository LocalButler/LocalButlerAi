import { SavedMealPlan } from '../types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MealPlanStoreState {
  mealPlans: SavedMealPlan[];
  addMealPlan: (plan: SavedMealPlan) => void;
  removeMealPlan: (id: string) => void;
  updateMealPlan: (plan: SavedMealPlan) => void;
  rollbackMealPlans: (prev: SavedMealPlan[]) => void;
  setMealPlans: (plans: SavedMealPlan[]) => void;
}

export const useMealPlanStore = create<MealPlanStoreState>()(
  persist(
    (set) => ({
      mealPlans: [],
      addMealPlan: (plan: SavedMealPlan) => set((state) => ({ mealPlans: [plan, ...state.mealPlans] })),
      removeMealPlan: (id: string) => set((state) => ({ mealPlans: state.mealPlans.filter(p => p.id !== id) })),
      updateMealPlan: (plan: SavedMealPlan) => set((state) => ({ mealPlans: state.mealPlans.map(p => p.id === plan.id ? plan : p) })),
      rollbackMealPlans: (prev: SavedMealPlan[]) => set(() => ({ mealPlans: prev })),
      setMealPlans: (plans: SavedMealPlan[]) => set(() => ({ mealPlans: plans })),
    }),
    {
      name: 'meal-plans',
      partialize: (state) => ({ mealPlans: state.mealPlans }),
    }
  )
);

/**
 * Usage for optimistic update:
 * const prev = useMealPlanStore.getState().mealPlans;
 * useMealPlanStore.getState().addMealPlan(newPlan);
 * // On error: useMealPlanStore.getState().rollbackMealPlans(prev);
 */
