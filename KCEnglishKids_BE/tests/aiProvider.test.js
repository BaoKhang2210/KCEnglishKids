const test = require('node:test');
const assert = require('node:assert/strict');
const provider = require('../src/services/geminiProvider');
const ai = require('../src/services/aiService');
const env = { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' };
const input = { ageGroup: '3-4', lessonTitle: 'Fruit', durationMinutes: 30, vocabularyList: [{ english: 'apple' }, { english: 'banana' }] };

test('cloud calls require explicit provider, key and a valid configurable model', async () => {
  for (const patch of [{ AI_PROVIDER: 'local' }, { GEMINI_API_KEY: '' }, { GEMINI_MODEL: '' }, { GEMINI_MODEL: '../other?key=bad' }]) {
    assert.equal(provider.configuration({ ...env, ...patch }).enabled, false);
    await assert.rejects(provider.generateJson({ data: {}, schema: {} }, { env: { ...env, ...patch }, fetcher: () => assert.fail('no network call') }), /NOT_CONFIGURED/);
  }
});

test('Gemini uses structured JSON, server-side key headers and rejects truncated output', async () => {
  const options = { env, fetcher: async (url, request) => {
    assert.ok(!url.includes(env.GEMINI_API_KEY));
    assert.equal(request.headers['x-goog-api-key'], env.GEMINI_API_KEY);
    const body = JSON.parse(request.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.deepEqual(body.generationConfig.responseJsonSchema, { type: 'object' });
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"ok":true}' }] } }] }) };
  } };
  assert.deepEqual(await provider.generateJson({ instruction: 'Help', data: { lesson: 'Fruit' }, schema: { type: 'object' } }, options), { ok: true });
  for (const finishReason of ['MAX_TOKENS', 'SAFETY']) await assert.rejects(provider.generateJson({ data: {}, schema: {} }, { env, fetcher: async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason }] }) }) }), /INCOMPLETE/);
});

test('provider timeout aborts its in-flight request', async () => {
  let aborted = false;
  await assert.rejects(provider.generateJson({ data: {}, schema: {} }, { env, timeoutMs: 10, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('Aborted')); })) }));
  assert.equal(aborted, true);
});

test('all session durations have an exact four-phase and activity budget', () => {
  for (const minutes of [10, 15, 20, 25, 30, 35, 45, 60, 120]) {
    const plan = ai.generateLessonPlan({ ...input, durationMinutes: minutes });
    assert.equal(plan.meta.durationMinutes, minutes);
    assert.equal(plan.phases.reduce((sum, phase) => sum + phase.durationMin, 0), minutes);
    for (const phase of plan.phases) {
      assert.equal(phase.activities.reduce((sum, activity) => sum + activity.durationMin, 0), phase.durationMin);
      assert.ok(phase.activities.every(activity => activity.durationMin >= 1));
    }
  }
});

test('AI can personalize teaching cues but cannot change curriculum or durations', async () => {
  const plan = await ai.generateLessonPlanWithAI(input, { enabled: true, cache: false, generate: async ({ data }) => ({
    meta: { durationMinutes: 999 }, targetVocabulary: [{ english: 'unrelated' }],
    teacherPrepTips: ['Chuẩn bị hai tranh và mời bé cùng chỉ.'], homeConnectPrompt: 'Gia đình cùng nghe mẫu và chỉ tranh.',
    phases: data.phases.map(phase => ({ phaseId: phase.phaseId, durationMin: 999, activities: phase.activities.map(() => ({ name: 'Cùng chọn tranh', teacherTalk: 'Point to the apple.', tprAction: 'Chỉ vào tranh táo.', description: 'Cô làm mẫu rồi để bé chọn khi sẵn sàng.' })) }))
  }) });
  assert.equal(plan.source, 'gemini'); assert.equal(plan.generative, true);
  assert.equal(plan.meta.durationMinutes, 30);
  assert.deepEqual(plan.targetVocabulary.map(word => word.english), ['apple', 'banana']);
  assert.equal(plan.phases.reduce((sum, phase) => sum + phase.durationMin, 0), 30);
  assert.ok(plan.phases.every(phase => phase.activities.every(activity => activity.durationMin < 999)));
});

test('invalid AI plans and provider outages preserve a usable local plan', async () => {
  for (const generate of [async () => ({}), async () => { throw new Error('quota exhausted'); }]) {
    const plan = await ai.generateLessonPlanWithAI(input, { enabled: true, cache: false, generate });
    assert.equal(plan.source, 'pedagogical_engine'); assert.equal(plan.generative, false); assert.equal(plan.fallback, true);
    assert.equal(plan.meta.durationMinutes, 30);
  }
});

test('real-provider note IDs and ordinary line breaks do not cause a false fallback', async () => {
  const ai = require('../src/services/aiService');
  const result = await ai.generateParentNote({ scope: 'assignment' }, { source: 'gemini', generative: true, generate: async () => ({ options: ['praise', 'encouragement', 'practice_hint'].map(type => ({ id: type + '_1', type, badge: 'Gợi ý', title: 'Cùng bé chơi', content: 'Gia đình bé,\nCùng nghe -> chọn tranh.', suggestedStars: 1 })) }) });
  assert.equal(result.generative, true); assert.equal(result.fallback, false);
  assert.deepEqual(result.options.map(option => option.id), ['praise', 'encouragement', 'practice_hint']);
  assert.equal(result.options[0].content, 'Gia đình bé, Cùng nghe → chọn tranh.');
  const invalid = await ai.generateParentNote({ scope: 'assignment' }, { source: 'gemini', generative: true, generate: async () => ({ options: result.options.map(option => ({ ...option, type: 'invented' })) }) });
  assert.equal(invalid.fallback, true);
});

test('a valid plan with ASCII arrows is accepted, but markup remains rejected', async () => {
  const ai = require('../src/services/aiService');
  const generate = async ({ data }) => ({ teacherPrepTips: ['Nghe -> chọn tranh'], homeConnectPrompt: 'Cùng bé chơi.\nDừng khi bé muốn nghỉ.', phases: data.phases.map(phase => ({ phaseId: phase.phaseId, activities: phase.activities.map(() => ({ name: 'Chơi cùng tranh', teacherTalk: 'Point to the cat.', tprAction: 'Chỉ tranh -> đổi vai.', description: 'Để bé chọn khi sẵn sàng.' })) })) });
  const plan = await ai.generateLessonPlanWithAI(input, { enabled: true, cache: false, generate });
  assert.equal(plan.generative, true); assert.equal(plan.teacherPrepTips[0], 'Nghe → chọn tranh');
  const unsafe = await ai.generateLessonPlanWithAI(input, { enabled: true, cache: false, generate: async args => ({ ...await generate(args), teacherPrepTips: ['<script>bad</script>'] }) });
  assert.equal(unsafe.fallback, true);
});

test('audio coaching distinguishes silence from a heard attempt and validates output', async () => {
  const request = { targetWord: 'apple', ageGroup: '3-4', audioBase64: 'test-audio', mimeType: 'audio/wav' };
  const output = { heardSpeech: false, transcript: '', score: 100, feedback: 'Cùng thử lại nhé!', practiceTip: 'Nghe mẫu rồi nói chậm.' };
  const silent = await ai.evaluateAudio(request, { generate: async () => output });
  assert.equal(silent.evaluated, false); assert.equal(silent.score, null); assert.equal(silent.displayStars, 0);
  const heard = await ai.evaluateAudio(request, { generate: async () => ({ ...output, heardSpeech: true, transcript: 'apple', score: 90 }) });
  assert.equal(heard.evaluationType, 'audio_coaching'); assert.equal(heard.source, 'gemini'); assert.equal(heard.displayStars, 3);
  await assert.rejects(ai.evaluateAudio(request, { generate: async () => ({ ...output, score: 1000 }) }), /Invalid/);
});
