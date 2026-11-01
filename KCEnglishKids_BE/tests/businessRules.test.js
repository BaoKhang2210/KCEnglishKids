const test=require('node:test'),assert=require('node:assert/strict');
const {gradeStage}=require('../src/services/stageLearning');
const {gradeActivityAnswers}=require('../src/services/learningService');
const {streakData}=require('../src/controllers/streakController');
const connect=require('../src/config/db'),mongoose=require('mongoose');
const words=['cat','dog','bird'].map((english,i)=>({_id:String(i),english,wordType:'noun',imageUrl:'/'+english+'.svg'}));
test('stage scoring requires every word/round, ignores claimed points and distinguishes hints',()=>{
 const answers=[1,2,3].flatMap(round=>words.map((w,i)=>({wordId:w._id,round,selectedId:i===2?null:w._id})));
 const result=gradeStage(2,{answers,score:100,stars:3},words,null,'3-4');assert.equal(result.score,67);
 assert.throws(()=>gradeStage(2,{answers:answers.slice(1)},words,null,'3-4'),/rounds/);
 assert.throws(()=>gradeStage(2,{answers:[...answers,answers[0]]},words,null,'3-4'),/rounds/);
});
test('memory completion requires the matched server vocabulary and cannot trust isCorrect',()=>{
 const activity={activityType:'MEMORY_CARD',questions:[{vocabulary:'cat',correctAnswer:'cat'}]};
 assert.equal(gradeActivityAnswers(activity,[{questionIndex:0,selectedOptionId:'fake',isCorrect:true}])[0].isCorrect,false);
 assert.equal(gradeActivityAnswers(activity,[{questionIndex:0,selectedOptionId:'cat'}])[0].isCorrect,true);
 assert.throws(()=>gradeActivityAnswers(activity,[]),/exactly once/);
});
test('study streak uses real activity dates and Vietnam-day boundaries without modifying a user',()=>{
 const result=streakData(['2026-10-26','2026-10-27','2026-10-27'],'2026-10-28');assert.equal(result.streak,2);assert.equal(result.longestStreak,2);
 assert.equal(streakData(['2026-10-25'],'2026-10-28').streak,0);
 assert.equal(streakData([],'2026-10-28').streak,0);
});
test('database startup fails on the selected URI and never attempts another database',async t=>{
 const previous=process.env.MONGODB_URI;process.env.MONGODB_URI='mongodb://qa.invalid/qa';const calls=[];
 t.mock.method(mongoose,'connect',async uri=>{calls.push(uri);throw Error('simulated private connection error');});
 try{await assert.rejects(connect,/configured database/);assert.deepEqual(calls,['mongodb://qa.invalid/qa']);}
 finally{if(previous===undefined)delete process.env.MONGODB_URI;else process.env.MONGODB_URI=previous;}
});
