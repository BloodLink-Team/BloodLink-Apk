import { useEffect, useRef } from "react";

interface Entry {
  id: number;
  close: () => void;
}

const stack: Entry[] = [];
let nextId = 1;

/** Closes the top-most open overlay (menu, dialog, chat...). Returns true if one was closed. */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

/**
 * While `isOpen` is true the overlay is registered, so the device back button
 * closes it (most recently opened first) before any page navigation happens.
 */
export function useBackClose(isOpen: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const id = nextId++;
    stack.push({ id, close: () => closeRef.current() });
    return () => {
      const i = stack.findIndex((e) => e.id === id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [isOpen]);
}
