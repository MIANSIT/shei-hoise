"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react"; // cross icon

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center 
                 bg-black/30 backdrop-blur-sm px-4 sm:px-6"
      // Removed onClick here to prevent closing on overlay
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto 
                   rounded-xl shadow-lg p-6 sm:p-8 bg-card"
        onClick={(e) => e.stopPropagation()} // keep this to prevent inner clicks bubbling
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-red-500 hover:text-red-600 cursor-pointer"
        >
          <X size={20} />
        </button>

        {children}
      </div>
    </div>
  );
}
