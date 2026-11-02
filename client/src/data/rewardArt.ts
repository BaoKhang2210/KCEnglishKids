import { customRewardArt } from './customRewardArt';
/** Microsoft Fluent Emoji 3D, MIT. Packaged locally for reliable/offline rewards.
 * Source revision and full license: public/images/rewards/fluent-3d/. */
const names: Record<string, string> = {
  '🐾': 'paw_prints', '🎒': 'backpack', '🐶': 'dog_face', '🍎': 'red_apple',
  '🧸': 'teddy_bear', '🌳': 'deciduous_tree', '🏡': 'house_with_garden', '🧭': 'compass',
  '🌈': 'rainbow', '👑': 'crown', '⭐': 'star', '🌟': 'glowing_star', '✨': 'sparkles',
  '☀️': 'sun', '🐝': 'honeybee', '🔥': 'fire', '📅': 'calendar', '🌋': 'volcano',
  '🎯': 'bullseye', '🧠': 'brain', '🔊': 'speaker_high_volume', '💎': 'gem_stone',
  '🥇': '1st_place_medal', '🗝️': 'old_key', '🏆': 'trophy', '🦁': 'lion', '🐯': 'tiger_face',
  '🐼': 'panda', '🚀': 'rocket', '🦄': 'unicorn', '🦖': 't-rex', '🎨': 'artist_palette',
  '🐬': 'dolphin', '🎈': 'balloon', '🍓': 'strawberry',
};
export const rewardArt = (symbol: string) => customRewardArt(symbol) || (names[symbol] ? `/images/rewards/fluent-3d/${names[symbol]}_3d.png` : undefined);
