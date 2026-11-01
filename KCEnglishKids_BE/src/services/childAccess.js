const { User, Lesson, Progress } = require('../models');
const fail = (message, statusCode = 403) => { throw Object.assign(new Error(message), { statusCode }); };
async function assertChildAccess(req, childId, write = false) {
  if (!req.user) fail('Authorization required.', 401);
  if (req.user.role === 'CHILD') {
    if (String(req.user._id) !== String(childId)) fail('Access denied.');
    return req.user;
  }
  if (write || !['TEACHER', 'ADMIN'].includes(req.user.role)) fail('Only the child may submit learning evidence.');
  return require('./teacherAccess').child(req, childId);
}
async function privateChildQuery(req) {
  if (req.user?.role === 'CHILD') return req.user._id;
  if (!req.query.childId) return undefined;
  await assertChildAccess(req, req.query.childId);
  return req.query.childId;
}
async function activeLesson(childId, lessonId) {
  const child = await User.findOne({ _id: childId, role: 'CHILD', status: 'ACTIVE' });
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'ACTIVE' });
  if (!child || !lesson) fail('Active child or lesson not found.', 404);
  if (child.ageGroupCode !== lesson.ageGroupCode) fail('Lesson is outside your age group.');
  if(!await require('../models').Topic.exists({_id:lesson.topic,status:'ACTIVE'}))fail('Lesson topic is not active.',404);
  const units = await require('../models').CurriculumUnit.find({ _id: { $in: lesson.curriculumUnits || [] } }).lean();
  const currentUnit = units.sort((a,b)=>a.unitNumber-b.unitNumber)[0];
  if(!currentUnit || units.some(unit=>unit.status!=='ACTIVE')) fail('Lesson unit is not active.',404);
  const earlierUnits = currentUnit ? await require('../models').CurriculumUnit.find({ ageGroupCode: child.ageGroupCode, status:'ACTIVE', unitNumber:{$lt:currentUnit.unitNumber} }).select('_id').lean() : [];
  const preceding = await Lesson.find({ status: 'ACTIVE', ageGroupCode: child.ageGroupCode, $or: [
    { curriculumUnits: { $in: lesson.curriculumUnits || [] }, displayOrder: { $lt: lesson.displayOrder } },
    { curriculumUnits: { $in: earlierUnits.map(unit=>unit._id) } }
  ] }).select('_id').lean();
  const assigned = child.assignedClass && await require('../models').Assignment.exists({lesson:lessonId,classRoom:child.assignedClass,status:{$in:['ASSIGNED','IN_PROGRESS']},$and:[{$or:[{student:childId},{assignedToType:'CLASS'}]},{$or:[{recipients:{$exists:false}},{recipients:childId}]},{$or:[{startDate:null},{startDate:{$lte:new Date()}}]}]});
  if (!assigned && preceding.length && await Progress.countDocuments({ child: childId, lesson: { $in: preceding.map(x => x._id) }, completed: true }) !== preceding.length) fail('Complete earlier lessons first.', 409);
  return lesson;
}
module.exports = { assertChildAccess, privateChildQuery, activeLesson, fail };
