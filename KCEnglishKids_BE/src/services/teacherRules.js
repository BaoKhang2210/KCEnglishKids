const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const idOf = value => String(value?._id || value || '');
const validId = value => /^[a-f\d]{24}$/i.test(idOf(value));
const vnDate = (now = new Date()) => new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const vnClock = (now = new Date()) => {
  const d = new Date(now.getTime() + 7 * 3600000);
  return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
};
function attendanceDate(value = vnDate(), now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value > vnDate(now)) {
    fail('Ngày điểm danh phải hợp lệ và không nằm trong tương lai.');
  }
  return value;
}
function attendanceRecords(records, roster) {
  if (!Array.isArray(records)) fail('Danh sách điểm danh không hợp lệ.');
  const members = new Set(roster.map(idOf));
  const seen = new Set();
  const result = records.map(row => {
    const student = idOf(row?.student || row?.studentId);
    if (!members.has(student) || seen.has(student)) fail('Học sinh điểm danh phải thuộc lớp và không được lặp.');
    if (!['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'].includes(row.status)) fail('Trạng thái điểm danh không hợp lệ.');
    seen.add(student);
    return { student, status: row.status, note: text(row.note, 1000) };
  });
  if (seen.size !== members.size) fail('Vui lòng điểm danh đầy đủ học sinh của lớp.');
  return result;
}
function text(value, max = 5000) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) fail(`Nội dung phải là văn bản, tối đa ${max} ký tự.`);
  return value.trim();
}
function assignmentDates(start, due) {
  const parse = (value, end) => {
    if (!value) return null;
    if (typeof value !== 'string' && !(value instanceof Date)) fail('Ngày giao bài không hợp lệ.');
    let normalized = value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Ngày giao bài không hợp lệ.');
      normalized = `${value}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`;
    }
    const date = new Date(normalized);
    if (!Number.isFinite(date.getTime())) fail('Ngày giao bài không hợp lệ.');
    return date;
  };
  const startDate = parse(start, false), dueDate = parse(due, true);
  if (startDate && dueDate && dueDate < startDate) fail('Hạn nộp phải bằng hoặc sau ngày bắt đầu.');
  return { startDate, dueDate };
}
function accuracy(row) {
  const total = (row.correctCount || 0) + (row.incorrectCount || 0);
  return total > 0 ? Math.round(100 * (row.correctCount || 0) / total) : null;
}
const present = row => !['ABSENT', 'EXCUSED'].includes(row.attendance);
function summarize(session) {
  const rows = (session.studentScores || []).filter(present);
  const observed = rows.filter(row => accuracy(row) !== null);
  const total = observed.reduce((n, row) => n + row.correctCount + row.incorrectCount, 0);
  for (const row of session.studentScores || []) {
    const value = present(row) ? accuracy(row) : null;
    row.status = value === null ? 'ACTIVE' : value < 50 ? 'NEEDS_PRACTICE' : value >= 80 ? 'COMPLETED' : 'ACTIVE';
  }
  session.summary = {
    participationCount: observed.length,
    averageAccuracy: total ? Math.round(100 * observed.reduce((n, row) => n + row.correctCount, 0) / total) : 0,
    totalStars: rows.reduce((n, row) => n + row.stars, 0),
    totalPoints: rows.reduce((n, row) => n + row.points, 0),
    studentsNeedingPractice: observed.filter(row => accuracy(row) < 50).map(row => row.student),
    topPerformers: [...rows].filter(row => row.stars > 0 || row.points > 0)
      .sort((a, b) => b.stars - a.stars || b.points - a.points).slice(0, 3).map(row => row.student)
  };
  return session.summary;
}
function requireLive(session) {
  if (session.status !== 'LIVE') fail('Chỉ có thể ghi nhận kết quả khi buổi dạy đang diễn ra.', 409);
}
function applyScore(session, body, studentIds) {
  requireLive(session);
  const operationId = text(body.operationId, 100);
  if (!/^[\w-]{8,100}$/.test(operationId)) fail('Thiếu mã thao tác để chống cộng điểm lặp.');
  if ((session.appliedOperations || []).includes(operationId)) return false;
  if (!Array.isArray(studentIds) || !studentIds.length || new Set(studentIds.map(idOf)).size !== studentIds.length) fail('Danh sách học sinh không hợp lệ hoặc bị lặp.');
  const fields = { points: 100, stars: 10, correctDelta: 1, incorrectDelta: 1 };
  for (const [key, max] of Object.entries(fields)) {
    const value = body[key] ?? 0;
    if (!Number.isInteger(value) || Math.abs(value) > max) fail(`Giá trị ${key} không hợp lệ.`);
  }
  const rows = studentIds.map(id => {
    const row = session.studentScores.find(item => idOf(item.student) === idOf(id));
    if (!row || !present(row)) fail('Chỉ ghi điểm cho học sinh có mặt trong buổi dạy.');
    return row;
  });
  if ((session.appliedOperations || []).length >= 20000) fail('Buổi học đã vượt giới hạn thao tác. Vui lòng kết thúc buổi học.');
  for (const row of rows) {
    for (const [field, delta] of [['points', 'points'], ['stars', 'stars'], ['correctCount', 'correctDelta'], ['incorrectCount', 'incorrectDelta']]) {
      row[field] = Math.max(0, (row[field] || 0) + (body[delta] || 0));
    }
  }
  session.appliedOperations ||= [];
  session.appliedOperations.push(operationId);
  return true;
}
function recordQuestion(session, body) {
  requireLive(session);
  const index = body.questionIndex ?? 0;
  if (!Number.isInteger(index) || index < 0 || index > 10000) fail('Số thứ tự câu hỏi không hợp lệ.');
  const activityId = body.activityId || null;
  if (activityId && (!validId(activityId) || !session.activities.some(id => idOf(id) === idOf(activityId)))) fail('Hoạt động không thuộc buổi học.');
  const promptText = text(body.promptText, 1000);
  const key = `${activityId || 'manual'}:${index}${activityId ? '' : ':' + promptText}`;
  if (!Array.isArray(body.studentAnswers) || !body.studentAnswers.length) fail('Vui lòng ghi nhận ít nhất một câu trả lời.');
  const seen = new Set();
  const studentAnswers = body.studentAnswers.map(answer => {
    const student = idOf(answer?.studentId || answer?.student);
    const row = session.studentScores.find(item => idOf(item.student) === student);
    if (!row || seen.has(student)) fail('Học sinh trả lời không thuộc buổi học hoặc bị lặp.');
    seen.add(student);
    if (!['CORRECT', 'INCORRECT', 'NOT_ANSWERED'].includes(answer.result)) fail('Kết quả trả lời không hợp lệ.');
    if (!present(row)) return null;
    return { student, result: answer.result };
  }).filter(Boolean);
  const results = session.questionResults ||= [];
  const oldIndex = results.findIndex(q => (q.key || `${q.activityId || 'manual'}:${q.questionIndex}${q.activityId ? '' : ':' + q.promptText}`) === key);
  const counter = { CORRECT: 'correctCount', INCORRECT: 'incorrectCount', NOT_ANSWERED: 'notAnswered' };
  const adjust = (answers, sign) => answers.forEach(answer => {
    const row = session.studentScores.find(item => idOf(item.student) === idOf(answer.student));
    if (row && present(row)) row[counter[answer.result]] = Math.max(0, (row[counter[answer.result]] || 0) + sign);
  });
  if (oldIndex >= 0) adjust(results[oldIndex].studentAnswers, -1);
  adjust(studentAnswers, 1);
  const result = { key, activityId, questionIndex: index, promptText, promptImageUrl: text(body.promptImageUrl, 2000), studentAnswers };
  if (oldIndex >= 0) results.splice(oldIndex, 1, result); else results.push(result);
}
module.exports = { fail, idOf, validId, vnDate, vnClock, attendanceDate, attendanceRecords, text, assignmentDates, accuracy, present, summarize, requireLive, applyScore, recordQuestion };
