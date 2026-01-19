import React from 'react';

interface BoxProps {
  children: React.ReactNode;
  className?: string;
  thickBorder?: boolean;
}

export const Box: React.FC<BoxProps> = ({ children, className = '', thickBorder = true }) => {
  return (
    <div className={`bg-black text-white relative ${className}`}>
      {/* Borders - we use absolute divs to get that sharp pixel corner look if we wanted perfect 1:1, 
          but standard border with border-box is usually fine for web unless scaling is weird. 
          Let's use outline for sharp edges.
      */}
      <div 
        className="h-full w-full border-4 border-white"
        style={{ boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
};