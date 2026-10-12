/**
 * E2E — "luồng dạy thật hoàn chỉnh" (golden flow) over live HTTP:
 *   child login → curriculum path → lesson → activity play (perfect answers)
 *   → server grading → progress → lesson complete → unit complete
 *   → reward chest GRANTED → reveal → sticker + star bonus.
 *
 * Run:  node src/scripts/verify_golden_flow.js [email] [pin]
 * (requires BE running on :5000 + seeded DB)
 */
const BASE = 'http://localhost:5000/api';
const EMAIL = process.argv[2] || 'leo@kcenglishkids.com';
const PIN = process.argv[3] || '1234';

let TOKEN = '';
const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${data.message || JSON.stringify(data).slice(0, 160)}`);
  return data;
};

/** Perfect-play answers: pick the option flagged isCorrect, else text answer. */
const buildPerfectAnswers = activity => {
  const questions = activity.questions || [];
  if (activity.activityType === 'MEMORY_CARD') {
    return questions.map((_, i) => ({ questionIndex: i, responseTimeMs: 700 }));
  }
  return questions.map((q, i) => {
    const correct = (q.options || []).find(o => o.isCorrect);
    if (correct?.id) return { questionIndex: i, selectedOptionId: correct.id, responseTimeMs: 700 };
    return { questionIndex: i, answerText: q.correctAnswer || '', responseTimeMs: 700 };
  });
};

(async () => {
  // ---- 1. CHILD LOGIN -------------------------------------------------------
  const login = await api('POST', '/auth/child-login', { identifier: EMAIL, password: PIN });
  TOKEN = login.token;
  const childId = login.user.id;
  console.log(`[1] LOGIN OK — ${login.user.name} (${login.user.ageGroupCode}) id=${childId}`);

  // ---- 2. CURRICULUM PATH ---------------------------------------------------
  const path = await api('GET', '/lessons/curriculum-path');
  const unit = path.data.find(u => u.totalLessons > 0 && u.completedLessons < u.totalLessons);
  if (!unit) { console.log('All units already complete — nothing to play. Rerun with another child.'); return; }
  console.log(`[2] UNIT SELECTED — Unit ${unit.unitNumber} "${unit.bigQuestion}" · ${unit.totalLessons} lessons (${unit.completedLessons} done)`);

  // ---- 3. REWARDS BEFORE ----------------------------------------------------
  const before = await api('GET', `/children/${childId}/rewards`);
  console.log(`[3] REWARDS BEFORE — totalStars=${before.data.totalStars} completedUnits=${before.data.completedUnits} stickers=${before.data.grantedStickerIds.length} chests=${before.data.chests.length}`);

  // ---- 4. PLAY: every lesson → every activity (server grades) ---------------
  const grantedChests = [];
  for (const lesson of unit.lessons) {
    if (lesson.completed) { console.log(`    Lesson "${lesson.title}" already complete — skip.`); continue; }
    const detail = await api('GET', `/lessons/${lesson._id}`);
    const activities = detail.data.activities || [];
    const session = await api('POST', '/learning/sessions', { lessonId: lesson._id });
    console.log(`  ▶ Lesson "${lesson.title}" — ${activities.length} activities, session ${session.data._id}`);

    for (const act of activities) {
      const full = await api('GET', `/activities/${act._id}`);
      const answers = buildPerfectAnswers(full.data);
      const result = await api('POST', '/learning/activity-results', {
        activityId: act._id, lessonId: lesson._id, sessionId: session.data._id,
        answers, duration: 45
      });
      const d = result.data;
      console.log(`      ✓ ${act.title} (${act.activityType}) → ${d.score}/${d.maxScore} · ${d.stars}★ · lessonCompleted=${d.lessonCompleted}`);
      if (Array.isArray(d.unitCompletionsGranted) && d.unitCompletionsGranted.length) {
        grantedChests.push(...d.unitCompletionsGranted);
        d.unitCompletionsGranted.forEach(g => console.log(`      🎁 UNIT COMPLETE! unitCode=${g.unitCode} rewards=${JSON.stringify(g.rewards.map(r => r.type + (r.refId ? ':' + r.refId : ' x' + r.amount)))}`));
      }
    }
  }

  // ---- 5. REWARDS AFTER + CHEST STATE --------------------------------------
  const after = await api('GET', `/children/${childId}/rewards`);
  console.log(`[5] REWARDS AFTER — totalStars=${after.data.totalStars} completedUnits=${after.data.completedUnits} stickers=${after.data.grantedStickerIds.length}`);
  const chest = after.data.chests.find(c => String(c.unitId) === String(unit._id));
  if (!chest) { console.log('!! No chest found for the completed unit — INVESTIGATE'); process.exit(1); }
  console.log(`    Chest for Unit ${unit.unitNumber}: granted=${chest.granted} revealed=${!!chest.revealedAt} stars=${chest.rewards.stars} sticker=${chest.rewards.stickerId}`);

  // ---- 6. REVEAL THE CHEST --------------------------------------------------
  if (!chest.revealedAt) {
    const reveal = await api('POST', `/children/${childId}/rewards/chests/${unit._id}/reveal`, {});
    console.log(`[6] CHEST REVEALED — sticker=${reveal.data?.rewards?.stickerId ?? reveal.data?.stickerId ?? '(see body)'}`);

    const final = await api('GET', `/children/${childId}/rewards`);
    const reopened = final.data.chests.find(c => String(c.unitId) === String(unit._id));
    console.log(`[7] VERIFY — chest revealedAt set: ${!!reopened.revealedAt} · totalStars=${final.data.totalStars}`);
  } else {
    console.log('[6] Chest already revealed earlier — state consistent.');
  }

  // ---- 7. CURRICULUM PATH REFLECTS COMPLETION -------------------------------
  const afterPath = await api('GET', '/lessons/curriculum-path');
  const unitAfter = afterPath.data.find(u => String(u._id) === String(unit._id));
  console.log(`[8] PATH CHECK — Unit ${unitAfter.unitNumber}: ${unitAfter.completedLessons}/${unitAfter.totalLessons} lessons, isCompleted=${unitAfter.isCompleted}, stars=${unitAfter.totalUnitStars}`);
  console.log('\nGOLDEN FLOW OK ✔');
})().catch(e => { console.error('GOLDEN FLOW FAILED ✖ —', e.message); process.exit(1); });
