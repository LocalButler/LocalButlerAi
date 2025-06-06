
export interface Meal {
  [mealType: string]: string; // e.g., "Breakfast": "Oatmeal with berries"
}

export interface DailyMealPlan {
  [day: string]: Meal; // e.g., "Day 1": { Breakfast: "...", Lunch: "...", Dinner: "..." }
}

export interface WeeklyMealPlan {
  [day: string]: {
    Breakfast?: string;
    Lunch?: string;
    Dinner?: string;
    Snacks?: string;
  };
}

export interface SavedMealPlan {
  id: string;
  dateSaved: string;
  plan: WeeklyMealPlan;
  preferences: string; // e.g., "Vegetarian" or custom preference string
  numDays: number;
  calories: number;
  title: string; // e.g., "7-Day Vegetarian Plan (2000 kcal)"
}


export interface GroceryItem {
  name: string;
  quantity?: string;
  id: string; // Added for unique identification
  have?: boolean; // To mark if user already has this item
}

export interface GroceryListCategory {
  [category: string]: GroceryItem[]; // e.g., "Produce": [{id: "1", name: "Apples", have: false}]
}


export interface FridgeAnalysisResult {
  identifiedItems: string[];
  mealIdeas: Array<{ name: string; description: string; ingredients?: string[] }>;
  missingEssentials: string[];
}

export enum ServiceType {
  LAUNDRY = "Laundry Pick Up / Drop Off",
  FOOD_DELIVERY = "Food Delivery",
  GROCERY_DELIVERY = "Grocery Delivery",
  PET_WALKING = "Pet Walking",
  PET_SITTING = "Pet Sitting",
  HOME_CLEANING = "Home Cleaning",
  CAR_DETAILING = "Car Detailing",
  CAR_REPAIR = "Car Repair Consultation",
  DRY_CLEANERS = "Dry Cleaners Pick Up / Drop Off",
  OTHER = "Other (Specify)",
}

export interface UserProfile {
  mainGoals?: string;
  dietaryRestrictions?: string;
  frequentServices?: string;
  travelPreferences?: string;
  butlerPersonaSummary?: string; // AI generated summary
  avoidIngredients?: string; // New: e.g., "cilantro, mushrooms, shellfish"
  cookingComplexity?: string; // New: e.g., "Quick & Easy", "Intermediate", "Show me a Challenge", "No Preference"
  favoriteCuisines?: string; // New: e.g., "Italian, Mexican, Thai"
}

export interface WithUserProfile {
  userProfile: UserProfile | null;
}

export enum TaskStatus {
  DRAFT = "Draft", 
  OPEN_FOR_OFFERS = "Open for Offers", 
  PENDING_APPROVAL = "Pending Approval", 
  ONGOING = "Ongoing",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export interface Task {
  id: string;
  title: string;
  description: string; 
  status: TaskStatus;
  createdAt: string;
  linkedContent?: string; 
  sourceSection?: string; 
  bounty?: number; 
  bid?: number; 
  agreedPrice?: number; 
  cancellationReason?: string; 
  taskerId?: string; 
  sourceRecipeId?: string; // For tasks generated from recipe book
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface KitchenInventoryItem {
  id: string;
  name: string;
  quantity: string; // e.g., "1 kg", "2 cans", "approx 250g"
}

export interface RecipeIngredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface YouTubeRecommendation {
  title: string;
  url: string;
  videoId?: string; // Extracted video ID for direct linking or embedding
}

export interface CookingTechniqueItem {
  techniqueName: string;
  description: string;
  youtubeRecommendations?: YouTubeRecommendation[];
}

export interface Recipe {
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: string[]; // Array of instruction steps
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  cookingTechniques?: CookingTechniqueItem[]; // Updated: Array of cooking technique objects
  youtubeRecommendations?: YouTubeRecommendation[]; // YouTube video recommendations for the overall dish
  imageUrl?: string; // Base64 encoded image URL, can be returned by AI
}

// For translating recipe ingredients to shopping list items
export interface RealisticShoppingListItem {
  originalItemName: string; // e.g., "Egg"
  originalQuantityInfo?: string; // e.g., "1/2 cup"
  realisticItemName: string; // e.g., "Eggs" or "All-Purpose Flour"
  realisticQuantity: string; // e.g., "1 dozen" or "1 bag (2 lbs)"
  notes?: string; // e.g., "Adjust based on brand"
  category?: string; // New: For grouping, e.g., "Produce", "Dairy"
  // For UI:
  id: string;
  have?: boolean;
  selected?: boolean;
}

export interface SavedRecipe extends Recipe {
  id: string; // Unique ID for the saved recipe
  notes?: string; // User's personal notes on the recipe
  source?: string; // e.g., "Copycat AI" or "User Added"
  dateSaved: string;
  // cookingTechniques is inherited and will be CookingTechniqueItem[]
  // imageUrl is inherited from Recipe and can be present here too
}
