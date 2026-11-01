const { VocabularyMastery, Vocabulary, Lesson, ActivityResult, LearningEvent, MasteryEvent, Progress, Assignment, ClassRoom, User } = require('../models');
const { vnDate, idOf } = require('./teacherRules');
async function reviewPlan(childId) {
  const { reviewDueAt, ages } = require('./earlyLearning');
  const child = await User.findById(childId).select('ageGroupCode');
  const maxWords = (ages[child?.ageGroupCode] || ages['3-4']).reviewWords;
  const mastery=await VocabularyMastery.find({student:childId}).populate({path:'vocabulary',match:{status:'ACTIVE'}}).lean();
  const items=mastery.filter(row=>row.vocabulary).sort((a,b)=>(a.masteryLevel-b.masteryLevel)||(b.wrongCount-a.wrongCount)||(new Date(a.lastReviewedAt)-new Date(b.lastReviewedAt))).slice(0,6).map(row=>({vocabulary:row.vocabulary,reason:row.wrongCount>0&&row.masteryLevel<3?'Ôn từ còn nhầm':'Nhắc lại từ đã học'}));
  if(items.length<2){
    const child=await User.findById(childId).select('ageGroupCode');
    const unit=await require('../models').CurriculumUnit.findOne({status:'ACTIVE',ageGroupCode:child.ageGroupCode}).sort({unitNumber:1});
    const first=await Lesson.findOne({status:'ACTIVE',ageGroupCode:child.ageGroupCode,...(unit?{curriculumUnits:unit._id}:{_id:null})}).sort({displayOrder:1,_id:1}).populate({path:'vocabularyItems',match:{status:'ACTIVE'}}).lean();
    for(const word of first?.vocabularyItems || []) if(!items.some(item=>idOf(item.vocabulary)===idOf(word)))items.push({vocabulary:word,reason:'Làm quen từ đầu lộ trình'});
  }
  const sorted = items.map(item => {
    const record=mastery.find(row=>idOf(row.vocabulary)===idOf(item.vocabulary));
    const dueAt=record?reviewDueAt(record):new Date(0);
    return {...item,dueAt,reason:record&&dueAt<=new Date()?'Đến lượt nhắc lại nhẹ nhàng':item.reason};
  }).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
  return {date:vnDate(),minutes:5,items:sorted.slice(0,maxWords),ageGroup:child?.ageGroupCode,basis:'Ưu tiên từ còn nhầm và từ đến lượt ôn; chỉ lấy một nhóm nhỏ phù hợp lứa tuổi. Bé có thể nghỉ bất cứ lúc nào.'};
}
async function weeklySummary(childId){
  const today=vnDate(),day=new Date(today+'T12:00:00Z').getUTCDay(),start=new Date(today+'T00:00:00+07:00');
  start.setUTCDate(start.getUTCDate()-(day===0?6:day-1));
  const [events,results,mastery,plan]=await Promise.all([
    LearningEvent.find({child:childId,createdAt:{$gte:start}}).populate('lesson','title').lean(),
    ActivityResult.find({child:childId,completed:true,createdAt:{$gte:start}}).lean(),
    MasteryEvent.find({child:childId,createdAt:{$gte:start}}).select('createdAt').lean(),reviewPlan(childId)
  ]);
  const practice=events.filter(e=>e.stage===2),answers=practice.flatMap(e=>e.answers||[]);
  return {from:start,to:new Date(),studyDays:new Set([...events,...results,...mastery].map(e=>vnDate(new Date(e.createdAt)))).size,
    completedLessons:[...new Map(events.filter(e=>e.lessonCompleted&&e.lesson).map(e=>[idOf(e.lesson),e.lesson])).values()],
    practiceResponses:answers.length,practiceAccuracy:answers.length?Math.round(100*answers.filter(a=>a.isCorrect).length/answers.length):null,
    activityAttempts:results.length,reviewWords:plan.items.slice(0,5),pronunciationScore:null};
}
async function teacherTasks(req){
  const rooms=await ClassRoom.find({ ...require('./teacherAccess').classScope(req), status: { $in: ['ACTIVE', 'UPCOMING'] } }).select('students').lean();
  const students=await User.find({_id:{$in:rooms.flatMap(room=>room.students)},role:'CHILD',status:'ACTIVE'}).select('name').lean();
  const assignments=await Assignment.find({classRoom:{$in:rooms.map(room=>room._id)},status:{$in:['ASSIGNED','IN_PROGRESS']},...(req.user.role==='ADMIN'?{}:{teacher:req.user._id})}).sort({createdAt:-1}).limit(50).lean();
  const tasks=[];
  for(const assignment of assignments){
    const own=students.filter(student=>assignment.recipients?.some(id=>idOf(id)===idOf(student)));
    const {data}=await require('./teacherAssignments').submissions(assignment,own);
    for(const row of data)if(row.hasSubmitted&&!assignment.reviews?.some(review=>idOf(review.child)===idOf(row.student)))tasks.push({kind:'REVIEW',label:'Nhận xét bài của '+row.student.name,to:'/teacher/assignments/'+assignment._id});
  }
  const models=require('../models');
  const [statistics,observations,plans]=await Promise.all([
    require('./teacherStatistics').statsFor(students.map(student=>student._id)),
    models.LearningObservation.find({child:{$in:students.map(student=>student._id)},classroom:{$in:rooms.map(room=>room._id)},voidedAt:null}).select('child lesson level updatedAt').sort({observedAt:-1,_id:-1}).lean(),
    models.HomePracticePlan.aggregate([{$match:{child:{$in:students.map(student=>student._id)}}},{$sort:{revision:-1}},{$group:{_id:'$child',plan:{$first:'$$ROOT'}}}])
  ]);
  const evidence = new Map(statistics.map(row=>[idOf(row._id),row]));
  for (const student of students) {
    const stats = evidence.get(idOf(student));
    const observation=observations.find(row=>idOf(row.child)===idOf(student));
    const plan=plans.find(row=>idOf(row._id)===idOf(student))?.plan;
    if(!observation)tasks.push({kind:'OBSERVE',label:student.name+': chưa có ghi nhận quan sát của cô',to:'/teacher/students/'+student._id});
    if(stats?.hasAssessment&&stats.averageScore<60)tasks.push({kind:'SUPPORT',label:student.name+': còn nhầm trong các câu đã ghi nhận',to:'/teacher/students/'+student._id});
    if(!plan||observation&&new Date(observation.updatedAt)>new Date(plan.createdAt))tasks.push({kind:'PLAN',label:student.name+(plan?': có quan sát mới để xem lại bài ôn':': chuẩn bị bài ôn để cô duyệt'),to:'/teacher/home-practice?studentId='+student._id+(observation?'&lessonId='+observation.lesson:'')});
  }
  return tasks;
}
module.exports={reviewPlan,weeklySummary,teacherTasks};
