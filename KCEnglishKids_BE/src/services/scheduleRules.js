const { fail } = require('./adminIntegrity');
function validateSlots(slots, from, to) {
  if (!Array.isArray(slots) || !slots.length) throw fail('Thời khóa biểu cần ít nhất một buổi học.');
  if (from && !Number.isFinite(+new Date(from)) || to && !Number.isFinite(+new Date(to))) throw fail('Ngày hiệu lực không hợp lệ.');
  if (from && to && +new Date(to) < +new Date(from)) throw fail('Ngày kết thúc phải sau ngày bắt đầu.');
  for (const slot of slots) {
    if (![0, 1, 2, 3, 4, 5, 6].includes(slot.dayOfWeek)) throw fail('Ngày trong tuần không hợp lệ.');
    if (![slot.startTime, slot.endTime].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw fail('Giờ học phải có định dạng HH:mm.');
    if (slot.endTime <= slot.startTime) throw fail('Giờ kết thúc phải sau giờ bắt đầu.');
  }
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    if (overlap(slots[i], slots[j])) throw fail('Các buổi trong cùng thời khóa biểu bị trùng giờ.');
  }
}
const overlap = (a, b) => a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;
const activeScheduleFilter = () => ({ isActive: true, effectiveFrom: { $lte: new Date() }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }] });
function normalizeSchedulePeriod(body) {
  const result = {};
  for (const key of ['effectiveFrom', 'effectiveTo']) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const value = body[key];
    result[key] = !value ? null : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + (key === 'effectiveTo' ? 'T23:59:59.999+07:00' : 'T00:00:00+07:00')) : value;
  }
  return result;
}
async function validateSchedule(data, excludedId) {
  const { Schedule, ClassRoom, User, Lesson } = require('../models');
  validateSlots(data.weeklySlots, data.effectiveFrom, data.effectiveTo);
  const room = await ClassRoom.findById(data.classroom);
  if (!room || room.deletionPending || room.status === 'INACTIVE') throw fail('Lớp học không hoạt động hoặc không tồn tại.');
  if (String(room.teacher) !== String(data.teacher)) throw fail('Giáo viên trên lịch phải khớp giáo viên phụ trách lớp.');
  if (!await User.exists({ _id: data.teacher, role: 'TEACHER', status: 'ACTIVE' })) throw fail('Giáo viên không hoạt động.');
  for (const slot of data.weeklySlots) {
    if (slot.lesson && !await Lesson.exists({ _id: slot.lesson, ageGroupCode: room.ageGroupCode, status: 'ACTIVE' })) throw fail('Bài học không phù hợp với lớp.');
  }
  if (data.isActive === false) return;
  const schedules = await Schedule.find({ isActive: true, ...(excludedId ? { _id: { $ne: excludedId } } : {}) }).lean();
  for (const schedule of schedules) {
    if (new Date(data.effectiveFrom || 0) > new Date(schedule.effectiveTo || 8640000000000000) || new Date(schedule.effectiveFrom || 0) > new Date(data.effectiveTo || 8640000000000000)) continue;
    for (const a of data.weeklySlots) for (const b of schedule.weeklySlots) {
      if (overlap(a, b) && (String(schedule.teacher) === String(data.teacher) || String(schedule.classroom) === String(data.classroom) || a.room?.trim() && a.room.trim().toLowerCase() === b.room?.trim().toLowerCase())) throw fail('Trùng lịch giáo viên, lớp học hoặc phòng học. Vui lòng chọn khung giờ khác.');
    }
  }
}
module.exports = { validateSlots, overlap, validateSchedule, activeScheduleFilter, normalizeSchedulePeriod };
