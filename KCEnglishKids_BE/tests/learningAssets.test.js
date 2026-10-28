const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { buildAssetPlan, replaceUrls } = require('../scripts/install_learning_assets');
const root = path.resolve(__dirname, '../../client/public');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'images/manifest.json'), 'utf8'));
const { VOCABULARY_DATA } = require('../src/seeds/vocabularyData');
test('every curriculum word and topic has a packaged, script-free local illustration and animation', () => {
  assert.equal(Object.keys(manifest.vocabulary).length, VOCABULARY_DATA.length);
  assert.equal(Object.keys(manifest.topics).length, 19);
  for (const asset of [...Object.values(manifest.vocabulary), ...Object.values(manifest.topics)]) for (const url of [asset.url, asset.animationUrl].filter(Boolean)) {
    assert.match(url, /^\/images\//);
    const svg = fs.readFileSync(path.join(root, url), 'utf8');
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|<text\b|placeholder:|https?:\/\/(?!www\.w3\.org)/i);
  }
});
test('numbers show the correct quantity and colors have distinct swatches', () => {
  for (const [word, count] of [['one', 1], ['three', 3], ['twelve', 12], ['twenty', 20]]) {
    const svg = fs.readFileSync(path.join(root, manifest.vocabulary[word].url), 'utf8');
    assert.equal((svg.match(/<circle\b/g) || []).length, count);
  }
  const blue = fs.readFileSync(path.join(root, manifest.vocabulary.blue.url), 'utf8');
  const yellow = fs.readFileSync(path.join(root, manifest.vocabulary.yellow.url), 'utf8');
  assert.notEqual(blue, yellow); assert.equal(manifest.vocabulary.blue.isTransparent, false);
});
test('nested image URL migration preserves BSON IDs and replaces cached game metadata', () => {
  const _id = new mongoose.Types.ObjectId();
  const result = replaceUrls({ _id, questions: [{ metadata: { matchingPair: { image: 'old' } }, options: [{ imageUrl: 'old' }] }] }, new Map([['old', '/images/new.svg']]));
  assert.equal(result._id, _id);
  assert.equal(result.questions[0].metadata.matchingPair.image, '/images/new.svg');
  assert.equal(result.questions[0].options[0].imageUrl, '/images/new.svg');
});
test('asset migration preserves content IDs, updates both media and caches, and becomes idempotent', () => {
  const mid = new mongoose.Types.ObjectId(), vid = new mongoose.Types.ObjectId();
  const collections = { media: [{ _id: mid, type: 'IMAGE', url: 'old' }], vocabularies: [{ _id: vid, normalizedText: 'dog', english: 'dog', primaryMedia: mid, imageUrl: 'old', partOfSpeech: 'noun' }], topics: [], languagecontents: [], activities: [{ _id: new mongoose.Types.ObjectId(), questions: [{ promptImageUrl: 'old', metadata: { image: 'old' } }] }], lessons: [], classroomsessions: [], users: [] };
  const plan = buildAssetPlan(collections, manifest);
  assert.equal(String(plan.data.vocabularies[0]._id), String(vid));
  assert.equal(plan.data.media[0].url, plan.data.vocabularies[0].imageUrl);
  assert.equal(plan.data.activities[0].questions[0].metadata.image, manifest.vocabulary.dog.url);
  const repeated = buildAssetPlan(plan.data, manifest);
  assert.equal(repeated.operations.length, 0); assert.equal(repeated.inserted.length, 0);
});
