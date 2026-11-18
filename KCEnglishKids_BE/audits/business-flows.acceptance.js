// Real MongoDB + HTTP acceptance tests in a unique, isolated database.
// Reads the configured connection only to connect with an explicit QA dbName.
require('dotenv').config({quiet:true});
const test=require('node:test'),assert=require('node:assert/strict'),mongoose=require('mongoose');
const crypto=require('node:crypto');
const M=require('../src/models');
const jwt=require('jsonwebtoken');
const app=require('../src/app');
const {jwtSecret}=require('../src/config/auth');
const {availableGames}=require('../src/services/gameRules');
const dbName='kcenglishkids_qa_business_'+Date.now();
const outcomes=[];
function scenario(name,run){test(name,async()=>{const started=Date.now();try{await run();outcomes.push({name,status:'passed',durationMs:Date.now()-started});}catch(error){outcomes.push({name,status:'failed',error:error.message.split('\n')[0]});throw error;}});}
const f={plans:{}};let server,base;
const id=()=>new mongoose.Types.ObjectId();
const op=()=>crypto.randomUUID();
const token=user=>jwt.sign({id:String(user._id),authVersion:user.authVersion||0},jwtSecret());
async function request(path, user, method='GET',body) {
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+(typeof user==='string'?user:token(user))}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json()};
}
async function stage(lesson,body){
 const plan=f.plans[String(lesson._id)];
 let payload={submissionId:op(),...body};
 if(plan&&body.stage===2)payload.attemptToken=plan.stage2Token;
 if(plan&&body.stage===3&&body.gameId){const game=plan.games.find(g=>g.id===body.gameId);payload.attemptToken=game?.attemptToken;payload.answers=game?.targetOrder.map(wordId=>({wordId,selectedId:wordId}));}
 const response=await request(`/api/children/${f.a._id}/progress/${lesson._id}/stage`,f.a,'PUT',payload);
 if(body.stage===1&&response.status===200)f.plans[String(lesson._id)]=(await request(`/api/children/${f.a._id}/progress/${lesson._id}/plan`,f.a)).data.data;
 return response;
}
const practice=()=>[1,2,3].flatMap(round=>f.words.map((w,i)=>({wordId:String(w._id),round,selectedId:i===2?null:String(w._id)})));
function gameAnswers(game){return Array.from({length:game.targetCountByAge['3-4']},(_,i)=>({wordId:String(f.words[i%3]._id),selectedId:String(f.words[i%3]._id)}));}
test.before(async()=>{
 if(!process.env.MONGODB_URI)throw Error('Configured connection required.');
 await mongoose.connect(process.env.MONGODB_URI,{dbName,serverSelectionTimeoutMS:8000});
 assert.equal(mongoose.connection.name,dbName);
 assert.match(dbName,/^kcenglishkids_qa_business_\d+$/);
 await Promise.all(Object.values(M).filter(model=>model?.init).map(model=>model.init()));
 const age=id(),book=id(),unit=id(),topic=id();
 await M.AgeGroup.collection.insertOne({_id:age,code:'3-4',name:'QA',status:'ACTIVE'});
 await M.CurriculumBook.collection.insertOne({_id:book,bookNumber:1,ageGroup:age,ageGroupCode:'3-4',status:'ACTIVE'});
 f.unit=await M.CurriculumUnit.create({_id:unit,book,bookNumber:1,ageGroup:age,ageGroupCode:'3-4',unitNumber:1,bigQuestion:'QA',status:'ACTIVE'});
 await M.Topic.create({_id:topic,englishName:'QA Animals',vietnameseName:'QA',slug:'qa',status:'ACTIVE'});
 f.words=await M.Vocabulary.create(['cat','dog','bird'].map(english=>({english,vietnamese:english,wordType:'noun',imageUrl:'/images/qa.svg',isTransparent:true,ageGroupCodes:['3-4'],status:'ACTIVE'})));
 f.lessons=await M.Lesson.create([1,2].map(displayOrder=>({title:'QA '+displayOrder,key:'QA_L'+displayOrder,displayOrder,topic,ageGroup:age,ageGroupCode:'3-4',curriculumUnits:[unit],vocabularyItems:f.words.map(w=>w._id),status:'ACTIVE'})));
 f.activity=await M.Activity.create({title:'QA quiz',lesson:f.lessons[0]._id,activityType:'LISTEN_CHOOSE',ageGroup:age,ageGroupCode:'3-4',pointsPerQuestion:10,questions:[{promptText:'Cat',correctAnswer:'cat',vocabulary:f.words[0]._id,options:[{id:'cat',text:'cat',isCorrect:true},{id:'dog',text:'dog',isCorrect:false}]}],status:'ACTIVE'});
 [f.a,f.c,f.ta,f.tb,f.admin]=await M.User.create([
  {role:'CHILD',name:'QA A',ageGroupCode:'3-4',pin:'4826',password:'QApassword!42'},
  {role:'CHILD',name:'QA C',ageGroupCode:'3-4',pin:'6318',password:'QApassword!42'},
  {role:'TEACHER',name:'QA TA'}, {role:'TEACHER',name:'QA TB'}, {role:'ADMIN',name:'QA Admin'}
 ]);
 f.room=await M.ClassRoom.create({name:'QA A',teacher:f.ta._id,students:[f.a._id],ageGroupCode:'3-4',status:'ACTIVE',completedLessons:[f.lessons[0]._id]});
 await M.ClassRoom.create({name:'QA B',teacher:f.tb._id,students:[f.c._id],ageGroupCode:'3-4',status:'ACTIVE'});
 await M.User.updateOne({_id:f.a._id},{$set:{assignedClass:f.room._id}});f.a.assignedClass=f.room._id;
 f.session=await M.LearningSession.create({child:f.a._id,lesson:f.lessons[0]._id});
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;
});
test.after(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 // Only the exact new QA database from this run may be removed.
 if(mongoose.connection.readyState===1&&mongoose.connection.name===dbName&&/^kcenglishkids_qa_business_\d+$/.test(dbName))await mongoose.connection.dropDatabase();
 await mongoose.disconnect();
 require('node:fs').writeFileSync(require('node:path').resolve(__dirname,'../../docs/business-fixes-validation-2026-10-28.json'),JSON.stringify({checkedAt:new Date().toISOString(),method:'Real MongoDB and localhost HTTP in isolated temporary QA databases; databases removed after test.',scenarios:outcomes.length,passed:outcomes.filter(item=>item.status==='passed').length,failed:outcomes.filter(item=>item.status==='failed').length,outcomes},null,2)+'\n');
});
scenario('private learning sessions and all alternative child paths enforce identity/class scope',async()=>{
 assert.equal((await request('/api/learning/sessions/'+f.session._id)).status,401);
 assert.equal((await request('/api/learning/sessions/'+f.session._id,f.c)).status,403);
 assert.equal((await request('/api/learning/sessions/'+f.session._id,f.tb)).status,403);
 assert.equal((await request('/api/learning/sessions/'+f.session._id,f.ta)).status,200);
 for(const route of ['progress','assignments','schedule','streak','parent-notifications','rewards'])assert.equal((await request(`/api/children/${f.a._id}/${route}`,f.tb)).status,403,route);
 for(const route of [`/api/lessons/${f.lessons[0]._id}`, '/api/lessons/curriculum-path','/api/topics/qa/lessons'])assert.equal((await request(route+'?childId='+f.a._id)).status,401,route);
 assert.equal((await request('/api/auth/children-avatars')).status,401);
 assert.equal((await request('/api/auth/lookup-student',null,'POST',{phone:'000'})).status,401);
});
scenario('stage skipping, invalid evidence, wrong age and locked lessons do not write progress',async()=>{
 assert.equal((await stage(f.lessons[0],{stage:3,score:100,stars:3})).status,409);
 assert.equal((await stage(f.lessons[0],{stage:1,visitedWordIds:[]})).status,400);
 assert.equal((await stage(f.lessons[1],{stage:1,visitedWordIds:f.words.map(w=>String(w._id))})).status,409);
 assert.equal(await M.Progress.countDocuments({}),0);
});
scenario('teacher assigns a previously taught Lesson before home learning starts',async()=>{
 const r=await request('/api/teacher/assignments',f.ta,'POST',{classRoomId:String(f.room._id),lessonId:String(f.lessons[0]._id),assignedToType:'CLASS'});
 assert.equal(r.status,201,JSON.stringify(r.data));f.assignment=r.data.data;
 assert.equal(f.assignment.completionMode,'LESSON');assert.equal(f.assignment.contentSnapshot.length,1);
 assert.equal((await request(`/api/children/${f.a._id}/assignments`,f.a)).data.data[0].isCompleted,false);
});
scenario('three real stages persist server-graded accuracy; retries and concurrent tabs do not duplicate events',async()=>{
 const lesson=f.lessons[0];
 assert.equal((await stage(lesson,{stage:1,visitedWordIds:f.words.map(w=>String(w._id))})).status,200);
 assert.equal((await stage(lesson,{stage:2,answers:[]})).status,400);
 const payload={stage:2,submissionId:op(),answers:practice(),score:100,stars:3};
 const responses=await Promise.all([stage(lesson,payload),stage(lesson,payload)]);assert.deepEqual(responses.map(r=>r.status),[200,200]);
 assert.equal(await M.LearningEvent.countDocuments({child:f.a._id,submissionId:payload.submissionId}),1);
 let progress=await M.Progress.findOne({child:f.a._id,lesson:lesson._id});assert.equal(progress.stage2Score,67);assert.equal(progress.stage2Stars,1);
 const games=availableGames(f.words,1,1);assert.ok(games.length>=2);
 for(const game of games.slice(0,2))assert.equal((await stage(lesson,{stage:3,gameId:game.id,answers:gameAnswers(game)})).status,200);
 progress=await M.Progress.findOne({child:f.a._id,lesson:lesson._id});assert.equal(progress.completed,true);assert.equal(progress.stars,1);assert.equal(progress.completionSnapshot.source,'STAGES');
 assert.equal(await M.UnitCompletion.countDocuments({}),0);
 const fresh=(await request(`/api/children/${f.a._id}/progress/${lesson._id}`,f.a)).data.data;assert.equal(fresh.stage3Games.length,2);
 const path=(await request('/api/lessons/curriculum-path',f.a)).data.data;assert.equal(path[0].lessons[0].stars,1);
});
scenario('Lesson completion appears in homework, supports review replacement and allows family read receipts only',async()=>{
 const tasks=await request('/api/teacher/tasks',f.ta);assert.equal(tasks.status,200,JSON.stringify(tasks.data));assert.ok(tasks.data.data.some(task=>task.kind==='REVIEW'));
 const detail=await request('/api/teacher/assignments/'+f.assignment._id,f.ta);assert.equal(detail.status,200);
 assert.equal(detail.data.data.studentSubmissions[0].hasSubmitted,true);
 const note=await request('/api/ai/generate-parent-note',f.ta,'POST',{childId:String(f.a._id),assignmentId:String(f.assignment._id),resultId:String(detail.data.data.studentSubmissions[0].submission._id)});assert.equal(note.status,200,JSON.stringify(note.data));assert.equal(note.data.data.options.length,3);
 for(const bonusStars of [2,1]){
  const review=await request(`/api/teacher/assignments/${f.assignment._id}/submissions/${f.a._id}/review`,f.ta,'POST',{comment:'QA feedback',bonusStars});
  assert.equal(review.status,200,JSON.stringify(review.data));
 }
 const assignment=await M.Assignment.findById(f.assignment._id);assert.equal(assignment.reviews.length,1);assert.equal(assignment.reviews[0].bonusStars,1);
 const notification=await M.ParentNotification.findOne({child:f.a._id});assert.ok(notification);
 const reply=await request(`/api/children/${f.a._id}/parent-notifications/${notification._id}/reply`,f.a,'POST',{message:'QA reply',parentName:'Impersonated name'});
 assert.equal(reply.status,404);
 const read=await request(`/api/children/${f.a._id}/parent-notifications/${notification._id}/read`,f.a,'PATCH',{});assert.equal(read.status,200);assert.ok(read.data.data.readAt);
});
scenario('completing the Unit and retrying a final game grants one chest only',async()=>{
 const lesson=f.lessons[1];
 assert.equal((await stage(lesson,{stage:1,visitedWordIds:f.words.map(w=>String(w._id))})).status,200);
 assert.equal((await stage(lesson,{stage:2,answers:practice()})).status,200);
 const games=availableGames(f.words,1,2);
 await stage(lesson,{stage:3,gameId:games[0].id,answers:gameAnswers(games[0])});
 const payload={stage:3,submissionId:op(),gameId:games[1].id,answers:gameAnswers(games[1])};
 const results=await Promise.all([stage(lesson,payload),stage(lesson,payload)]);assert.deepEqual(results.map(r=>r.status),[200,200]);
 assert.equal(await M.UnitCompletion.countDocuments({child:f.a._id}),1);
 const chest=await M.UnitCompletion.findOne({child:f.a._id});assert.equal(chest.rewards.filter(r=>r.type==='STAR')[0].amount,5);
 assert.equal(chest.rewards.filter(r=>r.type==='STICKER').length,1);
});
scenario('activity grading rejects empty/duplicate indexes; repeated submission is one result and stable session score',async()=>{
 const submit=body=>request('/api/learning/activity-results',f.a,'POST',{childId:String(f.a._id),activityId:String(f.activity._id),lessonId:String(f.lessons[0]._id),duration:5,submissionId:op(),...body});
 assert.equal((await submit({answers:[]})).status,400);
 assert.equal((await submit({answers:[0,0,0].map(questionIndex=>({questionIndex,selectedOptionId:'cat'}))})).status,400);
 const payload={submissionId:op(),sessionId:String(f.session._id),answers:[{questionIndex:0,selectedOptionId:'cat'}]};
 const first=await submit(payload),second=await submit(payload);assert.equal(first.status,201,JSON.stringify(first.data));assert.equal(second.status,201);
 assert.equal(await M.ActivityResult.countDocuments({submissionId:payload.submissionId}),1);
 const session=await M.LearningSession.findById(f.session._id);assert.equal(session.totalScore,10);
 const progress=await M.Progress.findOne({child:f.a._id,lesson:f.lessons[0]._id});assert.equal(progress.stars,1);
 const again=await submit({submissionId:op(),answers:[{questionIndex:0,selectedOptionId:'cat'}]});assert.equal(again.status,201);
 const sessionsBefore=await M.LearningSession.countDocuments({child:f.a._id});
 const replay=await submit({submissionId:again.data.data.result.submissionId,answers:[{questionIndex:0,selectedOptionId:'cat'}]});assert.equal(replay.status,201);
 assert.equal(await M.LearningSession.countDocuments({child:f.a._id}),sessionsBefore);
});
scenario('mastery events merge two devices, retry once, and stale absolute sync cannot overwrite counts',async()=>{
 const submit=payload=>request(`/api/children/${f.a._id}/vocabulary-mastery/${f.words[0]._id}/record`,f.a,'POST',payload);
 const key=op();const first=await submit({submissionId:key,isCorrect:true});assert.equal(first.status,200,JSON.stringify(first.data));
 const results=await Promise.all([submit({submissionId:key,isCorrect:true}),submit({submissionId:op(),isCorrect:false})]);assert.deepEqual(results.map(r=>r.status),[200,200]);
 await request(`/api/children/${f.a._id}/vocabulary-mastery`,f.a,'POST',{records:[{vocabularyId:String(f.words[0]._id),correctCount:0,wrongCount:0,attemptCount:0,streak:0}]});
 const record=await M.VocabularyMastery.findOne({student:f.a._id,vocabulary:f.words[0]._id});assert.equal(record.correctCount,1);assert.equal(record.wrongCount,1);assert.equal(record.attemptCount,2);
});
scenario('streak reads and preview do not mutate users or fabricate study dates',async()=>{
 const before=await M.User.findById(f.a._id).lean();
 const real=await request(`/api/children/${f.a._id}/streak`,f.a);assert.equal(real.status,200);assert.equal(real.data.data.streak,1);
 const preview=await request(`/api/children/${f.a._id}/streak/test-level`,f.a,'POST',{streak:30});assert.equal(preview.status,200);assert.equal(preview.data.data.preview,true);
 const after=await M.User.findById(f.a._id).lean();assert.deepEqual(after,before);
});
scenario('publication checklist and history guards reject destructive content edits',async()=>{
 const readiness=await request(`/api/admin/curriculum/lessons/${f.lessons[0]._id}/readiness`,f.admin);assert.equal(readiness.status,200);assert.equal(readiness.data.data.ready,true);
 const edit=await request(`/api/admin/activities/${f.activity._id}`,f.admin,'PUT',{title:'Changed rubric'});assert.equal(edit.status,409);
 const hide=await request(`/api/admin/activities/${f.activity._id}`,f.admin,'DELETE');assert.equal(hide.status,409);
 const remove=await request(`/api/admin/curriculum/vocabularies/${f.words[0]._id}`,f.admin,'DELETE');assert.equal(remove.status,409);
 assert.ok(await M.Vocabulary.exists({_id:f.words[0]._id}));
});
scenario('signed plans reject another child, tampered targets, and an unsigned completion',async()=>{
 const plan=f.plans[String(f.lessons[0]._id)],game=plan.games[0];
 const endpoint=`/api/children/${f.a._id}/progress/${f.lessons[0]._id}/stage`;
 assert.equal((await request(endpoint,f.a,'PUT',{stage:2,submissionId:op(),answers:practice()})).status,409);
 assert.equal((await request(endpoint,f.a,'PUT',{stage:3,submissionId:op(),gameId:game.id,attemptToken:game.attemptToken,answers:game.targetOrder.map(()=>({wordId:String(f.words[0]._id),selectedId:String(f.words[0]._id)}))})).status,400);
 assert.equal((await request(endpoint,f.c,'PUT',{stage:2,submissionId:op(),attemptToken:plan.stage2Token,answers:practice()})).status,403);
});
scenario('personal review, family week summary and teacher statistics include the three-stage path',async()=>{
 for(const endpoint of ['review-plan','weekly-summary']){
  const response=await request(`/api/children/${f.a._id}/${endpoint}`,f.a);assert.equal(response.status,200,JSON.stringify(response.data));
 }
 const week=(await request(`/api/children/${f.a._id}/weekly-summary`,f.a)).data.data;assert.equal(week.studyDays,1);assert.equal(week.completedLessons.length,2);assert.equal(week.practiceAccuracy,67);
 const students=await request('/api/teacher/students',f.ta);assert.equal(students.status,200,JSON.stringify(students.data));assert.equal(students.data.data[0].stats.hasAssessment,true);
 const overview=await request(`/api/teacher/students/${f.a._id}/overview`,f.ta);assert.equal(overview.status,200,JSON.stringify(overview.data));assert.ok(overview.data.data.recentActivities.some(row=>row.source==='STAGES'&&row.score===67));
 const history=await request(`/api/teacher/students/${f.a._id}/history`,f.ta);assert.equal(history.status,200);assert.ok(history.data.data.some(row=>row.rawScore===10&&row.score===100));
 const reward=(await request(`/api/children/${f.a._id}/rewards`,f.a)).data.data;assert.equal(students.data.data[0].stats.totalStars,reward.totalStars);
});
scenario('new lessons stay in draft until media and game readiness pass',async()=>{
 const created=await request('/api/admin/curriculum/lessons',f.admin,'POST',{title:'QA draft',unitId:String(f.unit._id),topicId:String(f.lessons[0].topic),displayOrder:3});
 assert.equal(created.status,201,JSON.stringify(created.data));const lesson=created.data.data;assert.equal(lesson.status,'DRAFT');
 assert.equal((await request(`/api/admin/lessons/${lesson._id}/status`,f.admin,'PATCH')).status,409);
 const word=await request('/api/admin/curriculum/vocabularies',f.admin,'POST',{english:'QA sun',vietnamese:'QA',lessonId:lesson._id,imageUrl:'javascript:alert(1)'});assert.equal(word.status,400);
 const hidden=await request('/api/admin/curriculum/vocabularies',f.admin,'POST',{english:'QA moon',vietnamese:'QA',lessonId:lesson._id});assert.equal(hidden.status,201);assert.equal(hidden.data.data.status,'HIDDEN');
 assert.equal((await request(`/api/admin/curriculum/vocabularies/${hidden.data.data._id}`,f.admin,'DELETE')).status,200);
 assert.equal((await M.Vocabulary.findById(hidden.data.data._id)).status,'INACTIVE');
 const createdWord=await request('/api/admin/curriculum/vocabularies',f.admin,'POST',{english:'QA image',vietnamese:'QA',status:'ACTIVE',imageUrl:'/images/vocabulary/cat-v1.svg',mediaSource:'QA fixture',mediaLicense:'QA only'});
 assert.equal(createdWord.status,201,JSON.stringify(createdWord.data));const original=createdWord.data.data;
 const changed=await request(`/api/admin/curriculum/vocabularies/${original._id}`,f.admin,'PUT',{imageUrl:'/images/vocabulary/dog-v1.svg'});assert.equal(changed.status,200,JSON.stringify(changed.data));
 assert.notEqual(changed.data.data.primaryMedia,original.primaryMedia);
 assert.equal((await M.Media.findById(original.primaryMedia)).url,'/images/vocabulary/cat-v1.svg');
 assert.equal((await M.Media.findById(changed.data.data.primaryMedia)).url,changed.data.data.imageUrl);
});
scenario('attendance and LIVE scoring run on real MongoDB, reject absent awards and deduplicate operations',async()=>{
 const absent=await M.User.create({role:'CHILD',name:'QA absent',ageGroupCode:'3-4',assignedClass:f.room._id});
 await M.ClassRoom.updateOne({_id:f.room._id},{$addToSet:{students:absent._id}});
 const records=[{student:String(f.a._id),status:'PRESENT'},{student:String(absent._id),status:'ABSENT'}];
 const attendance=await request(`/api/teacher/classes/${f.room._id}/attendance`,f.ta,'POST',{records});assert.equal(attendance.status,200,JSON.stringify(attendance.data));
 const created=await request('/api/teacher/classroom-sessions',f.ta,'POST',{classroomId:String(f.room._id),lessonId:String(f.lessons[0]._id),activityIds:[String(f.activity._id)],attendanceRecords:records,lessonPlan:{meta:{lessonTitle:f.lessons[0].title,ageGroup:'3-4',durationMinutes:25},phases:[]}});
 assert.equal(created.status,201,JSON.stringify(created.data));f.live=created.data.data;
 const endpoint='/api/teacher/classroom-sessions/'+f.live._id;
 await M.Schedule.create({classroom:f.room._id,teacher:f.ta._id,effectiveFrom:new Date('2020-01-01'),weeklySlots:Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,startTime:'00:00',endTime:'23:59'}))});
 assert.equal((await request(endpoint+'/start',f.ta,'POST',{})).status,200);
 const score={studentId:String(f.a._id),stars:2,operationId:op()};
 assert.equal((await request(endpoint+'/score-student',f.ta,'POST',{...score,points:10})).status,400);
 for(let i=0;i<2;i++)assert.equal((await request(endpoint+'/score-student',f.ta,'POST',score)).status,200);
 assert.equal((await request(endpoint+'/score-student',f.ta,'POST',{...score,operationId:op(),studentId:String(absent._id)})).status,400);
 assert.equal((await request(endpoint+'/end',f.ta,'POST',{coverage:'CONTINUE',goalsCovered:[]})).status,200);
 assert.equal((await request(endpoint+'/score-student',f.ta,'POST',{...score,operationId:op()})).status,409);
 const summary=await request(endpoint+'/summary',f.ta);assert.equal(summary.status,200);assert.equal(summary.data.data.studentScores.find(row=>String(row.student._id)===String(f.a._id)).stars,2);
});
scenario('closed-period recognition publishes once and reaches only its winning child',async()=>{
 await M.ClassroomSession.updateOne({_id:f.live._id},{$set:{endedAt:new Date('2026-09-10T05:00:00Z')}});
 const endpoint=`/api/recognitions/classes/${f.room._id}/publish`,body={kind:'MONTH',date:'2026-09-15'};
 const first=await request(endpoint,f.ta,'POST',body),second=await request(endpoint,f.ta,'POST',body);
 assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(second.status,200);assert.equal(first.data.data._id,second.data.data._id);
 assert.equal((await request('/api/recognitions/mine',f.a)).data.data.length,1);
 assert.equal((await request('/api/recognitions/mine',f.c)).data.data.length,0);
});
scenario('full backup restores BSON, indexes and credentials into a second empty QA database',async()=>{
 const response=await request('/api/admin/system/backup',f.admin);assert.equal(response.status,200);
 const payload=mongoose.mongo.BSON.EJSON.deserialize(response.data,{relaxed:false});
 assert.equal(payload.version,'3.4.0');
 const restoreName=dbName+'_restore';const connection=await mongoose.createConnection(process.env.MONGODB_URI,{dbName:restoreName,autoIndex:false}).asPromise();
 try{
  assert.equal(connection.name,restoreName);
  await require('../scripts/restore_system_backup').restoreIntoEmptyDatabase(payload,connection.db,async()=>{
   for(const model of Object.values({...M,ClassRecognition:require('../src/models/ClassRecognition')}))for(const [key,options] of model.schema.indexes())await connection.db.collection(model.collection.name).createIndex(key,options);
  });
  const user=await connection.db.collection('users').findOne({_id:f.a._id});assert.ok(user._id instanceof mongoose.Types.ObjectId);assert.ok(user.createdAt instanceof Date);assert.equal(await new M.User(user).matchPassword('QApassword!42'),true);
  for(const [name,docs] of Object.entries(payload.collections))assert.equal(await connection.db.collection(name).countDocuments({}),docs.length,name);
  assert.ok((await connection.db.collection('learningevents').indexes()).some(index=>index.unique&&index.key.submissionId));
 }finally{if(connection.name===restoreName&&restoreName===dbName+'_restore')await connection.dropDatabase();await connection.close();}
});
scenario('registration has no shared PIN and changing PIN revokes the old JWT without weakening the password',async()=>{
 const registered=await request('/api/auth/child-register',null,'POST',{name:'QA new',identifier:'qa-new@example.invalid',password:'QApassword!42',ageGroupCode:'3-4'});
 assert.equal(registered.status,201,JSON.stringify(registered.data));const child=await M.User.findById(registered.data.user._id);assert.equal(child.pin,undefined);
 const oldToken=token(f.a);const response=await request('/api/auth/change-pin',f.a,'POST',{currentPin:'4826',newPin:'6318'});assert.equal(response.status,200);
 assert.equal((await request('/api/auth/me',oldToken)).status,401);assert.equal((await request('/api/auth/me',response.data.token)).status,200);
 const updated=await M.User.findById(f.a._id);assert.equal(await updated.matchPassword('QApassword!42'),true);
});
