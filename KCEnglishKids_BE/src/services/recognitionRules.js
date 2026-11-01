const OFFSET = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Calendar boundaries are always Asia/Ho_Chi_Minh, independent of server timezone.
function recognitionPeriod(kind, date) {
  if (!['WEEK', 'MONTH'].includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    throw new Error('Chọn kỳ tuần/tháng và ngày hợp lệ.');
  }
  const local = new Date(date + 'T00:00:00.000Z');
  if (!Number.isFinite(local.getTime()) || local.toISOString().slice(0, 10) !== date) {
    throw new Error('Ngày không hợp lệ.');
  }
  if (kind === 'WEEK') local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  else local.setUTCDate(1);
  const end = new Date(local);
  if (kind === 'WEEK') end.setUTCDate(end.getUTCDate() + 7);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    kind, date: local.toISOString().slice(0, 10),
    start: new Date(local.getTime() - OFFSET),
    end: new Date(end.getTime() - OFFSET),
    lastDate: new Date(end.getTime() - DAY).toISOString().slice(0, 10)
  };
}

function rewardFor(kind) {
  return kind === 'WEEK'
    ? { title: 'Ngôi sao tuần', symbol: '🌟', description: 'Huy hiệu Ngôi sao tuần', suggestion: 'Mời bé dẫn phần chào hỏi hoặc khởi động cùng cô.' }
    : { title: 'Ngôi sao tháng', symbol: '🏅', description: 'Huy chương Ngôi sao tháng', suggestion: 'Mời bé làm trợ giúp lớp và chọn một bài hát cho cả lớp.' };
}

function rankClassroomStars(students, sessions) {
  const totals = new Map(students.map(student => [String(student._id), {
    child: String(student._id), name: student.name, avatarUrl: student.avatarUrl || '',
    stars: 0, sessions: 0
  }]));
  for (const session of sessions) {
    if (session.status !== 'COMPLETED') continue;
    for (const score of session.studentScores || []) {
      const row = totals.get(String(score.student));
      if (!row || ['ABSENT', 'EXCUSED'].includes(score.attendance)) continue;
      row.sessions += 1;
      const stars = Number(score.stars);
      if (Number.isFinite(stars)) row.stars += Math.max(0, Math.floor(stars));
    }
  }
  const ranking = [...totals.values()].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, 'vi'));
  const maximum = ranking[0]?.stars || 0;
  return ranking.map(row => ({ ...row, winner: maximum > 0 && row.stars === maximum }));
}

function rankSchoolStars(students, sessions, minimumSessions) {
  const rows = rankClassroomStars(students, sessions).map(row => ({
    ...row, eligible: row.sessions >= minimumSessions,
    starsPerSession: row.sessions ? Math.round(100 * row.stars / row.sessions) / 100 : null,
    winner: false
  }));
  // Compare exact fractions; rounded display values must never create or break ties.
  rows.sort((a, b) => Number(b.eligible) - Number(a.eligible) ||
    (b.stars * (a.sessions || 1) - a.stars * (b.sessions || 1)) || a.name.localeCompare(b.name, 'vi'));
  const best = rows.find(row => row.eligible && row.stars > 0);
  for (const row of rows) {
    row.winner = Boolean(best && row.eligible && row.stars * best.sessions === best.stars * row.sessions);
    row.rank = row.eligible && row.stars > 0 ? 1 + rows.filter(other => other.eligible && other.stars * row.sessions > row.stars * other.sessions).length : null;
  }
  return rows;
}
module.exports = { recognitionPeriod, rewardFor, rankClassroomStars, rankSchoolStars };
