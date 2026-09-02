import { useEffect } from 'react';

export function useKeyboardShortcuts({
  mainSearchInputRef,
  filterInputRef,
  onCancelStream,
  onSelectAll,
  isStreaming
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      // 1. Esc: Cancel active search execution stream (active even when typing)
      if (e.key === 'Escape') {
        if (isStreaming) {
          e.preventDefault();
          onCancelStream?.();
        }
        return;
      }

      // 2. Ctrl+K or '/' (when not already typing): Focus main search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        mainSearchInputRef?.current?.focus();
        mainSearchInputRef?.current?.select?.();
        return;
      }

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        mainSearchInputRef?.current?.focus();
        mainSearchInputRef?.current?.select?.();
        return;
      }

      // 3. 'F' or 'f' (when not already typing): Focus Search Within Results
      if (e.key.toLowerCase() === 'f' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        filterInputRef?.current?.focus();
        filterInputRef?.current?.select?.();
        return;
      }

      // 4. Ctrl+A: Select all rendered virtual rows (only when not typing in an input)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !isTyping) {
        e.preventDefault();
        onSelectAll?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mainSearchInputRef, filterInputRef, onCancelStream, onSelectAll, isStreaming]);
}
