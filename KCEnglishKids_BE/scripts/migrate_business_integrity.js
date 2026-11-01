// Explicit, resumable migration. Default is a read-only preview.
const fs=require('node:fs'),path=require('node:path');
const mongoose=require('mongoose');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
mongoose.set('autoCreate',false);mongoose.set('autoIndex',false);
const M=require('../src/models');
async function main(){
 if(!process.env.MONGODB_URI)throw Error('MONGODB_URI required.');
 await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false});
 const assignments=await M.Assignment.find({}).lean();const planned=[];
 for(const item of assignments){
  const update={};
  if(!item.activity&&item.completionMode!=='LESSON')update.completionMode='LESSON';
  if(!item.contentSnapshot){
   const ids=item.activitySnapshot || (item.activity?[item.activity]:null);
   const snapshot=await M.Activity.find({lesson:item.lesson,...(ids?{_id:{$in:ids}}:{})}).lean();
   if(ids&&new Set(ids.map(String)).size!==snapshot.length)throw Error('An assigned activity is missing. Repair references before migration.');
   update.contentSnapshot=snapshot;
   if(!item.activitySnapshot)update.activitySnapshot=snapshot.map(a=>a._id);
  }
  if(Object.keys(update).length)planned.push({id:item._id,before:item,update});
 }
 const duplicateSessions=await M.LearningSession.aggregate([{$match:{status:'IN_PROGRESS'}},{$sort:{lastActivityAt:-1,_id:-1}},{$group:{_id:{child:'$child',lesson:'$lesson'},ids:{$push:'$_id'}}},{$match:{'ids.1':{$exists:true}}}]);
 console.log(JSON.stringify({database:mongoose.connection.name,assignments:assignments.length,updates:planned.length,duplicateOpenSessions:duplicateSessions.length,apply:process.argv.includes('--apply')}));
 if(!process.argv.includes('--apply'))return;
 const folder=path.resolve(__dirname,'../../.local-backups/business-integrity-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});const {EJSON}=mongoose.mongo.BSON;
 const backup={};for(const model of Object.values({...M,ClassRecognition:require('../src/models/ClassRecognition')}))backup[model.collection.name]=await model.collection.find({}).toArray();
 fs.writeFileSync(path.join(folder,'before.ejson'),EJSON.stringify(backup,null,2,{relaxed:false}));
 fs.writeFileSync(path.join(folder,'assignment-journal.ejson'),EJSON.stringify(planned,null,2,{relaxed:false}));
 fs.writeFileSync(path.join(folder,'session-journal.ejson'),EJSON.stringify(duplicateSessions,null,2,{relaxed:false}));
 for(const item of planned){
  const filter={_id:item.id,updatedAt:item.before.updatedAt,__v:item.before.__v??0};
  const result=await M.Assignment.updateOne(filter,{$set:item.update,$inc:{__v:1}});
  if(result.matchedCount!==1)throw Error('An assignment changed during migration. Rerun preview; before-images are preserved.');
 }
 for(const group of duplicateSessions)await M.LearningSession.updateMany({_id:{$in:group.ids.slice(1)},status:'IN_PROGRESS'},{$set:{status:'ABANDONED'}});
 for(const model of [M.LearningEvent,M.MasteryEvent,M.ActivityResult,M.LearningSession])await model.createIndexes();
 console.log('Migration complete. Before-images saved in the ignored local backup directory.');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
