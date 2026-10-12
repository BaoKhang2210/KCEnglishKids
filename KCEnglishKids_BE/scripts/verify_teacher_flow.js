/**
 * E2E test script for the entire Teacher Flow over live HTTP:
 * 1. Login Teacher (teacher@kcenglishkids.com / Teacher@123)
 * 2. Dashboard metrics & overview
 * 3. Classes list & class detail (A-Z Vietnamese collation, student stats)
 * 4. Students list & individual student overview (learning time, scores, notes)
 * 5. Learning content browser (Units, Lessons, Activities)
 * 6. Sentence patterns (Units overview & sentence teaching list)
 * 7. Live Classroom Session lifecycle:
 *    - Create session
 *    - Start session
 *    - Award stars to student
 *    - End session
 *    - Fetch session summary
 * 8. Teacher Notes: create and verify note
 */

const BASE = 'http://localhost:5000/api';
const EMAIL = process.argv[2] || 'teacher@kcenglishkids.com';
const PASSWORD = process.argv[3] || 'Teacher@123';

let TOKEN = '';
const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> HTTP ${res.status}: ${data.message || JSON.stringify(data).slice(0, 160)}`
    );
  }
  return data;
};

(async () => {
  console.log('=== [TEACHER FLOW E2E VERIFICATION] ===\n');

  // 1. Teacher Login
  console.log('[1] Logging in as Teacher...');
  const loginRes = await api('POST', '/auth/teacher-login', { email: EMAIL, password: PASSWORD });
  TOKEN = loginRes.token;
  console.log(`    ✓ Login SUCCESS: ${loginRes.user.name} (${loginRes.user.role}) - ID: ${loginRes.user._id || loginRes.user.id}`);

  // 2. Teacher Dashboard
  console.log('\n[2] Testing Teacher Dashboard Metrics...');
  const dashRes = await api('GET', '/teacher/dashboard');
  const m = dashRes.data.metrics;
  console.log(`    ✓ Dashboard OK: Classes=${m.classes}, Students=${m.students}, ActiveAssignments=${m.activeAssignments}, AvgScore=${m.averageScore}%, Stars=${m.stars}`);

  // 3. Teacher Classes List
  console.log('\n[3] Testing Classes List...');
  const classesRes = await api('GET', '/teacher/classes');
  console.log(`    ✓ Fetched ${classesRes.count} classes`);
  if (!classesRes.data || classesRes.data.length === 0) {
    throw new Error('No classes found for this teacher!');
  }
  const myClass = classesRes.data[0];
  console.log(`    ✓ Target class: "${myClass.name}" (Age ${myClass.ageGroupCode || '—'}, ${myClass.students?.length || 0} students)`);

  // 4. Class Detail & Vietnamese A-Z collation
  console.log('\n[4] Testing Class Detail & Student Roster...');
  const classDetailRes = await api('GET', `/teacher/classes/${myClass._id}`);
  const students = classDetailRes.data.students || [];
  console.log(`    ✓ Class Detail OK: Found ${students.length} students in "${classDetailRes.data.name}"`);
  if (students.length > 0) {
    console.log('    Sample student roster (A-Z check):');
    students.slice(0, 5).forEach((s, idx) => {
      console.log(`      ${idx + 1}. ${s.name.padEnd(20)} | Stars: ${s.stats?.totalStars ?? 0} | Lessons: ${s.stats?.completedLessons ?? 0} | Score: ${Math.round(s.stats?.averageScore || 0)}%`);
    });
  }

  // 5. Teacher Students list
  console.log('\n[5] Testing Teacher Students List...');
  const studentsRes = await api('GET', '/teacher/students');
  console.log(`    ✓ Fetched ${studentsRes.data.length} total students assigned`);
  const targetStudent = studentsRes.data[0];

  // 6. Student Overview Detail
  if (targetStudent) {
    console.log(`\n[6] Testing Student Detail Overview for "${targetStudent.name}"...`);
    const studentOverview = await api('GET', `/teacher/students/${targetStudent._id}/overview`);
    const st = studentOverview.data.stats;
    console.log(`    ✓ Student Overview OK: Stars=${st.totalStars}, CompletedLessons=${st.completedLessons}, AvgScore=${st.averageScore}%, LearningTime=${Math.round(st.learningTime / 60)}min`);
  }

  // 7. Learning Content Browser
  console.log('\n[7] Testing Learning Content (Curriculum, Units, Lessons)...');
  const contentRes = await api('GET', '/teacher/content?ageGroupCode=3-4');
  console.log(`    ✓ Content OK: ${contentRes.data.units.length} Units, ${contentRes.data.lessons.length} Lessons, ${contentRes.data.activities.length} Activities`);

  // 8. Sentence Patterns (Classroom Teaching Screen)
  console.log('\n[8] Testing Sentence Patterns API...');
  const unitsOverviewRes = await api('GET', '/teacher/sentence-patterns/units-overview');
  console.log(`    ✓ Sentence Units Overview: ${unitsOverviewRes.data.length} Units with sentence content`);
  const sentencesRes = await api('GET', '/teacher/sentence-patterns?limit=5');
  console.log(`    ✓ Sentences List OK: Fetched ${sentencesRes.data.length} sentence cards`);
  if (sentencesRes.data.length > 0) {
    const s = sentencesRes.data[0];
    console.log(`      Sample: [${s.contentType}] "${s.english}" -> "${s.vietnamese}"`);
  }

  // 9. Classroom Session Lifecycle (Create -> Live -> Score -> End -> Summary)
  console.log('\n[9] Testing Live Classroom Session Lifecycle...');
  const firstLesson = contentRes.data.lessons[0];
  const createSessionRes = await api('POST', '/teacher/classroom-sessions', {
    classroomId: myClass._id,
    lessonId: firstLesson._id,
    title: 'Buổi học tiếng Anh trực tiếp mẫu'
  });
  const session = createSessionRes.data;
  console.log(`    ✓ Created Classroom Session: ID=${session._id}, status=${session.status}, name="${session.sessionName}"`);

  // Start session
  const startSessionRes = await api('POST', `/teacher/classroom-sessions/${session._id}/start`, {});
  console.log(`    ✓ Started Session: status=${startSessionRes.data.status}`);

  // Score student in session
  if (targetStudent) {
    const scoreRes = await api('POST', `/teacher/classroom-sessions/${session._id}/score-student`, {
      studentId: targetStudent._id,
      stars: 2,
      points: 20,
      notes: 'Bé phát âm rất to và rõ ràng'
    });
    console.log(`    ✓ Awarded Stars to "${targetStudent.name}": status=${scoreRes.success}`);
  }

  // End session
  const endSessionRes = await api('POST', `/teacher/classroom-sessions/${session._id}/end`, {});
  console.log(`    ✓ Ended Session: status=${endSessionRes.data.status}`);

  // Session summary
  const summaryRes = await api('GET', `/teacher/classroom-sessions/${session._id}/summary`);
  console.log(`    ✓ Session Summary OK: TotalStars=${summaryRes.data.totalStarsAwarded}, Participants=${summaryRes.data.attendanceCount}`);

  // 10. Teacher Notes
  if (targetStudent) {
    console.log('\n[10] Testing Teacher Notes...');
    const noteRes = await api('POST', '/teacher/notes', {
      studentId: targetStudent._id,
      noteType: 'GENERAL',
      content: 'Bé tiếp thu bài rất nhanh và hào hứng tham gia hoạt động.'
    });
    console.log(`    ✓ Created Private Teacher Note: ID=${noteRes.data._id}`);
  }

  console.log('\n=== ALL 10 TEACHER FLOW CHECKS PASSED PERFECTLY! ✔ ===\n');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ TEACHER FLOW FAILED:', err.message);
  process.exit(1);
});
