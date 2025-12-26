'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface TableAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  hidden?: boolean;
}

interface TableRowActionMenuProps {
  actions: TableAction[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function TableRowActionMenu({ actions, position, onClose }: TableRowActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position if menu would overflow right edge
      if (x + rect.width > viewportWidth - 16) {
        x = viewportWidth - rect.width - 16;
      }

      // Adjust vertical position if menu would overflow bottom edge
      if (y + rect.height > viewportHeight - 16) {
        y = viewportHeight - rect.height - 16;
      }

      // Ensure menu doesn't go off left or top edge
      x = Math.max(16, x);
      y = Math.max(16, y);

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  const visibleActions = actions.filter((a) => !a.hidden);
  if (visibleActions.length === 0) return null;

  const variantStyles = {
    default: 'text-gray-700 hover:bg-gray-100',
    danger: 'text-red-600 hover:bg-red-50',
    success: 'text-green-600 hover:bg-green-50',
    warning: 'text-yellow-600 hover:bg-yellow-50',
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50 min-w-[160px]"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
      role="menu"
    >
      {visibleActions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          disabled={action.disabled}
          className={`block w-full text-left px-4 py-2 text-sm ${variantStyles[action.variant || 'default']} disabled:opacity-50 disabled:cursor-not-allowed`}
          role="menuitem"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

// Hook for managing row action menu state
export function useTableRowActions<T extends { id?: string; uid?: string }>() {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const handleRowClick = useCallback((e: React.MouseEvent, item: T) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => {
    setSelectedItem(null);
    setMenuPosition(null);
  }, []);

  return {
    selectedItem,
    menuPosition,
    handleRowClick,
    closeMenu,
    isMenuOpen: selectedItem !== null && menuPosition !== null,
  };
}
