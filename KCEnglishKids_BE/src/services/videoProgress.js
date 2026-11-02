const CONFIG = require('../../../shared/videoLearning.json');

const SKILL_LABELS = {
  listen: 'Xem',
  read: 'Nghe từng câu',
  speak: 'Nói theo',
  quiz: 'Chơi',
  dub: 'Lồng tiếng'
};

const ACTIVITY_LABELS = {
  listen: 'Xem video',
  read: 'Đọc phụ đề',
  speak: 'Luyện nói',
  dub: 'Lồng tiếng'
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundPercent = (value) => Math.round(clamp(Number(value) || 0, 0, 100));
const ratio = (part, total) => (total > 0 ? part / total : 0);

function ageGroupRank(code) {
  return CONFIG.ageOrder.indexOf(code);
}

/** A child may browse their own age group and every younger one, never older. */
function accessibleAgeGroups(code) {
  const rank = ageGroupRank(code);
  if (rank < 0) return [...CONFIG.ageOrder];
  return CONFIG.ageOrder.slice(0, rank + 1);
}

function isAgeAllowedForChild(childAgeGroup, contentAgeGroup) {
  const childRank = ageGroupRank(childAgeGroup);
  const contentRank = ageGroupRank(contentAgeGroup);
  if (childRank < 0 || contentRank < 0) return false;
  return contentRank <= childRank;
}

/** Levels shown in one age tab (own level plus the younger levels it reviews). */
function levelsForAgeTab(ageGroup) {
  return [...new Set(CONFIG.ageLevels[ageGroup] || [])];
}

/** Every level a child may open: own level plus every younger level. */
function accessibleLevelsFor(code) {
  const levels = accessibleAgeGroups(code).flatMap((age) => levelsForAgeTab(age));
  return [...new Set(levels)];
}

function isLevelAllowedForChild(childAgeGroup, level) {
  return accessibleLevelsFor(childAgeGroup).includes(level);
}

function ageGroupsForLevel(level) {
  return [...new Set(CONFIG.levelAgeGroups?.[level] || [])];
}

function effectiveClipEnd(episode) {
  const duration = Number(episode?.duration) || 0;
  const clipEnd = Number(episode?.clipEnd) || 0;
  if (clipEnd > 0 && duration > 0) return Math.min(clipEnd, duration);
  return clipEnd > 0 ? clipEnd : duration;
}

function validCues(subtitles) {
  const seen = new Set();
  return (Array.isArray(subtitles) ? subtitles : [])
    .filter((cue) => {
      if (!cue || !Number.isFinite(Number(cue.start)) || !Number.isFinite(Number(cue.end))) return false;
      if (!cue.text || !String(cue.text).trim()) return false;
      if (Number(cue.end) <= Number(cue.start)) return false;
      if (seen.has(cue.idx)) return false;
      seen.add(cue.idx);
      return true;
    })
    .map((cue) => ({
      idx: Number(cue.idx),
      start: Number(cue.start),
      end: Number(cue.end),
      text: String(cue.text).trim(),
      translationVi: String(cue.translationVi || '').trim()
    }))
    .sort((a, b) => a.idx - b.idx);
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/** Stored cues win; otherwise the source caption count is the usable range. */
function cueTotalFor(episode, cues = validCues(episode?.subtitles)) {
  return cues.length > 0 ? cues.length : Math.max(0, Number(episode?.captionCueCount) || 0);
}

function cueIndexSet(episode, cues = validCues(episode?.subtitles)) {
  if (cues.length > 0) return new Set(cues.map((cue) => cue.idx));
  const total = cueTotalFor(episode, cues);
  return new Set(Array.from({ length: total }, (_, index) => index + 1));
}

/**
 * The four-part counter shown next to every lesson in the source sidebar:
 * watch, read subtitles, speak along and dub. Exercises stay a separate count.
 */
function availableActivitiesFor(episode, series) {
  const total = cueTotalFor(episode);
  const activities = ['listen'];
  if (total > 0 && episode?.canReading !== false) activities.push('read', 'speak');
  if (series?.hasDubbing && episode?.canDubbing !== false) activities.push('dub');
  return activities;
}

/**
 * A quiz can only be generated when there are at least `minCues` distinct,
 * meaningful sentences (each with at least `minWordsPerCue` words).
 */
function isQuizEligible(subtitles, config = CONFIG.quiz) {
  const unique = new Set(
    validCues(subtitles)
      .map((cue) => cue.text.toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim())
      .filter((text) => wordCount(text) >= config.minWordsPerCue)
  );
  return unique.size >= config.minCues;
}

function buildQuizFromCues(subtitles, config = CONFIG.quiz) {
  const cues = validCues(subtitles).filter((cue) => wordCount(cue.text) >= config.minWordsPerCue);
  const uniqueText = new Set();
  const candidates = cues.filter((cue) => {
    const normalized = cue.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (uniqueText.has(normalized)) return false;
    uniqueText.add(normalized);
    return true;
  });
  if (candidates.length < config.minCues) return [];

  return candidates.slice(0, 6).map((cue, index) => {
    const decoys = candidates
      .filter((other) => other.idx !== cue.idx)
      .slice(index + 1)
      .concat(candidates.filter((other) => other.idx !== cue.idx).slice(0, index + 1))
      .slice(0, 2);
    return {
      idx: index,
      cueIdx: cue.idx,
      type: 'listen_choose_sentence',
      prompt: 'Con vừa nghe câu nào?',
      options: [
        { text: cue.text, correct: true },
        ...decoys.map((decoy) => ({ text: decoy.text, correct: false }))
      ]
    };
  });
}

function availableSkillsFor(episode, series, config = CONFIG) {
  const cues = validCues(episode?.subtitles);
  const hasCues = cues.length > 0;
  const skills = ['listen'];
  if (hasCues) skills.push('read', 'speak');
  // A quiz is available whenever the cues themselves are eligible; quizzes can
  // be derived on demand even if the episode has no stored copy yet.
  if (isQuizEligible(cues, config.quiz)) skills.push('quiz');
  // Dubbing, reading and speaking stay source capabilities (canDubbing /
  // canReading) until their player steps ship; counting them as tracked skills
  // would make an exact-catalogue episode impossible to complete.
  return skills;
}

/** Stored quizzes win; otherwise derived quizzes keep the skill playable. */
function effectiveQuizzes(episode, config = CONFIG) {
  const stored = Array.isArray(episode?.quizzes) ? episode.quizzes : [];
  if (stored.length > 0) return stored;
  return isQuizEligible(validCues(episode?.subtitles), config.quiz)
    ? buildQuizFromCues(episode?.subtitles, config.quiz)
    : [];
}

function uniqueCueIndexes(values, allowed) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number).filter((idx) => allowed.has(idx)))].sort(
    (a, b) => a - b
  );
}

/**
 * Pure server-side progress computation. The client only sends raw events;
 * every derived value (done flags, percent, completion) comes from here.
 */
function computeProgress(episode, series, raw = {}, config = CONFIG) {
  const cues = validCues(episode?.subtitles);
  const cueTotal = cueTotalFor(episode, cues);
  const allowedCueIdx = cueIndexSet(episode, cues);
  const quizzes = effectiveQuizzes(episode, config);
  const availableSkills = availableSkillsFor(episode, series, config);

  const watchedPercent = roundPercent(raw?.listen?.watchedPercent);
  const readIdx = uniqueCueIndexes(raw?.read?.readIdx, allowedCueIdx);
  const markedIdx = uniqueCueIndexes(raw?.speak?.markedIdx, allowedCueIdx);
  const seenQuiz = new Set();
  const answers = (Array.isArray(raw?.quiz?.answers) ? raw.quiz.answers : [])
    .filter((answer) => {
      const idx = Number(answer?.idx);
      if (!Number.isInteger(idx) || idx < 0 || idx >= quizzes.length || seenQuiz.has(idx)) return false;
      seenQuiz.add(idx);
      return true;
    })
    .map((answer) => ({ idx: Number(answer.idx), firstTryCorrect: Boolean(answer.firstTryCorrect) }));

  const firstTryCorrect = answers.filter((answer) => answer.firstTryCorrect).length;
  const listenDone = watchedPercent >= config.progress.listenDonePercent;
  const readDone = cueTotal > 0 && ratio(readIdx.length, cueTotal) >= config.progress.readDoneRatio;
  const speakDone = cueTotal > 0 && ratio(markedIdx.length, cueTotal) >= config.progress.speakDoneRatio;
  const quizDone =
    quizzes.length > 0 &&
    answers.length >= quizzes.length &&
    ratio(firstTryCorrect, quizzes.length) * 100 >= config.progress.quizFirstTryPercent;
  const dubDone = Boolean(series?.hasDubbing && raw?.dub?.done);

  const doneBySkill = { listen: listenDone, read: readDone, speak: speakDone, quiz: quizDone, dub: dubDone };
  const skills = availableSkills.map((key) => ({
    key,
    label: SKILL_LABELS[key],
    done: Boolean(doneBySkill[key])
  }));
  const doneCount = skills.filter((skill) => skill.done).length;
  const completed = skills.length > 0 && doneCount === skills.length;

  const activities = availableActivitiesFor(episode, series).map((key) => ({
    key,
    label: ACTIVITY_LABELS[key],
    done: Boolean(doneBySkill[key])
  }));
  const activityDone = activities.filter((activity) => activity.done).length;
  const activityTotal = activities.length;

  return {
    availableSkills,
    skills,
    completed,
    percent: skills.length ? Math.round((doneCount / skills.length) * 100) : 0,
    activities,
    activityDone,
    activityTotal,
    activityPercent: activityTotal ? Math.round((activityDone / activityTotal) * 100) : 0,
    watchedPercent,
    lastPositionSec: clamp(Number(raw?.lastPositionSec) || 0, 0, effectiveClipEnd(episode) || Number.MAX_SAFE_INTEGER),
    readIdx,
    markedIdx,
    quiz: {
      answers,
      score: firstTryCorrect,
      total: quizzes.length,
      done: quizDone
    },
    dubDone
  };
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

/**
 * Merge one raw heartbeat/event into a stored progress document.
 * Previous values are preserved (never downgraded).
 */
function mergeProgressEvent(existing, event, episode, series, config = CONFIG) {
  const raw = {
    listen: { watchedPercent: existing?.listen?.watchedPercent || 0 },
    read: { readIdx: existing?.read?.readIdx || [] },
    speak: { markedIdx: existing?.speak?.markedIdx || [] },
    quiz: { answers: existing?.quiz?.answers || [] },
    dub: { done: Boolean(existing?.dub?.done) },
    lastPositionSec: existing?.lastPositionSec || 0
  };
  const type = event?.type;
  const cues = validCues(episode?.subtitles);
  const allowed = cueIndexSet(episode, cues);

  if (type === 'listen') {
    const percent = Number(event.watchedPercent);
    if (!Number.isFinite(percent)) throw badRequest('watchedPercent must be a number.');
    raw.listen.watchedPercent = Math.max(raw.listen.watchedPercent, roundPercent(percent));
  } else if (type === 'heartbeat') {
    // One periodic call carries both the watched share and the resume position.
    const percent = Number(event.watchedPercent);
    if (!Number.isFinite(percent)) throw badRequest('watchedPercent must be a number.');
    raw.listen.watchedPercent = Math.max(raw.listen.watchedPercent, roundPercent(percent));
    if (event.lastPositionSec !== undefined) {
      const position = Number(event.lastPositionSec);
      if (!Number.isFinite(position) || position < 0) {
        throw badRequest('lastPositionSec must be a positive number.');
      }
      raw.lastPositionSec = clamp(position, 0, effectiveClipEnd(episode) || position);
    }
  } else if (type === 'position') {
    const position = Number(event.lastPositionSec);
    if (!Number.isFinite(position) || position < 0) throw badRequest('lastPositionSec must be a positive number.');
    raw.lastPositionSec = clamp(position, 0, effectiveClipEnd(episode) || position);
  } else if (type === 'read') {
    const idx = Number(event.idx);
    if (!Number.isInteger(idx) || !allowed.has(idx)) throw badRequest('read idx is not a valid subtitle cue.');
    raw.read.readIdx = [...new Set([...raw.read.readIdx, idx])];
  } else if (type === 'speak') {
    const idx = Number(event.idx);
    if (!Number.isInteger(idx) || !allowed.has(idx)) throw badRequest('speak idx is not a valid subtitle cue.');
    raw.speak.markedIdx = [...new Set([...raw.speak.markedIdx, idx])];
  } else if (type === 'quiz_answer') {
    const idx = Number(event.idx);
    const total = effectiveQuizzes(episode, config).length;
    if (!Number.isInteger(idx) || idx < 0 || idx >= total) throw badRequest('quiz idx is not a valid question.');
    if (!raw.quiz.answers.some((answer) => Number(answer.idx) === idx)) {
      raw.quiz.answers = [...raw.quiz.answers, { idx, firstTryCorrect: Boolean(event.firstTryCorrect) }];
    }
  } else if (type === 'dub') {
    if (!series?.hasDubbing || episode?.canDubbing === false) {
      throw badRequest('This episode does not support dubbing.');
    }
    raw.dub.done = raw.dub.done || Boolean(event.done);
  } else {
    throw badRequest('Unknown progress event.');
  }

  const computed = computeProgress(episode, series, raw, config);
  return {
    listen: { watchedPercent: computed.watchedPercent, done: computed.skills.find((s) => s.key === 'listen')?.done || false },
    read: { readIdx: computed.readIdx, done: computed.skills.find((s) => s.key === 'read')?.done || false },
    speak: { markedIdx: computed.markedIdx, done: computed.skills.find((s) => s.key === 'speak')?.done || false },
    quiz: computed.quiz,
    dub: { done: computed.dubDone },
    lastPositionSec: computed.lastPositionSec,
    completed: computed.completed
  };
}

function serializeProgress(episode, series, raw, config = CONFIG) {
  const computed = computeProgress(episode, series, raw, config);
  return {
    episodeId: String(episode?._id || ''),
    availableSkills: computed.availableSkills,
    skills: computed.skills,
    completed: computed.completed,
    percent: computed.percent,
    activities: computed.activities,
    activityDone: computed.activityDone,
    activityTotal: computed.activityTotal,
    activityPercent: computed.activityPercent,
    watchedPercent: computed.watchedPercent,
    lastPositionSec: computed.lastPositionSec,
    readIdx: computed.readIdx,
    speakIdx: computed.markedIdx,
    quiz: computed.quiz,
    dubDone: computed.dubDone
  };
}

/** Series progress = completed published episodes / published episodes. */
function seriesProgress(series, episodes, rawByEpisodeId = {}, config = CONFIG) {
  const published = (Array.isArray(episodes) ? episodes : []).filter((episode) => episode.isPublished !== false);
  let completedEpisodes = 0;
  const episodeProgress = published.map((episode) => {
    const raw = rawByEpisodeId[String(episode._id)] || rawByEpisodeId[String(episode.id)] || {};
    const progress = serializeProgress(episode, series, raw, config);
    if (progress.completed) completedEpisodes += 1;
    return progress;
  });
  const percent = published.length ? Math.round((completedEpisodes / published.length) * 100) : 0;
  return {
    episodeCount: published.length,
    completedEpisodes,
    percent,
    completed: published.length > 0 && completedEpisodes === published.length,
    episodeProgress
  };
}

/**
 * Deterministic, conservative subtitle cleaner for .srt/.vtt imports and seeds.
 * It removes credits/music lines and flags suspicious cues instead of rewriting meaning.
 */
function cleanSubtitleText(input) {
  let text = String(input || '')
    .replace(/\r/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[♪♫]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return { text: '', suspect: true, reason: 'empty_after_cleanup' };

  const lowered = text.toLowerCase();
  let suspect = false;
  let reason = '';
  if (/^(subscribe|like|share|follow|credit|subtitles? by|captioned by|amara\.org|youtube)\b/.test(lowered)) {
    suspect = true;
    reason = 'credit_or_channel_line';
  } else if (/\b(said|says|said:|says:)\b/.test(lowered) && wordCount(text) < 8) {
    suspect = true;
    reason = 'speaker_label_attached';
  } else if (wordCount(text) <= 1) {
    suspect = true;
    reason = 'too_short';
  }

  text = text
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([,.;!?])(?=[^\s])/g, '$1 ')
    .replace(/([!?])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, suspect, reason };
}

module.exports = {
  CONFIG,
  SKILL_LABELS,
  accessibleAgeGroups,
  isAgeAllowedForChild,
  levelsForAgeTab,
  accessibleLevelsFor,
  isLevelAllowedForChild,
  ageGroupsForLevel,
  ageGroupRank,
  validCues,
  cueTotalFor,
  cueIndexSet,
  availableActivitiesFor,
  isQuizEligible,
  buildQuizFromCues,
  effectiveQuizzes,
  availableSkillsFor,
  computeProgress,
  mergeProgressEvent,
  serializeProgress,
  seriesProgress,
  effectiveClipEnd,
  cleanSubtitleText,
  wordCount
};
