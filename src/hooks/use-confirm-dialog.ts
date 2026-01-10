import { useState, useCallback } from 'react';

/**
 * State and handlers for a confirmation dialog
 */
export interface ConfirmDialogState<T = string> {
  isOpen: boolean;
  item: T | null;
  open: (item: T) => void;
  close: () => void;
  confirm: () => void;
}

/**
 * Hook for managing confirmation dialogs (e.g., delete confirmations)
 * Reduces boilerplate for the common pattern of:
 * - Open dialog with an item
 * - Confirm action on item
 * - Close dialog and reset
 */
export function useConfirmDialog<T = string>(
  onConfirm: (item: T) => void | Promise<void>
): ConfirmDialogState<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<T | null>(null);

  const open = useCallback((itemToConfirm: T) => {
    setItem(itemToConfirm);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  const confirm = useCallback(async () => {
    if (item !== null) {
      await onConfirm(item);
      close();
    }
  }, [item, onConfirm, close]);

  return { isOpen, item, open, close, confirm };
}

/**
 * Hook for managing loading state during confirmation
 */
export function useConfirmDialogWithLoading<T = string>(
  onConfirm: (item: T) => Promise<void>
): ConfirmDialogState<T> & { loading: boolean } {
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(
    async (item: T) => {
      setLoading(true);
      try {
        await onConfirm(item);
      } finally {
        setLoading(false);
      }
    },
    [onConfirm]
  );

  const dialogState = useConfirmDialog(handleConfirm);

  return { ...dialogState, loading };
}
