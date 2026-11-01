// Compare every vocabulary item with docs, seed specifications, curriculum membership and local artwork.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
const { Vocabulary, Lesson, CurriculumUnit } = require('../src/models');
const { VOCABULARY_DATA } = require('../src/seeds/vocabularyData');
const key = value => String(value || '').normalize('NFC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  const [words, units, lessons] = await Promise.all([
    Vocabulary.find().lean(), CurriculumUnit.find().lean(), Lesson.find({ status: 'ACTIVE' }).lean()
  ]);
  const unitById = new Map(units.map(unit => [String(unit._id), unit]));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'client/public/images/manifest.json'), 'utf8'));
  const document = fs.readFileSync(path.join(root, 'docs/toan-bo-tu-vung-va-mau-cau-database.md'), 'utf8');
  const expected = new Map();
  let unitCode, readingWords = false;
  for (const line of document.split(/\r?\n/)) {
    const heading = /Unit\s+\d+\s+\((B\d_U\d+)\)/.exec(line);
    if (heading) { unitCode = heading[1]; readingWords = false; }
    if (line.includes('Từ vựng trọng tâm')) readingWords = true;
    if (line.startsWith('#### ') && !line.includes('Từ vựng trọng tâm')) readingWords = false;
    if (!readingWords) continue;
    const row = /^\|\s*\d+\s*\|\s*\*\*(.*?)\*\*\s*\|\s*`(.*?)`\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/.exec(line);
    if (row) {
      const k = key(row[1]);
      if (!expected.has(k)) expected.set(k, { english: row[1], vietnamese: row[4].trim(), pronunciation: row[2], partOfSpeech: row[3].trim(), units: new Set() });
      expected.get(k).units.add(unitCode);
    }
  }
  const issues = [], byKey = new Map(), artHashes = new Map(), inventory = [];
  for (const word of words) {
    const k = key(word.normalizedText || word.english), spec = expected.get(k), art = manifest.vocabulary[k];
    if (byKey.has(k)) issues.push({ kind: 'DUPLICATE_VOCABULARY', word: word.english });
    byKey.set(k, word);
    if (!spec) issues.push({ kind: 'NOT_IN_REFERENCE_DOCUMENT', word: word.english });
    if (spec) {
      for (const field of ['vietnamese', 'pronunciation', 'partOfSpeech']) if (word[field] !== spec[field]) issues.push({ kind: 'CONTENT_MISMATCH', word: word.english, field, actual: word[field], expected: spec[field] });
      const memberships = (word.sourceUnits || []).map(id => { const unit = unitById.get(String(id)); return unit?.code || (unit ? `B${unit.bookNumber}_U${unit.unitNumber}` : 'MISSING'); });
      if ([...spec.units].some(code => !memberships.includes(code)) || memberships.some(code => !spec.units.has(code))) issues.push({ kind: 'UNIT_MEMBERSHIP_MISMATCH', word: word.english, actual: memberships, expected: [...spec.units] });
    }
    const seed = VOCABULARY_DATA.find(item => key(item.normalizedText) === k);
    if (!seed) issues.push({ kind: 'NOT_IN_SEED_SPECIFICATION', word: word.english });
    if (!art || art.url !== word.imageUrl) issues.push({ kind: 'IMAGE_MAPPING_MISMATCH', word: word.english, actual: word.imageUrl, expected: art?.url });
    let svg = '';
    for (const [field, url] of [['imageUrl', word.imageUrl], ['animationUrl', word.animationUrl]]) {
      const local = typeof url === 'string' && url.startsWith('/') ? path.resolve(root, 'client/public', '.' + url) : null;
      if (!local || !local.startsWith(path.resolve(root, 'client/public') + path.sep) || !fs.existsSync(local)) { issues.push({ kind: 'MISSING_ASSET', word: word.english, field, url }); continue; }
      const content = fs.readFileSync(local, 'utf8');
      if (!content.includes('<svg') || /<script\b|<foreignObject\b|onload\s*=|<image[^>]+https?:/i.test(content)) issues.push({ kind: 'INVALID_SVG', word: word.english, field });
      if (!content.includes('<title>' + esc(word.english).replace(/&#39;/g, '&apos;') + '</title>')) issues.push({ kind: 'ASSET_LABEL_MISMATCH', word: word.english, field });
      if (field === 'imageUrl') svg = content;
    }
    const body = svg.replace(/<title>[\s\S]*?<\/title>/g, '').replace(/g\d+_/g, 'g_');
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    if (!artHashes.has(hash)) artHashes.set(hash, []);
    artHashes.get(hash).push(word.english);
    if (!lessons.some(lesson => lesson.vocabularyItems?.some(id => String(id) === String(word._id)))) issues.push({ kind: 'NO_ACTIVE_LESSON', word: word.english });
    for (const unit of word.sourceUnits || []) if (!lessons.some(lesson => lesson.curriculumUnits?.some(id => String(id) === String(unit)) && lesson.vocabularyItems?.some(id => String(id) === String(word._id)))) {
      const source = unitById.get(String(unit));
      issues.push({ kind: 'NO_LESSON_IN_REFERENCE_UNIT', word: word.english, unit: source?.code || `B${source?.bookNumber}_U${source?.unitNumber}` });
    }
    inventory.push({ key: k, english: word.english, vietnamese: word.vietnamese, imageUrl: word.imageUrl, type: word.wordType, category: word.category, artKind: art?.kind, svg });
  }
  for (const [k, spec] of expected) if (!byKey.has(k)) issues.push({ kind: 'MISSING_REFERENCE_WORD', word: spec.english });
  const references = units.map(unit => ({ code: unit.code || `B${unit.bookNumber}_U${unit.unitNumber}`,
    missing: (unit.vocabularyReferences || []).filter(ref => !words.some(word => key(word.english) === key(ref) && word.sourceUnits?.some(id => String(id) === String(unit._id)))) }));
  const output = path.join(root, '.tmp/vocabulary-review'); fs.mkdirSync(output, { recursive: true });
  inventory.sort((a, b) => a.english.localeCompare(b.english, 'en'));
  const sheets = [];
  for (let offset = 0; offset < inventory.length; offset += 48) {
    const filename = `vocabulary-${String(offset / 48 + 1).padStart(2, '0')}.html`;
    const html = '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Vocabulary image review</title><style>*{box-sizing:border-box}body{margin:0;padding:14px;font-family:Arial,sans-serif;background:#eef2f6;color:#152a3b}h1{margin:0 0 10px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}article{height:208px;border:1px solid #cbd5e1;border-radius:10px;background:white;padding:7px;text-align:center;overflow:hidden}svg{width:100%;height:145px;display:block}b{display:block;font-size:15px;margin:4px 0}small{font-size:12px}</style><h1>KCEnglishKids · ' + (offset + 1) + '–' + Math.min(offset + 48, inventory.length) + ' / ' + inventory.length + '</h1><div class="grid">' + inventory.slice(offset, offset + 48).map(item => '<article>' + item.svg + '<b>' + esc(item.english) + '</b><small>' + esc(item.vietnamese) + '</small></article>').join('') + '</div></html>';
    fs.writeFileSync(path.join(output, filename), html); sheets.push(filename);
  }
  const report = { checkedAt: new Date(), scope: 'All database vocabulary compared with repository reference; original textbooks were not supplied.', counts: { database: words.length, referenceWords: expected.size, seedWords: VOCABULARY_DATA.length, units: units.length, lessons: lessons.length }, issues,
    curriculumReferences: references, identicalArtworkGroups: [...artHashes.values()].filter(group => group.length > 1), sheets, inventory: inventory.map(({ svg, ...item }) => item) };
  fs.writeFileSync(path.join(root, 'docs/vocabulary-image-audit-2026-11-01.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ counts: report.counts, issues, missingCurriculumReferences: references.filter(unit => unit.missing.length), identicalArtworkGroups: report.identicalArtworkGroups, sheets }, null, 2));
}
if (require.main === module) main().catch(error => { console.error('Vocabulary review failed (' + error.name + ').'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
