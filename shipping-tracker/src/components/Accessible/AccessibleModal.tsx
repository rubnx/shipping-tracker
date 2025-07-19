import React, { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap, useScreenReader } from '../../hooks';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  ariaDescribedBy?: string;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  ariaDescribedBy
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { announce } = useScreenReader();

  // Focus trap
  useFocusTrap(isOpen);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Manage focus and body scroll
  useEffect(() => {
    if (isOpen) {
      // Store current active element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Announce modal opening
      announce(`Modal opened: ${title}`, 'assertive');
      
      // Focus modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, announce]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      aria-describedby={ariaDescribedBy}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleOverlayClick}
      >
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        />

        {/* Center modal */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        {/* Modal panel */}
        <div
          ref={modalRef}
          className={`
            inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl 
            transform transition-all sm:my-8 sm:align-middle sm:w-full
            ${sizeClasses[size]} ${className}
          `}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <h3
                id="modal-title"
                className="text-lg leading-6 font-medium text-gray-900"
              >
                {title}
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={onClose}
                aria-label="Close modal"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pb-4 sm:p-6 sm:pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibleModal;