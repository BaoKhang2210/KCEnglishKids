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
const studentIds = req => ClassRoom.find(classScope(req)).distinct('students');
async function child(req, id) {
  if (!validId(id)) fail('Mã học sinh không hợp lệ.');
  const item = await User.findOne({ _id: id, role: 'CHILD', ...(req.user.role === 'ADMIN' ? {} : { _id: { $eq: id, $in: await studentIds(req) } }) }).select('-password -pin -importKey');
  if (!item) fail('Bạn không được phân công phụ trách học sinh này.', 403);
  return item;
}
module.exports = { classScope, classroom, studentIds, child };
