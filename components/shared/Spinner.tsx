/**
 * @file Spinner Loading Indicator Component (Spinner.tsx)
 * @description A simple, reusable SVG-based loading spinner component. It's used to
 * indicate that an asynchronous operation (like an API call or file processing)
 * is in progress. The component is styled with Tailwind CSS and uses a CSS animation for rotation.
 */
import React from 'react';

/**
 * Props for the Spinner component.
 */
interface SpinnerProps {
  /**
   * The size of the spinner.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional CSS class names to apply to the spinner.
   */
  className?: string;
}

/**
 * A simple animated spinner component to indicate loading states.
 *
 * @param {SpinnerProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered SVG spinner element.
 */
const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  // A map to convert the size prop to its corresponding Tailwind CSS classes.
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex justify-center items-center" role="status" aria-label="Loading">
      <svg
        className={`animate-spin text-primary ${sizeClasses[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        {/* The faint background circle */}
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        {/* The visible, spinning arc */}
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

export default Spinner;