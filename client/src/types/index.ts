export type Role = 'ADMIN' | 'TEACHER' | 'CHILD' | 'PARENT';
export type AgeGroupCode = '3-4' | '4-5' | '5-6';

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
  title: string;
  ageGroup: AgeGroupCode;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  plannedDuration: number;
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



