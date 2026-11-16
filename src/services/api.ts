import {
  collection,
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
import { getApiUrl, isNativeCapacitor } from "../utils/apiBase";

const VALID_BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const clientOtpStore: Record<string, string> = {};

function sanitizePhone(phone: string): string {
  return (phone || "").trim().replace(/[^0-9+\-]/g, "").slice(0, 20);
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

function xhrJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, getApiUrl(url), true);
    xhr.withCredentials = !isNativeCapacitor();
    xhr.setRequestHeader("Accept", "application/json");
    if (body !== undefined) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          resolve(parsed as T);
        } catch {
          reject(new Error("Invalid JSON response from server"));
        }
      } else {
        let errorMsg = `Request failed with status ${xhr.status}`;
        try {
          const parsedErr = JSON.parse(xhr.responseText);
          if (parsedErr?.error) errorMsg = parsedErr.error;
        } catch {
          // ignore
        }
        reject(new Error(errorMsg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body !== undefined ? JSON.stringify(body) : null);
  });
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
    try {
      const fallback = await xhrJson<Donor[]>("GET", `/api/donors?_t=${Date.now()}`);
      if (Array.isArray(fallback)) {
        return fallback.filter((d) => Boolean(d && d.name && d.phone && d.bloodGroup));
      }
    } catch {
      // ignore fallback error
    }
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

export async function registerDonor(donor: Omit<Donor, "id">): Promise<Donor> {
  const cleanPhone = sanitizePhone(donor.phone);
  const path = `donors/${cleanPhone}`;
  const docRef = doc(db, "donors", cleanPhone);

  let existingId = Date.now().toString();
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as Partial<Donor>;
      if (existingData?.id) {
        existingId = String(existingData.id);
      }
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

  // Best-effort sync to server fallback
  const encodedPayload = encodeURIComponent(JSON.stringify(cleanDonor));
  xhrJson("GET", `/api/donors/register?payload=${encodedPayload}&_t=${Date.now()}`).catch(() => {});

  return cleanDonor;
}

export async function sendOtp(phone: string): Promise<{ debugOtp?: string }> {
  const cleanPhone = sanitizePhone(phone);
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  clientOtpStore[cleanPhone] = generatedOtp;

  try {
    const payload = { phone: cleanPhone };
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const res = await xhrJson<{ debugOtp?: string }>(
      "GET",
      `/api/otp/send?payload=${encodedPayload}&_t=${Date.now()}`
    );
    if (res?.debugOtp) {
      clientOtpStore[cleanPhone] = res.debugOtp;
      return res;
    }
  } catch {
    // Fallback to client-generated OTP if server instance is unreachable
  }

  return { debugOtp: generatedOtp };
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ verified: boolean; existingDonor: Donor | null }> {
  const cleanPhone = sanitizePhone(phone);
  const cleanOtp = (otp || "").trim();

  let isVerified = false;
  let serverDonor: Donor | null = null;

  if (clientOtpStore[cleanPhone] && clientOtpStore[cleanPhone] === cleanOtp) {
    isVerified = true;
    delete clientOtpStore[cleanPhone];
  }

  try {
    const payload = { phone: cleanPhone, otp: cleanOtp };
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const res = await xhrJson<{ verified: boolean; existingDonor: Donor | null }>(
      "GET",
      `/api/otp/verify?payload=${encodedPayload}&_t=${Date.now()}`
    );
    if (res?.verified) {
      isVerified = true;
      if (res.existingDonor && res.existingDonor.name && res.existingDonor.phone) {
        serverDonor = res.existingDonor;
      }
    }
  } catch {
    // If clientOtpStore matched, continue even if server restarted
  }

  if (!isVerified) {
    throw new Error("Invalid OTP");
  }

  // Check Firestore for existing donor profile
  const path = `donors/${cleanPhone}`;
  try {
    const docRef = doc(db, "donors", cleanPhone);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const existingData = snap.data() as Donor;
      const sanitized = sanitizeDonorPayload({
        ...existingData,
        isActive: true,
      });
      if (!existingData.isActive) {
        await setDoc(docRef, sanitized);
      }
      return { verified: true, existingDonor: sanitized };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  return { verified: true, existingDonor: serverDonor };
}

export async function updateDonationDate(phone: string, lastDonationDate: string): Promise<Donor> {
  return updateDonor(phone, { lastDonationDate });
}

export async function updateDonor(phone: string, updates: Partial<Donor>): Promise<Donor> {
  const cleanPhone = sanitizePhone(phone);
  const path = `donors/${cleanPhone}`;
  const docRef = doc(db, "donors", cleanPhone);

  try {
    const snap = await getDoc(docRef);
    const existing = snap.exists() ? (snap.data() as Donor) : ({} as Partial<Donor>);
    const merged = sanitizeDonorPayload({
      ...(existing as Donor),
      ...updates,
      id: existing.id || updates.id || Date.now().toString(),
      phone: cleanPhone,
      name: updates.name ?? existing.name ?? "Donor",
      bloodGroup: (updates.bloodGroup ?? existing.bloodGroup ?? "A+") as BloodGroup,
    });

    await setDoc(docRef, merged);
    invalidateLocalDonorCache();

    // Best-effort sync to server fallback
    const encodedPayload = encodeURIComponent(JSON.stringify(merged));
    xhrJson(
      "GET",
      `/api/donors/update/${encodeURIComponent(cleanPhone)}?payload=${encodedPayload}&_t=${Date.now()}`
    ).catch(() => {});

    return merged;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
