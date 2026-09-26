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

  async post(endpoint: string, body: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
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

// Admin API
export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getCurriculum: () => api.get('/admin/curriculum'),
  getUsers: (role?: string, search?: string) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/admin/users${query}`);
  },
  createTeacher: (data: { name: string; username: string; email: string; password: string; contact?: string; avatar?: string }) =>
    api.post('/admin/teachers', data),
  createChild: (data: {
    name: string;
    pin: string;
    dob?: string;
    avatar?: string;
    assignedClass?: string;
    email?: string;
    contact?: string;
    password?: string;
  }) =>
    api.post('/admin/children', data),
  toggleUserStatus: (id: string) =>
    api.patch(`/admin/users/${id}/status`),
  getAuditLogs: () =>
    api.get('/admin/audit-logs'),
  toggleTopicStatus: (id: string) =>
    api.patch(`/admin/topics/${id}/status`)
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
  getStudents: (search?: string) => api.get(`/teacher/students${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getStudentOverview: (studentId: string) => api.get(`/teacher/students/${studentId}/overview`),
  getStudentHistory: (studentId: string) => api.get(`/teacher/students/${studentId}/history`),
  getStudentNotes: (studentId: string) => api.get(`/teacher/students/${studentId}/notes`),
  createTeacherNote: (data: { studentId: string; lessonId?: string; noteType: string; content: string }) =>
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
  cancelAssignment: (id: string) => api.patch(`/teacher/assignments/${id}/status`, { status: 'CANCELLED' }),
  // Legacy dashboard compatibility: cancellation preserves result history.
  deleteAssignment: (id: string) => api.patch(`/teacher/assignments/${id}/status`, { status: 'CANCELLED' }),
  getCurriculumOptions: (ageGroupCode?: string) => {
    const query = ageGroupCode ? `?ageGroupCode=${ageGroupCode}` : '';
    return api.get(`/teacher/curriculum-options${query}`);
  },
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

// Parent Notification API (Phase 9)
export const parentNotificationApi = {
  sendNotification: (data: {
    childId: string;
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
    api.get(`/teacher/parent-notifications/child/${childId}`)
};

