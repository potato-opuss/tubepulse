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

## History & background collection

TubePulse measures growth from public Data API counters only — never revenue.

- **In-app collector:** takes a snapshot when the app opens and then every 1, 5 or 15 minutes
  (Settings). It pauses while the app is hidden, and only writes when a counter changed or 15
  minutes have passed. Snapshots live in IndexedDB on the device; the header shows a live dot
  with the age of the last update.
- **GitHub collector:** `.github/workflows/collect.yml` runs hourly and calls
  `scripts/collect.mjs`, which appends to `snapshots.json` on a separate `data` branch (created
  automatically). Hourly points are kept for 14 days, then compacted to one point per day.
- **Remote merge:** set `owner/repo` in Settings → History. The app reads
  `raw.githubusercontent.com/<owner>/<repo>/data/snapshots.json` and merges it into IndexedDB,
  de-duplicated by timestamp.
- **Backup:** Settings can export/import all snapshots as a JSON file (Capacitor Filesystem +
  Share on Android).

### Manual setup for the GitHub collector

1. Repository → Settings → Secrets and variables → Actions → **New repository secret**:
   `YT_API_KEY` = your YouTube Data API v3 key.
2. Same page → **Variables** → **New repository variable**: `YT_CHANNEL_ID` = the channel id
   (`UC…`).
3. Run **Collect public YouTube stats** once from the Actions tab (or wait for the next hour).
   The `data` branch and `snapshots.json` appear automatically.

**Caveats:** GitHub scheduled workflows can be delayed (often by 5–20 minutes, sometimes
skipped under load). GitHub also disables scheduled workflows after **60 days without repository
activity**; push a commit or run the workflow manually to re-enable it. The in-app collector only
runs while the app is open, because Android kills background work.

## Rules

Permanent product and architecture rules live in [AGENTS.md](./AGENTS.md). Read it before
changing anything.
