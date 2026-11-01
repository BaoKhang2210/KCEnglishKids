const { Vocabulary, CurriculumUnit, Topic, Assignment, ActivityResult } = require('../models');
const fail = message => { throw Object.assign(new Error(message), {statusCode:409}); };
const safeMedia = value => typeof value === 'string' && (value.startsWith('/') && !value.startsWith('//') || /^https:\/\//i.test(value));
async function lessonReadiness(lesson) {
  const issues=[];
  const attached=await Vocabulary.find({_id:{$in:lesson.vocabularyItems || []}}).lean();
  const words=attached.filter(word=>word.status==='ACTIVE');
  if(!lesson.title?.trim()) issues.push('Thiếu tiêu đề.');
  if(!['3-4','4-5','5-6'].includes(lesson.ageGroupCode))issues.push('Nhóm tuổi không hợp lệ.');
  if(words.length<2)issues.push('Cần ít nhất 2 từ đang hoạt động.');
  if(attached.length!==new Set((lesson.vocabularyItems || []).map(String)).size)issues.push('Có từ không tồn tại.');
  for(const word of words){
    if(!word.english?.trim()||!word.vietnamese?.trim())issues.push('Từ thiếu nội dung: '+word.english);
    if(!safeMedia(word.imageUrl))issues.push('Thiếu ảnh hoặc URL ảnh không hợp lệ: '+word.english);
    if(word.audioUrl && !safeMedia(word.audioUrl))issues.push('URL audio không hợp lệ: '+word.english);
    if(!word.ageGroupCodes?.includes(lesson.ageGroupCode))issues.push('Từ không phù hợp nhóm tuổi: '+word.english);
  }
  const units=await CurriculumUnit.find({_id:{$in:lesson.curriculumUnits || []},status:'ACTIVE'}).lean();
  if(!units.length||units.length!==(lesson.curriculumUnits || []).length||units.some(u=>u.ageGroupCode!==lesson.ageGroupCode))issues.push('Unit không tồn tại, bị ẩn hoặc khác nhóm tuổi.');
  if(!await Topic.exists({_id:lesson.topic,status:'ACTIVE'}))issues.push('Chủ đề chưa hoạt động.');
  const games=await require('./gameCatalog').configuredGames(words,units[0]?.unitNumber||1,lesson.displayOrder||1);
  if(games.length<2)issues.push('Không đủ 2 game khả dụng.');
  return {ready:issues.length===0,issues,games:games.map(g=>g.id),wordCount:words.length,archivedWords:attached.length-words.length,audioPolicy:'Audio URL hoặc giọng đọc của thiết bị; cần nghe thử trước khi xuất bản.'};
}
async function assertPublishable(lesson){const report=await lessonReadiness(lesson);if(!report.ready)fail(report.issues.join(' '));return report;}
async function assertNotAssigned(query){if(await Assignment.exists({status:{$in:['ASSIGNED','IN_PROGRESS']},...query}))fail('Nội dung đang được giao. Hủy/đóng bài giao trước khi ẩn hoặc sửa; tạo bản mới để giữ lịch sử.');}
async function assertActivityEditable(id){await assertNotAssigned({$or:[{activity:id},{activitySnapshot:id}]});if(await ActivityResult.exists({activity:id}))fail('Hoạt động đã có kết quả. Hãy tạo phiên bản mới.');}
module.exports={lessonReadiness,assertPublishable,assertNotAssigned,assertActivityEditable,safeMedia};
