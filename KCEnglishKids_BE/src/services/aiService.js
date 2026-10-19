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

const PRESCHOOL_TPR_MAP = {
  // Classroom & School
  book: 'Hai lòng bàn tay chắp lại rồi mở ra như trang sách đang lật, mắt mở to ngạc nhiên.',
  crayon: 'Cầm ngón tay giả vờ vẽ những nét lượn sóng cầu vồng rực rỡ trên không trung.',
  pencil: 'Cầm ngón tay viết từng nét chữ nắn nót vào lòng bàn tay kia.',
  pen: 'Cầm ngón tay viết từng nét chữ nắn nót vào lòng bàn tay kia.',
  marker: 'Cầm ngón tay vẽ một vòng tròn lớn trên không trung rồi khoanh tròn.',
  chair: 'Hạ thấp người như chuẩn bị ngồi xuống ghế rồi đứng thẳng dậy vỗ tay.',
  table: 'Dang hai cánh tay phẳng ngang tạo thành mặt bàn gỗ vững chãi.',
  desk: 'Dang hai cánh tay phẳng ngang tạo thành mặt bàn gỗ vững chãi.',
  school: 'Chắp hai tay trên đầu tạo thành mái ngói ngôi trường và chỉ tay ra xa mỉm cười.',
  teacher: 'Một tay đặt nhẹ lên ngực, một tay chỉ ra phía trước mỉm cười cúi chào thân thiện.',
  boy: 'Hai tay chống hông, ưỡn ngực tươi cười và nhún chân tự tin.',
  girl: 'Hai tay khẽ nắm vạt váy hoặc xoay nhẹ một vòng duyên dáng.',
  friend: 'Hai tay bắt chéo vỗ vai hai bạn bên cạnh hoặc giơ ngón tay cái kết bạn.',
  bag: 'Giả vờ khoác quai balo lên vai và bước đi tung tăng vui vẻ.',
  backpack: 'Giả vờ khoác quai balo lên vai và bước đi tung tăng vui vẻ.',
  clock: 'Một tay chống hông, một tay quay tròn như kim đồng hồ kêu "Tick tock, tick tock".',

  // Face & Body Parts
  face: 'Hai bàn tay ôm nhẹ lấy khuôn mặt, nghiêng đầu sang hai bên mỉm cười tươi tắn.',
  hair: 'Dùng các ngón tay vuốt nhẹ lên mái tóc như chiếc lược chải tóc mượt mà.',
  eyes: 'Chụm ngón tay làm thành hai chiếc kính mắt trước mắt và chớp chớp tinh nghịch.',
  nose: 'Ngón tay trỏ chạm nhẹ vào đầu mũi và hít một hơi thật sâu.',
  mouth: 'Chạm nhẹ ngón tay lên môi, mở to khẩu hình tròn xoe nói "A-O-U".',
  ears: 'Khum hai bàn tay áp nhẹ lên hai tai lắng nghe âm thanh từ xa xăm.',
  cheeks: 'Dùng hai ngón tay trỏ ấn nhẹ vào má lúm đồng tiền và cười tươi.',
  forehead: 'Đặt bàn tay ngang trán nhìn xa xăm như thuyền trưởng khám phá hòn đảo.',
  arms: 'Gập hai cánh tay khoe cơ bắp khỏe khoắn như lực sĩ tí hon.',
  hands: 'Hai bàn tay xòe rộng, lắc lắc cổ tay và vỗ tay giòn giã theo nhịp 1-2-3.',
  legs: 'Hai tay chống hông, dậm dậm hai chân tại chỗ theo nhịp bước chân gấu Koko.',
  feet: 'Nhón gót chân lên rồi hạ xuống, chỉ tay xuống đôi chân nhảy nhẹ tại chỗ.',
  fingers: 'Xòe 10 ngón tay làm động tác gõ phím đàn piano tí hon trên không trung.',
  head: 'Hai tay ôm nhẹ đầu, gật gật đầu đồng ý một cách hào hứng.',

  // Feelings
  happy: 'Hai tay giơ lên cao lắc lắc cổ tay, miệng cười thật tươi hô to "Yay!".',
  sad: 'Hai tay ôm má, giả vờ quẹt nhẹ giọt nước mắt rơi xuống xót xa.',
  angry: 'Hai tay chống nạnh, phồng má giậm nhẹ một chân xuống đất kiên quyết.',
  scared: 'Hai tay ôm chặt ngực, mắt mở to và lùi lại một bước run rẩy.',
  sleepy: 'Áp hai lòng bàn tay vào một bên má, nhắm mắt nghiêng đầu ngủ say sưa.',
  tired: 'Hai tay buông thõng, thở dài nhẹ nhàng và vươn vai thư giãn.',
  hungry: 'Hai tay xoa xoa vòng tròn quanh bụng và thè lưỡi thèm ăn.',

  // Animals
  cat: 'Khum các ngón tay vuốt nhẹ hai má làm râu mèo và kêu "Meow meow".',
  dog: 'Đặt hai bàn tay lên đầu làm tai cún con vẫy vẫy và sủa vui "Gâu gâu".',
  bird: 'Dang rộng hai cánh tay vỗ nhẹ nhàng như chú chim non đang bay lượn trên trời xanh.',
  fish: 'Hai lòng bàn tay áp sát vào nhau, uốn lượn như chú cá nhỏ tung tăng bơi lội.',
  lion: 'Xòe hai bàn tay làm móng vuốt sư tử vươn ra trước và gầm nhẹ "Roar!".',
  bear: 'Đi lạch bạch hai chân dạng rộng, hai tay giơ cao như chú gấu Koko đáng yêu.',
  rabbit: 'Giơ hai ngón tay trỏ và giữa lên đầu làm tai thỏ vẫy vẫy và nhảy lò cò.',
  frog: 'Ngồi xổm xuống rồi nhảy bật lên cao kêu "Ọp ẹp, hop hop!".',
  duck: 'Hai tay kẹp nách vỗ nhẹ làm cánh vịt và lắc lư cái hông "Quạc quạc".',
  elephant: 'Một tay đưa ra trước làm vòi voi đung đưa qua lại nhịp nhàng.',
  monkey: 'Một tay gãi đầu, một tay gãi sườn nhảy nhót tinh nghịch "Khẹc khẹc".',

  // Food & Fruits
  apple: 'Hai tay khum lại như quả táo tròn, đưa lên miệng giả vờ cắn một miếng "Crunch!".',
  banana: 'Một tay giữ quả chuối, tay kia làm động tác bóc từng dải vỏ chuối từ từ.',
  orange: 'Hai tay làm động tác xoay tròn quả cam rồi vắt nước cam vào ly.',
  water: 'Một tay cầm chiếc cốc vô hình đưa lên miệng giả vờ uống ực ực sảng khoái.',
  milk: 'Hai tay nâng cốc sữa uống ngon lành rồi xoa xoa bụng thỏa mãn.',
  bread: 'Hai tay làm động tác bẻ đôi ổ bánh mì nóng giòn đưa lên mũi ngửi thơm lừng.',
  egg: 'Hai tay chụm lại hình quả trứng rồi mở bung ra như gà con nở.',

  // Actions
  jump: 'Nhún gối và nhảy bật lên cao như chú ếch nhỏ.',
  run: 'Đánh tay hai bên sườn chạy chậm tại chỗ như vận động viên tí hon.',
  walk: 'Bước từng bước chậm rãi, tay vung nhịp nhàng theo nhịp đếm 1-2-1-2.',
  dance: 'Xoay tròn một vòng nhẹ nhàng và giơ hai tay lên cao tạo dáng ngôi sao.',
  sing: 'Một tay cầm chiếc micro vô hình đưa lên miệng cất tiếng hát du dương.',
  listen: 'Đặt ngón tay trỏ lên môi "Shhh", tay kia áp lên tai chăm chú lắng nghe.',
  look: 'Đặt hai bàn tay khum quanh mắt làm ống nhòm nhìn khắp lớp học.',
  stop: 'Giơ một lòng bàn tay thẳng ra phía trước làm khẩu lệnh dừng lại dứt khoát.',

  // Colors & Nature
  sun: 'Hai tay vươn cao tạo thành vòng tròn mặt trời tỏa ánh nắng ấm áp rực rỡ.',
  tree: 'Đứng thẳng, hai tay vươn cao xòe ngón tay như tán cây cành lá đung đưa trong gió.',
  flower: 'Chụm hai cổ tay lại, các ngón tay xòe ra như bông hoa đang nở rộ đón nắng.',
  star: 'Xòe 5 ngón tay giơ lên cao lắc lấp lánh như ngôi sao sáng trên bầu trời đêm.',
  rain: 'Các ngón tay rung rung từ trên cao hạ dần xuống như những hạt mưa rơi tí tách.',
  wind: 'Hai cánh tay vẫy lượn sóng từ trái sang phải thổi vù vù như cơn gió mát.'
};

function getWordTprGesture(word) {
  if (!word) return 'Cô làm khẩu hình to, kết hợp chỉ tay và nhún chân theo nhịp.';
  const clean = String(word).toLowerCase().trim().replace(/[^a-z]/g, '');
  if (PRESCHOOL_TPR_MAP[clean]) return PRESCHOOL_TPR_MAP[clean];
  for (const [key, val] of Object.entries(PRESCHOOL_TPR_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return val;
  }
  return `Cô làm động tác mô phỏng từ "${word}", làm mẫu khẩu hình to rõ và mời cả lớp bắt chước theo 3 lần.`;
}

function generateLessonPlan({
  ageGroup = '3-4',
  lessonTitle = 'English Fun',
  targetTopic = 'General',
  durationMinutes = 25,
  vocabularyList = [],
  sentencePatterns = [],
  teachingStyle = 'active_tpr'
} = {}) {
  const safeAge = ['3-4', '4-5', '5-6'].includes(ageGroup) ? ageGroup : '3-4';
  const duration = durationMinutes === 15 ? 15 : durationMinutes === 35 ? 35 : 25;
  const safeStyle = ['active_tpr', 'story_song', 'interactive_drills'].includes(teachingStyle) ? teachingStyle : 'active_tpr';

  const bookLevel = safeAge === '3-4' ? 'Book 1 (Mầm 3–4 tuổi)' : safeAge === '4-5' ? 'Book 2 (Chồi 4–5 tuổi)' : 'Book 3 (Lá 5–6 tuổi)';

  // Normalize vocabulary with specific TPR gestures
  const words = Array.isArray(vocabularyList) && vocabularyList.length > 0
    ? vocabularyList.map(v => {
        const eng = typeof v === 'string' ? v.trim() : String(v.english || v.word || '').trim();
        const vn = typeof v === 'string' ? '' : String(v.vietnamese || '').trim();
        const pron = typeof v === 'string' ? '' : v.pronunciation || '';
        return {
          english: eng,
          vietnamese: vn,
          pronunciation: pron,
          tprGesture: getWordTprGesture(eng),
          teacherPrompt: `Look at the screen! What is this? It's a ${eng}! Say it with me: 1, 2, 3: ${eng}!`
        };
      }).filter(w => w.english.length > 0)
    : [
        { english: 'Apple', vietnamese: 'Quả táo', tprGesture: PRESCHOOL_TPR_MAP.apple, teacherPrompt: 'Look! It is an Apple!' },
        { english: 'Cat', vietnamese: 'Con mèo', tprGesture: PRESCHOOL_TPR_MAP.cat, teacherPrompt: 'Look! It is a Cat!' },
        { english: 'Sun', vietnamese: 'Mặt trời', tprGesture: PRESCHOOL_TPR_MAP.sun, teacherPrompt: 'Look! It is the Sun!' }
      ];

  const wordNames = words.map(w => w.english).join(', ');

  // Time allocations
  const timeAlloc = duration === 15
    ? { warmup: 3, presentation: 5, practice: 5, wrapup: 2 }
    : duration === 35
      ? { warmup: 7, presentation: 11, practice: 13, wrapup: 4 }
      : { warmup: 5, presentation: 8, practice: 9, wrapup: 3 };

  // Pedagogical objectives
  const objectives = {
    knowledge: [
      `Nhận biết và ghi nhớ nghĩa của các từ vựng trọng tâm: ${wordNames}`,
      safeAge === '3-4'
        ? 'Phản xạ với hình ảnh và âm thanh của từ vựng qua tranh thẻ KCEnglishKids'
        : `Làm quen và nói được mẫu câu giao tiếp đơn giản: "${sentencePatterns[0]?.english || (safeAge === '4-5' ? 'I see a ' + (words[0]?.english || 'star') : 'What is this? - It is a ' + (words[0]?.english || 'star'))}"`
    ],
    skills: [
      'Phát âm to, rõ ràng và tự tin qua thử thách tương tác cùng linh vật Koko',
      'Phối hợp vận động cơ thể (TPR) theo khẩu lệnh tiếng Anh của giáo viên',
      'Phản xạ nghe - chọn đồ vật/hình ảnh trong thời gian dưới 5 giây'
    ],
    attitudes: [
      'Hào hứng tham gia hoạt động nhóm cùng các bạn trong lớp',
      'Tự tin phát âm tiếng Anh tự nhiên, không sợ phát âm sai'
    ]
  };

  const materialsNeeded = [
    'Màn hình tương tác / Máy chiếu hiển thị Flashcard KCEnglishKids',
    'Thẻ tranh từ vựng khổ A5 có hình ảnh linh vật Koko',
    'Loa phát bài hát chủ đề và hiệu ứng âm thanh cổ vũ',
    safeStyle === 'active_tpr' ? 'Bóng mềm hoặc vòng nhảy vận động' : 'Hộp quà bí mật (Mystery Magic Box)'
  ];

  const teacherPrepTips = [
    'Khởi động tinh thần vui tươi, gọi tên bé thân mật để tạo sự gắn kết.',
    'Sử dụng phương pháp nói mẫu: Chậm -> Rõ -> Cường điệu khẩu hình -> Kết hợp cử chỉ tay.',
    'Ưu tiên khen thưởng bằng High-five, vỗ tay và tặng sao KCEnglishKids.'
  ];

  // Generate activities per phase
  const warmupActivities = safeStyle === 'story_song'
    ? [
        {
          name: 'Bài hát chào buổi sáng: "Hello Koko Song!"',
          durationMin: Math.ceil(timeAlloc.warmup / 2),
          type: 'song',
          teacherTalk: 'Good morning little stars! Look, Koko is here! Let’s wave our hands and sing together!',
          tprAction: 'Cô đeo rối tay Koko hoặc giơ hình Koko, vẫy 2 tay theo nhịp điệu bài hát, mời cả lớp cùng đứng dậy nhún nhảy.',
          description: 'Cả lớp cùng hát bài hát chào hỏi, vỗ tay và làm động tác vẫy tay theo giai điệu vui nhộn.'
        },
        {
          name: 'Kể chuyện dẫn nhập cùng Koko',
          durationMin: Math.floor(timeAlloc.warmup / 2),
          type: 'story',
          teacherTalk: `Today, Koko goes on a magical adventure to explore ${cleanLabel(targetTopic, 50) || 'new friends'}! Are you ready?`,
          tprAction: 'Cô giả vờ mở chiếc hộp thần kỳ, đặt tay lên trán nhìn xa xăm tạo sự tò mò cho trẻ.',
          description: 'Cô giới thiệu câu chuyện mini kết nối với chủ đề bài học để thu hút 100% sự tập trung của trẻ.'
        }
      ]
    : [
        {
          name: 'Bài hát vận động: "Make a Circle & Hello!"',
          durationMin: Math.ceil(timeAlloc.warmup / 2),
          type: 'song',
          teacherTalk: 'Hello everyone! Let’s make a big round circle! 1, 2, 3, hold hands and smile!',
          tprAction: 'Cô cùng các bé nắm tay tạo vòng tròn lớn, bước vào giữa và bước ra ngoài theo nhịp điệu.',
          description: 'Hoạt động gắn kết đầu giờ giúp bé giải tỏa e ngại và bắt nhịp vào buổi học.'
        },
        {
          name: 'Trò chơi phản xạ: "Koko Freeze Dance!"',
          durationMin: Math.floor(timeAlloc.warmup / 2),
          type: 'tpr_game',
          teacherTalk: 'When music plays, we jump like Koko! When music stops, freeze like a statue! Shhh!',
          tprAction: 'Cô nhún nhảy giả vờ làm chú sư tử dũng mãnh, nhạc dừng thì giữ nguyên tư thế bất động.',
          description: 'Trò chơi kích hoạt vận động toàn thân (TPR) giúp trẻ tỉnh táo và tràn đầy năng lượng.'
        }
      ];

  const presentationActivities = [
    {
      name: 'Khám phá từ vựng trên Flashcard KCEnglishKids',
      durationMin: Math.ceil(timeAlloc.presentation / 2),
      type: 'flashcard_drill',
      teacherTalk: `Look at the screen! What is this? Listen to Koko: "${words[0]?.english || 'Apple'}!" Let’s say it together: 1, 2, 3!`,
      tprAction: 'Cô chỉ vào màn hình hiển thị Flashcard, làm khẩu hình miệng to rõ, sau đó áp tay lên tai lắng nghe bé nhắc lại.',
      description: `Cô giới thiệu lần lượt các từ vựng (${wordNames}) qua hình ảnh hoạt họa và phát âm mẫu của hệ thống.`
    },
    {
      name: 'Vận động thể chất (TPR Mime Actions) cho từng từ vựng',
      durationMin: Math.floor(timeAlloc.presentation / 2),
      type: 'tpr_action',
      teacherTalk: 'Now, let’s use our magical hands and bodies to show the words!',
      tprAction: words.slice(0, 5).map(w => `Từ "${w.english}": ${w.tprGesture || getWordTprGesture(w.english)}`).join(' | '),
      description: 'Gắn mỗi từ vựng với một động tác cơ thể đặc trưng giúp trẻ mầm non ghi nhớ sâu vào tiềm thức.'
    }
  ];

  const practiceActivities = [
    {
      name: 'Trò chơi tập thể: "Magic Mystery Box / Chiếc hộp bí mật"',
      durationMin: Math.ceil(timeAlloc.practice / 2),
      type: 'interactive_game',
      teacherTalk: 'Who wants to touch the Magic Box? Come here, reach in, and tell Koko what you found!',
      tprAction: 'Cô mời từng bé hoặc nhóm bé lên bốc đồ vật/thẻ tranh trong hộp, giơ cao cho cả lớp cùng hô to từ vựng tiếng Anh.',
      description: 'Kích thích tính tò mò và cảm giác xúc giác của trẻ mầm non, tạo cơ hội cho từng bé được nói trước lớp.'
    },
    {
      name: 'Thử thách phát âm cùng Linh vật Koko (Koko Speaking Buddy)',
      durationMin: Math.floor(timeAlloc.practice / 2),
      type: 'speaking_challenge',
      teacherTalk: 'Koko wants to hear your sweet voices! Let’s speak into the mic and earn 3 shiny stars!',
      tprAction: 'Cô hướng dẫn bé chạm vào nút Micro trên KCEnglishKids, cổ vũ bé phát âm to rõ và cùng đập tay (High-Five) ăn mừng pháo hoa sao.',
      description: 'Sử dụng trực tiếp công cụ Koko Speaking Coach trên hệ thống để khích lệ trẻ phát âm và nhận sao thưởng.'
    }
  ];

  const wrapupActivities = [
    {
      name: 'Vinh danh Ngôi sao nhí & Tặng thưởng KCEnglishKids',
      durationMin: Math.ceil(timeAlloc.wrapup / 2),
      type: 'reward_ceremony',
      teacherTalk: 'You all did a fantastic job today! Let’s give ourselves a big round of applause and collect our golden stars!',
      tprAction: 'Cô vỗ tay giòn giã, trao huy hiệu sao ảo hoặc sticker cho các bé, tuyên dương tinh thần hăng hái của cả lớp.',
      description: 'Củng cố thành quả học tập, tạo cảm xúc tự hào và háo hức mong chờ buổi học tiếp theo.'
    },
    {
      name: 'Bài hát tạm biệt: "Goodbye Song & See You Soon!"',
      durationMin: Math.floor(timeAlloc.wrapup / 2),
      type: 'goodbye_song',
      teacherTalk: 'Goodbye little friends! See you next time with Koko! Bye-bye!',
      tprAction: 'Cô vẫy 2 tay chào tạm biệt, ôm hoặc đập tay từng bé khi bé ra về.',
      description: 'Kết thúc buổi học trong không khí êm dịu, ấm áp và vui tươi.'
    }
  ];

  const phases = [
    {
      phaseId: 'warmup',
      name: '1. Khởi động & Chào hỏi (Warm-up & Greeting)',
      durationMin: timeAlloc.warmup,
      badge: 'Khởi động',
      icon: 'Sparkles',
      colorTheme: 'amber',
      goals: ['Tạo không khí lớp học vui vẻ, hào hứng', 'Kích hoạt phản xạ nghe - hiểu tiếng Anh đầu giờ'],
      activities: warmupActivities
    },
    {
      phaseId: 'presentation',
      name: '2. Giới thiệu & Vận động TPR (Presentation & TPR)',
      durationMin: timeAlloc.presentation,
      badge: 'Khắc sâu từ vựng',
      icon: 'BookOpen',
      colorTheme: 'teal',
      goals: ['Nhận biết mặt chữ và âm thanh chuẩn qua Flashcard', 'Ghi nhớ sâu từ vựng qua hành động cơ thể (TPR)'],
      activities: presentationActivities
    },
    {
      phaseId: 'practice',
      name: '3. Thực hành & Trò chơi tương tác (Practice & Games)',
      durationMin: timeAlloc.practice,
      badge: 'Thực hành tương tác',
      icon: 'Gamepad2',
      colorTheme: 'indigo',
      goals: ['Luyện phản xạ nhanh qua trò chơi nhóm', 'Tự tin nói tiếng Anh cùng trợ lý phát âm Koko'],
      activities: practiceActivities
    },
    {
      phaseId: 'wrapup',
      name: '4. Khen thưởng & Tổng kết (Wrap-up & Celebration)',
      durationMin: timeAlloc.wrapup,
      badge: 'Tổng kết & Khen thưởng',
      icon: 'Trophy',
      colorTheme: 'emerald',
      goals: ['Củng cố từ vựng bài học', 'Trao thưởng tạo động lực học tập lâu dài'],
      activities: wrapupActivities
    }
  ];

  const homeConnectPrompt = `Hôm nay ở lớp bé đã cùng cô và Koko khám phá các từ: ${wordNames}. Ở nhà, bố mẹ chỉ cần dành 5 phút cùng bé chỉ vào các đồ vật quen thuộc và hỏi: "What is this?" để cùng bé nhắc lại từ vựng nhé!`;

  return {
    meta: {
      lessonTitle: cleanLabel(lessonTitle, 100),
      targetTopic: cleanLabel(targetTopic, 80),
      ageGroup: safeAge,
      bookLevel,
      durationMinutes: duration,
      teachingStyle: safeStyle,
      wordCount: words.length
    },
    targetVocabulary: words,
    targetSentences: sentencePatterns,
    objectives,
    materialsNeeded,
    teacherPrepTips,
    phases,
    homeConnectPrompt,
    source: 'pedagogical_engine',
    generative: false
  };
}

module.exports = {
  currentStreak,
  answerAccuracy,
  templateProvider,
  validOptions,
  generateParentNote,
  normalizeTranscript,
  evaluatePronunciation,
  generateLessonPlan
};
