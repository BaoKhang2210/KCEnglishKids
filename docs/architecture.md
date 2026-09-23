# KCEnglishKids Architecture

## 1. Domain Separation

KCEnglishKids distinguishes strictly between two key layers:

### A. Curriculum Foundation (Tầng Chương Trình)
- **Book 1** (Age 3–4) → 9 Units
- **Book 2** (Age 4–5) → 9 Units
- **Book 3** (Age 5–6) → 9 Units
- Represents textbook references, big questions, story titles, and official educational values (`sourceType: OFFICIAL_CURRICULUM`).

### B. Application Learning Experience (Tầng Ứng Dụng)
- **App Topics** (Animals, Colors, Food, Toys, Numbers, etc.)
- **Lessons** (e.g. Pet Animals)
- **Vocabulary & Media Assets** (SVGs, native pronunciation audio)
- **Activities** (Configurable models e.g. `LISTEN_CHOOSE`, `MATCHING`, `MEMORY`)
- **Sessions & Progress** (`LearningSession`, `ActivityResult`, `Progress`, `WeakVocabulary`)

## 2. Audio Engine
- **Howler.js**: Streams remote audio pronunciation URLs.
- **Web Audio API Sound Synthesizer**: Synthesizes pleasant musical chime progressions for correct answers, gentle wobble for wrong attempts, and brass fanfare chords for star celebrations with zero external file dependencies.
- **Web Speech Synthesis Fallback**: Ensures pronunciations play reliably across all operating systems and network states.

## 3. Security & Actors
- **ADMIN**: JWT token, management of topics, curriculum, and KPIs.
- **TEACHER**: JWT token, scoped class rosters and student completion records.
- **CHILD**: Avatar selection + 4-digit bcrypt-hashed PIN. Returns restricted child session token.
