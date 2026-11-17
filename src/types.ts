
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type Gender = "Male" | "Female";

export interface Donor {
  id: string;
  name: string;
  gender: Gender;
  dob: string;
  weight: number;
  bloodGroup: BloodGroup;
  division: string;
  district: string;
  upazila: string;
  phone: string;
  lastDonationDate: string;
  timesDonated: number;
  isActive: boolean;
}

export interface SearchCriteria {
  bloodGroup: BloodGroup;
  division: string;
  district: string;
  upazila: string;
}

export type SearchScope = "upazila" | "district" | "division" | "nationwide";
