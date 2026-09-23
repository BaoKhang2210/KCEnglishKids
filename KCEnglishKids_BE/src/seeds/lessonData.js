/**
 * Complete Application Lessons Dataset for KCEnglishKids (27 Units x 4 Lessons = 108 Lessons)
 * Maps Official Units to Application Topics and structured lessons.
 * Source Type: SYSTEM_DESIGN
 */

const LESSONS_DATA = [
  // ===================== BOOK 1 — AGE 3–4 =====================
  // B1_U1 (What can we see at school?)
  {
    key: 'B1_U1_L1', unitKey: 'B1_U1', ageGroupCode: '3-4', topicSlug: 'school', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'Things at School', vietnameseTitle: 'Đồ dùng ở trường',
    description: 'Recognize book, crayon, chair, table, and school.',
    objectives: ['Identify school objects', 'Name everyday classroom items with confidence'],
    vocabularyWords: ['book', 'crayon', 'chair', 'table', 'school']
  },
  {
    key: 'B1_U1_L2', unitKey: 'B1_U1', ageGroupCode: '3-4', topicSlug: 'school', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'People at School', vietnameseTitle: 'Mọi người ở trường',
    description: 'Meet teacher, boy, girl, and friendly story characters Leo and Tickles.',
    objectives: ['Greet teacher and friends', 'Identify boy and girl'],
    vocabularyWords: ['teacher', 'boy', 'girl', 'Leo', 'Tickles', 'Dad', 'Mom', 'Mia']
  },
  {
    key: 'B1_U1_L3', unitKey: 'B1_U1', ageGroupCode: '3-4', topicSlug: 'school', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'What Can You See?', vietnameseTitle: 'Bé nhìn thấy gì nào?',
    description: 'Explore the school environment and notice trees, the sun, and classroom books.',
    objectives: ['Ask and answer What can you see?', 'Respond with I can see...'],
    vocabularyWords: ['sun', 'tree', 'school', 'book', 'crayon']
  },
  {
    key: 'B1_U1_L4', unitKey: 'B1_U1', ageGroupCode: '3-4', topicSlug: 'colors', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'School Colors and Numbers', vietnameseTitle: 'Màu sắc và chữ số ở trường',
    description: 'Count 1 book, 1 sun, and notice bright colorful crayons.',
    objectives: ['Identify number 1', 'Recognize colorful school objects'],
    vocabularyWords: ['crayon', 'book', 'chair', 'sun']
  },

  // B1_U2 (What do we look like?)
  {
    key: 'B1_U2_L1', unitKey: 'B1_U2', ageGroupCode: '3-4', topicSlug: 'my-body', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'My Face', vietnameseTitle: 'Khuôn mặt của em',
    description: 'Point to face, forehead, cheeks, and smile happily.',
    objectives: ['Name face parts', 'Point to forehead and cheeks'],
    vocabularyWords: ['face', 'forehead', 'cheeks', 'hair']
  },
  {
    key: 'B1_U2_L2', unitKey: 'B1_U2', ageGroupCode: '3-4', topicSlug: 'my-body', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'My Body Parts', vietnameseTitle: 'Các bộ phận trên mặt',
    description: 'Discover eyes, nose, mouth, and ears.',
    objectives: ['Say This is my nose', 'Say These are my eyes'],
    vocabularyWords: ['eyes', 'nose', 'mouth', 'ears', 'hair']
  },
  {
    key: 'B1_U2_L3', unitKey: 'B1_U2', ageGroupCode: '3-4', topicSlug: 'feelings', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'Feelings', vietnameseTitle: 'Những cảm xúc đáng yêu',
    description: 'Show when we feel happy, sad, or angry.',
    objectives: ['Identify happy, sad, angry', 'Answer Are you happy? with Yes I am'],
    vocabularyWords: ['happy', 'sad', 'angry']
  },
  {
    key: 'B1_U2_L4', unitKey: 'B1_U2', ageGroupCode: '3-4', topicSlug: 'feelings', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'Happy, Sad or Angry?', vietnameseTitle: 'Bé vui, buồn hay giận?',
    description: 'Match facial expressions with cheerful and gentle voice tones.',
    objectives: ['Express feelings appropriately', 'Count 2 eyes and 2 ears'],
    vocabularyWords: ['face', 'happy', 'sad', 'angry', 'eyes']
  },

  // B1_U3 (What can our bodies do?)
  {
    key: 'B1_U3_L1', unitKey: 'B1_U3', ageGroupCode: '3-4', topicSlug: 'my-body', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'My Body', vietnameseTitle: 'Cơ thể khỏe mạnh',
    description: 'Touch head, arms, legs, and feet.',
    objectives: ['Name head, arms, legs, feet', 'Say I have a head'],
    vocabularyWords: ['head', 'arms', 'legs', 'feet']
  },
  {
    key: 'B1_U3_L2', unitKey: 'B1_U3', ageGroupCode: '3-4', topicSlug: 'my-body', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'Hands and Knees', vietnameseTitle: 'Bàn tay và đầu gối',
    description: 'Wiggle fingers, touch elbows, and tap knees.',
    objectives: ['Identify hands, fingers, elbow, knee', 'Count 3 body parts'],
    vocabularyWords: ['hands', 'fingers', 'elbow', 'knee']
  },
  {
    key: 'B1_U3_L3', unitKey: 'B1_U3', ageGroupCode: '3-4', topicSlug: 'my-body', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'What Can I Do?', vietnameseTitle: 'Bé có thể làm gì?',
    description: 'Act out run, dance, crawl, and kick.',
    objectives: ['Perform actions when hearing verbs', 'Say I can dance'],
    vocabularyWords: ['run', 'dance', 'crawl', 'kick']
  },
  {
    key: 'B1_U3_L4', unitKey: 'B1_U3', ageGroupCode: '3-4', topicSlug: 'my-body', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'Let\'s Move!', vietnameseTitle: 'Cùng vận động nào!',
    description: 'Fun movement games combining body parts and action verbs.',
    objectives: ['Answer Can you run? with Yes I can', 'Move safely and happily'],
    vocabularyWords: ['run', 'dance', 'crawl', 'kick', 'feet', 'legs']
  },

  // B1_U4 (What is a family?)
  {
    key: 'B1_U4_L1', unitKey: 'B1_U4', ageGroupCode: '3-4', topicSlug: 'family', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'My Family', vietnameseTitle: 'Gia đình yêu thương',
    description: 'Introduce father, mother, and cute baby.',
    objectives: ['Identify father, mother, baby', 'Say This is my family'],
    vocabularyWords: ['father', 'mother', 'baby']
  },
  {
    key: 'B1_U4_L2', unitKey: 'B1_U4', ageGroupCode: '3-4', topicSlug: 'family', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'Family Members', vietnameseTitle: 'Các thành viên gia đình',
    description: 'Learn sister, brother, grandfather, and grandmother.',
    objectives: ['Name brother, sister, grandparents', 'Count 4 family members'],
    vocabularyWords: ['sister', 'brother', 'grandfather', 'grandmother']
  },
  {
    key: 'B1_U4_L3', unitKey: 'B1_U4', ageGroupCode: '3-4', topicSlug: 'family', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'Young and Old', vietnameseTitle: 'Trẻ và già',
    description: 'Compare young babies with wise old grandparents.',
    objectives: ['Understand young and old', 'Say My brother is young'],
    vocabularyWords: ['young', 'old', 'baby', 'grandfather']
  },
  {
    key: 'B1_U4_L4', unitKey: 'B1_U4', ageGroupCode: '3-4', topicSlug: 'family', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'Tall and Short', vietnameseTitle: 'Cao và thấp',
    description: 'Compare heights: tall father and short sister.',
    objectives: ['Differentiate tall and short', 'Describe family members'],
    vocabularyWords: ['tall', 'short', 'father', 'mother', 'sister']
  },

  // B1_U5 (What is a pet? — Vertical Slice Foundation)
  {
    key: 'B1_U5_L1', unitKey: 'B1_U5', ageGroupCode: '3-4', topicSlug: 'animals', order: 1, difficulty: 1, estimatedDuration: 8,
    title: 'Pet Animals', vietnameseTitle: 'Thú cưng quanh em',
    description: 'Meet dog, cat, rabbit, fish, bird, and turtle.',
    objectives: ['Recognize and name common pets', 'Listen to pet names and choose matching cards'],
    vocabularyWords: ['dog', 'cat', 'rabbit', 'fish', 'bird', 'turtle']
  },
  {
    key: 'B1_U5_L2', unitKey: 'B1_U5', ageGroupCode: '3-4', topicSlug: 'animals', order: 2, difficulty: 1, estimatedDuration: 8,
    title: 'Animal Actions', vietnameseTitle: 'Hành động của thú cưng',
    description: 'Explore walk, jump, swim, and fly.',
    objectives: ['Match animals to movements: fish swim, birds fly', 'Say Cats can walk'],
    vocabularyWords: ['walk', 'jump', 'swim', 'fly', 'dog', 'fish', 'bird']
  },
  {
    key: 'B1_U5_L3', unitKey: 'B1_U5', ageGroupCode: '3-4', topicSlug: 'animals', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'Animal Sounds and Tiny Pets', vietnameseTitle: 'Âm thanh thú cưng & bạn nhỏ',
    description: 'Say hello to hamster, lizard, and imitate animal sounds.',
    objectives: ['Name hamster and lizard', 'Listen and mimic animal sounds'],
    vocabularyWords: ['hamster', 'lizard', 'dog', 'cat', 'bird']
  },
  {
    key: 'B1_U5_L4', unitKey: 'B1_U5', ageGroupCode: '3-4', topicSlug: 'numbers', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'How Many Animals?', vietnameseTitle: 'Có bao nhiêu bạn thú?',
    description: 'Count pets up to number 5.',
    objectives: ['Count 1 to 5 pet animals', 'Answer I can see two birds'],
    vocabularyWords: ['dog', 'bird', 'rabbit', 'fish', 'turtle']
  },

  // B1_U6 (Can healthy foods be delicious?)
  {
    key: 'B1_U6_L1', unitKey: 'B1_U6', ageGroupCode: '3-4', topicSlug: 'food', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'Delicious Fruits', vietnameseTitle: 'Trái cây thơm ngon',
    description: 'Discover apple, pear, bananas, grapes, pineapple, and orange.',
    objectives: ['Name common sweet fruits', 'Say I like bananas'],
    vocabularyWords: ['apple', 'pear', 'bananas', 'grapes', 'pineapple', 'orange']
  },
  {
    key: 'B1_U6_L2', unitKey: 'B1_U6', ageGroupCode: '3-4', topicSlug: 'food', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'Healthy Vegetables', vietnameseTitle: 'Rau củ bổ dưỡng',
    description: 'Learn tomato, carrot, cucumbers, lettuce, potato, and peas.',
    objectives: ['Name common crunchy vegetables', 'Distinguish fruits and vegetables'],
    vocabularyWords: ['tomato', 'carrot', 'cucumbers', 'lettuce', 'potato', 'peas']
  },
  {
    key: 'B1_U6_L3', unitKey: 'B1_U6', ageGroupCode: '3-4', topicSlug: 'food', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'Healthy Food Rainbow', vietnameseTitle: 'Cầu vồng món ăn bổ dưỡng',
    description: 'Explore bright food colors: red tomato, orange carrot, green peas.',
    objectives: ['Connect colors with healthy foods', 'Identify number 6 in counting food items'],
    vocabularyWords: ['apple', 'carrot', 'bananas', 'orange', 'peas']
  },
  {
    key: 'B1_U6_L4', unitKey: 'B1_U6', ageGroupCode: '3-4', topicSlug: 'food', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'What Food Do You Like?', vietnameseTitle: 'Bé thích món nào nhất?',
    description: 'Answer Which foods do you like? with cheerful confidence.',
    objectives: ['Express food preferences', 'Answer What do you have?'],
    vocabularyWords: ['apple', 'bananas', 'grapes', 'pineapple', 'carrot']
  },

  // B1_U7 (What is a toy?)
  {
    key: 'B1_U7_L1', unitKey: 'B1_U7', ageGroupCode: '3-4', topicSlug: 'toys', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'My Favorite Toys', vietnameseTitle: 'Đồ chơi bé thích',
    description: 'Play with car, teddy bear, doll, and bouncy ball.',
    objectives: ['Name favorite toys', 'Recognize toy flashcards'],
    vocabularyWords: ['car', 'teddy bear', 'doll', 'ball']
  },
  {
    key: 'B1_U7_L2', unitKey: 'B1_U7', ageGroupCode: '3-4', topicSlug: 'toys', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'Toy Colors', vietnameseTitle: 'Sắc màu đồ chơi',
    description: 'Observe kite, blocks, yo-yo, and train in red, blue, and yellow.',
    objectives: ['Say The ball is red', 'Identify colors on toy objects'],
    vocabularyWords: ['kite', 'blocks', 'yo-yo', 'train', 'ball']
  },
  {
    key: 'B1_U7_L3', unitKey: 'B1_U7', ageGroupCode: '3-4', topicSlug: 'toys', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'Big or Small?', vietnameseTitle: 'To hay nhỏ?',
    description: 'Compare big tricycle and small puzzle pieces.',
    objectives: ['Classify toys by size (big/small)', 'Count up to 7 toys'],
    vocabularyWords: ['tricycle', 'robot', 'puzzle', 'board game', 'ball']
  },
  {
    key: 'B1_U7_L4', unitKey: 'B1_U7', ageGroupCode: '3-4', topicSlug: 'toys', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'Let\'s Match the Toys', vietnameseTitle: 'Cùng ghép hình đồ chơi',
    description: 'Interactive matching game for teddy bear, car, doll, and robot.',
    objectives: ['Match toy pictures with spoken words', 'Develop auditory recognition'],
    vocabularyWords: ['ball', 'car', 'doll', 'robot', 'teddy bear']
  },

  // B1_U8 (What can we see in a park?)
  {
    key: 'B1_U8_L1', unitKey: 'B1_U8', ageGroupCode: '3-4', topicSlug: 'nature', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'Things in the Park', vietnameseTitle: 'Cảnh sắc công viên',
    description: 'Notice green trees, pretty flowers, soft grass, and warm sunshine.',
    objectives: ['Identify park scenery', 'Say I can see a tree'],
    vocabularyWords: ['tree', 'flower', 'grass', 'sun', 'sky']
  },
  {
    key: 'B1_U8_L2', unitKey: 'B1_U8', ageGroupCode: '3-4', topicSlug: 'nature', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'Park Animals', vietnameseTitle: 'Các con vật trong công viên',
    description: 'Spot busy bees and colorful fluttering butterflies.',
    objectives: ['Identify bee and butterfly', 'Say I can see a butterfly'],
    vocabularyWords: ['bee', 'butterfly', 'flower']
  },
  {
    key: 'B1_U8_L3', unitKey: 'B1_U8', ageGroupCode: '3-4', topicSlug: 'toys', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'Fun on the Playground', vietnameseTitle: 'Vui chơi ở sân chơi',
    description: 'Play on slide, swing, seesaw, and monkey bars.',
    objectives: ['Name playground equipment', 'Answer Do you like swings? with Yes I do'],
    vocabularyWords: ['slide', 'swing', 'seesaw', 'monkey bars']
  },
  {
    key: 'B1_U8_L4', unitKey: 'B1_U8', ageGroupCode: '3-4', topicSlug: 'nature', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'What Can You See in the Sky?', vietnameseTitle: 'Bé thấy gì trên bầu trời?',
    description: 'Gaze at the blue sky, fluffy clouds, and count 8 flowers in the park.',
    objectives: ['Name cloud and sky', 'Count up to 8 natural objects'],
    vocabularyWords: ['cloud', 'sky', 'sun', 'butterfly', 'flower']
  },

  // B1_U9 (Where do we live?)
  {
    key: 'B1_U9_L1', unitKey: 'B1_U9', ageGroupCode: '3-4', topicSlug: 'my-house', order: 1, difficulty: 1, estimatedDuration: 7,
    title: 'My Sweet Home', vietnameseTitle: 'Ngôi nhà thân yêu',
    description: 'Explore house, front door, and sunny windows.',
    objectives: ['Identify house, door, window', 'Say I live in a house'],
    vocabularyWords: ['house', 'door', 'window']
  },
  {
    key: 'B1_U9_L2', unitKey: 'B1_U9', ageGroupCode: '3-4', topicSlug: 'my-house', order: 2, difficulty: 1, estimatedDuration: 7,
    title: 'Neighborhood Places', vietnameseTitle: 'Những nơi quanh nhà',
    description: 'Walk along the street to the green park and playground.',
    objectives: ['Name street, park, playground', 'Say I can see a park near my house'],
    vocabularyWords: ['street', 'park', 'playground', 'house']
  },
  {
    key: 'B1_U9_L3', unitKey: 'B1_U9', ageGroupCode: '3-4', topicSlug: 'my-house', order: 3, difficulty: 1, estimatedDuration: 8,
    title: 'City and Country', vietnameseTitle: 'Thành phố và làng quê',
    description: 'Compare busy city apartment buildings and quiet country farms.',
    objectives: ['Distinguish city and country', 'Identify apartment building and farm'],
    vocabularyWords: ['city', 'country', 'apartment building', 'farm']
  },
  {
    key: 'B1_U9_L4', unitKey: 'B1_U9', ageGroupCode: '3-4', topicSlug: 'my-house', order: 4, difficulty: 1, estimatedDuration: 8,
    title: 'Where Do I Live?', vietnameseTitle: 'Nơi em sinh sống',
    description: 'Visit the local market and toy store, counting 9 to 10 buildings.',
    objectives: ['Name market and toy store', 'Count up to 10 neighborhood places'],
    vocabularyWords: ['market', 'toy store', 'city', 'house']
  },

  // ===================== BOOK 2 — AGE 4–5 =====================
  // B2_U1 (What do you like about school?)
  {
    key: 'B2_U1_L1', unitKey: 'B2_U1', ageGroupCode: '4-5', topicSlug: 'school', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'School Tools', vietnameseTitle: 'Dụng cụ học tập',
    description: 'Explore pencil, marker, paintbrush, glue stick, and scissors.',
    objectives: ['Name tools accurately', 'Say What do you do with a pencil? I draw with a pencil'],
    vocabularyWords: ['pencil', 'marker', 'paintbrush', 'glue stick', 'scissors']
  },
  {
    key: 'B2_U1_L2', unitKey: 'B2_U1', ageGroupCode: '4-5', topicSlug: 'school', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Things We Do at School', vietnameseTitle: 'Những việc em làm ở trường',
    description: 'Engage with paint, draw, color, cut, and glue.',
    objectives: ['Use action verbs in phrases', 'Follow simple classroom instructions'],
    vocabularyWords: ['paint', 'draw', 'color', 'cut', 'glue']
  },
  {
    key: 'B2_U1_L3', unitKey: 'B2_U1', ageGroupCode: '4-5', topicSlug: 'school', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'My Favorite School Activity', vietnameseTitle: 'Hoạt động yêu thích ở trường',
    description: 'Express enjoyment for listen to stories, sing songs, and play with friends.',
    objectives: ['Say I like to listen to stories', 'Express preferences with I like to...'],
    vocabularyWords: ['listen to stories', 'sing songs', 'tidy up', 'eat lunch', 'play with friends']
  },
  {
    key: 'B2_U1_L4', unitKey: 'B2_U1', ageGroupCode: '4-5', topicSlug: 'colors', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'Colors and Counting at School', vietnameseTitle: 'Màu sắc và đếm số ở lớp',
    description: 'Count 1 to 10 pencils and markers in rainbow colors.',
    objectives: ['Count classroom objects from 1 to 10', 'Combine colors and tools in short descriptions'],
    vocabularyWords: ['paint', 'color', 'marker', 'pencil', 'scissors']
  },

  // B2_U2 (How do we take care of ourselves?)
  {
    key: 'B2_U2_L1', unitKey: 'B2_U2', ageGroupCode: '4-5', topicSlug: 'daily-routines', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'Washing and Cleaning', vietnameseTitle: 'Vệ sinh cá nhân sạch sẽ',
    description: 'Learn wash my face, brush my hair, and use soap and towel.',
    objectives: ['Name hygiene supplies', 'Express daily self-care actions'],
    vocabularyWords: ['wash my face', 'brush my hair', 'toothbrush', 'soap', 'towel']
  },
  {
    key: 'B2_U2_L2', unitKey: 'B2_U2', ageGroupCode: '4-5', topicSlug: 'daily-routines', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Healthy Habits', vietnameseTitle: 'Thói quen lành mạnh',
    description: 'Practice eat healthy food, drink water, and jump rope for exercise.',
    objectives: ['Encourage healthy hydration and nutrition', 'Say Drink water when you are thirsty'],
    vocabularyWords: ['eat healthy food', 'drink water', 'put on a jacket', 'brush', 'jump rope']
  },
  {
    key: 'B2_U2_L3', unitKey: 'B2_U2', ageGroupCode: '4-5', topicSlug: 'feelings', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'How Do I Feel?', vietnameseTitle: 'Cảm giác của cơ thể',
    description: 'Express when body feels tired, thirsty, hungry, or sick.',
    objectives: ['State physical needs clearly', 'Answer Are you thirsty? with Yes I am'],
    vocabularyWords: ['tired', 'thirsty', 'dirty', 'hungry', 'sick']
  },
  {
    key: 'B2_U2_L4', unitKey: 'B2_U2', ageGroupCode: '4-5', topicSlug: 'daily-routines', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'Taking Care of Myself', vietnameseTitle: 'Tự chăm sóc bản thân',
    description: 'Count 11 and 12 hygiene objects and review daily healthy routines.',
    objectives: ['Count objects up to 12', 'Consolidate healthy self-care vocabulary'],
    vocabularyWords: ['wash my face', 'jump rope', 'drink water', 'toothbrush', 'towel']
  },

  // B2_U3 (What do we do at home?)
  {
    key: 'B2_U3_L1', unitKey: 'B2_U3', ageGroupCode: '4-5', topicSlug: 'my-house', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'Rooms in My House', vietnameseTitle: 'Các phòng trong nhà',
    description: 'Tour living room, dining room, kitchen, bedroom, and bathroom.',
    objectives: ['Name all main rooms', 'Answer Where is the lamp? It\'s in the living room'],
    vocabularyWords: ['living room', 'dining room', 'kitchen', 'bedroom', 'bathroom']
  },
  {
    key: 'B2_U3_L2', unitKey: 'B2_U3', ageGroupCode: '4-5', topicSlug: 'my-house', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Things at Home', vietnameseTitle: 'Đồ đạc tiện ích',
    description: 'Locate bed, couch, shower, lamp, and fridge.',
    objectives: ['Match furniture items to their rooms', 'Form simple location sentences'],
    vocabularyWords: ['bed', 'couch', 'shower', 'lamp', 'fridge']
  },
  {
    key: 'B2_U3_L3', unitKey: 'B2_U3', ageGroupCode: '4-5', topicSlug: 'my-house', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'What Do We Do at Home?', vietnameseTitle: 'Việc nhà giúp đỡ bố mẹ',
    description: 'Practice cook, sweep the floor, set the table, and make the bed.',
    objectives: ['Express household chores', 'Say I set the table and make the bed'],
    vocabularyWords: ['cook', 'sweep the floor', 'set the table', 'watch TV', 'make the bed']
  },
  {
    key: 'B2_U3_L4', unitKey: 'B2_U3', ageGroupCode: '4-5', topicSlug: 'my-house', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'Where Does It Go?', vietnameseTitle: 'Đồ vật này để ở đâu?',
    description: 'Room sorting game and counting 13 to 15 home objects.',
    objectives: ['Sort items into correct rooms', 'Count items up to 15'],
    vocabularyWords: ['lamp', 'bed', 'couch', 'fridge', 'shower', 'kitchen']
  },

  // B2_U4 (What can we see on a farm?)
  {
    key: 'B2_U4_L1', unitKey: 'B2_U4', ageGroupCode: '4-5', topicSlug: 'animals', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'Farm Animals', vietnameseTitle: 'Động vật nông trại',
    description: 'Meet cow, hen, duck, horse, and sheep.',
    objectives: ['Identify adult farm animals', 'Say What can you see? I can see a cow'],
    vocabularyWords: ['cow', 'hen', 'duck', 'horse', 'sheep']
  },
  {
    key: 'B2_U4_L2', unitKey: 'B2_U4', ageGroupCode: '4-5', topicSlug: 'animals', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Baby Animals', vietnameseTitle: 'Các bạn thú con đáng yêu',
    description: 'Pair cow with calf, sheep with lamb, duck with duckling, hen with chick, and horse with foal.',
    objectives: ['Match adult animals with babies', 'Say A baby duck is a duckling'],
    vocabularyWords: ['calf', 'lamb', 'duckling', 'chick', 'foal']
  },
  {
    key: 'B2_U4_L3', unitKey: 'B2_U4', ageGroupCode: '4-5', topicSlug: 'animals', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'What Animals and Farmers Do', vietnameseTitle: 'Công việc trong nông trại',
    description: 'Learn feed the ducks, milk the cows, groom the horses, and collect the eggs.',
    objectives: ['Understand farm activities', 'Answer Can you feed the ducks? with Yes I can'],
    vocabularyWords: ['feed the ducks', 'milk the cows', 'groom the horses', 'shear the sheep', 'collect the eggs']
  },
  {
    key: 'B2_U4_L4', unitKey: 'B2_U4', ageGroupCode: '4-5', topicSlug: 'animals', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'Life on a Farm', vietnameseTitle: 'Một ngày ở nông trại',
    description: 'Count 16 to 18 eggs and baby animals across the sunny farm.',
    objectives: ['Count up to 18 farm animals', 'Describe farm scenery'],
    vocabularyWords: ['cow', 'horse', 'sheep', 'calf', 'duckling', 'chick']
  },

  // B2_U5 (What do we eat at different time of the day?)
  {
    key: 'B2_U5_L1', unitKey: 'B2_U5', ageGroupCode: '4-5', topicSlug: 'food', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'Breakfast Delights', vietnameseTitle: 'Bữa sáng ngon lành',
    description: 'Enjoy eggs, pancakes, milk, cereal, and orange juice.',
    objectives: ['Name breakfast items', 'Say What do you eat for breakfast? I eat pancakes'],
    vocabularyWords: ['breakfast', 'eggs', 'pancakes', 'milk', 'cereal', 'orange juice']
  },
  {
    key: 'B2_U5_L2', unitKey: 'B2_U5', ageGroupCode: '4-5', topicSlug: 'food', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Lunch and Dinner', vietnameseTitle: 'Bữa trưa và bữa tối',
    description: 'Serve chicken, fresh salad, warm soup, and fluffy rice.',
    objectives: ['Name lunch and dinner dishes', 'Say We eat soup and rice for dinner'],
    vocabularyWords: ['lunch', 'dinner', 'chicken', 'salad', 'soup', 'rice']
  },
  {
    key: 'B2_U5_L3', unitKey: 'B2_U5', ageGroupCode: '4-5', topicSlug: 'food', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'Healthy Treats', vietnameseTitle: 'Món ăn ngon và lành',
    description: 'Taste sweet strawberries, fish, and refreshing water.',
    objectives: ['Identify healthy food choices', 'Say Fresh strawberries are sweet'],
    vocabularyWords: ['strawberries', 'fish', 'water', 'salad', 'chicken']
  },
  {
    key: 'B2_U5_L4', unitKey: 'B2_U5', ageGroupCode: '4-5', topicSlug: 'food', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'My Daily Meals', vietnameseTitle: 'Ba bữa ăn trong ngày',
    description: 'Sequence breakfast, lunch, dinner, and count up to 19 food treats.',
    objectives: ['Sequence meals in a day', 'Count items up to 19'],
    vocabularyWords: ['breakfast', 'lunch', 'dinner', 'eggs', 'rice', 'pancakes']
  },

  // B2_U6 (What different kinds of clothes do we wear?)
  {
    key: 'B2_U6_L1', unitKey: 'B2_U6', ageGroupCode: '4-5', topicSlug: 'clothes', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'My Daily Clothes', vietnameseTitle: 'Quần áo mặc hằng ngày',
    description: 'Name pants, shoes, T-shirt, skirt, sweater, and socks.',
    objectives: ['Name everyday clothing items', 'Say I\'m wearing a yellow T-shirt'],
    vocabularyWords: ['pants', 'shoes', 'T-shirt', 'skirt', 'sweater', 'socks']
  },
  {
    key: 'B2_U6_L2', unitKey: 'B2_U6', ageGroupCode: '4-5', topicSlug: 'clothes', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Outerwear and Shoes', vietnameseTitle: 'Áo khoác và giày ủng',
    description: 'Put on jacket, sturdy boots, waterproof raincoat, and party dress.',
    objectives: ['Identify weather-specific outerwear', 'Say Put on your raincoat'],
    vocabularyWords: ['jacket', 'boots', 'raincoat', 'dress', 'shoes']
  },
  {
    key: 'B2_U6_L3', unitKey: 'B2_U6', ageGroupCode: '4-5', topicSlug: 'weather', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'Weather and Clothes', vietnameseTitle: 'Thời tiết và trang phục',
    description: 'Match sunny, cloudy, rainy, snowy, and windy days with proper clothing.',
    objectives: ['Describe the weather', 'Select matching clothes for different weather conditions'],
    vocabularyWords: ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'raincoat', 'boots']
  },
  {
    key: 'B2_U6_L4', unitKey: 'B2_U6', ageGroupCode: '4-5', topicSlug: 'clothes', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'Clothes and Counting', vietnameseTitle: 'Đếm quần áo xinh',
    description: 'Count up to 20 socks and buttons while dressing up paper dolls.',
    objectives: ['Count clothing items up to 20', 'Describe color and clothing combinations'],
    vocabularyWords: ['T-shirt', 'socks', 'sweater', 'pants', 'shoes']
  },

  // B2_U7 (What can we do with our senses?)
  {
    key: 'B2_U7_L1', unitKey: 'B2_U7', ageGroupCode: '4-5', topicSlug: 'senses', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'My Five Senses', vietnameseTitle: 'Năm giác quan kỳ diệu',
    description: 'Explore see with eyes, touch with hands, hear with ears, smell with nose, and taste with mouth.',
    objectives: ['Name the 5 sensory verbs', 'Pair each sense with its corresponding organ'],
    vocabularyWords: ['see', 'touch', 'hear', 'smell', 'taste']
  },
  {
    key: 'B2_U7_L2', unitKey: 'B2_U7', ageGroupCode: '4-5', topicSlug: 'senses', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'How Does It Feel?', vietnameseTitle: 'Cảm giác chạm sờ',
    description: 'Touch soft cotton, rough bark, and smooth stones.',
    objectives: ['Use texture adjectives (soft, rough, smooth)', 'Describe tactile sensations'],
    vocabularyWords: ['soft', 'rough', 'smooth', 'touch']
  },
  {
    key: 'B2_U7_L3', unitKey: 'B2_U7', ageGroupCode: '4-5', topicSlug: 'senses', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'Smell and Taste', vietnameseTitle: 'Mùi hương và mùi vị',
    description: 'Compare good floral smells, sweet honey, and salty soup.',
    objectives: ['Identify taste and smell descriptors (sweet, salty, good, bad)', 'Say The lemon tastes sour and sweet'],
    vocabularyWords: ['smell', 'taste', 'sweet', 'salty', 'good', 'bad']
  },
  {
    key: 'B2_U7_L4', unitKey: 'B2_U7', ageGroupCode: '4-5', topicSlug: 'senses', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'Sounds and Sights', vietnameseTitle: 'Âm thanh và cảnh sắc',
    description: 'Notice loud drums, quiet whispers, beautiful sights, and count 30 sensory objects.',
    objectives: ['Describe sound volumes (loud, quiet)', 'Count up to 30 objects'],
    vocabularyWords: ['loud', 'quiet', 'beautiful', 'hear', 'see']
  },

  // B2_U8 (How do we get from one place to another?)
  {
    key: 'B2_U8_L1', unitKey: 'B2_U8', ageGroupCode: '4-5', topicSlug: 'transportation', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'Vehicles on the Go', vietnameseTitle: 'Phương tiện giao thông',
    description: 'Ride in car, train, bus, boat, bike, and airplane.',
    objectives: ['Identify common vehicles', 'Say We can go by car or bus'],
    vocabularyWords: ['car', 'train', 'bus', 'airplane', 'boat', 'bike']
  },
  {
    key: 'B2_U8_L2', unitKey: 'B2_U8', ageGroupCode: '4-5', topicSlug: 'transportation', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'Land, Water, and Air', vietnameseTitle: 'Đường bộ, đường thủy, đường hàng không',
    description: 'Sort vehicles by travel realm: helicopter in air, ship on water, bus on land.',
    objectives: ['Categorize vehicles by medium (land, water, air)', 'Say An airplane flies in the air'],
    vocabularyWords: ['air', 'water', 'land', 'helicopter', 'ship']
  },
  {
    key: 'B2_U8_L3', unitKey: 'B2_U8', ageGroupCode: '4-5', topicSlug: 'vacation', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'Where Are We Going?', vietnameseTitle: 'Chúng mình đi đâu thế?',
    description: 'Travel to the beach, amusement park, mountains, and city.',
    objectives: ['Connect destinations with suitable travel modes', 'Say How do we get to the beach?'],
    vocabularyWords: ['beach', 'amusement park', 'mountains', 'city', 'car', 'airplane']
  },
  {
    key: 'B2_U8_L4', unitKey: 'B2_U8', ageGroupCode: '4-5', topicSlug: 'transportation', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'How Do We Get There?', vietnameseTitle: 'Hành trình di chuyển',
    description: 'Plan travel routes and count 40 travel items and vehicles.',
    objectives: ['Explain transportation choices', 'Count up to 40 items'],
    vocabularyWords: ['bus', 'train', 'airplane', 'boat', 'bike', 'land']
  },

  // B2_U9 (What do plants need to grow?)
  {
    key: 'B2_U9_L1', unitKey: 'B2_U9', ageGroupCode: '4-5', topicSlug: 'nature', order: 1, difficulty: 2, estimatedDuration: 9,
    title: 'Parts of a Plant', vietnameseTitle: 'Các bộ phận của cây',
    description: 'Observe colorful petals, green leaves, strong stem, and underground roots.',
    objectives: ['Name anatomical plant parts', 'Identify leaves, petals, stem, roots'],
    vocabularyWords: ['petals', 'leaves', 'stem', 'roots', 'plant']
  },
  {
    key: 'B2_U9_L2', unitKey: 'B2_U9', ageGroupCode: '4-5', topicSlug: 'nature', order: 2, difficulty: 2, estimatedDuration: 9,
    title: 'What Plants Need', vietnameseTitle: 'Cây cần gì để lớn?',
    description: 'Learn that plants need sun, rich soil, fresh water, and clean air.',
    objectives: ['State plant growth requirements', 'Say Plants need sun, soil, water, and air'],
    vocabularyWords: ['plant', 'sun', 'soil', 'water', 'air']
  },
  {
    key: 'B2_U9_L3', unitKey: 'B2_U9', ageGroupCode: '4-5', topicSlug: 'nature', order: 3, difficulty: 2, estimatedDuration: 9,
    title: 'Planting a Seed', vietnameseTitle: 'Gieo hạt mầm nhỏ',
    description: 'Use a shovel to dig a hole, drop the seed, and pour water with a watering can.',
    objectives: ['Name gardening tools', 'Follow sequential planting steps'],
    vocabularyWords: ['seed', 'shovel', 'hole', 'watering can']
  },
  {
    key: 'B2_U9_L4', unitKey: 'B2_U9', ageGroupCode: '4-5', topicSlug: 'nature', order: 4, difficulty: 2, estimatedDuration: 9,
    title: 'How Plants Grow', vietnameseTitle: 'Quá trình lớn lên của cây',
    description: 'Follow the life cycle of a seed into a flower, counting 50 tiny seeds and petals.',
    objectives: ['Sequence plant germination', 'Count up to 50 items'],
    vocabularyWords: ['seed', 'soil', 'water', 'plant', 'leaves', 'petals']
  },

  // ===================== BOOK 3 — AGE 5–6 =====================
  // B3_U1 (What do we do at school?)
  {
    key: 'B3_U1_L1', unitKey: 'B3_U1', ageGroupCode: '5-6', topicSlug: 'school', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Days at School', vietnameseTitle: 'Các ngày đi học trong tuần',
    description: 'Learn Monday, Tuesday, Wednesday, Thursday, and Friday.',
    objectives: ['Recite weekdays in sequence', 'Answer What do we do on Monday?'],
    vocabularyWords: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    key: 'B3_U1_L2', unitKey: 'B3_U1', ageGroupCode: '5-6', topicSlug: 'school', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'School Subjects', vietnameseTitle: 'Các môn học thú vị',
    description: 'Discover Science, Art, Math, Writing, Reading, and Physical Education.',
    objectives: ['Identify school subjects', 'Express favorite subjects with reasons'],
    vocabularyWords: ['Science', 'Art', 'Math', 'Writing', 'Reading', 'Physical Education']
  },
  {
    key: 'B3_U1_L3', unitKey: 'B3_U1', ageGroupCode: '5-6', topicSlug: 'school', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'What Do We Do at School?', vietnameseTitle: 'Hoạt động học tập đa dạng',
    description: 'Use a computer, play music, speak English, and paint with watercolors.',
    objectives: ['Use verb phrases describing school activities', 'Say I like to speak English and play music'],
    vocabularyWords: ['use a computer', 'play music', 'speak English', 'paint with watercolors']
  },
  {
    key: 'B3_U1_L4', unitKey: 'B3_U1', ageGroupCode: '5-6', topicSlug: 'school', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'My School Day Schedule', vietnameseTitle: 'Thời khóa biểu của em',
    description: 'Read books, play in the playground, and count 1 to 20 school items.',
    objectives: ['Talk about school schedules', 'Count up to 20 objects'],
    vocabularyWords: ['read books', 'play in the playground', 'speak English', 'Math', 'Science']
  },

  // B3_U2 (How can we show our feelings?)
  {
    key: 'B3_U2_L1', unitKey: 'B3_U2', ageGroupCode: '5-6', topicSlug: 'feelings', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Expressing Feelings', vietnameseTitle: 'Bộc lộ cảm xúc',
    description: 'Recognize when friends feel shy, silly, scared, excited, surprised, or bored.',
    objectives: ['Identify complex emotions', 'Describe emotional facial expressions and body language'],
    vocabularyWords: ['shy', 'silly', 'scared', 'excited', 'surprised', 'bored']
  },
  {
    key: 'B3_U2_L2', unitKey: 'B3_U2', ageGroupCode: '5-6', topicSlug: 'feelings', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'How Do I Show Feelings?', vietnameseTitle: 'Hành động khi có cảm xúc',
    description: 'Explore scream, jump up and down, shout hooray, yawn, cry, and laugh.',
    objectives: ['Connect emotions to actions: excited -> jump up and down', 'Say When I am excited, I shout hooray'],
    vocabularyWords: ['scream', 'jump up and down', 'shout hooray', 'yawn', 'cry', 'laugh']
  },
  {
    key: 'B3_U2_L3', unitKey: 'B3_U2', ageGroupCode: '5-6', topicSlug: 'feelings', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'A Joyful Birthday Party', vietnameseTitle: 'Bữa tiệc sinh nhật vui vẻ',
    description: 'Celebrate with candy, cake, candle, balloon, present, and party hat.',
    objectives: ['Name party celebration items', 'Explain Why is he surprised? Because he got a present'],
    vocabularyWords: ['candy', 'cake', 'candle', 'balloon', 'present', 'party hat']
  },
  {
    key: 'B3_U2_L4', unitKey: 'B3_U2', ageGroupCode: '5-6', topicSlug: 'feelings', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'Feelings and Friendship', vietnameseTitle: 'Cảm xúc và tình bạn',
    description: 'Practice empathy and caring for friends, counting up to 30 balloons and candles.',
    objectives: ['Demonstrate social-emotional empathy', 'Count up to 30 objects'],
    vocabularyWords: ['excited', 'surprised', 'laugh', 'shout hooray', 'present', 'party hat']
  },

  // B3_U3 (How are we the same or different?)
  {
    key: 'B3_U3_L1', unitKey: 'B3_U3', ageGroupCode: '5-6', topicSlug: 'family', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'People Around Us', vietnameseTitle: 'Mọi người quanh em',
    description: 'Learn child, children, woman, women, man, and men.',
    objectives: ['Use singular and plural nouns for people (child/children, man/men, woman/women)', 'Describe groups of people'],
    vocabularyWords: ['child', 'children', 'woman', 'women', 'man', 'men']
  },
  {
    key: 'B3_U3_L2', unitKey: 'B3_U3', ageGroupCode: '5-6', topicSlug: 'my-body', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'Hair and Physical Appearance', vietnameseTitle: 'Mái tóc và ngoại hình',
    description: 'Describe hair: blond, red, long, curly, straight, and bodies: tall, short, thin.',
    objectives: ['Describe hair styles and colors', 'Say She has long curly hair'],
    vocabularyWords: ['blond', 'red', 'long', 'curly', 'straight', 'tall', 'short', 'thin']
  },
  {
    key: 'B3_U3_L3', unitKey: 'B3_U3', ageGroupCode: '5-6', topicSlug: 'family', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'Extended Family Members', vietnameseTitle: 'Họ hàng thân yêu',
    description: 'Introduce aunt, cousin, and uncle.',
    objectives: ['Identify extended family kinships', 'Introduce aunt, uncle, cousin with descriptors'],
    vocabularyWords: ['aunt', 'cousin', 'uncle', 'child', 'family']
  },
  {
    key: 'B3_U3_L4', unitKey: 'B3_U3', ageGroupCode: '5-6', topicSlug: 'family', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'Same or Different?', vietnameseTitle: 'Chúng mình giống và khác nhau',
    description: 'Celebrate diversity and count up to 40 people and portraits in the gallery.',
    objectives: ['Form comparative statements about appearance', 'Count up to 40 items'],
    vocabularyWords: ['blond', 'curly', 'straight', 'tall', 'short', 'cousin']
  },

  // B3_U4 (What is a wild animal?)
  {
    key: 'B3_U4_L1', unitKey: 'B3_U4', ageGroupCode: '5-6', topicSlug: 'animals', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Wild Animals of the Savanna', vietnameseTitle: 'Động vật đồng cỏ hoang dã',
    description: 'Meet monkey, lion, giraffe, tiger, bear, and elephant.',
    objectives: ['Name majestic wild animals', 'Say An elephant is a wild animal with a long trunk'],
    vocabularyWords: ['monkey', 'lion', 'giraffe', 'tiger', 'bear', 'elephant']
  },
  {
    key: 'B3_U4_L2', unitKey: 'B3_U4', ageGroupCode: '5-6', topicSlug: 'animals', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'Animals of Sky and Ocean', vietnameseTitle: 'Muôn loài trên trời và dưới biển',
    description: 'Discover snake, whale, eagle, shark, kangaroo, and toucan.',
    objectives: ['Name marine, aerial, and jungle animals', 'Describe animal habitats'],
    vocabularyWords: ['snake', 'whale', 'eagle', 'shark', 'kangaroo', 'toucan']
  },
  {
    key: 'B3_U4_L3', unitKey: 'B3_U4', ageGroupCode: '5-6', topicSlug: 'animals', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'Animal Body Parts', vietnameseTitle: 'Bộ phận đặc biệt của loài vật',
    description: 'Identify paw, fin, beak, trunk, tail, and wing.',
    objectives: ['Link body parts to species: eagle has wings, shark has fins', 'Say Eagles have sharp beaks and strong wings'],
    vocabularyWords: ['paw', 'fin', 'beak', 'trunk', 'tail', 'wing']
  },
  {
    key: 'B3_U4_L4', unitKey: 'B3_U4', ageGroupCode: '5-6', topicSlug: 'animals', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'Describe an Animal', vietnameseTitle: 'Miêu tả con vật',
    description: 'Create multi-sentence animal riddles and count 50 safari animals.',
    objectives: ['Construct descriptive animal paragraphs', 'Count up to 50 items'],
    vocabularyWords: ['elephant', 'eagle', 'shark', 'trunk', 'wing', 'fin', 'lion']
  },

  // B3_U5 (Who works in our community?)
  {
    key: 'B3_U5_L1', unitKey: 'B3_U5', ageGroupCode: '5-6', topicSlug: 'community', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Community Helpers', vietnameseTitle: 'Những người giúp đỡ cộng đồng',
    description: 'Meet firefighter, doctor, chef, police officer, mail carrier, and cashier.',
    objectives: ['Identify key professions', 'Say Who works in our community?'],
    vocabularyWords: ['firefighter', 'doctor', 'chef', 'police officer', 'mail carrier', 'cashier']
  },
  {
    key: 'B3_U5_L2', unitKey: 'B3_U5', ageGroupCode: '5-6', topicSlug: 'community', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'Jobs and Workplaces', vietnameseTitle: 'Nghề nghiệp và nơi làm việc',
    description: 'Connect professions with fire station, hospital, restaurant, post office, police station, and grocery store.',
    objectives: ['Match helpers with workplaces: doctor works at hospital', 'Form complex location sentences'],
    vocabularyWords: ['fire station', 'hospital', 'restaurant', 'post office', 'police station', 'grocery store']
  },
  {
    key: 'B3_U5_L3', unitKey: 'B3_U5', ageGroupCode: '5-6', topicSlug: 'community', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'What Do Helpers Do?', vietnameseTitle: 'Công việc của các cô chú',
    description: 'Practice put out fires, take care of people, cook food, keep people safe, deliver mail, and ring up groceries.',
    objectives: ['Describe helper responsibilities with verb phrases', 'Say A firefighter puts out fires'],
    vocabularyWords: ['put out fires', 'take care of people', 'cook food', 'keep people safe', 'deliver mail', 'ring up groceries']
  },
  {
    key: 'B3_U5_L4', unitKey: 'B3_U5', ageGroupCode: '5-6', topicSlug: 'community', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'What Do I Want to Be?', vietnameseTitle: 'Ước mơ của em',
    description: 'Share career dreams and count up to 60 community badges and letters.',
    objectives: ['Express future career aspirations: I want to be a chef', 'Count up to 60 items'],
    vocabularyWords: ['firefighter', 'doctor', 'chef', 'police officer', 'hospital', 'restaurant']
  },

  // B3_U6 (Why are restaurants special?)
  {
    key: 'B3_U6_L1', unitKey: 'B3_U6', ageGroupCode: '5-6', topicSlug: 'food', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'At the Restaurant', vietnameseTitle: 'Tại nhà hàng',
    description: 'Learn waiter, menu, drink, main dish, side dish, and dessert.',
    objectives: ['Understand restaurant meal categories', 'Say May I have the menu please?'],
    vocabularyWords: ['waiter', 'menu', 'drink', 'main dish', 'side dish', 'dessert']
  },
  {
    key: 'B3_U6_L2', unitKey: 'B3_U6', ageGroupCode: '5-6', topicSlug: 'food', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'Food on the Menu', vietnameseTitle: 'Món ngon trong thực đơn',
    description: 'Order steak, beans, lemonade, rice, soda, and French fries.',
    objectives: ['Identify meal components', 'Say I would like spaghetti and lemonade for my meal'],
    vocabularyWords: ['steak', 'beans', 'lemonade', 'rice', 'soda', 'French fries']
  },
  {
    key: 'B3_U6_L3', unitKey: 'B3_U6', ageGroupCode: '5-6', topicSlug: 'food', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'Favorites and Sweet Desserts', vietnameseTitle: 'Món ăn yêu thích & tráng miệng',
    description: 'Taste spaghetti, pizza, ice cream, chocolate cake, vegetables, and cheeseburger.',
    objectives: ['Describe delicious tastes and textures', 'Say For dessert, I love chocolate cake'],
    vocabularyWords: ['spaghetti', 'pizza', 'ice cream', 'chocolate cake', 'vegetables', 'cheeseburger']
  },
  {
    key: 'B3_U6_L4', unitKey: 'B3_U6', ageGroupCode: '5-6', topicSlug: 'food', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'Ordering Food Like a Pro', vietnameseTitle: 'Tập gọi món lịch sự',
    description: 'Role-play ordering meals with polite etiquette, counting up to 70 food items.',
    objectives: ['Practice polite restaurant conversation', 'Count up to 70 items'],
    vocabularyWords: ['menu', 'drink', 'main dish', 'dessert', 'waiter', 'pizza', 'ice cream']
  },

  // B3_U7 (What does a routine look like?)
  {
    key: 'B3_U7_L1', unitKey: 'B3_U7', ageGroupCode: '5-6', topicSlug: 'daily-routines', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Morning Routine', vietnameseTitle: 'Thói quen buổi sáng',
    description: 'Practice get up, get dressed, have breakfast, and go to school.',
    objectives: ['Sequence morning activities chronologically', 'Say First, I get up and get dressed'],
    vocabularyWords: ['get up', 'get dressed', 'have breakfast', 'go to school']
  },
  {
    key: 'B3_U7_L2', unitKey: 'B3_U7', ageGroupCode: '5-6', topicSlug: 'daily-routines', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'After School Activities', vietnameseTitle: 'Hoạt động sau giờ học',
    description: 'Explore go home, do homework, dance class, soccer practice, music lessons, swimming lessons, and gymnastics.',
    objectives: ['Describe extracurricular activities', 'Say After school, I go to soccer practice'],
    vocabularyWords: ['go home', 'do homework', 'soccer practice', 'dance class', 'music lessons', 'swimming lessons', 'gymnastics']
  },
  {
    key: 'B3_U7_L3', unitKey: 'B3_U7', ageGroupCode: '5-6', topicSlug: 'daily-routines', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'Evening Routine', vietnameseTitle: 'Thói quen buổi tối',
    description: 'Wind down with eat dinner, take a bath, brush teeth, put on pajamas, read a book, and go to bed.',
    objectives: ['Sequence bedtime rituals', 'Say At night, I brush my teeth and go to bed'],
    vocabularyWords: ['eat dinner', 'take a bath', 'brush teeth', 'put on pajamas', 'read a book', 'go to bed']
  },
  {
    key: 'B3_U7_L4', unitKey: 'B3_U7', ageGroupCode: '5-6', topicSlug: 'daily-routines', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'My 24-Hour Schedule', vietnameseTitle: 'Thời gian biểu 24 giờ',
    description: 'Narrate a full day using transition words and count up to 80 clock ticks.',
    objectives: ['Narrate an entire daily routine with sequential time words', 'Count up to 80 items'],
    vocabularyWords: ['get up', 'have breakfast', 'do homework', 'read a book', 'go to bed']
  },

  // B3_U8 (How can we care for the Earth?)
  {
    key: 'B3_U8_L1', unitKey: 'B3_U8', ageGroupCode: '5-6', topicSlug: 'environment', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Natural or Human-made?', vietnameseTitle: 'Tự nhiên hay nhân tạo?',
    description: 'Classify frog, rock as natural and paper, spoon, jar as human-made.',
    objectives: ['Differentiate natural materials from human-made objects', 'Explain Why is rock natural?'],
    vocabularyWords: ['natural', 'human-made', 'frog', 'rock', 'paper', 'spoon', 'jar']
  },
  {
    key: 'B3_U8_L2', unitKey: 'B3_U8', ageGroupCode: '5-6', topicSlug: 'environment', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'Recycling Materials', vietnameseTitle: 'Các loại rác tái chế',
    description: 'Sort plastic bottle, cardboard box, soda can, newspaper, and glass bottle.',
    objectives: ['Identify recyclable materials (plastic, glass, paper, metal)', 'Say We can recycle plastic bottles'],
    vocabularyWords: ['plastic bottle', 'cardboard box', 'soda can', 'newspaper', 'glass bottle']
  },
  {
    key: 'B3_U8_L3', unitKey: 'B3_U8', ageGroupCode: '5-6', topicSlug: 'environment', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'How Can We Help Earth?', vietnameseTitle: 'Bé chung tay giúp Trái Đất',
    description: 'Replace plastic bag with cloth bag and separate trash properly.',
    objectives: ['Promote reusable cloth bags and waste reduction', 'Say Use cloth bags instead of plastic bags'],
    vocabularyWords: ['plastic bag', 'cloth bag', 'recycle', 'trash']
  },
  {
    key: 'B3_U8_L4', unitKey: 'B3_U8', ageGroupCode: '5-6', topicSlug: 'environment', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'Save Water and Energy', vietnameseTitle: 'Tiết kiệm nước và điện năng',
    description: 'Practice turn on and turn off water and electricity, counting up to 90 recyclable items.',
    objectives: ['Express conservation actions: Turn off lights', 'Count up to 90 items'],
    vocabularyWords: ['turn on', 'turn off', 'recycle', 'paper', 'plastic bottle', 'natural']
  },

  // B3_U9 (What do we do on vacation?)
  {
    key: 'B3_U9_L1', unitKey: 'B3_U9', ageGroupCode: '5-6', topicSlug: 'vacation', order: 1, difficulty: 3, estimatedDuration: 10,
    title: 'Vacation Places', vietnameseTitle: 'Những địa điểm du lịch',
    description: 'Travel to beach, mountains, forest, amusement park, lake, and summer camp.',
    objectives: ['Name scenic vacation destinations', 'Say We go to the mountains to hike'],
    vocabularyWords: ['beach', 'mountains', 'forest', 'amusement park', 'lake', 'summer camp']
  },
  {
    key: 'B3_U9_L2', unitKey: 'B3_U9', ageGroupCode: '5-6', topicSlug: 'vacation', order: 2, difficulty: 3, estimatedDuration: 10,
    title: 'Things to Pack', vietnameseTitle: 'Hành trang lên đường',
    description: 'Pack towel, flashlight, sleeping bag, sunglasses, cap, and backpack.',
    objectives: ['Identify camping and travel gear', 'Say On the beach, I wear sunglasses'],
    vocabularyWords: ['towel', 'flashlight', 'sleeping bag', 'sunglasses', 'cap', 'backpack']
  },
  {
    key: 'B3_U9_L3', unitKey: 'B3_U9', ageGroupCode: '5-6', topicSlug: 'vacation', order: 3, difficulty: 3, estimatedDuration: 10,
    title: 'Exciting Vacation Activities', vietnameseTitle: 'Hoạt động vui chơi kỳ nghỉ',
    description: 'Experience build a sandcastle, hike, make a campfire, go on rides, row a boat, and ride a horse.',
    objectives: ['Describe outdoor adventures with action phrases', 'Say We hike and make a campfire'],
    vocabularyWords: ['build a sandcastle', 'hike', 'make a campfire', 'go on rides', 'row a boat', 'ride a horse']
  },
  {
    key: 'B3_U9_L4', unitKey: 'B3_U9', ageGroupCode: '5-6', topicSlug: 'vacation', order: 4, difficulty: 3, estimatedDuration: 10,
    title: 'My Vacation Story', vietnameseTitle: 'Kể chuyện chuyến đi của em',
    description: 'Share stories of vacations and count up to 100 seashells, stars, and campsite pebbles.',
    objectives: ['Storytell a vacation memory using past and present phrases', 'Count up to 100 milestone numbers'],
    vocabularyWords: ['beach', 'mountains', 'hike', 'make a campfire', 'build a sandcastle', 'backpack']
  }
];

module.exports = {
  LESSONS_DATA
};
