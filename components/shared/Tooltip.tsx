
/**
 * @file Tooltip Component (Tooltip.tsx)
 * @description A simple, reusable component that displays a small informational pop-up
 * (a "tooltip") when the user hovers their mouse over its child element. It is
 * implemented purely with CSS for positioning and React state for visibility.
 */

import React, { useState, ReactNode } from 'react';

/**
 * Props for the Tooltip component.
 */
interface TooltipProps {
  /** The content to be displayed inside the tooltip bubble. Can be a string or any React node. */
  content: ReactNode;
  /** The element that triggers the tooltip on hover. */
  children: ReactNode;
  /** The position of the tooltip relative to its child. Defaults to 'top'. */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A component that wraps its children with a hover-activated tooltip.
 *
 * @param {TooltipProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered children with tooltip functionality.
 */
const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  // State to control whether the tooltip is currently visible.
  const [isVisible, setIsVisible] = useState(false);

  // Maps the `position` prop to the correct Tailwind CSS classes for the main tooltip bubble.
  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };
  
  // Maps the `position` prop to the correct Tailwind CSS classes for the tooltip's arrow.
  const arrowClasses = {
    top: 'left-1/2 -translate-x-1/2 top-full border-x-8 border-x-transparent border-t-8 border-t-gray-800',
    bottom: 'left-1/2 -translate-x-1/2 bottom-full border-x-8 border-x-transparent border-b-8 border-b-gray-800',
    left: 'top-1/2 -translate-y-1/2 left-full border-y-8 border-y-transparent border-l-8 border-l-gray-800',
    right: 'top-1/2 -translate-y-1/2 right-full border-y-8 border-y-transparent border-r-8 border-r-gray-800',
  };

  return (
    // Wrapper div to handle mouse enter and leave events.
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {/* The trigger element */}
      {children}
      
      {/* The tooltip bubble, rendered conditionally based on `isVisible` state. */}
      {isVisible && (
        <div
          className={`absolute min-w-[120px] max-w-xs w-max p-3 bg-gray-800 text-white text-sm rounded-md shadow-xl z-50 whitespace-normal text-center ${positionClasses[position]}`}
          role="tooltip"
        >
          {content}
          {/* A small CSS-based triangle (arrow) pointing to the trigger element. */}
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
