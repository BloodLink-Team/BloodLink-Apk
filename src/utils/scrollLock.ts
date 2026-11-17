import { useEffect } from "react";

let locks = 0;
let saved = { html: "", body: "" };

/** Freezes the page behind an open overlay so it can't be scrolled. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    if (locks === 0) {
      saved = { html: html.style.overflow, body: body.style.overflow };
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    }
    locks++;
    return () => {
      locks--;
      if (locks === 0) {
        html.style.overflow = saved.html;
        body.style.overflow = saved.body;
      }
    };
  }, [active]);
}
