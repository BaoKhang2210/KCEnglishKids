const M=require('../models');
const access=require('../services/teacherAccess');
const practice=require('../services/homePractice');
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(error){next(error);}};
async function scope(req){const child=await access.child(req,req.params.studentId);const room=await access.classroom(req,child.assignedClass);return{child,room};}
exports.proposal=wrap(async(req,res)=>{const {child,room}=await scope(req);res.json({success:true,data:await practice.proposal(child,room,req.query.lessonId)});});
exports.history=wrap(async(req,res)=>{const {child}=await scope(req);const items=await M.HomePracticePlan.find({child:child._id}).sort({revision:-1}).limit(20).lean();res.json({success:true,data:{items:items.map(practice.safe)}});});
exports.approve=wrap(async(req,res)=>{const {child,room}=await scope(req);res.status(201).json({success:true,data:await practice.approve(req,child,room,req.body||{})});});
exports.revoke=wrap(async(req,res)=>{const {child,room}=await scope(req);res.status(201).json({success:true,data:await practice.approve(req,child,room,req.body||{},true)});});
exports.family=wrap(async(req,res)=>{const child=await M.User.findById(req.params.childId);res.json({success:true,data:{plan:child?await practice.familyCurrent(child):null}});});
