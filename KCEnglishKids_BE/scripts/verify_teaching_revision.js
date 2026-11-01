// Read-only smoke against current code and the configured database. No notifications or teaching writes.
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
const M = require('../src/models');
const jwt = require('jsonwebtoken');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  const server = require('../src/app').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const checks = [];
  try {
    for (const role of ['ADMIN', 'TEACHER']) {
      const user = await M.User.findOne({ role, status: 'ACTIVE' }).select('_id authVersion');
      if (!user) throw new Error('No active account for verification role.');
      const token = jwt.sign({ id: String(user._id), authVersion: user.authVersion || 0 }, require('../src/config/auth').jwtSecret(), { expiresIn: '5m' });
      const endpoints = role === 'ADMIN' ? ['/admin/game-catalog', '/recognitions/school?kind=WEEK&date=2026-10-19'] : ['/teacher/dashboard', '/teacher/classes', '/teacher/students', '/teacher/tasks', '/teacher/my-schedule'];
      for (const endpoint of endpoints) {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/api' + endpoint, { headers: { Authorization: 'Bearer ' + token } });
        const data = await response.json();
        checks.push({ role, endpoint, status: response.status, success: data.success });
        if (!response.ok || !data.success) throw new Error('A read-only endpoint failed verification.');
        if (endpoint === '/teacher/students' && data.data[0]) {
          const overview = await fetch('http://127.0.0.1:' + server.address().port + '/api/teacher/students/' + data.data[0]._id + '/overview', { headers: { Authorization: 'Bearer ' + token } });
          checks.push({ role, endpoint: '/teacher/students/:id/overview', status: overview.status });
          if (!overview.ok) throw new Error('Student overview failed verification.');
        }
      }
    }
    const catalog = await require('../src/services/gameCatalog').loadCatalog();
    await require('../src/services/gameCatalog').assertLessonCoverage(catalog.games);
    checks.push({ check: 'At least two compatible games for every active lesson', success: true });
    const animalGames = await M.Activity.find({ activityType: 'ANIMAL_SOUND', status: 'ACTIVE' }).select('questions').lean();
    const calls = [...new Set(animalGames.flatMap(game => game.questions.map(question => String(question.metadata?.animal || question.options?.find(option => option.isCorrect)?.text || question.correctAnswer || '').trim().toLowerCase())))];
    const report = { generatedAt: new Date(), checks, stage3Games: catalog.games.length, activeAnimalActivities: animalGames.length, requiredAnimalCalls: calls };
    fs.writeFileSync(path.resolve(__dirname, '../../docs/teaching-revision-smoke-2026-10-31.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error('Read-only teaching verification failed (' + error.name + ').'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
