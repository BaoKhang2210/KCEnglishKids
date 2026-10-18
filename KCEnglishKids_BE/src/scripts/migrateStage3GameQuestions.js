/**
 * Safely enrich short arcade activities with more lesson-vocabulary questions.
 *
 * Dry-run (default): node src/scripts/migrateStage3GameQuestions.js
 * Apply changes:     node src/scripts/migrateStage3GameQuestions.js --apply
 * Offline checks:    node src/scripts/migrateStage3GameQuestions.js --self-test
 *
 * This migration only appends questions that have not already been tested by
 * the activity. It never deletes/reseeds records and is safe to rerun.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();
const { Activity } = require('../models');

const MIN_QUESTIONS = 4;
const MAX_QUESTIONS = 6;

const SUPPORTED_TYPES = new Set([
  'LISTEN_CHOOSE', 'COLOR_RECOGNITION', 'TAP_PICTURE', 'BUBBLE_POP',
  'ANIMAL_SOUND', 'IMAGE_WORD_MATCH', 'COUNT_OBJECTS', 'MISSING_OBJECT',
  'STAR_CATCHER', 'FEED_ANIMAL', 'TRUE_FALSE', 'DRAG_DROP', 'FIND_OBJECT',
  'LISTEN_REPEAT', 'MATCHING', 'MEMORY'
]);

const UNSUPPORTED_TYPE_REASONS = {
  MEMORY_CARD: 'Engine giới hạn số cặp theo tuổi và hiện tự hoàn tất mọi câu khi kết thúc; thêm câu sẽ làm sai điểm.',
  CLASSIFICATION: 'Câu phân loại cần metadata danh mục được biên soạn riêng, không thể suy ra an toàn chỉ từ từ vựng.'
};

const normalize = value => String(value || '').trim().toLocaleLowerCase('en-US');

const stableObjectId = value =>
  crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);

const getWordKey = vocab => String(vocab?._id || vocab?.id || normalize(vocab?.english));

const getExistingWordKeys = questions => {
  const seen = new Set();
  for (const question of questions || []) {
    const metadata = question.metadata || {};
    const vocabularyId = question.vocabulary?._id || question.vocabulary;
    if (vocabularyId) seen.add(String(vocabularyId));

    const possibleWords = [
      metadata.targetWord, metadata.word, metadata.missingObject,
      metadata.speechTarget, metadata.object, question.correctAnswer
    ];
    for (const value of possibleWords) {
      if (value) seen.add(normalize(value));
    }
  }
  return seen;
};

const buildOptions = (target, vocabulary, idPrefix) => {
  const distractors = vocabulary
    .filter(item => getWordKey(item) !== getWordKey(target))
    .slice(0, 2);
  if (distractors.length < 2) return null;

  return [target, ...distractors].map((item, index) => ({
    id: `${idPrefix}_option_${index}`,
    text: item.english,
    vietnameseText: item.vietnamese,
    imageUrl: item.imageUrl || '',
    audioUrl: item.audioUrl || '',
    isCorrect: getWordKey(item) === getWordKey(target)
  }));
};

const buildQuestion = (activity, target, vocabulary, index) => {
  const type = activity.activityType;
  const stableKey = `${activity._id}:${getWordKey(target)}`;
  const idPrefix = `s3_${stableObjectId(stableKey)}`;
  const options = buildOptions(target, vocabulary, idPrefix);
  if (!options) return null;

  const image = target.imageUrl || '';
  const audio = target.audioUrl || '';
  const question = {
    _id: new mongoose.Types.ObjectId(stableObjectId(`${stableKey}:question`)),
    promptText: target.english,
    promptAudioUrl: audio,
    promptImageUrl: image,
    correctAnswer: target.english,
    options,
    vocabulary: target._id,
    explanation: `Đúng rồi! Đây là ${target.english}${target.vietnamese ? ` (${target.vietnamese})` : ''}.`,
    metadata: { vocabularyId: target._id, targetWord: target.english }
  };

  if (type === 'COLOR_RECOGNITION') {
    question.promptText = `Find the ${target.english} object.`;
    question.metadata = {
      ...question.metadata,
      targetColor: target.english,
      correctObject: target.english,
      audioPrompt: question.promptText
    };
  } else if (type === 'COUNT_OBJECTS') {
    const quantity = Number(activity.questions?.find(q => q.metadata?.quantity)?.metadata?.quantity || 1);
    if (quantity > 10) return null;
    const numberOptions = [...new Set([quantity, Math.max(1, quantity - 1), quantity + 1])].slice(0, 3);
    question.promptText = `How many ${target.english}s can you see?`;
    question.promptImageUrl = image;
    question.correctAnswer = String(quantity);
    question.options = numberOptions.map((value, optionIndex) => ({
      id: `${idPrefix}_number_${optionIndex}`,
      text: String(value),
      isCorrect: value === quantity
    }));
    question.metadata = {
      object: target.english,
      objectEmoji: '⭐',
      image,
      quantity,
      numberOptions,
      correctAnswer: String(quantity)
    };
  } else if (type === 'MISSING_OBJECT') {
    const visibleObjects = vocabulary
      .filter(item => getWordKey(item) !== getWordKey(target))
      .slice(0, 3)
      .map(item => item.english);
    question.promptText = 'Which object is missing?';
    question.metadata = {
      visibleObjects,
      initialObjects: [...visibleObjects, target.english],
      missingObject: target.english,
      options: [target.english, ...visibleObjects.slice(0, 2)]
    };
    question.options = [target, ...vocabulary.filter(item => getWordKey(item) !== getWordKey(target)).slice(0, 2)]
      .map((item, optionIndex) => ({
        id: `${idPrefix}_missing_${optionIndex}`,
        text: item.english,
        vietnameseText: item.vietnamese,
        imageUrl: item.imageUrl || '',
        isCorrect: getWordKey(item) === getWordKey(target)
      }));
  } else if (type === 'TRUE_FALSE') {
    const isTrue = index % 2 === 0;
    const statementWord = isTrue ? target.english : vocabulary.find(item => getWordKey(item) !== getWordKey(target)).english;
    question.promptText = `Is this a ${statementWord}?`;
    question.correctAnswer = isTrue ? 'True' : 'False';
    question.options = [
      { id: `${idPrefix}_true`, text: 'True', isCorrect: isTrue },
      { id: `${idPrefix}_false`, text: 'False', isCorrect: !isTrue }
    ];
    question.metadata = {
      statement: `This is a ${statementWord}.`,
      image,
      correctAnswer: question.correctAnswer,
      targetWord: target.english
    };
  } else if (type === 'IMAGE_WORD_MATCH') {
    question.promptText = `Match the picture of ${target.english}`;
    question.metadata = {
      image,
      word: target.english,
      matchingPair: { word: target.english, image }
    };
  } else if (type === 'FIND_OBJECT') {
    question.promptText = `Find the ${target.english}!`;
    question.metadata = {
      scene: 'Lesson vocabulary scene',
      target: target.english,
      distractors: options.filter(option => !option.isCorrect).map(option => option.text),
      audioPrompt: `Find the ${target.english}!`
    };
  } else if (type === 'LISTEN_REPEAT') {
    question.promptText = `Listen and choose ${target.english}`;
    question.metadata = { speechTarget: target.english, audioPrompt: audio };
  }

  return question;
};

const enrichActivity = (activity, vocabularyItems) => {
  const type = String(activity.activityType || '').toUpperCase();
  const existing = activity.questions || [];
  if (existing.length >= MIN_QUESTIONS) return { questions: [], reason: 'Đã đủ số câu tối thiểu.' };
  if (UNSUPPORTED_TYPE_REASONS[type]) return { questions: [], reason: UNSUPPORTED_TYPE_REASONS[type] };
  if (!SUPPORTED_TYPES.has(type)) return { questions: [], reason: `Chưa có bộ sinh câu an toàn cho ${type || 'loại game chưa rõ'}.` };

  const words = [...new Map((vocabularyItems || [])
    .filter(item => item?._id && item?.english && item?.imageUrl)
    .map(item => [normalize(item.english), item])).values()];
  if (words.length < 3) return { questions: [], reason: 'Bài học cần ít nhất 3 từ có hình để tạo câu hỏi và đáp án nhiễu.' };

  const seen = getExistingWordKeys(existing);
  const missingTargets = words.filter(item => !seen.has(getWordKey(item)) && !seen.has(normalize(item.english)));
  const needed = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, existing.length)) - existing.length;
  const additions = [];

  for (const target of missingTargets) {
    if (additions.length >= needed) break;
    const question = buildQuestion(activity, target, words, existing.length + additions.length);
    if (question) additions.push(question);
  }

  const total = existing.length + additions.length;
  if (total < MIN_QUESTIONS) {
    return {
      questions: additions,
      reason: `Chỉ có thể đạt ${total}/${MIN_QUESTIONS} câu hợp lệ từ từ vựng hiện có.`
    };
  }
  return { questions: additions, reason: additions.length ? 'Có thể bổ sung.' : 'Không còn từ vựng mới để bổ sung.' };
};

const runSelfTest = () => {
  const words = [
    { _id: 'vocab-apple', english: 'apple', vietnamese: 'táo', imageUrl: '/apple.png' },
    { _id: 'vocab-banana', english: 'banana', vietnamese: 'chuối', imageUrl: '/banana.png' },
    { _id: 'vocab-orange', english: 'orange', vietnamese: 'cam', imageUrl: '/orange.png' },
    { _id: 'vocab-grape', english: 'grape', vietnamese: 'nho', imageUrl: '/grape.png' }
  ];
  const activity = {
    _id: 'activity-test',
    activityType: 'LISTEN_CHOOSE',
    questions: [{ vocabulary: 'vocab-apple', correctAnswer: 'apple', options: [] }]
  };
  const firstRun = enrichActivity(activity, words);
  const afterFirstRun = [...activity.questions, ...firstRun.questions];
  const secondRun = enrichActivity({ ...activity, questions: afterFirstRun }, words);
  if (afterFirstRun.length !== 4 || secondRun.questions.length !== 0) {
    throw new Error('Idempotence check failed: expected 4 questions after one run and no additions on rerun.');
  }
  if (firstRun.questions.some(question => question.options.length > 3 || question.options.filter(option => option.isCorrect).length !== 1)) {
    throw new Error('Option validation failed: each generated question must have at most 3 options and exactly one correct answer.');
  }

  const count = enrichActivity({
    _id: 'activity-count-test', activityType: 'COUNT_OBJECTS',
    questions: [{ vocabulary: 'vocab-apple', metadata: { quantity: 3 } }]
  }, words);
  if (count.questions.length !== 3 || count.questions.some(question => !question.metadata.quantity || question.options.length !== 3)) {
    throw new Error('COUNT_OBJECTS metadata check failed.');
  }

  const missing = enrichActivity({
    _id: 'activity-missing-test', activityType: 'MISSING_OBJECT',
    questions: [{ vocabulary: 'vocab-apple' }]
  }, words);
  if (missing.questions.some(question => !question.metadata.initialObjects?.includes(question.correctAnswer))) {
    throw new Error('MISSING_OBJECT scene check failed.');
  }
  console.log('Stage 3 question migration self-test passed (idempotence, <=3 choices, count and missing-object metadata).');
};

const main = async () => {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const apply = process.argv.includes('--apply');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kcenglishkids';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to database: ${mongoose.connection.name}`);
  console.log(apply ? 'Mode: APPLY' : 'Mode: DRY RUN (pass --apply to write changes)');

  const activities = await Activity.find({ status: 'ACTIVE' })
    .populate({
      path: 'lesson',
      select: 'vocabularyItems',
      populate: { path: 'vocabularyItems', select: 'english vietnamese imageUrl audioUrl' }
    })
    .lean();

  let updated = 0;
  let unchanged = 0;
  let belowTarget = 0;

  for (const activity of activities) {
    const existing = activity.questions || [];
    if (existing.length >= MIN_QUESTIONS) {
      unchanged++;
      continue;
    }

    const result = enrichActivity(activity, activity.lesson?.vocabularyItems || []);
    const finalQuestions = [...existing, ...result.questions];
    if (finalQuestions.length < MIN_QUESTIONS) belowTarget++;
    if (result.questions.length === 0) {
      console.log(`SKIP [${activity.activityType}] ${activity.title}: ${result.reason}`);
      unchanged++;
      continue;
    }

    console.log(`${apply ? 'UPDATE' : 'WOULD UPDATE'} [${activity.activityType}] ${activity.title}: ${existing.length} -> ${finalQuestions.length} (${result.reason})`);
    if (apply) {
      await Activity.updateOne(
        { _id: activity._id },
        {
          $set: {
            questions: finalQuestions,
            questionCount: finalQuestions.length,
            pointsPerQuestion: Math.floor(100 / finalQuestions.length)
          }
        }
      );
    }
    updated++;
  }

  console.log(`\n${apply ? 'Applied' : 'Dry-run'} summary: ${updated} activities ${apply ? 'updated' : 'ready'}, ${unchanged} unchanged, ${belowTarget} still below ${MIN_QUESTIONS} questions.`);
  await mongoose.disconnect();
};

main().catch(async error => {
  console.error('Stage 3 question migration failed:', error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
