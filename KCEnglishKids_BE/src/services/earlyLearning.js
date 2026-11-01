const ages = require('../../../shared/earlyLearning.json');
const { fail, text } = require('./teacherRules');
const DAY = 86400000;
function reviewDueAt(record) {
  if (record.nextReviewAt) return new Date(record.nextReviewAt);
  const last = new Date(record.lastReviewedAt || 0);
  if (!Number.isFinite(last.getTime())) return new Date(0);
  // Configurable teaching heuristic, not a standardized ability assessment.
  const spacedStreak = record.masteryAlgorithmVersion >= 2 ? record.practiceDaysCount >= 6 : record.streak >= 6;
  const interval = record.masteryLevel < 3 ? 1 : spacedStreak ? 7 : 3;
  return new Date(last.getTime() + interval * DAY);
}
function lessonGuide(lesson, ageCode) {
  const age = ages[ageCode] || ages['3-4'];
  const words = (lesson?.vocabularyItems || []).filter(word => word?.english&&!['INACTIVE','HIDDEN','DRAFT'].includes(word.status));
  const profile=lesson?.teachingProfile;
  const ordered=profile?.focusVocabulary?.length?profile.focusVocabulary.map(id=>words.find(word=>String(word._id)===String(id))).filter(Boolean):words;
  const focus = ordered.slice(0, age.reviewWords).map(word => ({ id: String(word._id), english: word.english, vietnamese: word.vietnamese, imageUrl: word.imageUrl, audioUrl: word.audioUrl }));
  const examples = focus.slice(0, 3).map(word => word.english).join(', ');
  const goals = [
    { key: 'LISTEN_POINT', label: `Nghe và chỉ/chọn tranh từ đã học${examples ? ': ' + examples : ''}.` },
    { key: 'EXPRESS', label: ageCode === '3-4' ? 'Đáp lại bằng chỉ tranh, cử chỉ hoặc nói theo khi bé sẵn sàng.' : 'Gọi tên hoặc dùng từ/câu ngắn trong tình huống có ý nghĩa; được hỗ trợ khi cần.' },
    { key: 'PARTICIPATE', label: 'Tham gia lượt chơi, cùng làm động tác và biết chờ đến lượt với hỗ trợ phù hợp.' }
  ];
  const guide = { ageGroup: ageCode, ...age, focus, goals, curriculumObjectives: lesson?.learningObjectives || [],
    phases: [
      { key: 'CONNECT', title: 'Kết nối và ôn nhẹ', action: 'Chào bé, hỏi cảm xúc; chỉ ôn vài từ quen thuộc qua tranh hoặc đồ vật.' },
      { key: 'EXPLORE', title: 'Khám phá bằng vật thật và tranh', action: 'Giới thiệu một nhóm từ nhỏ, nghe mẫu rõ ràng; để bé chỉ, chạm và làm động tác.' },
      { key: 'PLAY', title: 'Chơi và dùng từ', action: 'Luân phiên trò nghe–chọn với hoạt động vận động, đóng vai và lượt chơi cùng bạn.' },
      { key: 'OBSERVE', title: 'Quan sát và khép lại', action: 'Ghi một minh chứng cụ thể: bé tự làm, cần gợi ý hay cần thêm cơ hội; hướng dẫn gia đình một trò ngắn.' }
    ],
    homeActivity: { title: 'Tìm và chỉ cùng gia đình', minutes: 5, steps: [
      `Chọn 2–3 tranh hoặc đồ vật quen thuộc${examples ? ' gợi nhớ ' + examples : ''}; nghe mẫu cùng bé.`,
      'Người lớn nói một từ, bé chỉ/chọn hoặc làm động tác. Đổi vai nếu bé muốn; không yêu cầu đọc chữ.',
      'Khen một việc cụ thể bé đã cố gắng; dừng khi bé muốn nghỉ. Có thể chơi bằng tranh khi không có mạng.'
    ] }
  };
  if(profile){
    if(profile.goals?.length===3)guide.goals=profile.goals.map(goal=>({key:goal.key,label:goal.label}));
    if(profile.phases?.length===4)guide.phases=profile.phases.map(phase=>({key:phase.key,title:phase.title,action:phase.action}));
    if(profile.homeActivity?.steps?.length)guide.homeActivity={...profile.homeActivity,minutes:5};
  }
  return {...guide,materials:profile?.materials||'',profileRevision:lesson?.pedagogyRevision||0,source:profile?'ADMIN':'DEFAULT'};
}
function closureDecision(body, guide, scores) {
  if (!['COMPLETE', 'CONTINUE', 'REVIEW'].includes(body.coverage)) fail('Chọn đã dạy đủ mục tiêu, cần dạy tiếp hoặc buổi ôn tập.');
  if (!Array.isArray(body.goalsCovered) || new Set(body.goalsCovered).size !== body.goalsCovered.length || body.goalsCovered.some(key => !guide.goals.some(goal => goal.key === key))) fail('Mục tiêu ghi nhận không hợp lệ.');
  if (body.coverage === 'COMPLETE' && (body.goalsCovered.length !== guide.goals.length || !scores.some(row => !['ABSENT', 'EXCUSED'].includes(row.attendance)))) fail('Chỉ đánh dấu đã dạy đủ khi đã tổ chức các mục tiêu và có học sinh tham gia.');
  return { coverage: body.coverage, goalsCovered: body.goalsCovered, reflection: text(body.reflection, 1000), recordedAt: new Date() };
}
function observationSummary(rows) {
  const latest = new Map();
  for (const row of [...rows].sort((a,b) => new Date(b.observedAt) - new Date(a.observedAt))) {
    const key = String(row.lesson?._id || row.lesson) + ':' + row.skill;
    if (!latest.has(key)) latest.set(key,row);
  }
  const values = [...latest.values()];
  return { observations: rows.length, latestSkills: values.length, independent: values.filter(row => row.level === 'INDEPENDENT').length, supported: values.filter(row => row.level === 'SUPPORTED').length, emerging: values.filter(row => row.level === 'EMERGING').length, basis: 'Quan sát mới nhất theo từng bài và mục tiêu; không quy đổi thành điểm năng lực.' };
}
module.exports = { ages, reviewDueAt, lessonGuide, closureDecision, observationSummary };
