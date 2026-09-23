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
}
