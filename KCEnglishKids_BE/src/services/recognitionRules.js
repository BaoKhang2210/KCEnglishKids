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
    ? {
        title: 'Ngôi Sao Tuần',
        symbol: '🌟',
        badge: 'gold-star',
        description: 'Danh hiệu Ngôi Sao Tuần dành cho bé có thành tích học tập xuất sắc nhất tuần!',
        suggestion: 'Mời bé dẫn phần chào hỏi hoặc khởi động cùng cô trong buổi học tới.'
      }
    : {
        title: 'Ngôi Sao Tháng',
        symbol: '🏅',
        badge: 'gold-medal',
        description: 'Danh hiệu Ngôi Sao Tháng vinh danh bé nỗ lực và tỏa sáng nhất trong tháng!',
        suggestion: 'Mời bé làm trợ giúp lớp và chọn một bài hát yêu thích cho cả lớp cùng hát.'
      };
}

function determinePreschoolAward(row, totalSessions, maxStars) {
  const isTopStar = maxStars > 0 && row.stars === maxStars;
  const isPerfect = totalSessions > 0 && row.sessions >= totalSessions;

  // 1. Bé đạt điểm sao cao nhất kỳ
  if (isTopStar) {
    return {
      awardTitle: 'Ngôi Sao Tỏa Sáng',
      awardSymbol: '👑',
      awardBadge: 'star-champion',
      awardTier: 'GOLD',
      awardCategory: 'CHAMPION',
      awardDescription: 'Thành tích xuất sắc nhất kỳ'
    };
  }

  // 2. Bé đi học chuyên cần 100%
  if (isPerfect) {
    return {
      awardTitle: 'Đại Sứ Chuyên Cần',
      awardSymbol: '🏆',
      awardBadge: 'perfect-attendance',
      awardTier: 'SILVER',
      awardCategory: 'ATTENDANCE',
      awardDescription: 'Đi học chuyên cần đầy đủ 100%'
    };
  }

  // 3. Bé tự giác làm bài tập ở nhà
  if (row.homeStars >= 3) {
    return {
      awardTitle: 'Ong Vàng Chăm Chỉ',
      awardSymbol: '🐝',
      awardBadge: 'home-explorer',
      awardTier: 'BRONZE',
      awardCategory: 'HOME',
      awardDescription: 'Tự giác hoàn thành bài ôn tập ở nhà'
    };
  }

  // 4. Bé tích lũy tốt hoặc đạt điểm khá
  if (row.totalStars >= 10 || row.stars >= 6) {
    return {
      awardTitle: 'Bé Chăm Ngoan',
      awardSymbol: '⭐',
      awardBadge: 'active-learner',
      awardTier: 'HONOR',
      awardCategory: 'LEARNER',
      awardDescription: 'Chăm ngoan và tích cực học tập'
    };
  }

  // 5. Bé đang nỗ lực tiến bộ
  return {
    awardTitle: 'Hạt Giống Tiến Bộ',
    awardSymbol: '🌱',
    awardBadge: 'rising-star',
    awardTier: 'ENCOURAGE',
    awardCategory: 'PROGRESS',
    awardDescription: 'Nỗ lực học tập và tiến bộ mỗi ngày'
  };
}

function rankClassroomStars(students, sessions) {
  const totals = new Map(students.map(student => [String(student._id), {
    child: String(student._id),
    name: student.name,
    avatarUrl: student.avatarUrl || '',
    className: student.className || student.assignedClass?.name || '',
    classStars: 0,
    homeStars: Number.isFinite(Number(student.homeStars)) ? Math.max(0, Math.floor(Number(student.homeStars))) : 0,
    stars: 0,
    sessions: 0,
    totalStars: Number.isFinite(Number(student.totalStars)) ? Math.max(0, Math.floor(Number(student.totalStars))) : 0
  }]));

  let totalSessions = 0;
  for (const session of sessions) {
    if (session.status !== 'COMPLETED') continue;
    totalSessions += 1;
    for (const score of session.studentScores || []) {
      const row = totals.get(String(score.student));
      if (!row || ['ABSENT', 'EXCUSED'].includes(score.attendance)) continue;
      row.sessions += 1;
      const stars = Number(score.stars);
      if (Number.isFinite(stars)) row.classStars += Math.max(0, Math.floor(stars));
    }
  }

  // Tổng sao trong kỳ = sao học trên lớp + sao học ở nhà
  for (const row of totals.values()) {
    row.stars = row.classStars + row.homeStars;
  }

  // Sắp xếp: Ưu tiên Tổng sao trong kỳ (stars) > Số buổi học (sessions) > Sao ở nhà (homeStars) > Tổng tích lũy (totalStars)
  const ranking = [...totals.values()].map(row => ({
    ...row,
    starsPerSession: row.sessions ? Math.round(100 * row.classStars / row.sessions) / 100 : 0,
    isPerfectAttendance: totalSessions > 0 && row.sessions === totalSessions
  })).sort((a, b) => 
    b.stars - a.stars || 
    b.sessions - a.sessions || 
    b.homeStars - a.homeStars ||
    b.totalStars - a.totalStars || 
    a.name.localeCompare(b.name, 'vi')
  );

  const maximum = ranking[0]?.stars || 0;
  let currentRank = 1;

  return ranking.map((row, idx, arr) => {
    if (idx > 0 && row.stars < arr[idx - 1].stars) {
      currentRank += 1;
    }
    const hasStars = row.stars > 0 && (row.sessions > 0 || row.homeStars > 0);
    const isWinner = maximum > 0 && row.stars === maximum && hasStars;
    const award = determinePreschoolAward(row, totalSessions, maximum);

    return {
      ...row,
      rank: hasStars ? currentRank : null,
      winner: isWinner,
      ...award
    };
  });
}

function rankSchoolStars(students, sessions, minimumSessions = 0) {
  const classroomRanking = rankClassroomStars(students, sessions);

  const rows = classroomRanking.map(row => ({
    ...row,
    eligible: row.stars > 0 && (row.sessions >= minimumSessions || row.homeStars > 0)
  })).sort((a, b) => 
    Number(b.eligible) - Number(a.eligible) ||
    b.stars - a.stars ||
    b.sessions - a.sessions || 
    b.homeStars - a.homeStars ||
    b.totalStars - a.totalStars || 
    a.name.localeCompare(b.name, 'vi')
  );

  const bestStars = rows.find(r => r.eligible)?.stars || 0;
  let currentRank = 1;

  return rows.map((row, idx, arr) => {
    if (idx > 0 && row.stars < arr[idx - 1].stars) {
      currentRank += 1;
    }
    const isWinner = bestStars > 0 && row.eligible && row.stars === bestStars;
    const award = determinePreschoolAward(row, 0, bestStars);

    return {
      ...row,
      rank: row.eligible ? currentRank : null,
      winner: isWinner,
      ...award
    };
  });
}

module.exports = { recognitionPeriod, rewardFor, rankClassroomStars, rankSchoolStars };
