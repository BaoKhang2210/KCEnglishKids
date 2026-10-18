export interface BadgeItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  category: 'journey' | 'stars' | 'skills';
  categoryName: string;
  requirement: number;
  reqType: 'lesson' | 'unit' | 'star' | 'perfectLesson' | 'openedChest';
  color: string;
  badgeBg: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  tierName: string;
  ribbonColor: string;
}

export interface BadgeProgress {
  totalStars: number;
  completedLessons: number;
  completedUnits: number;
  perfectLessons: number;
  openedChests: number;
}

export const getBadgeProgress = (badge: BadgeItem, progress: BadgeProgress): number => {
  switch (badge.reqType) {
    case 'star': return progress.totalStars;
    case 'unit': return progress.completedUnits;
    case 'perfectLesson': return progress.perfectLessons;
    case 'openedChest': return progress.openedChests;
    default: return progress.completedLessons;
  }
};

export const evaluateBadge = (badge: BadgeItem, progress: BadgeProgress) => ({
  ...badge,
  unlocked: getBadgeProgress(badge, progress) >= badge.requirement
});

export const ALL_BADGES: BadgeItem[] = [
  // Nhóm 1: Hành trình khám phá (10 huy hiệu)
  {
    id: 'b_first_step',
    icon: '🐾',
    name: 'Bước Chân Đầu Tiên',
    desc: 'Hoàn thành bài học đầu tiên',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 1,
    reqType: 'lesson',
    color: 'from-amber-400 to-orange-400',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    tier: 'bronze',
    tierName: 'Huy Chương Đồng',
    ribbonColor: 'bg-amber-500'
  },
  {
    id: 'b_unit_1',
    icon: '🎒',
    name: 'Bé Đến Lớp',
    desc: 'Hoàn thành trọn vẹn 1 Unit',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 1,
    reqType: 'unit',
    color: 'from-emerald-400 to-teal-500',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    tier: 'bronze',
    tierName: 'Huy Chương Đồng',
    ribbonColor: 'bg-emerald-500'
  },
  {
    id: 'b_animals',
    icon: '🐶',
    name: 'Bạn Học Chăm Chỉ',
    desc: 'Hoàn thành 2 Lesson',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 2,
    reqType: 'lesson',
    color: 'from-orange-400 to-amber-500',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    tier: 'silver',
    tierName: 'Huy Chương Bạc',
    ribbonColor: 'bg-orange-500'
  },
  {
    id: 'b_food',
    icon: '🍎',
    name: 'Nhà Khám Phá Nhí',
    desc: 'Hoàn thành 3 Lesson',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 3,
    reqType: 'lesson',
    color: 'from-rose-400 to-red-500',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    tier: 'silver',
    tierName: 'Huy Chương Bạc',
    ribbonColor: 'bg-rose-500'
  },
  {
    id: 'b_toys',
    icon: '🧸',
    name: 'Chăm Học Mỗi Ngày',
    desc: 'Hoàn thành 4 Lesson',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 4,
    reqType: 'lesson',
    color: 'from-pink-400 to-purple-500',
    badgeBg: 'bg-pink-100 text-pink-900 border-pink-300',
    tier: 'silver',
    tierName: 'Huy Chương Bạc',
    ribbonColor: 'bg-pink-500'
  },
  {
    id: 'b_nature',
    icon: '🌳',
    name: 'Bước Tiến Vững Vàng',
    desc: 'Hoàn thành 5 Lesson',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 5,
    reqType: 'lesson',
    color: 'from-green-400 to-emerald-500',
    badgeBg: 'bg-green-100 text-green-900 border-green-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-emerald-600'
  },
  {
    id: 'b_home',
    icon: '🏡',
    name: 'Người Bạn Của Sách',
    desc: 'Hoàn thành 6 Lesson',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 6,
    reqType: 'lesson',
    color: 'from-amber-400 to-yellow-500',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-amber-600'
  },
  {
    id: 'b_unit_3',
    icon: '🧭',
    name: 'Nhà Thám Hiểm Nhí',
    desc: 'Hoàn thành 3 Unit',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 3,
    reqType: 'unit',
    color: 'from-sky-400 to-blue-500',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-sky-500'
  },
  {
    id: 'b_unit_5',
    icon: '🌈',
    name: 'Đại Sứ Khám Phá',
    desc: 'Chinh phục 5 Unit học tập',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 5,
    reqType: 'unit',
    color: 'from-indigo-400 to-purple-500',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-indigo-500'
  },
  {
    id: 'b_unit_all',
    icon: '👑',
    name: 'Vua Chinh Phục',
    desc: 'Hoàn thành trọn vẹn toàn bộ 9 Unit',
    category: 'journey',
    categoryName: 'Hành trình',
    requirement: 9,
    reqType: 'unit',
    color: 'from-amber-400 via-yellow-300 to-amber-500',
    badgeBg: 'bg-amber-200 text-amber-950 border-amber-400',
    tier: 'diamond',
    tierName: 'Huy Chương Kim Cương',
    ribbonColor: 'bg-purple-600'
  },

  // Nhóm 2: Ngôi sao & Chăm chỉ (5 huy hiệu)
  {
    id: 'b_star_5',
    icon: '⭐',
    name: 'Ngôi Sao Sáng',
    desc: 'Tích luỹ 5 ngôi sao vàng',
    category: 'stars',
    categoryName: 'Ngôi sao',
    requirement: 5,
    reqType: 'star',
    color: 'from-yellow-400 to-amber-500',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    tier: 'bronze',
    tierName: 'Huy Chương Đồng',
    ribbonColor: 'bg-yellow-500'
  },
  {
    id: 'b_star_12',
    icon: '🌟',
    name: 'Siêu Sao Nhí',
    desc: 'Tích luỹ 12 ngôi sao vàng',
    category: 'stars',
    categoryName: 'Ngôi sao',
    requirement: 12,
    reqType: 'star',
    color: 'from-amber-400 to-orange-500',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    tier: 'silver',
    tierName: 'Huy Chương Bạc',
    ribbonColor: 'bg-amber-500'
  },
  {
    id: 'b_star_25',
    icon: '✨',
    name: 'Bầu Trời Sao',
    desc: 'Tích luỹ 25 ngôi sao vàng lấp lánh',
    category: 'stars',
    categoryName: 'Ngôi sao',
    requirement: 25,
    reqType: 'star',
    color: 'from-purple-400 to-pink-500',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-purple-500'
  },
  {
    id: 'b_star_40',
    icon: '☀️',
    name: 'Mặt Trời Rạng Rỡ',
    desc: 'Tích luỹ 40 ngôi sao vàng danh giá',
    category: 'stars',
    categoryName: 'Ngôi sao',
    requirement: 40,
    reqType: 'star',
    color: 'from-orange-400 to-rose-500',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    tier: 'diamond',
    tierName: 'Huy Chương Kim Cương',
    ribbonColor: 'bg-rose-500'
  },
  {
    id: 'b_streak',
    icon: '🐝',
    name: 'Ong Vàng Tích Sao',
    desc: 'Tích lũy 8 sao vàng',
    category: 'stars',
    categoryName: 'Ngôi sao',
    requirement: 8,
    reqType: 'star',
    color: 'from-yellow-300 to-amber-400',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    tier: 'bronze',
    tierName: 'Huy Chương Đồng',
    ribbonColor: 'bg-amber-500'
  },

  // Nhóm 3: Kỹ năng & Trò chơi (5 huy hiệu)
  {
    id: 'b_quiz_master',
    icon: '🎯',
    name: 'Thiện Xạ Nhí',
    desc: 'Hoàn thành 2 Lesson với 3 sao',
    category: 'skills',
    categoryName: 'Kỹ năng',
    requirement: 2,
    reqType: 'perfectLesson',
    color: 'from-teal-400 to-emerald-500',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    tier: 'silver',
    tierName: 'Huy Chương Bạc',
    ribbonColor: 'bg-teal-500'
  },
  {
    id: 'b_memory',
    icon: '🧠',
    name: 'Bạn Nhỏ Kiên Trì',
    desc: 'Hoàn thành 4 Lesson',
    category: 'skills',
    categoryName: 'Kỹ năng',
    requirement: 4,
    reqType: 'lesson',
    color: 'from-sky-400 to-indigo-500',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    tier: 'silver',
    tierName: 'Huy Chương Bạc',
    ribbonColor: 'bg-sky-500'
  },
  {
    id: 'b_pronounce',
    icon: '🔊',
    name: 'Chinh Phục 6 Lesson',
    desc: 'Hoàn thành 6 Lesson',
    category: 'skills',
    categoryName: 'Kỹ năng',
    requirement: 6,
    reqType: 'lesson',
    color: 'from-blue-400 to-cyan-500',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-blue-500'
  },
  {
    id: 'b_chest',
    icon: '💎',
    name: 'Bàn Tay Vàng',
    desc: 'Mở 2 rương quà của Unit',
    category: 'skills',
    categoryName: 'Kỹ năng',
    requirement: 2,
    reqType: 'openedChest',
    color: 'from-fuchsia-400 to-pink-500',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
    tier: 'gold',
    tierName: 'Huy Chương Vàng',
    ribbonColor: 'bg-fuchsia-500'
  },
  {
    id: 'b_master',
    icon: '🏆',
    name: 'Đại Sứ Anh Ngữ Nhí',
    desc: 'Tích lũy 30 sao vàng',
    category: 'skills',
    categoryName: 'Kỹ năng',
    requirement: 30,
    reqType: 'star',
    color: 'from-amber-400 via-rose-400 to-purple-500',
    badgeBg: 'bg-gradient-to-r from-amber-200 to-pink-200 text-slate-900 border-amber-400',
    tier: 'diamond',
    tierName: 'Huy Chương Kim Cương',
    ribbonColor: 'bg-purple-600'
  }
];
