
/**
 * @file Reusable Modal Component (Modal.tsx)
 * @description Enhanced modal with physics-based entry animations and backdrop blur.
 */
import React from 'react';
import { CloseIcon } from './Icons';
import { triggerHaptic, btnClickable } from '../../utils/ux';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'lg' }) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg',
    xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl', '5xl': 'max-w-5xl', '6xl': 'max-w-6xl', '7xl': 'max-w-7xl',
  };

  const handleClose = () => {
      triggerHaptic('light');
      onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />

      {/* Modal Content with Pop Animation */}
      <div 
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[95vh] flex flex-col transform animate-modal-pop border border-gray-100 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-100 p-5 flex-shrink-0 bg-white z-10 gap-3">
          <div className="text-xl font-bold text-gray-800 tracking-tight flex-1 min-w-0">{title}</div>
          <button 
            onClick={handleClose} 
            className={`flex-shrink-0 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors ${btnClickable}`}
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
