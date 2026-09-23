export type Role = 'ADMIN' | 'TEACHER' | 'CHILD';
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
