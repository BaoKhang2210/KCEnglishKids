const test = require('node:test');
const assert = require('node:assert/strict');
const {
  accessibleAgeGroups,
  isAgeAllowedForChild,
  levelsForAgeTab,
  accessibleLevelsFor,
  isLevelAllowedForChild,
  ageGroupsForLevel,
  validCues,
  isQuizEligible,
  buildQuizFromCues,
  availableSkillsFor,
  availableActivitiesFor,
  computeProgress,
  mergeProgressEvent,
  seriesProgress,
  cleanSubtitleText
} = require('../src/services/videoProgress');

const cue = (idx, text, start = idx * 5, end = idx * 5 + 4) => ({
  idx,
  start,
  end,
  text,
  translationVi: `nghĩa ${idx}`
});

const series = { hasDubbing: false };
const dubbingSeries = { hasDubbing: true };
const episode = (overrides = {}) => ({
  _id: 'ep-1',
  duration: 60,
  clipStart: 0,
  clipEnd: 0,
  subtitles: [cue(0, 'Hello little friend'), cue(1, 'How are you today'), cue(2, 'I am very happy')],
  quizzes: [],
  ...overrides
});

test('age access only exposes the child age and younger content', () => {
  assert.deepEqual(accessibleAgeGroups('3-4'), ['3-4']);
  assert.deepEqual(accessibleAgeGroups('4-5'), ['3-4', '4-5']);
  assert.deepEqual(accessibleAgeGroups('5-6'), ['3-4', '4-5', '5-6']);
  assert.equal(isAgeAllowedForChild('4-5', '3-4'), true);
  assert.equal(isAgeAllowedForChild('3-4', '5-6'), false);
});

test('level access follows the age tab mapping', () => {
  assert.deepEqual(levelsForAgeTab('3-4'), ['L1']);
  assert.deepEqual(levelsForAgeTab('4-5'), ['L1', 'L2']);
  assert.deepEqual(levelsForAgeTab('5-6'), ['L1', 'L2', 'L3']);
  assert.deepEqual(accessibleLevelsFor('3-4'), ['L1']);
  assert.deepEqual(accessibleLevelsFor('4-5'), ['L1', 'L2']);
  assert.deepEqual(accessibleLevelsFor('5-6'), ['L1', 'L2', 'L3']);
  assert.equal(isLevelAllowedForChild('3-4', 'L2'), false);
  assert.equal(isLevelAllowedForChild('4-5', 'L2'), true);
  assert.equal(isLevelAllowedForChild('5-6', 'L3'), true);
  assert.deepEqual(ageGroupsForLevel('L1'), ['3-4', '4-5']);
  assert.deepEqual(ageGroupsForLevel('L3'), ['5-6']);
});

test('invalid and duplicate subtitle cues are ignored', () => {
  const cues = validCues([
    cue(0, 'Good morning'),
    cue(0, 'Duplicate index'),
    { idx: 1, start: 5, end: 5, text: 'Zero length' },
    { idx: 2, start: 6, end: 8, text: '   ' },
    cue(3, 'See you later')
  ]);
  assert.deepEqual(cues.map((item) => item.idx), [0, 3]);
});

test('quiz is only eligible with four distinct sentences of three words or more', () => {
  const short = [cue(0, 'Hello'), cue(1, 'Bye bye'), cue(2, 'Good day'), cue(3, 'See you')];
  assert.equal(isQuizEligible(short), false);
  assert.deepEqual(buildQuizFromCues(short), []);

  const long = [
    cue(0, 'Hello little friend'),
    cue(1, 'How are you today'),
    cue(2, 'I am very happy'),
    cue(3, 'Let us sing together'),
    cue(4, 'Hello little friend')
  ];
  assert.equal(isQuizEligible(long), true);
  const quizzes = buildQuizFromCues(long);
  assert.equal(quizzes.length, 4);
  assert.ok(quizzes.every((quiz) => quiz.options.filter((option) => option.correct).length === 1));
});

test('available skills follow real episode data, not a fixed four-step list', () => {
  const noCues = availableSkillsFor(episode({ subtitles: [] }), series);
  assert.deepEqual(noCues, ['listen']);

  const withCues = availableSkillsFor(episode(), series);
  assert.deepEqual(withCues, ['listen', 'read', 'speak']);

  const long = episode({
    subtitles: [
      cue(0, 'Hello little friend'),
      cue(1, 'How are you today'),
      cue(2, 'I am very happy'),
      cue(3, 'Let us sing together')
    ]
  });
  assert.deepEqual(availableSkillsFor(long, series), ['listen', 'read', 'speak', 'quiz']);
  // Source capability flags are metadata, not tracked skills, until their UI ships.
  assert.deepEqual(availableSkillsFor(long, dubbingSeries), ['listen', 'read', 'speak', 'quiz']);
  assert.deepEqual(
    availableSkillsFor(episode({ subtitles: [], canReading: true, canDubbing: true }), dubbingSeries),
    ['listen']
  );
});

test('listen completes at 80 percent and never decreases', () => {
  const result = computeProgress(episode(), series, { listen: { watchedPercent: 85 } });
  assert.equal(result.skills.find((skill) => skill.key === 'listen').done, true);
  const merged = mergeProgressEvent(
    { listen: { watchedPercent: 90 } },
    { type: 'listen', watchedPercent: 40 },
    episode(),
    series
  );
  assert.equal(merged.listen.watchedPercent, 90);
});

test('read and speak thresholds are measured against valid cues', () => {
  const readHalf = computeProgress(episode({ subtitles: [cue(0, 'Hello little friend'), cue(1, 'How are you today')] }), series, {
    read: { readIdx: [0] }
  });
  assert.equal(readHalf.skills.find((skill) => skill.key === 'read').done, true);

  const speakOneOfTwo = computeProgress(episode({ subtitles: [cue(0, 'Hello little friend'), cue(1, 'How are you today')] }), series, {
    speak: { markedIdx: [0] }
  });
  assert.equal(speakOneOfTwo.skills.find((skill) => skill.key === 'speak').done, false);
  const speakTwoOfTwo = computeProgress(episode({ subtitles: [cue(0, 'Hello little friend'), cue(1, 'How are you today')] }), series, {
    speak: { markedIdx: [0, 1] }
  });
  assert.equal(speakTwoOfTwo.skills.find((skill) => skill.key === 'speak').done, true);
});

test('quiz completion requires every answer and 60 percent first-try correct', () => {
  const quizzes = [{ idx: 0 }, { idx: 1 }, { idx: 2 }, { idx: 3 }];
  const withQuiz = episode({
    quizzes,
    subtitles: [
      cue(0, 'Hello little friend'),
      cue(1, 'How are you today'),
      cue(2, 'I am very happy'),
      cue(3, 'Let us sing together')
    ]
  });
  const below = computeProgress(withQuiz, series, {
    listen: { watchedPercent: 80 },
    quiz: { answers: [{ idx: 0, firstTryCorrect: true }, { idx: 1, firstTryCorrect: true }, { idx: 2, firstTryCorrect: false }, { idx: 3, firstTryCorrect: false }] }
  });
  assert.equal(below.quiz.score, 2);
  assert.equal(below.skills.find((skill) => skill.key === 'quiz').done, false);

  const passed = computeProgress(withQuiz, series, {
    quiz: { answers: [{ idx: 0, firstTryCorrect: true }, { idx: 1, firstTryCorrect: true }, { idx: 2, firstTryCorrect: true }, { idx: 3, firstTryCorrect: false }] }
  });
  assert.equal(passed.skills.find((skill) => skill.key === 'quiz').done, true);
});

test('completion is the ratio of done available skills, never a hardcoded four', () => {
  const onlyListen = computeProgress(episode({ subtitles: [] }), series, { listen: { watchedPercent: 100 } });
  assert.equal(onlyListen.completed, true);
  assert.equal(onlyListen.percent, 100);

  const threeSkills = computeProgress(episode(), series, { listen: { watchedPercent: 100 } });
  assert.equal(threeSkills.completed, false);
  assert.equal(threeSkills.percent, 33);

  const dubEpisode = computeProgress(episode(), dubbingSeries, {
    listen: { watchedPercent: 100 },
    read: { readIdx: [0, 1] },
    speak: { markedIdx: [0, 1, 2] }
  });
  assert.equal(dubEpisode.completed, true);
  assert.equal(dubEpisode.percent, 100);
});

test('series progress counts completed published episodes only', () => {
  const episodes = [
    { ...episode({ subtitles: [] }), _id: 'a', isPublished: true },
    { ...episode({ subtitles: [] }), _id: 'b', isPublished: true },
    { ...episode({ subtitles: [] }), _id: 'c', isPublished: false }
  ];
  const result = seriesProgress(series, episodes, {
    a: { listen: { watchedPercent: 100 } },
    b: { listen: { watchedPercent: 50 } },
    c: { listen: { watchedPercent: 100 } }
  });
  assert.equal(result.episodeCount, 2);
  assert.equal(result.completedEpisodes, 1);
  assert.equal(result.percent, 50);
});

test('progress events are validated and never rewrite prior answers', () => {
  assert.throws(
    () => mergeProgressEvent({}, { type: 'read', idx: 99 }, episode(), series),
    /valid subtitle cue/
  );
  assert.throws(
    () => mergeProgressEvent({}, { type: 'dub', done: true }, episode(), series),
    /does not support dubbing/
  );
  const first = mergeProgressEvent({}, { type: 'quiz_answer', idx: 0, firstTryCorrect: false }, episode({ quizzes: [{ idx: 0 }] }), series);
  const second = mergeProgressEvent(first, { type: 'quiz_answer', idx: 0, firstTryCorrect: true }, episode({ quizzes: [{ idx: 0 }] }), series);
  assert.deepEqual(second.quiz.answers, [{ idx: 0, firstTryCorrect: false }]);
});

test('a heartbeat saves watched share and resume position together', () => {
  const merged = mergeProgressEvent(
    { listen: { watchedPercent: 20 }, lastPositionSec: 10 },
    { type: 'heartbeat', watchedPercent: 45, lastPositionSec: 27 },
    episode(),
    series
  );
  assert.equal(merged.listen.watchedPercent, 45);
  assert.equal(merged.lastPositionSec, 27);

  const clamped = mergeProgressEvent({}, { type: 'heartbeat', watchedPercent: 12, lastPositionSec: 999 }, episode(), series);
  assert.equal(clamped.lastPositionSec, 60);
});

test('the four activity counter uses source cue counts without changing completion', () => {
  const sourceEpisode = episode({
    subtitles: [],
    captionCueCount: 18,
    canReading: true,
    canDubbing: true
  });
  assert.deepEqual(availableActivitiesFor(sourceEpisode, dubbingSeries), ['listen', 'read', 'speak', 'dub']);
  assert.deepEqual(availableActivitiesFor(sourceEpisode, series), ['listen', 'read', 'speak']);
  assert.deepEqual(availableActivitiesFor(episode({ subtitles: [], canDubbing: false }), dubbingSeries), ['listen']);
  // Completion still follows availableSkills, so source-cue lessons keep their
  // previous watch-based series progress.
  assert.deepEqual(availableSkillsFor(sourceEpisode, dubbingSeries), ['listen']);

  const halfway = computeProgress(sourceEpisode, dubbingSeries, {
    listen: { watchedPercent: 80 },
    read: { readIdx: Array.from({ length: 9 }, (_, index) => index + 1) },
    speak: { markedIdx: Array.from({ length: 13 }, (_, index) => index + 1) },
    dub: { done: true }
  });
  assert.equal(halfway.activityDone, 4);
  assert.equal(halfway.activityTotal, 4);
  assert.equal(halfway.activityPercent, 100);
  assert.equal(halfway.completed, true);
});

test('read and speak source-cue indexes are accepted without stored subtitles', () => {
  const sourceEpisode = episode({ subtitles: [], captionCueCount: 18 });
  const read = mergeProgressEvent({}, { type: 'read', idx: 18 }, sourceEpisode, series);
  assert.deepEqual(read.read.readIdx, [18]);
  const speak = mergeProgressEvent({}, { type: 'speak', idx: 1 }, sourceEpisode, series);
  assert.deepEqual(speak.speak.markedIdx, [1]);
  assert.throws(
    () => mergeProgressEvent({}, { type: 'read', idx: 19 }, sourceEpisode, series),
    /valid subtitle cue/
  );
  assert.throws(
    () => mergeProgressEvent({}, { type: 'dub', done: true }, episode({ canDubbing: false }), dubbingSeries),
    /does not support dubbing/
  );
});

test('subtitle cleanup removes credits and music without rewriting the sentence', () => {
  assert.deepEqual(cleanSubtitleText('[Music] Hello   little friend ♪'), {
    text: 'Hello little friend',
    suspect: false,
    reason: ''
  });
  const credit = cleanSubtitleText('Subscribe to our channel');
  assert.equal(credit.suspect, true);
  assert.equal(credit.reason, 'credit_or_channel_line');
  assert.equal(cleanSubtitleText('(Music)').text, '');
});
