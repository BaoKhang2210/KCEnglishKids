/**
 * Activity Data Generator for KCEnglishKids
 * Generates age-appropriate, diverse activities for lessons across all 27 units.
 * Supports all 11 activity types:
 * 1. LISTEN_CHOOSE
 * 2. LISTEN_REPEAT
 * 3. IMAGE_WORD_MATCH
 * 4. DRAG_DROP
 * 5. MEMORY_CARD
 * 6. FIND_OBJECT
 * 7. MISSING_OBJECT
 * 8. COLOR_RECOGNITION
 * 9. COUNT_OBJECTS (respects number progression)
 * 10. TRUE_FALSE
 * 11. CLASSIFICATION
 */

// Numerical progression per book & unit as specified in prompt section 15
const NUMERACY_PROGRESSION = {
  B1_U1: { count: 1, text: 'one' },
  B1_U2: { count: 2, text: 'two' },
  B1_U3: { count: 3, text: 'three' },
  B1_U4: { count: 4, text: 'four' },
  B1_U5: { count: 5, text: 'five' },
  B1_U6: { count: 6, text: 'six' },
  B1_U7: { count: 7, text: 'seven' },
  B1_U8: { count: 8, text: 'eight' },
  B1_U9: { count: 10, text: 'ten' },

  B2_U1: { count: 10, text: 'ten' },
  B2_U2: { count: 12, text: 'twelve' },
  B2_U3: { count: 15, text: 'fifteen' },
  B2_U4: { count: 18, text: 'eighteen' },
  B2_U5: { count: 19, text: 'nineteen' },
  B2_U6: { count: 20, text: 'twenty' },
  B2_U7: { count: 30, text: 'thirty' },
  B2_U8: { count: 40, text: 'forty' },
  B2_U9: { count: 50, text: 'fifty' },

  B3_U1: { count: 20, text: 'twenty' },
  B3_U2: { count: 30, text: 'thirty' },
  B3_U3: { count: 40, text: 'forty' },
  B3_U4: { count: 50, text: 'fifty' },
  B3_U5: { count: 60, text: 'sixty' },
  B3_U6: { count: 70, text: 'seventy' },
  B3_U7: { count: 80, text: 'eighty' },
  B3_U8: { count: 90, text: 'ninety' },
  B3_U9: { count: 100, text: 'one hundred' }
};

/**
 * Builds activity definitions for a given lesson
 */
function buildActivitiesForLesson(lessonDef, vocabMap) {
  const activities = [];
  const words = lessonDef.vocabularyWords || [];
  const unitKey = lessonDef.unitKey;
  const age = lessonDef.ageGroupCode;
  const numData = NUMERACY_PROGRESSION[unitKey] || { count: 3, text: 'three' };
  const topic = lessonDef.topicSlug || '';
  const order = lessonDef.order || 1;

  // =========================================================================
  // 1. Primary Activity for every lesson: LISTEN_CHOOSE
  // =========================================================================
  if (words.length >= 2) {
    const questions = [];
    const questionTargets = words.slice(0, Math.min(words.length, 4));

    questionTargets.forEach((targetWord, qIdx) => {
      const vocab = vocabMap.get(targetWord.toLowerCase().trim());
      const distractors = words.filter(w => w !== targetWord);
      const pickedDistractors = distractors.slice(0, 2);
      const allOptionWords = [targetWord, ...pickedDistractors].sort(() => Math.random() - 0.5);

      const options = allOptionWords.map((word, optIdx) => {
        const v = vocabMap.get(word.toLowerCase().trim());
        return {
          id: `opt_${qIdx}_${optIdx}_${word.replace(/\s+/g, '_')}`,
          text: v ? v.english : word,
          vietnameseText: v ? v.vietnamese : word,
          imageUrl: v ? v.imageUrl : '',
          audioUrl: v ? v.audioUrl : '',
          isCorrect: word === targetWord
        };
      });

      questions.push({
        promptText: targetWord,
        promptAudio: vocab?.audioMedia,
        promptAudioUrl: vocab?.audioUrl,
        promptImage: vocab?.primaryMedia,
        promptImageUrl: vocab?.imageUrl,
        correctAnswer: targetWord,
        options,
        vocabulary: vocab?._id,
        explanation: `Great job! That is a ${targetWord}${vocab ? ` (${vocab.vietnamese})` : ''}.`,
        metadata: {
          points: Math.round(100 / questionTargets.length),
          vocabularyId: vocab?._id
        }
      });
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'LISTEN_CHOOSE',
      title: `Listen & Choose: ${lessonDef.title}`,
      vietnameseTitle: `Nghe và Chọn: ${lessonDef.vietnameseTitle}`,
      instructions: 'Listen to the word and tap the matching picture!',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: questions.length,
      pointsPerQuestion: Math.round(100 / questions.length),
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions,
      order: 1,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 2. Special Case: Book 1 Unit 5 (Vertical Slice Demo Path)
  // Has rich interactive set: Listen & Choose, Image Match, Memory Card, Count Objects
  // =========================================================================
  if (lessonDef.key === 'B1_U5_L1') {
    // Lesson 1 Pet Animals gets IMAGE_WORD_MATCH and MEMORY_CARD
    const matchPairs = words.slice(0, 4).map((w, idx) => {
      const v = vocabMap.get(w.toLowerCase().trim());
      return {
        id: `pair_${idx}`,
        word: w,
        image: v?.imageUrl || '',
        vocabulary: v?._id
      };
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'IMAGE_WORD_MATCH',
      title: 'Image Matching: Pet Animals',
      vietnameseTitle: 'Nối từ và hình: Thú cưng',
      instructions: 'Connect each animal picture with its English word!',
      ageGroupCode: age,
      difficulty: 1,
      questionCount: matchPairs.length,
      pointsPerQuestion: 25,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: matchPairs.map((p, idx) => ({
        promptText: `Match the picture of ${p.word}`,
        promptImageUrl: p.image,
        correctAnswer: p.word,
        vocabulary: p.vocabulary,
        options: words.slice(0, 3).map((w, optIdx) => ({
          id: `opt_match_${idx}_${optIdx}`,
          text: w,
          isCorrect: w === p.word
        })),
        metadata: {
          image: p.image,
          word: p.word,
          matchingPair: { word: p.word, image: p.image }
        },
        explanation: `Super! That is a ${p.word}.`
      })),
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'MEMORY_CARD',
      title: 'Memory Cards: Pet Animals',
      vietnameseTitle: 'Lật thẻ trí nhớ: Thú cưng',
      instructions: 'Flip two cards to find matching pet pairs!',
      ageGroupCode: age,
      difficulty: 1,
      questionCount: 3,
      pointsPerQuestion: 33,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: words.slice(0, 3).map((w, idx) => {
        const v = vocabMap.get(w.toLowerCase().trim());
        return {
          promptText: `Find the matching pair: ${w}`,
          promptImageUrl: v?.imageUrl,
          correctAnswer: w,
          vocabulary: v?._id,
          options: [
            { id: `mem_opt_${idx}_1`, text: w, imageUrl: v?.imageUrl, isCorrect: true },
            { id: `mem_opt_${idx}_2`, text: 'Other', imageUrl: '', isCorrect: false }
          ],
          metadata: {
            pairType: 'word_image',
            targetWord: w,
            targetImage: v?.imageUrl
          },
          explanation: `Pair matched: ${w}!`
        };
      }),
      order: 3,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 3. COLOR_RECOGNITION (for colors topic or color lessons)
  // =========================================================================
  if ((topic === 'colors' || lessonDef.title.toLowerCase().includes('color')) && words.length >= 2) {
    const colorWord = words[0];
    const v = vocabMap.get(colorWord.toLowerCase().trim());
    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'COLOR_RECOGNITION',
      title: `Color Recognition: ${lessonDef.title}`,
      vietnameseTitle: `Nhận biết màu sắc: ${lessonDef.vietnameseTitle}`,
      instructions: `Find the object with the color ${colorWord}!`,
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: 1,
      pointsPerQuestion: 100,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: [
        {
          promptText: `Which one is ${colorWord}?`,
          promptAudioUrl: v?.audioUrl,
          correctAnswer: colorWord,
          options: words.slice(0, 3).map((w, idx) => {
            const optV = vocabMap.get(w.toLowerCase().trim());
            return {
              id: `color_opt_${idx}`,
              text: optV ? optV.english : w,
              imageUrl: optV ? optV.imageUrl : '',
              isCorrect: w === colorWord
            };
          }),
          vocabulary: v?._id,
          metadata: {
            targetColor: colorWord,
            correctObject: colorWord,
            audioPrompt: `Find the ${colorWord} object.`
          },
          explanation: `Correct! You found the ${colorWord} item!`
        }
      ],
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 4. CLASSIFICATION (for classification lessons, e.g. B2_U8_L2, B3_U8_L1, B3_U5_L2)
  // =========================================================================
  if (
    lessonDef.key === 'B2_U8_L2' || // Land, Water and Air
    lessonDef.key === 'B3_U8_L1' || // Natural or Human-made
    lessonDef.key === 'B3_U5_L2' || // Jobs and Workplaces
    lessonDef.key === 'B2_U4_L4'    // Life on a Farm
  ) {
    const isNatural = lessonDef.key === 'B3_U8_L1';
    const categories = isNatural ? ['Natural (Tự nhiên)', 'Human-made (Nhân tạo)'] : ['Land (Trên cạn)', 'Water (Dưới nước)', 'Air (Trên trời)'];
    const targetWord = words[0];
    const v = vocabMap.get(targetWord.toLowerCase().trim());

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'CLASSIFICATION',
      title: `Classification: ${lessonDef.title}`,
      vietnameseTitle: `Phân loại: ${lessonDef.vietnameseTitle}`,
      instructions: 'Group each object or creature into its correct category!',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: 1,
      pointsPerQuestion: 100,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: [
        {
          promptText: `Which group does ${targetWord} belong to?`,
          promptImageUrl: v?.imageUrl,
          correctAnswer: categories[0],
          options: categories.map((cat, idx) => ({
            id: `class_opt_${idx}`,
            text: cat,
            isCorrect: idx === 0
          })),
          vocabulary: v?._id,
          metadata: {
            objects: words.slice(0, 3),
            categories,
            correctCategory: categories[0]
          },
          explanation: `${targetWord} belongs to ${categories[0]}.`
        }
      ],
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 5. MISSING_OBJECT (for observation lessons, e.g. B2_U3_L4, B2_U7_L4, B3_U7_L4)
  // =========================================================================
  if (lessonDef.key === 'B2_U3_L4' || lessonDef.key === 'B2_U7_L4' || lessonDef.key === 'B3_U7_L4') {
    const missing = words[0];
    const visible = words.slice(1, 4);
    const v = vocabMap.get(missing.toLowerCase().trim());

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'MISSING_OBJECT',
      title: `What is Missing?: ${lessonDef.title}`,
      vietnameseTitle: `Đồ vật nào còn thiếu?: ${lessonDef.vietnameseTitle}`,
      instructions: 'Look closely at the scene. Which object is missing?',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: 1,
      pointsPerQuestion: 100,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: [
        {
          promptText: `Look at the items: ${visible.join(', ')}. Which one is missing?`,
          correctAnswer: missing,
          options: words.slice(0, 3).map((w, idx) => ({
            id: `miss_opt_${idx}`,
            text: w,
            isCorrect: w === missing
          })),
          vocabulary: v?._id,
          metadata: {
            visibleObjects: visible,
            missingObject: missing,
            options: words.slice(0, 3)
          },
          explanation: `The missing object is ${missing}!`
        }
      ],
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 6. LISTEN_REPEAT (for conversational speech in Age 5–6)
  // =========================================================================
  if (
    age === '5-6' &&
    (lessonDef.key === 'B3_U1_L4' ||
      lessonDef.key === 'B3_U2_L4' ||
      lessonDef.key === 'B3_U6_L4' ||
      lessonDef.key === 'B3_U9_L4')
  ) {
    const targetWord = words[0];
    const v = vocabMap.get(targetWord.toLowerCase().trim());

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'LISTEN_REPEAT',
      title: `Listen & Repeat: ${lessonDef.title}`,
      vietnameseTitle: `Nghe và Nhắc lại: ${lessonDef.vietnameseTitle}`,
      instructions: 'Listen to the native voice and speak into the microphone to practice pronunciation!',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: 1,
      pointsPerQuestion: 100,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: [
        {
          promptText: `Repeat clearly: ${targetWord}`,
          promptAudioUrl: v?.audioUrl,
          promptImageUrl: v?.imageUrl,
          correctAnswer: targetWord,
          options: [
            { id: 'lr_opt_1', text: targetWord, isCorrect: true }
          ],
          vocabulary: v?._id,
          metadata: {
            speechTarget: targetWord,
            audioPrompt: v?.audioUrl
          },
          explanation: `Wonderful pronunciation for ${targetWord}!`
        }
      ],
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 7. DRAG_DROP (for interactive organizing/dressing/routine lessons)
  // =========================================================================
  if (
    lessonDef.key === 'B1_U3_L4' || // Let's Move!
    lessonDef.key === 'B2_U6_L1' || // My Clothes
    lessonDef.key === 'B3_U1_L3' || // What Do We Do at School?
    lessonDef.key === 'B2_U1_L1'    // School Tools
  ) {
    const targetWord = words[0];
    const v = vocabMap.get(targetWord.toLowerCase().trim());

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'DRAG_DROP',
      title: `Drag & Drop: ${lessonDef.title}`,
      vietnameseTitle: `Kéo và Thả: ${lessonDef.vietnameseTitle}`,
      instructions: 'Drag the correct item to the designated target box!',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: 1,
      pointsPerQuestion: 100,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: [
        {
          promptText: `Drag the ${targetWord} into the box`,
          promptImageUrl: v?.imageUrl,
          correctAnswer: targetWord,
          options: words.slice(0, 3).map((w, idx) => ({
            id: `dd_opt_${idx}`,
            text: w,
            isCorrect: w === targetWord
          })),
          vocabulary: v?._id,
          metadata: {
            dragItem: targetWord,
            dropZone: 'Target Box'
          },
          explanation: `Placed ${targetWord} correctly!`
        }
      ],
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  // =========================================================================
  // 8. General Secondary Activity based on lesson order:
  // Lesson 1 -> IMAGE_WORD_MATCH
  // Lesson 2 -> MEMORY_CARD
  // Lesson 3 -> TRUE_FALSE (Age 5-6) or FIND_OBJECT (Age 3-4, 4-5)
  // Lesson 4 -> COUNT_OBJECTS (respecting Section 15 numeracy progression)
  // =========================================================================
  if (order === 1 && words.length >= 3 && lessonDef.key !== 'B1_U5_L1' && !activities.some(a => a.activityType === 'IMAGE_WORD_MATCH')) {
    const matchQuestions = words.slice(0, 4).map((w, idx) => {
      const v = vocabMap.get(w.toLowerCase().trim());
      const otherWords = words.filter(other => other !== w).slice(0, 2);
      const options = [w, ...otherWords].sort(() => Math.random() - 0.5).map((optW, optIdx) => {
        const optV = vocabMap.get(optW.toLowerCase().trim());
        return {
          id: `match_opt_${idx}_${optIdx}`,
          text: optV ? optV.english : optW,
          vietnameseText: optV ? optV.vietnamese : optW,
          imageUrl: optV ? optV.imageUrl : '',
          isCorrect: optW === w
        };
      });

      return {
        promptText: `Match the word: ${w}`,
        promptImageUrl: v ? v.imageUrl : '',
        correctAnswer: w,
        options,
        vocabulary: v?._id,
        metadata: {
          image: v?.imageUrl,
          word: w,
          matchingPair: { word: w, image: v?.imageUrl }
        },
        explanation: `Correct match for ${w}!`
      };
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'IMAGE_WORD_MATCH',
      title: `Match the Words: ${lessonDef.title}`,
      vietnameseTitle: `Nối từ và hình: ${lessonDef.vietnameseTitle}`,
      instructions: 'Look at the picture and match it with the correct English word!',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: matchQuestions.length,
      pointsPerQuestion: Math.round(100 / matchQuestions.length),
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: matchQuestions,
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  if (order === 2 && words.length >= 3 && !activities.some(a => a.activityType === 'MEMORY_CARD')) {
    const memoryQuestions = words.slice(0, 3).map((w, idx) => {
      const v = vocabMap.get(w.toLowerCase().trim());
      return {
        promptText: `Find the pair for: ${w}`,
        promptImageUrl: v ? v.imageUrl : '',
        correctAnswer: w,
        options: [
          { id: `mem_${idx}_1`, text: w, imageUrl: v?.imageUrl, isCorrect: true },
          { id: `mem_${idx}_2`, text: 'Other', imageUrl: '', isCorrect: false }
        ],
        vocabulary: v?._id,
        metadata: {
          pairType: 'word_image',
          targetWord: w,
          targetImage: v?.imageUrl
        },
        explanation: `Pair found: ${w}!`
      };
    });

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'MEMORY_CARD',
      title: `Memory Cards: ${lessonDef.title}`,
      vietnameseTitle: `Trò chơi lật thẻ ghi nhớ: ${lessonDef.vietnameseTitle}`,
      instructions: 'Flip the cards and find the matching pairs of words and pictures!',
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: memoryQuestions.length,
      pointsPerQuestion: Math.round(100 / memoryQuestions.length),
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: memoryQuestions,
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  if (order === 3 && words.length >= 2 && !activities.some(a => a.activityType === 'TRUE_FALSE' || a.activityType === 'FIND_OBJECT' || a.activityType === 'DRAG_DROP')) {
    const targetWord = words[0];
    const v = vocabMap.get(targetWord.toLowerCase().trim());
    const falseWord = words[1];
    const fv = vocabMap.get(falseWord.toLowerCase().trim());

    if (age === '5-6') {
      const tfQuestions = [
        {
          promptText: `Is this a ${targetWord}?`,
          promptImageUrl: v ? v.imageUrl : '',
          correctAnswer: 'True',
          options: [
            { id: 'tf_1_t', text: 'True (Đúng)', isCorrect: true },
            { id: 'tf_1_f', text: 'False (Sai)', isCorrect: false }
          ],
          vocabulary: v?._id,
          metadata: {
            statement: `This is a ${targetWord}.`,
            image: v?.imageUrl,
            correctAnswer: 'True'
          },
          explanation: `Yes, this is a ${targetWord}.`
        },
        {
          promptText: `Is this a ${falseWord}?`,
          promptImageUrl: v ? v.imageUrl : '',
          correctAnswer: 'False',
          options: [
            { id: 'tf_2_t', text: 'True (Đúng)', isCorrect: false },
            { id: 'tf_2_f', text: 'False (Sai)', isCorrect: true }
          ],
          vocabulary: v?._id,
          metadata: {
            statement: `This is a ${falseWord}.`,
            image: v?.imageUrl,
            correctAnswer: 'False'
          },
          explanation: `No, this is not a ${falseWord}. It is a ${targetWord}.`
        }
      ];

      activities.push({
        lessonKey: lessonDef.key,
        activityType: 'TRUE_FALSE',
        title: `True or False: ${lessonDef.title}`,
        vietnameseTitle: `Đúng hay Sai: ${lessonDef.vietnameseTitle}`,
        instructions: 'Look at the picture and choose whether the statement is True or False!',
        ageGroupCode: age,
        difficulty: lessonDef.difficulty,
        questionCount: tfQuestions.length,
        pointsPerQuestion: 50,
        starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
        questions: tfQuestions,
        order: 2,
        sourceType: 'SYSTEM_DESIGN'
      });
    } else {
      const findQuestions = [
        {
          promptText: `Find the ${targetWord}!`,
          promptAudioUrl: v?.audioUrl,
          correctAnswer: targetWord,
          options: [
            { id: 'fo_1', text: targetWord, imageUrl: v?.imageUrl, isCorrect: true },
            { id: 'fo_2', text: falseWord, imageUrl: fv?.imageUrl, isCorrect: false }
          ],
          vocabulary: v?._id,
          metadata: {
            scene: 'Scene',
            target: targetWord,
            distractors: [falseWord],
            audioPrompt: `Find the ${targetWord}!`
          },
          explanation: `Found the ${targetWord}!`
        }
      ];

      activities.push({
        lessonKey: lessonDef.key,
        activityType: 'FIND_OBJECT',
        title: `Find the Object: ${lessonDef.title}`,
        vietnameseTitle: `Tìm đồ vật: ${lessonDef.vietnameseTitle}`,
        instructions: `Listen carefully and find the ${targetWord}!`,
        ageGroupCode: age,
        difficulty: lessonDef.difficulty,
        questionCount: findQuestions.length,
        pointsPerQuestion: 100,
        starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
        questions: findQuestions,
        order: 2,
        sourceType: 'SYSTEM_DESIGN'
      });
    }
  }

  if (order === 4 && words.length >= 1 && !activities.some(a => a.activityType === 'COUNT_OBJECTS')) {
    const targetWord = words[0];
    const v = vocabMap.get(targetWord.toLowerCase().trim());
    const countNum = numData.count;

    const countQuestions = [
      {
        promptText: `How many ${targetWord}s can you see?`,
        promptImageUrl: v ? v.imageUrl : '',
        correctAnswer: `${countNum}`,
        options: [
          { id: 'cnt_opt_1', text: `${countNum} (${numData.text})`, isCorrect: true },
          { id: 'cnt_opt_2', text: `${countNum + 1}`, isCorrect: false },
          { id: 'cnt_opt_3', text: `${Math.max(1, countNum - 1)}`, isCorrect: false }
        ],
        vocabulary: v?._id,
        metadata: {
          object: targetWord,
          quantity: countNum,
          numberOptions: [countNum, countNum + 1, Math.max(1, countNum - 1)],
          correctAnswer: `${countNum}`
        },
        explanation: `There are ${countNum} ${targetWord}s!`
      }
    ];

    activities.push({
      lessonKey: lessonDef.key,
      activityType: 'COUNT_OBJECTS',
      title: `Count Objects: ${lessonDef.title}`,
      vietnameseTitle: `Đếm số lượng: ${lessonDef.vietnameseTitle}`,
      instructions: `Count the ${targetWord}s and tap the correct number!`,
      ageGroupCode: age,
      difficulty: lessonDef.difficulty,
      questionCount: countQuestions.length,
      pointsPerQuestion: 100,
      starConfig: { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: countQuestions,
      order: 2,
      sourceType: 'SYSTEM_DESIGN'
    });
  }

  return activities;
}

module.exports = {
  buildActivitiesForLesson,
  NUMERACY_PROGRESSION
};
