---
kind: dependency_management
name: Multi-package npm dependency management with lockfiles per workspace
category: dependency_management
scope:
    - '**'
source_files:
    - KCEnglishKids_BE/package.json
    - KCEnglishKids_BE/package-lock.json
    - client/package.json
    - client/package-lock.json
    - admin/package.json
    - admin/package-lock.json
---

## Approach

The repository is a monorepo of three independent Node.js/TypeScript projects, each managing its own dependencies via **npm** (`package.json` + `package-lock.json`). There is no top-level `package.json`, no `pnpm-workspace.yaml`, no `yarn.lock`, and no vendoring — each subproject is self-contained.

| Project | Runtime deps | Build toolchain | Lockfile |
|---|---|---|---|
| `KCEnglishKids_BE` (Express/Mongoose backend) | `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv` | `nodemon` (dev) | `package-lock.json` |
| `client` (child/teacher React SPA) | `react`, `react-dom`, `react-router-dom`, `lucide-react`, `tailwind-merge`, `canvas-confetti`, `howler`, `clsx` | Vite + TypeScript + Tailwind v4 + Oxlint | `package-lock.json` |
| `admin` (React admin SPA) | `react`, `react-dom`, `react-router-dom`, `lucide-react`, `tailwind-merge`, `clsx` | Vite + TypeScript + Tailwind v4 | `package-lock.json` |

## Key files

- `KCEnglishKids_BE/package.json` — backend manifest; declares CommonJS (`"type": "commonjs"`) and runtime-only deps.
- `client/package.json` — child/teacher frontend manifest; declares ESM (`"type": "module"`), TypeScript (`~6.0.2`), Vite (`^8.2.2`), React 19, Tailwind CSS v4, Oxlint.
- `admin/package.json` — admin SPA manifest; mirrors the client's stack minus audio/game libs.
- Each directory ships a `package-lock.json` pinning exact resolved versions.

## Conventions observed

- **Per-project manifests**: Dependencies are declared in each project's own `package.json`; there is no shared workspace config or hoisted dependency tree.
- **Version ranges use caret (`^`)**: All third-party versions are pinned with `^` (e.g. `express ^5.2.1`, `react ^19.2.8`), allowing patch/minor updates while blocking major bumps.
- **Lockfiles committed**: Every project has a `package-lock.json` checked into the repo, ensuring deterministic installs across environments.
- **Shared UI stack aligned by convention**: The `client` and `admin` SPAs intentionally keep their runtime and dev dependencies in sync (same versions of `react`, `react-dom`, `react-router-dom`, `lucide-react`, `tailwind-merge`, `clsx`, `@types/react*`, `@vitejs/plugin-react`, `tailwindcss`, `typescript ~6.0.2`, `vite ^8.2.2`) so that code sharing between them stays compatible. This alignment is not enforced by a script — it is an observed convention.
- **No private registry / no vendoring**: No `.npmrc`, no `GOPRIVATE`, no `vendor/` directories, no custom registries are present in any package manifest.
- **Dev vs runtime separation**: Only build-time tools (Vite, TypeScript, Oxlint, Tailwind plugin, type packages) live under `devDependencies`; runtime libraries live under `dependencies`. The backend follows the same split (`nodemon` is dev-only).
- **Scripts as entry points**: `npm start` / `npm run dev` / `npm run build` are the only documented ways to install and run each project; there is no top-level orchestrator script.