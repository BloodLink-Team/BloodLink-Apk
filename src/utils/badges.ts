export type BadgeKey = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface BadgeTier {
  key: BadgeKey;
  min: number; // donations needed
  en: string;
  bn: string;
  color: string; // main colour
  soft: string; // light background
}

// Each rank is harder than the last.
export const BADGES: BadgeTier[] = [
  { key: "bronze", min: 3, en: "Bronze", bn: "ব্রোঞ্জ", color: "#b4682c", soft: "#fbeee3" },
  { key: "silver", min: 10, en: "Silver", bn: "সিলভার", color: "#7b8696", soft: "#eef1f5" },
  { key: "gold", min: 25, en: "Gold", bn: "গোল্ড", color: "#c99700", soft: "#fff6d6" },
  { key: "platinum", min: 50, en: "Platinum", bn: "প্লাটিনাম", color: "#2c93b3", soft: "#e3f4fa" },
  { key: "diamond", min: 100, en: "Diamond", bn: "ডায়মন্ড", color: "#6a4df0", soft: "#ece8ff" },
];

export function getBadgeIndex(times: number | string | undefined): number {
  const t = Number(times) || 0;
  let idx = -1;
  BADGES.forEach((b, i) => {
    if (t >= b.min) idx = i;
  });
  return idx;
}

export function getBadge(times: number | string | undefined): BadgeTier | null {
  const i = getBadgeIndex(times);
  return i >= 0 ? BADGES[i] : null;
}

export function getNextBadge(times: number | string | undefined): BadgeTier | null {
  return BADGES[getBadgeIndex(times) + 1] ?? null;
}

const SEEN_KEY = "bloodlink_badge_seen_v1";

/** Highest badge rank the user has already been congratulated for (saved on this device). */
export function getSeenBadgeIndex(phone: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    const v = all[phone];
    return typeof v === "number" ? v : -1;
  } catch {
    return -1;
  }
}

export function setSeenBadgeIndex(phone: string, index: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    all[phone] = index;
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

/** Today's date as YYYY-MM-DD in the phone's local time. */
export function todayIso(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
