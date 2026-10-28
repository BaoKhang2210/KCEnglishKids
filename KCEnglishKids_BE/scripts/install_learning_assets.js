// Versioned local asset migration. Default: dry run. --apply writes after a full backup.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
require('../src/models'); require('../src/models/ClassRecognition');
const { applyPlan } = require('./repair_database');
const { EJSON } = mongoose.mongo.BSON;
const root = path.resolve(__dirname, '../..');
const key = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const clone = value => EJSON.parse(EJSON.stringify(value));
const equal = (a, b) => EJSON.stringify(a) === EJSON.stringify(b);
const deterministicId = key => new mongoose.Types.ObjectId(crypto.createHash('sha256').update('learning-art-v1:' + key).digest('hex').slice(0, 24));
function replaceUrls(value, mapping) {
  if (typeof value === 'string') return mapping.get(value) || value;
  if (Array.isArray(value)) return value.map(v => replaceUrls(v, mapping));
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceUrls(v, mapping)]));
  return value;
}
function buildAssetPlan(collections, manifest) {
  const data = clone(collections);
  const images = new Map();
  const metadata = { assetVersion: manifest.version, author: 'Microsoft Corporation / KCEnglishKids', license: 'MIT', sourceUrl: `https://github.com/microsoft/fluentui-emoji/tree/${manifest.revision}`, licenseUrl: '/images/licenses/fluent-emoji-MIT.txt' };
  const media = new Map(data.media.map(m => [String(m._id), m]));
  const inserted = [];
  const makeMedia = (label, url, extra = {}) => {
    const _id = deterministicId(label); let item = media.get(String(_id));
    if (!item) {
      item = { _id, mediaKey: 'learning_art_' + label, type: 'IMAGE', status: 'ACTIVE', sourceType: 'SYSTEM_DESIGN', createdAt: new Date(), ...extra };
      data.media.push(item); media.set(String(_id), item); inserted.push(item);
    }
    item.url = url; item.altText = label.replace(/_/g, ' '); item.mimeType = 'image/svg+xml'; item.metadata = { ...item.metadata, ...metadata };
    return item;
  };
  for (const vocab of data.vocabularies) {
    const k = key(vocab.normalizedText || vocab.english); const asset = manifest.vocabulary[k];
    if (!asset) throw new Error('No verified asset for vocabulary: ' + k);
    if (vocab.imageUrl) images.set(vocab.imageUrl, asset.url);
    vocab.imageUrl = asset.url; vocab.animationUrl = asset.animationUrl; vocab.isTransparent = asset.isTransparent; vocab.visualType = asset.visualType;
    vocab.wordType = ['color', 'number'].includes(asset.kind) ? asset.kind : vocab.partOfSpeech === 'adjective' ? 'adjective' : ['verb', 'phrase'].includes(vocab.partOfSpeech) ? 'verb' : 'noun';
    const primary = media.get(String(vocab.primaryMedia));
    if (!primary) throw new Error('Vocabulary image reference is missing');
    if (primary.url) images.set(primary.url, asset.url);
    primary.url = asset.url; primary.mimeType = 'image/svg+xml'; primary.altText = vocab.english; primary.metadata = { ...primary.metadata, ...metadata, isTransparent: asset.isTransparent, kind: asset.kind };
    const animation = data.media.find(m => m.mediaKey === `vocab_${k}_animation` && m.type === 'ANIMATION');
    if (animation) { animation.url = asset.animationUrl; animation.mimeType = 'image/svg+xml'; animation.metadata = { ...animation.metadata, ...metadata, reducedMotion: true }; }
  }
  for (const topic of data.topics) {
    const asset = manifest.topics[topic.slug]; if (!asset) throw new Error('Missing topic artwork');
    const item = makeMedia('topic_' + topic.slug, asset.url);
    topic.imageMedia = item._id; topic.imageUrl = asset.url;
  }
  const yes = makeMedia('answer_yes', manifest.symbols['👍']); const no = makeMedia('answer_no', manifest.symbols['✋']);
  const conversation = makeMedia('conversation', manifest.symbols['💬']);
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const words = [...data.vocabularies].sort((a, b) => b.english.length - a.english.length);
  for (const content of data.languagecontents) {
    const text = String(content.english || '');
    const word = words.find(v => new RegExp('(?:^|\\W)' + escape(v.english) + '(?=$|\\W)', 'i').test(text) && (v.sourceUnits || []).some(u => String(u) === String(content.sourceUnit)));
    const unitLesson = data.lessons.find(l => (l.curriculumUnits || []).some(u => String(u) === String(content.sourceUnit)));
    const topic = data.topics.find(t => String(t._id) === String(content.topic || unitLesson?.topic));
    content.imageMedia = /^yes\b/i.test(text) ? yes._id : /^no\b/i.test(text) ? no._id : word?.primaryMedia || topic?.imageMedia || conversation._id;
    if (!content.imageMedia) throw new Error('Language content has no visual context');
  }
  for (const name of ['activities', 'lessons', 'classroomsessions']) data[name] = data[name].map(d => replaceUrls(d, images));
  for (const lesson of data.lessons) {
    const topic = data.topics.find(t => String(t._id) === String(lesson.topic));
    if (topic) { lesson.thumbnail = topic.imageMedia; lesson.thumbnailUrl = topic.imageUrl; }
  }
  const avatars = { lion: '🦁', tiger: '🐯', panda: '🐼', rabbit: '🐰', bear: '🐻', fox: '🦊', dog: '🐕', cat: '🐈' };
  for (const user of data.users) if (!user.avatarUrl || user.avatarUrl.startsWith('data:image/svg+xml')) user.avatarUrl = manifest.symbols[avatars[user.avatar] || '🐻'];
  const operations = [];
  for (const [name, docs] of Object.entries(data)) {
    const original = new Map((collections[name] || []).map(d => [String(d._id), d]));
    for (const doc of docs) {
      const before = original.get(String(doc._id));
      if (before && !equal(before, doc)) operations.push({ collection: name, action: 'replace', before, after: doc, reasons: ['install versioned local learning artwork'] });
    }
  }
  return { operations, inserted, data };
}
async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'client/public/images/manifest.json'), 'utf8'));
  for (const item of [...Object.values(manifest.vocabulary), ...Object.values(manifest.topics)]) for (const url of [item.url, item.animationUrl].filter(Boolean)) if (!fs.existsSync(path.join(root, 'client/public', url))) throw new Error('Missing asset file');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false }); const db = mongoose.connection.db;
  const collections = {};
  for (const c of await db.listCollections().toArray()) collections[c.name] = await db.collection(c.name).find({}).toArray();
  const plan = buildAssetPlan(collections, manifest);
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', updates: plan.operations.reduce((r, o) => { r[o.collection] = (r[o.collection] || 0) + 1; return r; }, {}), mediaToInsert: plan.inserted.length }));
  if (!process.argv.includes('--apply')) return;
  const folder = path.join(root, '.local-backups/database-repair-2026-10-28'); fs.mkdirSync(folder, { recursive: true });
  const stamp = Date.now();
  fs.writeFileSync(path.join(folder, `before-images-${stamp}.ejson`), EJSON.stringify({ system: 'KCEnglishKids', exportType: 'FULL_SYSTEM_BACKUP', version: '3.0.0', format: 'mongodb-extended-json', exportedAt: new Date(), collections }, null, 2, { relaxed: false }), { flag: 'wx' });
  fs.writeFileSync(path.join(folder, `image-plan-${stamp}.ejson`), EJSON.stringify({ operations: plan.operations, inserted: plan.inserted }, null, 2, { relaxed: false }), { flag: 'wx' });
  try {
    if (plan.inserted.length) await db.collection('media').insertMany(plan.inserted, { ordered: true });
    await applyPlan(db, plan.operations);
  } catch (error) {
    if (plan.inserted.length) await db.collection('media').deleteMany({ _id: { $in: plan.inserted.map(d => d._id) } });
    throw error;
  }
  console.log('Local learning artwork installed. Existing content and progress IDs preserved.');
}
module.exports = { buildAssetPlan, replaceUrls };
if (require.main === module) main().catch(error => { console.error(`Asset installation stopped: ${error.name}: ${error.message}`); process.exitCode = 1; }).finally(() => mongoose.disconnect());
