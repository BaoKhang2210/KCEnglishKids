/** Each achievement has its own illustration; never select artwork by requirement type. */
const oldCollection = '/images/rewards/koko-friends-v1/';
const newCollection = '/images/rewards/koko-badges-v2/';

export const badgeArtwork: Record<string, string> = {
  b_first_step: newCollection + 'first-step.png',
  b_unit_1: newCollection + 'school-bag.png',
  b_animals: oldCollection + 'badge-lesson.png',
  b_food: newCollection + 'little-explorer.png',
  b_toys: newCollection + 'daily-reader.png',
  b_nature: newCollection + 'steady-turtle.png',
  b_home: newCollection + 'book-friend.png',
  b_unit_3: oldCollection + 'badge-unit.png',
  b_unit_5: newCollection + 'discovery-ambassador.png',
  b_unit_all: newCollection + 'conqueror-king.png',
  b_star_5: newCollection + 'bright-star.png',
  b_star_12: newCollection + 'little-superstar.png',
  b_star_25: oldCollection + 'badge-star.png',
  b_star_40: newCollection + 'radiant-sun.png',
  b_streak: newCollection + 'star-bee.png',
  b_flame_3: oldCollection + 'badge-streak.png',
  b_flame_7: newCollection + 'happy-week.png',
  b_flame_30: newCollection + 'friendly-volcano.png',
  b_quiz_master: newCollection + 'little-bullseye.png',
  b_memory: newCollection + 'persistent-friend.png',
  b_pronounce: newCollection + 'six-lesson-summit.png',
  b_chest: newCollection + 'golden-hands.png',
  b_perfect_5: oldCollection + 'badge-perfect.png',
  b_chest_collector: oldCollection + 'badge-chest.png',
  b_master: newCollection + 'english-ambassador.png',
};
