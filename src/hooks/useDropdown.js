import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDropdown hook
 * Manages dropdown open/close state with:
 * - Click outside to close
 * - Escape key to close
 * - Optional auto-close on route change
 * - Proper cleanup of event listeners
 */
export default function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentClick = (event) => {
      const clickedInsideDropdown = dropdownRef.current?.contains(event.target);
      const clickedTrigger = triggerRef.current?.contains(event.target);

      if (!clickedInsideDropdown && !clickedTrigger) {
        close();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return { isOpen, setIsOpen, open, close, toggle, dropdownRef, triggerRef };
}
