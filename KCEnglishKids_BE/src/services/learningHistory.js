const Event=require('../models/LearningEvent');
const {calculateStars}=require('./starService');
async function recentHistory(child,legacy,limit=30){
 const stages=await Event.find({child,stage:2}).populate('lesson','title').sort({createdAt:-1}).limit(limit).lean();
 const rows=legacy.map(value=>{
  const row=value.toObject?value.toObject():value;
  const count=(row.correctCount||0)+(row.incorrectCount||0);
  return {...row,rawScore:row.score,score:count?Math.round(100*row.correctCount/count):null};
 });
 for(const event of stages)rows.push({...event,source:'STAGES',completed:true,
  activity:{title:'Luyện tập ba vòng',activityType:'PRACTICE'},stars:calculateStars(event.score,100),
  correctCount:event.answers.filter(a=>a.isCorrect).length,incorrectCount:event.answers.filter(a=>!a.isCorrect).length});
 return rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,limit);
}
module.exports={recentHistory};
