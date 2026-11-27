const { ClassRoom, User } = require('../models');
const { validId, fail } = require('./teacherRules');
const classScope = req => ({ deletionPending: { $ne: true }, ...(req.user.role === 'ADMIN' ? {} : { teacher: req.user._id }) });
async function classroom(req, id, teaching = false) {
  if (!validId(id)) fail('Mã lớp không hợp lệ.');
  const room = await ClassRoom.findOne({ _id: id, ...classScope(req) });
  if (!room) fail('Bạn không được phân công phụ trách lớp này.', 403);
  if (teaching && room.status !== 'ACTIVE') fail('Chỉ mở buổi dạy cho lớp đang hoạt động.', 409);
  return room;
}
const studentIds = req => ClassRoom.find({ ...classScope(req), ...(req.user.role === 'ADMIN' ? {} : { status: { $in: ['ACTIVE', 'UPCOMING'] } }) }).distinct('students');
const classroomIds = req => ClassRoom.find({ ...classScope(req), status: { $in: ['ACTIVE', 'UPCOMING'] } }).distinct('_id');
async function child(req, id) {
  if (!validId(id)) fail('Mã học sinh không hợp lệ.');
  const item = await User.findOne({ _id: id, role: 'CHILD', ...(req.user.role === 'ADMIN' ? {} : { _id: { $eq: id, $in: await studentIds(req) } }) }).select('-password -pin -importKey');
  if (!item) fail('Bạn không được phân công phụ trách học sinh này.', 403);
  return item;
}
async function activeRoster(room) {
  const raw = room?.students || [];
  if (!raw.length || require('mongoose').connection?.readyState !== 1) return raw;
  const activeIds = new Set(
    (await User.find({ _id: { $in: raw.map(s => s?._id || s) }, role: 'CHILD', status: 'ACTIVE' }).distinct('_id')).map(String)
  );
  return raw.filter(s => activeIds.has(String(s?._id || s)));
}
module.exports = { classScope, classroom, classroomIds, studentIds, child, activeRoster };
