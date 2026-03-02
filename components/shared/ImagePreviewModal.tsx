/**
 * @file Full-Screen Image Preview Modal Component (ImagePreviewModal.tsx)
 * @description This component provides a global, full-screen modal for viewing images.
 * It allows users to interact with the image by zooming in/out and panning (dragging)
 * when zoomed in. It connects to the global `ImagePreviewContext` to know when to
 * display and which image to show.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImagePreview } from '../../context/ImagePreviewContext';
import { CloseIcon, PlusIcon, MinusIcon, RefreshCwIcon } from './Icons';

/**
 * A modal component for a full-screen, interactive image preview.
 */
const ImagePreviewModal: React.FC = () => {
  // Get state and control functions from the global context.
  const { isOpen, imageUrl, hidePreview } = useImagePreview();
  
  // State for image transformations
  const [scale, setScale] = useState(1); // Current zoom level
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Current pan position (x, y offset)
  
  // State for drag-to-pan functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Mouse position at the start of a drag
  
  // Ref to the container element for position calculations.
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Resets the zoom and pan to their default state.
   * Wrapped in useCallback to prevent re-creation on every render.
   */
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Effect to handle keyboard events (e.g., 'Escape' to close).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hidePreview();
      }
    };
    if (isOpen) {
      handleReset(); // Reset view every time a new image is opened.
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hidePreview, handleReset]);

  /**
   * Handles the core zooming logic.
   * @param {'in' | 'out'} direction - The direction to zoom.
   * @param {number} [clientX] - The mouse's X coordinate, for zoom-to-cursor.
   * @param {number} [clientY] - The mouse's Y coordinate, for zoom-to-cursor.
   */
  const handleZoom = (direction: 'in' | 'out', clientX?: number, clientY?: number) => {
    const scaleFactor = 1.2;
    const newScale = direction === 'in' ? scale * scaleFactor : scale / scaleFactor;
    // Clamp the scale between a min and max value.
    const clampedScale = Math.max(0.2, Math.min(newScale, 10)); 

    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Determine the zoom origin: cursor position or center of the screen.
        const p_rel_x = (clientX !== undefined ? clientX - rect.left : rect.width / 2) - rect.width / 2;
        const p_rel_y = (clientY !== undefined ? clientY - rect.top : rect.height / 2) - rect.height / 2;

        // Calculate the new pan position to keep the point under the cursor stationary.
        const newX = p_rel_x - ((p_rel_x - position.x) / scale) * clampedScale;
        const newY = p_rel_y - ((p_rel_y - position.y) / scale) * clampedScale;

        setPosition({ x: newX, y: newY });
    }
    
    setScale(clampedScale);
  };

  /** Handles mouse wheel events for zooming. */
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? 'out' : 'in', e.clientX, e.clientY);
  };

  /** Initiates dragging when the user clicks on a zoomed-in image. */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || scale <= 1) return; // Only allow left-click drag when zoomed in.
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  /** Updates the image position as the user drags the mouse. */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  /** Stops the dragging action. */
  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Do not render anything if the modal is not open.
  if (!isOpen || !imageUrl) return null;

  // Dynamically set the cursor style based on interaction state.
  const imageCursorClass = isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-default';

  return (
    // Main modal overlay
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={hidePreview} // Close modal if overlay is clicked
    >
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing modal
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        ref={containerRef}
      >
        {/* Top-right close button */}
        <button onClick={hidePreview} className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white rounded-full h-10 w-10 flex items-center justify-center z-20 shadow-lg hover:bg-white/30 transition-colors">
            <CloseIcon className="w-6 h-6" />
        </button>

        {/* Image container for positioning and transformations */}
        <div className="absolute inset-0 overflow-hidden">
            <img 
                src={imageUrl} 
                alt="Preview" 
                className={`absolute max-w-none transition-transform duration-75 ease-out ${imageCursorClass}`}
                style={{
                    // Apply scale and pan transformations
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    // Center the image before transformations
                    top: '50%', left: '50%',
                    // This trick with viewport units and negative margins ensures the image's
                    // natural center aligns with the screen center, making scaling uniform.
                    marginTop: '-50vh', marginLeft: '-50vw',
                    width: '100vw', height: '100vh',
                    objectFit: 'contain'
                }}
                onMouseDown={handleMouseDown}
            />
        </div>

        {/* Bottom control bar for zoom and reset */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm p-1.5 rounded-lg flex items-center space-x-2 text-white z-20 shadow-lg">
            <button onClick={() => handleZoom('out')} className="p-2 hover:bg-white/20 rounded-md"><MinusIcon className="w-5 h-5"/></button>
            <span className="font-mono text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => handleZoom('in')} className="p-2 hover:bg-white/20 rounded-md"><PlusIcon className="w-5 h-5"/></button>
            <div className="w-px h-5 bg-white/30"></div>
            <button onClick={handleReset} className="p-2 hover:bg-white/20 rounded-md"><RefreshCwIcon className="w-5 h-5"/></button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
