const { User, ActivityResult } = require('../models');

/**
 * Get current date in Vietnam time (UTC+7) formatted as 'YYYY-MM-DD'
 */
const getVietnamDateString = (date = new Date()) => {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
};

/**
 * Get date string for N days before/after in Vietnam time
 */
const getShiftedDateString = (baseDateStr, daysShift) => {
  const d = new Date(baseDateStr + 'T12:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + daysShift);
  return d.toISOString().slice(0, 10);
};

/**
 * Determine streak level and styling metadata
 */
const getStreakLevelInfo = (streak) => {
  if (streak >= 14) {
    return {
      level: 4,
      title: 'Lửa Vũ Trụ Cực Quang',
      englishTitle: 'Cosmic Rainbow Flame',
      badge: '👑',
      theme: 'cosmic',
      description: 'Huyền thoại học tập! Ngọn lửa cầu vồng ngân hà bất khả chiến bại!',
      color: 'from-purple-500 via-pink-500 via-amber-400 to-cyan-400',
      glowColor: 'rgba(236, 72, 153, 0.6)'
    };
  }
  if (streak >= 7) {
    return {
      level: 3,
      title: 'Lửa Phượng Hoàng Hoàng Kim',
      englishTitle: 'Phoenix Gold Flame',
      badge: '⚡',
      theme: 'phoenix',
      description: 'Chăm chỉ suốt cả tuần! Ngọn lửa hoàng kim mang sức mạnh phượng hoàng!',
      color: 'from-amber-400 via-orange-500 to-purple-600',
      glowColor: 'rgba(245, 158, 11, 0.6)'
    };
  }
  if (streak >= 3) {
    return {
      level: 2,
      title: 'Ngọn Lửa Bùng Cháy',
      englishTitle: 'Blazing Fire',
      badge: '🔥',
      theme: 'blazing',
      description: 'Nhiệt huyết tuyệt vời! Ngọn lửa đỏ cam đang bùng cháy rực rỡ!',
      color: 'from-amber-400 via-orange-500 to-red-500',
      glowColor: 'rgba(239, 68, 68, 0.5)'
    };
  }
  return {
    level: 1,
    title: 'Đốm Lửa Ấm Áp',
    englishTitle: 'Warm Spark',
    badge: '✨',
    theme: 'warm',
    description: 'Khởi đầu tuyệt đẹp! Bé đang thắp lên ngọn lửa chăm ngoan mỗi ngày!',
    color: 'from-yellow-400 via-amber-500 to-orange-400',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  };
};

/**
 * Get next milestone details
 */
const getNextMilestone = (streak) => {
  if (streak < 3) return { target: 3, rewardStars: 10, label: '3 Ngày' };
  if (streak < 7) return { target: 7, rewardStars: 25, label: '7 Ngày (1 Tuần)' };
  if (streak < 14) return { target: 14, rewardStars: 50, label: '14 Ngày (2 Tuần)' };
  if (streak < 30) return { target: 30, rewardStars: 100, label: '30 Ngày (1 Tháng)' };
  return { target: streak + 7, rewardStars: 100, label: `${streak + 7} Ngày` };
};

/**
 * Generate 7 days of the current week (Monday to Sunday)
 */
const buildWeekDays = (activeDatesSet, todayStr) => {
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const today = new Date(todayStr + 'T12:00:00.000Z');
  // In JS getUTCDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const jsDay = today.getUTCDay();
  // Monday as index 0:
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  const week = [];
  for (let i = 0; i < 7; i++) {
    const shift = mondayOffset + i;
    const dateStr = getShiftedDateString(todayStr, shift);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isActive = activeDatesSet.has(dateStr);

    week.push({
      dayIndex: i,
      label: dayLabels[i],
      date: dateStr,
      isToday,
      isPast,
      isActive
    });
  }
  return week;
};

/**
 * GET /api/children/:childId/streak
 * Synchronize daily streak and return rich visualization details
 */
function streakData(dates, todayStr) {
  const activeDates = [...new Set(dates)].filter(d=>d<=todayStr).sort();
  const activeSet=new Set(activeDates);
  let streak=0, longestStreak=0, run=0, previous;
  for(const date of activeDates) { run=previous && getShiftedDateString(previous,1)===date ? run+1 : 1;longestStreak=Math.max(longestStreak,run);previous=date; }
  let cursor=activeSet.has(todayStr)?todayStr:getShiftedDateString(todayStr,-1);
  while(activeSet.has(cursor)){streak++;cursor=getShiftedDateString(cursor,-1);}
  return {streak,longestStreak,lastActiveDate:activeDates.at(-1)||null,isNewDayIncrement:false,
    levelInfo:getStreakLevelInfo(streak), nextMilestone:{...getNextMilestone(streak),rewardStars:0},
    weekDays:buildWeekDays(activeSet,todayStr),activeDates:activeDates.slice(-60)};
}
const getChildStreak = async (req,res,next) => {
 try {
  const child=await User.findById(req.params.childId).select('name');
  if(!child)return res.status(404).json({success:false,message:'Child not found.'});
  const events=await require('../models/LearningEvent').find({child:child._id}).select('createdAt').lean();
  const practice=await require('../models/MasteryEvent').find({child:child._id}).select('createdAt').lean();
  const results=await ActivityResult.find({child:child._id,completed:true}).select('createdAt').lean();
  res.json({success:true,data:{childId:child._id,childName:child.name,...streakData([...events,...results,...practice].map(row=>getVietnamDateString(new Date(row.createdAt))),getVietnamDateString())}});
 }catch(error){next(error);}
};
const testChildStreakLevel = async (req,res) => {
 const streak=Number(req.body.streak);
 if(!Number.isInteger(streak)||streak<1||streak>30)return res.status(400).json({success:false,message:'Preview range is 1–30.'});
 const today=getVietnamDateString(),dates=Array.from({length:streak},(_,i)=>getShiftedDateString(today,-i));
 res.json({success:true,message:'Bản xem thử; không thay đổi thành tích.',data:{...streakData(dates,today),preview:true}});
};
module.exports={getChildStreak,testChildStreakLevel,getStreakLevelInfo,streakData};
