// End-to-end API acceptance against a newly created, isolated database. No application data is changed.
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
const mongoose=require('mongoose'),jwt=require('jsonwebtoken'),assert=require('node:assert/strict');
const expected='kc_early_learning_test_'+Date.now()+'_'+crypto.randomBytes(3).toString('hex');
async function main(){
 let server;const checks=[];
 await mongoose.connect(process.env.MONGODB_URI,{dbName:expected,autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:10000});
 if(mongoose.connection.db.databaseName!==expected||!/^kc_early_learning_test_\d+_[a-f0-9]{6}$/.test(expected))throw Error('Isolated database check failed');
 try{
  const M={...require('../src/models'),ClassRecognition:require('../src/models/ClassRecognition')};
  for(const model of Object.values(M)){await model.createCollection();await model.createIndexes();}
  const ids=Object.fromEntries(['teacher','otherTeacher','admin','child','otherChild','room','lesson','unit','book','topic','age','word1','word2','session1','session2'].map(key=>[key,new mongoose.Types.ObjectId()]));
  const raw=async(name,docs)=>M[name].collection.insertMany(docs);
  await raw('User',[['teacher','TEACHER'],['otherTeacher','TEACHER'],['admin','ADMIN'],['child','CHILD'],['otherChild','CHILD']].map(([key,role])=>({_id:ids[key],name:'Fixture '+key,role,status:'ACTIVE',ageGroupCode:'3-4',authVersion:0,...(key==='child'?{assignedClass:ids.room}:{})})));
  await raw('ClassRoom',[{_id:ids.room,name:'Fixture classroom',normalizedName:'fixture classroom',status:'ACTIVE',ageGroupCode:'3-4',teacher:ids.teacher,students:[ids.child],completedLessons:[]}]);
  await raw('AgeGroup',[{_id:ids.age,code:'3-4',name:'Fixture age'}]);
  await raw('CurriculumBook',[{_id:ids.book,bookNumber:1,title:'Fixture book',ageGroup:ids.age,ageGroupCode:'3-4',active:true}]);
  await raw('CurriculumUnit',[{_id:ids.unit,book:ids.book,bookNumber:1,unitNumber:1,bigQuestion:'Fixture Unit',ageGroupCode:'3-4',status:'ACTIVE'}]);
  await raw('Topic',[{_id:ids.topic,englishName:'Animals',vietnameseName:'Động vật',slug:'fixture-animals',status:'ACTIVE'}]);
  await raw('Vocabulary',[{_id:ids.word1,english:'cat',vietnamese:'con mèo',status:'ACTIVE',wordType:'noun',imageUrl:'/images/vocabulary/cat-v1.svg'},{_id:ids.word2,english:'dog',vietnamese:'con chó',status:'ACTIVE',wordType:'noun',imageUrl:'/images/vocabulary/dog-v1.svg'}]);
  await raw('Lesson',[{_id:ids.lesson,title:'Fixture animals',ageGroup:ids.age,ageGroupCode:'3-4',topic:ids.topic,curriculumUnits:[ids.unit],vocabularyItems:[ids.word1,ids.word2],status:'ACTIVE',displayOrder:1}]);
  const app=require('../src/app');server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/api';
  const request=async(role,method,url,body)=>{const token=jwt.sign({id:String(ids[role]),authVersion:0},require('../src/config/auth').jwtSecret(),{expiresIn:'5m'});const res=await fetch(base+url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return res;};
  const lessonId=String(ids.lesson),childId=String(ids.child),roomId=String(ids.room);
  const guideResponse=await request('teacher','GET',`/teacher/pedagogy/lessons/${lessonId}/guide`);assert.equal(guideResponse.status,200);const guide=(await guideResponse.json()).data;assert.equal(guide.choices,2);assert.equal(guide.goals.length,3);checks.push('Age-specific teaching guide reads actual lesson vocabulary');
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9KkAAAAASUVORK5CYII=';
  const body={lessonId,unitId:String(ids.unit),skill:'LISTEN_POINT',level:'SUPPORTED',evidence:'Bé chỉ đúng tranh sau khi cô gợi ý.',nextStep:'Chơi lại với hai tranh và đổi vị trí.',operationId:'e2e-observation-stable',familyConsent:true,media:{mimeType:'image/png',base64:png}};
  assert.equal((await request('child','POST',`/teacher/students/${childId}/observations`,body)).status,403);
  assert.equal((await request('otherTeacher','POST',`/teacher/students/${childId}/observations`,body)).status,403);checks.push('Child and unrelated teacher cannot create observations');
  const saved=await request('teacher','POST',`/teacher/students/${childId}/observations`,body);assert.equal(saved.status,201);const observation=(await saved.json()).data;assert.equal(observation.media.data,undefined);assert.equal(observation.payloadHash,undefined);
  assert.equal((await request('teacher','POST',`/teacher/students/${childId}/observations`,body)).status,201);assert.equal(await M.LearningObservation.countDocuments(),1);
  assert.equal((await request('teacher','POST',`/teacher/students/${childId}/observations`,{...body,evidence:'Khác dữ liệu của lần trước.'})).status,409);checks.push('Real BSON observation and image persist once; retries and conflicting reuse are enforced');
  const family=await request('child','GET',`/children/${childId}/observations`);assert.equal(family.status,200);const listing=await family.json();assert.equal(listing.data.items.length,1);assert.equal(listing.data.items[0].media.data,undefined);
  const media=await request('child','GET',`/children/${childId}/observations/${observation._id}/media`);assert.equal(media.status,200);assert.deepEqual(Buffer.from(await media.arrayBuffer()),Buffer.from(png,'base64'));assert.match(media.headers.get('cache-control'),/no-store/);
  assert.equal((await request('otherChild','GET',`/children/${childId}/observations/${observation._id}/media`)).status,403);checks.push('Family sees its own evidence; private image requires authorization and cannot leak to another child');
  const unit=await request('teacher','GET',`/teacher/classes/${roomId}/unit-review?unitId=${ids.unit}`);assert.equal(unit.status,200);assert.equal((await unit.json()).data.roster[0].latest.LISTEN_POINT.level,'SUPPORTED');checks.push('End-of-Unit board derives support level from actual teacher observations');
  const makeSession=key=>({_id:ids[key],classroom:ids.room,teacher:ids.teacher,lesson:ids.lesson,title:'Fixture lesson session',ageGroup:'3-4',status:'LIVE',plannedDuration:25,startedAt:new Date(),activities:[],questionResults:[],studentScores:[{student:ids.child,attendance:'PRESENT',stars:1,points:0,correctCount:0,incorrectCount:0,notAnswered:0,status:'ACTIVE'}],teachingGoals:guide.goals,__v:0});
  await raw('ClassroomSession',[makeSession('session1')]);
  assert.equal((await request('teacher','POST',`/teacher/classroom-sessions/${ids.session1}/end`,{coverage:'CONTINUE',goalsCovered:['LISTEN_POINT']})).status,200);assert.equal((await M.ClassRoom.findById(ids.room)).completedLessons.length,0);checks.push('Ending a partial lesson preserves curriculum position');
  await raw('ClassroomSession',[makeSession('session2')]);
  assert.equal((await request('teacher','POST',`/teacher/classroom-sessions/${ids.session2}/end`,{coverage:'COMPLETE',goalsCovered:['LISTEN_POINT']})).status,400);
  const complete={coverage:'COMPLETE',goalsCovered:guide.goals.map(goal=>goal.key)};
  assert.equal((await request('teacher','POST',`/teacher/classroom-sessions/${ids.session2}/end`,complete)).status,200);
  assert.equal((await request('teacher','POST',`/teacher/classroom-sessions/${ids.session2}/end`,complete)).status,200);assert.equal((await M.ClassRoom.findById(ids.room)).completedLessons.length,1);checks.push('Complete requires all taught goals; ending retries advance curriculum only once');
  const backup=await request('admin','GET','/admin/system/backup');assert.equal(backup.status,200);const exported=mongoose.mongo.BSON.EJSON.parse(await backup.text(),{relaxed:false});assert.equal(exported.version,'3.4.0');assert.equal(exported.collections.learningobservations.length,1);assert.ok(require('./restore_system_backup').validateBackup(exported).has('learningobservations'));checks.push('Full backup 3.3 includes private evidence in BSON Extended JSON and passes restore preflight');
  assert.equal((await request('otherTeacher','DELETE',`/teacher/observations/${observation._id}`)).status,403);
  assert.equal((await request('child','DELETE',`/teacher/observations/${observation._id}`)).status,403);
  assert.equal((await request('teacher','DELETE',`/teacher/observations/${observation._id}`)).status,200);
  assert.equal((await(await request('child','GET',`/children/${childId}/observations`)).json()).data.items.length,0);
  assert.equal((await(await request('teacher','GET',`/teacher/classes/${roomId}/unit-review?unitId=${ids.unit}`)).json()).data.roster[0].latest.LISTEN_POINT,undefined);
  assert.equal((await request('child','GET',`/children/${childId}/observations/${observation._id}/media`)).status,404);
  assert.equal((await request('teacher','POST',`/teacher/students/${childId}/observations`,body)).status,409);
  assert.ok((await M.LearningObservation.findById(observation._id)).voidedAt);checks.push('Only the author or admin can void evidence; family, media, and Unit board omit it and retries cannot resurrect it');
  const report={checkedAt:new Date(),isolatedDatabase:true,applicationDatabaseChanged:false,checks:checks.map(check=>({check,passed:true}))};fs.writeFileSync(path.resolve(__dirname,'../../docs/early-learning-api-acceptance-2026-11-01.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(mongoose.connection.db.databaseName!==expected||!/^kc_early_learning_test_\d+_[a-f0-9]{6}$/.test(expected))throw Error('Refusing to drop unexpected database');await mongoose.connection.db.dropDatabase();await mongoose.disconnect();}
}
main().catch(error=>{console.error('Isolated early learning acceptance failed ('+error.name+'). '+(error.code?'code '+error.code:''));process.exitCode=1;});
