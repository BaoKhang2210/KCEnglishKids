const crypto = require('node:crypto');
const { Progress, Vocabulary, CurriculumUnit } = require('../models');
const Event = require('../models/LearningEvent');
const { activeLesson, fail } = require('./childAccess');
const { usable } = require('./gameRules');
const { checkAndGrantUnitCompletion } = require('./rewardService');
const StageStarGrant = require('../models/StageStarGrant');
const { completedStageCount, earnedForStage } = require('./stageStarPolicy');

function gradeStage(stage, payload, words, game, age) {
  const ids = words.map(w => String(w._id));
  if (stage === 1) {
    if (!Array.isArray(payload.visitedWordIds) || new Set(payload.visitedWordIds).size !== ids.length || !ids.every(id => payload.visitedWordIds.includes(id))) fail('Explore every word first.', 400);
    return { score: 0, answers: [] };
  }
  const answers = payload.answers;
  if (!Array.isArray(answers) || !answers.length || answers.length > 500) fail('Complete the practice first.', 400);
  const usableWords = game ? usable(game, words) : words;
  const allowed = new Set((usableWords.length ? usableWords : words).map(w => String(w._id)));
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
    const outcome = {wordId:a.wordId,selectedId:a.selectedId,round:a.round,isCorrect:correct,english:word.english,vietnamese:word.vietnamese,imageUrl:word.imageUrl};
    if (stage === 2) {
      if (a.wrongAttemptCount !== undefined && (!Number.isSafeInteger(a.wrongAttemptCount) || a.wrongAttemptCount < 0 || a.wrongAttemptCount > 20)) fail('Invalid practice attempt count.', 400);
      if (a.usedHint !== undefined && typeof a.usedHint !== 'boolean') fail('Invalid practice hint metadata.', 400);
      outcome.wrongAttemptCount = Number.isSafeInteger(a.wrongAttemptCount) ? a.wrongAttemptCount : null;
      outcome.usedHint = typeof a.usedHint === 'boolean' ? a.usedHint : null;
    }
    return outcome;
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
    game = (await require('./gameCatalog').configuredGames(words, unit?.unitNumber || 1, lesson.displayOrder || 1)).find(g => g.id === body.gameId)
      || require('../../../shared/learningGames.json').find(g => g.id === body.gameId);
    if (!game) fail('Game is not available for this lesson.', 400);
  }
  const graded = gradeStage(stage, body, words, game, lesson.ageGroupCode);
  const topologyType = Progress.db.getClient()?.topology?.description?.type;
  if (topologyType && !/ReplicaSet|Sharded/.test(topologyType)) {
    fail('Stage star awards require a transaction-capable MongoDB replica set.', 503);
  }
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
  let progress;
  const session = await Progress.db.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Progress.findOne({ child: childId, lesson: lessonId }).session(session);
      if (stage > 1 && !current?.stage1Completed || stage > 2 && !current?.stage2Completed) fail('Complete previous stages first.', 409);
      const nextGames = new Set([...(current?.stage3Games || []), ...(stage === 3 ? [game.id] : [])]);
      const existingStage3Complete = Boolean(current?.stage3Completed) || new Set(current?.stage3Games || []).size >= 2;
      const completesNow = stage === 1 ? !current?.stage1Completed
        : stage === 2 ? !current?.stage2Completed
          : !existingStage3Complete && nextGames.size >= 2;
      const existingGrant = await StageStarGrant.findOne({ child: childId, lesson: lessonId, stage }).session(session).lean();
      const stageStarsEarned = earnedForStage(completesNow && !existingGrant);
      const nextState = {
        stage1Completed: Boolean(current?.stage1Completed || stage === 1),
        stage2Completed: Boolean(current?.stage2Completed || stage === 2),
        stage3Completed: Boolean(current?.stage3Completed || stage === 3 && nextGames.size >= 2),
        stage3Games: [...nextGames],
      };
      const nextStars = Math.max(Number(current?.stars) || 0, completedStageCount(nextState));
      const set = { topic: lesson.topic, stars: Math.min(3, nextStars), lastActivityAt: event.createdAt };
      if (stage === 1) set.stage1Completed = true;
      if (stage === 2) { set.stage2Completed = true; set.stage2Score = Math.max(Number(current?.stage2Score) || 0, graded.score); }
      if (stage === 3) { set.stage3Games = [...nextGames]; if (nextState.stage3Completed) set.stage3Completed = true; }
      const fullyComplete = nextState.stage1Completed && nextState.stage2Completed && nextState.stage3Completed;
      if (fullyComplete) { set.completed = true; set.completionSnapshot = { source: 'STAGES', recordedAt: new Date(), activityIds: [] }; }
      progress = await Progress.findOneAndUpdate({ child: childId, lesson: lessonId }, {
        $set: set,
        $setOnInsert: { child: childId, lesson: lessonId },
        $max: { highestScore: stage === 2 ? graded.score : Number(current?.highestScore) || 0 }
      }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, session });
      if (stageStarsEarned) {
        await StageStarGrant.create([{ child: childId, lesson: lessonId, stage, submissionId: body.submissionId, amount: stageStarsEarned }], { session });
      }
    });
  } finally {
    await session.endSession();
  }
  const stageStarGrant = await StageStarGrant.findOne({ child: childId, lesson: lessonId, stage }).lean();
  const stageStarsEarned = stageStarGrant?.submissionId === body.submissionId ? 1 : 0;
  const stageStars = {
    stage1: Number(Boolean(progress.stage1Completed)),
    stage2: Number(Boolean(progress.stage2Completed)),
    stage3: Number(Boolean(progress.stage3Completed || new Set(progress.stage3Games || []).size >= 2)),
  };
  if (progress.completed) {
    await Event.updateOne({ _id: event._id }, { $set: { lessonCompleted: true } });
  }
  if (progress.completed) await checkAndGrantUnitCompletion(childId, lessonId);
  if (stage !== 2) return { ...progress.toObject(), completedStage: stage, starsEarned: stageStarsEarned, stageStars, totalStars: Math.min(3, Number(progress.stars) || 0) };

  const reportService = require('../config/stage2Report');
  const vocabReview = require('./vocabReview');
  const stage2Report = reportService.buildStage2Report(event.answers || graded.answers, words, progress, stageStarsEarned);
  if (!event.stage2Report) {
    await Event.updateOne({ _id: event._id }, { $set: { stage2Report } });
  }
  // Stage 2 is one of the two writers of the Leitner schedule; quick review is
  // the other. Both go through vocabReview so the notebook reads one source.
  const storedReport = event.stage2Report || stage2Report;
  const reviewSnapshots = await vocabReview.applyStage2Report({
    childId,
    report: storedReport,
    ageGroup: lesson.ageGroupCode,
    submissionId: body.submissionId
  });
  const confirmedReport = {
    ...vocabReview.attachReview(storedReport, reviewSnapshots),
    starsBest: Math.min(3, Number(progress.stars) || 0),
    stageStars
  };
  return {
    ...progress.toObject(),
    completedStage: stage,
    starsEarned: stageStarsEarned,
    stageStars,
    totalStars: Math.min(3, Number(progress.stars) || 0),
    stage2Report: confirmedReport,
  };
}
module.exports = { completeStage, gradeStage };
