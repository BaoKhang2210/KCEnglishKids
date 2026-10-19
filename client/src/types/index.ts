export type Role = 'ADMIN' | 'TEACHER' | 'CHILD' | 'PARENT';
export type AgeGroupCode = '3-4' | '4-5' | '5-6';

export interface ParentNoteRequest {
  childId: string;
  assignmentId?: string;
  resultId?: string;
}

export interface ParentNoteOption {
  id: string;
  type: 'praise' | 'encouragement' | 'practice_hint';
  badge: string;
  title: string;
  content: string;
  suggestedStars: number;
}

export interface ParentNoteSuggestions {
  options: ParentNoteOption[];
  source: 'template';
  generative: false;
  fallback: boolean;
  metrics: {
    scope: 'all_time' | 'assignment';
    ageGroup: AgeGroupCode | null;
    averageAccuracy: number | null;
    completedLessons: number;
    totalStars: number;
    streak: number | null;
    recentLesson: string | null;
  };
}

export interface SpeakingRequest {
  targetWord: string;
  spokenTranscript: string;
  ageGroup?: AgeGroupCode;
}

export interface SpeakingFeedback {
  evaluationType: 'transcript_match';
  source: 'rules';
  evaluated: boolean;
  score: number | null;
  displayStars: number;
  isAccepted: boolean;
  mascotState: 'celebrating' | 'happy' | 'encouraging';
  kokoSpeech: string;
  kokoEnglishCheer: string;
  practiceTip: string;
}

export interface LessonPlanRequest {
  lessonId?: string;
  classroomId?: string;
  durationMinutes?: 15 | 25 | 35;
  teachingStyle?: 'active_tpr' | 'story_song' | 'interactive_drills';
  ageGroup?: AgeGroupCode;
  lessonTitle?: string;
  targetTopic?: string;
  vocabularyList?: Array<{ english: string; vietnamese?: string; pronunciation?: string }>;
  sentencePatterns?: Array<{ english: string; vietnamese?: string }>;
}

export interface LessonPlanActivity {
  name: string;
  durationMin: number;
  type: string;
  teacherTalk: string;
  tprAction: string;
  description: string;
}

export interface LessonPlanPhase {
  phaseId: 'warmup' | 'presentation' | 'practice' | 'wrapup';
  name: string;
  durationMin: number;
  badge: string;
  icon: string;
  colorTheme: 'amber' | 'teal' | 'indigo' | 'emerald';
  goals: string[];
  activities: LessonPlanActivity[];
}

export interface LessonPlan {
  meta: {
    lessonTitle: string;
    targetTopic: string;
    ageGroup: AgeGroupCode;
    bookLevel: string;
    durationMinutes: number;
    teachingStyle: 'active_tpr' | 'story_song' | 'interactive_drills';
    wordCount: number;
  };
  targetVocabulary: Array<{
    english: string;
    vietnamese?: string;
    pronunciation?: string;
    tprGesture?: string;
    teacherPrompt?: string;
  }>;
  targetSentences: Array<{ english: string; vietnamese?: string }>;
  objectives: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  materialsNeeded: string[];
  teacherPrepTips: string[];
  phases: LessonPlanPhase[];
  homeConnectPrompt: string;
  source: 'pedagogical_engine';
  generative: false;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  role: Role;
  avatar?: string;
  avatarUrl?: string;
  ageGroupCode?: AgeGroupCode;
  assignedClass?: any;
  parentContact?: string;
}

export interface Topic {
  _id: string;
  englishName: string;
  vietnameseName: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  colorCode: string;
  lessonCount?: number;
  featured?: boolean;
}

export interface Vocabulary {
  _id: string;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  imageUrl?: string;
  audioUrl?: string;
  exampleSentence?: string;
  exampleSentenceVietnamese?: string;
  category?: string;
}

export interface ActivityOption {
  id: string;
  text?: string;
  vietnameseText?: string;
  imageUrl?: string;
  audioUrl?: string;
  isCorrect: boolean;
}

export interface ActivityQuestion {
  id?: string;
  promptText: string;
  promptAudioUrl?: string;
  promptImageUrl?: string;
  correctAnswer: string;
  options: ActivityOption[];
  vocabulary?: any;
  explanation?: string;
  metadata?: any;
}

export interface Activity {
  _id: string;
  title: string;
  vietnameseTitle?: string;
  instructions: string;
  instructionAudioUrl?: string;
  activityType: string;
  difficulty: number;
  questionCount: number;
  pointsPerQuestion: number;
  starConfig: {
    threeStarsMin: number;
    twoStarsMin: number;
    oneStarMin: number;
  };
  questions: ActivityQuestion[];
}

export interface Lesson {
  _id: string;
  title: string;
  vietnameseTitle?: string;
  description?: string;
  learningObjectives?: string[];
  estimatedDuration?: number;
  difficulty: number;
  thumbnailUrl?: string;
  topic?: Topic | string;
  vocabularyItems?: Vocabulary[];
  activities?: Activity[];
  progress?: {
    stars: number;
    completed: boolean;
    highestScore: number;
  } | null;
}

export interface ProgressSummary {
  child: {
    name: string;
    avatar: string;
    avatarUrl?: string;
    ageGroupCode: string;
  };
  totalStars: number;
  completedLessonsCount: number;
  progressList: Array<{
    _id: string;
    topic: Topic;
    lesson: Lesson;
    completed: boolean;
    stars: number;
    highestScore: number;
  }>;
  weakVocabulary: Array<{
    vocabulary: Vocabulary;
    mistakeCount: number;
  }>;
}

// ─── Rewards (§1.2) ───────────────────────────────────────────────────────────

export interface RewardChest {
  id: string;
  unitId: string | null;
  unitCode: string;
  unitNumber: number | null;
  bookNumber: number | null;
  title: string | null;
  completedAt: string;
  revealedAt: string | null;
  rewards: {
    stars: number;
    stickerId: string | null;
  };
}

export interface ExplorerLevel {
  level: number;
  title: string;
  titleEn: string;
  icon: string;
  minStars: number;
  maxStars: number;
  currentStars: number;
  progressPercent: number;
}

export interface VocabularyCompetency {
  totalEncountered: number;
  masteredCount: number;
  practicingCount: number;
  learningCount: number;
  masteredWords: Array<{ english: string; vietnamese?: string; imageUrl?: string }>;
  needsReviewWords: Array<{ english: string; vietnamese?: string; imageUrl?: string; wrongCount: number }>;
}

export interface ListeningCompetency {
  accuracyRate: number;
  totalResponses: number;
  correctResponses: number;
  reactionSpeed: string;
  status: 'EXCELLENT' | 'GOOD' | 'PRACTICE_NEEDED';
}

export interface PronunciationCompetency {
  averageScore: number;
  confidence: string;
  starsEarned: number;
}

export interface StudentCompetencyReport {
  explorerLevel: ExplorerLevel;
  vocabularyCompetency: VocabularyCompetency;
  listeningCompetency: ListeningCompetency;
  pronunciationCompetency: PronunciationCompetency;
  recommendedAction: string;
}

export interface RewardSummary {
  totalStars: number;
  earnedStars: number;
  bonusStars: number;
  classroomStars: number;
  completedUnits: number;
  completedLessons: number;
  perfectLessons: number;
  openedChests: number;
  totalLessonsAttempted: number;
  grantedStickerIds: string[];
  chests: RewardChest[];
  explorerLevel?: ExplorerLevel;
}

export interface RevealedChest {
  chestId: string;
  unitId: string;
  unitCode: string;
  revealedAt: string;
  rewards: {
    stars: number;
    stickerId: string | null;
  };
}

// ─── Classroom Session (Phase 2) ──────────────────────────────────────────────

export type SessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED';
export type StudentAnswerResult = 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED';
export type StudentSessionStatus = 'ACTIVE' | 'NEEDS_PRACTICE' | 'COMPLETED';

export interface StudentSessionScore {
  student: User | string;
  points: number;
  stars: number;
  correctCount: number;
  incorrectCount: number;
  notAnswered: number;
  status: StudentSessionStatus;
  attendance?: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
}

export interface QuestionStudentAnswer {
  student: string | User;
  result: StudentAnswerResult;
}

export interface SessionQuestionResult {
  activityId?: string;
  questionIndex: number;
  promptText?: string;
  promptImageUrl?: string;
  studentAnswers: QuestionStudentAnswer[];
}

export interface SessionSummary {
  participationCount: number;
  averageAccuracy: number;
  totalStars: number;
  totalPoints: number;
  studentsNeedingPractice: Array<User | string>;
  topPerformers: Array<User | string>;
}

export interface ClassroomSession {
  _id: string;
  classroom: any;
  teacher: User | string;
  lesson?: Lesson | null;
  lessonPlan?: LessonPlan | null;
  title: string;
  ageGroup: AgeGroupCode;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  plannedDuration: number;
  sessionNumber?: number;
  includeWarmup?: boolean;
  activities: Activity[];
  currentActivityIndex: number;
  studentScores: StudentSessionScore[];
  questionResults: SessionQuestionResult[];
  summary?: SessionSummary;
  createdAt?: string;
}

// ─── Vocabulary Mastery (Phase 2) ─────────────────────────────────────────────

export type MasteryLevel = 0 | 1 | 2 | 3;
// 0=Not Started, 1=Learning, 2=Practicing, 3=Mastered

export interface VocabularyMasteryRecord {
  _id: string;
  student: string;
  vocabulary: Vocabulary | string;
  correctCount: number;
  wrongCount: number;
  attemptCount: number;
  streak: number;
  masteryLevel: MasteryLevel;
  lastReviewedAt?: string;
}

export interface MasterySummary {
  total: number;
  mastered: number;
  practicing: number;
  learning: number;
  notStarted: number;
}

// ─── Parent Notifications (Phase 2) ───────────────────────────────────────────

export type NotificationTemplateType = 'SESSION_REPORT' | 'PROGRESS_UPDATE' | 'GENERAL';

export interface ParentNotification {
  _id: string;
  teacher: User | string;
  child: User | string;
  session?: ClassroomSession | string | null;
  recipientContact?: string;
  childName: string;
  className: string;
  sessionDate?: string;
  subject: string;
  content: string;
  teacherNote?: string;
  score: number;
  vocabMastered: number;
  vocabTotal: number;
  stars: number;
  accuracy: number;
  templateType: NotificationTemplateType;
  status: 'DRAFT' | 'SENT';
  sentAt: string;
  readAt?: string | null;
}

// ─── Daily Streak (Chuỗi ngày học) ───────────────────────────────────────────

export interface StreakLevelInfo {
  level: number;
  title: string;
  englishTitle: string;
  badge: string;
  theme: 'warm' | 'blazing' | 'phoenix' | 'cosmic';
  description: string;
  color: string;
  glowColor: string;
}

export interface StreakWeekDay {
  dayIndex: number;
  label: string;
  date: string;
  isToday: boolean;
  isPast: boolean;
  isActive: boolean;
}

export interface StreakNextMilestone {
  target: number;
  rewardStars: number;
  label: string;
}

export interface ChildStreakData {
  childId: string;
  childName: string;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  isNewDayIncrement?: boolean;
  levelInfo: StreakLevelInfo;
  nextMilestone: StreakNextMilestone;
  weekDays: StreakWeekDay[];
  activeDates: string[];
}

// ─── Timetable / Schedule Management ──────────────────────────────────────────

export interface ScheduleWeeklySlot {
  _id?: string;
  dayOfWeek: number; // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
  startTime: string; // "08:00"
  endTime: string;   // "08:45"
  subjectNote?: string;
  room?: string;
}

export interface ClassSchedule {
  _id: string;
  classroom: {
    _id: string;
    name: string;
    ageGroupCode?: string;
    academicYear?: string;
    studentCount?: number;
    isActive?: boolean;
  } | string;
  teacher: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
    avatarUrl?: string;
    username?: string;
  } | string;
  academicYear: string;
  weeklySlots: ScheduleWeeklySlot[];
  colorTag: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'sky' | 'teal' | 'orange';
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
