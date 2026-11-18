const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Returns the 11-digit Bangladesh mobile number (01XXXXXXXXX) or null if invalid.
 * Accepts an optional +88 / 88 country code and Bangla digits.
 */
export function normalizeBdPhone(input: string): string | null {
  let s = (input || "")
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[\s\-().]/g, "");
  if (s.startsWith("+88")) s = s.slice(3);
  else if (s.startsWith("88") && s.length === 13) s = s.slice(2);
  return /^01\d{9}$/.test(s) ? s : null;
}
