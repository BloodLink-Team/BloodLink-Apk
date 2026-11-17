import { useEffect, useRef } from "react";

const MIN_DISTANCE = 70;
const MAX_VERTICAL_RATIO = 0.5;

/** True when the touch started inside something that scrolls sideways or takes typing. */
function startsInsideSidewaysArea(target: EventTarget | null): boolean {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== document.body) {
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.scrollWidth > el.clientWidth + 2) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

/** Calls `onSwipe` when the user swipes from left to right anywhere on the screen. */
export function useSwipeRight(onSwipe: () => void, enabled: boolean): void {
  const callbackRef = useRef(onSwipe);
  callbackRef.current = onSwipe;

  useEffect(() => {
    if (!enabled) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      tracking = !startsInsideSidewaysArea(e.target);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        tracking = false; // user is scrolling vertically
      } else if (dx > MIN_DISTANCE && Math.abs(dy) < dx * MAX_VERTICAL_RATIO) {
        tracking = false;
        callbackRef.current();
      }
    };

    const onEnd = () => {
      tracking = false;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);
}
