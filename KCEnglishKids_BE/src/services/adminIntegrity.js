const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { User, ClassRoom, AgeGroup, Schedule, AuditLog } = require('../models');

mongoose.set('transactionAsyncLocalStorage', true);
const fail = (message, status = 400) => Object.assign(new Error(message), { statusCode: status });
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const publicUser = user => {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.password;
  delete value.pin;
  delete value.importKey;
  return value;
};
const pin = value => {
  if (value !== undefined && value !== '' && !/^\d{4}$/.test(String(value))) throw fail('Mã PIN phải gồm đúng 4 chữ số.');
  return value ? String(value) : String(crypto.randomInt(0, 10000)).padStart(4, '0');
};
async function audit(req, action, targetType, targetId, details = {}) {
  if (!req.user) return;
  // A logging outage must not turn an already committed mutation into a failed request.
  try { await AuditLog.create({ user: req.user._id, action, targetType, targetId, details }); }
  catch (error) { console.error('[Admin audit unavailable]', action, error.message); }
}
async function atomic(operation) {
  const type = mongoose.connection.readyState === 1 && mongoose.connection.getClient().topology?.description?.type;
  if (type && /ReplicaSet|Sharded/.test(type)) return mongoose.connection.transaction(operation);
  // Standalone Mongo is supported; imports compensate failed batches and deletion is resumable.
  return operation();
}
async function username(name, requested) {
  const base = String(requested || name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'hocsinh';
  if (requested && base !== String(requested).trim().toLowerCase()) throw fail('Mã đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.');
  if (requested) {
    if (await User.exists({ username: base })) throw fail('Mã đăng nhập đã được sử dụng.');
    return base;
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${base}${crypto.randomInt(10000, 100000)}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  throw fail('Chưa cấp được mã đăng nhập. Vui lòng thử lại.', 503);
}
async function classroom(id) {
  if (!validId(String(id || ''))) throw fail('Mã lớp học không hợp lệ.');
  const room = await ClassRoom.findById(id);
  if (!room || room.deletionPending) throw fail('Lớp học không tồn tại hoặc đang được xóa.', 404);
  return room;
}
async function availableTeacher(id, roomId) {
  if (!validId(String(id || ''))) throw fail('Vui lòng chọn giáo viên hợp lệ.');
  const teacher = await User.findOne({ _id: id, role: 'TEACHER', status: 'ACTIVE' });
  if (!teacher) throw fail('Giáo viên không tồn tại hoặc đã ngừng hoạt động.');
  const conflict = await ClassRoom.findOne({ teacher: id, status: { $ne: 'INACTIVE' }, ...(roomId ? { _id: { $ne: roomId } } : {}) });
  if (conflict) throw fail(`Giáo viên đã phụ trách lớp ${conflict.name}. Mỗi giáo viên chỉ phụ trách một lớp đang hoạt động.`);
  return teacher;
}
async function syncTeacher(room, teacherId) {
  if (room.status !== 'INACTIVE') await availableTeacher(String(teacherId), room._id);
  room.teacher = teacherId;
  await room.save();
  await User.updateMany({ role: 'TEACHER', assignedClass: room._id, _id: { $ne: teacherId } }, { $unset: { assignedClass: 1 } });
  if (room.status === 'INACTIVE') {
    await User.updateOne({ _id: teacherId, assignedClass: room._id }, { $unset: { assignedClass: 1 } });
    await Schedule.updateMany({ classroom: room._id }, { $set: { teacher: teacherId, isActive: false } });
  } else {
    await User.findByIdAndUpdate(teacherId, { $set: { assignedClass: room._id } });
    await Schedule.updateMany({ classroom: room._id }, { $set: { teacher: teacherId } });
  }
}
async function moveStudents(room, ids, replace = false) {
  if (!Array.isArray(ids) || ids.some(id => !validId(String(id)))) throw fail('Danh sách mã học sinh không hợp lệ.');
  const unique = [...new Set(ids.map(String))];
  const students = await User.find({ _id: { $in: unique }, role: 'CHILD', status: 'ACTIVE' }).select('_id');
  if (students.length !== unique.length) throw fail('Danh sách có học sinh không tồn tại hoặc đã ngừng hoạt động.');
  await ClassRoom.updateMany({ _id: { $ne: room._id }, students: { $in: unique } }, { $pull: { students: { $in: unique } } });
  if (replace) {
    await User.updateMany({ role: 'CHILD', assignedClass: room._id, _id: { $nin: unique } }, { $unset: { assignedClass: 1 } });
    await ClassRoom.updateOne({ _id: room._id }, { $set: { students: unique } });
  } else {
    await ClassRoom.updateOne({ _id: room._id }, { $addToSet: { students: { $each: unique } } });
  }
  await User.updateMany({ _id: { $in: unique }, role: 'CHILD' }, { $set: { assignedClass: room._id, ageGroupCode: room.ageGroupCode, ageGroup: room.ageGroup } });
}
function parseDob(value) {
  if (!value) return undefined;
  let date;
  let expected;
  if (typeof value === 'number') date = new Date(Math.round((value - 25569) * 86400000));
  else {
    const raw = String(value).trim();
    const parts = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
    expected = parts ? `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : undefined;
    date = new Date(expected || raw);
  }
  if (!Number.isFinite(+date) || date > new Date()) throw fail('Ngày sinh không hợp lệ hoặc nằm trong tương lai.');
  if (expected && date.toISOString().slice(0, 10) !== expected) throw fail('Ngày sinh không tồn tại trong lịch.');
  return date;
}
async function importStudents(rows, room, defaultCode = '3-4') {
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) throw fail('Danh sách phải có từ 1 đến 2.000 học sinh.');
  const prepared = [];
  const seen = new Set();
  let skippedCount = 0;
  // Validate the entire batch before writing any account.
  for (const [index, row] of rows.entries()) {
    const name = String(row.name || row.fullName || row['Họ và tên'] || '').trim();
    if (!name) throw fail(`Dòng ${index + 1}: thiếu họ tên.`);
    const dob = parseDob(row.dob || row['Ngày sinh']);
    const code = room?.ageGroupCode || row.ageGroupCode || defaultCode;
    if (!['3-4', '4-5', '5-6'].includes(code)) throw fail(`Dòng ${index + 1}: nhóm tuổi không hợp lệ.`);
    const age = await AgeGroup.findOne({ code });
    if (!age) throw fail('Chưa có nhóm tuổi tương ứng trong hệ thống.');
    const contact = String(row.contact || row.parentContact || row['SĐT Phụ huynh'] || '').trim();
    const importKey = crypto.createHash('sha256').update(JSON.stringify([String(room?._id || ''), name.toLocaleLowerCase('vi'), dob?.toISOString().slice(0, 10) || '', contact])).digest('hex');
    if (seen.has(importKey) || await User.exists({ importKey })) { skippedCount++; continue; }
    seen.add(importKey);
    const rawPin = pin(row.pin || row['Mã PIN']);
    const login = await username(name, row.username);
    const child = new User({ role: 'CHILD', name, username: login, dob, pin: rawPin, password: rawPin,
      contact, parentContact: contact, ageGroup: age._id, ageGroupCode: code, assignedClass: room?._id,
      avatar: row.avatar || 'lion', status: 'ACTIVE', importKey });
    await child.validate();
    prepared.push({ child, rawPin });
  }
  const createdIds = [];
  try {
    for (const { child } of prepared) {
      await child.save();
      createdIds.push(child._id);
    }
    if (room && createdIds.length) await ClassRoom.updateOne({ _id: room._id }, { $addToSet: { students: { $each: createdIds } } });
  } catch (error) {
    if (createdIds.length) {
      if (room) await ClassRoom.updateOne({ _id: room._id }, { $pull: { students: { $in: createdIds } } });
      await User.deleteMany({ _id: { $in: createdIds }, role: 'CHILD' });
    }
    throw error;
  }
  return { createdUsers: prepared.map(({ child }) => publicUser(child)),
    credentials: prepared.map(({ child, rawPin }) => ({ name: child.name, username: child.username, pin: rawPin })), skippedCount, errors: [] };
}
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
module.exports = { escapeRegex, fail, validId, publicUser, pin, username, audit, atomic, classroom, availableTeacher, syncTeacher, moveStudents, importStudents, parseDob };
