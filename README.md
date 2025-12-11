# Fleet Backend


----
## Optimizations & Deployment Notes (added)

Changes included in this optimized package:
- Added `/api/health` endpoint for liveness checks.
- Vendor poller is now controlled by `ENABLE_VENDOR_POLLER` env var (set to 'true' to enable). Default is disabled.
- Added graceful shutdown handlers for SIGINT/SIGTERM to disconnect Prisma cleanly.
- Added basic guards to vendorPoller and telemetry processing to avoid crashes on malformed data.
- Dockerfile for Node 18 (alpine) and `render.yaml` for Render deployment included.
- Consider swapping `bcrypt` -> `bcryptjs` (if not already) to avoid native build issues on some platforms.

Deployment reminders:
- Ensure `DATABASE_URL`, `JWT_SECRET` and optional `MILLITRACK_*` env vars are set.
- To disable external vendor polling in staging, set `ENABLE_VENDOR_POLLER=false`

