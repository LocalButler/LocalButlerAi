
import { ServiceType } from './types';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_MODEL_VISION = 'gemini-2.5-flash-preview-04-17'; // This model is multimodal

export const AVAILABLE_SERVICE_TYPES: ServiceType[] = [
  ServiceType.LAUNDRY,
  ServiceType.DRY_CLEANERS,
  ServiceType.FOOD_DELIVERY,
  ServiceType.GROCERY_DELIVERY,
  ServiceType.PET_WALKING,
  ServiceType.PET_SITTING,
  ServiceType.HOME_CLEANING,
  ServiceType.CAR_DETAILING,
  ServiceType.CAR_REPAIR,
  ServiceType.OTHER,
];

export const DIETARY_PREFERENCES_OPTIONS = [
  "None",
  "Low-carb",
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "High-protein",
  "Keto",
  "Paleo",
  "Nut-free",
  "Low-sodium",
];

export const COOKING_COMPLEXITY_OPTIONS = [
  "No Preference",
  "Quick & Easy (under 30 mins, few ingredients)",
  "Intermediate (average effort, some skill)",
  "Show me a Challenge (more complex, gourmet)",
];

export const FORT_MEADE_AREA_INFO = {
  center: { lat: 39.1001, lng: -76.7300 }, // Approximate center of Fort Meade
  surroundingAreas: ["Fort Meade", "Severn", "Odenton", "Hanover", "Jessup", "Laurel"],
  mapPlaceholderText: "Map integration to show service providers in the Fort Meade, MD area (including Severn, Odenton, Hanover, etc.) is planned for a future update. This would typically use a service like Google Maps API."
};
