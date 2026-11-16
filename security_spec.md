# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Schema Enforcement**: Every document in `/donors/{donorId}` must contain all 13 required keys (`id`, `name`, `gender`, `dob`, `weight`, `bloodGroup`, `division`, `district`, `upazila`, `phone`, `lastDonationDate`, `timesDonated`, `isActive`) and no additional shadow keys.
2. **Primary Key Binding**: The document ID `{donorId}` must match `^[a-zA-Z0-9_\-]+$`, be at most 128 characters, and equal `incoming().phone`.
3. **Immutable Identity Fields**: During an update, `id` and `phone` must remain identical to `existing().id` and `existing().phone`.
4. **Query Enforcer on List**: `allow list` on `/donors/{donorId}` requires `existing().isActive == true`, ensuring only active donor profiles can be listed.
5. **Volumetric & Enum Boundaries**: Every string field enforces strict `.size()` boundaries and enumerations (`bloodGroup`, `gender`) matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection**: Adding `"isAdmin": true` to a donor document -> Rejected by `hasOnly()`.
2. **Missing Required Field**: Omitting `"bloodGroup"` on create -> Rejected by `hasAll()`.
3. **Oversized Name DoS**: Setting `name` to a 5,000-character string -> Rejected by `data.name.size() <= 120`.
4. **Invalid Blood Group Enum**: Setting `bloodGroup` to `"Z+"` -> Rejected by enum allowlist check.
5. **Invalid Gender Enum**: Setting `gender` to `"Unknown"` -> Rejected by `data.gender in ['Male', 'Female']`.
6. **Phone/ID Mismatch**: Creating `/donors/01711111111` with `phone: "01822222222"` -> Rejected by `incoming().phone == donorId`.
7. **Immutable Phone Mutation**: Updating `phone` on an existing donor document -> Rejected by `incoming().phone == existing().phone` and `affectedKeys().hasOnly(...)`.
8. **Immutable ID Mutation**: Updating `id` on an existing donor document -> Rejected by `incoming().id == existing().id`.
9. **Negative Weight**: Setting `weight` to `-10` -> Rejected by `data.weight >= 0 && data.weight <= 300`.
10. **Negative Times Donated**: Setting `timesDonated` to `-1` -> Rejected by `data.timesDonated >= 0 && data.timesDonated <= 500`.
11. **Inactive Profile List Scraping**: Listing `/donors` without `where("isActive", "==", true)` -> Rejected by `allow list: if existing().isActive == true`.
12. **Document Deletion Attempt**: Calling `deleteDoc` on `/donors/{donorId}` -> Rejected by `allow delete: if false`.
