const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const ClassRoom = require('../src/models/ClassRoom');
const ClassroomSession = require('../src/models/ClassroomSession');
const Recognition = require('../src/models/ClassRecognition');
const SchoolRecognition = require('../src/models/SchoolRecognition');
SchoolRecognition.find = () => query([]);
SchoolRecognition.exists = async () => false;

const ids = Object.fromEntries(['teacher', 'otherTeacher', 'admin', 'child', 'otherChild', 'classroom'].map(key => [key, String(new mongoose.Types.ObjectId())]));
const users = [
  { _id: ids.teacher, role: 'TEACHER', status: 'ACTIVE' },
  { _id: ids.otherTeacher, role: 'TEACHER', status: 'ACTIVE' },
  { _id: ids.admin, role: 'ADMIN', status: 'ACTIVE' },
  { _id: ids.child, name: 'An', role: 'CHILD', status: 'ACTIVE' },
  { _id: ids.otherChild, name: 'Bình', role: 'CHILD', status: 'ACTIVE' }
];
const classroom = { _id: ids.classroom, name: 'Lớp Lá', teacher: ids.teacher, students: [ids.child, ids.otherChild] };
let records = [];
let schoolRecords = [];
let sessions = [];
let homeStars = [];
let simulateConcurrentPublish = false;
function query(value) {
  return { select() { return this; }, populate() { return this; }, sort() { return this; }, limit() { return this; },
    lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
}
// Recognition also reads lifetime statistics; keep this controller test isolated
// from MongoDB while its period-ranking fixtures remain defined below.
const statisticsModels = require('../src/models');
for (const Model of [statisticsModels.ActivityResult, statisticsModels.Progress, ClassroomSession, statisticsModels.UnitCompletion, statisticsModels.LearningEvent, statisticsModels.Assignment]) Model.aggregate = async () => [];
statisticsModels.HomePracticeCompletion.aggregate = async () => homeStars;
ClassroomSession.aggregate = async () => users.filter(user => user.role === 'CHILD').map(user => ({
  _id: user._id,
  classroomStars: sessions.filter(session => session.status === 'COMPLETED').flatMap(session => session.studentScores || [])
    .filter(score => String(score.student) === user._id && !['ABSENT', 'EXCUSED'].includes(score.attendance))
    .reduce((sum, score) => sum + score.stars, 0)
}));
statisticsModels.Progress.find = () => query([]);
statisticsModels.Assignment.find = () => query([]);
User.findById = id => query(users.find(user => String(user._id) === String(id)));
User.find = () => query(users.filter(user => user.role === 'CHILD'));
ClassRoom.find = filter => query(!filter.teacher || String(filter.teacher) === ids.teacher ? [classroom] : []);
ClassRoom.findOne = filter => query(String(filter._id) === ids.classroom && (!filter.teacher || String(filter.teacher) === ids.teacher) ? classroom : null);
ClassroomSession.find = filter => {
  assert.equal(filter.status, 'COMPLETED');
  assert.ok(filter.endedAt.$gte instanceof Date);
  assert.ok(filter.endedAt.$lt instanceof Date);
  return query(sessions);
};
Recognition.findOne = key => query(records.find(record => String(record.classroom) === String(key.classroom) && record.kind === key.kind && +new Date(record.periodStart) === +key.periodStart) || null);
Recognition.create = async data => {
  const record = { ...data, _id: String(new mongoose.Types.ObjectId()), publishedAt: new Date(),
    winners: data.winners.map(winner => ({ ...winner, readAt: null })) };
  records.push(record);
  if (simulateConcurrentPublish) { simulateConcurrentPublish = false; const error = new Error('duplicate'); error.code = 11000; throw error; }
  return record;
};
Recognition.find = filter => query(records.filter(record => record.winners.some(winner => String(winner.child) === String(filter['winners.child']))));
Recognition.exists = async filter => records.some(record => record._id === String(filter._id) && record.winners.some(winner => String(winner.child) === String(filter['winners.child'])));
Recognition.updateOne = async (filter, update) => {
  const record = records.find(record => record._id === String(filter._id));
  const winner = record?.winners.find(winner => String(winner.child) === String(filter.winners.$elemMatch.child) && winner.readAt === null);
  if (!winner) return { matchedCount: 0 };
  winner.readAt = update.$set['winners.$.readAt'];
  return { matchedCount: 1 };
};
SchoolRecognition.findOne = key => query(schoolRecords.find(record => record.kind === key.kind && +new Date(record.periodStart) === +key.periodStart) || null);
SchoolRecognition.create = async data => {
  const record = { ...data, _id: String(new mongoose.Types.ObjectId()), publishedAt: new Date(), winners: data.winners.map(row => ({ ...row, readAt: null })) };
  schoolRecords.push(record); return record;
};
SchoolRecognition.find = filter => query(schoolRecords.filter(record => record.winners.some(winner => String(winner.child) === String(filter['winners.child']))));

const app = express();
app.use(express.json());
app.use('/api/recognitions', require('../src/routes/recognitionRoutes'));
app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
let server;
let base;
test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api/recognitions';
});
test.after(() => new Promise(resolve => server.close(resolve)));
test.beforeEach(() => {
  records = [];
  schoolRecords = [];
  homeStars = [];
  simulateConcurrentPublish = false;
  sessions = [{ status: 'COMPLETED', studentScores: [
    { student: ids.child, stars: 4, attendance: 'PRESENT' },
    { student: ids.otherChild, stars: 4, attendance: 'PRESENT' }
  ] }];
});
async function request(path, role = 'teacher', method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  if (role) headers.Authorization = 'Bearer ' + jwt.sign({ id: ids[role] }, require('../src/config/auth').jwtSecret());
  const response = await fetch(base + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
const params = '?kind=WEEK&date=2025-01-01';
const publishPath = '/classes/' + ids.classroom + '/publish';
const period = { kind: 'WEEK', date: '2025-01-01' };

test('school recognition is admin-only, compares total stars and publishes once without minimum attendance', async () => {
  assert.equal((await request('/school' + params, 'teacher')).status, 403);
  assert.equal((await request('/school/publish', 'child', 'POST', period)).status, 403);
  assert.equal((await request('/school' + params, 'admin')).data.data.canPublish, true);
  sessions.push(sessions[0]);
  const preview = await request('/school' + params, 'admin');
  assert.equal(preview.status, 200);
  assert.equal(preview.data.data.minimumSessions, 0);
  assert.equal(preview.data.data.ranking[0].starsPerSession, 4);
  assert.equal(preview.data.data.canPublish, true);
  for (let i = 0; i < 2; i++) assert.equal((await request('/school/publish', 'admin', 'POST', period)).status, 200);
  assert.equal(schoolRecords.length, 1);
  const own = await request('/mine', 'child');
  assert.equal(own.data.data.length, 1);
  assert.equal(own.data.data[0].className, 'Toàn trường');
});

test('Child with seven stars in session leads both school and class and receives seven stars in the award', async () => {
  sessions = [{ status: 'COMPLETED', studentScores: [
    { student: ids.child, stars: 7, attendance: 'PRESENT' },
    { student: ids.otherChild, stars: 6, attendance: 'PRESENT' }
  ] }];
  for (const path of ['/school', '/classes/' + ids.classroom]) {
    const preview = await request(path + params, 'admin');
    assert.equal(preview.status, 200);
    const [child, other] = preview.data.data.ranking;
    assert.equal(child.child, ids.child);
    assert.equal(child.stars, 7);
    assert.equal(child.sessions, 1);
    assert.equal(child.winner, true);
    assert.equal(other.winner, false);
    const published = await request(path + '/publish', 'admin', 'POST', period);
    assert.equal(published.status, 200);
    assert.equal(published.data.data.winners[0].stars, 7);
  }
});

test('authentication and class ownership apply to preview and publication', async () => {
  assert.equal((await request('/classes', null)).status, 401);
  assert.equal((await request('/classes', 'child')).status, 403);
  assert.equal((await request('/classes/' + ids.classroom + params, 'otherTeacher')).status, 403);
  assert.equal((await request(publishPath, 'otherTeacher', 'POST', period)).status, 403);
  assert.equal((await request('/classes/' + ids.classroom + params, 'admin')).status, 200);
  assert.equal((await request('/classes/not-an-id' + params)).status, 400);
});

test('preview identifies ties and never writes notifications', async () => {
  const response = await request('/classes/' + ids.classroom + params);
  assert.equal(response.status, 200);
  assert.equal(response.data.data.ranking.filter(row => row.winner).length, 2);
  assert.equal(response.data.data.canPublish, true);
  assert.equal(records.length, 0);
});

test('publication creates one atomic snapshot with both notifications; retry is idempotent', async () => {
  const first = await request(publishPath, 'teacher', 'POST', period);
  const second = await request(publishPath, 'admin', 'POST', period);
  assert.equal(first.status, 200);
  assert.equal(first.data.data._id, second.data.data._id);
  assert.equal(records.length, 1);
  assert.equal(records[0].winners.length, 2);
  sessions = [];
  const preview = await request('/classes/' + ids.classroom + params);
  assert.equal(preview.data.data.ranking[0].stars, 4);
  assert.equal(preview.data.data.canPublish, false);
});

test('duplicate-key race recovers the already-published result', async () => {
  simulateConcurrentPublish = true;
  assert.equal((await request(publishPath, 'teacher', 'POST', period)).status, 200);
  assert.equal(records.length, 1);
});

test('open, malformed and zero-star periods cannot be published', async () => {
  assert.equal((await request(publishPath, 'teacher', 'POST', { kind: 'MONTH', date: '2999-01-01' })).status, 400);
  assert.equal((await request(publishPath, 'teacher', 'POST', { kind: 'WEEK', date: '2026-02-31' })).status, 400);
  sessions = [];
  assert.equal((await request(publishPath, 'teacher', 'POST', period)).status, 400);
  assert.equal(records.length, 0);
});

test('a child sees only their own award and can acknowledge it without altering a classmate', async () => {
  await request(publishPath, 'teacher', 'POST', period);
  const inbox = await request('/mine', 'child');
  assert.equal(inbox.status, 200);
  assert.equal(inbox.data.data[0].name, 'An');
  assert.equal(inbox.data.data[0].winners, undefined);
  assert.equal(inbox.data.data[0].ranking, undefined);
  assert.equal((await request('/mine', 'teacher')).status, 403);
  const id = records[0]._id;
  assert.equal((await request('/mine/' + id + '/read', 'child', 'PATCH')).status, 200);
  assert.ok(records[0].winners[0].readAt);
  assert.equal(records[0].winners[1].readAt, null);
  assert.equal((await request('/mine/' + id + '/read', 'child', 'PATCH')).status, 200);
  assert.equal((await request('/mine/' + new mongoose.Types.ObjectId() + '/read', 'child', 'PATCH')).status, 404);
});
