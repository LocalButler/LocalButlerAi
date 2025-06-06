
import React from 'react';

const LoadingSpinner: React.FC<{ size?: string }> = ({ size = "w-8 h-8" }) => {
  return (
    <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 border-primary`}></div>
  );
};

export default LoadingSpinner;
