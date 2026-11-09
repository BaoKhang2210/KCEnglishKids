const jwt=require('jsonwebtoken'),crypto=require('node:crypto');
const {jwtSecret}=require('../config/auth');
const {Vocabulary,CurriculumUnit}=require('../models');
const {activeLesson,fail}=require('./childAccess');
const {usable}=require('./gameRules');
const fingerprint=words=>crypto.createHash('sha256').update(JSON.stringify(words.map(w=>[String(w._id),w.english,w.wordType,w.imageUrl,w.visualType,w.isTransparent]).sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex');
async function createPlan(childId,lessonId){
 const lesson=await activeLesson(childId,lessonId);
 const words=await Vocabulary.find({_id:{$in:lesson.vocabularyItems},status:'ACTIVE'}).lean();
 const unit=await CurriculumUnit.findById(lesson.curriculumUnits[0]);
 const base={purpose:'LEARNING_PLAN',child:String(childId),lesson:String(lessonId),content:fingerprint(words)};
 const sign=claims=>jwt.sign({...base,...claims},jwtSecret(),{expiresIn:'30d'});
 const buildGamePlan=game=>{
  const usablePool=usable(game,words).map(w=>String(w._id));
  const pool=usablePool.length?usablePool:words.map(w=>String(w._id));
  for(let i=pool.length-1;i>0;i--){const j=crypto.randomInt(0,i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  const targetOrder=Array.from({length:game.targetCountByAge[lesson.ageGroupCode]||4},(_,i)=>pool[i%pool.length]);
  return {id:game.id,targetOrder,attemptToken:sign({stage:3,gameId:game.id,targetOrder})};
 };
 const configured=await require('./gameCatalog').configuredGames(words,unit.unitNumber,lesson.displayOrder||1);
 const games=configured.map(buildGamePlan);
 const allRules=require('../../../shared/learningGames.json');
 const allGames=allRules.map(rule=>games.find(g=>g.id===rule.id)||buildGamePlan(rule));
 return {stage2Token:sign({stage:2}),games,allGames};
}
function verifyPlan(childId,lessonId,body,words){
 let plan;try{plan=jwt.verify(body.attemptToken,jwtSecret());}catch{fail('Kế hoạch luyện tập hết hạn hoặc không hợp lệ. Mở lại bài để bắt đầu.',409);}
 if(plan.purpose!=='LEARNING_PLAN'||plan.child!==String(childId)||plan.lesson!==String(lessonId)||plan.stage!==Number(body.stage)||plan.content!==fingerprint(words)||plan.gameId!==body.gameId)fail('Kế hoạch không khớp nội dung hoặc người học.',409);
 if(plan.stage===3&&(!Array.isArray(body.answers)||body.answers.length!==plan.targetOrder.length||body.answers.some((a,i)=>a.wordId!==plan.targetOrder[i])))fail('Game targets do not match the issued plan.',400);
 return plan;
}
module.exports={createPlan,verifyPlan,fingerprint};
