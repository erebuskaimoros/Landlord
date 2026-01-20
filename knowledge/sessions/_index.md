# Session Log Index

This directory contains session logs documenting work done on the Landlord project.

## Recent Sessions

| Date | Focus | Summary |
|------|-------|---------|
| 2026-01-19 #2 | Recurring Tasks UI | Built full recurring tasks feature with tabbed UI, form, table, and task generation |
| 2026-01-19 #1 | GPS Auto-Navigation | Implemented location-based auto-navigation to nearby units with settings toggle |
| 2026-01-18 #2 | Task Photos Feature | Added photo upload/viewing to task detail pages with automatic unit tagging |
| 2026-01-18 #1 | iOS Simulator & Offline Fix | Set up Xcode/iOS Simulator, fixed cacheData() NOT NULL constraint error for leases |
| 2026-01-16 #1 | Mobile App on iPhone | Fixed expo-sqlite web error, configured LAN/tunnel modes, got app running on physical iPhone |

## Current Work In Progress

- **Recurring Tasks**: UI complete, but automated task generation (cron/edge function) not yet implemented
- **GPS Auto-Navigation**: Units need lat/lng populated (via geocoding API or manual entry) to enable auto-navigation
- **iOS Simulator Ready**: Xcode + iOS 26.2 runtime installed, use `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start` for simulator
- **Mobile Testing**: Login credentials: `e2e-test@example.com` / `testpassword123`


## Notes

- Session files are named `YYYY-MM-DD-session-N.md`
- Older sessions removed from this table but files retained
- See `knowledge/DEPLOYMENT.md` for production deployment guide
