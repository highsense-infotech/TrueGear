import { CircleX } from 'lucide-react';
import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const Modal: React.FC<Props> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const getWidthClass = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'lg':
        return 'max-w-2xl';
      default:
        return 'max-w-lg';
    }
  };

  return (
    <div 
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} 
      onClick={onClose}
      className="flex items-center justify-center overflow-y-auto"
    >
      <div 
        style={{ background: '#fff', borderRadius: '12px', width: '90%', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} 
        className={`${getWidthClass()} max-h-[90vh] shadow-xl my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header.
            z-10 is required, not decorative: `sticky` alone leaves the header
            at z-index auto, so the scrollable content below it in DOM order
            paints ON TOP of it — the Edit User avatar was covering the title.
            Kept below the overlay's zIndex: 50 so it only lifts the header
            above this modal's own body. */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10">
            <h3 className="text-[18px] font-semibold text-[#333]">{title}</h3>
            <button 
              onClick={onClose}
              className="text-[#999] hover:text-[#333] transition-colors cursor-pointer"
            >
              <CircleX size={24} color='#333' />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

