const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const M = require('../src/models');
const R = require('../src/services/accountRecovery');

const id = n => String(n).padStart(24, '0');
const CHILD_ID = id(1);
const TEACHER_ID = id(2);
const code = (statusCode, message) => error => error.statusCode === statusCode && (!message || error.message.includes(message));

function childDoc(hash) {
  return {
    _id: CHILD_ID, role: 'CHILD', status: 'ACTIVE', name: 'Bé A', ageGroupCode: '3-4', username: 'bea',
    pin: 'old-pin-hash', authVersion: 0, saves: 0,
    recoverySecret: hash ? { kind: 'PICTURES', hash, updatedAt: new Date() } : undefined,
    save() { this.saves++; return this; }
  };
}
function teacherDoc(hash) {
  return {
    _id: TEACHER_ID, role: 'TEACHER', status: 'ACTIVE', name: 'Cô B', email: 'co.b@school.edu',
    password: 'old-password-hash', authVersion: 3, saves: 0,
    recoverySecret: hash ? { kind: 'CODE', hash, updatedAt: new Date() } : undefined,
    save() { this.saves++; return this; }
  };
}
// Install in-memory fakes: User.findOne/findById resolve the supplied docs, AuditLog is a recorder.
function install(t, { child = null, teacher = null } = {}) {
  const audits = [];
  t.mock.method(M.AuditLog, 'create', async entry => { audits.push(entry); return entry; });
  t.mock.method(M.User, 'findOne', query => ({ select: async () => (query.role === 'TEACHER' ? teacher : child) }));
  t.mock.method(M.User, 'findById', docId => ({ select: async () => (String(docId) === String(TEACHER_ID) ? teacher : child) }));
  t.after(() => R.__sessions.clear());
  return { audits };
}

test('the secret is exactly two different pictures from the offered list', async t => {
  install(t);
  assert.equal(R.pictureKey(['dog', 'cat']), 'cat|dog'); // order-insensitive
  assert.throws(() => R.pictureKey(['dog', 'dog']), code(400));
  assert.throws(() => R.pictureKey(['dog']), code(400));
  assert.throws(() => R.pictureKey(['dog', 'dragon']), code(400));
  assert.throws(() => R.pictureKey('cat|dog'), code(400));
});

test('beginChild offers the full shuffled picture set only when a secret exists', async t => {
  const child = childDoc(await bcrypt.hash('cat|dog', 10));
  install(t, { child });
  const { token, pictures } = await R.beginChild(' BEA ');
  assert.equal(pictures.length, R.PICTURES.length);
  assert.ok(token);
  assert.deepEqual([...pictures].map(p => p.id).sort(), R.PICTURES.map(p => p.id).sort());
});

test('beginChild refuses unknown children and children without secret friends', async t => {
  install(t, { child: null });
  await assert.rejects(R.beginChild('ghost'), code(404));
  const bare = childDoc(null);
  install(t, { child: bare });
  await assert.rejects(R.beginChild('bea'), code(409, 'chưa cài'));
});

test('a forgotten PIN is recovered immediately and the child is signed back in', async t => {
  const child = childDoc(await bcrypt.hash('cat|dog', 10));
  const { audits } = install(t, { child });
  const { token } = await R.beginChild('bea');
  const saved = await R.completeChild(token, ['dog', 'cat'], '7391'); // any tap order
  assert.equal(child.pin, '7391');
  assert.equal(child.authVersion, 1); // old sessions are invalidated
  assert.equal(child.saves, 1);
  assert.equal(saved._id, CHILD_ID);
  assert.deepEqual(audits.map(a => a.action), ['ACCOUNT_RECOVERY_COMPLETED']);
  // The recovery token is single-use.
  await assert.rejects(R.completeChild(token, ['cat', 'dog'], '7391'), code(410));
});

test('wrong secret friends cannot unlock the account and burn after three tries', async t => {
  const child = childDoc(await bcrypt.hash('cat|dog', 10));
  install(t, { child });
  const { token } = await R.beginChild('bea');
  await assert.rejects(R.completeChild(token, ['frog', 'rocket'], '7391'), code(401));
  await assert.rejects(R.completeChild(token, ['star', 'rainbow'], '7391'), code(401));
  await assert.rejects(R.completeChild(token, ['elephant', 'dog'], '7391'), code(401));
  await assert.rejects(R.completeChild(token, ['cat', 'dog'], '7391'), code(410)); // session burned
  assert.equal(child.pin, 'old-pin-hash'); // never touched
  assert.equal(child.saves, 0);
});

test('recovery refuses weak or malformed new PINs', async t => {
  const child = childDoc(await bcrypt.hash('cat|dog', 10));
  install(t, { child });
  const { token } = await R.beginChild('bea');
  await assert.rejects(R.completeChild(token, ['cat', 'dog'], '1234'), code(400));
  await assert.rejects(R.completeChild(token, ['cat', 'dog'], '7777'), code(400));
  await assert.rejects(R.completeChild(token, ['cat', 'dog'], '73'), code(400));
  assert.equal(child.saves, 0);
  const again = await R.completeChild(token, ['cat', 'dog'], '7391');
  assert.equal(again._id, CHILD_ID);
});

test('a child token cannot be replayed against the teacher flow', async t => {
  const child = childDoc(await bcrypt.hash('cat|dog', 10));
  install(t, { child });
  const { token } = await R.beginChild('bea');
  await assert.rejects(R.completeTeacher(token, 'ABC123', 'newpassword'), code(410));
});

test('teachers store a one-time recovery code and rotate it replaces the old one', async t => {
  const teacher = teacherDoc(null);
  install(t, { teacher });
  const code1 = await R.rotateRecoveryCode(teacher);
  assert.match(code1, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(teacher.recoverySecret.kind, 'CODE');
  assert.ok(await bcrypt.compare(code1, teacher.recoverySecret.hash));
  const code2 = await R.rotateRecoveryCode(teacher);
  assert.notEqual(code1, code2);
  const { token } = await R.beginTeacher('co.b@school.edu');
  // The previous code no longer unlocks the account.
  await assert.rejects(R.completeTeacher(token, code1, 'whatever123'), code(401));
  await R.completeTeacher(token, code2.toLowerCase(), 'whatever123'); // case-insensitive entry
  assert.equal(teacher.password, 'whatever123');
  assert.equal(teacher.authVersion, 4); // staff sessions also expire
});

test('teacher recovery refuses unknown accounts, short passwords and repeated wrong codes', async t => {
  install(t, { teacher: null });
  await assert.rejects(R.beginTeacher('nobody@x.com'), code(404));
  const teacher = teacherDoc(await bcrypt.hash('QK7M2P', 10));
  install(t, { teacher });
  const { token } = await R.beginTeacher('co.b@school.edu');
  await assert.rejects(R.completeTeacher(token, 'AAAAAA', 'abcdef'), code(401));
  await assert.rejects(R.completeTeacher(token, 'BBBBBB', 'abcdef'), code(401));
  await assert.rejects(R.completeTeacher(token, 'CCCCCC', 'abcdef'), code(401));
  await assert.rejects(R.completeTeacher(token, 'QK7M2P', 'abcdef'), code(410));
  // Right code but a too-short password is rejected without burning the token.
  const fresh = await R.beginTeacher('co.b@school.edu');
  await assert.rejects(R.completeTeacher(fresh.token, 'QK7M2P', 'abc'), code(400));
  assert.equal(teacher.saves, 0);
});

test('recovery status tells the UI whether a secret is configured', async () => {
  assert.equal(R.status(childDoc(null)).configured, false);
  const ready = R.status(childDoc('hash'));
  assert.equal(ready.configured, true);
  assert.equal(ready.kind, 'PICTURES');
});
