---
kind: error_handling
name: Express Error Middleware with try/catch + next(error) Propagation
category: error_handling
scope:
    - '**'
source_files:
    - KCEnglishKids_BE/src/middlewares/errorMiddleware.js
    - KCEnglishKids_BE/src/app.js
    - KCEnglishKids_BE/src/controllers/authController.js
    - KCEnglishKids_BE/src/controllers/adminController.js
    - KCEnglishKids_BE/src/controllers/learningController.js
    - KCEnglishKids_BE/src/controllers/activityController.js
    - KCEnglishKids_BE/src/controllers/topicController.js
    - KCEnglishKids_BE/src/controllers/progressController.js
    - client/src/services/api.ts
---

## Backend (KCEnglishKids_BE)

The Express backend centralizes error handling in a single middleware file and uses the classic `try { ... } catch (error) { next(error); }` pattern inside every async controller.

**Core files**
- `KCEnglishKids_BE/src/middlewares/errorMiddleware.js` — defines two middlewares: `notFound` (404 for unmatched routes) and `errorHandler` (global 5xx handler).
- `KCEnglishKids_BE/src/app.js` — registers `cors`, `express.json`, all route modules, then mounts `notFound` and `errorHandler` at the end of the stack so they run last.

**Architecture**

1. **Route-level errors are returned directly**: Controllers return `res.status(…).json({ success: false, message: '…' })` for client-facing validation / not-found cases (e.g. `activityController.js` returns 404 when an activity is missing; `learningController.js` returns 400 for invalid payloads). These short-circuit the middleware chain and never reach `errorHandler`.
2. **Unexpected/DB errors are propagated via `next(error)`**: Every async controller wraps its body in `try { … } catch (error) { next(error); }`. This funnels Mongoose/MongoDB exceptions into the global handler.
3. **Global handler (`errorMiddleware.js`)**:
   - `notFound`: creates `new Error('Not Found - ${req.originalUrl}')` and calls `next(error)`.
   - `errorHandler`: reads `res.statusCode`; if it is still 200, upgrades to 500. Responds with `{ success: false, message: err.message || 'Internal Server Error', stack: process.env.NODE_ENV === 'production' ? null : err.stack }`.
   - The `stack` field is suppressed in production, exposing only the plain message.

**No custom error classes or sentinel codes**: There is no dedicated `errors/` directory, no `AppError` subclass, and no HTTP status code constants. Errors are either plain `Error` objects passed through `next()` or inline `res.status(...).json(...)` responses.

**Auth flow**: `authController.js` follows the same pattern — validation failures return `res.status(400|401|404).json({ success: false, message })`, while DB/auth failures go through `next(error)`.

## Frontend (client/)

The React client has a thin HTTP layer in `client/src/services/api.ts` that normalizes all fetch calls:

- Each method (`get`, `post`, `patch`, `put`, `delete`) awaits `fetch`, parses JSON, then checks `!res.ok`. On failure it throws `new Error(data.message || 'Request failed')`, where `data.message` comes from the backend's `{ success: false, message }` envelope.
- Callers (pages, contexts, components) wrap API calls in `try/catch` and surface the error string to the UI (e.g. `TeacherLoginPage.tsx` stores `err.message` in local state and renders it).
- Some non-critical operations swallow errors silently (e.g. `ResultModal.tsx` catches audio errors with an empty `catch(e){}`, `AudioButton.tsx` logs via `console.warn`).

There is no centralized frontend error boundary or toast/notification system visible in the searched scope; error presentation is ad-hoc per component.

## Conventions observed

- Backend controllers use the `async (req, res, next) => { try { … } catch (error) { next(error); } }` shape consistently across `authController.js`, `adminController.js`, `learningController.js`, `topicController.js`, `progressController.js`, `activityController.js`, etc.
- Client-facing errors are returned as `res.status(code).json({ success: false, message: '…' })` rather than throwing; only unexpected/internal errors are forwarded via `next(error)`.
- The global `errorHandler` is the sole producer of 5xx responses; it derives the status from `res.statusCode` and falls back to 500 when no status was set.
- Stack traces are hidden in production (`process.env.NODE_ENV === 'production' ? null : err.stack`).
- Frontend HTTP errors are uniformly converted to thrown `Error`s carrying the backend's `message` field, so callers can display user-readable text without inspecting status codes.