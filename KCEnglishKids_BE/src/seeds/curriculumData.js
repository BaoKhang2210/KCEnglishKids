/**
 * Official Curriculum Data: 3 Books & 27 Units
 * Source Type: OFFICIAL_CURRICULUM
 * 100% Extracted from Official Textbook Specifications
 */

const AGE_GROUPS_DATA = [
  {
    code: '3-4',
    name: 'Age 3–4 (Book 1)',
    vietnameseName: 'Lớp Mầm (3–4 tuổi)',
    description: 'Single words, large recognition cards, audio-first learning, 2-3 choices',
    targetAgeMin: 3,
    targetAgeMax: 4,
    maxChoicesPerQuestion: 3,
    defaultQuestionCount: 4
  },
  {
    code: '4-5',
    name: 'Age 4–5 (Book 2)',
    vietnameseName: 'Lớp Chồi (4–5 tuổi)',
    description: 'Short phrases, simple matching, everyday descriptions, 3-4 choices',
    targetAgeMin: 4,
    targetAgeMax: 5,
    maxChoicesPerQuestion: 4,
    defaultQuestionCount: 5
  },
  {
    code: '5-6',
    name: 'Age 5–6 (Book 3)',
    vietnameseName: 'Lớp Lá (5–6 tuổi)',
    description: 'Conversational sentences, questions & answers, opinions, reasoning',
    targetAgeMin: 5,
    targetAgeMax: 6,
    maxChoicesPerQuestion: 4,
    defaultQuestionCount: 6
  }
];

const BOOKS_DATA = [
  {
    bookNumber: 1,
    title: 'Book 1',
    ageGroupCode: '3-4',
    description: 'Foundational English curriculum for learners aged 3–4 (9 Units)',
    totalUnits: 9
  },
  {
    bookNumber: 2,
    title: 'Book 2',
    ageGroupCode: '4-5',
    description: 'Expanding English communication curriculum for learners aged 4–5 (9 Units)',
    totalUnits: 9
  },
  {
    bookNumber: 3,
    title: 'Book 3',
    ageGroupCode: '5-6',
    description: 'Advanced conversational & literacy English curriculum for learners aged 5–6 (9 Units)',
    totalUnits: 9
  }
];

const UNITS_DATA = [
  // ===================== BOOK 1 — AGE 3–4 (MẦM) =====================
  {
    key: 'B1_U1',
    bookNumber: 1,
    unitNumber: 1,
    ageGroupCode: '3-4',
    bigQuestion: 'What can we see at school?',
    storyTitle: 'What Can You See?',
    values: 'Keeping Our Classroom Clean',
    concept: 'open, closed',
    oracy: 'Responding Appropriately: Hello! How are you today? I\'m fine, thank you. Goodbye.',
    crossCurricular: 'Social Studies: What are the rules in the classroom?',
    numeracy: 'Number 1',
    project: 'School Collage',
    vocabularyReferences: ['teacher', 'boy', 'girl', 'school', 'sun', 'tree', 'book', 'crayon', 'chair', 'table', 'Leo', 'Tickles', 'Dad', 'Mom', 'Mia'],
    languagePatterns: [
      'What can you see?',
      'I can see a boy.',
      'Is it a book?',
      'Yes, it is.',
      'No, it isn\'t.',
      'What is it?',
      'It\'s a book.',
      'What\'s your name?',
      'My name is...',
      'What\'s his/her name?',
      'His/Her name is...'
    ]
  },
  {
    key: 'B1_U2',
    bookNumber: 1,
    unitNumber: 2,
    ageGroupCode: '3-4',
    bigQuestion: 'What do we look like?',
    storyTitle: 'Can You Find Me?',
    values: 'Respecting Differences',
    concept: 'red',
    oracy: 'Understanding Body Language: How do you feel? I feel sad.',
    crossCurricular: 'Science: What do twins look like?',
    numeracy: 'Number 2',
    project: 'Self-portrait Puppets',
    vocabularyReferences: ['face', 'hair', 'eyes', 'nose', 'forehead', 'mouth', 'ears', 'cheeks', 'happy', 'sad', 'angry'],
    languagePatterns: [
      'This is my nose.',
      'These are my eyes.',
      'How do you feel?',
      'Are you sad?',
      'Are you happy?',
      'Are you angry?',
      'Yes, I am.',
      'No, I\'m not.',
      'Yes, s/he is.',
      'No, s/he isn\'t.'
    ]
  },
  {
    key: 'B1_U3',
    bookNumber: 1,
    unitNumber: 3,
    ageGroupCode: '3-4',
    bigQuestion: 'What can our bodies do?',
    storyTitle: 'The Coconut Band',
    values: 'Washing Our Hands with Soap',
    concept: 'blue',
    oracy: 'Waiting for Your Turn: May I go to the bathroom? May I wash my hands? Yes, you may.',
    crossCurricular: 'Art: Can we make art with our bodies?',
    numeracy: 'Number 3',
    project: 'I Can Mobile',
    vocabularyReferences: ['arms', 'hands', 'legs', 'feet', 'fingers', 'head', 'elbow', 'knee', 'run', 'dance', 'crawl', 'kick'],
    languagePatterns: [
      'I have a head.',
      'I have two knees.',
      'S/he has a head.',
      'S/he has two feet.',
      'Can she dance?',
      'Yes, s/he can.',
      'No, s/he can\'t.',
      'S/he can crawl.',
      'Can you run?',
      'Yes, I can.',
      'No, I can\'t.'
    ]
  },
  {
    key: 'B1_U4',
    bookNumber: 1,
    unitNumber: 4,
    ageGroupCode: '3-4',
    bigQuestion: 'What is a family?',
    storyTitle: 'The Noisy House',
    values: 'Helping Our Family',
    concept: 'yellow',
    oracy: 'Asking Questions: What\'s your mother\'s name? My mother\'s name is Kim.',
    crossCurricular: 'Science: Do animals have families?',
    numeracy: 'Number 4',
    project: 'My Family Picture Frame',
    vocabularyReferences: ['father', 'mother', 'sister', 'brother', 'grandfather', 'grandmother', 'baby', 'young', 'old', 'short', 'tall'],
    languagePatterns: [
      'What is a family?',
      'Is this a family?',
      'Is he the father?',
      'Is she the grandmother?',
      'Yes, s/he is.',
      'No, s/he isn\'t.',
      'What does s/he look like?',
      'S/he\'s tall.',
      'Is the sister old?',
      'Yes.',
      'No.',
      'My mother is tall.',
      'My brother is young.'
    ]
  },
  {
    key: 'B1_U5',
    bookNumber: 1,
    unitNumber: 5,
    ageGroupCode: '3-4',
    bigQuestion: 'What is a pet?',
    storyTitle: 'Maisie\'s Pets',
    values: 'Taking Care of Our Pets',
    concept: 'big, small',
    oracy: 'Projecting Your Voice: We are birds! (Chirp, chirp, chirp.)',
    crossCurricular: 'Science: Are all animals pets?',
    numeracy: 'Number 5',
    project: 'Pet Rocks',
    vocabularyReferences: ['dog', 'bird', 'rabbit', 'fish', 'turtle', 'cat', 'hamster', 'lizard', 'walk', 'jump', 'swim', 'fly'],
    languagePatterns: [
      'How many birds can you see?',
      'I can see two birds.',
      'Can cats walk?',
      'Yes, they can.',
      'No, they can\'t.',
      'Cats can walk.',
      'Cats can\'t fly.'
    ]
  },
  {
    key: 'B1_U6',
    bookNumber: 1,
    unitNumber: 6,
    ageGroupCode: '3-4',
    bigQuestion: 'Can healthy foods be delicious?',
    storyTitle: 'Healthy Hannah',
    values: 'Washing Fruit and Vegetables',
    concept: 'circle',
    oracy: 'Expressing and Respecting Opinions: Do you like apples? Yes, I do. No, I don\'t. I like pears.',
    crossCurricular: 'Science: What does an apple tree need to grow?',
    numeracy: 'Number 6',
    project: 'Healthy Foods Brochure',
    vocabularyReferences: ['apple', 'pear', 'tomato', 'carrot', 'bananas', 'grapes', 'cucumbers', 'lettuce', 'pineapple', 'orange', 'potato', 'peas'],
    languagePatterns: [
      'Which foods do you like?',
      'I like bananas.',
      'What does s/he have?',
      'S/he has an apple.',
      'What do you have?',
      'I have an orange.'
    ]
  },
  {
    key: 'B1_U7',
    bookNumber: 1,
    unitNumber: 7,
    ageGroupCode: '3-4',
    bigQuestion: 'What is a toy?',
    storyTitle: 'A Little Teddy Bear',
    values: 'Sharing Our Toys',
    concept: 'square',
    oracy: 'Responding Appropriately: I want a teddy bear, please. Here you are. Thank you.',
    crossCurricular: 'Math: Can you match the toys?',
    numeracy: 'Number 7',
    project: 'A Teddy Bear Figure',
    vocabularyReferences: ['car', 'teddy bear', 'doll', 'ball', 'kite', 'tricycle', 'blocks', 'yo-yo', 'train', 'puzzle', 'board game', 'robot'],
    languagePatterns: [
      'What color is the ball?',
      'The ball is red.',
      'It\'s red.',
      'Is it big?',
      'Is it small?',
      'Is it red / blue / yellow?',
      'Yes, it is.',
      'No, it isn\'t.',
      'The ball is small and blue.'
    ]
  },
  {
    key: 'B1_U8',
    bookNumber: 1,
    unitNumber: 8,
    ageGroupCode: '3-4',
    bigQuestion: 'What can we see in a park?',
    storyTitle: 'Let\'s Play Together',
    values: 'Keep Parks Clean',
    concept: 'triangle',
    oracy: 'Asking Questions: What color is it? It\'s red. What does a tree look like? It\'s big.',
    crossCurricular: 'Science: What can you see in a park?',
    numeracy: 'Number 8',
    project: 'Pop-up Park',
    vocabularyReferences: ['tree', 'flower', 'grass', 'bee', 'slide', 'swing', 'seesaw', 'monkey bars', 'sun', 'cloud', 'sky', 'butterfly'],
    languagePatterns: [
      'Do you like to play on the swings?',
      'Yes, I do.',
      'No, I don\'t.',
      'What can you see?',
      'I can see a butterfly.',
      'I can see some clouds.'
    ]
  },
  {
    key: 'B1_U9',
    bookNumber: 1,
    unitNumber: 9,
    ageGroupCode: '3-4',
    bigQuestion: 'Where do we live?',
    storyTitle: 'There Is a Woman Who Lives in an Orange Shoe',
    values: 'How can you show you love someone?',
    concept: 'near, far',
    oracy: 'Making Suggestions: I want to run. Let\'s go to the park!',
    crossCurricular: 'Social Studies: What can we see in the city and in the country?',
    numeracy: 'Numbers 9 and 10',
    project: 'Where I Live Collage',
    vocabularyReferences: ['city', 'country', 'house', 'farm', 'apartment building', 'door', 'window', 'street', 'park', 'playground', 'market', 'toy store'],
    languagePatterns: [
      'Where does s/he live?',
      'S/he lives in a house.',
      'S/he lives in an apartment building.',
      'Where do you live?',
      'I live in a house.',
      'What can you see near your house?',
      'I can see a park near my house.'
    ]
  },

  // ===================== BOOK 2 — AGE 4–5 (CHỒI) =====================
  {
    key: 'B2_U1',
    bookNumber: 2,
    unitNumber: 1,
    ageGroupCode: '4-5',
    bigQuestion: 'What do you like about school?',
    storyTitle: 'My Favorite Thing',
    values: 'Tidying Up Our Classroom',
    concept: 'red, blue, yellow, green, orange, purple',
    oracy: 'Responding Appropriately: May I get some paper, please. Yes, you may.',
    crossCurricular: 'Art: Which are the primary colors?',
    numeracy: 'Numbers 1-10',
    project: 'What I Like at School Mural',
    vocabularyReferences: ['paint', 'draw', 'color', 'cut', 'glue', 'pencil', 'marker', 'paintbrush', 'glue stick', 'scissors', 'listen to stories', 'sing songs', 'tidy up', 'eat lunch', 'play with friends'],
    languagePatterns: [
      'What is it?',
      'It\'s a pencil.',
      'What do you do with a pencil?',
      'I draw with a pencil.',
      'What do you like to do?',
      'I like to listen to stories.'
    ]
  },
  {
    key: 'B2_U2',
    bookNumber: 2,
    unitNumber: 2,
    ageGroupCode: '4-5',
    bigQuestion: 'How do we take care of ourselves?',
    storyTitle: 'Good Job, Oliver!',
    values: 'Taking Care of Ourselves',
    concept: 'circle, square, rectangle, star',
    oracy: 'Body Language: What\'s the matter? I\'m thirsty. You need to drink water.',
    crossCurricular: 'Science: What does healthy food look like?',
    numeracy: 'Numbers 11 and 12',
    project: 'We Take Care of Ourselves Posters',
    vocabularyReferences: ['wash my face', 'brush my hair', 'eat healthy food', 'put on a jacket', 'drink water', 'toothbrush', 'brush', 'soap', 'towel', 'jump rope', 'tired', 'thirsty', 'dirty', 'hungry', 'sick'],
    languagePatterns: [
      'He takes care of himself.',
      'She washes her hands with soap.',
      'What can you do to take care of yourself?',
      'I can eat healthy food.'
    ]
  },
  {
    key: 'B2_U3',
    bookNumber: 2,
    unitNumber: 3,
    ageGroupCode: '4-5',
    bigQuestion: 'What do we do at home?',
    storyTitle: 'A Fun Game',
    values: 'Helping at Home',
    concept: 'in, on, under',
    oracy: 'Asking Questions for Information: Where are you? I\'m in the bedroom.',
    crossCurricular: 'Social Studies: What do you do at home during the day and at night?',
    numeracy: 'Numbers 13, 14, 15',
    project: 'My Open House',
    vocabularyReferences: ['living room', 'dining room', 'kitchen', 'bedroom', 'bathroom', 'bed', 'couch', 'shower', 'lamp', 'fridge', 'cook', 'sweep the floor', 'set the table', 'watch TV', 'make the bed'],
    languagePatterns: [
      'What\'s this?',
      'It\'s a bed.',
      'Where does it go? In the bedroom.',
      'The bed goes in the bedroom.',
      'Who\'s this? What is she doing?',
      'She\'s cooking.',
      'The father\'s cooking.',
      'The mother\'s making the bed.'
    ]
  },
  {
    key: 'B2_U4',
    bookNumber: 2,
    unitNumber: 4,
    ageGroupCode: '4-5',
    bigQuestion: 'What can we see on a farm?',
    storyTitle: 'The Little Red Hen',
    values: 'Working Hard on a Farm',
    concept: 'sequences',
    oracy: 'Projecting Your Voice: What does a cow say? Moo, moo.',
    crossCurricular: 'Science: What food do we get from animals?',
    numeracy: 'Numbers 16, 17, 18',
    project: 'Chicken Painting',
    vocabularyReferences: ['cow', 'hen', 'duck', 'horse', 'sheep', 'feed the ducks', 'milk the cows', 'groom the horses', 'shear the sheep', 'collect the eggs', 'calf', 'lamb', 'duckling', 'chick', 'foal'],
    languagePatterns: [
      'What is the farmer doing?',
      'He\'s milking the cow.',
      'How many horses are there?',
      'There is one horse.',
      'There are two horses.'
    ]
  },
  {
    key: 'B2_U5',
    bookNumber: 2,
    unitNumber: 5,
    ageGroupCode: '4-5',
    bigQuestion: 'What do we eat at different time of the day?',
    storyTitle: 'Pat\'s Birthday Dream',
    values: 'Eating a Healthy Breakfast',
    concept: 'a few, a lot',
    oracy: 'Responding Appropriately: What do you want for breakfast? Milk, please. Anything else? No, thank you.',
    crossCurricular: 'Science: Which food comes from plants?',
    numeracy: 'Number 19',
    project: 'My Meals Collage',
    vocabularyReferences: ['breakfast', 'lunch', 'dinner', 'eggs', 'chicken', 'salad', 'pancakes', 'water', 'soup', 'rice', 'milk', 'cereal', 'orange juice', 'fish', 'strawberries'],
    languagePatterns: [
      'What food do you like? I like rice.',
      'I don\'t like eggs.',
      'What food does she like? She likes eggs.',
      'She doesn\'t like rice.',
      'What do you have for breakfast in the morning?',
      'I have eggs for breakfast.',
      'We have breakfast in the morning.'
    ]
  },
  {
    key: 'B2_U6',
    bookNumber: 2,
    unitNumber: 6,
    ageGroupCode: '4-5',
    bigQuestion: 'What different kinds of clothes do we wear?',
    storyTitle: 'The Teddy Bear Show',
    values: 'Taking Care of Our Clothes',
    concept: 'left, right',
    oracy: 'Asking Questions for Information: What\'s the weather like? It\'s rainy. Put on your raincoat.',
    crossCurricular: 'Science: What are the four seasons of the year?',
    numeracy: 'Number 20',
    project: 'What I Wear Poster',
    vocabularyReferences: ['pants', 'shoes', 'T-shirt', 'skirt', 'sweater', 'socks', 'jacket', 'boots', 'raincoat', 'dress', 'sunny', 'cloudy', 'rainy', 'snowy', 'windy'],
    languagePatterns: [
      'What color is his raincoat?',
      'What color are her socks?',
      'What is she wearing?',
      'She\'s wearing blue pants.',
      'What are you wearing? I\'m wearing a dress.',
      'What\'s Mia wearing?',
      'She\'s wearing a yellow T-shirt.',
      'What\'s the weather like?'
    ]
  },
  {
    key: 'B2_U7',
    bookNumber: 2,
    unitNumber: 7,
    ageGroupCode: '4-5',
    bigQuestion: 'What can we do with our senses?',
    storyTitle: 'The Apple Pie',
    values: 'Respecting Differences',
    concept: 'next to, between, behind',
    oracy: 'Eliciting Opinions: How does your sandwich taste? It tastes salty. Do you like bananas? Yes, they taste good.',
    crossCurricular: 'Science: Which sense is it?',
    numeracy: 'Number 30',
    project: 'Fuzzy Caterpillar Model',
    vocabularyReferences: ['see', 'touch', 'hear', 'smell', 'taste', 'soft', 'rough', 'smooth', 'good', 'bad', 'sweet', 'salty', 'loud', 'quiet', 'beautiful'],
    languagePatterns: [
      'She\'s smelling a flower.',
      'He\'s touching a cat.',
      'How does it smell? It smells good.',
      'How does it feel? It feels soft.',
      'How does the orange juice taste? It tastes sweet.'
    ]
  },
  {
    key: 'B2_U8',
    bookNumber: 2,
    unitNumber: 8,
    ageGroupCode: '4-5',
    bigQuestion: 'How do we get from one place to another?',
    storyTitle: 'Let\'s Climb a Mountain!',
    values: 'Taking Care of the Air',
    concept: 'new, old, slow, fast',
    oracy: 'Standing Up Straight: This is my train. It\'s yellow. It\'s old. It\'s slow.',
    crossCurricular: 'Art: How can you make a beautiful boat?',
    numeracy: 'Number 40',
    project: 'Transportation Booklet',
    vocabularyReferences: ['car', 'train', 'bus', 'airplane', 'boat', 'bike', 'helicopter', 'ship', 'air', 'water', 'land', 'beach', 'amusement park', 'mountains', 'city'],
    languagePatterns: [
      'Where does a bus go?',
      'A bus goes on land.',
      'Where is she going? She\'s going to the city.',
      'How is he going to get there? He is going to get there in a car.',
      'Where are you going? I\'m going to the beach.',
      'How are you going to get there? I\'m going to get there on a boat.'
    ]
  },
  {
    key: 'B2_U9',
    bookNumber: 2,
    unitNumber: 9,
    ageGroupCode: '4-5',
    bigQuestion: 'What do plants need to grow?',
    storyTitle: 'One Little Daffodil',
    values: 'Taking Care of Plants',
    concept: 'tall, short',
    oracy: 'Looking at Your Audience: What are your favorite fruits? My favorite fruits are strawberries and oranges.',
    crossCurricular: 'Science: Where do fruits and vegetables grow?',
    numeracy: 'Number 50',
    project: 'My Terrarium',
    vocabularyReferences: ['plant', 'sun', 'soil', 'water', 'air', 'seed', 'shovel', 'hole', 'watering can', 'petals', 'leaves', 'stem', 'roots'],
    languagePatterns: [
      'First, dig a hole.',
      'What\'s missing? Which part is missing?',
      'The petals are missing.',
      'The stem is missing.'
    ]
  },

  // ===================== BOOK 3 — AGE 5–6 (LÁ) =====================
  {
    key: 'B3_U1',
    bookNumber: 3,
    unitNumber: 1,
    ageGroupCode: '5-6',
    bigQuestion: 'What do we do at school?',
    storyTitle: 'We Learn at School!',
    values: 'Be kind to others.',
    concept: 'red, blue, yellow, green, orange, purple, pink, black, gray, brown',
    oracy: 'Responding Appropriately: I need a pencil, please. I need some books, please. Here you go. Thank you.',
    crossCurricular: 'Art: How can we make secondary colors?',
    numeracy: 'Numbers 1-20',
    project: 'Binoculars',
    vocabularyReferences: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Science', 'Art', 'Math', 'Writing', 'Reading', 'Physical Education', 'use a computer', 'play music', 'speak English', 'paint with watercolors', 'read books', 'play in the playground'],
    languagePatterns: [
      'What day is today? Monday.',
      'What day is it?',
      'What do we have on Mondays? We have Art.',
      'What do you do at school? I read books.',
      'Do you play music? Yes, I do. No, I don\'t.',
      'What does she do at school? She reads books.'
    ]
  },
  {
    key: 'B3_U2',
    bookNumber: 3,
    unitNumber: 2,
    ageGroupCode: '5-6',
    bigQuestion: 'How can we show our feelings?',
    storyTitle: 'Maddy Goes to a Party',
    values: 'Talk about your feelings.',
    concept: 'feelings',
    oracy: 'Asking Questions for Information: How old are you? I\'m five years old.',
    crossCurricular: 'Art: Can you decorate the birthday cakes?',
    numeracy: 'Number 30',
    project: 'Feelings Puppets',
    vocabularyReferences: ['shy', 'silly', 'scared', 'excited', 'surprised', 'bored', 'scream', 'jump up and down', 'shout hooray', 'yawn', 'cry', 'laugh', 'candy', 'cake', 'candle', 'balloon', 'present', 'party hat'],
    languagePatterns: [
      'How does Mia feel? She\'s happy.',
      'When we are excited, we jump up and down.',
      'What do you do when you are bored?',
      'When I\'m bored, I yawn.',
      'What\'s different?',
      'How many candles can you see?',
      'What color is the present?'
    ]
  },
  {
    key: 'B3_U3',
    bookNumber: 3,
    unitNumber: 3,
    ageGroupCode: '5-6',
    bigQuestion: 'How are we the same or different?',
    storyTitle: 'The Kindergarten Photograph',
    values: 'Be proud of yourself.',
    concept: 'Who is the tallest?',
    oracy: 'Asking Questions for Information: What\'s your name? What\'s your mother\'s name? My mother\'s name is Kim. What\'s your favorite color?',
    crossCurricular: 'Science: What does your family tree look like?',
    numeracy: 'Number 40',
    project: 'Class Portraits',
    vocabularyReferences: ['child', 'children', 'woman', 'women', 'man', 'men', 'tall', 'short', 'thin', 'aunt', 'cousin', 'uncle', 'blond', 'red', 'long', 'curly', 'straight'],
    languagePatterns: [
      'What does he look like? He\'s a man.',
      'She\'s a woman. She\'s tall.',
      'How many men can you see?',
      'She has short curly hair.',
      'Who is it?'
    ]
  },
  {
    key: 'B3_U4',
    bookNumber: 3,
    unitNumber: 4,
    ageGroupCode: '5-6',
    bigQuestion: 'What is a wild animal?',
    storyTitle: 'Don\'t Feed the Wild Animals',
    values: 'Protect wild animals.',
    concept: 'Simple addition',
    oracy: 'Giving Reasons: Do you like bears? I like bears. Why? Because they are cute.',
    crossCurricular: 'Science: Can you describe a bear?',
    numeracy: 'Number 50',
    project: 'Wild Animals Collage',
    vocabularyReferences: ['monkey', 'lion', 'giraffe', 'tiger', 'bear', 'elephant', 'snake', 'whale', 'eagle', 'shark', 'kangaroo', 'toucan', 'paw', 'fin', 'beak', 'trunk', 'tail', 'wing'],
    languagePatterns: [
      'Where does the whale go? In the water.',
      'Where do kangaroos live? On land.',
      'What does a whale look like? It\'s big. It\'s gray.',
      'It has a long neck.',
      'It has small ears.'
    ]
  },
  {
    key: 'B3_U5',
    bookNumber: 3,
    unitNumber: 5,
    ageGroupCode: '5-6',
    bigQuestion: 'Who works in our community?',
    storyTitle: 'Jewel Goes to School',
    values: 'Respect people in your community.',
    concept: 'How many more?',
    oracy: 'Giving Reasons: What do you want to be? I want to be a chef. Why? Because I love to cook food.',
    crossCurricular: 'Social Studies: What do you want to be?',
    numeracy: 'Number 60',
    project: 'Helping Hands Display',
    vocabularyReferences: ['firefighter', 'doctor', 'chef', 'police officer', 'mail carrier', 'cashier', 'fire station', 'hospital', 'restaurant', 'post office', 'police station', 'grocery store', 'put out fires', 'take care of people', 'cook food', 'keep people safe', 'deliver mail', 'ring up groceries'],
    languagePatterns: [
      'Where does a firefighter work? She works in a fire station.',
      'Who\'s she? She\'s a doctor.',
      'Where does she work? She works in a hospital.',
      'What does she do? She takes care of people.'
    ]
  },
  {
    key: 'B3_U6',
    bookNumber: 3,
    unitNumber: 6,
    ageGroupCode: '5-6',
    bigQuestion: 'Why are restaurants special?',
    storyTitle: 'Uncle Piero\'s Restaurant',
    values: 'Be polite in restaurants.',
    concept: 'more than',
    oracy: 'Responding Appropriately: What would you like? I would like pizza, please. Anything else? No, thank you.',
    crossCurricular: 'Science: Is it a fruit or a vegetable?',
    numeracy: 'Number 70',
    project: 'Our Restaurant Menu',
    vocabularyReferences: ['waiter', 'menu', 'drink', 'main dish', 'side dish', 'dessert', 'steak', 'beans', 'lemonade', 'rice', 'soda', 'French fries', 'spaghetti', 'pizza', 'ice cream', 'chocolate cake', 'vegetables', 'cheeseburger'],
    languagePatterns: [
      'Do you like beans? Yes, I do. No, I don\'t. I like rice.',
      'He likes rice. He doesn\'t like soda.',
      'What do we need to eat steak?',
      'We need a fork, knife, and a plate to eat steak.'
    ]
  },
  {
    key: 'B3_U7',
    bookNumber: 3,
    unitNumber: 7,
    ageGroupCode: '5-6',
    bigQuestion: 'What does a routine look like?',
    storyTitle: 'The Hare and the Tortoise',
    values: 'Follow a routine.',
    concept: 'take away one',
    oracy: 'Making Suggestions: I\'m bored. What do you want to do? Let\'s play a game.',
    crossCurricular: 'Math: What time is it?',
    numeracy: 'Number 80',
    project: 'My Routines Collage',
    vocabularyReferences: ['get up', 'get dressed', 'have breakfast', 'go to school', 'go home', 'do homework', 'dance class', 'soccer practice', 'music lessons', 'swimming lessons', 'play with friends', 'gymnastics', 'eat dinner', 'take a bath', 'brush teeth', 'put on pajamas', 'read a book', 'go to bed'],
    languagePatterns: [
      'What do you do after school? I have swimming lessons. I play with friends.',
      'What does she do after school? She has soccer practice. He plays with friends.',
      'What do you do in the evenings? I sometimes read a book.'
    ]
  },
  {
    key: 'B3_U8',
    bookNumber: 3,
    unitNumber: 8,
    ageGroupCode: '5-6',
    bigQuestion: 'How can we care for the Earth?',
    storyTitle: 'The Yard Guard',
    values: 'Don\'t waste water.',
    concept: 'Can you add with a number line?',
    oracy: 'Agreeing and Disagreeing: What do you think? I think bees are beautiful. I agree / disagree.',
    crossCurricular: 'Social Studies: What can we recycle?',
    numeracy: 'Number 90',
    project: 'We Love the Earth Paintings',
    vocabularyReferences: ['natural', 'human-made', 'frog', 'rock', 'paper', 'plastic bottle', 'cardboard box', 'soda can', 'newspaper', 'spoon', 'jar', 'glass bottle', 'plastic bag', 'cloth bag', 'recycle', 'trash', 'turn on', 'turn off'],
    languagePatterns: [
      'What is it? It\'s a soda can.',
      'Is it natural or human-made? I think it\'s natural.',
      'What can you do to help the Earth? I can recycle.'
    ]
  },
  {
    key: 'B3_U9',
    bookNumber: 3,
    unitNumber: 9,
    ageGroupCode: '5-6',
    bigQuestion: 'What do we do on vacation?',
    storyTitle: 'Percy\'s Peak',
    values: 'Pick up your trash.',
    concept: 'Can you subtract with a number line?',
    oracy: 'Giving Encouragement: Where are you going on vacation? What are you going to do at the beach? Good idea.',
    crossCurricular: 'Art: What can we do on vacation at night?',
    numeracy: 'Number 100',
    project: 'Vacation Salad',
    vocabularyReferences: ['beach', 'mountains', 'forest', 'amusement park', 'lake', 'summer camp', 'towel', 'flashlight', 'sleeping bag', 'sunglasses', 'cap', 'backpack', 'build a sandcastle', 'hike', 'make a campfire', 'go on rides', 'row a boat', 'ride a horse'],
    languagePatterns: [
      'What do you take to the beach? I take a towel to the beach.',
      'What does she do in the mountains? She hikes.',
      'What do you do? I ride a horse.'
    ]
  }
];

module.exports = {
  AGE_GROUPS_DATA,
  BOOKS_DATA,
  UNITS_DATA
};
