export interface StickerItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  bgGradient: string;
}

export const ALL_STICKERS: StickerItem[] = [
  {
    id: 'st_lion',
    icon: '🦁',
    name: 'Sư Tử Dũng Cảm',
    desc: 'Bé can đảm vượt qua bài học!',
    rarity: 'common',
    bgGradient: 'from-amber-400 to-orange-500'
  },
  {
    id: 'st_tiger',
    icon: '🐯',
    name: 'Hổ Con Nhanh Nhẹn',
    desc: 'Phản xạ nhanh như chớp!',
    rarity: 'common',
    bgGradient: 'from-orange-400 to-red-500'
  },
  {
    id: 'st_panda',
    icon: '🐼',
    name: 'Gấu Trúc Đáng Yêu',
    desc: 'Học tiếng Anh thật chăm chỉ',
    rarity: 'common',
    bgGradient: 'from-slate-600 to-slate-800'
  },
  {
    id: 'st_rocket',
    icon: '🚀',
    name: 'Tàu Vũ Trụ Thám Hiểm',
    desc: 'Bay cao vút khám phá từ vựng mới',
    rarity: 'rare',
    bgGradient: 'from-sky-400 to-indigo-600'
  },
  {
    id: 'st_trophy',
    icon: '🏆',
    name: 'Quán Quân Nhí',
    desc: 'Đạt điểm tuyệt đối trong trò chơi',
    rarity: 'rare',
    bgGradient: 'from-yellow-400 to-amber-600'
  },
  {
    id: 'st_rainbow',
    icon: '🌈',
    name: 'Cầu Vồng Rực Rỡ',
    desc: 'Tô điểm thế giới sắc màu tươi vui',
    rarity: 'rare',
    bgGradient: 'from-pink-400 via-purple-400 to-sky-400'
  },
  {
    id: 'st_star',
    icon: '⭐',
    name: 'Ngôi Sao May Mắn',
    desc: 'Luôn tỏa sáng rực rỡ mỗi ngày',
    rarity: 'common',
    bgGradient: 'from-yellow-300 to-amber-500'
  },
  {
    id: 'st_unicorn',
    icon: '🦄',
    name: 'Kỳ Lân Phép Thuật',
    desc: 'Mang lại niềm vui diệu kỳ',
    rarity: 'epic',
    bgGradient: 'from-fuchsia-400 to-purple-600'
  },
  {
    id: 'st_dino',
    icon: '🦖',
    name: 'Khủng Long Tinh Nghịch',
    desc: 'Mạnh mẽ và không sợ khó khăn',
    rarity: 'epic',
    bgGradient: 'from-emerald-400 to-teal-600'
  },
  {
    id: 'st_apple',
    icon: '🍎',
    name: 'Quả Táo Ngọt Ngào',
    desc: 'Phần thưởng ngọt ngào cho bé yêu',
    rarity: 'common',
    bgGradient: 'from-rose-400 to-red-600'
  },
  {
    id: 'st_artist',
    icon: '🎨',
    name: 'Họa Sĩ Nhí Tài Ba',
    desc: 'Sáng tạo và nhận biết màu sắc tuyệt vời',
    rarity: 'rare',
    bgGradient: 'from-teal-400 to-cyan-600'
  },
  {
    id: 'st_dolphin',
    icon: '🐬',
    name: 'Cá Heo Vui Vẻ',
    desc: 'Bơi lội thông minh giữa biển kiến thức',
    rarity: 'common',
    bgGradient: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'st_crown',
    icon: '👑',
    name: 'Vương Miện Trí Tuệ',
    desc: 'Danh hiệu dành cho nhà vô địch',
    rarity: 'legendary',
    bgGradient: 'from-amber-300 via-yellow-400 to-orange-500'
  },
  {
    id: 'st_balloon',
    icon: '🎈',
    name: 'Bóng Bay Ước Mơ',
    desc: 'Ước mơ bay cao cùng tiếng Anh',
    rarity: 'common',
    bgGradient: 'from-red-400 to-pink-500'
  },
  {
    id: 'st_strawberry',
    icon: '🍓',
    name: 'Dâu Tây Xinh Xắn',
    desc: 'Bé học giỏi được cả nhà yêu thương',
    rarity: 'common',
    bgGradient: 'from-rose-400 to-pink-600'
  }
];

export const stickerService = {
  getUnlockedStickers(childId: string): string[] {
    try {
      const data = localStorage.getItem(`kc_stickers_${childId}`);
      if (!data) return ['st_star']; // default starter sticker
      return JSON.parse(data);
    } catch {
      return ['st_star'];
    }
  },

  awardRandomSticker(childId: string): StickerItem | null {
    try {
      const current = this.getUnlockedStickers(childId);
      const locked = ALL_STICKERS.filter(s => !current.includes(s.id));
      if (locked.length === 0) {
        // All unlocked, pick any to reward again
        const random = ALL_STICKERS[Math.floor(Math.random() * ALL_STICKERS.length)];
        return random;
      }
      const picked = locked[Math.floor(Math.random() * locked.length)];
      const nextList = [...current, picked.id];
      localStorage.setItem(`kc_stickers_${childId}`, JSON.stringify(nextList));
      return picked;
    } catch {
      return null;
    }
  }
};
