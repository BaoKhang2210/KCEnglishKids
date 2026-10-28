// Read-only HTTP checks against the current app source and configured database.
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
const app = require('../src/app');
const { Lesson, Activity, User } = require('../src/models');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const routes = ['/api/topics', '/api/vocabulary', ...['3-4', '4-5', '5-6'].map(a => '/api/lessons/curriculum-path?ageGroup=' + a),
      ...(await Lesson.find({ status: 'ACTIVE' }).select('_id').lean()).map(l => '/api/lessons/' + l._id),
      ...(await Activity.find({ status: 'ACTIVE' }).select('_id').lean()).map(a => '/api/activities/' + a._id)];
    const failures = []; let passed = 0;
    for (const route of routes) {
      const response = await fetch(base + route); const body = await response.json();
      if (response.ok && body.success) passed++; else failures.push({ route, status: response.status });
    }
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../client/public/images/manifest.json'), 'utf8'));
    const urls = [...new Set([...Object.values(manifest.vocabulary).flatMap(v => [v.url, v.animationUrl]), ...Object.values(manifest.topics).map(t => t.url), ...Object.values(manifest.symbols), '/images/scenes/learning-garden-v1.png', '/images/licenses/fluent-emoji-MIT.txt'])];
    const queue = [...urls]; let imagesPassed = 0;
    await Promise.all(Array.from({ length: 12 }, async () => {
      while (queue.length) {
        const url = queue.shift(); const response = await fetch(base + url); await response.arrayBuffer();
        if (response.ok) imagesPassed++; else failures.push({ url, status: response.status });
      }
    }));
    const teacher = await User.findOne({ role: 'TEACHER', status: 'ACTIVE' }).select('_id authVersion').lean();
    if (!teacher) throw new Error('No active teacher is available for read verification');
    const token = require('jsonwebtoken').sign({ id: String(teacher._id), authVersion: teacher.authVersion || 0 }, require('../src/config/auth').jwtSecret(), { expiresIn: '2m' });
    const teacherChecks = [];
    for (const route of ['/api/teacher/dashboard', '/api/teacher/sentence-patterns', '/api/teacher/sentence-patterns/units-overview']) {
      const response = await fetch(base + route, { headers: { Authorization: 'Bearer ' + token } }); await response.json();
      teacherChecks.push({ route, status: response.status }); if (!response.ok) failures.push({ route, status: response.status });
    }
    const report = { readOnly: true, verifiedAt: new Date().toISOString(), api: { checked: routes.length, passed }, images: { checked: urls.length, passed: imagesPassed }, teacherChecks, failures };
    fs.writeFileSync(path.resolve(__dirname, '../../docs/verification-after-repair-2026-10-28.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report)); if (failures.length) process.exitCode = 1;
  } finally { await new Promise(resolve => server.close(resolve)); }
}
if (require.main === module) main().catch(error => { console.error('Read verification failed: ' + error.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
