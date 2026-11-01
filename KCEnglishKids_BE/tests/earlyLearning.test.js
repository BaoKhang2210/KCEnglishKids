const test=require('node:test');const assert=require('node:assert/strict');
const {lessonGuide,closureDecision,reviewDueAt,observationSummary}=require('../src/services/earlyLearning');
const {readMedia}=require('../src/controllers/earlyLearningController');
const M=require('../src/models');const access=require('../src/services/teacherAccess');
const controller=require('../src/controllers/earlyLearningController');
const id=n=>String(n).padStart(24,'0');
const query=value=>({populate(){return this;},select(){return this;},sort(){return this;},limit(){return this;},lean:async()=>value});
const lesson={_id:id(3),ageGroupCode:'3-4',vocabularyItems:Array.from({length:8},(_,index)=>({_id:id(index+10),english:'word'+index}))};
async function invoke(handler,body={},params={studentId:id(1)}){let error;const response={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.data=data;}};await handler({body,params,user:{_id:id(2),role:'TEACHER'}},response,e=>{error=e;});return {...response,error};}
test('age-specific guide limits the word group and accepts gesture responses for youngest children',()=>{
 assert.equal(lessonGuide(lesson,'3-4').focus.length,4);assert.equal(lessonGuide(lesson,'5-6').focus.length,6);
 assert.match(lessonGuide(lesson,'3-4').goals[1].label,/cử chỉ/);assert.equal(lessonGuide(lesson,'3-4').choices,2);
 assert.ok(lessonGuide(lesson,'5-6').adultRole.includes('không phải điều kiện'));
});
test('closing a session requires an explicit decision; complete requires all goals and actual attendance',()=>{
 const guide=lessonGuide(lesson,'3-4'),present=[{attendance:'PRESENT'}];const goals=guide.goals.map(goal=>goal.key);
 assert.throws(()=>closureDecision({},guide,present));
 assert.throws(()=>closureDecision({coverage:'COMPLETE',goalsCovered:goals.slice(1)},guide,present));
 assert.throws(()=>closureDecision({coverage:'COMPLETE',goalsCovered:goals},guide,[{attendance:'ABSENT'}]));
 assert.equal(closureDecision({coverage:'CONTINUE',goalsCovered:[]},guide,present).coverage,'CONTINUE');
 assert.equal(closureDecision({coverage:'REVIEW',goalsCovered:[]},guide,present).coverage,'REVIEW');
 assert.equal(closureDecision({coverage:'COMPLETE',goalsCovered:goals},guide,present).coverage,'COMPLETE');
 assert.throws(()=>closureDecision({coverage:'COMPLETE',goalsCovered:[...goals,'READ_REQUIRED']},guide,present));
});
test('review intervals retain mastered words for later checks without a permanent mastery conclusion',()=>{
 const lastReviewedAt='2026-11-01T00:00:00Z';
 assert.equal(reviewDueAt({lastReviewedAt,masteryLevel:1}).toISOString(),'2026-11-02T00:00:00.000Z');
 assert.equal(reviewDueAt({lastReviewedAt,masteryLevel:3,streak:3}).toISOString(),'2026-11-04T00:00:00.000Z');
 assert.equal(reviewDueAt({lastReviewedAt,masteryLevel:3,streak:6}).toISOString(),'2026-11-08T00:00:00.000Z');
});
test('observation summary takes latest evidence per skill and lesson, never averages support levels into a score',()=>{
 const rows=[{lesson:id(3),skill:'EXPRESS',level:'INDEPENDENT',observedAt:'2026-11-02'},{lesson:id(3),skill:'EXPRESS',level:'EMERGING',observedAt:'2026-11-01'},{lesson:id(3),skill:'PARTICIPATE',level:'SUPPORTED',observedAt:'2026-11-01'}];
 const summary=observationSummary(rows);assert.equal(summary.independent,1);assert.equal(summary.emerging,0);assert.equal(summary.supported,1);assert.equal(summary.latestSkills,2);assert.equal(summary.score,undefined);
});
test('evidence rejects executable/mismatched files and caps payloads; private binary is excluded by default',()=>{
 assert.throws(()=>readMedia({mimeType:'image/svg+xml',base64:Buffer.from('<svg onload="alert(1)"/>').toString('base64')}));
 assert.throws(()=>readMedia({mimeType:'image/png',base64:Buffer.from('<html>bad</html>').toString('base64')}));
 assert.throws(()=>readMedia({mimeType:'audio/webm',base64:'A'.repeat(2800001)}));
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9KkAAAAASUVORK5CYII=';
 assert.equal(readMedia({mimeType:'image/png',base64:png}).bytes,Buffer.from(png,'base64').length);
 assert.equal(M.LearningObservation.schema.path('media.data').options.select,false);
 assert.equal(M.LearningObservation.schema.path('payloadHash').options.select,false);
});
test('teacher observations enforce child scope before looking up or writing evidence',async t=>{
 t.mock.method(access,'child',async()=>{throw Object.assign(Error('other classroom'),{statusCode:403});});
 t.mock.method(M.LearningObservation,'findOneAndUpdate',()=>assert.fail('must not write'));
 const result=await invoke(controller.create);assert.equal(result.error.statusCode,403);
});
test('observation save retries are stable and a reused operation cannot replace different evidence',async t=>{
 t.mock.method(access,'child',async()=>({_id:id(1),assignedClass:id(4),ageGroupCode:'3-4'}));t.mock.method(access,'classroom',async()=>({_id:id(4),status:'ACTIVE'}));t.mock.method(M.Lesson,'findOne',()=>query(lesson));
 let saved; t.mock.method(M.LearningObservation,'findOneAndUpdate',(_filter,update)=>({select:async()=>{saved||={...update.$setOnInsert,_id:id(5)};return {...saved,toObject:()=>({...saved})};}}));
 const body={lessonId:id(3),skill:'LISTEN_POINT',level:'SUPPORTED',evidence:'Bé chỉ tranh sau khi cô gợi ý.',operationId:'observation-stable-1'};
 assert.equal((await invoke(controller.create,body)).statusCode,201);assert.equal((await invoke(controller.create,body)).statusCode,201);
 const conflict=await invoke(controller.create,{...body,evidence:'Khác nội dung quan sát.'});assert.equal(conflict.error.statusCode,409);
});
test('an attachment requires confirmation of permission to share with this child family',async t=>{
 t.mock.method(access,'child',async()=>({_id:id(1),assignedClass:id(4),ageGroupCode:'3-4'}));t.mock.method(access,'classroom',async()=>({_id:id(4),status:'ACTIVE'}));t.mock.method(M.Lesson,'findOne',()=>query(lesson));t.mock.method(M.LearningObservation,'findOneAndUpdate',()=>assert.fail('must not write'));
 const result=await invoke(controller.create,{lessonId:id(3),skill:'EXPRESS',level:'SUPPORTED',evidence:'Bé diễn đạt sau gợi ý.',operationId:'attachment-stable-1',media:{mimeType:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9KkAAAAASUVORK5CYII='}});
 assert.match(result.error.message,/quyền chia sẻ/);
});
