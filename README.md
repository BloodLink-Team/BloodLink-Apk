# BloodLink

Self-contained Android app (React + Capacitor). No backend server: donor data is stored in
Firebase Firestore, and the help assistant answers from the built-in FAQ list.

## Where things are
- `src/App.tsx` – screens (search, register, donor profile)
- `src/services/api.ts` – all Firestore reads/writes for donors
- `src/components/SideMenuPages.tsx` – side menu pages and the FAQ list (`BLOOD_DONATION_FAQS`)
- `src/components/FaqAssistantModal.tsx` – offline assistant (uses `src/utils/faqSearch.ts`)
- `src/firebase.ts` + `firebase-applet-config.json` – Firebase connection
- `firestore.rules` – database security rules (paste into Firebase Console > Firestore > Rules)

## Build the APK
Push to GitHub, then Actions > "Build BloodLink APK" > Run workflow.
Download `BloodLink-debug-apk` from the run's artifacts.

## Update the app
Edit the code, push, and run the workflow again. Raise `versionCode` in
`android/app/build.gradle` for each release.
