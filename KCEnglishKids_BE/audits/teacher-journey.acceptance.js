// Real HTTP and MongoDB, with a unique disposable database; never uses the application database.
require('dotenv').config({ quiet: true });
const cloud = process.argv.includes('--cloud');
if (!cloud) process.env.AI_PROVIDER = 'local';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const M = require('../src/models');
const app = require('../src/app');
const { jwtSecret } = require('../src/config/auth');
const dbName = 'kcenglishkids_qa_teacher_' + Date.now();
const serve = process.argv.includes('--serve');
const checks = [];
const cloudResults = [];
const upstream = [];
if (cloud) {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return fetchOriginal(url, options);
    const started = Date.now();
    try {
      const response = await fetchOriginal(url, options);
      const diagnostic = { status: response.status, durationMs: Date.now() - started };
      if (!response.ok) {
        const body = await response.clone().json().catch(() => ({}));
        diagnostic.code = body.error?.status || 'UNKNOWN';
      } else {
        const body = await response.clone().json().catch(() => ({}));
        diagnostic.finishReason = body.candidates?.[0]?.finishReason;
        const text = body.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || '';
        try {
          const generated = JSON.parse(text);
          if (generated.options) diagnostic.options = generated.options.map(option => ({ type: option.type, suggestedStars: option.suggestedStars,
            textIssues: ['badge', 'title', 'content'].filter(key => typeof option[key] !== 'string' || option[key].length > (key === 'content' ? 1200 : 100) || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(option[key])) }));
        } catch { diagnostic.validJson = false; }
      }
      upstream.push(diagnostic);
      return response;
    } catch (error) {
      upstream.push({ error: error.name, causeCode: error.cause?.code, durationMs: Date.now() - started });
      throw error;
    }
  };
}
let server, vite;
const f = {};
async function main() {
  if (cloud && !require('../src/services/geminiProvider').configuration().enabled) throw new Error('Cloud AI configuration is incomplete.');
  await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 8000 });
  assert.equal(mongoose.connection.name, dbName);
  await Promise.all(Object.values(M).filter(model => model?.init).map(model => model.init()));
  const age = await M.AgeGroup.create({ code: '3-4', name: 'Mầm', targetAgeMin: 3, targetAgeMax: 4, status: 'ACTIVE' });
  const book = await M.CurriculumBook.create({ bookNumber: 1, title: 'Demo Animals', ageGroup: age._id, ageGroupCode: '3-4', status: 'ACTIVE' });
  f.unit = await M.CurriculumUnit.create({ book: book._id, bookNumber: 1, unitNumber: 1, ageGroup: age._id, ageGroupCode: '3-4', bigQuestion: 'Which animals do you know?', status: 'ACTIVE' });
  const topic = await M.Topic.create({ englishName: 'Animals', vietnameseName: 'Động vật', slug: 'qa-animals', status: 'ACTIVE' });
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../client/public/images/manifest.json'), 'utf8'));
  f.words = await M.Vocabulary.create(['cat', 'dog', 'bird', 'rabbit'].map((english, i) => ({ english, vietnamese: ['mèo', 'chó', 'chim', 'thỏ'][i], wordType: 'noun', ageGroupCodes: ['3-4'], imageUrl: manifest.vocabulary[english].url, status: 'ACTIVE', isTransparent: true })));
  f.lessons = await M.Lesson.create([1, 2].map(n => ({ key: 'B1_U1_L' + n, title: n === 1 ? 'My Pet Friends' : 'More Animal Friends', vietnameseTitle: n === 1 ? 'Những người bạn thú cưng' : 'Thêm bạn động vật', displayOrder: n, topic: topic._id, curriculumUnits: [f.unit._id], ageGroup: age._id, ageGroupCode: '3-4', vocabularyItems: f.words.map(word => word._id), status: 'ACTIVE' })));
  f.activity = await M.Activity.create({ title: 'Listen and choose: cat', lesson: f.lessons[0]._id, activityType: 'LISTEN_CHOOSE', ageGroup: age._id, ageGroupCode: '3-4', status: 'ACTIVE', pointsPerQuestion: 10, questions: [{ promptText: 'cat', vocabulary: f.words[0]._id, correctAnswer: 'cat', options: [{ id: 'cat', text: 'cat', imageUrl: f.words[0].imageUrl, isCorrect: true }, { id: 'dog', text: 'dog', imageUrl: f.words[1].imageUrl, isCorrect: false }] }] });
  await M.LanguageContent.create({ contentType: 'QUESTION', english: 'What is this?', vietnamese: 'Đây là con gì?', sourceUnit: f.unit._id, ageGroupCode: '3-4', vocabulary: f.words.map(word => word._id), status: 'ACTIVE' });
}

async function seedPeople() {
  [f.teacher, f.other] = await M.User.create([{ name: 'Giáo viên Demo', role: 'TEACHER', email: 'demo.teacher@example.test', password: 'DemoTeacher@2026', status: 'ACTIVE' }, { name: 'Giáo viên khác', role: 'TEACHER', status: 'ACTIVE' }]);
  f.children = await M.User.create(['An', 'Bình', 'Chi'].map((name, i) => ({ name: 'Bé ' + name, username: 'demo' + i, role: 'CHILD', password: 'DemoChild@2026', pin: '4826', ageGroupCode: '3-4', status: 'ACTIVE' })));
  f.room = await M.ClassRoom.create({ name: 'DEMO Mầm A', teacher: f.teacher._id, students: f.children.map(child => child._id), ageGroupCode: '3-4', status: 'ACTIVE', curriculumBook: f.unit.book });
  await M.User.updateMany({ _id: { $in: f.children.map(child => child._id) } }, { $set: { assignedClass: f.room._id } });
  const otherRoom = await M.ClassRoom.create({ name: 'Lớp giáo viên khác', teacher: f.other._id, students: [], ageGroupCode: '3-4', status: 'ACTIVE' });
  await M.Schedule.create([f.room, otherRoom].map(room => ({ classroom: room._id, teacher: room.teacher, effectiveFrom: new Date('2020-01-01'), weeklySlots: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '23:59', room: 'Phòng demo' })) })));
}

async function verify() {
  server = app.listen(serve ? 5001 : 0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const token = user => jwt.sign({ id: String(user._id), authVersion: 0 }, jwtSecret());
  async function request(route, body, user = f.teacher, expected = 200, method) {
    const response = await fetch(base + '/api' + route, { method: method || (body ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + token(user), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    assert.equal(response.status, expected, route + ': ' + data.message);
    return data.data;
  }
  async function check(name, run) { await run(); checks.push({ name, passed: true }); console.log('PASS ' + name); }
  const lessonId = String(f.lessons[0]._id), childId = String(f.children[0]._id), roomId = String(f.room._id);
  if (!serve) {
  await check('Teacher login accepts the demo credentials and rejects the wrong password', async () => {
    for (const [password, expected] of [['DemoTeacher@2026', 200], ['wrong-password', 401]]) {
      const response = await fetch(base + '/api/auth/teacher-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo.teacher@example.test', password }) });
      assert.equal(response.status, expected);
    }
  });
  await check('Schedule and content contain only the assigned class', async () => {
    assert.equal((await request('/teacher/classes')).length, 1);
    assert.equal((await request('/teacher/my-schedule')).length, 1);
    assert.equal((await request('/teacher/content?classroomId=' + roomId)).lessons.length, 2);
    await request('/teacher/classes/' + roomId, undefined, f.other, 403);
  });
  await check('Lesson preview has real local pictures; sentence screen falls back to the Unit', async () => {
    for (const word of f.words) assert.equal((await fetch(base + word.imageUrl)).status, 200);
    assert.ok((await request('/teacher/sentence-patterns?lessonId=' + lessonId)).length > 0);
  });
  await check('Homework is unavailable before there is any evidence of learning', async () => {
    assert.equal((await request('/teacher/assignments/proposal?classRoomId=' + roomId)).available, false);
    await request('/teacher/assignments', { classRoomId: roomId, lessonId, activityId: String(f.activity._id) }, f.teacher, 400);
  });
  await check('Planner creates a 25 minute plan with explicit source and fallback status', async () => {
    const started = Date.now();
    f.plan = await request('/ai/generate-lesson-plan', { lessonId, classroomId: roomId, durationMinutes: 25, teachingStyle: 'active_tpr' });
    assert.equal(f.plan.meta.durationMinutes, 25); assert.ok(f.plan.phases.length);
    if (cloud) { const result = { feature: 'lessonPlan', source: f.plan.source, generative: f.plan.generative, fallback: f.plan.fallback, durationMs: Date.now() - started }; cloudResults.push(result); console.log('CLOUD ' + JSON.stringify(result)); }
  });
  const records = f.children.map((child, i) => ({ student: String(child._id), status: i === 2 ? 'ABSENT' : 'PRESENT' }));
  await check('Prepare attendance, retain duration and plan, then start one live classroom', async () => {
    f.session = await request('/teacher/classroom-sessions', { classroomId: roomId, lessonId, plannedDuration: 25, lessonPlan: f.plan, activityIds: [String(f.activity._id)], attendanceRecords: records }, f.teacher, 201);
    assert.equal(f.session.plannedDuration, 25);
    assert.equal((await request('/teacher/classroom-sessions/' + f.session._id + '/start', {})).status, 'LIVE');
  });
  const sessionRoute = '/teacher/classroom-sessions/' + f.session._id;
  await check('Live scoring rejects absence and deduplicates repeated clicks', async () => {
    const score = { studentId: childId, stars: 1, correctDelta: 1, incorrectDelta: 0, operationId: randomUUID() };
    await request(sessionRoute + '/score-student', score);
    await request(sessionRoute + '/score-student', score);
    await request(sessionRoute + '/score-student', { ...score, studentId: String(f.children[2]._id), operationId: randomUUID() }, f.teacher, 400);
    const session = await request(sessionRoute);
    assert.equal(session.studentScores[0].stars, 1);
  });
  await check('Observation saved from the session also appears in the Unit overview', async () => {
    await request('/teacher/students/' + childId + '/observations', { lessonId, sessionId: String(f.session._id), skill: 'LISTEN_POINT', level: 'SUPPORTED', evidence: 'Bé chỉ đúng tranh mèo sau khi cô đọc chậm.', nextStep: 'Đổi vị trí hai tranh và chờ bé chọn.', operationId: randomUUID() }, f.teacher, 201);
    const unit = await request('/teacher/classes/' + roomId + '/unit-review?unitId=' + f.unit._id);
    assert.equal(unit.roster.find(row => row.child._id === childId).latest.LISTEN_POINT.level, 'SUPPORTED');
  });
  await check('Closing validates objectives, advances class curriculum once and freezes live scoring', async () => {
    await M.ClassroomSession.updateOne({ _id: f.session._id }, { $set: { startedAt: new Date(Date.now() - 120000) } });
    await request(sessionRoute + '/end', {}, f.teacher, 400);
    const outcome = { coverage: 'COMPLETE', goalsCovered: ['LISTEN_POINT', 'EXPRESS', 'PARTICIPATE'] };
    await request(sessionRoute + '/end', outcome); await request(sessionRoute + '/end', outcome);
    await request(sessionRoute + '/score-student', { studentId: childId, stars: 1, operationId: randomUUID() }, f.teacher, 409);
    assert.equal((await M.ClassRoom.findById(roomId)).completedLessons.length, 1);
  });
  await check('Classroom-only answers do not fabricate practice accuracy; actual attended time is counted', async () => {
    const students = await request('/teacher/students');
    const row = students.find(student => student._id === childId).stats;
    assert.equal(row.averageScore, null);
    assert.equal(row.hasAssessment, false);
    assert.equal(row.classroomAccuracy, 100);
    assert.equal((await request('/teacher/dashboard')).metrics.needingAttention, 3);
    assert.ok(row.classroomLearningTime >= 120);
    assert.equal(students.find(student => student._id === String(f.children[2]._id)).stats.learningTime, 0);
  });
  await check('Teacher assigns one homework activity and the child receives that same assignment', async () => {
    assert.equal((await request('/teacher/assignments/proposal?classRoomId=' + roomId + '&studentId=' + childId)).available, true);
    f.assignment = await request('/teacher/assignments', { classRoomId: roomId, assignedToType: 'STUDENT', studentId: childId, lessonId, activityId: String(f.activity._id), instructions: 'Cùng nghe và chọn tranh mèo trong 5 phút.' }, f.teacher, 201);
    const homework = await request('/children/' + childId + '/home-practice', undefined, f.children[0]);
    assert.equal(homework.assignment._id, f.assignment._id);
    assert.equal(homework.assignment.activityId, String(f.activity._id));
  });
  await check('Child submits the real activity; teacher reviews it and family reads the feedback', async () => {
    const learning = await request('/learning/sessions', { lessonId }, f.children[0]);
    await request('/learning/activity-results', { lessonId, activityId: String(f.activity._id), sessionId: learning._id, answers: [{ questionIndex: 0, selectedOptionId: 'cat' }], duration: 15, submissionId: randomUUID() }, f.children[0], 201);
    const detail = await request('/teacher/assignments/' + f.assignment._id);
    assert.equal(detail.studentSubmissions[0].hasSubmitted, true);
    const started = Date.now();
    const note = await request('/ai/generate-parent-note', { childId, assignmentId: String(f.assignment._id), resultId: String(detail.studentSubmissions[0].submission._id) });
    assert.equal(note.options.length, 3);
    if (cloud) { const result = { feature: 'parentNote', source: note.source, generative: note.generative, fallback: note.fallback, durationMs: Date.now() - started }; cloudResults.push(result); console.log('CLOUD ' + JSON.stringify(result)); }
    await request('/teacher/assignments/' + f.assignment._id + '/submissions/' + childId + '/review', { comment: 'Bé chọn đúng tranh mèo. Gia đình đổi vị trí tranh để cùng bé chơi tiếp.', bonusStars: 1 });
    assert.equal((await request('/children/' + childId + '/home-practice', undefined, f.children[0])).assignment, null);
    assert.ok((await request('/children/' + childId + '/parent-notifications', undefined, f.children[0])).length);
  });
  await check('Family report uses evidence and assigned homework; retries do not duplicate delivery', async () => {
    const draft = await request(sessionRoute + '/family-report-draft');
    const row = draft.rows.find(row => row.childId === childId);
    assert.equal(row.assignment._id, f.assignment._id);
    const body = { sessionId: String(f.session._id), childReports: [{ childId, basisToken: row.basisToken, observationIds: row.observations.map(item => item._id), includeAssignment: true }] };
    const preview = await request(sessionRoute + '/family-report-preview', body);
    assert.ok(preview[0].content.includes('chọn tranh mèo'));
    await request('/teacher/parent-notifications/bulk', body, f.teacher, 201);
    await request('/teacher/parent-notifications/bulk', body, f.teacher, 201);
    assert.equal(await M.ParentNotification.countDocuments({ sourceKey: 'session:' + f.session._id + ':' + childId }), 1);
  });
  await check('All remaining teacher destinations load their real data and absent/no-data children stay distinct', async () => {
    for (const route of ['/teacher/dashboard', '/teacher/tasks', '/teacher/students', '/teacher/students/' + childId + '/overview', '/teacher/classroom-sessions', '/recognitions/classes']) await request(route);
    const students = await request('/teacher/students');
    assert.equal(students.find(row => row._id === String(f.children[2]._id)).stats.hasAssessment, false);
  });
  await check('Private notes can be created, edited and removed without sending a family message', async () => {
    const count = await M.ParentNotification.countDocuments();
    const note = await request('/teacher/notes', { studentId: childId, lessonId, content: 'Ghi chú nội bộ: đọc chậm và cho bé thêm thời gian.' }, f.teacher, 201);
    await request('/teacher/notes/' + note._id, { content: 'Ghi chú nội bộ đã cập nhật.' }, f.teacher, 200, 'PUT');
    await request('/teacher/notes/' + note._id, undefined, f.other, 403, 'DELETE');
    await request('/teacher/notes/' + note._id, undefined, f.teacher, 200, 'DELETE');
    assert.equal(await M.ParentNotification.countDocuments(), count);
  });
  await check('Cancelling homework removes it from current work while keeping submission history', async () => {
    await request('/teacher/assignments/' + f.assignment._id, undefined, f.teacher, 200, 'DELETE');
    assert.equal((await M.Assignment.findById(f.assignment._id)).status, 'CANCELLED');
    assert.ok((await request('/teacher/assignments/' + f.assignment._id)).studentSubmissions[0].hasSubmitted);
    assert.equal((await request('/children/' + childId + '/home-practice', undefined, f.children[0])).assignment, null);
  });
  await check('Scheduled lesson is authoritative; an old lesson cannot start in that slot', async () => {
    await M.Schedule.updateMany({ classroom: roomId }, { $set: { 'weeklySlots.$[].lesson': f.lessons[1]._id } });
    const draft = await request('/teacher/classroom-sessions', { classroomId: roomId, lessonId, lessonPlan: f.plan }, f.teacher, 201);
    await request('/teacher/classroom-sessions/' + draft._id + '/start', {}, f.teacher, 409);
  });
  await check('Gap review keeps the selected vocabulary and cannot award stars or complete a new lesson', async () => {
    await M.VocabularyMastery.findOneAndUpdate({ student: f.children[1]._id, vocabulary: f.words[0]._id }, { $set: { correctCount: 0, wrongCount: 4, attemptCount: 4, masteryLevel: 2 } }, { upsert: true });
    const gaps = await request('/ai/class-gaps?classRoomId=' + roomId);
    assert.ok(gaps.gaps.some(word => word.english === 'cat'));
    assert.ok(gaps.unassessed.length > 0);
    const before = (await request('/teacher/students')).map(student => [student._id, student.stats.totalStars]);
    const draft = await request('/teacher/classroom-sessions', { classroomId: roomId, lessonId: String(f.lessons[1]._id), isGapReview: true, gapWords: 'cat', attendanceRecords: records }, f.teacher, 201);
    assert.equal(draft.isGapReview, true);
    assert.deepEqual(draft.lesson.vocabularyItems.map(word => word.english), ['cat']);
    assert.deepEqual(draft.lessonPlan.reviewFocus.map(word => word.english), ['cat']);
    const route = '/teacher/classroom-sessions/' + draft._id;
    // Legacy drafts may store review mode only inside their prepared plan.
    await M.ClassroomSession.updateOne({ _id: draft._id }, { $unset: { isGapReview: 1 } });
    assert.equal((await request(route)).isGapReview, true);
    await request(route + '/start', {});
    await request(route + '/score-student', { studentId: childId, stars: 1, operationId: randomUUID() }, f.teacher, 400);
    await request(route + '/score-bulk', { studentIds: [childId, String(f.children[1]._id)], stars: 3, operationId: randomUUID() }, f.teacher, 400);
    await request(route + '/score-student', { studentId: childId, correctDelta: 1, operationId: randomUUID() });
    const ended = await request(route + '/end', { coverage: 'COMPLETE', goalsCovered: ['LISTEN_POINT', 'EXPRESS', 'PARTICIPATE'] });
    assert.equal(ended.teachingOutcome.coverage, 'REVIEW');
    assert.equal(ended.summary.totalStars, 0);
    assert.equal((await M.ClassRoom.findById(roomId)).completedLessons.length, 1);
    assert.equal((await M.ClassRoom.findById(roomId)).currentLesson.toString(), f.lessons[1]._id.toString());
    assert.deepEqual((await request('/teacher/students')).map(student => [student._id, student.stats.totalStars]), before);
    assert.ok(!(await require('../src/services/homeworkProposal').studiedLessonIds(await M.ClassRoom.findById(roomId))).includes(String(f.lessons[1]._id)));
  });
  await check('Admin teaching totals agree with class counts beyond the recent-history limit and exclude self-study', async () => {
    const admin = await M.User.create({ name: 'QA Admin', role: 'ADMIN', status: 'ACTIVE' });
    await M.ClassroomSession.insertMany(Array.from({ length: 23 }, () => ({ classroom: f.room._id, teacher: f.teacher._id, lesson: f.lessons[0]._id, status: 'COMPLETED', startedAt: new Date(Date.now() - 60000), endedAt: new Date() })));
    const before = (await request('/admin/dashboard', undefined, admin)).metrics.completedSessions;
    await M.LearningSession.create({ child: f.children[1]._id, lesson: f.lessons[1]._id, status: 'COMPLETED' });
    const dashboard = await request('/admin/dashboard', undefined, admin);
    const detail = await request('/admin/classrooms/' + roomId + '/curriculum-progress', undefined, admin);
    assert.equal(detail.recentSessions.length, 20);
    assert.equal(detail.sessionCounts.COMPLETED, 25);
    assert.equal(dashboard.metrics.completedSessions, detail.sessionCounts.COMPLETED);
    assert.equal(dashboard.metrics.completedSessions, before);
    assert.equal(dashboard.metrics.totalSessions, await M.ClassroomSession.countDocuments());
  });
  if (cloud) {
    await check('Audio endpoint safely handles a synthetic silent WAV without inventing speech', async () => {
      const samples = 16000, wav = Buffer.alloc(44 + samples * 2);
      wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
      const started = Date.now();
      const response = await fetch(base + '/api/ai/evaluate-audio', { method: 'POST', headers: { Authorization: 'Bearer ' + token(f.children[0]), 'Content-Type': 'application/json' }, body: JSON.stringify({ targetWord: 'cat', ageGroup: '3-4', mimeType: 'audio/wav', audioBase64: wav.toString('base64') }) });
      const body = await response.json();
      const result = { feature: 'audioSilence', status: response.status, generative: response.ok, evaluated: body.data?.evaluated, durationMs: Date.now() - started };
      cloudResults.push(result); console.log('CLOUD ' + JSON.stringify(result));
      if (response.ok) assert.equal(body.data.evaluated, false);
      else assert.equal(response.status, 503);
    });
  }
  const passed = !cloud || cloudResults.every(result => result.generative === true);
  fs.writeFileSync(path.resolve(__dirname, cloud ? '../../docs/ai-live-validation.json' : '../../docs/teacher-journey-validation.json'), JSON.stringify({ checkedAt: new Date().toISOString(), method: cloud ? 'Live configured Gemini through authenticated application HTTP with synthetic data in a disposable database' : 'Real HTTP and MongoDB in a unique disposable database; local pedagogical AI fallback', model: cloud ? process.env.GEMINI_MODEL : undefined, checks, cloudResults, upstream, passed }, null, 2) + '\n');
  if (!passed) process.exitCode = 1;
  }
  if (serve) {
    const { createServer } = await import('../../client/node_modules/vite/dist/node/index.js');
    const identity = user => ({ _id: String(user._id), id: String(user._id), name: user.name, role: user.role, status: user.status, ageGroupCode: user.ageGroupCode });
    vite = await createServer({ root: path.resolve(__dirname, '../../client'), server: { host: '127.0.0.1', port: 5183, strictPort: true, proxy: { '/api': { target: base, changeOrigin: true } } }, plugins: [{ name: 'isolated-teacher-qa-session', transformIndexHtml() {
      return [{ tag: 'script', injectTo: 'head-prepend', children: `const qaRole=new URLSearchParams(location.search).get('qaRole');if(qaRole==='child'||qaRole==='teacher'||localStorage.getItem('qa_demo_run')!==${JSON.stringify(dbName)}||!localStorage.getItem('kc_token')){const child=qaRole==='child';localStorage.setItem('qa_demo_run',${JSON.stringify(dbName)});localStorage.setItem('kc_token',child?${JSON.stringify(token(f.children[0]))}:${JSON.stringify(token(f.teacher))});localStorage.setItem('kc_user',JSON.stringify(child?${JSON.stringify(identity(f.children[0]))}:${JSON.stringify(identity(f.teacher))}));}` }];
    } }] });
    await vite.listen();
    console.log('QA READY http://127.0.0.1:5183/teacher/dashboard');
    console.log('Child http://127.0.0.1:5183/my-learning?qaRole=child');
    console.log('Teacher http://127.0.0.1:5183/teacher/dashboard?qaRole=teacher');
    console.log('Disposable demo database; Ctrl+C stops the server and removes only this run database.');
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  }
}
async function cleanup() {
  if (vite) await vite.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^kcenglishkids_qa_teacher_\d+$/.test(dbName)) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
main().then(seedPeople).then(verify).catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(cleanup);
