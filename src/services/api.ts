import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Donor, BloodGroup, Gender } from "../types";
import { normalizeBdPhone } from "../utils/phone";

const VALID_BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const clientOtpStore: Record<string, string> = {};

/** Rejects if the promise takes longer than `ms` (Firestore calls wait forever when offline). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Canonical 11-digit number when valid; otherwise the old cleaned value (keeps older saved sessions working). */
function sanitizePhone(phone: string): string {
  return normalizeBdPhone(phone) ?? (phone || "").trim().replace(/[^0-9+\-]/g, "").slice(0, 20);
}

/** Older records may be stored under the 13-digit "88..." form of the same number. */
function legacyPhoneKey(cleanPhone: string): string | null {
  return /^01\d{9}$/.test(cleanPhone) ? `88${cleanPhone}` : null;
}

function sanitizeDonorPayload(raw: Partial<Donor> & { phone: string; name: string; bloodGroup: BloodGroup }): Donor {
  const cleanPhone = sanitizePhone(raw.phone);
  const rawId = String(raw.id || Date.now().toString()).replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 64) || Date.now().toString();
  const gender: Gender = raw.gender === "Female" ? "Female" : "Male";
  const bloodGroup: BloodGroup = VALID_BLOOD_GROUPS.includes(raw.bloodGroup as BloodGroup)
    ? (raw.bloodGroup as BloodGroup)
    : "A+";

  return {
    id: rawId,
    name: String(raw.name || "Donor").trim().slice(0, 120) || "Donor",
    gender,
    dob: String(raw.dob || "").trim().slice(0, 32),
    weight: Math.min(300, Math.max(0, Number(raw.weight) || 0)),
    bloodGroup,
    division: String(raw.division || "Not Specified").trim().slice(0, 64) || "Not Specified",
    district: String(raw.district || "Not Specified").trim().slice(0, 64) || "Not Specified",
    upazila: String(raw.upazila || "Not Specified").trim().slice(0, 64) || "Not Specified",
    phone: cleanPhone,
    lastDonationDate: String(raw.lastDonationDate ?? "").trim().slice(0, 32),
    timesDonated: Math.min(500, Math.max(0, Number(raw.timesDonated) || 0)),
    isActive: raw.isActive ?? true,
  };
}

export interface DonorQueryFilter {
  scope?: "upazila" | "district" | "division" | "nationwide";
  upazila?: string;
  district?: string;
  division?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours local cache
const STORAGE_CACHE_PREFIX = "bloodlink_donor_cache_v1_";
const memoryDonorCache: Record<string, { donors: Donor[]; timestamp: number }> = {};

function getCacheKey(filter?: DonorQueryFilter): string {
  if (!filter) return "nationwide:all";
  const scope = filter.scope || "upazila";
  if (scope === "upazila" && filter.upazila) return `upazila:${filter.upazila.trim()}`;
  if (scope === "district" && filter.district) return `district:${filter.district.trim()}`;
  if (scope === "division" && filter.division) return `division:${filter.division.trim()}`;
  return "nationwide:all";
}

function readDonorCache(key: string): Donor[] | null {
  const mem = memoryDonorCache[key];
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.donors;
  }
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw) as { donors: Donor[]; timestamp: number };
      if (parsed && Array.isArray(parsed.donors) && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryDonorCache[key] = parsed;
        return parsed.donors;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeDonorCache(key: string, donors: Donor[]): void {
  const entry = { donors, timestamp: Date.now() };
  memoryDonorCache[key] = entry;
  try {
    localStorage.setItem(STORAGE_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignore storage quota errors
  }
}

function invalidateLocalDonorCache(): void {
  Object.keys(memoryDonorCache).forEach((k) => delete memoryDonorCache[k]);
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore storage errors
  }
}

function buildScopedQuery(filter?: DonorQueryFilter) {
  const path = "donors";
  const scope = filter?.scope || "upazila";

  if (scope === "upazila" && filter?.upazila?.trim()) {
    return query(
      collection(db, path),
      where("isActive", "==", true),
      where("upazila", "==", filter.upazila.trim())
    );
  }
  if (scope === "district" && filter?.district?.trim()) {
    return query(
      collection(db, path),
      where("isActive", "==", true),
      where("district", "==", filter.district.trim())
    );
  }
  if (scope === "division" && filter?.division?.trim()) {
    return query(
      collection(db, path),
      where("isActive", "==", true),
      where("division", "==", filter.division.trim())
    );
  }
  return query(collection(db, path), where("isActive", "==", true));
}

export async function fetchDonors(filter?: DonorQueryFilter): Promise<Donor[]> {
  const path = "donors";
  const cacheKey = getCacheKey(filter);
  const cached = readDonorCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const q = buildScopedQuery(filter);
    const snap = await getDocs(q);
    const firestoreDonors: Donor[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Donor;
      if (data && data.name && data.phone && data.bloodGroup && data.isActive !== false) {
        firestoreDonors.push(data);
      }
    });
    writeDonorCache(cacheKey, firestoreDonors);
    return firestoreDonors;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToDonors(
  onDonorsChange: (donors: Donor[]) => void,
  onError?: (err: Error) => void,
  filter?: DonorQueryFilter
): () => void {
  const path = "donors";
  const cacheKey = getCacheKey(filter);
  const cached = readDonorCache(cacheKey);

  // If valid 24-hour cache exists on this phone, serve immediately with 0 extra Firestore reads!
  if (cached) {
    onDonorsChange(cached);
    return () => {};
  }

  const q = buildScopedQuery(filter);
  return onSnapshot(
    q,
    (snap) => {
      const list: Donor[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Donor;
        if (d && d.name && d.phone && d.bloodGroup && d.isActive !== false) {
          list.push(d);
        }
      });
      writeDonorCache(cacheKey, list);
      onDonorsChange(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  );
}

/** Finds a donor record by phone, also looking under the older 13-digit key. */
async function findDonorDoc(cleanPhone: string): Promise<{ id: string; data: Donor } | null> {
  const keys = [cleanPhone];
  const legacy = legacyPhoneKey(cleanPhone);
  if (legacy) keys.push(legacy);
  for (const key of keys) {
    const snap = await getDoc(doc(db, "donors", key));
    if (snap.exists()) return { id: key, data: snap.data() as Donor };
  }
  return null;
}

export async function registerDonor(donor: Omit<Donor, "id">): Promise<Donor> {
  const cleanPhone = sanitizePhone(donor.phone);
  const path = `donors/${cleanPhone}`;
  const docRef = doc(db, "donors", cleanPhone);

  let existingId = Date.now().toString();
  try {
    const found = await findDonorDoc(cleanPhone);
    if (found?.data?.id) {
      existingId = String(found.data.id);
    }
  } catch {
    // Proceed with new id if read fails
  }

  const cleanDonor = sanitizeDonorPayload({
    ...donor,
    id: existingId,
    phone: cleanPhone,
    isActive: true,
  });

  try {
    await setDoc(docRef, cleanDonor);
    invalidateLocalDonorCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return cleanDonor;
}

export type OtpErrorCode = "INVALID_PHONE" | "LOCKED" | "WRONG_OTP";

export class OtpError extends Error {
  code: OtpErrorCode;
  lockedUntil?: number;
  attemptsLeft?: number;
  constructor(code: OtpErrorCode, extra: { lockedUntil?: number; attemptsLeft?: number } = {}) {
    super(code);
    this.code = code;
    this.lockedUntil = extra.lockedUntil;
    this.attemptsLeft = extra.attemptsLeft;
  }
}

const MAX_OTP_ATTEMPTS = 3;
const OTP_LOCK_MS = 24 * 60 * 60 * 1000;
const OTP_STATE_KEY = "bloodlink_otp_state_v1";

type OtpState = Record<string, { fails: number; lockedUntil: number }>;

function readOtpState(): OtpState {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(OTP_STATE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as OtpState) : {};
  } catch {
    return {};
  }
}

function writeOtpState(state: OtpState): void {
  try {
    localStorage.setItem(OTP_STATE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: the lock is still stored on the server side below
  }
}

/** Returns the time (ms) until which this phone is locked, or null. Checks this phone and the shared lock record. */
async function getOtpLockedUntil(phone: string): Promise<number | null> {
  const now = Date.now();
  const local = readOtpState()[phone]?.lockedUntil ?? 0;
  let remote = 0;
  try {
    const snap = await withTimeout(getDoc(doc(db, "otp_locks", phone)), 4000);
    const value = snap.exists() ? (snap.data() as { lockedUntil?: unknown }).lockedUntil : 0;
    if (typeof value === "number") remote = value;
  } catch {
    // offline or rules not deployed: fall back to the on-phone lock
  }
  const until = Math.max(local, remote);
  return until > now ? until : null;
}

async function lockPhone(phone: string): Promise<number> {
  const lockedUntil = Date.now() + OTP_LOCK_MS;
  const state = readOtpState();
  state[phone] = { fails: 0, lockedUntil };
  writeOtpState(state);
  // Not awaited: when offline this write would wait forever. The lock above already applies on this phone.
  setDoc(doc(db, "otp_locks", phone), { phone, lockedUntil }).catch(() => {});
  return lockedUntil;
}

export async function sendOtp(phone: string): Promise<{ debugOtp?: string }> {
  const cleanPhone = normalizeBdPhone(phone);
  if (!cleanPhone) throw new OtpError("INVALID_PHONE");

  const lockedUntil = await getOtpLockedUntil(cleanPhone);
  if (lockedUntil) throw new OtpError("LOCKED", { lockedUntil });

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  clientOtpStore[cleanPhone] = generatedOtp;
  return { debugOtp: generatedOtp };
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ verified: boolean; existingDonor: Donor | null; phone: string }> {
  const cleanPhone = normalizeBdPhone(phone);
  if (!cleanPhone) throw new OtpError("INVALID_PHONE");
  const cleanOtp = (otp || "").trim();

  const lockedUntil = await getOtpLockedUntil(cleanPhone);
  if (lockedUntil) throw new OtpError("LOCKED", { lockedUntil });

  if (!clientOtpStore[cleanPhone] || clientOtpStore[cleanPhone] !== cleanOtp) {
    const state = readOtpState();
    const fails = (state[cleanPhone]?.fails ?? 0) + 1;
    if (fails >= MAX_OTP_ATTEMPTS) {
      delete clientOtpStore[cleanPhone];
      throw new OtpError("LOCKED", { lockedUntil: await lockPhone(cleanPhone) });
    }
    state[cleanPhone] = { fails, lockedUntil: 0 };
    writeOtpState(state);
    throw new OtpError("WRONG_OTP", { attemptsLeft: MAX_OTP_ATTEMPTS - fails });
  }
  delete clientOtpStore[cleanPhone];
  const state = readOtpState();
  delete state[cleanPhone];
  writeOtpState(state);

  // Check Firestore for existing donor profile
  const path = `donors/${cleanPhone}`;
  try {
    const found = await findDonorDoc(cleanPhone);
    if (found) {
      const existingData = found.data;
      const sanitized = sanitizeDonorPayload({
        ...existingData,
        phone: cleanPhone,
        isActive: true,
      });
      if (found.id !== cleanPhone || !existingData.isActive) {
        await setDoc(doc(db, "donors", cleanPhone), sanitized);
        if (found.id !== cleanPhone) await deleteDoc(doc(db, "donors", found.id));
        invalidateLocalDonorCache();
      }
      return { verified: true, existingDonor: sanitized, phone: cleanPhone };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  return { verified: true, existingDonor: null, phone: cleanPhone };
}

export async function updateDonationDate(phone: string, lastDonationDate: string): Promise<Donor> {
  return updateDonor(phone, { lastDonationDate });
}

export async function updateDonor(phone: string, updates: Partial<Donor>): Promise<Donor> {
  const cleanPhone = sanitizePhone(phone);
  const path = `donors/${cleanPhone}`;
  const docRef = doc(db, "donors", cleanPhone);

  try {
    const found = await findDonorDoc(cleanPhone);
    const existing = found ? found.data : ({} as Partial<Donor>);
    const merged = sanitizeDonorPayload({
      ...(existing as Donor),
      ...updates,
      id: existing.id || updates.id || Date.now().toString(),
      phone: cleanPhone,
      name: updates.name ?? existing.name ?? "Donor",
      bloodGroup: (updates.bloodGroup ?? existing.bloodGroup ?? "A+") as BloodGroup,
    });

    await setDoc(docRef, merged);
    if (found && found.id !== cleanPhone) await deleteDoc(doc(db, "donors", found.id));
    invalidateLocalDonorCache();

    return merged;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/** Permanently removes a donor's record from Firestore (and any older 13-digit copy). */
export async function deleteDonor(phone: string): Promise<void> {
  const cleanPhone = sanitizePhone(phone);
  const path = `donors/${cleanPhone}`;
  const keys = [cleanPhone];
  const legacy = legacyPhoneKey(cleanPhone);
  if (legacy) keys.push(legacy);
  try {
    for (const key of keys) {
      await withTimeout(deleteDoc(doc(db, "donors", key)), 15000);
    }
    invalidateLocalDonorCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
