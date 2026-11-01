const M=require('../models');
const {fail,validId}=require('../services/teacherRules');
const {lessonGuide}=require('../services/earlyLearning');
const {profile}=require('../services/teachingProfile');
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(error){next(error);}};
async function lesson(id){if(!validId(id))fail('Mã bài không hợp lệ.');const value=await M.Lesson.findById(id).populate('vocabularyItems').lean();if(!value)fail('Không tìm thấy bài.',404);return value;}
exports.get=wrap(async(req,res)=>{const item=await lesson(req.params.id);res.json({success:true,data:{lesson:item,guide:lessonGuide(item,item.ageGroupCode),revision:item.pedagogyRevision||0}});});
exports.save=wrap(async(req,res)=>{
  const item=await lesson(req.params.id),body=req.body||{};
  if(!Number.isInteger(body.expectedRevision)||body.expectedRevision!==(item.pedagogyRevision||0))fail('Mục tiêu đã được cập nhật. Tải lại trước khi lưu.',409);
  const value=profile(body.profile,item);
  const saved=await M.Lesson.findOneAndUpdate({_id:item._id,$expr:{$eq:[{$ifNull:['$pedagogyRevision',0]},body.expectedRevision]}},{$set:{teachingProfile:value},$inc:{pedagogyRevision:1}},{new:true,runValidators:true}).populate('vocabularyItems');
  if(!saved)fail('Mục tiêu vừa được người khác cập nhật. Tải lại trước khi lưu.',409);
  await require('../services/adminIntegrity').audit(req,'UPDATE_TEACHING_PROFILE','Lesson',item._id,{revision:saved.pedagogyRevision});
  res.json({success:true,data:{lesson:saved,guide:lessonGuide(saved,saved.ageGroupCode),revision:saved.pedagogyRevision}});
});
