const crypto=require('node:crypto');
const M=require('../models');
const {idOf,validId,fail,text,present}=require('./teacherRules');
const {lessonGuide,reviewDueAt}=require('./earlyLearning');
const {homeActivity}=require('./teachingProfile');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const latest=child=>M.HomePracticePlan.findOne({child}).sort({revision:-1}).lean();
function chooseWords(words,mastery,observations,guide,attended,now=new Date()){
  return words.filter(word=>word.status==='ACTIVE'&&word.imageUrl).map(word=>{
    const record=mastery.find(row=>idOf(row.vocabulary)===idOf(word));
    // Use only the newest observation for each skill and word. Never parse free text into diagnoses.
    const own=[];const seen=new Set();
    for(const observation of observations)if(observation.vocabulary?.some(id=>idOf(id)===idOf(word))&&!seen.has(observation.skill)){seen.add(observation.skill);own.push(observation);}
    const support=own.find(row=>row.level!=='INDEPENDENT');
    const due=record&&reviewDueAt(record)<=now;
    const reason=support?'Cô ghi nhận cần hỗ trợ ở từ này':record&&record.masteryLevel<3&&record.wrongCount>0?'Còn nhầm trong các lượt đã luyện':due?'Đến lượt nhắc lại từ đã luyện':attended?'Ôn từ trong bài bé đã tham dự':'Cô chọn làm quen; chưa có ghi nhận tham dự bài này';
    const priority=support?0:record&&record.masteryLevel<3&&record.wrongCount>0?1:due?2:guide.focus.some(item=>item.id===idOf(word))?3:4;
    return {vocabulary:word,reason,priority,dueAt:record?reviewDueAt(record):null};
  }).sort((a,b)=>a.priority-b.priority||new Date(a.dueAt||8640000000000000)-new Date(b.dueAt||8640000000000000));
}
async function proposal(child,room,lessonId){
  const [sessions,observations,current]=await Promise.all([
    M.ClassroomSession.find({classroom:room._id,status:'COMPLETED','studentScores.student':child._id}).sort({endedAt:-1,_id:-1}).limit(30).lean(),
    M.LearningObservation.find({child:child._id,classroom:room._id,voidedAt:null}).sort({observedAt:-1,_id:-1}).limit(200).lean(),latest(child._id)
  ]);
  const attended=sessions.find(session=>session.studentScores.some(row=>idOf(row.student)===idOf(child)&&present(row)));
  let selected=lessonId||idOf(attended?.lesson)||idOf(observations[0]?.lesson)||idOf(sessions[0]?.lesson);
  if(lessonId&&!validId(lessonId))fail('Chọn bài ôn hợp lệ.');
  if(!selected){
    const unit=await M.CurriculumUnit.findOne({ageGroupCode:child.ageGroupCode,status:'ACTIVE'}).sort({bookNumber:1,unitNumber:1}).lean();
    selected=idOf(await M.Lesson.findOne({ageGroupCode:child.ageGroupCode,status:'ACTIVE',...(unit?{curriculumUnits:unit._id}:{_id:null})}).sort({displayOrder:1,_id:1}).select('_id').lean());
  }
  const lesson=selected&&await M.Lesson.findOne({_id:selected,ageGroupCode:child.ageGroupCode,status:'ACTIVE'}).populate('vocabularyItems').lean();
  if(!lesson)return {available:false,revision:current?.revision||0,message:'Chưa có bài đang hoạt động phù hợp độ tuổi để chuẩn bị ôn.'};
  const source=sessions.find(session=>idOf(session.lesson)===idOf(lesson));
  const actual=sessions.find(session=>idOf(session.lesson)===idOf(lesson)&&session.studentScores.some(row=>idOf(row.student)===idOf(child)&&present(row)));
  const own=observations.filter(row=>idOf(row.lesson)===idOf(lesson));
  const mastery=await M.VocabularyMastery.find({student:child._id,vocabulary:{$in:lesson.vocabularyItems.map(word=>word._id)}}).lean();
  const guide=lessonGuide(lesson,child.ageGroupCode);
  const items=chooseWords(lesson.vocabularyItems,mastery,own,guide,Boolean(actual));
  const basisToken=hash({lesson:idOf(lesson),updated:lesson.updatedAt,profile:guide.profileRevision,words:lesson.vocabularyItems.map(word=>[idOf(word),word.updatedAt,word.status]),observations:own.map(row=>[idOf(row),row.updatedAt,row.level]),mastery:mastery.map(row=>[idOf(row.vocabulary),row.updatedAt,row.masteryLevel,row.wrongCount,row.streak]),sessions:sessions.filter(row=>idOf(row.lesson)===idOf(lesson)).map(row=>[idOf(row),row.updatedAt,row.studentScores.find(item=>idOf(item.student)===idOf(child))?.attendance])});
  return {available:true,lesson:{_id:lesson._id,title:lesson.vietnameseTitle||lesson.title},guide,items,suggestedWordIds:items.slice(0,guide.reviewWords).map(item=>idOf(item.vocabulary)),observations:own.map(row=>({_id:row._id,skill:row.skill,level:row.level,evidence:row.evidence,nextStep:row.nextStep,observedAt:row.observedAt})),attended:Boolean(actual),sourceSession:actual?._id||source?._id||null,attendanceBasis:actual?'Có ghi nhận bé tham dự bài này':source?'Có buổi lớp dạy bài này nhưng chưa ghi nhận bé có mặt':'Chưa có ghi nhận bé tham dự bài này',revision:current?.revision||0,basisToken};
}
function safe(item){if(!item)return null;const value={...item};delete value.payloadHash;delete value.operationId;return value;}
function validateOperation(body){if(typeof body.operationId!=='string'||!/^[a-zA-Z0-9_-]{8,120}$/.test(body.operationId))fail('Thiếu mã thao tác chống gửi lặp.');if(!Number.isInteger(body.expectedRevision)||body.expectedRevision<0)fail('Thiếu phiên bản bài ôn.');}
async function approve(req,child,room,body,revoke=false){
  validateOperation(body);
  const payloadHash=hash({...body,child:idOf(child),classroom:idOf(room),revoke});
  const existing=await M.HomePracticePlan.findOne({teacher:req.user._id,operationId:body.operationId}).select('+payloadHash').lean();
  if(existing){if(existing.payloadHash!==payloadHash)fail('Mã thao tác đã dùng cho nội dung khác.',409);return safe(existing);}
  if(!['ACTIVE','UPCOMING'].includes(room.status))fail('Chỉ duyệt ôn cho lớp hiện tại.');
  const current=await latest(child._id);
  if((current?.revision||0)!==body.expectedRevision)fail('Bài ôn đã thay đổi. Tải lại trước khi duyệt hoặc thu hồi.',409);
  let values;
  if(revoke){
    if(!current||current.status!=='APPROVED')fail('Không có bài ôn đang được giao để thu hồi.');
    values={lesson:current.lesson,lessonTitle:current.lessonTitle,ageGroupCode:current.ageGroupCode,words:[],homeActivity:{title:'Đã thu hồi',steps:[]},observations:[],teacherNote:text(body.teacherNote,1000)};
  }else{
    const draft=await proposal(child,room,body.lessonId);
    if(!draft.available)fail(draft.message);
    if(body.basisToken!==draft.basisToken)fail('Căn cứ quan sát hoặc nội dung bài đã đổi. Tải lại đề xuất để duyệt.',409);
    const ids=body.wordIds;
    if(!Array.isArray(ids)||ids.length<1||ids.length>draft.guide.reviewWords||new Set(ids).size!==ids.length||ids.some(id=>!validId(id)||!draft.items.some(item=>idOf(item.vocabulary)===id)))fail('Chọn nhóm từ trong bài, đúng giới hạn tuổi.');
    const observationIds=body.observationIds||[];
    if(!Array.isArray(observationIds)||new Set(observationIds).size!==observationIds.length||observationIds.some(id=>!draft.observations.some(row=>idOf(row)===id)))fail('Ghi nhận đã gỡ hoặc không thuộc đề xuất.');
    const words=ids.map(id=>{const item=draft.items.find(row=>idOf(row.vocabulary)===id),word=item.vocabulary;return{vocabulary:word._id,english:word.english,vietnamese:word.vietnamese,imageUrl:word.imageUrl,audioUrl:word.audioUrl,wordType:word.wordType,visualType:word.visualType,isTransparent:word.isTransparent,reason:item.reason};});
    values={lesson:draft.lesson._id,lessonTitle:draft.lesson.title,ageGroupCode:child.ageGroupCode,sourceSession:draft.sourceSession,words,homeActivity:homeActivity(body.homeActivity),observations:draft.observations.filter(row=>observationIds.includes(idOf(row))).map(row=>({observation:row._id,skill:row.skill,level:row.level,evidence:row.evidence,nextStep:row.nextStep})),teacherNote:text(body.teacherNote,1000),guideRevision:draft.guide.profileRevision,basis:draft.attendanceBasis};
  }
  try{return safe((await M.HomePracticePlan.create({...values,child:child._id,classroom:room._id,teacher:req.user._id,revision:body.expectedRevision+1,status:revoke?'REVOKED':'APPROVED',operationId:body.operationId,payloadHash})).toObject());}
  catch(error){if(error.code!==11000)throw error;const retry=await M.HomePracticePlan.findOne({teacher:req.user._id,operationId:body.operationId}).select('+payloadHash').lean();if(retry?.payloadHash===payloadHash)return safe(retry);fail('Có bản duyệt mới hơn. Tải lại trước khi tiếp tục.',409);}
}
async function familyCurrent(child){
  const plan=await latest(child._id);
  if(!plan||plan.status!=='APPROVED'||idOf(plan.classroom)!==idOf(child.assignedClass)||plan.ageGroupCode!==child.ageGroupCode)return null;
  const [room,lesson,wordCount]=await Promise.all([M.ClassRoom.findById(plan.classroom).lean(),M.Lesson.exists({_id:plan.lesson,status:'ACTIVE',ageGroupCode:child.ageGroupCode}),M.Vocabulary.countDocuments({_id:{$in:plan.words.map(word=>word.vocabulary)},status:'ACTIVE'})]);
  if(!room||!['ACTIVE','UPCOMING'].includes(room.status)||idOf(room.teacher)!==idOf(plan.teacher)||!lesson||wordCount!==plan.words.length)return null;
  // The family gets the approved activity, not internal observation notes or future drafts.
  return {_id:plan._id,revision:plan.revision,lessonTitle:plan.lessonTitle,lessonId:plan.lesson,teacherNote:plan.teacherNote,words:plan.words.map(word=>({...word,_id:word.vocabulary})),homeActivity:plan.homeActivity,approvedAt:plan.createdAt};
}
module.exports={proposal,approve,familyCurrent,latest,safe,chooseWords,hash};
