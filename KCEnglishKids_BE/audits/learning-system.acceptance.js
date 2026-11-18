// Real HTTP + Mongoose acceptance in a newly created, disposable database.
// The configured application's database is never written or dropped.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const M = require('../src/models');
const app = require('../src/app');
const { jwtSecret } = require('../src/config/auth');
const testDatabase = 'kcenglishkids_verify_' + Date.now();

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  let server;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: testDatabase, serverSelectionTimeoutMS: 8000 });
    assert.equal(mongoose.connection.name, testDatabase);
    const ids = Object.fromEntries(['teacher','other','child','room','lesson','topic','unit','cat','dog'].map(key => [key, new mongoose.Types.ObjectId()]));
    await M.User.collection.insertMany([
      { _id: ids.teacher, name: 'Test Teacher', role: 'TEACHER', status: 'ACTIVE', username: 'test-teacher', email: 'teacher@example.test', authVersion: 0 },
      { _id: ids.other, name: 'Other Teacher', role: 'TEACHER', status: 'ACTIVE', username: 'test-other', email: 'other@example.test', authVersion: 0 },
      { _id: ids.child, name: 'Test Child', role: 'CHILD', status: 'ACTIVE', username: 'test-child', email: 'child@example.test', ageGroupCode: '3-4', assignedClass: ids.room, authVersion: 0 }
    ]);
    await M.ClassRoom.collection.insertOne({ _id: ids.room, name: 'Test Room', normalizedName: 'test room', teacher: ids.teacher, students: [ids.child], status: 'ACTIVE', ageGroupCode: '3-4', deletionPending: false });
    await M.Topic.collection.insertOne({ _id: ids.topic, status: 'ACTIVE' });
    await M.CurriculumUnit.collection.insertOne({ _id: ids.unit, status: 'ACTIVE', ageGroupCode: '3-4', unitNumber: 1 });
    await M.Vocabulary.collection.insertMany(['cat','dog'].map(word => ({ _id: ids[word], english: word, vietnamese: word, imageUrl: '/images/'+word+'.png', wordType: 'noun', status: 'ACTIVE' })));
    await M.Lesson.collection.insertOne({ _id: ids.lesson, title: 'Test Animals', status: 'ACTIVE', ageGroupCode: '3-4', topic: ids.topic, curriculumUnits: [ids.unit], vocabularyItems: [ids.cat, ids.dog], displayOrder: 1 });
    await M.HomePracticePlan.init();
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port + '/api';
    const token = role => jwt.sign({ id: String(ids[role]), authVersion: 0 }, jwtSecret());
    async function request(route, role = 'teacher', body) {
      const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token(role), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, ...await response.json() };
    }
    const teacherBase = '/teacher/students/'+ids.child+'/home-practice';
    const proposalUrl = teacherBase+'/proposal?lessonId='+ids.lesson;
    let proposal = await request(proposalUrl);
    assert.equal(proposal.status, 200); assert.equal(proposal.data.available, true);
    const body = { operationId: 'acceptance-approve-1', expectedRevision: 0, basisToken: proposal.data.basisToken, lessonId: String(ids.lesson), wordIds: [String(ids.cat),String(ids.dog)], observationIds: [], teacherNote: 'Cùng nghe và chỉ tranh.', homeActivity: { title: 'Cùng tìm tranh', steps: ['Nghe mẫu cùng bé.', 'Bé chọn tranh khi sẵn sàng.'] } };
    const approved = await request(teacherBase+'/approve', 'teacher', body);
    assert.equal(approved.status, 201); assert.equal(approved.data.revision, 1);
    const retry = await request(teacherBase+'/approve', 'teacher', body);
    assert.equal(retry.data._id, approved.data._id);
    let family = await request('/children/'+ids.child+'/home-practice', 'child');
    assert.equal(family.data.plan.words.length, 2);
    assert.equal(family.data.plan.observations, undefined);
    assert.equal((await request(teacherBase+'/approve', 'other', { ...body, operationId: 'other-approve-1' })).status, 403);
    proposal = await request(proposalUrl);
    const updated = await request(teacherBase+'/approve', 'teacher', { ...body, operationId: 'acceptance-approve-2', expectedRevision: proposal.data.revision, basisToken: proposal.data.basisToken, wordIds: [String(ids.cat)] });
    assert.equal(updated.status, 201);
    family = await request('/children/'+ids.child+'/home-practice', 'child');
    assert.equal(family.data.plan.words.length, 1); assert.equal(family.data.plan.revision, 2);
    const revoked = await request(teacherBase+'/revoke', 'teacher', { operationId: 'acceptance-revoke-1', expectedRevision: 2, teacherNote: 'Chuẩn bị lại.' });
    assert.equal(revoked.status, 201);
    assert.equal((await request('/children/'+ids.child+'/home-practice', 'child')).data.plan, null);
    assert.equal(await M.HomePracticePlan.countDocuments(), 3);
    assert.equal(await M.Progress.countDocuments(), 0);
    const arcade = await request('/children/'+ids.child+'/arcade', 'child');
    assert.equal(arcade.status, 200); assert.equal(arcade.data.vocabulary.length, 0);
    const report = { checkedAt: new Date().toISOString(), database: 'isolated disposable database; removed after verification', checks: ['HTTP approval saves a real Mongoose plan', 'retry is idempotent', 'family receives latest revision only', 'another teacher is denied', 'one-word replacement works', 'revocation hides plan', 'history is append-only', 'review does not advance curriculum', 'new child arcade contains no demo words'], passed: true };
    fs.writeFileSync(path.resolve(__dirname, '../../docs/learning-system-validation-2026-11-01.json'), JSON.stringify(report, null, 2)+'\n');
    console.log(JSON.stringify(report));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === testDatabase && /^kcenglishkids_verify_\d+$/.test(testDatabase)) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
