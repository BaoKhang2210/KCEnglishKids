const M=require('../models');
const {idOf,fail,present}=require('./teacherRules');
const {latest,hash}=require('./homePractice');
const levels={INDEPENDENT:'Tự làm được',SUPPORTED:'Làm được khi có gợi ý',EMERGING:'Cần thêm cơ hội luyện'};
async function row(session,child,score){
  const [observations,edition,assignment]=await Promise.all([
    M.LearningObservation.find({child:child._id,session:session._id,voidedAt:null}).sort({observedAt:-1,_id:-1}).lean(),latest(child._id),
    session.teacher?M.Assignment.findOne({teacher:session.teacher,classRoom:idOf(session.classroom),lesson:idOf(session.lesson),status:{$in:['ASSIGNED','IN_PROGRESS','COMPLETED']},$and:[{$or:[{recipients:child._id},{recipients:{$exists:false},assignedToType:'CLASS'},{recipients:{$exists:false},student:child._id}]},{$or:[{startDate:null},{startDate:{$lte:new Date()}}]}]}).sort({createdAt:-1,_id:-1}).lean():null
  ]);
  const plan=edition?.status==='APPROVED'&&idOf(edition.classroom)===idOf(session.classroom)&&idOf(edition.lesson)===idOf(session.lesson)?edition:null;
  const allowed=present(score)?observations:[];
  const unitTitle = (session.lesson?.curriculumUnits || [])
    .filter(unit => unit && typeof unit === 'object' && unit.unitNumber != null)
    .map(unit => `${unit.bookNumber ? `Sách ${unit.bookNumber} · ` : ''}Unit ${unit.unitNumber}${unit.bigQuestion ? `: ${unit.bigQuestion}` : ''}`)
    .join('; ');
  const base={coverage:session.teachingOutcome?.coverage||'LEGACY',goals:session.teachingGoals||[],lessonTitle:session.lesson?.vietnameseTitle||session.lesson?.title||session.title,unitTitle,attended:present(score)};
  const homework=assignment?{_id:assignment._id,instructions:assignment.instructions||'',dueDate:assignment.dueDate}:null;
  const basisToken=hash({base,observations:allowed.map(item=>[idOf(item),item.updatedAt]),assignment:homework,assignmentUpdatedAt:assignment?.updatedAt,plan:plan?._id,revision:edition?.revision,score:{stars:score.stars,correctCount:score.correctCount,incorrectCount:score.incorrectCount,attendance:score.attendance}});
  return {childId:idOf(child),childName:child.name,basisToken,...base,observations:allowed.map(item=>({_id:item._id,skill:item.skill,level:item.level,evidence:item.evidence,nextStep:item.nextStep,observedAt:item.observedAt})),assignment:homework,plan:!homework&&plan?{_id:plan._id,revision:plan.revision,homeActivity:plan.homeActivity,words:plan.words,teacherNote:plan.teacherNote}:null};
}
function snapshot(draft,body){
  if(body.basisToken!==draft.basisToken)fail('Quan sát hoặc bài ôn đã đổi. Tải lại và xem trước báo cáo.',409);
  const ids=body.observationIds||[];
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!draft.observations.some(item=>idOf(item)===id)))fail('Ghi nhận được chọn không thuộc buổi/trẻ hoặc đã được gỡ.');
  return {coverage:draft.coverage,goals:draft.goals,lessonTitle:draft.lessonTitle,unitTitle:draft.unitTitle||'',attended:draft.attended,observations:draft.observations.filter(item=>ids.includes(idOf(item))).map(item=>({id:idOf(item),skill:item.skill,level:item.level,evidence:item.evidence,nextStep:item.nextStep})),assignment:body.includeAssignment&&draft.assignment?draft.assignment:null,plan:body.includePlan&&draft.plan?draft.plan:null};
}
function lines(value){
  const result=['Nội dung bài: '+value.lessonTitle];
  const coverage={COMPLETE:'Lớp đã tổ chức đủ mục tiêu bài.',CONTINUE:'Lớp sẽ tiếp tục nội dung bài ở buổi sau.',REVIEW:'Buổi ôn tập; giữ tiến độ hiện tại.',LEGACY:'Buổi học lịch sử chưa có ghi nhận mức độ tổ chức mục tiêu.'};
  result.push(coverage[value.coverage]||coverage.LEGACY);
  if(!value.attended) {
    const unitPart = value.unitTitle ? ` (Unit: ${value.unitTitle})` : '';
    result.push(`Bé vắng mặt trong buổi học bài: ${value.lessonTitle}${unitPart}. Gia đình mở ứng dụng cho bé ôn tập bài này để theo kịp bài cùng các bạn.`);
  }
  for(const item of value.observations){result.push('Cô quan sát: '+item.evidence+' ('+levels[item.level]+').');if(item.nextStep)result.push('Hỗ trợ tiếp theo: '+item.nextStep);}
  if(value.attended&&!value.observations.length)result.push('Chưa chọn ghi nhận quan sát riêng cho bé trong buổi này.');
  if(value.assignment){result.push('Bài về nhà: '+value.lessonTitle);if(value.assignment.instructions)result.push(value.assignment.instructions);if(value.assignment.dueDate)result.push('Hạn hoàn thành: '+new Date(value.assignment.dueDate).toLocaleDateString('vi-VN'));}
  if(value.plan){result.push('Nhóm từ cô đã duyệt ôn: '+value.plan.words.map(word=>word.english).join(', '), 'Gia đình cùng chơi: '+value.plan.homeActivity.title,...value.plan.homeActivity.steps.map((step,index)=>(index+1)+'. '+step));if(value.plan.teacherNote)result.push('Lời cô khi giao ôn: '+value.plan.teacherNote);}
  return result;
}
module.exports={row,snapshot,lines};
