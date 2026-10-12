---
kind: external_dependency
name: MongoDB Atlas — Cloud Deployment Target
slug: mongodb-atlas
category: external_dependency
category_hints:
    - client_constraint
scope:
    - '**'
---

### MongoDB Atlas
- Role: Cloud-hosted MongoDB deployment target, separate from the default local MongoDB used during development.
- Wired via `ATLAS_MONGODB_URI` env var and a dedicated migration script `scripts/migrate_to_atlas.js` (npm script `migrate:atlas`) that moves data from local to Atlas.
- Not auto-selected by the runtime connection logic — the app uses `MONGODB_URI`; Atlas is reached through the explicit migration path or by setting `MONGODB_URI` to the Atlas URI.