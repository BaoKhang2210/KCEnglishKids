const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const {
  AgeGroup,
  CurriculumBook,
  CurriculumUnit,
  Media,
  Topic,
  Vocabulary,
  LanguageContent,
  Lesson,
  Activity,
  User,
  ClassRoom,
  LearningSession,
  ActivityResult,
  Progress
} = require('../models');

// Modular Dataset Imports
const { AGE_GROUPS_DATA, BOOKS_DATA, UNITS_DATA } = require('./curriculumData');
const { TOPICS_DATA } = require('./topicData');
const { VOCABULARY_DATA } = require('./vocabularyData');
const { LANGUAGE_CONTENT_DATA } = require('./languageContentData');
const { LESSONS_DATA } = require('./lessonData');
const { getSensibleSentence } = require('./sentenceDictionary');
const { buildActivitiesForLesson } = require('./activityData');

// Vibrant palette for child cards
const BG_COLORS = [
  '#FFE0B2', '#FFCDD2', '#F8BBD0', '#B3E5FC', '#C8E6C9',
  '#DCEDC8', '#FFF9C4', '#D1C4E9', '#E1BEE7', '#FFCCBC',
  '#CFD8DC', '#B2DFDB', '#D7CCC8', '#F0F4C3', '#BBDEFB'
];

// Rich emoji mapping for curriculum words
const EMOJI_MAP = {
  // Animals
  dog: '🐶', cat: '🐱', rabbit: '🐰', fish: '🐟', bird: '🐦', turtle: '🐢', hamster: '🐹', lizard: '🦎',
  cow: '🐮', hen: '🐔', duck: '🦆', horse: '🐴', sheep: '🐑', calf: '🐮', lamb: '🐑', duckling: '🦆', chick: '🐥', foal: '🐴',
  monkey: '🐵', lion: '🦁', giraffe: '🦒', tiger: '🐯', bear: '🐻', elephant: '🐘', snake: '🐍', whale: '🐋', eagle: '🦅', shark: '🦈', kangaroo: '🦘', toucan: '🦜',
  paw: '🐾', fin: '🐟', beak: '🦜', trunk: '🐘', tail: '🐕', wing: '🪶', frog: '🐸', bee: '🐝', butterfly: '🦋',
  // Food
  apple: '🍎', pear: '🍐', tomato: '🍅', carrot: '🥕', bananas: '🍌', banana: '🍌', grapes: '🍇', cucumbers: '🥒', cucumber: '🥒', lettuce: '🥬', pineapple: '🍍', orange: '🍊', potato: '🥔', peas: '🟢',
  breakfast: '🍳', lunch: '🥪', dinner: '🍲', eggs: '🥚', egg: '🥚', chicken: '🍗', salad: '🥗', pancakes: '🥞', water: '💧', soup: '🥣', rice: '🍚', milk: '🥛', cereal: '🥣', orange_juice: '🧃', strawberries: '🍓', strawberry: '🍓',
  steak: '🥩', beans: '🫘', lemonade: '🍋', soda: '🥤', french_fries: '🍟', spaghetti: '🍝', pizza: '🍕', ice_cream: '🍨', chocolate_cake: '🎂', cake: '🎂', vegetables: '🥦', cheeseburger: '🍔', candy: '🍬',
  // School & Tools
  teacher: '👩‍🏫', boy: '👦', girl: '👧', school: '🏫', book: '📖', crayon: '🖍️', chair: '🪑', table: '🪵',
  pencil: '✏️', marker: '🖊️', paintbrush: '🖌️', glue_stick: '🧴', glue: '🧴', scissors: '✂️', paint: '🎨', draw: '✏️', color: '🖍️', cut: '✂️',
  computer: '💻', use_a_computer: '💻', music: '🎵', play_music: '🎵', english: '🇬🇧', speak_english: '🗣️',
  science: '🔬', math: '📐', writing: '✍️', reading: '📚', physical_education: '🏃',
  read_books: '📚', sing_songs: '🎤', tidy_up: '🧹', eat_lunch: '🍱', play_with_friends: '🤝',
  // Days
  monday: '📅', tuesday: '📅', wednesday: '📅', thursday: '📅', friday: '📅',
  // Toys
  car: '🚗', teddy_bear: '🧸', doll: '🪆', ball: '⚽', kite: '🪁', tricycle: '🚲', blocks: '🧱', yo_yo: '🪀', train: '🚂', puzzle: '🧩', board_game: '🎲', robot: '🤖',
  // Body & Feelings
  face: '🙂', hair: '💇', eyes: '👀', nose: '👃', forehead: '🧒', mouth: '👄', ears: '👂', cheeks: '😊',
  happy: '😄', sad: '😢', angry: '😡', shy: '🙈', silly: '🤪', scared: '😱', excited: '🤩', surprised: '😲', bored: '🥱',
  tired: '🥱', thirsty: '🥤', dirty: '🧼', hungry: '🍽️', sick: '🤒',
  arms: '💪', hands: '✋', legs: '🦵', feet: '🦶', fingers: '🖐️', head: '🗣️', elbow: '🦾', knee: '🦵',
  scream: '😱', jump_up_and_down: '🦘', shout_hooray: '🙌', yawn: '🥱', cry: '😢', laugh: '😂',
  run: '🏃', dance: '💃', crawl: '🐛', kick: '🦵', walk: '🚶', jump: '🦘', swim: '🏊', fly: '🕊️',
  // Senses
  see: '👀', touch: '🖐️', hear: '👂', smell: '👃', taste: '👅', soft: '🧸', rough: '🪨', smooth: '🧊', good: '👍', bad: '👎', sweet: '🍭', salty: '🥨', loud: '📢', quiet: '🤫', beautiful: '✨',
  // Family & People
  family: '👨‍👩‍👧', father: '👨', mother: '👩', sister: '👧', brother: '👦', grandfather: '👴', grandmother: '👵', baby: '👶',
  dad: '👨', mom: '👩', aunt: '👩', uncle: '👨', cousin: '🧑', child: '🧒', children: '🧒👦', woman: '👩', women: '👩‍🦰', man: '👨', men: '👨‍🦱',
  young: '🧒', old: '👴', short: '👦', tall: '🦒', thin: '🧍', blond: '👱', red: '🔴', long: '📏', curly: '➰', straight: '➖',
  leo: '🦁', tickles: '🐱', mia: '👧',
  // Clothes & Weather
  pants: '👖', shoes: '👟', t_shirt: '👕', skirt: '👗', sweater: '🧥', socks: '🧦', jacket: '🧥', boots: '👢', raincoat: '🧥', dress: '👗',
  sunny: '☀️', cloudy: '☁️', rainy: '🌧️', snowy: '❄️', windy: '💨', sun: '☀️', cloud: '☁️', sky: '🌤️',
  // Places & Home
  house: '🏠', door: '🚪', window: '🪟', street: '🛣️', park: '🏞️', playground: '🛝', market: '🏪', toy_store: '🧸',
  city: '🏙️', country: '🏡', farm: '🚜', apartment_building: '🏢',
  living_room: '🛋️', dining_room: '🍽️', kitchen: '🍳', bedroom: '🛏️', bathroom: '🛁', bed: '🛏️', couch: '🛋️', shower: '🚿', lamp: '💡', fridge: '🧊',
  cook: '🍳', sweep_the_floor: '🧹', set_the_table: '🍽️', watch_tv: '📺', make_the_bed: '🛏️',
  wash_my_face: '🧼', brush_my_hair: '🪮', eat_healthy_food: '🥗', put_on_a_jacket: '🧥', drink_water: '💧',
  toothbrush: '🪥', brush: '🪮', soap: '🧼', towel: '🧖', jump_rope: '🪢',
  // Transport & Travel
  bus: '🚌', airplane: '✈️', boat: '⛵', bike: '🚲', helicopter: '🚁', ship: '🚢', air: '✈️', land: '🚗',
  beach: '🏖️', mountains: '⛰️', forest: '🌲', lake: '🏞️', summer_camp: '⛺', amusement_park: '🎡',
  flashlight: '🔦', sleeping_bag: '🏕️', sunglasses: '🕶️', cap: '🧢', backpack: '🎒',
  build_a_sandcastle: '🏰', hike: '🥾', make_a_campfire: '🔥', go_on_rides: '🎢', row_a_boat: '🚣', ride_a_horse: '🏇',
  // Community
  firefighter: '👨‍🚒', doctor: '👩‍⚕️', chef: '👨‍🍳', police_officer: '👮', mail_carrier: '📬', cashier: '🧑‍💼',
  fire_station: '🚒', hospital: '🏥', restaurant: '🍽️', post_office: '🏣', police_station: '🚓', grocery_store: '🛒',
  put_out_fires: '🧯', take_care_of_people: '🩺', cook_food: '🍳', keep_people_safe: '🛡️', deliver_mail: '✉️', ring_up_groceries: '🧾',
  waiter: '🤵', menu: '📜', drink: '🥤', main_dish: '🍲', side_dish: '🍟', dessert: '🍰',
  // Routines
  get_up: '⏰', get_dressed: '👕', have_breakfast: '🍳', go_to_school: '🎒', go_home: '🏠', do_homework: '📝',
  dance_class: '🩰', soccer_practice: '⚽', music_lessons: '🎹', swimming_lessons: '🏊', gymnastics: '🤸',
  eat_dinner: '🍲', take_a_bath: '🛁', brush_teeth: '🪥', put_on_pajamas: '🩳', read_a_book: '📖', go_to_bed: '🛌',
  // Environment & Plants
  tree: '🌳', flower: '🌸', grass: '🌱', slide: '🛝', swing: '🪑', seesaw: '🪵', monkey_bars: '🪜',
  plant: '🪴', soil: '🌱', seed: '🌱', shovel: '🧑‍🌾', hole: '🕳️', watering_can: '🚿', petals: '🌺', leaves: '🍃', stem: '🎋', roots: '🪵',
  natural: '🌿', human_made: '🧱', rock: '🪨', paper: '📄', plastic_bottle: '🧴', cardboard_box: '📦', soda_can: '🥫', newspaper: '📰',
  spoon: '🥄', jar: '🫙', glass_bottle: '🍾', plastic_bag: '🛍️', cloth_bag: '👜', recycle: '♻️', trash: '🗑️', turn_on: '💡', turn_off: '🔌',
  feed_the_ducks: '🦆', milk_the_cows: '🥛', groom_the_horses: '🐴', shear_the_sheep: '🐑', collect_the_eggs: '🥚',
  candle: '🕯️', balloon: '🎈', present: '🎁', party_hat: '🥳'
};

const createCardSvg = (text, bg, emoji) => {
  const safeText = (text || '').toUpperCase();
  const safeEmoji = emoji || '🌟';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="44" fill="${bg}"/>
    <circle cx="120" cy="110" r="65" fill="rgba(255,255,255,0.4)"/>
    <text x="120" y="125" font-size="70" text-anchor="middle" dominant-baseline="middle">${safeEmoji}</text>
    <rect x="20" y="186" width="200" height="38" rx="19" fill="rgba(255,255,255,0.92)"/>
    <text x="120" y="210" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="15" font-weight="bold" fill="#2D3748" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

async function seedDatabase() {
  try {
    await connectDB();
    console.log('==================================================');
    console.log('[Seed] Connected to MongoDB. Starting full learning content dataset...');
    console.log('==================================================');

    // 0. Clear collections idempotently
    console.log('[Seed] 1/9 Clearing collections to maintain idempotent consistency...');
    await Promise.all([
      AgeGroup.deleteMany({}),
      CurriculumBook.deleteMany({}),
      CurriculumUnit.deleteMany({}),
      Media.deleteMany({}),
      Topic.deleteMany({}),
      Vocabulary.deleteMany({}),
      LanguageContent.deleteMany({}),
      Lesson.deleteMany({}),
      Activity.deleteMany({}),
      User.deleteMany({}),
      ClassRoom.deleteMany({}),
      LearningSession.deleteMany({}),
      ActivityResult.deleteMany({}),
      Progress.deleteMany({})
    ]);
    console.log('[Seed] Collections cleared successfully.');

    // 1. Seed Age Groups (3)
    console.log('[Seed] 2/9 Seeding 3 Age Groups...');
    const ageGroupsMap = {};
    for (const ag of AGE_GROUPS_DATA) {
      const created = await AgeGroup.create(ag);
      ageGroupsMap[ag.code] = created;
    }

    // 2. Seed Curriculum Books (3)
    console.log('[Seed] 3/9 Seeding 3 Curriculum Books...');
    const booksMap = {};
    for (const b of BOOKS_DATA) {
      const created = await CurriculumBook.create({
        bookNumber: b.bookNumber,
        title: b.title,
        ageGroup: ageGroupsMap[b.ageGroupCode]._id,
        ageGroupCode: b.ageGroupCode,
        description: b.description,
        totalUnits: b.totalUnits
      });
      booksMap[b.bookNumber] = created;
    }

    // 3. Seed 27 Official Curriculum Units
    console.log('[Seed] 4/9 Seeding 27 Official Curriculum Units (9 per book)...');
    const unitsMap = {};
    let demoUnit5Ref = null;

    for (const u of UNITS_DATA) {
      const createdUnit = await CurriculumUnit.create({
        book: booksMap[u.bookNumber]._id,
        bookNumber: u.bookNumber,
        ageGroup: ageGroupsMap[u.ageGroupCode]._id,
        ageGroupCode: u.ageGroupCode,
        unitNumber: u.unitNumber,
        bigQuestion: u.bigQuestion,
        storyTitle: u.storyTitle,
        values: u.values,
        concept: u.concept,
        oracy: u.oracy,
        crossCurricular: u.crossCurricular,
        numeracy: u.numeracy,
        project: u.project,
        vocabularyReferences: u.vocabularyReferences,
        languagePatterns: u.languagePatterns,
        sourceType: 'OFFICIAL_CURRICULUM',
        displayOrder: u.unitNumber,
        status: 'ACTIVE'
      });

      const key = `B${u.bookNumber}_U${u.unitNumber}`;
      unitsMap[key] = createdUnit;

      if (u.bookNumber === 1 && u.unitNumber === 5) {
        demoUnit5Ref = createdUnit;
      }
    }

    // 4. Seed 19 Application Topics
    console.log('[Seed] 5/9 Seeding 19 Application Topics...');
    const allAgeGroupIds = Object.values(ageGroupsMap).map(ag => ag._id);
    const allAgeCodes = ['3-4', '4-5', '5-6'];
    const topicsMap = {};

    for (const t of TOPICS_DATA) {
      const topicDoc = await Topic.create({
        englishName: t.englishName,
        vietnameseName: t.vietnameseName,
        slug: t.slug,
        description: t.description,
        icon: t.icon,
        colorCode: t.colorCode,
        ageGroups: allAgeGroupIds,
        ageGroupCodes: allAgeCodes,
        relatedUnits: t.slug === 'animals' && demoUnit5Ref ? [demoUnit5Ref._id] : [],
        displayOrder: t.displayOrder,
        status: 'ACTIVE',
        featured: t.featured
      });
      topicsMap[t.slug] = topicDoc;
    }

    // 5. Seed Media References & 384 Deduplicated Vocabulary
    console.log('[Seed] 6/9 Generating Media References & Seeding 384 Deduplicated Vocabulary items...');
    const mediaDocsToInsert = [];
    let mediaKeyCounter = 0;

    // Build media docs in memory
    VOCABULARY_DATA.forEach((v, idx) => {
      const norm = v.normalizedText;
      const cleanKey = norm.replace(/[^a-z0-9]/g, '_');
      const emoji = EMOJI_MAP[cleanKey] || EMOJI_MAP[cleanKey.split('_')[0]] || '✨';
      const bg = BG_COLORS[idx % BG_COLORS.length];

      // Image
      mediaDocsToInsert.push({
        type: 'IMAGE',
        mediaKey: `vocab_${cleanKey}_image`,
        url: createCardSvg(v.en, bg, emoji),
        altText: `${v.en} illustration`,
        mimeType: 'image/svg+xml',
        sourceType: 'SYSTEM_DESIGN',
        status: 'ACTIVE'
      });

      // Audio
      mediaDocsToInsert.push({
        type: 'AUDIO',
        mediaKey: `vocab_${cleanKey}_audio`,
        url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(v.en)}&type=2`,
        transcript: v.en,
        language: 'en',
        sourceType: 'OFFICIAL_CURRICULUM',
        status: 'ACTIVE'
      });

      // Animation placeholder
      mediaDocsToInsert.push({
        type: 'ANIMATION',
        mediaKey: `vocab_${cleanKey}_animation`,
        url: `placeholder://animations/vocab_${cleanKey}_anim.json`,
        altText: `Happy animated ${v.en}`,
        sourceType: 'SYSTEM_DESIGN',
        status: 'ACTIVE'
      });
    });

    const insertedMedia = await Media.insertMany(mediaDocsToInsert);
    const mediaByLookupKey = new Map();
    insertedMedia.forEach(m => mediaByLookupKey.set(m.mediaKey, m));
    mediaKeyCounter = insertedMedia.length;

    // Prepare Vocabulary records
    const vocabDocsToInsert = [];
    VOCABULARY_DATA.forEach(v => {
      const norm = v.normalizedText;
      const cleanKey = norm.replace(/[^a-z0-9]/g, '_');
      const imgMedia = mediaByLookupKey.get(`vocab_${cleanKey}_image`);
      const audMedia = mediaByLookupKey.get(`vocab_${cleanKey}_audio`);

      const sourceUnitObjectIds = (v.units || [])
        .map(uKey => unitsMap[uKey]?._id)
        .filter(Boolean);

      const ageGroupObjectIds = (v.ages || [])
        .map(aCode => ageGroupsMap[aCode]?._id)
        .filter(Boolean);

      const topicObjectIds = (v.topics || [])
        .map(tSlug => topicsMap[tSlug]?._id)
        .filter(Boolean);

      // Determine difficulty: 1 for 3-4, 2 for 4-5, 3 for 5-6
      let difficulty = 1;
      if (v.ages.includes('5-6')) difficulty = 3;
      else if (v.ages.includes('4-5')) difficulty = 2;

      vocabDocsToInsert.push({
        english: v.en,
        vietnamese: v.vi,
        normalizedText: norm,
        category: v.cat || 'objects',
        mediaKey: v.mediaKey,
        pronunciation: v.ipa || '',
        partOfSpeech: v.pos || 'noun',
        difficulty,
        ageGroups: ageGroupObjectIds,
        ageGroupCodes: v.ages,
        sourceUnits: sourceUnitObjectIds,
        topics: topicObjectIds,
        primaryMedia: imgMedia?._id,
        imageUrl: imgMedia?.url || '',
        audioMedia: audMedia?._id,
        audioUrl: audMedia?.url || '',
        exampleSentence: getSensibleSentence(v).en,
        exampleSentenceVietnamese: getSensibleSentence(v).vi,
        sourceType: 'OFFICIAL_CURRICULUM',
        status: 'ACTIVE'
      });
    });

    const insertedVocab = await Vocabulary.insertMany(vocabDocsToInsert);
    const vocabMapByWord = new Map();
    insertedVocab.forEach(vDoc => {
      vocabMapByWord.set(vDoc.english.toLowerCase().trim(), vDoc);
    });

    // 6. Seed Language Content (104 items)
    console.log('[Seed] 7/9 Seeding 104 structured Language Content items...');
    const langDocsToInsert = [];
    LANGUAGE_CONTENT_DATA.forEach(lc => {
      const unitDoc = unitsMap[lc.unit];
      const topicDoc = topicsMap[lc.topic];
      const ageDoc = ageGroupsMap[lc.age];

      // Find any referenced vocabulary words
      const matchingVocabIds = [];
      for (const [w, vDoc] of vocabMapByWord.entries()) {
        if (lc.en.toLowerCase().includes(w)) {
          matchingVocabIds.push(vDoc._id);
        }
      }

      langDocsToInsert.push({
        contentType: lc.type,
        english: lc.en,
        vietnamese: lc.vi,
        ageGroup: ageDoc?._id,
        ageGroupCode: lc.age,
        difficulty: lc.diff || 1,
        sourceUnit: unitDoc?._id,
        topic: topicDoc?._id,
        vocabulary: matchingVocabIds.slice(0, 3),
        sourceType: 'OFFICIAL_CURRICULUM',
        status: 'ACTIVE'
      });
    });
    const insertedLang = await LanguageContent.insertMany(langDocsToInsert);

    // 7. Seed 108 Lessons (4 per Unit)
    console.log('[Seed] 8/9 Seeding 108 Application Lessons (4 per unit across 27 units)...');
    const lessonDocsToInsert = [];
    LESSONS_DATA.forEach(l => {
      const unitDoc = unitsMap[l.unitKey];
      const topicDoc = topicsMap[l.topicSlug];
      const ageDoc = ageGroupsMap[l.ageGroupCode];

      const vocabIds = (l.vocabularyWords || [])
        .map(w => vocabMapByWord.get(w.toLowerCase().trim())?._id)
        .filter(Boolean);

      const firstVocab = vocabMapByWord.get((l.vocabularyWords[0] || '').toLowerCase().trim());

      lessonDocsToInsert.push({
        key: l.key,
        topic: topicDoc?._id,
        ageGroup: ageDoc?._id,
        ageGroupCode: l.ageGroupCode,
        title: l.title,
        vietnameseTitle: l.vietnameseTitle,
        description: l.description,
        learningObjectives: l.objectives || [],
        estimatedDuration: l.estimatedDuration || 8,
        difficulty: l.difficulty || 1,
        thumbnail: firstVocab?.primaryMedia,
        thumbnailUrl: firstVocab?.imageUrl || '',
        curriculumUnits: unitDoc ? [unitDoc._id] : [],
        vocabularyItems: vocabIds,
        languageContents: [],
        displayOrder: l.order || 1,
        sourceType: 'SYSTEM_DESIGN',
        status: 'ACTIVE'
      });
    });

    const insertedLessons = await Lesson.insertMany(lessonDocsToInsert);
    const lessonsMapByKey = new Map();
    insertedLessons.forEach(lDoc => lessonsMapByKey.set(lDoc.key, lDoc));

    // 8. Seed Activities across all 11 activity types
    console.log('[Seed] 9/9 Generating and Seeding Activities for all lessons (all 11 activity types)...');
    const activityDocsToInsert = [];

    LESSONS_DATA.forEach(lessonDef => {
      const lessonDoc = lessonsMapByKey.get(lessonDef.key);
      if (!lessonDoc) return;

      const actDefs = buildActivitiesForLesson(lessonDef, vocabMapByWord);
      actDefs.forEach(ad => {
        activityDocsToInsert.push({
          lesson: lessonDoc._id,
          activityType: ad.activityType,
          title: ad.title,
          vietnameseTitle: ad.vietnameseTitle,
          instructions: ad.instructions,
          ageGroup: ageGroupsMap[ad.ageGroupCode]._id,
          ageGroupCode: ad.ageGroupCode,
          difficulty: ad.difficulty,
          questionCount: ad.questionCount,
          pointsPerQuestion: ad.pointsPerQuestion,
          starConfig: ad.starConfig,
          questions: ad.questions,
          order: ad.order,
          sourceType: ad.sourceType || 'SYSTEM_DESIGN',
          status: 'ACTIVE'
        });
      });
    });

    const insertedActivities = await Activity.insertMany(activityDocsToInsert);

    // 9. Seed Demo Users (Admin, Teacher, Children) & Classroom
    console.log('[Seed] Creating Demo Users and Classroom...');
    const adminUser = new User({
      role: 'ADMIN',
      username: 'admin',
      email: 'admin@kcenglishkids.com',
      password: 'Admin@123',
      name: 'System Administrator',
      avatar: 'bear',
      avatarUrl: createCardSvg('Admin', '#D7CCC8', '🐻'),
      status: 'ACTIVE'
    });
    await adminUser.save();

    const teacherUser = new User({
      role: 'TEACHER',
      username: 'teacher_sarah',
      email: 'teacher@kcenglishkids.com',
      password: 'Teacher@123',
      name: 'Ms. Sarah Johnson',
      avatar: 'fox',
      avatarUrl: createCardSvg('Teacher', '#FFE0B2', '🦊'),
      status: 'ACTIVE'
    });
    await teacherUser.save();

    const demoClass = await ClassRoom.create({
      name: 'Little Stars Class (Age 3–4)',
      teacher: teacherUser._id,
      ageGroup: ageGroupsMap['3-4']._id,
      ageGroupCode: '3-4',
      academicYear: '2026-2027',
      students: [],
      status: 'ACTIVE'
    });
    teacherUser.assignedClass = demoClass._id;
    await teacherUser.save();

    const childLeo = new User({
      role: 'CHILD',
      name: 'Leo',
      email: 'leo@kcenglishkids.com',
      phone: '0901234567',
      contact: '0901234567',
      avatar: 'lion',
      avatarUrl: createCardSvg('Leo', '#FFE082', '🦁'),
      password: '123456',
      pin: '1234',
      ageGroup: ageGroupsMap['3-4']._id,
      ageGroupCode: '3-4',
      assignedClass: demoClass._id,
      status: 'ACTIVE'
    });
    await childLeo.save();

    const childMia = new User({
      role: 'CHILD',
      name: 'Mia',
      email: 'mia@kcenglishkids.com',
      phone: '0902345678',
      contact: '0902345678',
      avatar: 'panda',
      avatarUrl: createCardSvg('Mia', '#CFD8DC', '🐼'),
      password: '123456',
      pin: '5678',
      ageGroup: ageGroupsMap['3-4']._id,
      ageGroupCode: '3-4',
      assignedClass: demoClass._id,
      status: 'ACTIVE'
    });
    await childMia.save();

    const childToby = new User({
      role: 'CHILD',
      name: 'Toby',
      email: 'toby@kcenglishkids.com',
      phone: '0903456789',
      contact: '0903456789',
      avatar: 'rabbit',
      avatarUrl: createCardSvg('Toby', '#F8BBD0', '🐰'),
      password: '123456',
      pin: '1111',
      ageGroup: ageGroupsMap['4-5']._id,
      ageGroupCode: '4-5',
      status: 'ACTIVE'
    });
    await childToby.save();

    demoClass.students = [childLeo._id, childMia._id];
    await demoClass.save();

    // Link demo progress for Leo to demo lesson: B1_U5_L1 (Pet Animals)
    const petAnimalsLesson = lessonsMapByKey.get('B1_U5_L1');
    if (petAnimalsLesson) {
      await Progress.create({
        child: childLeo._id,
        topic: topicsMap.animals._id,
        lesson: petAnimalsLesson._id,
        completed: true,
        stars: 3,
        highestScore: 100,
        attempts: 1
      });
    }

    // =========================================================================
    // FINAL VERIFICATION REPORT (Section 20 of prompt)
    // =========================================================================
    const finalAgeGroupsCount = await AgeGroup.countDocuments();
    const finalBooksCount = await CurriculumBook.countDocuments();
    const finalUnitsCount = await CurriculumUnit.countDocuments();
    const finalTopicsCount = await Topic.countDocuments();
    const finalLessonsCount = await Lesson.countDocuments();
    const finalVocabCount = await Vocabulary.countDocuments();
    const finalLangCount = await LanguageContent.countDocuments();
    const finalActivitiesCount = await Activity.countDocuments();
    const finalMediaCount = await Media.countDocuments();

    console.log('\n==================================================');
    console.log('FINAL VERIFICATION REPORT');
    console.log('==================================================');
    console.log(`AGE GROUPS: ${finalAgeGroupsCount}`);
    console.log(`BOOKS: ${finalBooksCount}`);
    console.log(`UNITS: ${finalUnitsCount}`);
    console.log(`TOPICS: ${finalTopicsCount}`);
    console.log(`LESSONS: ${finalLessonsCount}`);
    console.log(`UNIQUE VOCABULARY: ${finalVocabCount}`);
    console.log(`LANGUAGE CONTENT: ${finalLangCount}`);
    console.log(`ACTIVITIES: ${finalActivitiesCount}`);
    console.log(`MEDIA REFERENCES: ${finalMediaCount}`);
    console.log('==================================================');

    // Detailed verification of Book 1, 2, 3 units
    for (let b = 1; b <= 3; b++) {
      const uCount = await CurriculumUnit.countDocuments({ bookNumber: b });
      console.log(`✓ Book ${b} → ${uCount} Units`);
    }

    // Verify Demo Path: Age 3-4 -> Book 1 -> Unit 5 -> Animals -> Pet Animals
    console.log('\n[Demo Learning Path Verification]:');
    console.log(`✓ Age Group: ${ageGroupsMap['3-4'].name}`);
    console.log(`✓ Book: ${booksMap[1].title}`);
    console.log(`✓ Unit 5: "${demoUnit5Ref.bigQuestion}" (Book 1 Unit 5)`);
    console.log(`✓ Topic: ${topicsMap.animals.englishName} (${topicsMap.animals.vietnameseName})`);
    console.log(`✓ Lesson: ${petAnimalsLesson.title} (${petAnimalsLesson.vietnameseTitle})`);
    console.log(`✓ Lesson Vocab Count: ${petAnimalsLesson.vocabularyItems.length}`);

    const demoActivities = await Activity.find({ lesson: petAnimalsLesson._id });
    console.log(`✓ Activities for Pet Animals: ${demoActivities.length}`);
    demoActivities.forEach((act, idx) => {
      console.log(`    ${idx + 1}. [${act.activityType}] ${act.title} (${act.questionCount} questions)`);
    });

    console.log('\nAll learning content verified and ready for React frontend consumption!');
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
}

seedDatabase();
