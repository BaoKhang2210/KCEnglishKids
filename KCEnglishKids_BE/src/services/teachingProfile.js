const { fail, text, validId, idOf } = require('./teacherRules');
const { ages, lessonGuide } = require('./earlyLearning');
function required(value,max,label){const result=text(value,max);if(!result)fail('Vui lòng nhập '+label+'.');return result;}
function homeActivity(input){
  if(!input||!Array.isArray(input.steps)||input.steps.length<2||input.steps.length>5)fail('Hoạt động gia đình cần 2–5 bước.');
  return {title:required(input.title,200,'tên hoạt động gia đình'),steps:input.steps.map(step=>required(step,500,'bước hoạt động'))};
}
function profile(input,lesson){
  const defaults=lessonGuide({...lesson,teachingProfile:undefined},lesson.ageGroupCode);
  if(!input||!Array.isArray(input.goals)||!Array.isArray(input.phases))fail('Thiếu mục tiêu hoặc các bước tổ chức bài.');
  const goals=defaults.goals.map(goal=>{const row=input.goals.find(item=>item.key===goal.key);return {key:goal.key,label:required(row?.label,500,'mục tiêu '+goal.key)};});
  const phases=defaults.phases.map(phase=>{const row=input.phases.find(item=>item.key===phase.key);return{key:phase.key,title:phase.title,action:required(row?.action,1500,'cách tổ chức '+phase.title)};});
  if(input.goals.length!==3||input.phases.length!==4)fail('Giữ đủ ba nhóm mục tiêu và bốn bước tổ chức.');
  const ids=input.focusVocabulary||[];
  if(!Array.isArray(ids)||ids.length<1||ids.length>(ages[lesson.ageGroupCode]||ages['3-4']).reviewWords||new Set(ids).size!==ids.length||ids.some(id=>!validId(id)||!lesson.vocabularyItems.some(word=>idOf(word)===id&&word.status!=='INACTIVE'&&word.status!=='HIDDEN')))fail('Chọn nhóm từ trọng tâm hợp lệ trong bài, phù hợp tuổi.');
  return {focusVocabulary:ids,goals,phases,materials:text(input.materials,2000),homeActivity:homeActivity(input.homeActivity)};
}
module.exports={profile,homeActivity};
