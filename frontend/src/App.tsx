
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { HomeIcon, BriefcaseIcon, CogIcon, UserCircleIcon, ChecklistIcon, UsersIcon, AirplaneIcon, CalendarIcon, BuildingStorefrontIcon, ClipboardListIcon, CameraIcon, BookOpenIcon, PencilIcon } from './components/Icons'; // Added PencilIcon
import ServiceOrganizerSection from './components/ServiceOrganizerSection';
import SettingsSection from './components/SettingsSection';
import UserProfileSection from './components/UserProfileSection';
import TravelServicesSection from './components/TravelServicesSection';
import MyTasksSection from './components/MyTasksSection'; 
import MarketplaceSection from './components/MarketplaceSection';
import MyKitchenSection from './components/MyKitchenSection'; 
import CalendarSection from './components/CalendarSection'; 
import DietarySection from './components/DietarySection'; 
import JournalAndRecipesSection from './components/MealPlanJournalSection'; // CORRECTED IMPORT PATH
import ChatBubbleFixed from './components/ChatBubbleFixed'; // Fixed chat bubble component
import { UserProfile, Task, TaskStatus, KitchenInventoryItem, SavedMealPlan, Recipe, SavedRecipe, WeeklyMealPlan, CookingTechniqueItem } from './types';

const App: React.FC = () => {
  const location = useLocation();
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) {
      try {
        return JSON.parse(storedProfile);
      } catch (error) {
        console.error("Failed to parse user profile from localStorage:", error);
        return null;
      }
    }
    return null;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const storedTasks = localStorage.getItem('localButlerTasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) return parsedTasks;
      } catch (error) {
        console.error("Failed to parse tasks from localStorage:", error);
      }
    }
    return [];
  });

  const [kitchenInventory, setKitchenInventory] = useState<KitchenInventoryItem[]>(() => {
    const storedInventory = localStorage.getItem('kitchenInventory');
    if (storedInventory) {
      try {
        const parsedInventory = JSON.parse(storedInventory);
        if (Array.isArray(parsedInventory)) return parsedInventory;
      } catch (error) {
        console.error("Failed to parse kitchen inventory from localStorage:", error);
      }
    }
    return [];
  });

  const [savedMealPlans, setSavedMealPlans] = useState<SavedMealPlan[]>(() => {
    const storedMealPlans = localStorage.getItem('savedMealPlans');
    if (storedMealPlans) {
      try {
        const parsedPlans = JSON.parse(storedMealPlans);
        if (Array.isArray(parsedPlans)) return parsedPlans;
      } catch (error) {
        console.error("Failed to parse saved meal plans from localStorage:", error);
      }
    }
    return [];
  });

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => {
    const storedRecipes = localStorage.getItem('savedRecipes');
    if (storedRecipes) {
        try {
            const parsedRecipes = JSON.parse(storedRecipes);
            if (Array.isArray(parsedRecipes)) return parsedRecipes;
        } catch (error) {
            console.error("Failed to parse saved recipes from localStorage:", error);
        }
    }
    return [];
  });

  useEffect(() => {
    if (userProfile) {
      setUserLoggedIn(true);
    } else {
      setUserLoggedIn(false);
    }
  }, [userProfile]);
  
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('localButlerTasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('kitchenInventory', JSON.stringify(kitchenInventory));
  }, [kitchenInventory]);

  useEffect(() => {
    localStorage.setItem('savedMealPlans', JSON.stringify(savedMealPlans));
  }, [savedMealPlans]);

  useEffect(() => {
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  }, [savedRecipes]);


  const handleUpdateKitchenInventory = (updatedInventory: KitchenInventoryItem[]) => {
    setKitchenInventory(updatedInventory);
  };
  
  const handleProfileUpdate = (profile: UserProfile | null) => {
    setUserProfile(profile);
  };

  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt'> & { status?: TaskStatus }) => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: taskData.status || TaskStatus.ONGOING, 
      title: taskData.title,
      description: taskData.description,
      linkedContent: taskData.linkedContent,
      sourceSection: taskData.sourceSection,
      bounty: taskData.bounty,
      bid: undefined,
      agreedPrice: undefined,
      cancellationReason: undefined,
      taskerId: undefined,
      sourceRecipeId: taskData.sourceRecipeId,
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    alert("Task deleted."); 
  }, []);

  const updateSavedRecipesGlobal = (updatedRecipes: SavedRecipe[]) => {
    setSavedRecipes(updatedRecipes);
  };

  const saveRecipeToBook = (recipe: Recipe, source: string = "AI Generated") => {
    const newSavedRecipe: SavedRecipe = {
        ...recipe,
        id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
        dateSaved: new Date().toISOString(),
        source: source,
        // Ensure cookingTechniques is an array of CookingTechniqueItem, even if recipe.cookingTechniques is undefined
        cookingTechniques: recipe.cookingTechniques ? recipe.cookingTechniques.map(ct => ({
            techniqueName: ct.techniqueName,
            description: ct.description,
            youtubeRecommendations: ct.youtubeRecommendations || []
        })) : [],
        youtubeRecommendations: recipe.youtubeRecommendations || [],
    };
    setSavedRecipes(prev => [...prev, newSavedRecipe]);
    alert(`Recipe "${newSavedRecipe.name}" saved to your Journal & Recipes!`);
  };
  
  const deleteSavedRecipeFromBookGlobal = (recipeId: string) => {
    setSavedRecipes(prevRecipes => prevRecipes.filter(r => r.id !== recipeId));
    alert("Recipe deleted from your book."); 
  };

  const saveCurrentMealPlan = (
    plan: WeeklyMealPlan,
    details: { numDays: number; preferences: string; customPreference: string; calories: number }
  ) => {
    const title = `${details.numDays}-Day ${details.preferences === 'Other' && details.customPreference ? details.customPreference : details.preferences} Plan (${details.calories} kcal)`;
    const newSavedPlan: SavedMealPlan = {
      id: `mealplan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      dateSaved: new Date().toISOString(),
      plan: plan,
      preferences: details.preferences === 'Other' && details.customPreference ? details.customPreference : details.preferences,
      numDays: details.numDays,
      calories: details.calories,
      title: title,
    };
    setSavedMealPlans(prev => [...prev, newSavedPlan]);
    alert("Meal Plan saved to your Journal & Recipes!");
  };

  const deleteSavedMealPlan = (planId: string) => {
    setSavedMealPlans(prev => prev.filter(p => p.id !== planId));
    alert("Meal plan deleted from your journal.");
  };


  const navItems = [
    { path: '/', label: 'Dashboard', icon: <HomeIcon className="w-6 h-6" /> },
    { path: '/profile', label: 'My Profile', icon: <UserCircleIcon className="w-6 h-6" /> },
    { path: '/meal-planner', label: 'Meal Planner', icon: <PencilIcon className="w-6 h-6" /> }, 
    { path: '/journal-recipes', label: 'Journal & Recipes', icon: <ClipboardListIcon className="w-6 h-6" /> }, 
    { path: '/my-kitchen', label: 'My Kitchen', icon: <BuildingStorefrontIcon className="w-6 h-6" /> },
    { path: '/services', label: 'Services', icon: <BriefcaseIcon className="w-6 h-6" /> },
    { path: '/travel', label: 'Travel', icon: <AirplaneIcon className="w-6 h-6" /> },
    { path: '/my-tasks', label: 'My Tasks', icon: <ChecklistIcon className="w-6 h-6" /> }, 
    { path: '/marketplace', label: 'Marketplace', icon: <UsersIcon className="w-6 h-6" /> },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-20 bg-primary text-white p-3 flex flex-col fixed top-0 left-0 h-full z-40 shadow-lg items-center">
        <Link to="/" className="text-xl font-bold text-white hover:text-amber-300 transition-colors mb-8 mt-2 block text-center" title="Local Butler AI">
          LB AI
        </Link>
        <nav className="flex flex-col space-y-2 w-full items-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`p-3 rounded-lg flex items-center justify-center transition-all duration-150 ease-in-out w-14 h-14
                ${(location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)))
                  ? 'bg-white text-primary shadow-md' 
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              title={item.label}
            >
              {item.icon}
            </Link>
          ))}
        </nav>
        <Link
            key="/settings"
            to="/settings"
            className={`p-3 rounded-lg flex items-center justify-center transition-all duration-150 ease-in-out w-14 h-14 mt-auto mb-2
              ${location.pathname === "/settings"
                ? 'bg-white text-primary shadow-md' 
                : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            title="Settings"
          >
            <CogIcon className="w-6 h-6" />
          </Link>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-20 bg-gradient-to-br from-base_200 via-base_100 to-blue-100 text-gray-800">
        <main className="p-4 md:p-8 overflow-y-auto h-screen">
          <Routes>
            <Route path="/" element={<Dashboard 
              userLoggedIn={userLoggedIn} 
              profileComplete={!!userProfile?.mainGoals} 
              myDraftsCount={tasks.filter(t => t.status === TaskStatus.DRAFT).length}
              myOngoingTasksCount={tasks.filter(t => t.status === TaskStatus.ONGOING).length}
              myPendingApprovalCount={tasks.filter(t => t.status === TaskStatus.PENDING_APPROVAL).length}
              openMarketplaceTasksCount={tasks.filter(t => t.status === TaskStatus.OPEN_FOR_OFFERS).length} 
              />} 
            />
            <Route path="/profile" element={<UserProfileSection userProfile={userProfile} onProfileUpdate={handleProfileUpdate} onLoginChange={setUserLoggedIn} />} />
            <Route 
              path="/meal-planner"
              element={
                <DietarySection
                  userProfile={userProfile}
                  onAddTask={addTask}
                  kitchenInventory={kitchenInventory}
                  onUpdateKitchenInventory={handleUpdateKitchenInventory}
                  onSaveRecipeToBook={saveRecipeToBook} 
                  onSaveCurrentMealPlan={saveCurrentMealPlan} 
                />
              }
            />
            <Route
              path="/journal-recipes" 
              element={
                <JournalAndRecipesSection 
                  userProfile={userProfile} 
                  savedMealPlans={savedMealPlans}
                  onDeleteSavedMealPlan={deleteSavedMealPlan}
                  savedRecipes={savedRecipes}
                  onUpdateSavedRecipes={updateSavedRecipesGlobal}
                  onDeleteSavedRecipe={deleteSavedRecipeFromBookGlobal}
                  // Props for shopping list feature for saved recipes
                  onAddTask={addTask} 
                  kitchenInventory={kitchenInventory} 
                />
              }
            />
            <Route 
              path="/my-kitchen/*" 
              element={
                <MyKitchenSection 
                  userProfile={userProfile} 
                  onAddTask={addTask} 
                  kitchenInventoryGlobal={kitchenInventory} 
                  onUpdateKitchenInventoryGlobal={handleUpdateKitchenInventory}
                />
              } 
            />
            <Route path="/services" element={<ServiceOrganizerSection userProfile={userProfile} onAddTask={addTask} />} />
            <Route path="/travel" element={<TravelServicesSection userProfile={userProfile} onAddTask={addTask} />} />
            <Route path="/my-tasks" element={<MyTasksSection tasks={tasks} onUpdateTask={updateTask} onDeleteTask={deleteTask} />} />
            <Route path="/marketplace" element={<MarketplaceSection tasks={tasks} onUpdateTask={updateTask} />} />
            <Route path="/calendar" element={<CalendarSection />} />
            <Route path="/settings" element={<SettingsSection />} />
          </Routes>
          <footer className="bg-gray-700 text-base_100 py-4 text-center text-xs mt-12 rounded-md">
            <p className="opacity-80">Local Butler AI: Connecting local needs with local helpers. For a true multi-user marketplace, Auth0 & backend are recommended.</p>
            <p>&copy; {new Date().getFullYear()} Local Butler AI. All rights reserved.</p>
            <p className="mt-1 opacity-80">Powered by Gemini API</p>
          </footer> {/* Correctly close the footer tag */}
          <ChatBubbleFixed /> {/* Fixed chat bubble component */}
        </main>
      </div>
    </div>
  );
};


interface DashboardProps {
  userLoggedIn: boolean;
  profileComplete: boolean;
  myDraftsCount: number;
  myOngoingTasksCount: number;
  myPendingApprovalCount: number;
  openMarketplaceTasksCount: number;
}

const Dashboard: React.FC<DashboardProps> = ({ userLoggedIn, profileComplete, myDraftsCount, myOngoingTasksCount, myPendingApprovalCount, openMarketplaceTasksCount }) => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-700 mb-6">Welcome to Your Local Butler AI</h1>
      <p className="text-lg text-neutral mb-10 max-w-2xl mx-auto">
        Manage your home, discover local services, and even offer tasks to your community. Let's make your day more productive and connected!
      </p>

      {!userLoggedIn && (
        <div className="mb-8 p-4 bg-blue-100 border-l-4 border-primary text-primary-700 rounded-md shadow-lg animate-fadeIn">
            <p className="font-bold text-lg">Get Started with Local Butler AI!</p>
            <p className="mb-3">To personalize your experience and unlock the full potential of your AI assistant, please set up your profile.</p>
            <Link 
              to="/profile" 
              className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Set Up My Profile
            </Link>
            <p className="text-xs mt-3 text-gray-600">Note: This app currently uses local storage for profile data. For persistent accounts, Auth0 integration would be required.</p>
          </div>
      )}
      {userLoggedIn && !profileComplete && (
          <div className="mb-8 p-4 bg-amber-100 border-l-4 border-accent text-amber-700 rounded-md shadow-lg animate-fadeIn">
            <p className="font-bold text-lg">Complete Your Profile!</p>
            <p className="mb-3">Help your Local Butler understand you better by completing your profile. This will enable more personalized assistance and better task matching in the future.</p>
            <Link 
              to="/profile" 
              className="inline-block bg-accent text-white px-6 py-2 rounded-md hover:bg-amber-600 transition-colors"
            >
              Go to My Profile
            </Link>
          </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <DashboardCard
          title="My Profile"
          description="Personalize your Local Butler and set preferences."
          linkTo="/profile"
          icon={<UserCircleIcon className="w-12 h-12 mx-auto mb-4 text-primary" />}
        />
        <DashboardCard
          title="Meal Planner"
          description="AI meal plans and copycat recipes." 
          linkTo="/meal-planner"
          icon={<PencilIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />}
        />
         <DashboardCard
          title="Journal & Recipes" 
          description="Review your saved meal plans and recipes." 
          linkTo="/journal-recipes" 
          icon={<ClipboardListIcon className="w-12 h-12 mx-auto mb-4 text-teal-500" />}
        />
        <DashboardCard
          title="Fridge Analyzer"
          description="Get meal ideas by uploading a photo of your fridge."
          linkTo="/my-kitchen/fridge-analysis" 
          icon={<CameraIcon className="w-12 h-12 mx-auto mb-4 text-cyan-500" />}
        />
        <DashboardCard
          title="Kitchen Inventory"
          description="Track your pantry items and get AI stocking suggestions."
          linkTo="/my-kitchen/inventory" 
          icon={<ChecklistIcon className="w-12 h-12 mx-auto mb-4 text-lime-500" />}
        />
        <DashboardCard
          title="Create Service Draft"
          description="Need help? Draft a service request for the marketplace."
          linkTo="/services"
          icon={<BriefcaseIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />}
        />
        <DashboardCard
          title="Travel Concierge"
          description="Plan trips and get AI assistance for travel arrangements."
          linkTo="/travel"
          icon={<AirplaneIcon className="w-12 h-12 mx-auto mb-4 text-purple-500" />}
        />
        <DashboardCard
          title="My Tasks"
          description={`Manage your tasks. Drafts: ${myDraftsCount}, Pending: ${myPendingApprovalCount}, Ongoing: ${myOngoingTasksCount}.`}
          linkTo="/my-tasks"
          icon={<ChecklistIcon className="w-12 h-12 mx-auto mb-4 text-teal-500" />}
        />
        <DashboardCard
          title="Local Marketplace"
          description={`Browse tasks. ${openMarketplaceTasksCount} tasks open for offers.`}
          linkTo="/marketplace"
          icon={<UsersIcon className="w-12 h-12 mx-auto mb-4 text-indigo-500" />}
        />
          <DashboardCard
          title="Calendar View"
          description="View your scheduled plans and tasks (Future Feature)."
          linkTo="/calendar"
          icon={<CalendarIcon className="w-12 h-12 mx-auto mb-4 text-pink-500" />}
        />
        <DashboardCard
          title="Settings"
          description="Check API key status and application settings."
          linkTo="/settings"
          icon={<CogIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />}
        />
      </div>
      {!process.env.API_KEY && (
          <div className="mt-12 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
            <p className="font-bold">API Key Not Configured</p>
            <p>The Gemini API key is not set. AI features will not be available. Please set the <code>API_KEY</code> environment variable.</p>
          </div>
        )}
    </div>
  );
};

interface DashboardCardProps {
  title: string;
  description: string;
  linkTo: string;
  icon: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, linkTo, icon }) => {
  return (
    <Link to={linkTo} className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out">
      {icon}
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-neutral text-sm">{description}</p>
    </Link>
  );
};


export default App;
