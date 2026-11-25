# TubePulse

Finance-grade YouTube analytics for creators — shipped as an Android app (Capacitor).

All money figures are **estimates** unless they come from the YouTube Analytics API. Every
estimate is a low–high range with a mid value and an "Estimate" badge. If data is missing, the
app says **"Not enough data yet"** and explains why.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS · React Router (HashRouter) · Recharts ·
lucide-react · idb · Capacitor · Vitest + Testing Library.

## Develop

```bash
npm install
npm run dev     # web preview in the browser
npm test
npm run build
```

## Android

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Requires Android SDK 24+ and JDK 17. The APK is built by GitHub Actions on every push to
`main` and published on the repository's Releases page as `TubePulse.apk`.

## Install on a phone

1. Open the repo's **Releases** page and download `TubePulse.apk`.
2. Allow "Install unknown apps" for your browser or file manager when Android asks.
3. Open the downloaded APK and tap **Install**. Updates install over the old app because every
   build is signed with the same committed debug keystore.

## Rules

Permanent product and architecture rules live in [AGENTS.md](./AGENTS.md). Read it before
changing anything.
