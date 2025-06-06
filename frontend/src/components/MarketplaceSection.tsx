
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import SectionContainer from './SectionContainer';
import Modal from './Modal'; // Import Modal
import { UsersIcon } from './Icons';

interface MarketplaceSectionProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
}

const MarketplaceTaskItem: React.FC<{ task: Task; onUpdateTask: (updatedTask: Task) => void; }> = ({ task, onUpdateTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [taskerBid, setTaskerBid] = useState<string>('');

  const handleAcceptTaskAndBid = () => {
    const bidAmount = parseFloat(taskerBid);
    if (isNaN(bidAmount) || bidAmount <= 0) {
        alert("Please enter a valid bid amount.");
        return;
    }
    onUpdateTask({ 
        ...task, 
        status: TaskStatus.PENDING_APPROVAL, 
        bid: bidAmount,
        taskerId: "simulated_tasker_id" // In a real app, this would be the logged-in tasker's ID
    });
    setShowBidModal(false);
    setTaskerBid('');
    alert(`Your bid of $${bidAmount.toFixed(2)} for "${task.title}" has been submitted. The requester will review it.`);
  };
  
  const sourceColor = (source?: string) => {
    if (source === "Services") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  }

  return (
    <>
    <div className="bg-white p-4 rounded-lg shadow-md border border-base_300 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            {task.title.replace('DRAFT: ', 'SERVICE: ')}
          </h3>
           <div className="flex items-center space-x-2 mt-1 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white bg-indigo-500`}>
                {task.status}
            </span>
            {task.sourceSection && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sourceColor(task.sourceSection)}`}>
                    {task.sourceSection}
                </span>
            )}
            {task.bounty !== undefined && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    Requester Suggests: ${task.bounty.toFixed(2)}
                </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Posted: {new Date(task.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{task.description}</p>
          {task.linkedContent && (
            <details className="text-xs text-gray-500 mb-3">
                <summary className="cursor-pointer hover:underline">View Original Details</summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs max-h-40 overflow-auto">{task.linkedContent}</pre>
            </details>
          )}
          <div className="mt-2">
            <button 
                onClick={() => setShowBidModal(true)} 
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-secondary hover:bg-emerald-700 rounded-md transition-colors"
            >
                Accept & Place Bid
            </button>
          </div>
        </div>
      )}
    </div>
    <Modal
        isOpen={showBidModal}
        onClose={() => { setShowBidModal(false); setTaskerBid(''); }}
        title={`Place Bid for: ${task.title}`}
        footer={<>
            <button onClick={() => { setShowBidModal(false); setTaskerBid(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
            <button onClick={handleAcceptTaskAndBid} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-md">Submit Bid</button>
        </>}
    >
        <p className="mb-2">Requester's suggested bounty for this task is: <strong>${task.bounty ? task.bounty.toFixed(2) : 'Not specified'}</strong>.</p>
        <p className="mb-4">Please enter your bid (cost) to complete this task. The requester will then approve or decline your bid.</p>
        <label htmlFor="taskerBid" className="block text-sm font-medium text-gray-700">Your Bid Amount (USD)</label>
        <input
            type="number"
            id="taskerBid"
            value={taskerBid}
            onChange={(e) => setTaskerBid(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            placeholder="e.g., 30.00"
            min="0.01"
            step="0.01"
        />
    </Modal>
    </>
  );
};

const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({ tasks, onUpdateTask }) => {
  const openTasks = useMemo(() => {
    return tasks.filter(task => task.status === TaskStatus.OPEN_FOR_OFFERS);
  }, [tasks]);

  return (
    <SectionContainer title="Local Task Marketplace" icon={<UsersIcon className="w-8 h-8" />}>
      <p className="mb-6 text-neutral">
        Browse tasks posted by your local community. Click a task to see details, then accept it and place your bid if you can help!
      </p>

      {openTasks.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No tasks are currently open on the marketplace. Check back later or encourage others to post tasks!
        </p>
      )}

      <div className="space-y-4">
        {openTasks.map(task => (
          <MarketplaceTaskItem key={task.id} task={task} onUpdateTask={onUpdateTask} />
        ))}
      </div>
       <p className="mt-8 text-sm text-neutral">
        Local Butler AI helps connect local people for local tasks. As a "Tasker", you can find opportunities here.
        Your bid will be sent to the requester for approval.
      </p>
    </SectionContainer>
  );
};

export default MarketplaceSection;