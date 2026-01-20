# Session Log Index

This directory contains session logs documenting work done on the Landlord project.

## Recent Sessions

| Date | Focus | Summary |
|------|-------|---------|
| 2026-01-19 #3 | Build Fixes & Phase 2 Commit | Fixed build errors, committed Phase 2 work, renamed main branch |
| 2026-01-19 #2 | Recurring Tasks UI | Built full recurring tasks feature with tabbed UI, form, table, and task generation |
| 2026-01-19 #1 | GPS Auto-Navigation | Implemented location-based auto-navigation to nearby units with settings toggle |
| 2026-01-18 #2 | Task Photos Feature | Added photo upload/viewing to task detail pages with automatic unit tagging |
| 2026-01-18 #1 | iOS Simulator & Offline Fix | Set up Xcode/iOS Simulator, fixed cacheData() NOT NULL constraint error for leases |

## Current Work In Progress

- **Phase 2 Complete**: All Phase 2 code committed and merged to `main` branch
- **Recurring Tasks**: UI complete, but automated task generation (cron/edge function) not yet implemented
- **GPS Auto-Navigation**: Units need lat/lng populated (via geocoding API or manual entry) to enable auto-navigation
- **iOS Simulator Ready**: Xcode + iOS 26.2 runtime installed, use `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start` for simulator
- **Mobile Testing**: Login credentials: `e2e-test@example.com` / `testpassword123`
- **Main Branch**: Renamed from `claude/sort-photos-by-location-zWFb1` to `main`


## Notes

- Session files are named `YYYY-MM-DD-session-N.md`
- Older sessions removed from this table but files retained
- See `knowledge/DEPLOYMENT.md` for production deployment guide
