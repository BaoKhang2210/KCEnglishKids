// Self-service account recovery (Package: login integrity).
// CHILD  → "secret friend" picture pair (Khan Academy Kids style): no email/SMS gateway needed.
// TEACHER → one-time recovery code the teacher stores while the password still works.
// Flow per role: begin() issues a short-lived single-use token; complete() verifies the
// secret, writes the new credential, bumps authVersion (invalidating old sessions) and burns the token.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const M = require('../models');
const { fail } = require('./teacherRules');

const PICTURES = [
  { id: 'dog', emoji: '🐶', label: 'Chú chó' },
  { id: 'cat', emoji: '🐱', label: 'Mèo con' },
  { id: 'rabbit', emoji: '🐰', label: 'Thỏ ngọc' },
  { id: 'frog', emoji: '🐸', label: 'Ếch xanh' },
  { id: 'rocket', emoji: '🚀', label: 'Tên lửa' },
  { id: 'star', emoji: '⭐', label: 'Ngôi sao' },
  { id: 'rainbow', emoji: '🌈', label: 'Cầu vồng' },
  { id: 'elephant', emoji: '🐘', label: 'Voi con' }
];
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike characters
const TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const WEAK_PIN = /^(1234|(\d)\2{3})$/;
const sessions = new Map(); // recoveryToken -> { userId, kind, attempts, expires }

function audit(action, user, details = {}) {
  // A logging outage must never block a completed recovery.
  try { void M.AuditLog.create({ user, action, targetType: 'User', targetId: user, details }); }
  catch (error) { console.error('[Recovery audit]', action, error.message); }
}
function shuffle(list) {
  const values = [...list];
  for (let i = values.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [values[i], values[j]] = [values[j], values[i]]; }
  return values;
}
function pictureKey(pictures) {
  const ids = Array.isArray(pictures) ? pictures.map(String) : [];
  if (ids.length !== 2 || new Set(ids).size !== 2 || !ids.every(id => PICTURES.some(picture => picture.id === id))) fail('Bé cần chọn đúng 2 bạn bí mật khác nhau trong danh sách.');
  return [...ids].sort().join('|');
}
async function picturesHash(pictures) { return bcrypt.hash(pictureKey(pictures), 10); }
async function setChildPictures(user, pictures) {
  user.recoverySecret = { kind: 'PICTURES', hash: await picturesHash(pictures), updatedAt: new Date() };
  await user.save();
}
async function rotateRecoveryCode(user) {
  const code = Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
  user.recoverySecret = { kind: 'CODE', hash: await bcrypt.hash(code, 10), updatedAt: new Date() };
  await user.save();
  return code;
}
function pruneSessions() {
  const now = Date.now();
  for (const [token, entry] of sessions) if (entry.expires <= now) sessions.delete(token);
}
function issue(userId, kind) {
  pruneSessions();
  const token = crypto.randomUUID();
  sessions.set(token, { userId: String(userId), kind, attempts: 0, expires: Date.now() + TOKEN_TTL_MS });
  return token;
}
function open(token, kind) {
  if (typeof token !== 'string' || !token) fail('Mã phiên khôi phục không hợp lệ. Hãy bắt đầu lại.');
  const entry = sessions.get(token);
  if (!entry || entry.kind !== kind) fail('Phiên khôi phục không còn hợp lệ. Hãy bắt đầu lại.', 410);
  if (entry.expires <= Date.now()) { sessions.delete(token); fail('Phiên khôi phục đã hết hạn. Hãy bắt đầu lại.', 410); }
  return { token, entry };
}
function rejectAttempt({ token, entry }, message) {
  entry.attempts++;
  if (entry.attempts >= MAX_ATTEMPTS) sessions.delete(token);
  fail(message, 401);
}

async function beginChild(identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  if (!value) fail('Nhập tên đăng nhập, email hoặc số điện thoại của bé.');
  const child = await M.User.findOne({ role: 'CHILD', status: 'ACTIVE', $or: [{ username: value }, { email: value }, { phone: value }, { contact: value }] }).select('+recoverySecret.hash');
  if (!child) fail('Không tìm thấy hồ sơ bé phù hợp. Bố mẹ kiểm tra lại thông tin nhé.', 404);
  if (child.recoverySecret?.kind !== 'PICTURES' || !child.recoverySecret.hash) fail('Bé chưa cài "bạn bí mật". Hãy nhờ cô giáo hoặc quản trị viên đặt lại PIN và cài bạn bí mật ở lần đổi PIN kế tiếp.', 409);
  return { token: issue(child._id, 'child'), pictures: shuffle(PICTURES) };
}
async function completeChild(token, pictures, newPin) {
  const opened = open(token, 'child');
  const key = pictureKey(pictures);
  const child = await M.User.findById(opened.entry.userId).select('+recoverySecret.hash');
  if (!child || child.role !== 'CHILD' || child.status !== 'ACTIVE') { sessions.delete(opened.token); fail('Không tìm thấy hồ sơ bé.', 404); }
  if (!child.recoverySecret?.hash || !(await bcrypt.compare(key, child.recoverySecret.hash))) rejectAttempt(opened, 'Chưa đúng bạn bí mật. Bé nhìn lại và chọn lại nhé.');
  const pin = String(newPin || '');
  if (!/^\d{4}$/.test(pin) || WEAK_PIN.test(pin)) fail('Mã PIN mới phải là 4 chữ số và khó đoán (không dùng 1234 hoặc 4 số giống nhau).');
  child.pin = pin;
  child.authVersion = (child.authVersion || 0) + 1;
  await child.save();
  sessions.delete(opened.token);
  audit('ACCOUNT_RECOVERY_COMPLETED', child._id, { method: 'PICTURES' });
  return child;
}

async function beginTeacher(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value) fail('Nhập email đăng nhập của cô/thầy.');
  const teacher = await M.User.findOne({ role: 'TEACHER', status: 'ACTIVE', email: value }).select('+recoverySecret.hash');
  if (!teacher || teacher.recoverySecret?.kind !== 'CODE' || !teacher.recoverySecret.hash) fail('Không tìm thấy tài khoản có mã khôi phục. Hãy lưu lại mã khôi phục trong mục Tài khoản hoặc liên hệ quản trị viên.', 404);
  return { token: issue(teacher._id, 'teacher') };
}
async function completeTeacher(token, code, newPassword) {
  const opened = open(token, 'teacher');
  const teacher = await M.User.findById(opened.entry.userId).select('+recoverySecret.hash');
  if (!teacher || teacher.role !== 'TEACHER' || teacher.status !== 'ACTIVE') { sessions.delete(opened.token); fail('Không tìm thấy tài khoản giáo viên.', 404); }
  const attempt = String(code || '').trim().toUpperCase();
  if (!teacher.recoverySecret?.hash || !(await bcrypt.compare(attempt, teacher.recoverySecret.hash))) rejectAttempt(opened, 'Mã khôi phục chưa đúng. Cô kiểm tra lại mã đã lưu nhé.');
  if (typeof newPassword !== 'string' || newPassword.trim().length < 6) fail('Mật khẩu mới cần tối thiểu 6 ký tự.');
  teacher.password = newPassword.trim();
  teacher.authVersion = (teacher.authVersion || 0) + 1;
  await teacher.save();
  sessions.delete(opened.token);
  audit('ACCOUNT_RECOVERY_COMPLETED', teacher._id, { method: 'CODE' });
  return teacher;
}

function status(user) {
  return {
    configured: Boolean(user?.recoverySecret?.hash ?? user?.recoverySecret?.kind),
    kind: user?.recoverySecret?.kind || null,
    updatedAt: user?.recoverySecret?.updatedAt || null
  };
}

module.exports = { PICTURES, pictureKey, picturesHash, setChildPictures, rotateRecoveryCode, beginChild, completeChild, beginTeacher, completeTeacher, status, __sessions: sessions };
