import { Donor, BloodGroup, Gender } from "../types";
import { LOCATION_DATA } from "./locations";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MALE_FIRST_NAMES = [
  "Tanvir", "Mahmudul", "Rakibul", "Shakib", "Mehedi", "Naimul", "Tariqul", "Zahid",
  "Sabbir", "Ashraful", "Arifur", "Kamrul", "Nazmul", "Saiful", "Rashedul", "Imran",
  "Faisal", "Sajjad", "Mizanur", "Habibur", "Touhidul", "Anisur", "Shafiqul", "Jubayer",
  "Soumitra", "Subrata", "Debashish", "Pranab", "Biplab", "Arijit", "Suman", "Sourav",
  "Rubel", "Sohel", "Mamun", "Farhan", "Adnan", "Salman", "Rayhan", "Maruf"
];

const MALE_LAST_NAMES = [
  "Hasan", "Islam", "Hossain", "Ahmed", "Rahman", "Khan", "Uddin", "Alam",
  "Chowdhury", "Sikder", "Talukder", "Bhuiyan", "Sarkar", "Roy", "Das", "Chakraborty",
  "Mia", "Kabir", "khandaker", "Mollick", "Patwary", "Howlader", "azi", "Munshi"
];

const FEMALE_FIRST_NAMES = [
  "Nusrat", "Sadia", "Farzana", "Tasnim", "Jannatul", "Sumaiya", "Tanjina", "Sharmin",
  "Maliha", "Samia", "Fariha", "Tahmina", "Mahmuda", "Sabrina", "Roksana", "Shamima",
  "Anika", "Nabila", "Rubaiya", "israt", "Sanjida", "Mousumi", "Arpita", "Purnima",
  "indrani", "Susmita", "Priyanka", "Ananya", "Laboni", "fatema", "Khadija", "Afroza"
];

const FEMALE_LAST_NAMES = [
  "Jahan", "Akter", "Sultana", "Khatun", "Begum", "Islam", "Rahman", "Nahar",
  "Chowdhury", "parvin", "Yasmin", "Khanam", "Sarkar", "Roy", "Das", "Sen",
  "Binte", "Siddiqua", "Ferdous", "Tabassum", "kabir", "Ahmed", "Hossain", "Alam"
];

const MOBILE_PREFIXES = ["017", "018", "019", "016", "015", "013", "014"];

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function buildDummyDonor(
  seed: number,
  division: string,
  district: string,
  upazila: string,
  bloodGroup: BloodGroup,
  indexInGroup: number
): Donor {
  const h = hashString(`${seed}-${division}-${district}-${upazila}-${bloodGroup}-${indexInGroup}`);
  const gender: Gender = h % 10 < 7 ? "Male" : "Female";

  const rawName =
    gender === "Male"
      ? `${MALE_FIRST_NAMES[h % MALE_FIRST_NAMES.length]} ${MALE_LAST_NAMES[(h >> 4) % MALE_LAST_NAMES.length]}`
      : `${FEMALE_FIRST_NAMES[h % FEMALE_FIRST_NAMES.length]} ${FEMALE_LAST_NAMES[(h >> 4) % FEMALE_LAST_NAMES.length]}`;
  const name = capitalizeWords(rawName);

  // Age between 19 and 54 (birth years 1972 to 2006)
  const birthYear = 1972 + (h % 35);
  const birthMonth = String(1 + ((h >> 3) % 12)).padStart(2, "0");
  const birthDay = String(1 + ((h >> 6) % 28)).padStart(2, "0");
  const dob = `${birthYear}-${birthMonth}-${birthDay}`;

  // Weight adhering to medical standards (Male >= 50kg, Female >= 45kg)
  const weight =
    gender === "Male"
      ? 52 + (h % 36) // 52 - 87 kg
      : 47 + (h % 26); // 47 - 72 kg

  // Unique-looking 11-digit Bangladeshi phone number
  const prefix = MOBILE_PREFIXES[h % MOBILE_PREFIXES.length];
  const eightDigits = String(10000000 + (h % 89999999)).slice(0, 8);
  const phone = `${prefix}${eightDigits}`;

  // Donation history:
  // ~20% First-Time Donors
  // ~50% Eligible repeat donors (last donated > 120 days ago, in 2025 or early 2026)
  // ~30% Recently donated / unavailable (last donated in July, August, or September 2026)
  const bucket = indexInGroup % 10;
  let lastDonationDate = "";
  let timesDonated = 0;

  if (bucket === 0 || bucket === 5) {
    // First-time donor
    lastDonationDate = "";
    timesDonated = 0;
  } else if (bucket === 2 || bucket === 6 || bucket === 9) {
    // Recently donated (within the last 1-3 months of current date 2026-09-29 -> Unavailable)
    const recentMonths = ["07", "08", "09"];
    const m = recentMonths[h % recentMonths.length];
    const maxDay = m === "09" ? 25 : 28;
    const d = String(1 + (h % maxDay)).padStart(2, "0");
    lastDonationDate = `2026-${m}-${d}`;
    timesDonated = 1 + (h % 9);
  } else {
    // Eligible repeat donor (donated prior to May 2026)
    const eligibleDates = [
      "2025-09", "2025-10", "2025-11", "2025-12",
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"
    ];
    const ym = eligibleDates[h % eligibleDates.length];
    const d = String(1 + ((h >> 2) % 28)).padStart(2, "0");
    lastDonationDate = `${ym}-${d}`;
    timesDonated = 1 + (h % 12);
  }

  return {
    id: `dummy-${hashString(`${upazila}-${bloodGroup}-${indexInGroup}-${phone}`)}`,
    name,
    gender,
    dob,
    weight,
    bloodGroup,
    division,
    district,
    upazila,
    phone,
    lastDonationDate,
    timesDonated,
    isActive: true,
  };
}

export type SearchScope = "upazila" | "district" | "division" | "nationwide";

/**
 * Generates realistic dummy donors scoped to the active search level
 * (upazila -> district -> division -> nationwide), covering all 8 blood groups.
 */
export function getDummyDonorsForSearch(
  query?: {
    division?: string;
    district?: string;
    upazila?: string;
    bloodGroup?: BloodGroup;
  },
  scope: SearchScope = "upazila"
): Donor[] {
  const results: Donor[] = [];

  if (query?.division && query?.district && query?.upazila) {
    const districtUpazilas = LOCATION_DATA.upazilas[query.district] || [query.upazila];

    // 1. Always include Upazila-level donors (12 per blood group in the exact searched Upazila)
    BLOOD_GROUPS.forEach((bg) => {
      for (let i = 0; i < 12; i++) {
        results.push(
          buildDummyDonor(101 + i, query.division!, query.district!, query.upazila!, bg, i)
        );
      }
    });

    if (scope === "upazila") {
      return results;
    }

    // 2. District level: add donors from all other Upazilas in the same District
    const otherUpazilas = districtUpazilas.filter((u) => u !== query.upazila);
    BLOOD_GROUPS.forEach((bg) => {
      otherUpazilas.forEach((uName, uIdx) => {
        for (let k = 0; k < 3; k++) {
          results.push(
            buildDummyDonor(
              300 + uIdx * 10 + k,
              query.division!,
              query.district!,
              uName,
              bg,
              12 + uIdx * 3 + k
            )
          );
        }
      });
    });

    if (scope === "district") {
      return results;
    }

    // 3. Division level: add donors from other Districts in the same Division
    const divisionDistricts = (LOCATION_DATA.districts[query.division] || []).filter(
      (d) => d !== query.district
    );
    BLOOD_GROUPS.forEach((bg) => {
      divisionDistricts.forEach((distName, dIdx) => {
        const upazilasInDist = LOCATION_DATA.upazilas[distName] || [`${distName} Sadar`];
        for (let m = 0; m < 2; m++) {
          const uName = upazilasInDist[m % upazilasInDist.length];
          results.push(
            buildDummyDonor(
              600 + dIdx * 10 + m,
              query.division!,
              distName,
              uName,
              bg,
              35 + dIdx * 2 + m
            )
          );
        }
      });
    });

    if (scope === "division") {
      return results;
    }

    // 4. Nationwide level: add donors from all other Divisions across Bangladesh
    let natCounter = 0;
    for (const divName of LOCATION_DATA.divisions) {
      if (divName === query.division) continue;
      const divDistricts = LOCATION_DATA.districts[divName] || [];
      for (let dIdx = 0; dIdx < Math.min(2, divDistricts.length); dIdx++) {
        const distName = divDistricts[dIdx];
        const upazilasInDist = LOCATION_DATA.upazilas[distName] || [`${distName} Sadar`];
        const uName = upazilasInDist[0];
        for (const bg of BLOOD_GROUPS) {
          results.push(
            buildDummyDonor(900 + natCounter, divName, distName, uName, bg, 70 + natCounter)
          );
          natCounter++;
        }
      }
    }

    return results;
  }

  // Fallback general pool across all 8 divisions and blood groups
  let counter = 0;
  for (const division of LOCATION_DATA.divisions) {
    const districts = LOCATION_DATA.districts[division] || [];
    for (let dIdx = 0; dIdx < Math.min(3, districts.length); dIdx++) {
      const district = districts[dIdx];
      const upazilas = LOCATION_DATA.upazilas[district] || [];
      const upazila = upazilas[counter % Math.max(1, upazilas.length)] || `${district} Sadar`;
      for (const bg of BLOOD_GROUPS) {
        results.push(buildDummyDonor(500 + counter, division, district, upazila, bg, counter));
        counter++;
      }
    }
  }

  return results;
}
