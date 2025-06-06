
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus } from '../types';
import SectionContainer from './SectionContainer';
import Modal from './Modal'; // Import the Modal component
import { ChecklistIcon, TrashIcon, SparklesIcon, PencilIcon, CheckIcon, XMarkIcon } from './Icons'; 

interface MyTasksSectionProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskItem: React.FC<{ 
    task: Task; 
    onUpdateTask: (updatedTask: Task) => void; 
    onDeleteTask: (taskId: string) => void; 
}> = ({ task, onUpdateTask, onDeleteTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description); // For drafts, this is the main content
  const [editBounty, setEditBounty] = useState(task.bounty?.toString() || '');

  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [showDeclineBidModal, setShowDeclineBidModal] = useState(false);
  const [declineBidReason, setDeclineBidReason] = useState('');


  useEffect(() => {
    if (isEditing) {
        setEditTitle(task.title);
        // For drafts, description is the main editable content (originally from AI or linkedContent)
        setEditDescription(task.description); 
        setEditBounty(task.bounty?.toString() || '');
    }
  }, [isEditing, task]);


  const handleStatusChange = (newStatus: TaskStatus, reason?: string) => {
    let updatedTask = { ...task, status: newStatus };
    if (reason) {
      updatedTask.cancellationReason = reason;
    }
    if (newStatus === TaskStatus.CANCELLED && !reason) {
        // Prompt for reason if not already provided
        setCancellationReason(''); // Clear previous reason
        setShowCancellationModal(true); 
        // The actual update will happen in handleCancellationSubmit
        return; 
    }
    onUpdateTask(updatedTask);
  };
  
  const handleCancellationSubmit = () => {
    onUpdateTask({ ...task, status: TaskStatus.CANCELLED, cancellationReason: cancellationReason });
    setShowCancellationModal(false);
    setCancellationReason('');
  };

  const handleEditSubmit = () => {
    const numericBounty = parseFloat(editBounty);
    onUpdateTask({ 
        ...task, 
        title: editTitle, 
        description: editDescription, // Save the edited description
        bounty: isNaN(numericBounty) ? undefined : numericBounty 
    });
    setIsEditing(false);
  };

  const handleAcceptBid = () => {
    onUpdateTask({ ...task, status: TaskStatus.ONGOING, agreedPrice: task.bid });
  };

  const handleDeclineBidSubmit = () => {
    // Option 1: Revert to OPEN_FOR_OFFERS
    // onUpdateTask({ ...task, status: TaskStatus.OPEN_FOR_OFFERS, bid: undefined, taskerId: undefined, cancellationReason: declineBidReason });
    // Option 2: Cancel the task entirely
    onUpdateTask({ ...task, status: TaskStatus.CANCELLED, cancellationReason: declineBidReason, bid: undefined });
    setShowDeclineBidModal(false);
    setDeclineBidReason('');
  };

  const handleDeleteWithConfirmation = (taskId: string) => {
    // `onDeleteTask` in App.tsx already includes window.confirm
    onDeleteTask(taskId);
  };


  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DRAFT: return 'bg-gray-400';
      case TaskStatus.OPEN_FOR_OFFERS: return 'bg-indigo-500';
      case TaskStatus.PENDING_APPROVAL: return 'bg-orange-500';
      case TaskStatus.ONGOING: return 'bg-yellow-500';
      case TaskStatus.COMPLETED: return 'bg-green-500';
      case TaskStatus.CANCELLED: return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };
  
  const sourceColor = (source?: string) => {
    switch (source) {
        case "Dietary": return "bg-blue-100 text-blue-700";
        case "Fridge": return "bg-emerald-100 text-emerald-700";
        case "Services": return "bg-amber-100 text-amber-700"; 
        case "Travel": return "bg-purple-100 text-purple-700";
        default: return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-base_300 hover:shadow-lg transition-shadow">
      {!isEditing ? (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                {task.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getStatusColor(task.status)}`}>
                    {task.status}
                </span>
                {task.sourceSection && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sourceColor(task.sourceSection)}`}>
                        {task.sourceSection}
                    </span>
                )}
                {task.status !== TaskStatus.PENDING_APPROVAL && task.bounty !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Suggested: ${task.bounty.toFixed(2)}
                    </span>
                )}
                 {task.status === TaskStatus.PENDING_APPROVAL && task.bid !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        Tasker Bid: ${task.bid.toFixed(2)}
                    </span>
                )}
                {task.status === TaskStatus.ONGOING && task.agreedPrice !== undefined && (
                     <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Agreed: ${task.agreedPrice.toFixed(2)}
                    </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Created: {new Date(task.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center space-x-1">
                {task.status === TaskStatus.DRAFT && (
                     <button 
                        onClick={() => setIsEditing(true)} 
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                        aria-label="Edit task draft"
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                )}
                <button 
                    onClick={() => handleDeleteWithConfirmation(task.id)} 
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete task"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{task.description}</p>
              {task.cancellationReason && <p className="text-xs text-red-500 italic mb-2">Cancellation Reason: {task.cancellationReason}</p>}
              {task.linkedContent && (
                <details className="text-xs text-gray-500 mb-3">
                    <summary className="cursor-pointer hover:underline">View Original Details/Linked Content</summary>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs max-h-40 overflow-auto">{task.linkedContent}</pre>
                </details>
              )}
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Actions:</span>
                {task.status === TaskStatus.DRAFT && (
                  <button onClick={() => handleStatusChange(TaskStatus.OPEN_FOR_OFFERS)} className="flex items-center px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors">
                    <SparklesIcon className="w-3 h-3 mr-1" /> Post to Marketplace
                  </button>
                )}
                {task.status === TaskStatus.PENDING_APPROVAL && (
                  <>
                    <button onClick={handleAcceptBid} className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors">Accept Bid</button>
                    <button onClick={() => setShowDeclineBidModal(true)} className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors">Decline Bid</button>
                  </>
                )}
                {task.status === TaskStatus.ONGOING && (
                  <>
                    <button onClick={() => handleStatusChange(TaskStatus.COMPLETED)} className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors">Mark Completed</button>
                    <button onClick={() => handleStatusChange(TaskStatus.CANCELLED)} className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors">Cancel Task</button>
                  </>
                )}
                {task.status === TaskStatus.COMPLETED && (
                  <>
                    <button onClick={() => handleStatusChange(TaskStatus.ONGOING)} className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors">Reopen (Set Ongoing)</button>
                    {task.sourceSection === "Services" && 
                        <button onClick={() => handleStatusChange(TaskStatus.DRAFT)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Move to Drafts</button>
                    }
                  </>
                )}
                {task.status === TaskStatus.CANCELLED && (
                  <>
                    <button onClick={() => handleStatusChange(TaskStatus.ONGOING)} className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors">Reopen (Set Ongoing)</button>
                    {task.sourceSection === "Services" && 
                        <button onClick={() => handleStatusChange(TaskStatus.DRAFT)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Move to Drafts</button>
                    }
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : ( // Editing Mode for DRAFT tasks
        <div className="space-y-3">
          <div>
            <label htmlFor={`edit-title-${task.id}`} className="block text-xs font-medium text-gray-600">Title</label>
            <input 
                type="text" 
                id={`edit-title-${task.id}`} 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 block w-full p-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor={`edit-desc-${task.id}`} className="block text-xs font-medium text-gray-600">Draft Content / Description</label>
            <textarea 
                id={`edit-desc-${task.id}`}
                rows={5}
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 block w-full p-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor={`edit-bounty-${task.id}`} className="block text-xs font-medium text-gray-600">Suggested Bounty ($)</label>
            <input 
                type="number" 
                id={`edit-bounty-${task.id}`}
                value={editBounty} 
                onChange={(e) => setEditBounty(e.target.value)}
                className="mt-1 block w-full p-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary"
                min="0"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Cancel</button>
            <button onClick={handleEditSubmit} className="px-3 py-1 text-xs font-medium text-white bg-primary hover:bg-blue-700 rounded-md transition-colors">Save Changes</button>
          </div>
        </div>
      )}
        <Modal 
            isOpen={showCancellationModal} 
            onClose={() => setShowCancellationModal(false)} 
            title="Reason for Cancellation"
            footer={<>
                <button onClick={() => setShowCancellationModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Back</button>
                <button onClick={handleCancellationSubmit} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Confirm Cancellation</button>
            </>}
        >
            <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700">Please provide a reason for cancelling this task:</label>
            <textarea
                id="cancellationReason"
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            />
        </Modal>
        <Modal 
            isOpen={showDeclineBidModal} 
            onClose={() => setShowDeclineBidModal(false)} 
            title="Reason for Declining Bid"
            footer={<>
                <button onClick={() => setShowDeclineBidModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Back</button>
                <button onClick={handleDeclineBidSubmit} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Confirm Decline</button>
            </>}
        >
            <label htmlFor="declineBidReason" className="block text-sm font-medium text-gray-700">Please provide a reason for declining this Tasker's bid:</label>
            <textarea
                id="declineBidReason"
                rows={3}
                value={declineBidReason}
                onChange={(e) => setDeclineBidReason(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-2">Note: Declining will cancel the task and you can choose to re-list it or keep it cancelled.</p>
        </Modal>
    </div>
  );
};


const MyTasksSection: React.FC<MyTasksSectionProps> = ({ tasks, onUpdateTask, onDeleteTask }) => {
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');

  const filteredTasks = useMemo(() => {
    if (activeTab === 'all') return tasks.filter(t => t.status !== TaskStatus.OPEN_FOR_OFFERS || t.sourceSection === "Services"); // Show OPEN_FOR_OFFERS if it was a user's draft posted to marketplace
    return tasks.filter(task => task.status === activeTab);
  }, [tasks, activeTab]);

  const tabs: { label: string; status: TaskStatus | 'all' }[] = [
    { label: `All My Tasks (${tasks.filter(t => t.status !== TaskStatus.OPEN_FOR_OFFERS || t.sourceSection === "Services").length})`, status: 'all' },
    { label: `My Drafts (${tasks.filter(t => t.status === TaskStatus.DRAFT).length})`, status: TaskStatus.DRAFT },
    { label: `Pending Approval (${tasks.filter(t => t.status === TaskStatus.PENDING_APPROVAL).length})`, status: TaskStatus.PENDING_APPROVAL },
    { label: `Ongoing (${tasks.filter(t => t.status === TaskStatus.ONGOING).length})`, status: TaskStatus.ONGOING },
    { label: `Completed (${tasks.filter(t => t.status === TaskStatus.COMPLETED).length})`, status: TaskStatus.COMPLETED },
    { label: `Cancelled (${tasks.filter(t => t.status === TaskStatus.CANCELLED).length})`, status: TaskStatus.CANCELLED },
  ];

  return (
    <SectionContainer title="My Tasks" icon={<ChecklistIcon className="w-8 h-8" />}>
      <p className="mb-6 text-neutral">
        Manage your personal tasks, service drafts, and tasks awaiting your approval from the marketplace.
      </p>

      <div className="mb-6 border-b border-gray-300">
        <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`whitespace-nowrap pb-3 px-1.5 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors
                ${activeTab === tab.status
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {filteredTasks.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          {activeTab === TaskStatus.DRAFT 
            ? "No service drafts. Create one in the 'Services' section!"
            : activeTab === TaskStatus.PENDING_APPROVAL
            ? "No tasks awaiting your approval. When a Tasker bids on your marketplace task, it will appear here."
            : "No tasks in this category."
          }
        </p>
      )}

      <div className="space-y-4">
        {filteredTasks.map(task => (
          <TaskItem key={task.id} task={task} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
        ))}
      </div>
    </SectionContainer>
  );
};

export default MyTasksSection;
