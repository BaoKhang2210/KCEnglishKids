---
kind: external_dependency
name: MongoDB (Atlas + Local) — Persistence Layer
slug: mongodb
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

### MongoDB
- Role: Primary persistence for all Mongoose models (Curriculum, Topic, Lesson, Activity, User, Progress, etc.).
- Deployment variants: local MongoDB server (`localhost:27017`) and MongoDB Atlas (`ATLAS_MONGODB_URI` in `.env.local.backup`). The config only tries the first candidate from its list, so switching between local/Atlas is controlled by which URI is set in `MONGODB_URI`.
- Database name: `kcenglishkids`.