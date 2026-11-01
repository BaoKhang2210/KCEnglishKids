const crypto = require('node:crypto');
const M = require('../models');
const access = require('../services/teacherAccess');
const { fail, validId, text, idOf } = require('../services/teacherRules');
const { lessonGuide, observationSummary } = require('../services/earlyLearning');
const wrap = fn => async (req,res,next) => { try { await fn(req,res); } catch(error) { next(error); } };
const levels = ['INDEPENDENT', 'SUPPORTED', 'EMERGING'];
function readMedia(input) {
  if (!input) return undefined;
  const allowed = ['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/wav'];
  if (!allowed.includes(input.mimeType) || typeof input.base64 !== 'string' || input.base64.length > 2800000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64)) fail('Minh chứng hỗ trợ ảnh PNG/JPEG/WebP hoặc audio WebM/OGG/WAV, tối đa 2 MB.');
  const data = Buffer.from(input.base64, 'base64');
  if (!data.length || data.length > 2 * 1024 * 1024) fail('Tệp minh chứng vượt giới hạn.');
  const valid = input.mimeType === 'image/jpeg' ? data[0] === 255 && data[1] === 216 && data[2] === 255
    : input.mimeType === 'image/png' ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : input.mimeType.endsWith('webm') ? data.subarray(0,4).equals(Buffer.from([26,69,223,163]))
    : input.mimeType.endsWith('ogg') ? data.subarray(0,4).toString() === 'OggS'
    : data.subarray(0,4).toString() === 'RIFF' && data.subarray(8,12).toString() === (input.mimeType.endsWith('webp') ? 'WEBP' : 'WAVE');
  if (!valid) fail('Nội dung tệp không khớp định dạng.');
  return { mimeType: input.mimeType, bytes: data.length, data };
}
exports.guide = wrap(async (req,res) => {
  if (!validId(req.params.id)) fail('Mã bài học không hợp lệ.');
  const child=req.params.childId?await M.User.findById(req.params.childId).select('ageGroupCode'):null;
  if(req.params.childId&&!child)fail('Không tìm thấy học sinh.',404);
  const lesson = await M.Lesson.findOne({_id:req.params.id,...(child?{ageGroupCode:child.ageGroupCode,status:'ACTIVE'}:{})}).populate('vocabularyItems').lean();
  if (!lesson) fail('Không tìm thấy bài học.',404);
  res.json({success:true,data:lessonGuide(lesson,lesson.ageGroupCode)});
});
exports.list = wrap(async (req,res) => {
  const child = await access.child(req,req.params.studentId);
  const rows = await M.LearningObservation.find({child:child._id,voidedAt:null}).populate('lesson','title vietnameseTitle curriculumUnits').populate('teacher','name').sort({observedAt:-1}).limit(200).lean();
  res.json({success:true,data:{items:rows,summary:observationSummary(rows)}});
});
exports.create = wrap(async (req,res) => {
  const child = await access.child(req,req.params.studentId);
  const room = await access.classroom(req,child.assignedClass);
  if (!['ACTIVE','UPCOMING'].includes(room.status)) fail('Chỉ ghi nhận cho lớp hiện tại.');
  const body=req.body||{};
  if (!validId(body.lessonId)) fail('Chọn bài học để gắn minh chứng.');
  const lesson=await M.Lesson.findOne({_id:body.lessonId,ageGroupCode:child.ageGroupCode,status:{$in:['ACTIVE','INACTIVE']}}).populate('vocabularyItems').lean();
  if (!lesson || !lessonGuide(lesson,child.ageGroupCode).goals.some(goal=>goal.key===body.skill) || !levels.includes(body.level)) fail('Bài học, mục tiêu hoặc mức hỗ trợ không hợp lệ.');
  if (typeof body.operationId!=='string'||!/^[a-zA-Z0-9_-]{8,120}$/.test(body.operationId)) fail('Thiếu mã ghi nhận để tránh lưu lặp.');
  const evidence=text(body.evidence,1000);
  const vocabulary=body.vocabulary||[];
  if(!Array.isArray(vocabulary)||vocabulary.length>20||new Set(vocabulary).size!==vocabulary.length||vocabulary.some(id=>!validId(id)||!lesson.vocabularyItems.some(word=>idOf(word)===id&&word.status==='ACTIVE')))fail('Từ được quan sát phải thuộc bài và đang hoạt động.');
  if(evidence.length<5)fail('Mô tả cụ thể điều bé đã làm, ít nhất 5 ký tự.');
  if(body.sessionId){
    if(!validId(body.sessionId)||!await M.ClassroomSession.exists({_id:body.sessionId,classroom:room._id,lesson:lesson._id,status:{$in:['LIVE','COMPLETED']},studentScores:{$elemMatch:{student:child._id,attendance:{$in:['PRESENT','LATE']}}}}))fail('Buổi học không khớp hoặc bé chưa được ghi nhận có mặt để quan sát trong buổi.');
  }
  const media=readMedia(body.media);
  if(media&&body.familyConsent!==true)fail('Xác nhận quyền chia sẻ minh chứng với gia đình.');
  const payload={child:child._id,classroom:room._id,teacher:req.user._id,lesson:lesson._id,session:body.sessionId||null,skill:body.skill,level:body.level,evidence,nextStep:text(body.nextStep,500),vocabulary,media,consentConfirmed:Boolean(media)};
  if(body.unitId){
    if(!validId(body.unitId)||!lesson.curriculumUnits?.some(unit=>idOf(unit)===body.unitId))fail('Bài học không thuộc Unit được quan sát.');
    const unit=await M.CurriculumUnit.findById(body.unitId).lean();
    if(!unit)fail('Không tìm thấy Unit.');
    payload.unitKey=String(unit._id);payload.unitLabel=`Sách ${unit.bookNumber} · Unit ${unit.unitNumber}`;
  }
  const payloadHash=crypto.createHash('sha256').update(JSON.stringify({...payload,media:media?{mimeType:media.mimeType,hash:crypto.createHash('sha256').update(media.data).digest('hex')}:null})).digest('hex');
  let item;
  try {item=await M.LearningObservation.findOneAndUpdate({teacher:req.user._id,operationId:body.operationId},{$setOnInsert:{...payload,payloadHash,operationId:body.operationId}},{upsert:true,returnDocument:'after',runValidators:true}).select('+payloadHash');}
  catch(error){if(error.code!==11000)throw error;item=await M.LearningObservation.findOne({teacher:req.user._id,operationId:body.operationId}).select('+payloadHash');}
  if(item.payloadHash!==payloadHash)fail('Mã ghi nhận đã được dùng cho nội dung khác.',409);
  if(item.voidedAt)fail('Minh chứng này đã được gỡ. Hãy tạo ghi nhận mới.',409);
  const safe=item.toObject();delete safe.payloadHash;if(safe.media)delete safe.media.data;
  res.status(201).json({success:true,data:safe});
});
async function authorizedItem(req, childId, withMedia=false) {
  if(!validId(req.params.id))fail('Mã minh chứng không hợp lệ.');
  const query=M.LearningObservation.findOne({_id:req.params.id,voidedAt:null,...(childId?{child:childId}:{})});
  const item=await(withMedia?query.select('+media.data'):query);
  if(!item)fail('Không tìm thấy minh chứng.',404);
  if(!childId)await access.child(req,item.child);
  return item;
}
exports.media = wrap(async(req,res)=>{
  const childId=req.params.childId;
  const item=await authorizedItem(req,childId,true);
  if(!item.media?.data)fail('Không có tệp minh chứng.',404);
  res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).type(item.media.mimeType).send(item.media.data);
});
exports.remove = wrap(async(req,res)=>{
  const item=await authorizedItem(req);
  if(req.user.role!=='ADMIN'&&idOf(item.teacher)!==idOf(req.user._id))fail('Chỉ người ghi nhận được gỡ minh chứng.',403);
  item.voidedAt=new Date();await item.save();res.json({success:true});
});
exports.familyList = wrap(async(req,res)=>{
  const rows=await M.LearningObservation.find({child:req.params.childId,voidedAt:null}).populate('lesson','title vietnameseTitle').populate('teacher','name').sort({observedAt:-1}).limit(100).lean();
  res.json({success:true,data:{items:rows,summary:observationSummary(rows)}});
});
exports.unitReview = wrap(async(req,res)=>{
  const room=await access.classroom(req,req.params.id);
  if(!validId(req.query.unitId))fail('Chọn Unit để quan sát.');
  const unit=await M.CurriculumUnit.findOne({_id:req.query.unitId,ageGroupCode:room.ageGroupCode,status:'ACTIVE'}).lean();
  if(!unit)fail('Unit không phù hợp lớp.',404);
  const [children,lessons,observations]=await Promise.all([
    M.User.find({_id:{$in:room.students},role:'CHILD',status:'ACTIVE'}).select('name avatarUrl').sort({name:1}).lean(),
    M.Lesson.find({curriculumUnits:unit._id,status:'ACTIVE'}).select('title vietnameseTitle displayOrder').sort({displayOrder:1}).lean(),
    M.LearningObservation.find({classroom:room._id,unitKey:String(unit._id),child:{$in:room.students},voidedAt:null}).sort({observedAt:-1}).lean()
  ]);
  const roster=children.map(child=>{const own=observations.filter(row=>idOf(row.child)===idOf(child));const latest={};for(const row of own)if(!latest[row.skill])latest[row.skill]={level:row.level,evidence:row.evidence,observedAt:row.observedAt};return{child,latest};});
  res.json({success:true,data:{classroom:{_id:room._id,name:room.name},unit,lessons,roster,basis:'Quan sát của giáo viên trong chơi và tình huống quen thuộc; không tự chuyển sao thành năng lực.'}});
});
exports.readMedia = readMedia;
