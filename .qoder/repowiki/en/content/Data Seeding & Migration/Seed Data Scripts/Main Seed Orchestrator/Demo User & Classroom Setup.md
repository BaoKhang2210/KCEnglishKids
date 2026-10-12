# Demo User & Classroom Setup

<cite>
**Referenced Files in This Document**
- [index.js](file://KCEnglishKids_BE/src/seeds/index.js)
- [users.json](file://KCEnglishKids_BE/data_backup/users.json)
- [classrooms.json](file://KCEnglishKids_BE/data_backup/classrooms.json)
- [progresses.json](file://KCEnglishKids_BE/data_backup/progresses.json)
- [classroomsessions.json](file://KCEnglishKids_BE/data_backup/classroomsessions.json)
- [parentnotifications.json](file://KCEnglishKids_BE/data_backup/parentnotifications.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the demo user and classroom setup created by the backend seeding process. It covers how administrative users, teacher accounts, and multiple child accounts are generated; how a classroom is created with student enrollment; how learning progress and sample activity results are initialized; how passwords and PINs are configured; how avatars are generated using an SVG system; and how a sample classroom session and parent notification complete the end-to-end demo journey.

The focus is on understanding what data is created, how it relates to each other, and how the seed script orchestrates the full demo environment for KCEnglishKids.

## Project Structure
The demo setup lives primarily in the backend seed script and is reflected in the backup data files that represent the seeded database state.

```mermaid
graph TB
Seed["Seed Script<br/>src/seeds/index.js"] --> Users["Users<br/>data_backup/users.json"]
Seed --> Classrooms["Classrooms<br/>data_backup/classrooms.json"]
Seed --> Progresses["Progress Records<br/>data_backup/progresses.json"]
Seed --> Sessions["Classroom Sessions<br/>data_backup/classroomsessions.json"]
Seed --> Notifications["Parent Notifications<br/>data_backup/parentnotifications.json"]
```

**Diagram sources**
- [index.js:125-755](file://KCEnglishKids_BE/src/seeds/index.js#L125-L755)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)
- [classrooms.json:1-35](file://KCEnglishKids_BE/data_backup/classrooms.json#L1-L35)
- [progresses.json:1-167](file://KCEnglishKids_BE/data_backup/progresses.json#L1-L167)
- [classroomsessions.json:1-800](file://KCEnglishKids_BE/data_backup/classroomsessions.json#L1-L800)
- [parentnotifications.json:1-800](file://KCEnglishKids_BE/data_backup/parentnotifications.json#L1-L800)

**Section sources**
- [index.js:125-755](file://KCEnglishKids_BE/src/seeds/index.js#L125-L755)

## Core Components
The seed script creates the following core demo components:

- Administrative user: admin
- Teacher account: teacher_sarah
- Child accounts: Leo, Mia, Toby, plus additional demo students
- Classroom: Little Stars Class (Age 3–4)
- Learning progress records for selected lessons
- Sample vocabulary mastery records
- Sample classroom session with per-student scores
- Sample parent notification linked to a session

These components form a complete demo learning journey from user creation to classroom participation and parent reporting.

**Section sources**
- [index.js:456-694](file://KCEnglishKids_BE/src/seeds/index.js#L456-L694)

## Architecture Overview
The seed script connects to MongoDB, clears collections, seeds curriculum content, then creates demo users, classroom, progress, sessions, and notifications. The relationships are:

- Admin and Teacher are User documents.
- Children are User documents with role CHILD.
- Classroom references a Teacher and stores enrolled Student IDs.
- Progress links a Child to a Topic and Lesson.
- ClassroomSession links Classroom, Teacher, Lesson, Activities, and per-student scores.
- ParentNotification links Teacher, Child, Session, and contact information.

```mermaid
graph TB
Admin["Admin User<br/>role: ADMIN"]
Teacher["Teacher User<br/>role: TEACHER"]
Leo["Child User<br/>Leo"]
Mia["Child User<br/>Mia"]
Toby["Child User<br/>Toby"]
ExtraStudents["Extra Demo Students"]
Classroom["Classroom<br/>Little Stars Class (Age 3–4)"]
Progress["Progress<br/>child → topic → lesson"]
Session["ClassroomSession<br/>lesson + activities + studentScores"]
Notification["ParentNotification<br/>teacher → child → session"]
Admin --> |manages| Classroom
Teacher --> |owns| Classroom
Classroom --> |enrolls| Leo
Classroom --> |enrolls| Mia
Classroom --> |enrolls| Toby
Classroom --> |enrolls| ExtraStudents
Leo --> Progress
Mia --> Progress
Session --> |reports| Leo
Session --> |reports| Mia
Notification --> |notifies about| Leo
Notification --> |notifies about| Mia
```

**Diagram sources**
- [index.js:456-694](file://KCEnglishKids_BE/src/seeds/index.js#L456-L694)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)
- [classrooms.json:1-35](file://KCEnglishKids_BE/data_backup/classrooms.json#L1-L35)
- [progresses.json:1-167](file://KCEnglishKids_BE/data_backup/progresses.json#L1-L167)
- [classroomsessions.json:1-800](file://KCEnglishKids_BE/data_backup/classroomsessions.json#L1-L800)
- [parentnotifications.json:1-800](file://KCEnglishKids_BE/data_backup/parentnotifications.json#L1-L800)

## Detailed Component Analysis

### Administrative User Creation
The seed script creates an administrative user with:
- Role: ADMIN
- Username: admin
- Email: admin@kcenglishkids.com
- Password: Admin@123
- Name: System Administrator
- Avatar: bear
- Avatar URL: dynamically generated SVG card
- Status: ACTIVE

The avatar is generated via an SVG helper that produces a colorful card with an emoji and name text.

```mermaid
flowchart TD
Start(["Create Admin User"]) --> SetFields["Set role, username, email,<br/>password, name, avatar, avatarUrl, status"]
SetFields --> SaveUser["Save admin user to database"]
SaveUser --> End(["Admin ready"])
```

**Diagram sources**
- [index.js:458-468](file://KCEnglishKids_BE/src/seeds/index.js#L458-L468)

**Section sources**
- [index.js:458-468](file://KCEnglishKids_BE/src/seeds/index.js#L458-L468)
- [users.json:1-16](file://KCEnglishKids_BE/data_backup/users.json#L1-L16)

### Teacher Account Creation
The seed script creates a teacher account with:
- Role: TEACHER
- Username: teacher_sarah
- Email: teacher@kcenglishkids.com
- Password: Teacher@123
- Name: Ms. Sarah Johnson
- Avatar: fox
- Avatar URL: dynamically generated SVG card
- Status: ACTIVE
- Assigned class reference updated after classroom creation

```mermaid
flowchart TD
Start(["Create Teacher User"]) --> SetFields["Set role, username, email,<br/>password, name, avatar, avatarUrl, status"]
SetFields --> SaveUser["Save teacher user to database"]
SaveUser --> AssignClass["Assign teacher to classroom"]
AssignClass --> End(["Teacher ready"])
```

**Diagram sources**
- [index.js:470-492](file://KCEnglishKids_BE/src/seeds/index.js#L470-L492)

**Section sources**
- [index.js:470-492](file://KCEnglishKids_BE/src/seeds/index.js#L470-L492)
- [users.json:17-32](file://KCEnglishKids_BE/data_backup/users.json#L17-L32)

### Classroom Structure and Student Enrollment
The seed script creates a classroom named "Little Stars Class (Age 3–4)" with:
- Teacher reference set to teacher_sarah
- Age group: 3-4
- Academic year: 2026-2027
- Initial empty student list
- Status: ACTIVE

After creating children, the script enrolls Leo and Mia into the classroom and updates the classroom’s student list. Additional demo students are also enrolled.

```mermaid
flowchart TD
Start(["Create Classroom"]) --> SetFields["Set name, teacher, ageGroup,<br/>ageGroupCode, academicYear, status"]
SetFields --> SaveClassroom["Save classroom to database"]
SaveClassroom --> EnrollLeo["Enroll Leo"]
EnrollLeo --> EnrollMia["Enroll Mia"]
EnrollMia --> EnrollExtras["Enroll extra demo students"]
EnrollExtras --> UpdateList["Update classroom.students array"]
UpdateList --> End(["Classroom ready"])
```

**Diagram sources**
- [index.js:482-590](file://KCEnglishKids_BE/src/seeds/index.js#L482-L590)

**Section sources**
- [index.js:482-590](file://KCEnglishKids_BE/src/seeds/index.js#L482-L590)
- [classrooms.json:1-35](file://KCEnglishKids_BE/data_backup/classrooms.json#L1-L35)

### Child Accounts: Leo, Mia, Toby, and Additional Demo Students
The seed script creates three primary child accounts:

- Leo
  - Role: CHILD
  - Name: Leo
  - Email: leo@kcenglishkids.com
  - Phone and contact: 0901234567
  - Avatar: lion
  - Avatar URL: SVG card
  - Password: 123456
  - PIN: 1234
  - Age group: 3-4
  - Assigned class: Little Stars Class
  - Status: ACTIVE

- Mia
  - Role: CHILD
  - Name: Mia
  - Email: mia@kcenglishkids.com
  - Phone and contact: 0902345678
  - Avatar: panda
  - Avatar URL: SVG card
  - Password: 123456
  - PIN: 5678
  - Age group: 3-4
  - Assigned class: Little Stars Class
  - Status: ACTIVE

- Toby
  - Role: CHILD
  - Name: Toby
  - Email: toby@kcenglishkids.com
  - Phone and contact: 0903456789
  - Avatar: rabbit
  - Avatar URL: SVG card
  - Password: 123456
  - PIN: 1111
  - Age group: 4-5
  - Status: ACTIVE

Additional demo students include Emma, Liam, Sophia, Noah, Ava, Oliver, Lucas, Isabella, Ethan, Harper, Chloe, Mason, James, Ella, Jackson, Lily, Henry, Grace. Each has:
- Role: CHILD
- Unique name, email, phone/contact
- Avatar and SVG avatar URL
- Password: 123456
- Unique PIN
- Age group: 3-4
- Assigned class: Little Stars Class
- Status: ACTIVE

```mermaid
flowchart TD
Start(["Create Child Users"]) --> CreateLeo["Create Leo<br/>password, pin, ageGroup, assignedClass"]
CreateLeo --> CreateMia["Create Mia<br/>password, pin, ageGroup, assignedClass"]
CreateMia --> CreateToby["Create Toby<br/>password, pin, ageGroup"]
CreateToby --> CreateExtras["Create extra demo students<br/>loop over names, pins, avatars"]
CreateExtras --> EnrollAll["Enroll Leo, Mia, extras into classroom"]
EnrollAll --> End(["Children ready"])
```

**Diagram sources**
- [index.js:494-587](file://KCEnglishKids_BE/src/seeds/index.js#L494-L587)

**Section sources**
- [index.js:494-587](file://KCEnglishKids_BE/src/seeds/index.js#L494-L587)
- [users.json:33-468](file://KCEnglishKids_BE/data_backup/users.json#L33-L468)

### Password and PIN Configuration
- Admin password: Admin@123
- Teacher password: Teacher@123
- Child passwords: 123456 for all demo children
- Child PINs:
  - Leo: 1234
  - Mia: 5678
  - Toby: 1111
  - Extra students: unique numeric PINs starting at 2001

In the backed-up database, passwords and PINs are stored as hashed values, indicating secure storage.

```mermaid
flowchart TD
Start(["Configure Credentials"]) --> AdminPass["Admin password: Admin@123"]
AdminPass --> TeacherPass["Teacher password: Teacher@123"]
TeacherPass --> ChildPass["Child password: 123456"]
ChildPass --> ChildPins["Child PINs:<br/>Leo=1234, Mia=5678, Toby=1111,<br/>extras=2001..2018"]
ChildPins --> HashedStorage["Stored as hashed values in DB"]
HashedStorage --> End(["Credentials ready"])
```

**Diagram sources**
- [index.js:458-587](file://KCEnglishKids_BE/src/seeds/index.js#L458-L587)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)

**Section sources**
- [index.js:458-587](file://KCEnglishKids_BE/src/seeds/index.js#L458-L587)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)

### Avatar Generation Using the SVG System
The seed script defines a function that generates SVG-based avatar cards:
- Background color chosen from a vibrant palette
- Emoji mapped from a rich emoji dictionary
- Text label showing role or name
- Output as a data URL containing SVG markup

This system is used for:
- Admin avatar: bear emoji with "ADMIN" label
- Teacher avatar: fox emoji with "TEACHER" label
- Child avatars: animal emojis with child names

```mermaid
flowchart TD
Start(["Generate Avatar"]) --> ChooseBg["Choose background color from palette"]
ChooseBg --> MapEmoji["Map emoji from word key"]
MapEmoji --> BuildSvg["Build SVG string with emoji and text"]
BuildSvg --> EncodeDataUrl["Encode as data:image/svg+xml"]
EncodeDataUrl --> StoreAvatar["Store avatarUrl on user"]
StoreAvatar --> End(["Avatar ready"])
```

**Diagram sources**
- [index.js:37-123](file://KCEnglishKids_BE/src/seeds/index.js#L37-L123)
- [index.js:458-587](file://KCEnglishKids_BE/src/seeds/index.js#L458-L587)

**Section sources**
- [index.js:37-123](file://KCEnglishKids_BE/src/seeds/index.js#L37-L123)
- [index.js:458-587](file://KCEnglishKids_BE/src/seeds/index.js#L458-L587)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)

### Relationship Between Users, Classrooms, and Learning Progress
- Users:
  - Admin and Teacher are administrative roles.
  - Children are learners with age groups and optional classroom assignment.
- Classroom:
  - Owned by a teacher.
  - Contains a list of enrolled student IDs.
- Progress:
  - Links a child to a topic and lesson.
  - Tracks completion, stars, highest score, attempts, and weak vocabulary.

```mermaid
erDiagram
USER {
string role
string username
string email
string name
string avatar
string avatarUrl
string status
string password
string pin
string ageGroupCode
string assignedClass
}
CLASSROOM {
string name
string ageGroupCode
string academicYear
string status
}
PROGRESS {
boolean completed
int stars
int highestScore
int attempts
}
USER ||--o{ CLASSROOM : "teacher owns"
CLASSROOM ||--o{ USER : "students enrolled"
USER ||--o{ PROGRESS : "child has"
```

**Diagram sources**
- [index.js:456-604](file://KCEnglishKids_BE/src/seeds/index.js#L456-L604)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)
- [classrooms.json:1-35](file://KCEnglishKids_BE/data_backup/classrooms.json#L1-L35)
- [progresses.json:1-167](file://KCEnglishKids_BE/data_backup/progresses.json#L1-L167)

**Section sources**
- [index.js:456-604](file://KCEnglishKids_BE/src/seeds/index.js#L456-L604)
- [users.json:1-468](file://KCEnglishKids_BE/data_backup/users.json#L1-L468)
- [classrooms.json:1-35](file://KCEnglishKids_BE/data_backup/classrooms.json#L1-L35)
- [progresses.json:1-167](file://KCEnglishKids_BE/data_backup/progresses.json#L1-L167)

### Sample Activity Results and Vocabulary Mastery
The seed script:
- Finds the Pet Animals lesson associated with Book 1 Unit 5.
- Creates a Progress record for Leo marking the lesson as completed with stars and highest score.
- Creates sample VocabularyMastery records for Leo and Mia across a few vocabulary items.

```mermaid
sequenceDiagram
participant Seed as "Seed Script"
participant Lessons as "Lessons Collection"
participant Progress as "Progress Collection"
participant Vocab as "Vocabulary Collection"
participant Mastery as "VocabularyMastery Collection"
Seed->>Lessons : Find lesson B1_U5_L1
Lessons-->>Seed : Lesson object
Seed->>Progress : Create progress for Leo
Progress-->>Seed : Progress saved
Seed->>Vocab : Find sample vocabulary
Vocab-->>Seed : Vocabulary items
Seed->>Mastery : Create mastery for Leo and Mia
Mastery-->>Seed : Mastery records saved
```

**Diagram sources**
- [index.js:592-629](file://KCEnglishKids_BE/src/seeds/index.js#L592-L629)

**Section sources**
- [index.js:592-629](file://KCEnglishKids_BE/src/seeds/index.js#L592-L629)
- [progresses.json:1-167](file://KCEnglishKids_BE/data_backup/progresses.json#L1-L167)

### Sample Classroom Session Creation
The seed script creates a sample classroom session titled "Pet Animals Live Exploration":
- Classroom: Little Stars Class
- Teacher: teacher_sarah
- Lesson: Pet Animals lesson
- Age group: 3-4
- Status: COMPLETED
- Planned duration: 45 minutes
- Activities: first three activities from the lesson
- Student scores:
  - Leo: points, stars, correctCount, incorrectCount, notAnswered, status
  - Mia: points, stars, correctCount, incorrectCount, notAnswered, status
- Summary: participation count, average accuracy, total stars, students needing practice

```mermaid
sequenceDiagram
participant Seed as "Seed Script"
participant Activities as "Activities Collection"
participant Session as "ClassroomSession Collection"
Seed->>Activities : Find first 3 activities for Pet Animals lesson
Activities-->>Seed : Activity IDs
Seed->>Session : Create sample session with studentScores and summary
Session-->>Seed : Session saved
```

**Diagram sources**
- [index.js:631-672](file://KCEnglishKids_BE/src/seeds/index.js#L631-L672)

**Section sources**
- [index.js:631-672](file://KCEnglishKids_BE/src/seeds/index.js#L631-L672)
- [classroomsessions.json:1-800](file://KCEnglishKids_BE/data_backup/classroomsessions.json#L1-L800)

### Parent Notification Setup
The seed script creates a sample parent notification:
- Teacher: teacher_sarah
- Child: Leo
- Session: sample session ID
- Recipient contact: Leo’s parent contact
- Child name: Leo
- Class name: Little Stars Class (Age 3–4)
- Session date: current date
- Subject: Learning Update — Leo
- Content: Vietnamese message describing Leo’s participation
- Teacher note: positive feedback
- Score, vocab mastered, stars, accuracy: sample values
- Template type: SESSION_REPORT
- Status: SENT
- Sent timestamp: current time

```mermaid
sequenceDiagram
participant Seed as "Seed Script"
participant Session as "ClassroomSession Collection"
participant Notification as "ParentNotification Collection"
Seed->>Session : Reference sample session
Session-->>Seed : Session ID
Seed->>Notification : Create notification for Leo's parent
Notification-->>Seed : Notification saved
```

**Diagram sources**
- [index.js:674-694](file://KCEnglishKids_BE/src/seeds/index.js#L674-L694)

**Section sources**
- [index.js:674-694](file://KCEnglishKids_BE/src/seeds/index.js#L674-L694)
- [parentnotifications.json:1-800](file://KCEnglishKids_BE/data_backup/parentnotifications.json#L1-L800)

## Dependency Analysis
The seed script depends on several models and data modules:
- Models: User, ClassRoom, Progress, ClassroomSession, ParentNotification, Activity, Lesson, Topic, Vocabulary, Media, CurriculumBook, CurriculumUnit, LanguageContent, AgeGroup
- Data modules: curriculumData, topicData, vocabularyData, languageContentData, lessonData, sentenceDictionary, activityData

The demo path verification ensures:
- Age Group: 3-4
- Book: Book 1
- Unit 5: Big question related to animals
- Topic: Animals
- Lesson: Pet Animals
- Activities: generated for the lesson

```mermaid
graph TB
Seed["Seed Script"]
Models["Models<br/>User, ClassRoom, Progress,<br/>ClassroomSession, ParentNotification,<br/>Activity, Lesson, Topic,<br/>Vocabulary, Media, CurriculumBook,<br/>CurriculumUnit, LanguageContent, AgeGroup"]
DataModules["Data Modules<br/>curriculumData, topicData,<br/>vocabularyData, languageContentData,<br/>lessonData, sentenceDictionary,<br/>activityData"]
Seed --> Models
Seed --> DataModules
```

**Diagram sources**
- [index.js:1-36](file://KCEnglishKids_BE/src/seeds/index.js#L1-L36)
- [index.js:696-745](file://KCEnglishKids_BE/src/seeds/index.js#L696-L745)

**Section sources**
- [index.js:1-36](file://KCEnglishKids_BE/src/seeds/index.js#L1-L36)
- [index.js:696-745](file://KCEnglishKids_BE/src/seeds/index.js#L696-L745)

## Performance Considerations
- The seed script clears collections before inserting data to maintain idempotency.
- Bulk insert operations are used for media, vocabulary, language content, lessons, and activities.
- In-memory maps and lookups reduce repeated database queries during seeding.
- Avatar generation uses lightweight SVG strings rather than external image processing.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues when running the demo setup:

- Database connection failures:
  - Ensure MongoDB is reachable and credentials are correct.
  - Check environment variables loaded by the seed script.

- Duplicate or inconsistent data:
  - Re-run the seed script; it clears collections before insertion.
  - Verify that backups reflect expected counts.

- Missing relationships:
  - Confirm that age groups, books, units, topics, lessons, and activities exist before creating progress or sessions.
  - Validate that classroom.student arrays contain valid user IDs.

- Avatar rendering issues:
  - Ensure SVG generation produces valid data URLs.
  - Check that emoji mappings exist for avatar keys.

- Parent notification mismatches:
  - Verify that recipientContact matches the child’s parent contact.
  - Confirm that session and child IDs are valid.

**Section sources**
- [index.js:125-150](file://KCEnglishKids_BE/src/seeds/index.js#L125-L150)
- [index.js:696-751](file://KCEnglishKids_BE/src/seeds/index.js#L696-L751)

## Conclusion
The seed script establishes a complete demo environment for KCEnglishKids. It creates administrative and teacher accounts, multiple child accounts, a classroom with enrolled students, learning progress records, sample activity results, a classroom session, and a parent notification. The SVG avatar system provides consistent visual identity across roles. The resulting data model demonstrates the relationships between users, classrooms, learning progress, sessions, and notifications, providing a solid foundation for frontend consumption and further development.

[No sources needed since this section summarizes without analyzing specific files]