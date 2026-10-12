---
kind: build_system
name: Node.js Multi-Project Build via Vite + Express Scripts
category: build_system
scope:
    - '**'
source_files:
    - KCEnglishKids_BE/package.json
    - client/package.json
    - admin/package.json
    - client/tsconfig.app.json
    - client/tsconfig.node.json
    - admin/tsconfig.app.json
    - admin/tsconfig.node.json
    - client/vite.config.ts
    - admin/vite.config.ts
    - KCEnglishKids_BE/scripts/migrate_to_atlas.js
---

## What system/approach is used

The repository has no centralized build orchestrator (no Makefile, Dockerfile, CI pipeline, or root-level `build.sh`). Each sub-project manages its own build through npm scripts and the tooling declared in its own `package.json`:

- **Backend** (`KCEnglishKids_BE/`): plain Node.js CommonJS app. Entry point is `src/server.js`, started via `npm start`. Development uses `nodemon` (`npm run dev`).
- **Child/Teacher frontend** (`client/`): Vite + React + TypeScript SPA. Build chain is `tsc -b && vite build`; development is `vite dev`; linting is `oxlint`.
- **Admin SPA** (`admin/`): Vite + React + TypeScript SPA with the same build chain as the client: `tsc -b && vite build` and `vite dev`.

There are no container images, no cross-compilation, and no CI configuration files anywhere in the repo (a grep for `Dockerfile|Makefile|\.github|ci/|build\.sh|deploy` finds only an unrelated `is-ci` dependency inside a lockfile).

## Key files and packages

- `KCEnglishKids_BE/package.json` — backend entry (`start` → `node src/server.js`), dev server (`dev` → `nodemon src/server.js`), seed (`seed` → `node src/seeds/index.js`), Atlas migration (`migrate:atlas` → `scripts/migrate_to_atlas.js`). Declares `type: "commonjs"`.
- `client/package.json` — Vite dev/build/preview/lint scripts; deps include React 19, Tailwind v4, oxlint, TypeScript ~6.0.2, Vite 8.2.2. Declares `type: "module"`.
- `admin/package.json` — identical script surface to the client (dev/build/preview) with the same Vite/Tailwind/React/TS stack.
- `client/vite.config.ts` and `admin/vite.config.ts` — per-app Vite configuration (not shown here but referenced by the build scripts).
- `client/tsconfig.app.json` / `client/tsconfig.node.json` / `admin/tsconfig.app.json` / `admin/tsconfig.node.json` — separate TS configs for app and node build-time code, consumed by `tsc -b`.
- `KCEnglishKids_BE/scripts/` — one-off Node scripts (`check_curriculum_coverage.js`, `check_db.mjs`, `export_local_db.js`, `migrate_to_atlas.js`, `seed_20_students.js`) invoked directly via `node` from npm scripts.

## Architecture and conventions

- **Per-package builds**: each of the three top-level Node projects owns its own dependencies, scripts, and build artifacts under its own `dist/` directory. There is no monorepo tool (no `pnpm workspaces`, `lerna`, `nx`, etc.).
- **TypeScript frontends use project references**: both `client` and `admin` run `tsc -b` before `vite build`, which relies on the multi-config setup (`tsconfig.app.json` + `tsconfig.node.json` + root `tsconfig.json`).
- **Backend is CommonJS**: explicitly set via `"type": "commonjs"` in `KCEnglishKids_BE/package.json`, while the two frontends declare `"type": "module"`.
- **Dev vs prod separation**: `dev` scripts use hot-reload tools (`nodemon` for backend, `vite` for frontends); `build` scripts produce static assets (Vite outputs to `dist/`) that would be served by a web server or the backend's static file middleware.
- **No test harness**: the backend's `test` script deliberately fails with `echo "Error: no test specified" && exit 1`, indicating tests are not wired into the build.

## Conventions and constraints

- The backend entry point is fixed at `src/server.js` — changing it requires updating the `start` and `dev` scripts in `KCEnglishKids_BE/package.json`.
- Frontend builds require TypeScript compilation first (`tsc -b`), so type errors fail the build before Vite runs.
- Linting for the child/teacher client is configured via `oxlint` (`npm run lint` reads `.oxlintrc.json`); the admin SPA does not have a lint script defined.
- Environment variables are loaded via `dotenv` in the backend (see `KCEnglishKids_BE/.env` and `.env.local.backup`); there is no `.env` handling in the frontends' build scripts.
- Database seeding and migrations are ad-hoc Node scripts under `KCEnglishKids_BE/scripts/` and `KCEnglishKids_BE/src/seeds/`, invoked directly rather than through a migration framework.
- There is no automated release, packaging, or deployment step in this repository — publishing artifacts and deploying the built `dist/` directories is left to external processes.