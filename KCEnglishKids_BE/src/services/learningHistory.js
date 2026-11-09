const Event=require('../models/LearningEvent');
const {calculateStars}=require('./starService');
async function recentHistory(child,legacy,limit=30){
 const stages=await Event.find({child,stage:{$in:[1,2,3]}}).populate('lesson','title vietnameseTitle').sort({createdAt:-1}).limit(limit).lean();
 const rows=legacy.map(value=>{
  const row=value.toObject?value.toObject():value;
  const count=(row.correctCount||0)+(row.incorrectCount||0);
  return {...row,rawScore:row.score,score:count?Math.round(100*row.correctCount/count):null};
 });
 for(const event of stages){
  const answers=event.answers||[];
  const activityTitle=event.stage===1
   ?'Chặng 1: Khám phá từ vựng'
   :event.stage===3
   ?`Chặng 3: Minigame${event.gameId?' ('+event.gameId+')':''}`
   :'Luyện tập ba vòng';
  const activityType=event.stage===1?'STAGE_1':event.stage===3?'MINIGAME':'PRACTICE';
  rows.push({...event,source:'STAGES',completed:true,
   activity:{title:activityTitle,activityType,gameId:event.gameId||null},
   stars:event.stage===1?1:calculateStars(event.score??100,100),
   correctCount:answers.filter(a=>a.isCorrect).length,
   incorrectCount:answers.filter(a=>!a.isCorrect).length});
 }
 return rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,limit);
}
module.exports={recentHistory};
