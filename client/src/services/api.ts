import type {
  ParentNoteRequest,
  ParentNoteSuggestions,
  SpeakingRequest,
  SpeakingFeedback,
  LessonPlanRequest,
  LessonPlan
} from '../types';

const BASE_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('kc_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async post(endpoint: string, body: any, signal?: AbortSignal) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      signal,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async patch(endpoint: string, body?: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async put(endpoint: string, body: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  async delete(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
};

async function assistantPost<T>(
  endpoint: string,
  body: ParentNoteRequest | SpeakingRequest | LessonPlanRequest,
  signal?: AbortSignal
): Promise<{ success: true; data: T }> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 30000);
  try {
    return await api.post(endpoint, body, controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export const aiApi = {
  generateParentNote: (body: ParentNoteRequest, signal?: AbortSignal) =>
    assistantPost<ParentNoteSuggestions>('/ai/generate-parent-note', body, signal),
  evaluatePronunciation: (body: SpeakingRequest, signal?: AbortSignal) =>
    assistantPost<SpeakingFeedback>('/ai/evaluate-pronunciation', body, signal),
  generateLessonPlan: (body: LessonPlanRequest, signal?: AbortSignal) =>
    assistantPost<LessonPlan>('/ai/generate-lesson-plan', body, signal)
};

// Auth API
export const authApi = {
  getChildAvatars: () => api.get('/auth/children-avatars'),
  childLogin: (payload: {
    avatar?: string;
    childId?: string;
    pin?: string;
    identifier?: string;
    email?: string;
    phone?: string;
    password?: string;
  }) => api.post('/auth/child-login', payload),
  childRegister: (payload: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    password?: string;
    pin?: string;
    ageGroupCode: string;
    avatar?: string;
  }) => api.post('/auth/child-register', payload),
  adminLogin: (payload: { email: string; password: string }) =>
    api.post('/auth/admin-login', payload),
  teacherLogin: (payload: { email: string; password: string }) =>
    api.post('/auth/teacher-login', payload),
  getMe: () => api.get('/auth/me'),
  changePin: (payload: { currentPin: string; newPin: string }) =>
    api.post('/auth/change-pin', payload),
  lookupStudent: (phone: string) =>
    api.post('/auth/lookup-student', { phone })
};

// Topics API
export const topicsApi = {
  getTopics: (ageGroup?: string) =>
    api.get(`/topics${ageGroup ? `?ageGroup=${ageGroup}` : ''}`),
  getTopicById: (id: string) =>
    api.get(`/topics/${id}`),
  getLessonsByTopic: (topicId: string, ageGroup?: string, childId?: string) => {
    const params = new URLSearchParams();
    if (ageGroup) params.append('ageGroup', ageGroup);
    if (childId) params.append('childId', childId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/topics/${topicId}/lessons${query}`);
  }
};

// Lessons API
export const lessonsApi = {
  getCurriculumPath: (ageGroup?: string, childId?: string) => {
    const params = new URLSearchParams();
    if (ageGroup) params.append('ageGroup', ageGroup);
    if (childId) params.append('childId', childId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/lessons/curriculum-path${query}`);
  },
  getLessonById: (id: string) => api.get(`/lessons/${id}`),
  getLessonActivities: (id: string) => api.get(`/lessons/${id}/activities`)
};

// Vocabulary API
export const vocabularyApi = {
  getVocabulary: (ageGroup?: string, search?: string, topic?: string) => {
    const params = new URLSearchParams();
    if (ageGroup) params.append('ageGroup', ageGroup);
    if (search) params.append('search', search);
    if (topic) params.append('topic', topic);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/vocabulary${query}`);
  },
  getVocabularyById: (id: string) => api.get(`/vocabulary/${id}`)
};

// Activities API
export const activitiesApi = {
  getActivityById: (id: string) => api.get(`/activities/${id}`)
};

// Learning & Progress API
export const learningApi = {
  startSession: (lessonId: string, childId?: string) =>
    api.post('/learning/sessions', { lessonId, childId }),
  getSession: (id: string) =>
    api.get(`/learning/sessions/${id}`),
  submitActivityResult: (data: {
    activityId: string;
    lessonId: string;
    sessionId?: string;
    childId?: string;
    answers: any[];
    duration: number;
  }) => api.post('/learning/activity-results', data),
  getChildProgress: (childId: string) =>
    api.get(`/children/${childId}/progress`)
};

// §1.3.1 — 3-stage pipeline: per-lesson stage completion (server = source of truth)
export const stageProgressApi = {
  getLessonProgress: (childId: string, lessonId: string) =>
    api.get(`/children/${childId}/progress/${lessonId}`),
  completeStage: (
    childId: string,
    lessonId: string,
    payload: { stage: 1 | 2 | 3; score?: number; stars?: number }
  ) => api.put(`/children/${childId}/progress/${lessonId}/stage`, payload)
};

// Admin API
export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getCurriculum: () => api.get('/admin/curriculum'),
  getDeepCurriculum: () => api.get('/admin/curriculum/deep'),

  // Curriculum Units, Lessons, Vocab
  createUnit: (data: { bookNumber: number; unitNumber: number; bigQuestion: string; storyTitle?: string; ageGroupCode?: string; values?: string | string[]; concept?: string; oracy?: string; displayOrder?: number }) =>
    api.post('/admin/curriculum/units', data),
  updateUnit: (id: string, data: any) =>
    api.put(`/admin/curriculum/units/${id}`, data),
  deleteUnit: (id: string) =>
    api.delete(`/admin/curriculum/units/${id}`),

  createLesson: (data: { title: string; vietnameseTitle?: string; description?: string; topicId?: string; unitId?: string; ageGroupCode?: string; displayOrder?: number; difficulty?: number }) =>
    api.post('/admin/curriculum/lessons', data),
  updateLesson: (id: string, data: any) =>
    api.put(`/admin/curriculum/lessons/${id}`, data),
  deleteLesson: (id: string) =>
    api.delete(`/admin/curriculum/lessons/${id}`),
  toggleLessonStatus: (id: string) =>
    api.patch(`/admin/lessons/${id}/status`),

  createVocabulary: (data: { english: string; vietnamese: string; pronunciation?: string; category?: string; ageGroupCodes?: string[]; sourceUnits?: string[]; lessonId?: string }) =>
    api.post('/admin/curriculum/vocabularies', data),
  updateVocabulary: (id: string, data: any) =>
    api.put(`/admin/curriculum/vocabularies/${id}`, data),
  deleteVocabulary: (id: string) =>
    api.delete(`/admin/curriculum/vocabularies/${id}`),

  // Sentence Patterns (Mẫu câu)
  getSentencePatterns: (params?: { ageGroupCode?: string; contentType?: string; unitId?: string; lessonId?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    const qs = q.toString();
    return api.get(`/admin/sentences${qs ? `?${qs}` : ''}`);
  },
  createSentencePattern: (data: {
    contentType?: string;
    english: string;
    vietnamese?: string;
    pronunciation?: string;
    ageGroupCode?: string;
    sourceUnit?: string;
    lesson?: string;
    difficulty?: number;
    status?: string;
    isPair?: boolean;
    pairId?: string;
    relatedQuestion?: string;
    answers?: Array<{ english: string; vietnamese?: string; pronunciation?: string }>;
  }) => api.post('/admin/sentences', data),
  updateSentencePattern: (id: string, data: any) =>
    api.put(`/admin/sentences/${id}`, data),
  deleteSentencePattern: (id: string) =>
    api.delete(`/admin/sentences/${id}`),

  // Classrooms & Student Assignment
  getClassrooms: () =>
    api.get('/admin/classrooms'),
  getClassroomById: (id: string) =>
    api.get(`/admin/classrooms/${id}`),
  createClassroom: (data: {
    name: string;
    ageGroupCode: string;
    teacherId?: string;
    academicYear?: string;
    description?: string;
    students?: Array<{
      name: string;
      dob?: string;
      pin?: string;
      contact?: string;
      parentContact?: string;
      notes?: string;
      avatar?: string;
    }>;
  }) => api.post('/admin/classrooms', data),
  updateClassroom: (id: string, data: any) =>
    api.put(`/admin/classrooms/${id}`, data),
  deleteClassroom: (id: string) =>
    api.delete(`/admin/classrooms/${id}`),
  assignStudentsToClassroom: (id: string, studentIds: string[]) =>
    api.post(`/admin/classrooms/${id}/assign-students`, { studentIds }),
  addStudentToClassroom: (id: string, studentId: string) =>
    api.post(`/admin/classrooms/${id}/students`, { studentId }),
  addIndividualStudentToClassroom: (
    id: string,
    data: { name: string; dob?: string; pin?: string; contact?: string; parentContact?: string }
  ) => api.post(`/admin/classrooms/${id}/students`, data),
  removeStudentFromClassroom: (id: string, studentId: string) =>
    api.delete(`/admin/classrooms/${id}/students/${studentId}`),
  assignTeacherToClassroom: (id: string, teacherId: string) =>
    api.put(`/admin/classrooms/${id}/teacher`, { teacherId }),
  assignTeacher: (id: string, teacherId: string) =>
    api.put(`/admin/classrooms/${id}/teacher`, { teacherId }),
  getClassroomCurriculumProgress: (id: string) =>
    api.get(`/admin/classrooms/${id}/curriculum-progress`),
  updateClassroomCurriculumProgress: (id: string, data: any) =>
    api.put(`/admin/classrooms/${id}/curriculum-progress`, data),
  exportSystemBackup: () =>
    api.get('/admin/system/backup'),
  importStudentsFromExcel: (
    classId: string,
    students: Array<{
      name: string;
      dob?: string;
      pin?: string;
      contact?: string;
      parentContact?: string;
      notes?: string;
      avatar?: string;
    }>
  ) => api.post(`/admin/classrooms/${classId}/import-students-excel`, { students }),
  exportClassroomExcel: (id: string) =>
    api.get(`/admin/classrooms/${id}/export-excel`),
  getUnassignedStudents: (params?: { ageGroupCode?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.ageGroupCode) q.append('ageGroupCode', params.ageGroupCode);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    return api.get(`/admin/students/unassigned${qs ? `?${qs}` : ''}`);
  },

  // User Management
  getUsers: (optsOrRole?: any, search?: string, page?: number, limit?: number) => {
    const q = new URLSearchParams();
    if (typeof optsOrRole === 'object' && optsOrRole !== null) {
      if (optsOrRole.role && optsOrRole.role !== 'ALL') q.append('role', optsOrRole.role);
      if (optsOrRole.search) q.append('search', optsOrRole.search);
      if (optsOrRole.page) q.append('page', String(optsOrRole.page));
      if (optsOrRole.limit) q.append('limit', String(optsOrRole.limit));
    } else {
      if (optsOrRole && optsOrRole !== 'ALL') q.append('role', optsOrRole);
      if (search) q.append('search', search);
      if (page) q.append('page', String(page));
      if (limit) q.append('limit', String(limit));
    }
    const qs = q.toString();
    return api.get(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  createTeacher: (data: { name: string; username: string; email: string; password: string; contact?: string; avatar?: string; assignedClass?: string }) =>
    api.post('/admin/teachers', data),
  createChild: (data: {
    name: string;
    pin: string;
    dob?: string;
    avatar?: string;
    assignedClass?: string;
    email?: string;
    contact?: string;
    username?: string;
    password?: string;
    ageGroupCode?: string;
  }) =>
    api.post('/admin/children', data),
  bulkImportChildren: (data: {
    students: Array<{
      name: string;
      dob?: string;
      pin?: string;
      contact?: string;
      parentContact?: string;
      ageGroupCode?: string;
      avatar?: string;
    }>;
    classroomId?: string;
    defaultAgeGroupCode?: string;
  }) => api.post('/admin/children/bulk-import', data),
  updateUser: (id: string, data: any) =>
    api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),
  resetChildPin: (id: string, pin: string) =>
    api.post(`/admin/users/${id}/reset-pin`, { pin }),
  toggleUserStatus: (id: string) =>
    api.patch(`/admin/users/${id}/status`),

  // Audit Logs & Settings
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.action && params.action !== 'ALL') q.append('action', params.action);
    if (params?.targetType && params.targetType !== 'ALL') q.append('targetType', params.targetType);
    if (params?.search) q.append('search', params.search);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const qs = q.toString();
    return api.get(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
  getAnalytics: () =>
    api.get('/admin/analytics/overview'),
  getSettings: () =>
    api.get('/admin/settings'),
  updateSettings: (data: any) =>
    api.put('/admin/settings', data),
  toggleTopicStatus: (id: string) =>
    api.patch(`/admin/topics/${id}/status`),

  // Schedule Management (Thời Khóa Biểu)
  getSchedules: (params?: { classroomId?: string; teacherId?: string; academicYear?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.classroomId) q.append('classroomId', params.classroomId);
    if (params?.teacherId) q.append('teacherId', params.teacherId);
    if (params?.academicYear) q.append('academicYear', params.academicYear);
    if (params?.isActive !== undefined) q.append('isActive', String(params.isActive));
    const qs = q.toString();
    return api.get(`/admin/schedules${qs ? `?${qs}` : ''}`);
  },
  createSchedule: (data: any) =>
    api.post('/admin/schedules', data),
  updateSchedule: (id: string, data: any) =>
    api.put(`/admin/schedules/${id}`, data),
  getTeacherSchedule: (teacherId: string) =>
    api.get(`/admin/schedules/by-teacher/${teacherId}`),
  deleteSchedule: (id: string) =>
    api.delete(`/admin/schedules/${id}`),

  // Activities & Games Management (Kho Trò chơi & Hoạt động)
  getActivities: (params?: {
    search?: string;
    activityType?: string;
    ageGroupCode?: string;
    lessonId?: string;
    status?: string;
    difficulty?: number | string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.activityType && params.activityType !== 'ALL') q.append('activityType', params.activityType);
    if (params?.ageGroupCode && params.ageGroupCode !== 'ALL') q.append('ageGroupCode', params.ageGroupCode);
    if (params?.lessonId && params.lessonId !== 'ALL') q.append('lessonId', params.lessonId);
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.difficulty && params.difficulty !== 'ALL') q.append('difficulty', String(params.difficulty));
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString();
    return api.get(`/admin/activities${qs ? `?${qs}` : ''}`);
  },
  getActivityById: (id: string) => api.get(`/admin/activities/${id}`),
  createActivity: (data: any) => api.post('/admin/activities', data),
  updateActivity: (id: string, data: any) => api.put(`/admin/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/admin/activities/${id}`),
  toggleActivityStatus: (id: string) => api.patch(`/admin/activities/${id}/status`)
};

// Teacher API
export const teacherApi = {
  getDashboard: () => api.get('/teacher/dashboard'),
  getClasses: () => api.get('/teacher/classes'),
  getClassDetail: (id: string) => api.get(`/teacher/classes/${id}`),
  updateClass: (id: string, data: any) => api.put(`/teacher/classes/${id}`, data),
  getEligibleStudents: (id: string, search?: string) => api.get(`/teacher/classes/${id}/eligible-students${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  addStudents: (id: string, studentIds: string[]) => api.post(`/teacher/classes/${id}/students`, { studentIds }),
  removeStudent: (id: string, studentId: string) => api.delete(`/teacher/classes/${id}/students/${studentId}`),
  getClassAttendance: (id: string, date?: string) =>
    api.get(`/teacher/classes/${id}/attendance${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  saveClassAttendance: (id: string, data: { date?: string; records: any[]; note?: string }) =>
    api.post(`/teacher/classes/${id}/attendance`, data),
  getStudents: (params?: { search?: string; classRoomId?: string } | string) => {
    let qs = '';
    if (typeof params === 'string') {
      qs = params ? `?search=${encodeURIComponent(params)}` : '';
    } else if (params) {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.classRoomId) q.append('classRoomId', params.classRoomId);
      qs = q.toString() ? `?${q.toString()}` : '';
    }
    return api.get(`/teacher/students${qs}`);
  },
  getStudentOverview: (studentId: string) => api.get(`/teacher/students/${studentId}/overview`),
  getStudentHistory: (studentId: string) => api.get(`/teacher/students/${studentId}/history`),
  getStudentNotes: (studentId: string) => api.get(`/teacher/students/${studentId}/notes`),
  createTeacherNote: (data: { studentId: string; lessonId?: string; noteType: string; content: string; isHomeroomOnly?: boolean }) =>
    api.post('/teacher/notes', data),
  getAssignments: (classRoomId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (classRoomId) params.append('classRoomId', classRoomId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/teacher/assignments${query}`);
  },
  getAssignment: (id: string) => api.get(`/teacher/assignments/${id}`),
  updateAssignment: (id: string, data: any) => api.put(`/teacher/assignments/${id}`, data),
  createAssignment: (data: {
    classRoomId: string;
    assignedToType?: string;
    studentId?: string;
    lessonId: string;
    activityId?: string;
    dueDate?: string;
    instructions?: string;
  }) => api.post('/teacher/assignments', data),
  updateAssignmentStatus: (id: string, status: string) =>
    api.patch(`/teacher/assignments/${id}/status`, { status }),
  cancelAssignment: (id: string) =>
    api.patch(`/teacher/assignments/${id}/status`, { status: 'CANCELLED' }),
  deleteAssignment: (id: string) => api.delete(`/teacher/assignments/${id}`),
  reviewSubmission: (assignmentId: string, childId: string, data: { comment?: string; bonusStars?: number; notifyParent?: boolean }) =>
    api.post(`/teacher/assignments/${assignmentId}/submissions/${childId}/review`, data),
  getCurriculumOptions: (ageGroupCode?: string) => {
    const query = ageGroupCode ? `?ageGroupCode=${ageGroupCode}` : '';
    return api.get(`/teacher/curriculum-options${query}`);
  },
  getMySchedule: () =>
    api.get('/teacher/my-schedule'),
  getContent: (params = '') => api.get(`/teacher/content${params ? `?${params}` : ''}`),
  getLesson: (id: string) => api.get(`/teacher/lessons/${id}`),
  getActivity: (id: string) => api.get(`/teacher/activities/${id}`),
  updateNote: (id: string, data: any) => api.put(`/teacher/notes/${id}`, data),
  deleteNote: (id: string) => api.delete(`/teacher/notes/${id}`)
};

// Classroom Session API (Phase 3)
export const classroomSessionApi = {
  getSessions: (params?: { status?: string; classroomId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.classroomId) q.append('classroomId', params.classroomId);
    const qs = q.toString();
    return api.get(`/teacher/classroom-sessions${qs ? `?${qs}` : ''}`);
  },
  createSession: (data: {
    classroomId: string;
    lessonId?: string;
    title?: string;
    activityIds?: string[];
    plannedDuration?: number;
    sessionNumber?: number;
    includeWarmup?: boolean;
    lessonPlan?: any;
    attendanceRecords?: any[];
    attendanceDate?: string;
    attendanceNote?: string;
  }) => api.post('/teacher/classroom-sessions', data),
  getSession: (id: string) => api.get(`/teacher/classroom-sessions/${id}`),
  startSession: (id: string) =>
    api.post(`/teacher/classroom-sessions/${id}/start`, {}),
  endSession: (id: string) =>
    api.post(`/teacher/classroom-sessions/${id}/end`, {}),
  scoreStudent: (
    id: string,
    data: {
      studentId: string;
      points?: number;
      stars?: number;
      correctDelta?: number;
      incorrectDelta?: number;
    }
  ) => api.post(`/teacher/classroom-sessions/${id}/score-student`, data),
  scoreBulk: (
    id: string,
    data: {
      studentIds: string[];
      points?: number;
      stars?: number;
      correctDelta?: number;
      incorrectDelta?: number;
    }
  ) => api.post(`/teacher/classroom-sessions/${id}/score-bulk`, data),
  recordQuestionResult: (
    id: string,
    data: {
      activityId?: string;
      questionIndex?: number;
      promptText?: string;
      promptImageUrl?: string;
      studentAnswers: Array<{ studentId: string; result: 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED' }>;
    }
  ) => api.post(`/teacher/classroom-sessions/${id}/question-result`, data),
  updateActivityIndex: (id: string, index: number) =>
    api.patch(`/teacher/classroom-sessions/${id}/activity-index`, { index }),
  getSessionSummary: (id: string) =>
    api.get(`/teacher/classroom-sessions/${id}/summary`)
};

// Vocabulary Mastery API (Phase 5)
export const vocabMasteryApi = {
  getChildMastery: (childId: string) =>
    api.get(`/children/${childId}/vocabulary-mastery`),
  syncMastery: (
    childId: string,
    records: Array<{
      vocabularyId: string;
      correctCount: number;
      wrongCount: number;
      attemptCount: number;
      streak: number;
    }>
  ) => api.post(`/children/${childId}/vocabulary-mastery`, { records }),
  recordPractice: (childId: string, vocabId: string, isCorrect: boolean) =>
    api.post(`/children/${childId}/vocabulary-mastery/${vocabId}/record`, {
      isCorrect
    }),
  getStudentMastery: (studentId: string) =>
    api.get(`/teacher/students/${studentId}/vocabulary-mastery`)
};

// Rewards API (§1.2 — server is the single source of truth)
export const rewardsApi = {
  getChildRewards: (childId: string) =>
    api.get(`/children/${childId}/rewards`),
  revealChest: (childId: string, unitId: string) =>
    api.post(`/children/${childId}/rewards/chests/${unitId}/reveal`, {})
};

// Sentence-pattern teaching API (teacher classroom screen, Mongo languagecontents)
export const sentenceApi = {
  getPatterns: (params: {
    ageGroupCode?: string;
    unitId?: string;
    lessonId?: string;
    topicId?: string;
    contentType?: string;
    search?: string;
  } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.append(k, String(v));
    });
    const qs = q.toString();
    return api.get(`/teacher/sentence-patterns${qs ? `?${qs}` : ''}`);
  },
  getUnitsOverview: (params: { ageGroupCode?: string; contentType?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.append(k, String(v));
    });
    const qs = q.toString();
    return api.get(`/teacher/sentence-patterns/units-overview${qs ? `?${qs}` : ''}`);
  }
};

// Parent Notification API (Phase 9)
export const parentNotificationApi = {
  sendNotification: (data: {
    childId: string;
    subject?: string;
    sessionId?: string;
    teacherNote?: string;
    templateType?: 'SESSION_REPORT' | 'PROGRESS_UPDATE' | 'GENERAL';
    score?: number;
    vocabMastered?: number;
    vocabTotal?: number;
    stars?: number;
    accuracy?: number;
  }) => api.post('/teacher/parent-notifications', data),
  sendBulkNotifications: (data: {
    sessionId?: string;
    templateType?: string;
    childReports: Array<{
      childId: string;
      score?: number;
      vocabMastered?: number;
      vocabTotal?: number;
      stars?: number;
      accuracy?: number;
      teacherNote?: string;
    }>;
  }) => api.post('/teacher/parent-notifications/bulk', data),
  getNotifications: (childId?: string) => {
    const q = childId ? `?childId=${childId}` : '';
    return api.get(`/teacher/parent-notifications${q}`);
  },
  getChildNotifications: (childId: string) =>
    api.get(`/teacher/parent-notifications/child/${childId}`),
  replyAsTeacher: (id: string, message: string) =>
    api.post(`/teacher/parent-notifications/${id}/reply`, { message }),
  getChildNotificationsForParent: (childId: string) =>
    api.get(`/children/${childId}/parent-notifications`),
  replyAsParent: (childId: string, id: string, message: string, parentName?: string) =>
    api.post(`/children/${childId}/parent-notifications/${id}/reply`, { message, parentName }),
  markAsReadByParent: (childId: string, id: string) =>
    api.patch(`/children/${childId}/parent-notifications/${id}/read`, {}),
  getChildAssignments: (childId: string) =>
    api.get(`/children/${childId}/assignments`),
  getChildSchedule: (childId: string) =>
    api.get(`/children/${childId}/schedule`)
};

export const streakApi = {
  getStreak: (childId: string) =>
    api.get(`/children/${childId}/streak`),
  testStreakLevel: (childId: string, streak: number) =>
    api.post(`/children/${childId}/streak/test-level`, { streak })
};

