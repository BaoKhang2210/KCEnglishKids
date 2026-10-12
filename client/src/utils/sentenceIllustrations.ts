/**
 * Preschool Sentence Visual Illustration Utility
 *
 * Provides guaranteed, high-resolution vector SVG illustrations for preschool
 * sentence patterns, questions, answers, and dialogue.
 * 100% offline, zero latency, ultra-crisp on any 4K projector or mobile screen.
 */

export const makeSentenceSvg = (emoji: string, bg: string, label: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="36" fill="url(#g)"/>
  <circle cx="150" cy="130" r="75" fill="rgba(255,255,255,0.5)"/>
  <text x="50%" y="49%" font-size="105" dominant-baseline="middle" text-anchor="middle">${emoji}</text>
  <rect x="25" y="225" width="250" height="46" rx="23" fill="rgba(255,255,255,0.92)"/>
  <text x="50%" y="85%" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-weight="900" font-size="20" fill="#1e293b" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

interface VisualRule {
  rx: RegExp;
  emoji: string;
  bg: string;
  label: string;
}

const VISUAL_RULES: VisualRule[] = [
  // Animals
  { rx: /\b(cat|kitten)\b/i, emoji: '🐱', bg: '#FED7AA', label: 'Cat' },
  { rx: /\b(dog|puppy)\b/i, emoji: '🐶', bg: '#FDE68A', label: 'Dog' },
  { rx: /\b(bird|birds)\b/i, emoji: '🐦', bg: '#A7F3D0', label: 'Bird' },
  { rx: /\b(fish)\b/i, emoji: '🐟', bg: '#BAE6FD', label: 'Fish' },
  { rx: /\b(rabbit|bunny)\b/i, emoji: '🐰', bg: '#FECDD3', label: 'Rabbit' },
  { rx: /\b(turtle)\b/i, emoji: '🐢', bg: '#BBF7D0', label: 'Turtle' },
  { rx: /\b(hamster)\b/i, emoji: '🐹', bg: '#FED7AA', label: 'Hamster' },
  { rx: /\b(lizard)\b/i, emoji: '🦎', bg: '#A7F3D0', label: 'Lizard' },
  { rx: /\b(bear|teddy)\b/i, emoji: '🧸', bg: '#E2E8F0', label: 'Bear' },
  { rx: /\b(lion|leo)\b/i, emoji: '🦁', bg: '#FDE68A', label: 'Lion' },
  { rx: /\b(tiger)\b/i, emoji: '🐯', bg: '#FED7AA', label: 'Tiger' },
  { rx: /\b(monkey)\b/i, emoji: '🐒', bg: '#FED7AA', label: 'Monkey' },
  { rx: /\b(elephant)\b/i, emoji: '🐘', bg: '#E2E8F0', label: 'Elephant' },
  { rx: /\b(bee|bees)\b/i, emoji: '🐝', bg: '#FEF08A', label: 'Bee' },
  { rx: /\b(butterfly|butterflies)\b/i, emoji: '🦋', bg: '#FBCFE8', label: 'Butterfly' },
  { rx: /\b(cow)\b/i, emoji: '🐮', bg: '#FED7AA', label: 'Cow' },
  { rx: /\b(pig)\b/i, emoji: '🐷', bg: '#FECDD3', label: 'Pig' },
  { rx: /\b(horse)\b/i, emoji: '🐴', bg: '#FED7AA', label: 'Horse' },
  { rx: /\b(duck)\b/i, emoji: '🦆', bg: '#FEF08A', label: 'Duck' },
  { rx: /\b(sheep)\b/i, emoji: '🐑', bg: '#E2E8F0', label: 'Sheep' },
  { rx: /\b(chicken|hen)\b/i, emoji: '🐔', bg: '#FED7AA', label: 'Chicken' },

  // People & Family
  { rx: /\b(boy)\b/i, emoji: '👦', bg: '#BAE6FD', label: 'Boy' },
  { rx: /\b(girl|mia)\b/i, emoji: '👧', bg: '#FBCFE8', label: 'Girl' },
  { rx: /\b(baby)\b/i, emoji: '👶', bg: '#FED7AA', label: 'Baby' },
  { rx: /\b(teacher)\b/i, emoji: '👩‍🏫', bg: '#FED7AA', label: 'Teacher' },
  { rx: /\b(dad|father)\b/i, emoji: '👨', bg: '#BAE6FD', label: 'Dad' },
  { rx: /\b(mom|mother|mama)\b/i, emoji: '👩', bg: '#FBCFE8', label: 'Mom' },
  { rx: /\b(sister)\b/i, emoji: '👧', bg: '#FBCFE8', label: 'Sister' },
  { rx: /\b(brother)\b/i, emoji: '👦', bg: '#BAE6FD', label: 'Brother' },
  { rx: /\b(grandfather|grandpa)\b/i, emoji: '👴', bg: '#E2E8F0', label: 'Grandpa' },
  { rx: /\b(grandmother|grandma)\b/i, emoji: '👵', bg: '#FED7AA', label: 'Grandma' },
  { rx: /\b(family)\b/i, emoji: '👨‍👩‍👧‍👦', bg: '#FEF08A', label: 'Family' },
  { rx: /\b(friend|friends)\b/i, emoji: '👫', bg: '#BAE6FD', label: 'Friends' },
  { rx: /\b(name|hello|hi|goodbye)\b/i, emoji: '👋', bg: '#FDE68A', label: 'Hello' },

  // School & Tools
  { rx: /\b(school|classroom)\b/i, emoji: '🏫', bg: '#BAE6FD', label: 'School' },
  { rx: /\b(book|books)\b/i, emoji: '📖', bg: '#FEF08A', label: 'Book' },
  { rx: /\b(crayon|crayons|pencil|pen)\b/i, emoji: '🖍️', bg: '#FED7AA', label: 'Crayon' },
  { rx: /\b(chair|table|desk)\b/i, emoji: '🪑', bg: '#FED7AA', label: 'Chair' },
  { rx: /\b(bag|backpack)\b/i, emoji: '🎒', bg: '#FECDD3', label: 'Bag' },
  { rx: /\b(draw|drawing|art|paint)\b/i, emoji: '🎨', bg: '#DDD6FE', label: 'Art' },

  // Body Parts
  { rx: /\b(eye|eyes)\b/i, emoji: '👀', bg: '#BAE6FD', label: 'Eyes' },
  { rx: /\b(nose)\b/i, emoji: '👃', bg: '#FED7AA', label: 'Nose' },
  { rx: /\b(mouth)\b/i, emoji: '👄', bg: '#FECDD3', label: 'Mouth' },
  { rx: /\b(ear|ears)\b/i, emoji: '👂', bg: '#FED7AA', label: 'Ears' },
  { rx: /\b(face|cheeks|forehead)\b/i, emoji: '😊', bg: '#FEF08A', label: 'Face' },
  { rx: /\b(hair)\b/i, emoji: '💇', bg: '#FED7AA', label: 'Hair' },
  { rx: /\b(head)\b/i, emoji: '🧑', bg: '#BAE6FD', label: 'Head' },
  { rx: /\b(hand|hands|fingers)\b/i, emoji: '🖐️', bg: '#FED7AA', label: 'Hand' },
  { rx: /\b(arm|arms|elbow)\b/i, emoji: '💪', bg: '#FED7AA', label: 'Arms' },
  { rx: /\b(leg|legs|knee|knees)\b/i, emoji: '🦵', bg: '#FED7AA', label: 'Legs' },
  { rx: /\b(foot|feet)\b/i, emoji: '🦶', bg: '#FED7AA', label: 'Feet' },
  { rx: /\b(body)\b/i, emoji: '🧍', bg: '#BAE6FD', label: 'Body' },

  // Actions
  { rx: /\b(see|look|looking)\b/i, emoji: '👀', bg: '#FEF08A', label: 'See' },
  { rx: /\b(dance|dancing)\b/i, emoji: '💃', bg: '#FBCFE8', label: 'Dance' },
  { rx: /\b(run|running)\b/i, emoji: '🏃', bg: '#BAE6FD', label: 'Run' },
  { rx: /\b(crawl|crawling)\b/i, emoji: '🚼', bg: '#FED7AA', label: 'Crawl' },
  { rx: /\b(kick|kicking)\b/i, emoji: '⚽', bg: '#A7F3D0', label: 'Kick' },
  { rx: /\b(walk|walking)\b/i, emoji: '🚶', bg: '#E2E8F0', label: 'Walk' },
  { rx: /\b(jump|jumping)\b/i, emoji: '🦘', bg: '#FEF08A', label: 'Jump' },
  { rx: /\b(swim|swimming)\b/i, emoji: '🏊', bg: '#BAE6FD', label: 'Swim' },
  { rx: /\b(fly|flying)\b/i, emoji: '🕊️', bg: '#BAE6FD', label: 'Fly' },
  { rx: /\b(wash|soap|clean)\b/i, emoji: '🧼', bg: '#BAE6FD', label: 'Wash' },
  { rx: /\b(eat|eating)\b/i, emoji: '🍎', bg: '#FECDD3', label: 'Eat' },
  { rx: /\b(drink|drinking)\b/i, emoji: '🥛', bg: '#BAE6FD', label: 'Drink' },
  { rx: /\b(sing|song)\b/i, emoji: '🎤', bg: '#DDD6FE', label: 'Sing' },
  { rx: /\b(play|playing)\b/i, emoji: '🎈', bg: '#FEF08A', label: 'Play' },

  // Feelings
  { rx: /\b(happy)\b/i, emoji: '😊', bg: '#FEF08A', label: 'Happy' },
  { rx: /\b(sad)\b/i, emoji: '😢', bg: '#BAE6FD', label: 'Sad' },
  { rx: /\b(angry)\b/i, emoji: '😠', bg: '#FECDD3', label: 'Angry' },
  { rx: /\b(feel|feeling)\b/i, emoji: '🥰', bg: '#FBCFE8', label: 'Feelings' },

  // Food
  { rx: /\b(apple|apples)\b/i, emoji: '🍎', bg: '#FECDD3', label: 'Apple' },
  { rx: /\b(banana|bananas)\b/i, emoji: '🍌', bg: '#FEF08A', label: 'Banana' },
  { rx: /\b(orange|oranges)\b/i, emoji: '🍊', bg: '#FED7AA', label: 'Orange' },
  { rx: /\b(pear|pears)\b/i, emoji: '🍐', bg: '#BBF7D0', label: 'Pear' },
  { rx: /\b(grape|grapes)\b/i, emoji: '🍇', bg: '#DDD6FE', label: 'Grapes' },
  { rx: /\b(tomato|tomatoes)\b/i, emoji: '🍅', bg: '#FECDD3', label: 'Tomato' },
  { rx: /\b(carrot|carrots)\b/i, emoji: '🥕', bg: '#FED7AA', label: 'Carrot' },
  { rx: /\b(cucumber|cucumbers)\b/i, emoji: '🥒', bg: '#BBF7D0', label: 'Cucumber' },
  { rx: /\b(pineapple)\b/i, emoji: '🍍', bg: '#FEF08A', label: 'Pineapple' },
  { rx: /\b(potato|potatoes)\b/i, emoji: '🥔', bg: '#FED7AA', label: 'Potato' },
  { rx: /\b(food|foods|delicious)\b/i, emoji: '🥗', bg: '#BBF7D0', label: 'Food' },

  // Toys
  { rx: /\b(toy|toys)\b/i, emoji: '🧸', bg: '#FEF08A', label: 'Toys' },
  { rx: /\b(car|cars)\b/i, emoji: '🚗', bg: '#BAE6FD', label: 'Car' },
  { rx: /\b(ball|balls)\b/i, emoji: '⚽', bg: '#FED7AA', label: 'Ball' },
  { rx: /\b(doll|dolls)\b/i, emoji: '🪆', bg: '#FECDD3', label: 'Doll' },
  { rx: /\b(kite|kites)\b/i, emoji: '🪁', bg: '#FBCFE8', label: 'Kite' },
  { rx: /\b(train|trains)\b/i, emoji: '🚂', bg: '#BAE6FD', label: 'Train' },
  { rx: /\b(robot|robots)\b/i, emoji: '🤖', bg: '#DDD6FE', label: 'Robot' },
  { rx: /\b(slide)\b/i, emoji: '🛝', bg: '#FED7AA', label: 'Slide' },
  { rx: /\b(swing|swings)\b/i, emoji: '🎪', bg: '#BAE6FD', label: 'Swing' },
  { rx: /\b(park|playground)\b/i, emoji: '🏞️', bg: '#BBF7D0', label: 'Park' },

  // Places & Home
  { rx: /\b(house|home)\b/i, emoji: '🏠', bg: '#FED7AA', label: 'House' },
  { rx: /\b(apartment|building)\b/i, emoji: '🏢', bg: '#BAE6FD', label: 'Apartment' },
  { rx: /\b(city)\b/i, emoji: '🏙️', bg: '#BAE6FD', label: 'City' },
  { rx: /\b(farm)\b/i, emoji: '🚜', bg: '#BBF7D0', label: 'Farm' },
  { rx: /\b(door)\b/i, emoji: '🚪', bg: '#FED7AA', label: 'Door' },
  { rx: /\b(window)\b/i, emoji: '🪟', bg: '#BAE6FD', label: 'Window' },
  { rx: /\b(tree|trees)\b/i, emoji: '🌳', bg: '#BBF7D0', label: 'Tree' },
  { rx: /\b(flower|flowers)\b/i, emoji: '🌸', bg: '#FBCFE8', label: 'Flower' },
  { rx: /\b(sun|sunny)\b/i, emoji: '☀️', bg: '#FEF08A', label: 'Sun' },
  { rx: /\b(cloud|clouds)\b/i, emoji: '☁️', bg: '#BAE6FD', label: 'Cloud' },

  // Affirmations & Negations
  { rx: /\b(yes)\b/i, emoji: '👍', bg: '#A7F3D0', label: 'Yes!' },
  { rx: /\b(no|not|isn't|can't|don't)\b/i, emoji: '✋', bg: '#FECDD3', label: 'No' },

  // Colors
  { rx: /\b(red)\b/i, emoji: '🔴', bg: '#FECDD3', label: 'Red' },
  { rx: /\b(blue)\b/i, emoji: '🔵', bg: '#BAE6FD', label: 'Blue' },
  { rx: /\b(yellow)\b/i, emoji: '🟡', bg: '#FEF08A', label: 'Yellow' },
  { rx: /\b(green)\b/i, emoji: '🟢', bg: '#BBF7D0', label: 'Green' }
];

/**
 * Resolves a high-quality illustration URL for any sentence pattern or answer.
 * If fallbackUrl is provided and non-empty, it is preferred.
 */
export const getSentenceIllustration = (
  text?: string,
  fallbackUrl?: string | null,
  isAnswer = false
): string => {
  if (fallbackUrl && typeof fallbackUrl === 'string' && fallbackUrl.trim().length > 0) {
    return fallbackUrl;
  }

  const s = String(text || '').trim();

  // If answer is simple Yes/No
  if (isAnswer) {
    if (/^\s*yes\b/i.test(s)) return makeSentenceSvg('👍', '#A7F3D0', 'YES!');
    if (/^\s*(no|not)\b/i.test(s)) return makeSentenceSvg('✋', '#FECDD3', 'NO!');
  }

  // Match keyword rules
  for (const rule of VISUAL_RULES) {
    if (rule.rx.test(s)) {
      return makeSentenceSvg(rule.emoji, rule.bg, rule.label);
    }
  }

  // Contextual fallback
  if (isAnswer) {
    return makeSentenceSvg('💡', '#FEF08A', 'ANSWER');
  }
  if (s.includes('?')) {
    return makeSentenceSvg('❓', '#DDD6FE', 'QUESTION');
  }
  return makeSentenceSvg('💬', '#BAE6FD', 'SAY IT!');
};
