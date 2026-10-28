// Isolated, read-only visual QA. No real database, credentials or production API requests.
import { createServer } from 'vite';
const teacherMode = process.argv.includes('--teacher');
const port = teacherMode ? 5181 : 5180;
const id = n => String(n).padStart(24, '0');
const admin = { _id: id(1), id: id(1), name: 'Quản trị viên', email: 'admin@example.test', role: 'ADMIN', status: 'ACTIVE' };
const teacher = { _id: id(2), name: 'Giáo viên mẫu', email: 'teacher@example.test', role: 'TEACHER', status: 'ACTIVE' };
const units = Array.from({ length: 9 }, (_, index) => ({ _id: id(100 + index), unitNumber: index + 1, bookNumber: 1,
  bigQuestion: ['What makes a happy school?', 'How do we learn together?', 'What can our bodies do?', 'Who is in my family?', 'What do animals need?', 'What grows in the garden?', 'Where can we explore?', 'How do we stay healthy?', 'What can we make together?'][index],
  storyTitle: 'A new adventure with Koko', concept: 'Khám phá, lắng nghe và cùng nhau học tập.', oracy: 'Tự tin hỏi và trả lời với bạn bè.', status: 'ACTIVE',
  lessons: Array.from({ length: 2 }, (_, lesson) => ({ _id: id(1000 + index * 10 + lesson), title: lesson ? 'Let’s talk and play together' : 'Hello, little explorers!', vietnameseTitle: lesson ? 'Cùng trò chuyện và vui chơi' : 'Xin chào những nhà khám phá nhỏ', description: 'Học từ mới qua hình ảnh và các hoạt động gần gũi.', ageGroupCode: '3-4', displayOrder: lesson + 1, status: 'ACTIVE', vocabulary: [{ _id: id(700), english: 'School', vietnamese: 'Trường học', pronunciation: '/skuːl/' }], sentences: [{ _id: id(800), english: 'What is your name?', vietnamese: 'Bạn tên là gì?', contentType: 'QUESTION' }], vocabularyCount: 1, sentenceCount: 1, activityCount: 1 })) }));
const books = [1, 2, 3].map(number => ({ _id: id(20 + number), bookNumber: number, title: `Book ${number}`, ageGroupCode: number === 1 ? '3-4' : number === 2 ? '4-5' : '5-6', units: units.map(unit => ({ ...unit, _id: id(number * 100 + unit.unitNumber), bookNumber: number })) }));
const students = ['Học sinh mẫu A', 'Học sinh mẫu B', 'Học sinh mẫu C'].map((name, index) => ({ _id: id(10 + index), name, username: `hocsinh${index + 1}`, role: 'CHILD', status: 'ACTIVE', ageGroupCode: '3-4', assignedClass: { _id: id(5), name: 'Lớp Mầm A' }, avatar: 'lion' }));
students.forEach((student, index) => { student.stats = { hasAssessment: index < 2, averageScore: index === 0 ? 82 : 50, completedLessons: index < 2 ? 3 : 0, attempts: index < 2 ? 6 : 0, totalStars: 9 + index, learningTime: 240 }; });
const rooms = [{ _id: id(5), name: 'Lớp Mầm A', teacher, ageGroupCode: '3-4', status: 'ACTIVE', academicYear: '2026-2027', studentCount: 3, students, currentLesson: units[0].lessons[0] }];
const activity = { _id: id(400), title: 'Listen and discover', vietnameseTitle: 'Lắng nghe và khám phá', activityType: 'LISTEN_CHOOSE', status: 'ACTIVE', ageGroupCode: '3-4', difficulty: 1, lesson: units[0].lessons[0], questions: [{ _id: id(401), promptText: 'School', correctAnswer: 'School', vocabulary: { _id: id(700), english: 'School' }, metadata: { quantity: 3 }, options: [{ id: 'school', text: 'School', isCorrect: true }, { id: 'home', text: 'Home', isCorrect: false }] }] };
const sampleLesson = { ...units[0].lessons[0], curriculumUnits: [units[0]._id], vocabularyItems: units[0].lessons[0].vocabulary, languageContents: units[0].lessons[0].sentences };
const demoAssignments = [{ _id: id(900), teacher: teacher._id, classRoom: rooms[0], lesson: sampleLesson, status: 'ASSIGNED', createdAt: '2026-10-28T01:00:00Z', dueDate: '2026-10-30T16:59:59Z', instructions: 'Cùng bé luyện nghe trong 5 phút mỗi ngày.' }];
const today = new Date(Date.now() + 7 * 3600000).getUTCDay();
const demoSchedules = [{ _id: id(600), classroom: rooms[0], teacher, isActive: true, weeklySlots: [{ dayOfWeek: today, startTime: '09:00', endTime: '09:35', room: 'Phòng Mầm A' }] }];
const demoSession = { _id: id(950), title: 'Hello, little explorers!', classroom: rooms[0], teacher, lesson: sampleLesson, status: 'COMPLETED', startedAt: '2026-10-28T02:00:00Z', endedAt: '2026-10-28T02:35:00Z', createdAt: '2026-10-28T01:55:00Z', plannedDuration: 35, sessionNumber: 1, activities: [], studentScores: students.map((student, i) => ({ student, attendance: i === 2 ? 'ABSENT' : 'PRESENT', points: 5, stars: 2, correctCount: i === 2 ? 0 : 3, incorrectCount: i === 2 ? 0 : 1, status: 'ACTIVE' })), summary: { participationCount: 2, averageAccuracy: 75, totalStars: 4, totalPoints: 10, topPerformers: [], studentsNeedingPractice: [] } };
const demoThread = { _id: id(980), teacher, child: students[0], childName: students[0].name, className: rooms[0].name, subject: 'Cùng bé ôn lại từ đã học', teacherNote: 'Hôm nay bé đã tham gia hoạt động nghe và chọn hình. Gia đình có thể cùng bé nghe lại từ School qua một trò chơi ngắn nhé.', content: 'Hôm nay bé đã tham gia hoạt động nghe và chọn hình. Gia đình có thể cùng bé nghe lại từ School qua một trò chơi ngắn nhé.', status: 'SENT', channel: 'IN_APP', createdAt: '2026-10-28T03:00:00Z', sentAt: '2026-10-28T03:00:00Z', replies: [{ senderRole: 'PARENT', senderName: 'Phụ huynh mẫu', message: 'Gia đình sẽ cùng bé ôn lại vào chiều nay. Cảm ơn giáo viên!', createdAt: '2026-10-28T04:00:00Z' }] };
function response(path, url) {
  if (path === '/api/auth/me') return { success: true, data: teacherMode ? teacher : admin };
  if (path === '/api/teacher/dashboard') return { success: true, data: { metrics: { classes: 1, students: 3, activeAssignments: 1, completedAssignments: 2, needingAttention: 1, unassessedStudents: 1, averageScore: 66 }, recentAssignments: demoAssignments, recentSessions: [] } };
  if (path === '/api/teacher/classes') return { success: true, data: rooms };
  if (path.includes('/api/teacher/classes/')) return { success: true, data: { ...rooms[0], assignments: demoAssignments } };
  if (path === '/api/teacher/students') return { success: true, data: students };
  if (path.includes('/api/teacher/students/') && path.endsWith('/overview')) return { success: true, data: { student: students[0], stats: students[0].stats, notes: [], progressList: [], recentActivities: [], sessions: [], assignments: demoAssignments } };
  if (path === '/api/teacher/my-schedule') return { success: true, data: demoSchedules };
  if (path === '/api/teacher/classroom-sessions') return { success: true, pages: 1, data: url.searchParams.get('status') === 'LIVE' ? [] : [demoSession] };
  if (path.includes('/api/teacher/classroom-sessions/')) return { success: true, data: demoSession };
  if (path === '/api/teacher/content' || path === '/api/teacher/curriculum-options') return { success: true, data: { books, units, lessons: units.flatMap(unit => unit.lessons.map(lesson => ({ ...lesson, curriculumUnits: [unit._id], vocabularyItems: lesson.vocabulary, languageContents: lesson.sentences }))), activities: [{ ...activity, lesson: sampleLesson._id }] } };
  if (path === '/api/teacher/assignments') return { success: true, data: demoAssignments };
  if (path.includes('/api/teacher/assignments/')) return { success: true, data: { assignment: demoAssignments[0], studentSubmissions: students.map(student => ({ student, hasSubmitted: false, submission: null })), results: [], stats: { totalStudents: 3, submittedStudents: 0, unsubmittedStudents: 3, submissionRate: 0, averageScore: 0 } } };
  if (path.startsWith('/api/teacher/parent-notifications')) return { success: true, data: [demoThread] };
  if (path.startsWith('/api/teacher/lessons/')) return { success: true, data: { ...sampleLesson, activities: [activity] } };
  if (path === '/api/admin/settings') return { success: true, data: { schoolName: 'Trường Mầm Non KCEnglishKids', academicYear: '2026-2027', contactEmail: 'school@example.test' } };
  if (path.includes('/curriculum/deep')) return { success: true, data: books };
  if (path.includes('/curriculum-progress')) return { success: true, data: { classroom: rooms[0], curriculumBook: books[0], currentLesson: units[0].lessons[0], units, sequentialSyllabus: units.flatMap(unit => unit.lessons), totalLessons: 18, completedCount: 0 } };
  if (path === '/api/admin/classrooms') return { success: true, data: rooms };
  if (path.startsWith('/api/admin/classrooms/')) return { success: true, data: rooms[0] };
  if (path === '/api/admin/users') { const role = url.searchParams.get('role'); const users = role === 'TEACHER' ? [teacher] : role === 'CHILD' ? students : [admin, teacher, ...students]; return { success: true, data: users, pages: 1, total: users.length }; }
  if (path === '/api/admin/sentences') return { success: true, data: units.flatMap(unit => unit.lessons.map(lesson => ({ ...lesson.sentences[0], _id: lesson._id, sourceUnit: unit, lesson }))), pages: 1, total: 18 };
  if (path === '/api/admin/activities') return { success: true, data: [activity], pagination: { page: 1, totalPages: 1, total: 1 }, stats: { totalActivities: 1, activeCount: 1, inactiveCount: 0, byType: { LISTEN_CHOOSE: 1 }, byAgeGroup: { '3-4': 1 } } };
  if (path.startsWith('/api/admin/activities/')) return { success: true, data: activity };
  if (path === '/api/admin/schedules') return { success: true, data: [{ _id: id(600), classroom: rooms[0], teacher, academicYear: '2026-2027', isActive: true, colorTag: 'indigo', weeklySlots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '08:45', room: 'Phòng 101', subjectNote: 'English communication' }, { dayOfWeek: 3, startTime: '08:00', endTime: '08:45', room: 'Phòng 101', subjectNote: 'Phonics and story' }] }] };
  if (path === '/api/admin/dashboard') return { success: true, data: { metrics: { totalChildren: 3, totalTeachers: 1, totalCurriculumUnits: 27, activeLessons: 54, totalActivities: 18, totalVocabulary: 120, completedSessions: 12, totalSessions: 14 }, recentResults: [] } };
  if (path === '/api/admin/analytics/overview') return { success: true, data: { totalStudents: 3, totalClassrooms: 1, totalSessionsConducted: 12, totalHomeStars: 24, totalClassStars: 15, totalAllStars: 39, topStudents: students.map((student, index) => ({ ...student, totalStars: 15 - index, homeStars: 10, classStars: 5, className: 'Lớp Mầm A' })), classroomStats: [{ ...rooms[0], teacherName: teacher.name, sessionCount: 12, homeStars: 24, classStars: 15, totalStars: 39, avgStarsPerStudent: 13 }] } };
  if (path === '/api/admin/audit-logs') return { success: true, data: [{ _id: id(900), action: 'CREATE_CLASSROOM', targetType: 'ClassRoom', user: admin, createdAt: '2026-10-28T02:00:00Z', details: { name: 'Lớp Mầm A' } }], total: 1, pages: 1 };
  if (path === '/api/recognitions/classes') return { success: true, data: rooms };
  if (path.startsWith('/api/recognitions/classes/')) return { success: true, data: { className: 'Lớp Mầm A', period: { start: '2026-10-19', lastDate: '2026-10-25', end: '2026-10-26' }, reward: { title: 'Ngôi sao của tuần', symbol: '🌟', description: 'Cùng ghi nhận nỗ lực của các bé', suggestion: 'Một hoạt động vui cùng cả lớp.' }, ranking: students.map((student, index) => ({ child: student._id, name: student.name, stars: 5 - index, sessions: 2, winner: index === 0 })), published: null, canPublish: true } };
  return { success: true, data: [] };
}
const server = await createServer({ root: new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), server: { host: '127.0.0.1', port, strictPort: true }, plugins: [{ name: 'read-only-admin-fixtures',
  transformIndexHtml() { return [{ tag: 'script', injectTo: 'head-prepend', children: `localStorage.setItem('kc_token','visual-qa-only');localStorage.setItem('kc_user',${JSON.stringify(JSON.stringify(teacherMode ? teacher : admin))});` }]; },
  configureServer(server) { server.middlewares.use((req, res, next) => {
    if (!req.url.startsWith('/api/')) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method !== 'GET') { res.statusCode = 405; return res.end(JSON.stringify({ success: false, message: 'Bản xem thử chỉ đọc. Không lưu dữ liệu.' })); }
    const url = new URL(req.url, 'http://127.0.0.1:5180'); res.end(JSON.stringify(response(url.pathname, url)));
  }); }
}] });
await server.listen();
console.log('Read-only visual QA: http://127.0.0.1:' + port + (teacherMode ? '/teacher/dashboard' : '/admin/curriculum'));
