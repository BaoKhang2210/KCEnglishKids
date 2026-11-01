// Read-only readiness check using the real registry and configured lesson data.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../../client/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { getAvailableLessonGames } = require('../../client/src/games/registry.ts');
const { availableGames } = require('../src/services/gameRules');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
const { Lesson } = require('../src/models');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Configured database is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 8000 });
  const lessons = await Lesson.find({ status: 'ACTIVE' })
    .populate('curriculumUnits', 'unitNumber bigQuestion storyTitle')
    .populate('vocabularyItems', 'english vietnamese category imageUrl wordType isTransparent visualType')
    .sort({ key: 1 }).lean();
  const rows = lessons.map(lesson => {
    // Match LessonDetailPage resolution against the actual populated API data.
    const unit = lesson.unit?.displayOrder ?? lesson.unit?.unitNumber ?? lesson.curriculumUnits?.[0]?.unitNumber ?? lesson.unitNumber ?? 1;
    const lessonNumber = lesson.displayOrder ?? lesson.lessonNumber ?? 1;
    const games = getAvailableLessonGames(lesson.vocabularyItems, unit, lessonNumber);
    const serverGames=availableGames(lesson.vocabularyItems,unit,lessonNumber).map(game=>game.id);
    return { key: lesson.key, ageGroup: lesson.ageGroupCode, vocabulary: lesson.vocabularyItems.length, games: games.map(game => game.id), canComplete: games.length >= 2, registryMatches:JSON.stringify(serverGames)===JSON.stringify(games.map(game=>game.id)) };
  });
  const report = { checkedAt: new Date().toISOString(), scope: 'read-only configured database and actual game registry', requiredDistinctGames: 2, lessons: rows.length, blocked: rows.filter(row => !row.canComplete),registryMismatches:rows.filter(row=>!row.registryMatches) };
  fs.writeFileSync(path.resolve(__dirname, '../../docs/business-game-coverage-2026-10-28.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ lessons: report.lessons, blocked: report.blocked.length, keys: report.blocked.map(row => row.key) }));
  if (report.blocked.length || report.registryMismatches.length) process.exitCode = 2;
}
main().catch(error => { console.error('Readiness audit did not complete: ' + error.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
