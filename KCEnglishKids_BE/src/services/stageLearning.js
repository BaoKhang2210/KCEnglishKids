const crypto = require('node:crypto');
const { Progress, Vocabulary, CurriculumUnit } = require('../models');
const Event = require('../models/LearningEvent');
const { activeLesson, fail } = require('./childAccess');
const { usable } = require('./gameRules');
const { calculateStars } = require('./starService');
const { checkAndGrantUnitCompletion } = require('./rewardService');

function gradeStage(stage, payload, words, game, age) {
  const ids = words.map(w => String(w._id));
  if (stage === 1) {
    if (!Array.isArray(payload.visitedWordIds) || new Set(payload.visitedWordIds).size !== ids.length || !ids.every(id => payload.visitedWordIds.includes(id))) fail('Explore every word first.', 400);
    return { score: 0, answers: [] };
  }
  const answers = payload.answers;
  if (!Array.isArray(answers) || !answers.length || answers.length > 500) fail('Complete the practice first.', 400);
  const allowed = new Set((game ? usable(game, words) : words).map(w => String(w._id)));
  if (answers.some(a => !a || !allowed.has(a.wordId) || (a.selectedId !== null && !ids.includes(a.selectedId)))) fail('Invalid practice answers.', 400);
  if (stage === 2) {
    const keys = answers.map(a => a.wordId + ':' + a.round);
    const abstract = new Set(words.filter(w => w.visualType === 'abstract' || w.imageUrl && words.some(other => String(other._id) !== String(w._id) && other.imageUrl === w.imageUrl)).map(w => String(w._id)));
    const duplicateImages = new Set(words.filter(word => word.imageUrl && words.some(other => String(other._id) !== String(word._id) && other.imageUrl === word.imageUrl)).map(word => String(word._id)));
    const required = ids.flatMap(id => (age === '5-6' ? duplicateImages.has(id) ? [1, 3] : [1, 2, 3] : !abstract.has(id) ? [1, 2, 3] : [3]).map(round => id + ':' + round));
    if (new Set(keys).size !== keys.length || answers.some(a => ![1, 2, 3].includes(a.round)) || !required.every(key => keys.includes(key))) fail('Complete all available practice rounds.', 400);
  } else {
    const count = game.targetCountByAge[age];
    if (answers.length !== count || new Set(answers.map(a => a.wordId)).size < Math.min(count, allowed.size)) fail('Incomplete game targets.', 400);
  }
  const graded = answers.map(a => {
    const word=words.find(word=>String(word._id)===a.wordId);
    const selected = words.find(item => String(item._id) === a.selectedId);
    const { vocabularyMeaning } = require('./vocabularySemantics');
    const correct = a.wordId === a.selectedId || Boolean(selected && vocabularyMeaning(word) === vocabularyMeaning(selected));
    return {wordId:a.wordId,selectedId:a.selectedId,round:a.round,isCorrect:correct,english:word.english,vietnamese:word.vietnamese,imageUrl:word.imageUrl};
  });
  return { score: Math.round(100 * graded.filter(a => a.isCorrect).length / graded.length), answers: graded };
}

async function completeStage(childId, lessonId, body) {
  const stage = Number(body.stage);
  if (![1, 2, 3].includes(stage) || typeof body.submissionId !== 'string' || !/^[a-zA-Z0-9_-]{8,120}$/.test(body.submissionId)) fail('Valid stage and submissionId required.', 400);
  const lesson = await activeLesson(childId, lessonId);
  const previous = await Progress.findOne({ child: childId, lesson: lessonId });
  if (stage > 1 && !previous?.stage1Completed || stage > 2 && !previous?.stage2Completed) fail('Complete previous stages first.', 409);
  const words = await Vocabulary.find({ _id: { $in: lesson.vocabularyItems }, status: 'ACTIVE' }).lean();
  if (words.length < 2) fail('Lesson needs at least two active words.', 409);
  if(stage>1)require('./learningPlan').verifyPlan(childId,lessonId,body,words);
  let game;
  if (stage === 3) {
    const unit = lesson.curriculumUnits?.length ? await CurriculumUnit.findById(lesson.curriculumUnits[0]) : null;
    game = (await require('./gameCatalog').configuredGames(words, unit?.unitNumber || 1, lesson.displayOrder || 1)).find(g => g.id === body.gameId);
    if (!game) fail('Game is not available for this lesson.', 400);
  }
  const graded = gradeStage(stage, body, words, game, lesson.ageGroupCode);
  const safePayload = { stage, gameId: game?.id, ...graded };
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(safePayload)).digest('hex');
  let event;
  try {
    event = await Event.findOneAndUpdate({ child: childId, submissionId: body.submissionId }, { $setOnInsert: { lesson: lessonId, payloadHash, ...safePayload } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    event = await Event.findOne({ child: childId, submissionId: body.submissionId });
  }
  if (event.payloadHash !== payloadHash || String(event.lesson) !== String(lessonId)) fail('Submission key already used for different evidence.', 409);
  const update = { $set: { topic: lesson.topic }, $max: {lastActivityAt: event.createdAt}, $setOnInsert: { child: childId, lesson: lessonId } };
  if (stage === 1) update.$set.stage1Completed = true;
  if (stage === 2) {
    update.$set.stage2Completed = true;
    Object.assign(update.$max, { stage2Score: graded.score, stage2Stars: calculateStars(graded.score, 100) });
    if(previous.stage3Completed) Object.assign(update.$max,{stars:calculateStars(graded.score,100),highestScore:graded.score});
  }
  if (stage === 3) update.$addToSet = { stage3Games: game.id };
  let progress;
  try {progress=await Progress.findOneAndUpdate({child:childId,lesson:lessonId},update,{upsert:true,returnDocument:'after',setDefaultsOnInsert:true});}
  catch(error){if(error.code!==11000)throw error;progress=await Progress.findOneAndUpdate({child:childId,lesson:lessonId},update,{returnDocument:'after'});}
  if (stage === 3 && progress.stage3Games.length >= 2) {
    // Practice accuracy determines Lesson stars. Game stars are encouragement only.
    progress = await Progress.findOneAndUpdate({ child: childId, lesson: lessonId, stage1Completed: true, stage2Completed: true }, {
      $set: { completed: true, stage3Completed: true, completionSnapshot: { source: 'STAGES', recordedAt: new Date(), activityIds: [] } },
      $max: { stars: progress.stage2Stars, highestScore: progress.stage2Score }
    }, { returnDocument: 'after' });
    await Event.updateOne({ _id: event._id }, { $set: { lessonCompleted: true } });
  }
  if (progress.completed) await checkAndGrantUnitCompletion(childId, lessonId);
  return progress;
}
module.exports = { completeStage, gradeStage };
