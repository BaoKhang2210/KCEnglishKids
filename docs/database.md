# KCEnglishKids Database Models & Relationships

## Mongoose Models Overview

1. **AgeGroup**: `code` ('3-4', '4-5', '5-6'), `name`, `targetAgeMin`, `targetAgeMax`, `maxChoicesPerQuestion`, `defaultQuestionCount`.
2. **CurriculumBook**: `bookNumber` (1, 2, 3), `title`, `ageGroup` (ref `AgeGroup`), `totalUnits` (9).
3. **CurriculumUnit**: `book` (ref `CurriculumBook`), `ageGroupCode`, `unitNumber` (1-9), `bigQuestion`, `values`, `concept`, `sourceType`.
4. **Media**: `type` ('IMAGE', 'AUDIO', 'ANIMATION', 'LOTTIE'), `url`, `mimeType`, `altText`, `transcript`.
5. **Topic**: `englishName`, `vietnameseName`, `slug`, `icon`, `colorCode`, `ageGroupCodes`, `relatedUnits`.
6. **Vocabulary**: `english`, `vietnamese`, `pronunciation`, `imageUrl`, `audioUrl`, `exampleSentence`, `topics`, `sourceUnits`.
7. **Lesson**: `topic` (ref `Topic`), `ageGroupCode`, `title`, `vietnameseTitle`, `learningObjectives`, `vocabularyItems`.
8. **Activity**: `lesson` (ref `Lesson`), `activityType` ('LISTEN_CHOOSE'), `pointsPerQuestion`, `starConfig`, `questions` (embedded schema).
9. **User**: `role` ('ADMIN', 'TEACHER', 'CHILD'), `email`, `password` (bcrypt hashed), `pin` (bcrypt hashed), `avatar`, `avatarUrl`, `ageGroupCode`.
10. **ClassRoom**: `name`, `teacher` (ref `User`), `students` ([ref `User`]), `ageGroupCode`.
11. **LearningSession**: `child` (ref `User`), `lesson` (ref `Lesson`), `status` ('IN_PROGRESS', 'COMPLETED'), `totalScore`, `stars`.
12. **ActivityResult**: `child`, `activity`, `lesson`, `session`, `score`, `stars`, `correctCount`, `incorrectCount`, `answers` ([embedded]).
13. **Progress**: `child`, `topic`, `lesson`, `completed`, `stars`, `highestScore`, `attempts`, `weakVocabulary`.
