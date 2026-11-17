import type { NavigateFunction } from "react-router-dom";

/** Position of the current page in this app's own history (0 = first page). */
export function historyIndex(): number {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === "number" ? state.idx : 0;
}

/** One page back inside the app; falls back to Home when there is nothing to go back to. */
export function goBack(navigate: NavigateFunction): void {
  if (historyIndex() > 0) {
    navigate(-1);
  } else {
    navigate("/", { replace: true });
  }
}
