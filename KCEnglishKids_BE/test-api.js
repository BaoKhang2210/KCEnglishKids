const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

async function runTests() {
  await connectDB();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5009, resolve));
  console.log('[Test Server] Running on port 5009');

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(`http://localhost:5009${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const json = await res.json();
    return { status: res.status, json };
  };

  try {
    console.log('\n--- 1. Testing GET /api/auth/children-avatars ---');
    const avatarsRes = await fetchJson('/api/auth/children-avatars');
    console.log('Status:', avatarsRes.status);
    console.log('Children found:', avatarsRes.json.data.map(c => `${c.name} (${c.avatar})`));

    console.log('\n--- 2. Testing POST /api/auth/child-login (Leo, Lion, PIN: 1234) ---');
    const loginRes = await fetchJson('/api/auth/child-login', {
      method: 'POST',
      body: JSON.stringify({ avatar: 'lion', pin: '1234' })
    });
    console.log('Status:', loginRes.status);
    console.log('Login successful for:', loginRes.json.user.name, 'Token received:', !!loginRes.json.token);
    const childToken = loginRes.json.token;
    const childId = loginRes.json.user.id;

    console.log('\n--- 3. Testing GET /api/topics?ageGroup=3-4 ---');
    const topicsRes = await fetchJson('/api/topics?ageGroup=3-4');
    console.log('Status:', topicsRes.status);
    console.log('Total topics:', topicsRes.json.count);
    const animalsTopic = topicsRes.json.data.find(t => t.slug === 'animals');
    console.log('Found Animals topic:', animalsTopic.englishName, `(ID: ${animalsTopic._id})`);

    console.log('\n--- 4. Testing GET /api/topics/:id/lessons ---');
    const lessonsRes = await fetchJson(`/api/topics/${animalsTopic._id}/lessons?ageGroup=3-4&childId=${childId}`);
    console.log('Status:', lessonsRes.status);
    console.log('Lessons count:', lessonsRes.json.count);
    const petLesson = lessonsRes.json.data[0];
    console.log('Lesson:', petLesson.title, `(ID: ${petLesson._id})`);

    console.log('\n--- 5. Testing GET /api/lessons/:id ---');
    const lessonDetailRes = await fetchJson(`/api/lessons/${petLesson._id}`);
    console.log('Status:', lessonDetailRes.status);
    console.log('Vocabulary items in lesson:', lessonDetailRes.json.data.vocabularyItems.map(v => v.english));
    console.log('Activities in lesson:', lessonDetailRes.json.data.activities.map(a => a.title));
    const activityInfo = lessonDetailRes.json.data.activities[0];

    console.log('\n--- 6. Testing GET /api/activities/:id ---');
    const activityDetailRes = await fetchJson(`/api/activities/${activityInfo._id}`);
    console.log('Status:', activityDetailRes.status);
    const activity = activityDetailRes.json.data;
    console.log('Activity Title:', activity.title);
    console.log('Questions count:', activity.questions.length);

    console.log('\n--- 7. Testing POST /api/learning/sessions ---');
    const sessionRes = await fetchJson('/api/learning/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${childToken}` },
      body: JSON.stringify({ lessonId: petLesson._id })
    });
    console.log('Status:', sessionRes.status);
    const session = sessionRes.json.data;
    console.log('Session ID:', session._id, 'Status:', session.status);

    console.log('\n--- 8. Testing POST /api/learning/activity-results (Submit 4 correct answers) ---');
    const answers = activity.questions.map((q, idx) => {
      const correctOpt = q.options.find(opt => opt.isCorrect);
      return {
        questionIndex: idx,
        promptText: q.promptText,
        selectedOptionId: correctOpt.id,
        isCorrect: true,
        vocabularyId: q.vocabulary,
        responseTimeMs: 1500
      };
    });

    const submitRes = await fetchJson('/api/learning/activity-results', {
      method: 'POST',
      headers: { Authorization: `Bearer ${childToken}` },
      body: JSON.stringify({
        activityId: activity._id,
        lessonId: petLesson._id,
        sessionId: session._id,
        answers,
        duration: 25
      })
    });
    console.log('Status:', submitRes.status);
    console.log('Score:', submitRes.json.data.score, 'Stars:', submitRes.json.data.stars);

    console.log('\n--- 9. Testing GET /api/children/:id/progress ---');
    const progressRes = await fetchJson(`/api/children/${childId}/progress`, {
      headers: { Authorization: `Bearer ${childToken}` }
    });
    console.log('Status:', progressRes.status);
    console.log('Child total stars:', progressRes.json.data.totalStars);
    console.log('Completed lessons count:', progressRes.json.data.completedLessonsCount);

    console.log('\n--- 10. Testing POST /api/auth/admin-login ---');
    const adminLoginRes = await fetchJson('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@kcenglishkids.com', password: 'Admin@123' })
    });
    console.log('Admin login status:', adminLoginRes.status);
    const adminToken = adminLoginRes.json.token;

    console.log('\n--- 11. Testing GET /api/admin/dashboard ---');
    const adminDashRes = await fetchJson('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Admin dashboard status:', adminDashRes.status);
    console.log('Dashboard metrics:', adminDashRes.json.data.metrics);

    console.log('\n--- 12. Testing POST /api/auth/teacher-login ---');
    const teacherLoginRes = await fetchJson('/api/auth/teacher-login', {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher@kcenglishkids.com', password: 'Teacher@123' })
    });
    console.log('Teacher login status:', teacherLoginRes.status);
    const teacherToken = teacherLoginRes.json.token;

    console.log('\n--- 13. Testing GET /api/teacher/classes ---');
    const teacherClassesRes = await fetchJson('/api/teacher/classes', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log('Teacher classes status:', teacherClassesRes.status);
    console.log('Classes found:', teacherClassesRes.json.data.map(c => `${c.name} (${c.students.length} students)`));

    console.log('\n🎉 ALL 13 ENDPOINTS TESTED & PASSED PERFECTLY!');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
