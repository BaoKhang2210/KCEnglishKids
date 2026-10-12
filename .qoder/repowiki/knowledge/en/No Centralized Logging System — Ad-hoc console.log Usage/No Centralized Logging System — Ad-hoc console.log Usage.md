---
kind: logging_system
name: No Centralized Logging System — Ad-hoc console.log Usage
category: logging_system
scope:
    - '**'
source_files:
    - KCEnglishKids_BE/package.json
    - KCEnglishKids_BE/src/app.js
    - KCEnglishKids_BE/src/middlewares/errorMiddleware.js
    - KCEnglishKids_BE/src/config/db.js
    - KCEnglishKids_BE/src/seeds/index.js
    - KCEnglishKids_BE/src/scripts/enrichCurriculumDatabase.js
---

## Summary

This repository does **not** implement a centralized logging system. There is no logging framework (no `winston`, `pino`, `bunyan`, `morgan`, `log4js`, or similar) in any of the three application layers. All output goes directly to the process stdout/stderr via native `console` methods.

## Backend (`KCEnglishKids_BE`)

- `package.json` lists zero logging dependencies; only `express`, `mongoose`, `cors`, `dotenv`, `jsonwebtoken`, and `bcryptjs` are declared as runtime dependencies.
- The Express app (`src/app.js`) wires no request logger middleware (no `morgan`, no custom access-log middleware). Requests are not logged at all.
- Errors flow through a single global error handler in `src/middlewares/errorMiddleware.js`, which returns a JSON `{ success, message, stack }` response. It does **not** write the error to any log sink — it only serializes it back to the HTTP client. Stack traces are suppressed when `process.env.NODE_ENV === 'production'`.
- Operational logs are scattered as bare `console.log` / `console.warn` / `console.error` calls:
  - `src/config/db.js`: MongoDB connection status messages (`[MongoDB Connected]`, `[MongoDB Warning]`, `[MongoDB Connection Error]`).
  - `src/scripts/enrichCurriculumDatabase.js`: step-by-step progress for curriculum enrichment scripts.
  - `src/seeds/index.js`: `[Seed]` prefixed progress lines during database seeding.
  - Controllers and routes do not emit their own logs; they rely on the global error handler for failures.
- No structured log fields, no log levels beyond the implicit `console.*` method, and no log rotation or file sinks.

## Frontend clients (`client/` and `admin/`)

- Both React/Vite SPAs use `console.log` / `console.warn` / `console.error` directly in components and services (e.g., `AuthContext.tsx`, `TeacherDashboardPage.tsx`, `ActivityPlayPage.tsx`, `vocabMasteryService.ts`).
- No browser-side logger library (e.g., `loglevel`, `pino-browser`) is imported anywhere.
- No central error boundary captures and forwards errors to a logging service.

## Conventions observed

- Log prefixes are used informally to identify subsystems: `[MongoDB ...]` in DB config, `[Seed]` in seeds, `[vocabMastery]` in the vocab mastery service.
- Production vs development behavior is controlled by `NODE_ENV` only in the error middleware (stack suppression); there is no equivalent log-level filter because there is no logger abstraction.
- Audit data is persisted to MongoDB via the `AuditLog` model rather than written to a separate audit log file — this is the closest thing to an audit trail in the codebase.