import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ulp_copied_records_v2';

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

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

  const isUserCopied = useCallback((id) => {
    return copiedSet.has(`${id}:user`) || copiedSet.has(id);
  }, [copiedSet]);

  const isPassCopied = useCallback((id) => {
    return copiedSet.has(`${id}:pass`) || copiedSet.has(id);
  }, [copiedSet]);

  const copyRecord = useCallback(async (item) => {
    if (!item) return false;
    const textToCopy = item.userOrEmail && item.pass 
      ? `${item.userOrEmail}:${item.pass}` 
      : (item.raw || item.userOrEmail);

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedSet(prev => {
        const next = new Set(prev);
        next.add(item.id);
        next.add(`${item.id}:user`);
        next.add(`${item.id}:pass`);
        persistSet(next);
        return next;
      });
      return true;
    }
    return false;
  }, [persistSet]);

  const copyUser = useCallback(async (item) => {
    if (!item?.userOrEmail) return false;
    const ok = await copyToClipboard(item.userOrEmail);
    if (ok) {
      setCopiedSet(prev => {
        const next = new Set(prev);
        next.add(`${item.id}:user`);
        persistSet(next);
        return next;
      });
      return true;
    }
    return false;
  }, [persistSet]);

  const copyPass = useCallback(async (item) => {
    if (!item?.pass) return false;
    const ok = await copyToClipboard(item.pass);
    if (ok) {
      setCopiedSet(prev => {
        const next = new Set(prev);
        next.add(`${item.id}:pass`);
        persistSet(next);
        return next;
      });
      return true;
    }
    return false;
  }, [persistSet]);

  const copyRaw = useCallback(async (item) => {
    if (!item?.raw) return false;
    const ok = await copyToClipboard(item.raw);
    if (ok) {
      setCopiedSet(prev => {
        const next = new Set(prev);
        next.add(item.id);
        next.add(`${item.id}:user`);
        next.add(`${item.id}:pass`);
        persistSet(next);
        return next;
      });
      return true;
    }
    return false;
  }, [persistSet]);

  const clearCopied = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    setCopiedSet(new Set());
  }, []);

  return {
    isCopied,
    isUserCopied,
    isPassCopied,
    copyRecord,
    copyUser,
    copyPass,
    copyRaw,
    copiedCount: copiedSet.size,
    clearCopied
  };
}
