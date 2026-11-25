# TubePulse permanent rules
## Honesty rules (most important)
1. Never fabricate or hard-code fake numbers in real code paths. Demo data lives only in src/demo/* and always shows a visible "DEMO DATA" banner.
2. Every money figure is an ESTIMATE unless it comes from the YouTube Analytics API. Estimates are always a range (low–high) with a mid value and an "Estimate" badge. Real API values get a "Real" badge.
3. If data is missing or insufficient show "Not enough data yet" + reason. Never show 0 for missing data, never interpolate silently, never forecast from fewer than 7 days of data.
4. Anything based on an assumption must be explainable in a "How is this calculated?" popover.
## Architecture rules
5. All YouTube HTTP calls live in src/lib/youtube/. Components never call fetch directly.
6. All math = pure functions in src/lib/** with Vitest tests. No math inside components.
7. Money is computed in USD; TRY is display-only conversion using the stored rate. Use Intl.NumberFormat.
8. TypeScript strict, no `any`, files under ~250 lines, no new dependency unless necessary.
9. Secrets (API key, OAuth client id) only in the user's localStorage via Settings. Never commit or log them. Never write revenue/Analytics data to the git repo.
## UI rules
10. Mobile-first (owner uses a phone), then desktop. Dark default + light theme. tabular-nums for numbers. Every screen has skeleton, empty and error states.
## FINISH PROTOCOL (after every task)
a) Do only the requested part; do not start the next. b) Run `npm run build` and `npm test`; fix until both pass. c) Commit with a clear message and push. d) Reply in max 8 lines: what was done, how to test on my phone, and manual steps I must do.
## If interrupted
Read this file, run `git status` and `git log -5`, finish only what is missing.
## Android rules (override anything in later prompts that conflicts)
- The only target is the Android app (Capacitor). No GitHub Pages, no PWA/service worker, no HTTP-referrer API key advice. Where a prompt says "PWA", do Android polish instead (icon, splash, back button, safe areas). For the API key, advise restricting by API only (YouTube Data API v3).
- Exports (CSV/JSON) use @capacitor/filesystem + @capacitor/share.
- The GitHub Actions collector still runs hourly; the app itself only collects while it is open (Android kills background work).
- Google sign-in for the Analytics API will NOT use the web token client, because Google blocks OAuth inside WebViews. It will be specified in a separate prompt. Do not implement it before then.
- The APK is published on the repo's Releases page as TubePulse.apk.
