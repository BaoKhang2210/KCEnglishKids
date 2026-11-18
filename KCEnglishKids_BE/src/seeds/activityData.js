/**
 * Activity Data Generator for KCEnglishKids
 * Generates age-appropriate, multi-question interactive activities for lessons across all 27 units.
 */

const NUMBER_WORDS = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten'
};

const KNOWN_COLORS = new Set([
  'red', 'blue', 'yellow', 'green', 'orange', 'pink', 'purple',
  'brown', 'black', 'white', 'gray', 'grey', 'rainbow', 'gold', 'silver'
]);

// Numerical progression per book & unit as specified in curriculum
const NUMERACY_PROGRESSION = {
  B1_U1: { count: 3, text: 'three' },
  B1_U2: { count: 4, text: 'four' },
  B1_U3: { count: 5, text: 'five' },
  B1_U4: { count: 5, text: 'five' },
  B1_U5: { count: 6, text: 'six' },
  B1_U6: { count: 6, text: 'six' },
  B1_U7: { count: 7, text: 'seven' },
  B1_U8: { count: 8, text: 'eight' },
  B1_U9: { count: 10, text: 'ten' },

  B2_U1: { count: 5, text: 'five' },
  B2_U2: { count: 6, text: 'six' },
  B2_U3: { count: 7, text: 'seven' },
  B2_U4: { count: 8, text: 'eight' },
  B2_U5: { count: 9, text: 'nine' },
  B2_U6: { count: 10, text: 'ten' },
  B2_U7: { count: 8, text: 'eight' },
  B2_U8: { count: 9, text: 'nine' },
  B2_U9: { count: 10, text: 'ten' },

  B3_U1: { count: 6, text: 'six' },
  B3_U2: { count: 7, text: 'seven' },
  B3_U3: { count: 8, text: 'eight' },
  B3_U4: { count: 9, text: 'nine' },
  B3_U5: { count: 10, text: 'ten' },
  B3_U6: { count: 8, text: 'eight' },
  B3_U7: { count: 9, text: 'nine' },
  B3_U8: { count: 10, text: 'ten' },
  B3_U9: { count: 10, text: 'ten' }
};

function rotatePick(arr, startIdx, count) {
  if (!arr.length) return [];
  const res = [];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    res.push(arr[(startIdx + i) % arr.length]);
  }
  return res;
}

function buildChoiceOptions(targetWord, allWords, vocabMap, prefix, qIdx, maxDistractors = 3) {
  const distractors = allWords.filter(w => w.toLowerCase().trim() !== targetWord.toLowerCase().trim());
  const pickedDistractors = rotatePick(distractors, qIdx * 2, maxDistractors);
  const combined = [targetWord, ...pickedDistractors];
  // Deterministic rotation so correct option position varies cleanly across questions
  const shift = qIdx % combined.length;
  const rotated = [...combined.slice(shift), ...combined.slice(0, shift)];

  return rotated.map((word, optIdx) => {
    const v = vocabMap.get(word.toLowerCase().trim());
    const cleanId = word.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return {
      id: `${prefix}_${qIdx}_${optIdx}_${cleanId}`,
      text: v ? v.english : word,
      vietnameseText: v ? v.vietnamese : '',
      imageUrl: v ? v.imageUrl : '',
      audioUrl: v ? v.audioUrl : '',
      isCorrect: word.toLowerCase().trim() === targetWord.toLowerCase().trim()
    };
  });
}

function buildUniqueCountOptions(quantity, prefix, qIdx) {
  const candidates = [];
  if (quantity > 1) candidates.push(quantity - 1);
  if (quantity < 10) candidates.push(quantity + 1);
  if (quantity + 2 <= 10) candidates.push(quantity + 2);
  if (quantity - 2 >= 1) candidates.push(quantity - 2);
  for (let n = 1; n <= 10; n++) {
    if (n !== quantity && !candidates.includes(n)) candidates.push(n);
  }
  const distractors = candidates.slice(0, 2);
  const nums = [quantity, ...distractors];
  const shift = qIdx % nums.length;
  const rotated = [...nums.slice(shift), ...nums.slice(0, shift)];

  return rotated.map((num, idx) => ({
    id: `${prefix}_${qIdx}_${idx}_n${num}`,
    text: `${num} (${NUMBER_WORDS[num] || num})`,
    vietnameseText: `Số ${num}`,
    isCorrect: num === quantity
  }));
}

/**
 * Builds rich multi-question activity definitions for a given lesson (6-8 activities per lesson, 6-8 questions each)
 */
function buildActivitiesForLesson(lessonDef, vocabMap) {
  const activities = [];
  const words = (lessonDef.vocabularyWords || []).filter(Boolean);
  const unitKey = lessonDef.unitKey;
  const age = lessonDef.ageGroupCode || '3-4';
  const topic = lessonDef.topicSlug || '';
  const maxQ = Math.min(Math.max(words.length, 6), 8);

  if (words.length < 2) return activities;

  const targetWords = Array.from({ length: maxQ }, (_, i) => words[i % words.length]);

  // =========================================================================
  // 1. LISTEN_CHOOSE (Nghe và Chọn Tranh) — 6 to 8 questions
  // =========================================================================
  const listenQuestions = targetWords.map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const options = buildChoiceOptions(targetWord, words, vocabMap, 'lc_opt', qIdx, 3);
    return {
      promptText: vocab ? vocab.english : targetWord,
      promptAudio: vocab?.audioMedia,
      promptAudioUrl: vocab?.audioUrl || '',
      promptImage: vocab?.primaryMedia,
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: vocab ? vocab.english : targetWord,
      options,
      vocabulary: vocab?._id,
      explanation: `Đúng rồi! Đó là "${vocab ? vocab.english : targetWord}"${vocab?.vietnamese ? ` (${vocab.vietnamese})` : ''}.`,
      metadata: {
        points: Math.round(100 / targetWords.length),
        vocabularyId: vocab?._id,
        targetWord: vocab ? vocab.english : targetWord
      }
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'LISTEN_CHOOSE',
    title: `Listen & Choose: ${lessonDef.title}`,
    vietnameseTitle: `Nghe và Chọn Tranh: ${lessonDef.vietnameseTitle}`,
    instructions: 'Bé lắng nghe phát âm và chạm vào bức tranh đúng nhất!',
    ageGroupCode: age,
    difficulty: lessonDef.difficulty || 1,
    questionCount: listenQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / listenQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: listenQuestions,
    order: 1,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 2. IMAGE_WORD_MATCH (Nhìn Tranh Chọn Từ) — 6 to 8 questions
  // =========================================================================
  const matchQuestions = targetWords.map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const options = buildChoiceOptions(targetWord, words, vocabMap, 'iwm_opt', qIdx + 1, 3);
    const wordText = vocab ? vocab.english : targetWord;
    return {
      promptText: `Nhìn tranh và chọn từ đúng cho hình này`,
      promptAudioUrl: vocab?.audioUrl || '',
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: wordText,
      options,
      vocabulary: vocab?._id,
      metadata: {
        image: vocab?.imageUrl || '',
        word: wordText,
        matchingPair: { word: wordText, image: vocab?.imageUrl || '' }
      },
      explanation: `Tuyệt vời! Bức tranh này là "${wordText}"${vocab?.vietnamese ? ` (${vocab.vietnamese})` : ''}.`
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'IMAGE_WORD_MATCH',
    title: `Match Picture & Word: ${lessonDef.title}`,
    vietnameseTitle: `Nhìn Tranh Chọn Từ: ${lessonDef.vietnameseTitle}`,
    instructions: 'Bé quan sát bức tranh và chọn thẻ từ tiếng Anh tương ứng!',
    ageGroupCode: age,
    difficulty: lessonDef.difficulty || 1,
    questionCount: matchQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / matchQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: matchQuestions,
    order: 2,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 3. MEMORY_CARD (Lật Thẻ Trí Nhớ) — 6 to 8 pairs
  // =========================================================================
  const memoryQuestions = targetWords.map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const options = buildChoiceOptions(targetWord, words, vocabMap, 'mem_opt', qIdx, 2);
    const wordText = vocab ? vocab.english : targetWord;
    return {
      promptText: `Tìm cặp thẻ giống nhau: ${wordText}`,
      promptAudioUrl: vocab?.audioUrl || '',
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: wordText,
      options,
      vocabulary: vocab?._id,
      metadata: {
        pairType: 'word_image',
        targetWord: wordText,
        vietnameseText: vocab?.vietnamese || '',
        targetImage: vocab?.imageUrl || ''
      },
      explanation: `Đã tìm thấy cặp thẻ "${wordText}"!`
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'MEMORY_CARD',
    title: `Memory Flip Cards: ${lessonDef.title}`,
    vietnameseTitle: `Lật Thẻ Trí Nhớ: ${lessonDef.vietnameseTitle}`,
    instructions: 'Mời bé lật mở 2 thẻ để tìm cặp Hình ảnh và Từ vựng trùng khớp!',
    ageGroupCode: age,
    difficulty: lessonDef.difficulty || 1,
    questionCount: memoryQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / memoryQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: memoryQuestions,
    order: 3,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 4. TRUE_FALSE (Đúng Hay Sai - Yes/No) — 6 questions
  // =========================================================================
  const tfTargets = targetWords.slice(0, 6);
  const tfQuestions = tfTargets.map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const isTrue = qIdx % 2 === 0;
    const otherWords = words.filter(w => w.toLowerCase().trim() !== targetWord.toLowerCase().trim());
    const wrongWord = otherWords[qIdx % Math.max(1, otherWords.length)] || targetWord;
    const wrongVocab = vocabMap.get(wrongWord.toLowerCase().trim());
    const shownWordObj = isTrue ? vocab : wrongVocab;
    const shownWord = shownWordObj ? shownWordObj.english : (isTrue ? targetWord : wrongWord);
    const shownVi = shownWordObj?.vietnamese || '';
    const actualWord = vocab ? vocab.english : targetWord;

    return {
      promptText: `Nhìn tranh và cho biết đây có phải là "${shownWord}"${shownVi ? ` (${shownVi})` : ''} không?`,
      promptAudioUrl: (isTrue ? vocab?.audioUrl : wrongVocab?.audioUrl) || '',
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: isTrue ? 'True' : 'False',
      options: [
        { id: `tf_${qIdx}_true`, text: 'True (Đúng)', isCorrect: isTrue },
        { id: `tf_${qIdx}_false`, text: 'False (Sai)', isCorrect: !isTrue }
      ],
      vocabulary: vocab?._id,
      metadata: {
        statement: `This is "${shownWord}"${shownVi ? ` (${shownVi})` : ''}.`,
        image: vocab?.imageUrl || '',
        correctAnswer: isTrue ? 'True' : 'False',
        targetWord: actualWord,
        displayedWord: shownWord
      },
      explanation: isTrue
        ? `Chính xác! Đây đúng là "${actualWord}".`
        : `Chính xác! Hình này là "${actualWord}" chứ không phải "${shownWord}".`
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'TRUE_FALSE',
    title: `True or False: ${lessonDef.title}`,
    vietnameseTitle: `Đúng Hay Sai (Yes/No): ${lessonDef.vietnameseTitle}`,
    instructions: 'Bé nhìn bức tranh và chọn câu nói bên dưới là Đúng (True) hay Sai (False)!',
    ageGroupCode: age,
    difficulty: lessonDef.difficulty || 1,
    questionCount: tfQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / tfQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: tfQuestions,
    order: 4,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 5. COUNT_OBJECTS (Đếm Số Lượng) — 6 questions with varied quantities 1..10
  // =========================================================================
  const baseMaxCount = NUMERACY_PROGRESSION[unitKey]?.count || (age === '3-4' ? 5 : age === '4-5' ? 8 : 10);
  const countSequence = age === '3-4'
    ? [2, 3, 1, 4, 5, 3]
    : age === '4-5'
    ? [3, 5, 2, 6, 4, 7]
    : [4, 6, 3, 8, 5, 9];

  const countQuestions = targetWords.slice(0, 6).map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const wordText = vocab ? vocab.english : targetWord;
    const rawQty = countSequence[qIdx % countSequence.length];
    const quantity = Math.max(1, Math.min(10, Math.min(rawQty, Math.max(5, baseMaxCount))));
    const options = buildUniqueCountOptions(quantity, 'cnt_opt', qIdx);

    return {
      promptText: `Bé hãy chạm đếm xem có bao nhiêu "${wordText}"${vocab?.vietnamese ? ` (${vocab.vietnamese})` : ''} trên màn hình?`,
      promptAudioUrl: vocab?.audioUrl || '',
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: `${quantity}`,
      options,
      vocabulary: vocab?._id,
      metadata: {
        object: wordText,
        vietnameseText: vocab?.vietnamese || '',
        image: vocab?.imageUrl || '',
        quantity,
        numberOptions: options.map(o => parseInt(o.text, 10)),
        correctAnswer: `${quantity}`
      },
      explanation: `Đúng rồi! Có tất cả ${quantity} (${NUMBER_WORDS[quantity]}) ${wordText}!`
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'COUNT_OBJECTS',
    title: `Count the Objects: ${lessonDef.title}`,
    vietnameseTitle: `Đếm Số Lượng: ${lessonDef.vietnameseTitle}`,
    instructions: 'Bé chạm vào từng hình để đếm to bằng tiếng Anh rồi chọn con số đúng!',
    ageGroupCode: age,
    difficulty: lessonDef.difficulty || 1,
    questionCount: countQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / countQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: countQuestions,
    order: 5,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 6. MISSING_OBJECT (Đồ Vật Biến Mất - Kim's Game) — 6 questions
  // =========================================================================
  const missingQuestions = targetWords.slice(0, 6).map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const wordText = vocab ? vocab.english : targetWord;
    const otherWords = words.filter(w => w.toLowerCase().trim() !== targetWord.toLowerCase().trim());
    const visibleRaw = rotatePick(otherWords, qIdx, 3);
    const visibleObjects = visibleRaw.map(w => {
      const v = vocabMap.get(w.toLowerCase().trim());
      return v ? v.english : w;
    });
    const options = buildChoiceOptions(targetWord, [targetWord, ...visibleRaw], vocabMap, 'miss_opt', qIdx, 3);

    return {
      promptText: `Quan sát kỹ các hình trên bàn và đoán xem hình nào vừa biến mất?`,
      promptAudioUrl: vocab?.audioUrl || '',
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: wordText,
      options,
      vocabulary: vocab?._id,
      metadata: {
        visibleObjects,
        missingObject: wordText,
        initialObjects: [...visibleObjects, wordText],
        options: options.map(o => o.text)
      },
      explanation: `Tinh mắt quá! Hình vừa biến mất chính là "${wordText}"${vocab?.vietnamese ? ` (${vocab.vietnamese})` : ''}!`
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'MISSING_OBJECT',
    title: `What is Missing?: ${lessonDef.title}`,
    vietnameseTitle: `Đồ Vật Biến Mất: ${lessonDef.vietnameseTitle}`,
    instructions: 'Bé ghi nhớ các hình trên bàn trong 5 giây và tìm ra hình nào vừa bị giấu đi!',
    ageGroupCode: age,
    difficulty: lessonDef.difficulty || 1,
    questionCount: missingQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / missingQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: missingQuestions,
    order: 6,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 7. BUBBLE_POP (Đập Bong Bóng Từ Vựng) — 6 questions
  // =========================================================================
  const bubbleQuestions = targetWords.slice(0, 6).map((targetWord, qIdx) => {
    const vocab = vocabMap.get(targetWord.toLowerCase().trim());
    const wordText = vocab ? vocab.english : targetWord;
    const options = buildChoiceOptions(targetWord, words, vocabMap, 'bub_opt', qIdx + 2, 3);
    return {
      promptText: wordText,
      promptAudioUrl: vocab?.audioUrl || '',
      promptImageUrl: vocab?.imageUrl || '',
      correctAnswer: wordText,
      options,
      vocabulary: vocab?._id,
      metadata: {
        targetWord: wordText,
        vietnameseText: vocab?.vietnamese || ''
      },
      explanation: `Bụp! Bé đã đập đúng bong bóng "${wordText}"!`
    };
  });

  activities.push({
    lessonKey: lessonDef.key,
    activityType: 'BUBBLE_POP',
    title: `Bubble Pop: ${lessonDef.title}`,
    vietnameseTitle: `Đập Bong Bóng: ${lessonDef.vietnameseTitle}`,
    instructions: 'Nghe từ vựng và chạm làm nổ quả bong bóng mang hình tương ứng!',
    ageGroupCode: age,
    difficulty: 1,
    questionCount: bubbleQuestions.length,
    pointsPerQuestion: Math.max(1, Math.round(100 / bubbleQuestions.length)),
    starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
    questions: bubbleQuestions,
    order: 7,
    sourceType: 'SYSTEM_DESIGN'
  });

  // =========================================================================
  // 8. FEED_ANIMAL or COLOR_RECOGNITION or STAR_CATCHER — 6 questions
  // =========================================================================
  const colorWordsInLesson = words.filter(w => KNOWN_COLORS.has(w.toLowerCase().trim()));
  if (topic === 'colors' || lessonDef.title.toLowerCase().includes('color') || colorWordsInLesson.length >= 2) {
    const orderedColorPool = [
      ...colorWordsInLesson,
      ...words.filter(w => !KNOWN_COLORS.has(w.toLowerCase().trim()))
    ];
    const colorTargets = Array.from({ length: Math.min(6, orderedColorPool.length) }, (_, i) => orderedColorPool[i]);
    const colorQuestions = colorTargets.map((targetWord, qIdx) => {
      const vocab = vocabMap.get(targetWord.toLowerCase().trim());
      const wordText = vocab ? vocab.english : targetWord;
      const options = buildChoiceOptions(targetWord, words, vocabMap, 'col_opt', qIdx, 3);
      return {
        promptText: `Bé hãy tìm hình tương ứng với "${wordText}"${vocab?.vietnamese ? ` (${vocab.vietnamese})` : ''}!`,
        promptAudioUrl: vocab?.audioUrl || '',
        promptImageUrl: vocab?.imageUrl || '',
        correctAnswer: wordText,
        options,
        vocabulary: vocab?._id,
        metadata: {
          targetColor: wordText,
          correctObject: wordText,
          audioPrompt: `Find ${wordText}!`
        },
        explanation: `Giỏi lắm! Bé đã chọn đúng "${wordText}"!`
      };
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'COLOR_RECOGNITION',
      title: `Color Recognition: ${lessonDef.title}`,
      vietnameseTitle: `Nhận Biết Màu Sắc: ${lessonDef.vietnameseTitle}`,
      instructions: 'Nghe tên màu sắc hoặc đồ vật và chọn bức tranh tương ứng!',
      ageGroupCode: age,
      difficulty: 1,
      questionCount: colorQuestions.length,
      pointsPerQuestion: Math.max(1, Math.round(100 / colorQuestions.length)),
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: colorQuestions,
      order: 8,
      sourceType: 'SYSTEM_DESIGN'
    });
  } else {
    const extraType = age === '5-6' ? 'STAR_CATCHER' : 'FEED_ANIMAL';
    const extraQuestions = targetWords.slice(0, 6).map((targetWord, qIdx) => {
      const vocab = vocabMap.get(targetWord.toLowerCase().trim());
      const wordText = vocab ? vocab.english : targetWord;
      const options = buildChoiceOptions(targetWord, words, vocabMap, 'ext_opt', qIdx + 1, 3);
      return {
        promptText: wordText,
        promptAudioUrl: vocab?.audioUrl || '',
        promptImageUrl: vocab?.imageUrl || '',
        correctAnswer: wordText,
        options,
        vocabulary: vocab?._id,
        metadata: {
          targetWord: wordText,
          vietnameseText: vocab?.vietnamese || ''
        },
        explanation: `Hoan hô! Bé đã chọn đúng "${wordText}"!`
      };
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: extraType,
      title: extraType === 'STAR_CATCHER' ? `Star Catcher: ${lessonDef.title}` : `Help Koko Bear: ${lessonDef.title}`,
      vietnameseTitle: extraType === 'STAR_CATCHER' ? `Hứng Sao Từ Vựng: ${lessonDef.vietnameseTitle}` : `Cùng Gấu Koko: ${lessonDef.vietnameseTitle}`,
      instructions: extraType === 'STAR_CATCHER'
        ? 'Chạm thu hoạch ngôi sao mang đúng từ vựng được đọc!'
        : 'Chọn đúng món đồ hoặc thức ăn bạn Gấu Koko đang cần nhé!',
      ageGroupCode: age,
      difficulty: 1,
      questionCount: extraQuestions.length,
      pointsPerQuestion: Math.max(1, Math.round(100 / extraQuestions.length)),
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: extraQuestions,
      order: 8,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  return activities;
}

module.exports = {
  buildActivitiesForLesson,
  NUMERACY_PROGRESSION
};
