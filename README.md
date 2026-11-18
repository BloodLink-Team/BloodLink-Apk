# BloodLink

Self-contained Android app (React + Capacitor). No backend server: donor data is stored in
Firebase Firestore, and the help assistant answers from the built-in FAQ list.

## Where things are
- `src/App.tsx` – screens (search, register, donor profile)
- `src/services/api.ts` – all Firestore reads/writes for donors
- `src/components/SideMenuPages.tsx` – side menu pages and the FAQ list (`BLOOD_DONATION_FAQS`)
- `src/components/FaqAssistantModal.tsx` – offline assistant with on-phone chat history (uses `src/utils/faqSearch.ts`)
- `src/utils/` – back-button handling (`backStack.ts`, `navigation.ts`), swipe-to-open menu (`useSwipeRight.ts`), scroll lock
- `src/firebase.ts` + `firebase-applet-config.json` – Firebase connection
- `firestore.rules` – database security rules (paste into Firebase Console > Firestore > Rules)

## Support Us details
Edit `src/config/support.ts` (one number for bKash/Nagad/Rocket + bank details), then rebuild.

## Firebase rules
Paste `firestore.rules` into Firebase Console > Firestore > Rules > Publish.
It allows account deletion and the 24-hour OTP lock records (`otp_locks`).

## Build the APK / AAB
Push to GitHub, then Actions > "Build BloodLink APK" > Run workflow.
Download `BloodLink-debug-apk` from the run's artifacts.

For the signed Play Store file (`BloodLink-release-aab`) and a signed release APK, add these four
repository secrets once (Settings > Secrets and variables > Actions): `KEYSTORE_BASE64`,
`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. Never commit the keystore file.

## Update the app
Edit the code, push, and run the workflow again. Raise `versionCode` in
`android/app/build.gradle` for each release.
