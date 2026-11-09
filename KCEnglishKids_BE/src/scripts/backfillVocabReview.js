/**
 * Backfill the Leitner review schedule from stored Stage 2 reports.
 *
 * Dry-run by default. Nothing is written until --apply is passed.
 * Refuses to run when NODE_ENV=production unless --force is passed.
 *
 * Rules:
 *  - Replays each child+word's Stage 2 ratings chronologically through the same
 *    pure transition used by live submissions (services/vocabReview.applyOutcome).
 *  - Legacy reports without per-word ratings are skipped; no level is invented.
 *  - Records that already have reviewAlgorithmVersion >= 1 are skipped, so the
 *    script is re-runnable and never competes with live state.
 *  - A write that would lower a legacy visible masteryLevel is skipped and
 *    reported for manual confirmation.
 *  - Overdue non-REVIEW due dates are spread deterministically across the next
 *    few days (hash(wordId) % diluteWindowDays) to avoid a review mountain.
 *
 * Usage:
 *   node src/scripts/backfillVocabReview.js                 # dry run
 *   node src/scripts/backfillVocabReview.js --child=<id>    # one child
 *   node src/scripts/backfillVocabReview.js --apply         # write
 *   NODE_ENV=production node ... --apply --force            # explicit override
 */
const crypto = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('../models/LearningEvent');
const { VocabularyMastery, User } = require('../models');
const vocabReview = require('../services/vocabReview');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');
const CHILD = (args.find((arg) => arg.startsWith('--child=')) || '').split('=')[1] || '';
const DILUTE_DAYS = Math.max(1, Number(vocabReview.CONFIG.backfill?.diluteWindowDays) || 5);

if (process.env.NODE_ENV === 'production' && !FORCE) {
  console.error('Refusing to run against production. Re-run with --force only after a verified backup.');
  process.exit(1);
}

const masteryLevelFor = (level, maxLevel) => (level >= maxLevel ? 3 : level >= 2 ? 2 : level >= 1 ? 1 : 0);
const hashOffset = (value) => parseInt(crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 8), 16) % DILUTE_DAYS;

const emptyState = () => ({
  reviewAlgorithmVersion: 0,
  reviewLevel: 0,
  reviewDueOn: null,
  lastPromotionOn: null,
  demotionCount: 0,
  lastReviewOutcome: null
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kcenglishkids');
  console.log('Connected to', mongoose.connection.name);
  console.log(APPLY ? 'Mode: APPLY' : 'Mode: DRY RUN (no writes)');

  const filter = { stage: 2, stage2Report: { $ne: null } };
  if (CHILD) filter.child = CHILD;
  const events = await Event.find(filter)
    .select('child lesson stage2Report createdAt submissionId')
    .sort({ child: 1, createdAt: 1, _id: 1 })
    .lean();
  console.log(`Found ${events.length} Stage 2 events with reports.`);

  const byChild = new Map();
  for (const event of events) {
    const words = Array.isArray(event.stage2Report?.words) ? event.stage2Report.words : [];
    for (const word of words) {
      if (!word?.wordId || !word.rating) continue;
      const key = String(event.child);
      if (!byChild.has(key)) byChild.set(key, new Map());
      const byWord = byChild.get(key);
      const wordKey = String(word.wordId);
      if (!byWord.has(wordKey)) byWord.set(wordKey, []);
      byWord.get(wordKey).push({ event, word });
    }
  }

  const today = vocabReview.dayKey();
  const childIds = [...byChild.keys()];
  const users = await User.find({ _id: { $in: childIds } }).select('ageGroupCode').lean();
  const ageByChild = new Map(users.map((user) => [String(user._id), user.ageGroupCode || '4-5']));
  const existing = await VocabularyMastery.find({ student: { $in: childIds } })
    .select('student vocabulary masteryLevel reviewAlgorithmVersion')
    .lean();
  const existingByKey = new Map(existing.map((row) => [`${row.student}:${row.vocabulary}`, row]));

  const dueDistribution = new Map();
  const operations = [];
  let wordsConsidered = 0;
  let skippedLive = 0;
  let skippedLower = 0;

  for (const [childId, byWord] of byChild.entries()) {
    const ageGroup = ageByChild.get(childId) || '4-5';
    for (const [wordId, rows] of byWord.entries()) {
      wordsConsidered += 1;
      const record = existingByKey.get(`${childId}:${wordId}`);
      if (Number(record?.reviewAlgorithmVersion) >= 1) {
        skippedLive += 1;
        continue;
      }
      let state = emptyState();
      let lastRow = null;
      for (const row of rows) {
        const day = vocabReview.dayKey(row.event.createdAt);
        state = vocabReview.applyOutcome(state, row.word.rating, {
          ageGroup,
          today: day,
          submissionId: row.event.submissionId
        });
        lastRow = row;
      }
      if (!lastRow) continue;

      const maxLevel = vocabReview.intervalsFor(ageGroup).length;
      const nextMastery = masteryLevelFor(state.reviewLevel, maxLevel);
      if (Number(record?.masteryLevel) > nextMastery) {
        skippedLower += 1;
        continue;
      }

      let dueOn = state.reviewDueOn;
      if (state.lastReviewOutcome === 'REVIEW') {
        dueOn = vocabReview.addDays(today, 1);
      } else if (dueOn && dueOn <= today) {
        dueOn = vocabReview.addDays(today, 1 + hashOffset(wordId));
      }
      dueDistribution.set(dueOn, (dueDistribution.get(dueOn) || 0) + 1);

      const mastered = state.reviewLevel >= maxLevel;
      const rounds = Array.isArray(lastRow.word.rounds) ? lastRow.word.rounds : [];
      operations.push({
        updateOne: {
          filter: { student: childId, vocabulary: wordId, reviewAlgorithmVersion: { $not: { $gte: 1 } } },
          update: {
            $set: {
              reviewAlgorithmVersion: 1,
              reviewLevel: state.reviewLevel,
              reviewMaxLevel: maxLevel,
              reviewDueOn: dueOn,
              reviewStatus: mastered ? 'MASTERED' : state.lastReviewOutcome === 'REVIEW' ? 'REVIEW' : state.lastReviewOutcome === 'PRACTICE' ? 'PRACTICE' : 'LEARNING',
              lastReviewOutcome: state.lastReviewOutcome,
              lastReviewSubmissionId: lastRow.event.submissionId || null,
              lastPromotionOn: state.lastPromotionOn,
              demotionCount: state.demotionCount,
              lastPracticedOn: state.lastPracticedOn,
              masteryLevel: nextMastery,
              needsReview: !mastered,
              nextReviewAt: vocabReview.dayStartUtc(dueOn),
              lastRoundMarks: rounds.map((round) => ({
                code: round.code ?? null,
                key: round.key || null,
                name: round.name || '',
                rating: round.rating || null,
                isCorrect: Boolean(round.isCorrect),
                wrongAttemptCount: Number.isSafeInteger(round.wrongAttemptCount) ? round.wrongAttemptCount : null,
                usedHint: typeof round.usedHint === 'boolean' ? round.usedHint : null
              })),
              lastReviewedAt: lastRow.event.createdAt
            }
          },
          upsert: true
        }
      });
    }
  }

  console.log(`\nWords with Stage 2 evidence: ${wordsConsidered}`);
  console.log(`Already on the live schedule (skipped): ${skippedLive}`);
  console.log(`Would lower a legacy visible level (skipped): ${skippedLower}`);
  console.log(`Words ${APPLY ? 'to write' : 'that would change'}: ${operations.length}`);
  console.log('\nProjected due-date distribution:');
  [...dueDistribution.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .forEach(([dueOn, count]) => console.log(`  ${dueOn || '(none)'}: ${count}`));

  if (APPLY && operations.length) {
    const result = await VocabularyMastery.bulkWrite(operations, { ordered: false });
    console.log(`\nWritten. matched=${result.matchedCount ?? '?'} upserted=${result.upsertedCount ?? '?'} modified=${result.modifiedCount ?? '?'}`);
  } else if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exit(1);
});
