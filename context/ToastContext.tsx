/**
 * @file Toast Notification Context (ToastContext.tsx)
 * @description This file creates a global system for displaying "toast" notifications
 * (small, non-intrusive pop-up messages). It allows any component to trigger a
 * success, error, or info message without managing the UI state itself.
 */
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

/** The type of toast message to display. */
type ToastType = 'success' | 'error' | 'info';

/**
 * Represents a single toast message object.
 */
interface ToastMessage {
  /** A unique identifier for the toast, typically a timestamp. */
  id: number;
  /** The message content to be displayed. */
  message: string;
  /** The type of the toast, which determines its color and icon. */
  type: ToastType;
}

/**
 * Defines the shape of the data provided by the ToastContext.
 */
interface ToastContextType {
  /**
   * A function to display a new toast message.
   * @param {string} message - The text to display in the toast.
   * @param {ToastType} [type='success'] - The type of toast to show.
   */
  showToast: (message: string, type?: ToastType) => void;
}

// Create the context with an initial value of undefined.
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// A map of toast types to their corresponding icon components.
const ToastIcons = {
  success: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  error: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  info: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

// A map of toast types to their corresponding background color CSS classes.
const ToastBgClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
};

/**
 * The provider component for the Toast context.
 * It handles the state for active toasts and renders them in a fixed position.
 * This should wrap the entire application to make toasts globally available.
 *
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components that will have access to this context.
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to hold the list of currently active toast messages.
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Removes a toast from the list by its ID.
   * Wrapped in useCallback for performance optimization.
   */
  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  /**
   * Adds a new toast to the list and sets a timer to automatically remove it.
   * Wrapped in useCallback to ensure the function reference is stable.
   */
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    
    // Automatically remove the toast after 4 seconds.
    const timer = setTimeout(() => {
      removeToast(id);
    }, 4000);
    
    // Cleanup function to clear the timer if the component unmounts.
    return () => clearTimeout(timer);
  }, [removeToast]);

  const contextValue = { showToast };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Container for rendering all active toast notifications. */}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {toasts.map(toast => (
           <div key={toast.id} className={`flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow-lg`}>
                <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${ToastBgClasses[toast.type]}`}>
                    {ToastIcons[toast.type]}
                </div>
                <div className="ml-3 text-sm font-normal text-gray-800">{toast.message}</div>
                <button onClick={() => removeToast(toast.id)} type="button" className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8" aria-label="Close">
                    <span className="sr-only">Close</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
           </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * A custom hook for easily accessing the Toast context.
 * This simplifies showing toasts from any functional component.
 *
 * @example
 * const { showToast } = useToast();
 * return <button onClick={() => showToast('Operation successful!', 'success')}>Save</button>;
 *
 * @returns {ToastContextType} The context value containing the showToast function.
 * @throws {Error} If used outside of a ToastProvider.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
