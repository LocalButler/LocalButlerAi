
import React from 'react';

interface SectionContainerProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const SectionContainer: React.FC<SectionContainerProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl mb-8 animate-fadeIn">
      <div className="flex items-center mb-6">
        {icon && <div className="mr-3 text-primary">{icon}</div>}
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-700">{title}</h2>
      </div>
      {children}
    </div>
  );
};

export default SectionContainer;
