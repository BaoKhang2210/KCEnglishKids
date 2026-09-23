# KCEnglishKids REST API Reference

## Authentication
- `GET /api/auth/children-avatars`: List active child avatars for visual sign-in.
- `POST /api/auth/child-login`: Authenticate with `{ avatar, pin }` or `{ childId, pin }`.
- `POST /api/auth/admin-login`: Authenticate admin with `{ email, password }`.
- `POST /api/auth/teacher-login`: Authenticate teacher with `{ email, password }`.
- `GET /api/auth/me`: Current user session.

## Topics & Lessons
- `GET /api/topics?ageGroup=3-4`: List topics filtered by age group.
- `GET /api/topics/:id`: Topic details.
- `GET /api/topics/:id/lessons?ageGroup=3-4&childId=...`: Lessons under a topic with child progress.
- `GET /api/lessons/:id`: Lesson details with vocabulary and activities.
- `GET /api/lessons/:id/activities`: Lesson activities list.

## Activities & Learning
- `GET /api/activities/:id`: Activity with question configurations.
- `POST /api/learning/sessions`: Start or resume learning session `{ lessonId, childId }`.
- `GET /api/learning/sessions/:id`: Get session state.
- `POST /api/learning/activity-results`: Record activity submission and update progress.

## Progress & Portals
- `GET /api/children/:id/progress`: Child star balance, completed lessons, and weak vocabulary.
- `GET /api/admin/dashboard`: Platform KPI statistics.
- `GET /api/admin/curriculum`: 3 Books & 27 Units hierarchy.
- `GET /api/teacher/classes`: Teacher's assigned classes and student roster.
- `GET /api/teacher/classes/:id`: Class details and student progress metrics.
