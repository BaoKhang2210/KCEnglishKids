/**
 * Sentence-pattern teaching controller (teacher-facing, read-only).
 *
 * Serves the `languagecontents` collection (PATTERN / SENTENCE / QUESTION /
 * ANSWER / ORACY / DIALOGUE docs) so teachers can teach sentence patterns
 * on the classroom screen. Previously this collection was orphaned — no API.
 */
const mongoose = require('mongoose');
const { LanguageContent, CurriculumUnit, Lesson } = require('../models');

// Types worth teaching out loud on the class screen (WORDS/SENTENCES are skipped)
const TEACHING_TYPES = ['PATTERN', 'SENTENCE', 'QUESTION', 'ANSWER', 'ORACY', 'DIALOGUE'];
// Teaching order on screen: pattern → sentence → question → answer → oracy
const TYPE_ORDER = { PATTERN: 0, SENTENCE: 1, QUESTION: 2, ANSWER: 3, ORACY: 4, DIALOGUE: 5 };
const validId = id => mongoose.isValidObjectId(id);
const invalid = (res, message) => res.status(400).json({ success: false, message });
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Preschool Vector SVG Illustration Generator for Classroom Screen Display
const makeVisualSvg = (emoji, bg, label) => {
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

const VISUAL_RULES = [
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

const resolveSentenceVisual = (text, topicName, existingImg, isAnswer = false) => {
  if (existingImg && typeof existingImg === 'string' && existingImg.trim().length > 0) {
    return existingImg;
  }

  const s = String(text || '').trim();

  // If answer is simple Yes/No
  if (isAnswer) {
    if (/^\s*yes\b/i.test(s)) return makeVisualSvg('👍', '#A7F3D0', 'YES!');
    if (/^\s*(no|not)\b/i.test(s)) return makeVisualSvg('✋', '#FECDD3', 'NO!');
  }

  // Match keyword rules
  for (const rule of VISUAL_RULES) {
    if (rule.rx.test(s)) {
      return makeVisualSvg(rule.emoji, rule.bg, rule.label);
    }
  }

  if (topicName) {
    for (const rule of VISUAL_RULES) {
      if (rule.rx.test(topicName)) {
        return makeVisualSvg(rule.emoji, rule.bg, rule.label);
      }
    }
  }

  // Contextual fallback
  if (isAnswer) {
    return makeVisualSvg('💡', '#FEF08A', 'ANSWER');
  }
  if (s.includes('?')) {
    return makeVisualSvg('❓', '#DDD6FE', 'QUESTION');
  }
  return makeVisualSvg('💬', '#BAE6FD', 'SAY IT!');
};

// Deterministic classroom order: book → unit → lesson → content type → difficulty
const byTeachingOrder = (a, b) => {
  const ua = a.sourceUnit || {}, ub = b.sourceUnit || {};
  return (
    (ua.bookNumber || 0) - (ub.bookNumber || 0) ||
    (ua.unitNumber || 0) - (ub.unitNumber || 0) ||
    ((a.lesson?.displayOrder || 0) - (b.lesson?.displayOrder || 0)) ||
    ((TYPE_ORDER[a.contentType] ?? 9) - (TYPE_ORDER[b.contentType] ?? 9)) ||
    ((a.difficulty || 1) - (b.difficulty || 1)) ||
    String(a.english || '').localeCompare(String(b.english || ''), 'en', { sensitivity: 'base' })
  );
};

/**
 * GET /api/teacher/sentence-patterns
 * Query: ageGroupCode, unitId, lessonId, topicId, contentType (csv), search
 * Returns teaching-ready rows: english, vietnamese, pronunciation, topic,
 * lesson, sourceUnit, vocabulary, audioUrl / imageUrl resolved from Media.
 */
exports.list = async (req, res, next) => {
  try {
    const { ageGroupCode, unitId, lessonId, topicId, contentType, search } = req.query;
    const q = { status: 'ACTIVE' };

    if (ageGroupCode) q.ageGroupCode = ageGroupCode;
    if (unitId) { if (!validId(unitId)) return invalid(res, 'Invalid unit id.'); q.sourceUnit = unitId; }
    if (topicId) { if (!validId(topicId)) return invalid(res, 'Invalid topic id.'); q.topic = topicId; }

    // Lesson relation is stored on the lesson side (lesson.languageContents) —
    // support both directions, sourceUnit and topic fallbacks so every lesson resolves relevant patterns.
    if (lessonId) {
      if (!validId(lessonId)) return invalid(res, 'Invalid lesson id.');
      const lessonDoc = await Lesson.findById(lessonId).select('languageContents curriculumUnits topic ageGroupCode').lean();
      if (!lessonDoc) return invalid(res, 'Lesson not found.');

      const orConditions = [
        { lesson: lessonId },
        { _id: { $in: lessonDoc.languageContents || [] } }
      ];
      if (Array.isArray(lessonDoc.curriculumUnits) && lessonDoc.curriculumUnits.length > 0) {
        orConditions.push({ sourceUnit: { $in: lessonDoc.curriculumUnits } });
      }
      if (lessonDoc.topic) {
        orConditions.push({ topic: lessonDoc.topic });
      }
      (q.$and = q.$and || []).push({ $or: orConditions });
    }


    // contentType filter — csv of enum values, defaults to all teaching types
    const requested = String(contentType || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    const types = requested.length ? requested.filter(x => TEACHING_TYPES.includes(x)) : TEACHING_TYPES;
    if (requested.length && !types.length) return invalid(res, 'No valid content type requested.');
    q.contentType = { $in: types };

    if (search && String(search).trim()) {
      const rx = { $regex: esc(String(search).trim()), $options: 'i' };
      (q.$and = q.$and || []).push({ $or: [{ english: rx }, { vietnamese: rx }, { pronunciation: rx }] });
    }

    const rows = await LanguageContent.find(q)
      .populate('topic', 'englishName vietnameseName')
      .populate('lesson', 'title vietnameseTitle displayOrder')
      .populate('sourceUnit', 'unitNumber bookNumber bigQuestion ageGroupCode')
      .populate('vocabulary', 'english vietnamese imageUrl audioUrl')
      .populate('audioMedia', 'url mimeType duration')
      .populate('imageMedia', 'url thumbnail')
      .sort({ difficulty: 1 })
      .lean();

    // Natural curriculum order: book → unit → lesson → MongoDB insertion sequence (_id)
    const byCurriculumSequence = (a, b) => {
      const ua = a.sourceUnit || {}, ub = b.sourceUnit || {};
      const diffBook = (ua.bookNumber || 0) - (ub.bookNumber || 0);
      if (diffBook !== 0) return diffBook;
      const diffUnit = (ua.unitNumber || 0) - (ub.unitNumber || 0);
      if (diffUnit !== 0) return diffUnit;
      const diffLesson = (a.lesson?.displayOrder || 0) - (b.lesson?.displayOrder || 0);
      if (diffLesson !== 0) return diffLesson;
      return String(a._id).localeCompare(String(b._id));
    };

    rows.sort(byCurriculumSequence);

    // Reverse lesson lookup — lesson.languageContents is the authoritative link
    const lessons = await Lesson.find({ languageContents: { $in: rows.map(r => r._id) } })
      .select('title vietnameseTitle displayOrder languageContents')
      .lean();
    const lessonByContent = new Map();
    lessons.forEach(l => (l.languageContents || []).forEach(cid => lessonByContent.set(String(cid), l)));

    // Build paired teaching items
    const byType = {};
    const absorbedAnswerIds = new Set();
    const pairedItems = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      byType[r.contentType] = (byType[r.contentType] || 0) + 1;

      const itemAnswers = [];

      if (r.contentType === 'QUESTION') {
        // Collect following consecutive answers in the same unit
        let j = i + 1;
        while (
          j < rows.length &&
          rows[j].contentType === 'ANSWER' &&
          String(rows[j].sourceUnit?._id || '') === String(r.sourceUnit?._id || '')
        ) {
          const ans = rows[j];
          absorbedAnswerIds.add(String(ans._id));
          itemAnswers.push({
            _id: ans._id,
            english: ans.english,
            vietnamese: ans.vietnamese || '',
            pronunciation: ans.pronunciation || '',
            audioUrl: ans.audioMedia?.url || null,
            imageUrl: resolveSentenceVisual(
              ans.english,
              r.topic?.englishName,
              ans.imageMedia?.url || ans.imageMedia?.thumbnail || null,
              true
            )
          });
          j++;
        }
      } else if (r.contentType === 'PATTERN') {
        // Patterns like "Is she happy? Yes, she is."
        if (r.english && r.english.includes('?')) {
          const parts = r.english.split('?');
          const aPart = parts.slice(1).join('?').trim();
          let viAPart = '';
          if (r.vietnamese && r.vietnamese.includes('?')) {
            viAPart = r.vietnamese.split('?').slice(1).join('?').trim();
          }
          if (aPart) {
            itemAnswers.push({
              _id: `${r._id}_ans`,
              english: aPart,
              vietnamese: viAPart,
              pronunciation: '',
              audioUrl: null,
              imageUrl: resolveSentenceVisual(aPart, r.topic?.englishName, null, true)
            });
          }
        }
      } else if (r.contentType === 'ORACY' || r.contentType === 'DIALOGUE') {
        // Check if pattern contains ? or consecutive dialogue
        if (r.english && r.english.includes('?')) {
          const parts = r.english.split('?');
          const turn2 = parts.slice(1).join('?').trim();
          let viTurn2 = '';
          if (r.vietnamese && r.vietnamese.includes('?')) {
            viTurn2 = r.vietnamese.split('?').slice(1).join('?').trim();
          }
          if (turn2) {
            itemAnswers.push({
              _id: `${r._id}_turn2`,
              english: turn2,
              vietnamese: viTurn2,
              pronunciation: '',
              audioUrl: null,
              imageUrl: resolveSentenceVisual(turn2, r.topic?.englishName, null, true)
            });
          }
        }
      }

      pairedItems.push({
        _id: r._id,
        contentType: r.contentType,
        english: r.english,
        vietnamese: r.vietnamese || '',
        pronunciation: r.pronunciation || '',
        ageGroupCode: r.ageGroupCode || '',
        difficulty: r.difficulty || 1,
        topic: r.topic || null,
        lesson: r.lesson || lessonByContent.get(String(r._id)) || null,
        sourceUnit: r.sourceUnit || null,
        vocabulary: r.vocabulary || [],
        audioUrl: r.audioMedia?.url || null,
        imageUrl: resolveSentenceVisual(
          r.english,
          r.topic?.englishName,
          r.imageMedia?.url || r.imageMedia?.thumbnail || r.vocabulary?.[0]?.imageUrl || null,
          false
        ),
        answers: itemAnswers,
        hasAnswers: itemAnswers.length > 0
      });
    }

    // If paired mode is requested or by default in classroom teaching:
    // If the teacher didn't specifically filter by 'ANSWER', exclude absorbed answers from the top-level cards
    const shouldFilterAbsorbed = req.query.paired === 'true' || (!requested.includes('ANSWER') && requested.length === 0);
    const data = shouldFilterAbsorbed
      ? pairedItems.filter(item => !absorbedAnswerIds.has(String(item._id)))
      : pairedItems;

    res.json({
      success: true,
      count: data.length,
      totalRawCount: rows.length,
      meta: { types, byType, pairedCount: data.filter(d => d.hasAnswers).length },
      data
    });
  } catch (e) { next(e); }
};

/**
 * GET /api/teacher/sentence-patterns/units-overview
 * Query: ageGroupCode, contentType
 * Aggregated counts per curriculum unit — drives the unit picker so teachers
 * only see units that actually have teachable sentence content.
 */
exports.unitsOverview = async (req, res, next) => {
  try {
    const { ageGroupCode, contentType } = req.query;
    const requested = String(contentType || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    const types = requested.length ? requested.filter(x => TEACHING_TYPES.includes(x)) : TEACHING_TYPES;
    if (requested.length && !types.length) return invalid(res, 'No valid content type requested.');

    const match = { status: 'ACTIVE', sourceUnit: { $ne: null }, contentType: { $in: types } };
    if (ageGroupCode) match.ageGroupCode = ageGroupCode;

    const groups = await LanguageContent.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sourceUnit',
          sentenceCount: { $sum: 1 },
          ageGroupCodes: { $addToSet: '$ageGroupCode' },
          contentIds: { $push: '$_id' },
          byType: { $push: '$contentType' }
        }
      }
    ]);

    // Reverse lesson count: lesson.languageContents is the authoritative link
    const contentToUnit = new Map();
    groups.forEach(g => g.contentIds.forEach(cid => contentToUnit.set(String(cid), String(g._id))));
    const lessons = await Lesson.find({ languageContents: { $in: groups.flatMap(g => g.contentIds) } })
      .select('languageContents')
      .lean();
    const lessonsByUnit = new Map();
    lessons.forEach(l => {
      new Set((l.languageContents || []).map(cid => contentToUnit.get(String(cid))).filter(Boolean))
        .forEach(u => lessonsByUnit.set(u, (lessonsByUnit.get(u) || 0) + 1));
    });

    const units = await CurriculumUnit.find({ _id: { $in: groups.map(g => g._id) } })
      .populate('book', 'title bookNumber ageGroupCode')
      .lean();
    const unitMap = new Map(units.map(u => [String(u._id), u]));

    const data = groups
      .map(g => {
        const u = unitMap.get(String(g._id));
        if (!u) return null;
        const byType = {};
        g.byType.forEach(t => { byType[t] = (byType[t] || 0) + 1; });
        return {
          unitId: u._id,
          unitNumber: u.unitNumber,
          bookNumber: u.bookNumber || u.book?.bookNumber || 0,
          bookTitle: u.book?.title || '',
          bigQuestion: u.bigQuestion || '',
          ageGroupCode: u.ageGroupCode || g.ageGroupCodes.find(Boolean) || '',
          sentenceCount: g.sentenceCount,
          lessonCount: lessonsByUnit.get(String(g._id)) || 0,
          byType
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.bookNumber - b.bookNumber) || (a.unitNumber - b.unitNumber));

    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};
