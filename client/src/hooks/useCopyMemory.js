import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ulp_copied_records_v1';

export function useCopyMemory() {
  const [copiedSet, setCopiedSet] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Sync to localStorage
  const persistSet = useCallback((newSet) => {
    try {
      const array = Array.from(newSet);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
    } catch (e) {
      console.error('Failed to persist copied records to localStorage', e);
    }
  }, []);

  const isCopied = useCallback((id) => {
    return copiedSet.has(id);
  }, [copiedSet]);

  const copyRecord = useCallback(async (item) => {
    if (!item) return false;
    const textToCopy = item.userOrEmail && item.pass 
      ? `${item.userOrEmail}:${item.pass}` 
      : (item.raw || item.userOrEmail);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedSet(prev => {
        const next = new Set(prev);
        next.add(item.id);
        persistSet(next);
        return next;
      });
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      return false;
    }
  }, [persistSet]);

  const clearCopied = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    setCopiedSet(new Set());
  }, []);

  return {
    isCopied,
    copyRecord,
    copiedCount: copiedSet.size,
    clearCopied
  };
}
