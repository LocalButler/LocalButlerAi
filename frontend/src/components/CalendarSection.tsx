
import React from 'react';
import SectionContainer from './SectionContainer';
import { CalendarIcon } from './Icons';

const CalendarSection: React.FC = () => {
  return (
    <SectionContainer title="My Calendar" icon={<CalendarIcon className="w-8 h-8" />}>
      <div className="p-6 bg-white rounded-lg shadow animate-fadeIn">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Stay Organized with Your Butler AI Calendar</h3>
        <p className="text-neutral mb-3">
          This section is under development and will soon feature a calendar view to help you manage your scheduled meal plans, tasks, and other important events.
        </p>
        <p className="text-neutral mb-3">
          Imagine seeing your week at a glance, with all your Local Butler AI assisted plans neatly organized!
        </p>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold text-primary">Future Enhancements:</h4>
          <ul className="list-disc list-inside text-sm text-neutral mt-2 space-y-1">
            <li>Display generated meal plans on specific dates.</li>
            <li>Show due dates or scheduled times for your tasks.</li>
            <li>Potential integration with Google Calendar to sync events.</li>
            <li>Reminders and notifications for upcoming plans.</li>
          </ul>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Check back soon for updates!
        </p>
      </div>
    </SectionContainer>
  );
};

export default CalendarSection;
