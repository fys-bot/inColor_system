/**
 * @file Image Preview Context (ImagePreviewContext.tsx)
 * @description This file creates and exports a React Context for managing a global,
 * full-screen image preview modal. This allows any component in the application to
 * easily trigger the preview modal for an image URL without needing to manage modal
 * state locally.
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';

/**
 * Defines the shape of the data provided by the ImagePreviewContext.
 */
interface ImagePreviewContextType {
  /** Indicates whether the preview modal is currently open. */
  isOpen: boolean;
  /** The URL of the image currently being previewed. */
  imageUrl: string | null;
  /** A function to open the modal and display an image. */
  showPreview: (url: string) => void;
  /** A function to close the modal. */
  hidePreview: () => void;
}

// Create the context with an initial value of undefined.
const ImagePreviewContext = createContext<ImagePreviewContextType | undefined>(undefined);

/**
 * The provider component for the Image Preview context.
 * It should wrap the part of the component tree that needs access to the image preview functionality.
 * Typically, this is placed near the root of the application.
 *
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components that will have access to this context.
 * @returns {React.ReactElement} The provider component.
 */
export const ImagePreviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to manage the modal's visibility.
  const [isOpen, setIsOpen] = useState(false);
  // State to store the URL of the image to be displayed.
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  /**
   * Opens the preview modal and sets the image URL to be displayed.
   * @param {string} url - The URL of the image to show.
   */
  const showPreview = (url: string) => {
    setImageUrl(url);
    setIsOpen(true);
  };

  /**
   * Closes the preview modal and clears the image URL.
   */
  const hidePreview = () => {
    setIsOpen(false);
    setImageUrl(null);
  };

  // The value object provided to consuming components.
  const contextValue = { isOpen, imageUrl, showPreview, hidePreview };

  return (
    <ImagePreviewContext.Provider value={contextValue}>
      {children}
    </ImagePreviewContext.Provider>
  );
};

/**
 * A custom hook for easily accessing the Image Preview context.
 * This hook simplifies the process of using the context in functional components.
 * It also provides a runtime check to ensure it's used within an ImagePreviewProvider.
 *
 * @example
 * const { showPreview } = useImagePreview();
 * return <button onClick={() => showPreview('image.jpg')}>Preview</button>;
 *
 * @returns {ImagePreviewContextType} The context value.
 * @throws {Error} If used outside of an ImagePreviewProvider.
 */
export const useImagePreview = () => {
  const context = useContext(ImagePreviewContext);
  if (context === undefined) {
    throw new Error('useImagePreview must be used within an ImagePreviewProvider');
  }
  return context;
};
