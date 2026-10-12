---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Khung chương trình chuẩn
- Definition：The official curriculum foundation layer of KCEnglishKids, composed of 3 Books (Book 1–3) covering ages 3–6, organized into 27 Units marked with `sourceType: OFFICIAL_CURRICULUM`. It represents textbook references, big questions, story titles, and educational objectives — distinct from the application learning experience.
- Aliases：Curriculum Foundation、Tầng Chương Trình

### Trải nghiệm học tập tương tác
- Definition：The application learning experience layer sitting on top of the Curriculum Foundation. It comprises App Topics, Lessons, Vocabulary & Media Assets, Activities (configurable models such as LISTEN_CHOOSE, MATCHING, MEMORY), Learning Sessions, Activity Results, Progress records, and Stars.
- Aliases：Application Learning Experience、Tầng Ứng Dụng

### OFFICIAL_CURRICULUM
- Definition：A classification value marking content that belongs to the official 27-Unit curriculum (Books 1–3, ages 3–6). Content tagged this way is part of the Curriculum Foundation rather than ad-hoc application content.

### CHILD
- Definition：One of the three actor roles in KCEnglishKids. Children (ages 3–6) authenticate by selecting an avatar and entering a 4-digit PIN (bcrypt-hashed); they receive a restricted child session token and access age-appropriate lessons and activities.
- Aliases：trẻ em、học sinh

### TEACHER
- Definition：One of the three actor roles. Teachers authenticate via JWT and manage class rosters, classroom sessions, and student progress/completion records scoped to their classes.
- Aliases：giáo viên

### ADMIN
- Definition：One of the three actor roles. Admins authenticate via JWT and manage the full curriculum (27 Units, topics, lessons), media assets, and view KPI statistics.
- Aliases：quản trị viên
