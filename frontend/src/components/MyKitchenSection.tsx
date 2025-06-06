

import React from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
// DietarySection is no longer imported here as it's a top-level route
import FridgeAnalyzerSection from './FridgeAnalyzerSection';
import KitchenInventorySubSection from './KitchenInventorySubSection';
// RecipeBookSubSection is removed as its functionality is moved
import SectionContainer from './SectionContainer';
import { UserProfile, Task, TaskStatus, KitchenInventoryItem } from '../types'; // Removed SavedRecipe
import { BuildingStorefrontIcon, CameraIcon, BookOpenIcon, ChecklistIcon as KitchenChecklistIcon } from './Icons'; 

interface MyKitchenSectionProps {
  userProfile: UserProfile | null;
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { status?: TaskStatus }) => void;
  kitchenInventoryGlobal: KitchenInventoryItem[];
  onUpdateKitchenInventoryGlobal: (inventory: KitchenInventoryItem[]) => void;
  // Recipe related props are removed
}

const MyKitchenSection: React.FC<MyKitchenSectionProps> = ({
    userProfile,
    onAddTask,
    kitchenInventoryGlobal,
    onUpdateKitchenInventoryGlobal,
}) => {

  return (
    <SectionContainer title="My Kitchen Hub" icon={<BuildingStorefrontIcon className="w-8 h-8" />}>
      <p className="mb-6 text-neutral">
        Your central place for fridge analysis and inventory management. Plan your meals and manage your recipes using the main "Meal Planner" section.
      </p>
      
      {/* Render all sub-sections directly */}
      <div className="mb-8">
        <FridgeAnalyzerSection
            userProfile={userProfile}
            onAddTask={onAddTask}
            kitchenInventory={kitchenInventoryGlobal}
            onUpdateKitchenInventory={onUpdateKitchenInventoryGlobal}
        />
      </div>

      <div className="my-8 border-t border-gray-300 pt-8">
        <KitchenInventorySubSection
            userProfile={userProfile}
            inventory={kitchenInventoryGlobal}
            onUpdateInventory={onUpdateKitchenInventoryGlobal}
        />
      </div>

      {/* RecipeBookSubSection rendering is removed */}
      
    </SectionContainer>
  );
};

export default MyKitchenSection;
