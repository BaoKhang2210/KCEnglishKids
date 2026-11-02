const MAX_LESSON_STARS = 3;
const STAGE_COUNT = 3;
const REQUIRED_STAGE3_GAMES = 2;

function completedStageCount(progress = {}) {
  return Number(Boolean(progress.stage1Completed))
    + Number(Boolean(progress.stage2Completed))
    + Number(Boolean(progress.stage3Completed || new Set(progress.stage3Games || []).size >= REQUIRED_STAGE3_GAMES));
}

function earnedForStage(firstCompletion) {
  return firstCompletion ? 1 : 0;
}

module.exports = { MAX_LESSON_STARS, STAGE_COUNT, REQUIRED_STAGE3_GAMES, completedStageCount, earnedForStage };
