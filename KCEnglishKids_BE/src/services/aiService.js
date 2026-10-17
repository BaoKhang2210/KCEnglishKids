const NOTE_TYPES = ['praise', 'encouragement', 'practice_hint'];
const cleanLabel = (value, limit) => String(value || '').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, limit);

function currentStreak(child, now = new Date()) {
  const vietnamDay = date => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const recent = [vietnamDay(now), vietnamDay(new Date(now.getTime() - 86400000))];
  return recent.includes(child.lastActiveDate) && Number.isInteger(child.streak) && child.streak > 0
    ? child.streak : null;
}

function answerAccuracy(result) {
  const { correctCount, incorrectCount } = result || {};
  if (!Number.isFinite(correctCount) || !Number.isFinite(incorrectCount) || correctCount < 0 || incorrectCount < 0) return null;
  const total = correctCount + incorrectCount;
  return total > 0 ? Math.round(correctCount / total * 100) : null;
}

function templateOptions(facts) {
  const name = cleanLabel(facts.studentName, 100) || 'your child';
  const lesson = cleanLabel(facts.recentLesson, 120);
  const greeting = `Hello, ${name}'s family!`;
  const accuracy = facts.averageAccuracy == null ? ''
    : ` Recorded-answer accuracy ${facts.scope === 'assignment' ? 'for this attempt is' : 'averages'} ${facts.averageAccuracy}%.`;
  const totals = ` Across the learning journey, ${facts.completedLessons} lessons are complete and ${facts.totalStars} stars are recorded.`;
  const streak = facts.streak ? ` The current learning streak is ${facts.streak} ${facts.streak === 1 ? 'day' : 'days'}.` : '';
  const recent = lesson ? ` The ${facts.scope === 'assignment' ? 'selected' : 'latest recorded'} lesson is "${lesson}".` : '';
  const stars = facts.scope === 'assignment' ? [3, 2, 1] : [5, 4, 3];
  return [
    {
      id: 'praise', type: 'praise', badge: 'Celebrate learning', title: 'A little celebration', suggestedStars: stars[0],
      content: `${greeting}${accuracy || recent || ' Every small learning step matters.'}${totals} Let's celebrate each step together without rushing!`
    },
    {
      id: 'encouragement', type: 'encouragement', badge: 'Keep exploring', title: 'Encouragement for the journey', suggestedStars: stars[1],
      content: `${greeting}${streak || totals}${recent} Please encourage short, relaxed practice and let your child learn at their own pace. Thank you for supporting the learning journey!`
    },
    {
      id: 'practice_hint', type: 'practice_hint', badge: 'Practice together', title: 'A playful five-minute activity', suggestedStars: stars[2],
      content: `${greeting}${recent} At home, spend five minutes listening to a word, pointing to its picture, and taking turns repeating it together. Let your child choose a favorite picture and stop whenever they need a break. Thank you for joining in!`
    }
  ];
}

const templateProvider = Object.freeze({
  source: 'template', generative: false,
  generate: async facts => ({ options: templateOptions(facts) })
});

function validOptions(value, scope) {
  return Array.isArray(value?.options) && value.options.length === 3 && NOTE_TYPES.every(type => {
    const matches = value.options.filter(option => option?.type === type);
    if (matches.length !== 1) return false;
    const option = matches[0];
    return option.id === type && ['badge', 'title', 'content'].every(key =>
      typeof option[key] === 'string' && option[key].trim().length > 0 &&
      option[key].length <= (key === 'content' ? 1200 : 100) && !/[<>\p{Cc}]/u.test(option[key])) &&
      Number.isInteger(option.suggestedStars) && option.suggestedStars >= 1 &&
      option.suggestedStars <= (scope === 'assignment' ? 3 : 5);
  });
}

// Only the template provider is wired into production. Future providers receive facts, never request bodies.
async function generateParentNote(facts, provider = templateProvider, timeoutMs = 4000) {
  let timer;
  const abort = new AbortController();
  let value;
  let fallback = false;
  try {
    value = await Promise.race([
      Promise.resolve().then(() => provider.generate(Object.freeze({ ...facts }), { signal: abort.signal })),
      new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('Provider timeout')); }, timeoutMs); })
    ]);
    if (!validOptions(value, facts.scope)) throw new Error('Invalid provider output');
  } catch {
    fallback = true;
    value = { options: templateOptions(facts) };
  } finally {
    clearTimeout(timer);
  }
  const { studentName: _name, ...metrics } = facts;
  return {
    options: value.options.map(({ id, type, badge, title, content, suggestedStars }) => ({ id, type, badge, title, content, suggestedStars })),
    source: fallback ? 'template' : provider.source,
    generative: fallback ? false : provider.generative === true,
    fallback,
    metrics
  };
}

function normalizeTranscript(text) {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[\p{P}\p{S}\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ').trim().replace(/^(?:a|an|the)\s+/, '');
}

function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

function evaluatePronunciation({ targetWord, spokenTranscript }) {
  const target = normalizeTranscript(targetWord);
  const spoken = normalizeTranscript(spokenTranscript);
  const evaluated = Boolean(target && spoken);
  let score = null;
  if (evaluated) {
    score = target === spoken ? 100 : Math.min(84, Math.round((1 - editDistance(target, spoken) / Math.max(target.length, spoken.length)) * 100));
    if (target.length <= 3 && target !== spoken) score = Math.min(score, 64);
  }
  const displayStars = score == null ? 0 : score >= 85 ? 3 : score >= 65 ? 2 : 1;
  return {
    evaluationType: 'transcript_match', source: 'rules', evaluated, score, displayStars,
    isAccepted: score != null && score >= 65,
    mascotState: displayStars === 3 ? 'celebrating' : displayStars === 2 ? 'happy' : 'encouraging',
    kokoSpeech: displayStars === 3 ? 'The words match! Let’s celebrate together!'
      : displayStars === 2 ? 'Getting closer! Let’s listen and say it together.'
      : evaluated ? 'Thanks for trying! Listen and give it another go.' : 'I didn’t hear words this time. Let’s try again!',
    kokoEnglishCheer: displayStars === 3 ? 'You did it!' : 'Keep exploring, little star!',
    practiceTip: 'Listen to the example, then repeat slowly. Take a break whenever you like.'
  };
}

module.exports = { currentStreak, answerAccuracy, templateProvider, validOptions, generateParentNote, normalizeTranscript, evaluatePronunciation };
