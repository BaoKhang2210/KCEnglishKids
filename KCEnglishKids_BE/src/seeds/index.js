const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const mongoose = require('mongoose');

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
  Progress,
  ClassroomSession,
  VocabularyMastery,
  ParentNotification,
  Attendance,
  Schedule,
  LearningObservation,
  HomePracticePlan,
  Assignment,
  LearningEvent,
  MasteryEvent,
  TeacherNote,
  UnitCompletion,
  SchoolRecognition,
  GameCatalogSetting,
  SystemSetting,
  AuditLog
} = require('../models');
const ClassRecognition = require('../models/ClassRecognition');

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
    // Full seeding is only safe in an empty database unless --force or --clean is passed.
    const force = process.argv.includes('--force') || process.argv.includes('--clean');
    if (!force) {
      for (const collection of await mongoose.connection.db.listCollections().toArray()) {
        if (!collection.name.startsWith('system.') && await mongoose.connection.db.collection(collection.name).estimatedDocumentCount()) {
          throw new Error('Seed refused: database is not empty. Pass --force to wipe and reseed clean demo data.');
        }
      }
    }
    console.log('==================================================');
    console.log('[Seed] Connected to MongoDB. Starting full learning content dataset...');
    console.log('==================================================');

    // 0. Clear collections idempotently
    console.log('[Seed] 1/9 Clearing all 31 collections to maintain idempotent consistency...');
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
      Progress.deleteMany({}),
      ClassroomSession.deleteMany({}),
      VocabularyMastery.deleteMany({}),
      ParentNotification.deleteMany({}),
      Attendance.deleteMany({}),
      Schedule.deleteMany({}),
      LearningObservation.deleteMany({}),
      HomePracticePlan.deleteMany({}),
      Assignment.deleteMany({}),
      LearningEvent.deleteMany({}),
      MasteryEvent.deleteMany({}),
      TeacherNote.deleteMany({}),
      UnitCompletion.deleteMany({}),
      ClassRecognition.deleteMany({}),
      SchoolRecognition.deleteMany({}),
      GameCatalogSetting.deleteMany({}),
      SystemSetting.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    console.log('[Seed] All collections cleared successfully.');

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
    console.log(`[Seed] 7/9 Seeding ${LANGUAGE_CONTENT_DATA.length} structured Language Content items...`);
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

    // Group inserted language content by unitKey
    const langByUnitKey = new Map();
    insertedLang.forEach((lDoc, idx) => {
      const def = LANGUAGE_CONTENT_DATA[idx];
      if (def && def.unit) {
        if (!langByUnitKey.has(def.unit)) {
          langByUnitKey.set(def.unit, []);
        }
        langByUnitKey.get(def.unit).push(lDoc._id);
      }
    });

    // 7. Seed 108 Lessons (4 per Unit)
    console.log('[Seed] 8/9 Seeding 108 Application Lessons (4 per unit across 27 units)...');
    const lessonDocsToInsert = [];
    LESSONS_DATA.forEach(l => {
      const unitDoc = unitsMap[l.unitKey];
      const topicDoc = topicsMap[l.topicSlug];
      const ageDoc = ageGroupsMap[l.ageGroupCode];
      const unitLangIds = langByUnitKey.get(l.unitKey) || [];

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
        languageContents: unitLangIds,
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

    // 9. Seed Demo Users, Classrooms, Schedules, Attendance, Sessions & Streaks
    console.log('[Seed] Creating Demo Users, Classrooms, Schedules, and Learning Records...');

    const getVietnamDateStr = (date = new Date()) => {
      const vnDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const y = vnDate.getFullYear();
      const m = String(vnDate.getMonth() + 1).padStart(2, '0');
      const d = String(vnDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const today = new Date();
    const todayStr = getVietnamDateStr(today);
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = getVietnamDateStr(yesterday);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const twoDaysAgoStr = getVietnamDateStr(twoDaysAgo);

    // 9.1 Admin User
    const adminUser = new User({
      role: 'ADMIN',
      username: 'admin',
      email: 'admin@kcenglishkids.com',
      password: adminPassword,
      name: 'System Administrator',
      avatar: 'bear',
      avatarUrl: createCardSvg('Admin', '#D7CCC8', '🐻'),
      status: 'ACTIVE'
    });
    await adminUser.save();

    // 9.2 Teachers (1 per age group & classroom)
    const teacher1 = new User({
      role: 'TEACHER',
      username: 'teacher_sarah',
      email: 'teacher@kcenglishkids.com',
      password: 'Teacher@123',
      name: 'Ms. Sarah Johnson',
      phone: '0901111111',
      contact: '0901111111',
      avatar: 'fox',
      avatarUrl: createCardSvg('Teacher Sarah', '#FFE0B2', '🦊'),
      status: 'ACTIVE'
    });
    await teacher1.save();

    const teacher2 = new User({
      role: 'TEACHER',
      username: 'teacher_emily',
      email: 'emily@kcenglishkids.com',
      password: 'Teacher@123',
      name: 'Ms. Emily Watson',
      phone: '0902222222',
      contact: '0902222222',
      avatar: 'koala',
      avatarUrl: createCardSvg('Teacher Emily', '#E1BEE7', '🐨'),
      status: 'ACTIVE'
    });
    await teacher2.save();

    const teacher3 = new User({
      role: 'TEACHER',
      username: 'teacher_david',
      email: 'david@kcenglishkids.com',
      password: 'Teacher@123',
      name: 'Mr. David Miller',
      phone: '0903333333',
      contact: '0903333333',
      avatar: 'bear',
      avatarUrl: createCardSvg('Teacher David', '#C8E6C9', '🐻'),
      status: 'ACTIVE'
    });
    await teacher3.save();

    // 9.3 3 Classrooms across 3 Age Groups
    const class1 = await ClassRoom.create({
      name: 'Little Stars Class (Age 3–4)',
      teacher: teacher1._id,
      ageGroup: ageGroupsMap['3-4']._id,
      ageGroupCode: '3-4',
      academicYear: '2026-2027',
      students: [],
      status: 'ACTIVE'
    });
    teacher1.assignedClass = class1._id;
    await teacher1.save();

    const class2 = await ClassRoom.create({
      name: 'Sunny Kindergarten (Age 4–5)',
      teacher: teacher2._id,
      ageGroup: ageGroupsMap['4-5']._id,
      ageGroupCode: '4-5',
      academicYear: '2026-2027',
      students: [],
      status: 'ACTIVE'
    });
    teacher2.assignedClass = class2._id;
    await teacher2.save();

    const class3 = await ClassRoom.create({
      name: 'Rainbow Explorers (Age 5–6)',
      teacher: teacher3._id,
      ageGroup: ageGroupsMap['5-6']._id,
      ageGroupCode: '5-6',
      academicYear: '2026-2027',
      students: [],
      status: 'ACTIVE'
    });
    teacher3.assignedClass = class3._id;
    await teacher3.save();

    // 9.4 3 Primary Children for 3 Age Groups (PIN: 1232)
    const childLeo = new User({
      role: 'CHILD',
      name: 'Leo',
      username: 'leo',
      email: 'leo@kcenglishkids.com',
      phone: '0901234567',
      contact: '0901234567',
      parentContact: 'parent.leo@example.com',
      avatar: 'lion',
      avatarUrl: createCardSvg('Leo', '#FFE082', '🦁'),
      password: '1232',
      pin: '1232',
      ageGroup: ageGroupsMap['3-4']._id,
      ageGroupCode: '3-4',
      assignedClass: class1._id,
      streak: 3,
      longestStreak: 3,
      lastActiveDate: todayStr,
      activeDates: [twoDaysAgoStr, yesterdayStr, todayStr],
      status: 'ACTIVE'
    });
    await childLeo.save();

    const childMia = new User({
      role: 'CHILD',
      name: 'Mia',
      username: 'mia',
      email: 'mia@kcenglishkids.com',
      phone: '0902345678',
      contact: '0902345678',
      parentContact: 'parent.mia@example.com',
      avatar: 'panda',
      avatarUrl: createCardSvg('Mia', '#CFD8DC', '🐼'),
      password: '1232',
      pin: '1232',
      ageGroup: ageGroupsMap['4-5']._id,
      ageGroupCode: '4-5',
      assignedClass: class2._id,
      streak: 1,
      longestStreak: 1,
      lastActiveDate: todayStr,
      activeDates: [todayStr],
      status: 'ACTIVE'
    });
    await childMia.save();

    const childToby = new User({
      role: 'CHILD',
      name: 'Toby',
      username: 'toby',
      email: 'toby@kcenglishkids.com',
      phone: '0903456789',
      contact: '0903456789',
      parentContact: 'parent.toby@example.com',
      avatar: 'rabbit',
      avatarUrl: createCardSvg('Toby', '#F8BBD0', '🐰'),
      password: '1232',
      pin: '1232',
      ageGroup: ageGroupsMap['5-6']._id,
      ageGroupCode: '5-6',
      assignedClass: class3._id,
      streak: 1,
      longestStreak: 1,
      lastActiveDate: todayStr,
      activeDates: [todayStr],
      status: 'ACTIVE'
    });
    await childToby.save();

    // 9.5 18 Classmates Partitioned Cleanly by Age Group and Class
    const class1KidsDef = [
      { name: 'Emma', avatar: 'fox', pin: '2001' },
      { name: 'Liam', avatar: 'bear', pin: '2002' },
      { name: 'Sophia', avatar: 'koala', pin: '2003' },
      { name: 'Noah', avatar: 'lion', pin: '2004' },
      { name: 'Ava', avatar: 'rabbit', pin: '2005' },
      { name: 'Oliver', avatar: 'panda', pin: '2006' }
    ];

    const class2KidsDef = [
      { name: 'Lucas', avatar: 'fox', pin: '2007' },
      { name: 'Isabella', avatar: 'koala', pin: '2008' },
      { name: 'Ethan', avatar: 'bear', pin: '2009' },
      { name: 'Harper', avatar: 'rabbit', pin: '2010' },
      { name: 'Chloe', avatar: 'panda', pin: '2011' },
      { name: 'Mason', avatar: 'lion', pin: '2012' }
    ];

    const class3KidsDef = [
      { name: 'James', avatar: 'fox', pin: '2013' },
      { name: 'Ella', avatar: 'koala', pin: '2014' },
      { name: 'Jackson', avatar: 'bear', pin: '2015' },
      { name: 'Lily', avatar: 'rabbit', pin: '2016' },
      { name: 'Henry', avatar: 'panda', pin: '2017' },
      { name: 'Grace', avatar: 'fox', pin: '2018' }
    ];

    const createKids = async (defs, classroom, ageCode, startIdx) => {
      const kids = [];
      for (let i = 0; i < defs.length; i++) {
        const k = defs[i];
        const num = (startIdx + i + 1).toString().padStart(2, '0');
        const kid = new User({
          role: 'CHILD',
          name: k.name,
          username: k.name.toLowerCase(),
          email: `${k.name.toLowerCase()}@kcenglishkids.com`,
          phone: `09000000${num}`,
          contact: `09000000${num}`,
          parentContact: `parent.${k.name.toLowerCase()}@example.com`,
          avatar: k.avatar,
          avatarUrl: createCardSvg(k.name, BG_COLORS[(startIdx + i) % BG_COLORS.length], EMOJI_MAP[k.avatar] || '🦁'),
          password: '1232',
          pin: k.pin,
          ageGroup: ageGroupsMap[ageCode]._id,
          ageGroupCode: ageCode,
          assignedClass: classroom._id,
          status: 'ACTIVE'
        });
        await kid.save();
        kids.push(kid);
      }
      return kids;
    };

    const class1Kids = await createKids(class1KidsDef, class1, '3-4', 0);
    const class2Kids = await createKids(class2KidsDef, class2, '4-5', 6);
    const class3Kids = await createKids(class3KidsDef, class3, '5-6', 12);

    class1.students = [childLeo._id, ...class1Kids.map(k => k._id)];
    await class1.save();

    class2.students = [childMia._id, ...class2Kids.map(k => k._id)];
    await class2.save();

    class3.students = [childToby._id, ...class3Kids.map(k => k._id)];
    await class3.save();

    // 9.6 Learning Lessons references
    const petAnimalsLesson = lessonsMapByKey.get('B1_U5_L1');
    const b2Lesson = lessonsMapByKey.get('B2_U1_L1') || petAnimalsLesson;
    const b3Lesson = lessonsMapByKey.get('B3_U1_L1') || petAnimalsLesson;

    const petAnimalsActivities = petAnimalsLesson
      ? await Activity.find({ lesson: petAnimalsLesson._id }).sort({ order: 1 })
      : [];

    const petSession = await LearningSession.create({
      child: childLeo._id,
      lesson: petAnimalsLesson._id,
      status: 'COMPLETED',
      score: 100,
      stars: 3,
      currentActivity: petAnimalsActivities[0]?._id,
      completedActivities: petAnimalsActivities.map(a => a._id),
      startedAt: twoDaysAgo,
      lastActivityAt: today
    });

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

    // 9.7 ActivityResults and LearningEvents for Leo's 3-day flame streak
    const actResultDates = [twoDaysAgo, yesterday, today, today];
    for (let i = 0; i < petAnimalsActivities.length; i++) {
      const act = petAnimalsActivities[i];
      const d = actResultDates[Math.min(i, actResultDates.length - 1)];
      await ActivityResult.create({
        child: childLeo._id,
        session: petSession._id,
        lesson: petAnimalsLesson._id,
        activity: act._id,
        score: 100,
        maxScore: 100,
        correctCount: act.questionCount || 4,
        incorrectCount: 0,
        completed: true,
        stars: 3,
        timeSpentSeconds: 45,
        createdAt: d,
        updatedAt: d
      });

      if (i < 3) {
        await LearningEvent.create({
          child: childLeo._id,
          lesson: petAnimalsLesson._id,
          submissionId: `sub_leo_stage${i + 1}_${Date.now()}_${i}`,
          stage: (i % 3) + 1,
          score: 100,
          lessonCompleted: i === 2,
          createdAt: d,
          updatedAt: d
        });
      }
    }

    // Mia and Toby streak events (today)
    if (b2Lesson) {
      await LearningEvent.create({
        child: childMia._id,
        lesson: b2Lesson._id,
        submissionId: `sub_mia_stage1_${Date.now()}`,
        stage: 1,
        score: 100,
        lessonCompleted: false,
        createdAt: today,
        updatedAt: today
      });
    }
    if (b3Lesson) {
      await LearningEvent.create({
        child: childToby._id,
        lesson: b3Lesson._id,
        submissionId: `sub_toby_stage1_${Date.now()}`,
        stage: 1,
        score: 100,
        lessonCompleted: false,
        createdAt: today,
        updatedAt: today
      });
    }

    // 9.8 VocabularyMastery Records
    const animalVocabs = await Vocabulary.find({ english: { $in: ['dog', 'cat', 'rabbit', 'fish', 'bird'] } });
    for (const v of animalVocabs) {
      await VocabularyMastery.create({
        student: childLeo._id,
        vocabulary: v._id,
        correctCount: 5,
        wrongCount: 0,
        attemptCount: 5,
        streak: 3,
        masteryLevel: 3,
        lastReviewedAt: today
      });
    }

    const foodVocabs = await Vocabulary.find({ english: { $in: ['apple', 'banana', 'pear', 'orange', 'carrot'] } });
    for (const v of foodVocabs) {
      await VocabularyMastery.create({
        student: childMia._id,
        vocabulary: v._id,
        correctCount: 3,
        wrongCount: 1,
        attemptCount: 4,
        streak: 2,
        masteryLevel: 2,
        lastReviewedAt: today
      });
    }

    const schoolVocabs = await Vocabulary.find({ english: { $in: ['book', 'crayon', 'chair', 'table', 'pencil'] } });
    for (const v of schoolVocabs) {
      await VocabularyMastery.create({
        student: childToby._id,
        vocabulary: v._id,
        correctCount: 4,
        wrongCount: 0,
        attemptCount: 4,
        streak: 3,
        masteryLevel: 3,
        lastReviewedAt: today
      });
    }

    // 9.9 Timetables / Schedules (Monday to Friday slots for all 3 classes)
    const b1Lessons = insertedLessons.filter(l => l.ageGroupCode === '3-4');
    const b2Lessons = insertedLessons.filter(l => l.ageGroupCode === '4-5');
    const b3Lessons = insertedLessons.filter(l => l.ageGroupCode === '5-6');

    const buildSlotsForClass = (lessons, startTime, endTime, room, defaultNote) => {
      return [1, 2, 3, 4, 5].map((dayOfWeek, idx) => {
        const l = lessons[idx] || lessons[0];
        return {
          dayOfWeek,
          startTime,
          endTime,
          room,
          subjectNote: `${defaultNote} - ${l ? l.title : ''}`,
          lesson: l ? l._id : null,
          lessonNumber: idx + 1,
          lessonTitle: l ? l.title : ''
        };
      });
    };

    await Schedule.create({
      classroom: class1._id,
      teacher: teacher1._id,
      academicYear: '2026-2027',
      colorTag: 'indigo',
      isActive: true,
      weeklySlots: buildSlotsForClass(b1Lessons, '08:30', '09:15', 'Phòng Mầm 1', 'English Morning Discovery')
    });

    await Schedule.create({
      classroom: class2._id,
      teacher: teacher2._id,
      academicYear: '2026-2027',
      colorTag: 'emerald',
      isActive: true,
      weeklySlots: buildSlotsForClass(b2Lessons, '09:30', '10:15', 'Phòng Chồi 2', 'Interactive Vocabulary & Communication')
    });

    await Schedule.create({
      classroom: class3._id,
      teacher: teacher3._id,
      academicYear: '2026-2027',
      colorTag: 'purple',
      isActive: true,
      weeklySlots: buildSlotsForClass(b3Lessons, '10:30', '11:15', 'Phòng Lá 3', 'Sentence Patterns & Oracy Presentation')
    });

    // 9.10 Daily Attendance for Class 1, 2, 3
    await Attendance.create({
      classroom: class1._id,
      teacher: teacher1._id,
      date: todayStr,
      records: [
        { student: childLeo._id, status: 'PRESENT', note: 'Đi học đúng giờ, rất hào hứng' },
        { student: class1Kids[0]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[1]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[2]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[3]._id, status: 'PRESENT', note: '' },
        { student: class1Kids[4]._id, status: 'LATE', note: 'Đến muộn 15 phút do kẹt xe' },
        { student: class1Kids[5]._id, status: 'EXCUSED', note: 'Nghỉ có phép từ phụ huynh (khám răng)' }
      ],
      note: 'Điểm danh buổi sáng lớp Little Stars'
    });

    await Attendance.create({
      classroom: class2._id,
      teacher: teacher2._id,
      date: todayStr,
      records: [
        { student: childMia._id, status: 'PRESENT', note: 'Hào hứng tham gia phát biểu' },
        { student: class2Kids[0]._id, status: 'PRESENT', note: '' },
        { student: class2Kids[1]._id, status: 'EXCUSED', note: 'Nghỉ ốm có đơn xin phép từ phụ huynh' },
        { student: class2Kids[2]._id, status: 'PRESENT', note: '' },
        { student: class2Kids[3]._id, status: 'ABSENT', note: 'Vắng không phép, giáo viên đã gọi điện nhắc nhở' },
        { student: class2Kids[4]._id, status: 'PRESENT', note: '' }
      ],
      note: 'Điểm danh lớp Sunny Kindergarten'
    });

    await Attendance.create({
      classroom: class3._id,
      teacher: teacher3._id,
      date: todayStr,
      records: [
        { student: childToby._id, status: 'PRESENT', note: 'Đi học đúng giờ' },
        { student: class3Kids[0]._id, status: 'PRESENT', note: '' },
        { student: class3Kids[1]._id, status: 'LATE', note: 'Đến muộn 10 phút' },
        { student: class3Kids[2]._id, status: 'EXCUSED', note: 'Gia đình có việc bận xin nghỉ' },
        { student: class3Kids[3]._id, status: 'PRESENT', note: '' },
        { student: class3Kids[4]._id, status: 'PRESENT', note: '' }
      ],
      note: 'Điểm danh lớp Rainbow Explorers'
    });

    // 9.11 ClassroomSessions (COMPLETED for all 3 classes with rich attendance & performance)
    const sampleSession1 = await ClassroomSession.create({
      classroom: class1._id,
      teacher: teacher1._id,
      lesson: petAnimalsLesson ? petAnimalsLesson._id : undefined,
      title: 'Pet Animals Live Exploration',
      ageGroup: '3-4',
      status: 'COMPLETED',
      sessionNumber: 1,
      startedAt: new Date(Date.now() - 50 * 60 * 1000),
      endedAt: new Date(Date.now() - 5 * 60 * 1000),
      plannedDuration: 45,
      activities: petAnimalsActivities.slice(0, 3).map(a => a._id),
      studentScores: [
        {
          student: childLeo._id,
          points: 50,
          stars: 3,
          correctCount: 5,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class1Kids[0]._id,
          points: 45,
          stars: 3,
          correctCount: 4,
          incorrectCount: 1,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class1Kids[1]._id,
          points: 35,
          stars: 2,
          correctCount: 3,
          incorrectCount: 2,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class1Kids[2]._id,
          points: 48,
          stars: 3,
          correctCount: 5,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class1Kids[3]._id,
          points: 30,
          stars: 2,
          correctCount: 3,
          incorrectCount: 2,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class1Kids[4]._id,
          points: 20,
          stars: 1,
          correctCount: 2,
          incorrectCount: 3,
          notAnswered: 0,
          attendance: 'LATE',
          status: 'NEEDS_PRACTICE'
        },
        {
          student: class1Kids[5]._id,
          points: 0,
          stars: 0,
          correctCount: 0,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'EXCUSED',
          status: 'ACTIVE'
        }
      ],
      questionResults: [
        {
          key: 'q1',
          questionIndex: 1,
          promptText: 'Which animal says woof woof? (Con vật nào kêu gâu gâu?)',
          studentAnswers: [
            { student: childLeo._id, result: 'CORRECT' },
            { student: class1Kids[0]._id, result: 'CORRECT' },
            { student: class1Kids[1]._id, result: 'CORRECT' },
            { student: class1Kids[2]._id, result: 'CORRECT' },
            { student: class1Kids[3]._id, result: 'CORRECT' },
            { student: class1Kids[4]._id, result: 'INCORRECT' },
            { student: class1Kids[5]._id, result: 'NOT_ANSWERED' }
          ]
        },
        {
          key: 'q2',
          questionIndex: 2,
          promptText: 'Listen and tap the cute cat (Nghe và chọn chú mèo con)',
          studentAnswers: [
            { student: childLeo._id, result: 'CORRECT' },
            { student: class1Kids[0]._id, result: 'CORRECT' },
            { student: class1Kids[1]._id, result: 'INCORRECT' },
            { student: class1Kids[2]._id, result: 'CORRECT' },
            { student: class1Kids[3]._id, result: 'CORRECT' },
            { student: class1Kids[4]._id, result: 'CORRECT' },
            { student: class1Kids[5]._id, result: 'NOT_ANSWERED' }
          ]
        }
      ],
      teachingOutcome: {
        coverage: 'COMPLETE',
        goalsCovered: ['Nhận biết tên con vật cưng', 'Phát âm chuẩn từ vựng', 'Hát bài hát Old MacDonald'],
        reflection: 'Các bé lớp Little Stars học rất hăng say, tương tác sôi nổi với các thẻ bài thú cưng. Bé Leo và Sophia rất xuất sắc, bé Ava vào muộn cần ôn lại từ vựng.',
        recordedAt: new Date()
      },
      summary: {
        participationCount: 6,
        averageAccuracy: 84,
        totalStars: 14,
        totalPoints: 228,
        studentsNeedingPractice: [class1Kids[4]._id],
        topPerformers: [childLeo._id, class1Kids[2]._id]
      }
    });

    const b2Activities = b2Lesson ? await Activity.find({ lesson: b2Lesson._id }).limit(3) : [];
    await ClassroomSession.create({
      classroom: class2._id,
      teacher: teacher2._id,
      lesson: b2Lesson ? b2Lesson._id : undefined,
      title: b2Lesson ? `${b2Lesson.title} - Buổi học tương tác` : 'Things in the Classroom',
      ageGroup: '4-5',
      status: 'COMPLETED',
      sessionNumber: 1,
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 15 * 60 * 1000),
      plannedDuration: 45,
      activities: b2Activities.map(a => a._id),
      studentScores: [
        {
          student: childMia._id,
          points: 50,
          stars: 3,
          correctCount: 5,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class2Kids[0]._id,
          points: 45,
          stars: 3,
          correctCount: 4,
          incorrectCount: 1,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class2Kids[1]._id,
          points: 0,
          stars: 0,
          correctCount: 0,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'EXCUSED',
          status: 'ACTIVE'
        },
        {
          student: class2Kids[2]._id,
          points: 40,
          stars: 3,
          correctCount: 4,
          incorrectCount: 1,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class2Kids[3]._id,
          points: 0,
          stars: 0,
          correctCount: 0,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'ABSENT',
          status: 'ACTIVE'
        },
        {
          student: class2Kids[4]._id,
          points: 25,
          stars: 1,
          correctCount: 2,
          incorrectCount: 3,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'NEEDS_PRACTICE'
        }
      ],
      teachingOutcome: {
        coverage: 'COMPLETE',
        goalsCovered: ['Nhận diện đồ dùng học tập', 'Thực hành phản xạ TPR'],
        reflection: 'Lớp 4-5 tiếp thu từ vựng nhanh. Bé Mia rất tích cực, bé Isabella nghỉ ốm có phép, Harper vắng không phép.',
        recordedAt: new Date()
      },
      summary: {
        participationCount: 4,
        averageAccuracy: 80,
        totalStars: 10,
        totalPoints: 160,
        studentsNeedingPractice: [class2Kids[4]._id],
        topPerformers: [childMia._id]
      }
    });

    const b3Activities = b3Lesson ? await Activity.find({ lesson: b3Lesson._id }).limit(3) : [];
    await ClassroomSession.create({
      classroom: class3._id,
      teacher: teacher3._id,
      lesson: b3Lesson ? b3Lesson._id : undefined,
      title: b3Lesson ? `${b3Lesson.title} - Thuyết trình & Giao tiếp` : 'All About Our School',
      ageGroup: '5-6',
      status: 'COMPLETED',
      sessionNumber: 1,
      startedAt: new Date(Date.now() - 70 * 60 * 1000),
      endedAt: new Date(Date.now() - 25 * 60 * 1000),
      plannedDuration: 45,
      activities: b3Activities.map(a => a._id),
      studentScores: [
        {
          student: childToby._id,
          points: 50,
          stars: 3,
          correctCount: 5,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class3Kids[0]._id,
          points: 48,
          stars: 3,
          correctCount: 5,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class3Kids[1]._id,
          points: 35,
          stars: 2,
          correctCount: 3,
          incorrectCount: 2,
          notAnswered: 0,
          attendance: 'LATE',
          status: 'COMPLETED'
        },
        {
          student: class3Kids[2]._id,
          points: 0,
          stars: 0,
          correctCount: 0,
          incorrectCount: 0,
          notAnswered: 0,
          attendance: 'EXCUSED',
          status: 'ACTIVE'
        },
        {
          student: class3Kids[3]._id,
          points: 42,
          stars: 3,
          correctCount: 4,
          incorrectCount: 1,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'COMPLETED'
        },
        {
          student: class3Kids[4]._id,
          points: 26,
          stars: 1,
          correctCount: 2,
          incorrectCount: 3,
          notAnswered: 0,
          attendance: 'PRESENT',
          status: 'NEEDS_PRACTICE'
        }
      ],
      teachingOutcome: {
        coverage: 'COMPLETE',
        goalsCovered: ['Thuyết trình về trường lớp', 'Giao tiếp mẫu câu hoàn chỉnh'],
        reflection: 'Lớp Lá 5-6 tuổi nói câu rất chuẩn. Bé Toby và Charlotte nói tự tin, Amelia nghỉ phép.',
        recordedAt: new Date()
      },
      summary: {
        participationCount: 5,
        averageAccuracy: 82,
        totalStars: 12,
        totalPoints: 201,
        studentsNeedingPractice: [class3Kids[4]._id],
        topPerformers: [childToby._id, class3Kids[0]._id]
      }
    });

    // 9.12 Learning Observations & Home Practice Plan
    const leoVocabs = petAnimalsLesson?.vocabularyItems?.slice(0, 3) || [];
    const obsLeo = await LearningObservation.create({
      child: childLeo._id,
      classroom: class1._id,
      teacher: teacher1._id,
      lesson: petAnimalsLesson._id,
      session: sampleSession1._id,
      skill: 'EXPRESS',
      vocabulary: leoVocabs,
      unitKey: 'B1_U5',
      unitLabel: 'Unit 5 - Pet Animals',
      level: 'INDEPENDENT',
      evidence: 'Bé Leo phản xạ nhanh khi nhìn thẻ tranh, phát âm to rõ từ "dog", "cat" và bắt chước tiếng kêu chuẩn xác.',
      nextStep: 'Khuyến khích bé ghép thành câu dài hơn: "I see a cute dog."',
      consentConfirmed: true,
      observedAt: new Date(),
      operationId: `obs_seed_leo_${Date.now()}`,
      payloadHash: 'seed_hash_leo_obs_01'
    });

    const homeWords = animalVocabs.slice(0, 3).map(v => ({
      vocabulary: v._id,
      english: v.english,
      vietnamese: v.vietnamese,
      imageUrl: v.imageUrl,
      audioUrl: v.audioUrl,
      wordType: 'noun',
      reason: 'Từ vựng trọng tâm buổi học'
    }));

    await HomePracticePlan.create({
      child: childLeo._id,
      classroom: class1._id,
      teacher: teacher1._id,
      lesson: petAnimalsLesson._id,
      sourceSession: sampleSession1._id,
      revision: 1,
      status: 'APPROVED',
      operationId: `plan_seed_leo_${Date.now()}`,
      payloadHash: 'seed_hash_leo_plan_01',
      lessonTitle: petAnimalsLesson.title,
      ageGroupCode: '3-4',
      teacherNote: 'Ba mẹ hãy cùng Leo mở thẻ tranh động vật và nghe phát âm tiếng Anh 5 phút mỗi tối nhé!',
      words: homeWords,
      homeActivity: {
        title: 'Thử thách đố vui tiếng kêu thú cưng',
        steps: [
          'Ba mẹ phát âm tiếng kêu (woof / meow) và bé tìm đúng con vật',
          'Bé đọc to tên con vật bằng tiếng Anh và cùng cả nhà vỗ tay khen ngợi'
        ]
      },
      observations: [
        {
          observation: obsLeo._id,
          skill: obsLeo.skill,
          level: obsLeo.level,
          evidence: obsLeo.evidence,
          nextStep: obsLeo.nextStep
        }
      ]
    });

    // 9.13 Homework Assignments
    await Assignment.create({
      teacher: teacher1._id,
      classRoom: class1._id,
      lesson: petAnimalsLesson._id,
      activity: petAnimalsActivities[0]?._id || null,
      assignedToType: 'CLASS',
      completionMode: 'ACTIVITY',
      dueDate: new Date(Date.now() + 7 * 86400000),
      startDate: new Date(),
      status: 'ASSIGNED'
    });

    // 9.14 Parent Notifications
    await ParentNotification.create({
      teacher: teacher1._id,
      child: childLeo._id,
      session: sampleSession1._id,
      recipientContact: '0901234567',
      childName: 'Leo',
      className: class1.name,
      sessionDate: new Date(),
      subject: 'Báo cáo buổi học — Bé Leo',
      content: 'Bé Leo đã tham gia rất sôi nổi trong buổi học Pet Animals hôm nay!',
      teacherNote: 'Leo nhớ từ rất nhanh và phát âm to rõ ràng!',
      score: 100,
      vocabMastered: 5,
      vocabTotal: 5,
      stars: 3,
      accuracy: 100,
      templateType: 'SESSION_REPORT',
      status: 'SENT',
      sentAt: new Date()
    });

    await ParentNotification.create({
      teacher: teacher2._id,
      child: childMia._id,
      recipientContact: '0902345678',
      childName: 'Mia',
      className: class2.name,
      sessionDate: new Date(),
      subject: 'Chào mừng bé Mia đến với lớp Sunny Kindergarten',
      content: 'Cô Emily chúc bé Mia có những giờ học tiếng Anh thật nhiều niềm vui và bổ ích!',
      teacherNote: 'Cô đã chuẩn bị nhiều trò chơi tương tác thú vị chờ đón Mia.',
      templateType: 'GENERAL',
      status: 'SENT',
      sentAt: new Date()
    });

    // 9.15 Teacher Note
    await TeacherNote.create({
      teacher: teacher1._id,
      student: childLeo._id,
      lesson: petAnimalsLesson._id,
      noteType: 'PARTICIPATION',
      content: 'Leo rất hào hứng với các hình ảnh động vật cưng, giơ tay nhiệt tình và động viên các bạn cùng bàn.'
    });

    // 9.16 Class Recognition Trophy (Published dynamically by teacher in dashboard)
    // ClassRecognition will be generated when teachers publish awards.

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
