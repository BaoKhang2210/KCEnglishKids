/**
 * Comprehensive Language Content Dataset for KCEnglishKids (27 Units)
 * 100% Exhaustive extraction from the official curriculum tables (Book 1, Book 2, Book 3).
 * Contains every single question, answer, statement, pattern, and communicative dialogue.
 * Source Type: OFFICIAL_CURRICULUM
 */

const LANGUAGE_CONTENT_DATA = [
  // =========================================================================
  // BOOK 1 — AGE 3–4 (LỚP MẦM)
  // =========================================================================

  // B1_U1: What can we see at school?
  { en: 'What can you see?', vi: 'Bé nhìn thấy gì nào?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'I can see a boy.', vi: 'Bé nhìn thấy một bạn nam.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'Is it a book?', vi: 'Đó có phải là quyển sách không?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'Yes, it is.', vi: 'Vâng, đúng rồi.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'No, it isn\'t.', vi: 'Không, không phải đâu.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'What is it?', vi: 'Đây là cái gì?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'It\'s a book.', vi: 'Đó là một quyển sách.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'What\'s your name?', vi: 'Tên của bạn là gì?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'My name is Leo.', vi: 'Tên của tớ là Leo.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'What\'s his name?', vi: 'Bạn nam kia tên là gì?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'His name is Leo.', vi: 'Tên bạn ấy là Leo.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'What\'s her name?', vi: 'Bạn nữ kia tên là gì?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'Her name is Mia.', vi: 'Tên bạn ấy là Mia.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'Hello! How are you today?', vi: 'Xin chào! Hôm nay bạn khỏe không?', type: 'ORACY', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'I\'m fine, thank you. Goodbye.', vi: 'Mình khỏe, cảm ơn bạn nhé. Tạm biệt.', type: 'ORACY', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },

  // B1_U2: What do we look like?
  { en: 'This is my nose.', vi: 'Đây là chiếc mũi của bé.', type: 'SENTENCE', unit: 'B1_U2', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'These are my eyes.', vi: 'Đây là đôi mắt của bé.', type: 'SENTENCE', unit: 'B1_U2', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'How do you feel?', vi: 'Bé cảm thấy thế nào?', type: 'QUESTION', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'I feel sad.', vi: 'Bé cảm thấy buồn.', type: 'ANSWER', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Are you happy?', vi: 'Bé có đang vui không?', type: 'QUESTION', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Yes, I am. I am happy.', vi: 'Có, bé đang rất vui.', type: 'ANSWER', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Are you angry?', vi: 'Bé có đang tức giận không?', type: 'QUESTION', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'No, I\'m not.', vi: 'Không, bé không giận đâu.', type: 'ANSWER', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Is she happy? Yes, she is.', vi: 'Bạn ấy có vui không? Có, bạn ấy rất vui.', type: 'PATTERN', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Is he angry? No, he isn\'t.', vi: 'Cậu ấy có giận không? Không, cậu ấy không giận.', type: 'PATTERN', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },

  // B1_U3: What can our bodies do?
  { en: 'I have a head.', vi: 'Bé có một chiếc đầu.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'I have two knees.', vi: 'Bé có hai chiếc đầu gối.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'She has a head.', vi: 'Bạn ấy có một chiếc đầu.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'He has two feet.', vi: 'Bạn ấy có hai bàn chân.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Can she dance?', vi: 'Bạn ấy có biết nhảy múa không?', type: 'QUESTION', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Yes, she can.', vi: 'Có, bạn ấy múa được.', type: 'ANSWER', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'No, she can\'t.', vi: 'Không, bạn ấy chưa múa được.', type: 'ANSWER', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'She can crawl.', vi: 'Bạn ấy có thể bò.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Can you run?', vi: 'Bé có chạy được không?', type: 'QUESTION', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Yes, I can.', vi: 'Có, bé chạy được ạ.', type: 'ANSWER', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'No, I can\'t.', vi: 'Không, bé chưa chạy được.', type: 'ANSWER', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'May I go to the bathroom? Yes, you may.', vi: 'Thưa cô cho con xin phép đi vệ sinh ạ? Được, con đi đi.', type: 'ORACY', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'May I wash my hands? Yes, you may.', vi: 'Thưa cô cho con xin phép rửa tay ạ? Được, con rửa đi.', type: 'ORACY', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },

  // B1_U4: What is a family?
  { en: 'What is a family?', vi: 'Gia đình là gì thế?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Is this a family?', vi: 'Đây có phải là một gia đình không?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Is he the father?', vi: 'Đó có phải là người bố không?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Yes, he is.', vi: 'Vâng, đúng rồi.', type: 'ANSWER', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Is she the grandmother?', vi: 'Bà ấy có phải là người bà không?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'No, she isn\'t.', vi: 'Không, không phải đâu.', type: 'ANSWER', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'What does she look like?', vi: 'Trông cô ấy như thế nào?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'She\'s tall.', vi: 'Cô ấy có dáng người cao.', type: 'ANSWER', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Is the sister old?', vi: 'Người chị ấy có già không?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'No, she is young.', vi: 'Không, chị ấy còn trẻ.', type: 'ANSWER', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'My mother is tall.', vi: 'Mẹ của bé rất cao.', type: 'SENTENCE', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'My brother is young.', vi: 'Em trai của bé còn nhỏ tuổi.', type: 'SENTENCE', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'What\'s your mother\'s name?', vi: 'Mẹ của bạn tên là gì?', type: 'ORACY', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'My mother\'s name is Kim.', vi: 'Mẹ của tớ tên là Kim.', type: 'ORACY', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },

  // B1_U5: What is a pet?
  { en: 'How many birds can you see?', vi: 'Bé nhìn thấy bao nhiêu chú chim?', type: 'QUESTION', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'I can see two birds.', vi: 'Bé nhìn thấy hai chú chim.', type: 'ANSWER', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Can cats walk?', vi: 'Mèo có biết đi bộ không?', type: 'QUESTION', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Yes, they can.', vi: 'Có chứ, mèo biết đi bộ.', type: 'ANSWER', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Can cats fly?', vi: 'Mèo có biết bay không?', type: 'QUESTION', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'No, they can\'t.', vi: 'Không, mèo không biết bay.', type: 'ANSWER', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Cats can walk. Cats can\'t fly.', vi: 'Mèo có thể đi bộ nhưng mèo không biết bay.', type: 'SENTENCE', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'We are birds! Chirp, chirp, chirp.', vi: 'Chúng tớ là những chú chim! Líu lo líu lo.', type: 'ORACY', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },

  // B1_U6: Can healthy foods be delicious?
  { en: 'Which foods do you like?', vi: 'Bé thích những món ăn nào?', type: 'QUESTION', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'I like bananas.', vi: 'Bé thích chuối.', type: 'ANSWER', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'What does she have?', vi: 'Bạn ấy có quả gì thế?', type: 'QUESTION', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'She has an apple.', vi: 'Bạn ấy có một quả táo.', type: 'ANSWER', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'He has an orange.', vi: 'Cậu ấy có một quả cam.', type: 'ANSWER', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'What do you have?', vi: 'Bé có món gì thế?', type: 'QUESTION', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'I have a carrot.', vi: 'Bé có một củ cà rốt.', type: 'ANSWER', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'Do you like apples? Yes, I do.', vi: 'Bé có thích táo không? Có, bé thích.', type: 'ORACY', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'Do you like apples? No, I don\'t. I like pears.', vi: 'Bé có thích táo không? Không, bé không thích. Bé thích lê.', type: 'ORACY', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },

  // B1_U7: What is a toy?
  { en: 'What color is the ball?', vi: 'Quả bóng có màu gì thế?', type: 'QUESTION', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'The ball is red.', vi: 'Quả bóng màu đỏ.', type: 'ANSWER', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'It\'s red.', vi: 'Nó màu đỏ.', type: 'ANSWER', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'Is it big? Yes, it is.', vi: 'Nó có to không? Có, nó to.', type: 'PATTERN', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'Is it small? No, it isn\'t.', vi: 'Nó có nhỏ không? Không, nó không nhỏ.', type: 'PATTERN', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'Is it blue? Yes, it is.', vi: 'Nó màu xanh dương phải không? Đúng rồi.', type: 'PATTERN', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'Is it yellow? No, it isn\'t.', vi: 'Nó màu vàng phải không? Không phải đâu.', type: 'PATTERN', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'The ball is small and blue.', vi: 'Quả bóng nhỏ nhắn và có màu xanh dương.', type: 'SENTENCE', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'I want a teddy bear, please. Here you are. Thank you.', vi: 'Cho bé xin bạn gấu bông nhé. Của bé đây. Cảm ơn ạ.', type: 'ORACY', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },

  // B1_U8: What can we see in a park?
  { en: 'Do you like to play on the swings?', vi: 'Bé có thích chơi xích đu không?', type: 'QUESTION', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'Yes, I do.', vi: 'Dạ có, bé rất thích.', type: 'ANSWER', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'No, I don\'t.', vi: 'Dạ không, bé không thích.', type: 'ANSWER', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'What can you see?', vi: 'Bé nhìn thấy gì nào?', type: 'QUESTION', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'I can see a butterfly.', vi: 'Bé nhìn thấy một chú bướm.', type: 'ANSWER', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'I can see some clouds.', vi: 'Bé nhìn thấy vài đám mây.', type: 'ANSWER', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'What color is it? It\'s red.', vi: 'Nó có màu gì? Nó có màu đỏ.', type: 'ORACY', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'What does a tree look like? It\'s big.', vi: 'Cây trông như thế nào? Cây rất to lớn.', type: 'ORACY', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },

  // B1_U9: Where do we live?
  { en: 'Where does she live?', vi: 'Cô ấy sống ở đâu?', type: 'QUESTION', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'She lives in a house.', vi: 'Cô ấy sống trong một ngôi nhà.', type: 'ANSWER', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'He lives in an apartment building.', vi: 'Cậu ấy sống trong một tòa chung cư.', type: 'ANSWER', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'Where do you live?', vi: 'Bé đang sống ở đâu?', type: 'QUESTION', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'I live in a house.', vi: 'Bé sống trong một ngôi nhà.', type: 'ANSWER', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'What can you see near your house?', vi: 'Bé nhìn thấy gì ở gần nhà?', type: 'QUESTION', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'I can see a park near my house.', vi: 'Bé thấy một công viên ở gần nhà.', type: 'ANSWER', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'I want to run. Let\'s go to the park!', vi: 'Tớ muốn chạy nhảy. Chúng mình cùng ra công viên nào!', type: 'ORACY', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },

  // =========================================================================
  // BOOK 2 — AGE 4–5 (LỚP CHỒI)
  // =========================================================================

  // B2_U1: What do you like about school?
  { en: 'What is it?', vi: 'Đây là cái gì?', type: 'QUESTION', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'It\'s a pencil.', vi: 'Nó là một chiếc bút chì.', type: 'ANSWER', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'What do you do with a pencil?', vi: 'Bạn làm gì với một chiếc bút chì?', type: 'QUESTION', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'I draw with a pencil.', vi: 'Tớ vẽ tranh bằng bút chì.', type: 'ANSWER', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'What do you like to do?', vi: 'Bạn thích làm hoạt động gì?', type: 'QUESTION', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'I like to listen to stories.', vi: 'Tớ thích lắng nghe những câu chuyện.', type: 'ANSWER', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'May I get some paper, please? Yes, you may.', vi: 'Thưa cô cho em xin ít giấy được không ạ? Được, em lấy đi.', type: 'ORACY', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },

  // B2_U2: How do we take care of ourselves?
  { en: 'He takes care of himself.', vi: 'Cậu ấy tự chăm sóc bản thân.', type: 'SENTENCE', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },
  { en: 'She washes her hands with soap.', vi: 'Bạn ấy rửa tay sạch sẽ với xà phòng.', type: 'SENTENCE', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },
  { en: 'What can you do to take care of yourself?', vi: 'Bé có thể làm gì để tự chăm sóc bản thân?', type: 'QUESTION', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },
  { en: 'I can eat healthy food.', vi: 'Bé ăn các món ăn bổ dưỡng.', type: 'ANSWER', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },
  { en: 'What\'s the matter? I\'m thirsty. You need to drink water.', vi: 'Có chuyện gì thế? Tớ thấy khát nước. Bạn cần uống nước đi.', type: 'ORACY', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },

  // B2_U3: What do we do at home?
  { en: 'What\'s this?', vi: 'Đây là cái gì?', type: 'QUESTION', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'It\'s a bed.', vi: 'Nó là một chiếc giường.', type: 'ANSWER', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'Where does it go? In the bedroom.', vi: 'Nó đặt ở đâu? Ở trong phòng ngủ.', type: 'PATTERN', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'The bed goes in the bedroom.', vi: 'Chiếc giường được đặt trong phòng ngủ.', type: 'SENTENCE', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'Who\'s this? What is she doing?', vi: 'Ai đây? Cô ấy đang làm gì?', type: 'QUESTION', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'She\'s cooking.', vi: 'Mẹ đang nấu ăn.', type: 'ANSWER', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'The father\'s cooking.', vi: 'Bố đang nấu nướng.', type: 'SENTENCE', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'The mother\'s making the bed.', vi: 'Mẹ đang dọn dẹp giường ngủ.', type: 'SENTENCE', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'Where are you? I\'m here in the bedroom.', vi: 'Bạn đang ở đâu đấy? Mình đang ở trong phòng ngủ nè.', type: 'ORACY', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },

  // B2_U4: What can we see on a farm?
  { en: 'What is the farmer doing?', vi: 'Bác nông dân đang làm gì thế?', type: 'QUESTION', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'He\'s milking the cow.', vi: 'Bác ấy đang vắt sữa bò.', type: 'ANSWER', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'How many horses are there?', vi: 'Có bao nhiêu chú ngựa ở đó?', type: 'QUESTION', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'There is one horse.', vi: 'Có một chú ngựa.', type: 'ANSWER', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'There are two horses.', vi: 'Có hai chú ngựa.', type: 'ANSWER', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'What does a cow say? Moo, moo.', vi: 'Bác bò sữa kêu thế nào? Ùm bò, ùm bò.', type: 'ORACY', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },

  // B2_U5: What do we eat at different time of the day?
  { en: 'What food do you like?', vi: 'Bé thích ăn món gì?', type: 'QUESTION', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'I like rice. I don\'t like eggs.', vi: 'Bé thích ăn cơm. Bé không thích ăn trứng.', type: 'ANSWER', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'What food does she like?', vi: 'Bạn ấy thích món ăn nào?', type: 'QUESTION', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'She likes eggs. She doesn\'t like rice.', vi: 'Bạn ấy thích trứng. Bạn ấy không thích cơm.', type: 'ANSWER', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'What do you have for breakfast in the morning?', vi: 'Bé ăn gì cho bữa sáng vào buổi sớm?', type: 'QUESTION', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'I have eggs for breakfast.', vi: 'Bé ăn trứng cho bữa sáng.', type: 'ANSWER', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'We have breakfast in the morning.', vi: 'Chúng mình ăn sáng vào buổi ban mai.', type: 'SENTENCE', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'What do you want for breakfast? Milk, please. Anything else? No, thank you.', vi: 'Bé muốn dùng gì cho bữa sáng? Cho bé sữa ạ. Có thêm gì nữa không? Dạ đủ rồi, cảm ơn ạ.', type: 'ORACY', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },

  // B2_U6: What different kinds of clothes do we wear?
  { en: 'What color is his raincoat?', vi: 'Áo mưa của cậu ấy có màu gì?', type: 'QUESTION', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'His raincoat is yellow.', vi: 'Áo mưa của cậu ấy màu vàng.', type: 'ANSWER', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'What color are her socks?', vi: 'Đôi tất của bạn ấy có màu gì?', type: 'QUESTION', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'Her socks are pink.', vi: 'Tất của bạn ấy có màu hồng.', type: 'ANSWER', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'What is she wearing?', vi: 'Cô ấy đang mặc trang phục gì?', type: 'QUESTION', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'She\'s wearing blue pants.', vi: 'Bạn ấy đang mặc chiếc quần màu xanh.', type: 'ANSWER', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'What are you wearing?', vi: 'Bé đang mặc trang phục gì thế?', type: 'QUESTION', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'I\'m wearing a jacket and boots.', vi: 'Bé đang mặc áo khoác và đi đôi ủng.', type: 'ANSWER', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'What\'s Mia wearing? She\'s wearing a sweater.', vi: 'Bạn Mia đang mặc gì? Bạn ấy đang mặc áo len.', type: 'PATTERN', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'What\'s the weather like? It\'s rainy. Put on your raincoat.', vi: 'Thời tiết hôm nay thế nào? Trời đang mưa. Hãy mặc áo mưa vào nhé.', type: 'ORACY', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },

  // B2_U7: What can we do with our senses?
  { en: 'She\'s smelling a flower.', vi: 'Bạn ấy đang ngửi hương một bông hoa.', type: 'SENTENCE', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'He\'s touching a cat.', vi: 'Bạn ấy đang chạm vào chú mèo.', type: 'SENTENCE', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'How does it smell?', vi: 'Nó ngửi có mùi thế nào?', type: 'QUESTION', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'It smells good.', vi: 'Nó có mùi rất thơm tho.', type: 'ANSWER', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'How does it feel?', vi: 'Chạm vào cảm thấy ra sao?', type: 'QUESTION', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'It feels soft.', vi: 'Cảm giác chạm vào rất mềm mại.', type: 'ANSWER', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'How does the orange juice taste?', vi: 'Nước cam nếm có vị gì?', type: 'QUESTION', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'It tastes sweet.', vi: 'Nó có vị ngọt ngào.', type: 'ANSWER', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'How does your sandwich taste? It tastes salty.', vi: 'Món bánh kẹp của bạn nếm thế nào? Nó có vị mằn mặn.', type: 'ORACY', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'Do you like bananas? Yes, they taste good.', vi: 'Bạn có thích chuối không? Có, chuối ăn rất ngon.', type: 'ORACY', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },

  // B2_U8: How do we get from one place to another?
  { en: 'Where does a bus go?', vi: 'Xe buýt di chuyển ở đâu?', type: 'QUESTION', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'A bus goes on land.', vi: 'Xe buýt chạy trên đường bộ.', type: 'ANSWER', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'Where is she going?', vi: 'Cô ấy đang đi đâu thế?', type: 'QUESTION', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'She\'s going to the city.', vi: 'Cô ấy đang đi vào thành phố.', type: 'ANSWER', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'How is he going to get there?', vi: 'Cậu ấy sẽ đi đến đó bằng phương tiện gì?', type: 'QUESTION', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'He is going to get there in a car.', vi: 'Cậu ấy sẽ đi đến đó bằng xe ô tô.', type: 'ANSWER', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'Where are you going?', vi: 'Bé đang đi đâu thế?', type: 'QUESTION', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'I\'m going to the beach.', vi: 'Bé đang đi ra bãi biển.', type: 'ANSWER', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'How are you going to get there?', vi: 'Bé sẽ đến bãi biển bằng cách nào?', type: 'QUESTION', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'I\'m going to get there on a boat.', vi: 'Bé sẽ đến đó bằng một chuyến thuyền.', type: 'ANSWER', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'This is my train. It\'s yellow. It\'s old. It\'s slow.', vi: 'Đây là đoàn tàu của tớ. Nó màu vàng. Nó đã cũ và chạy chậm rãi.', type: 'ORACY', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },

  // B2_U9: What do plants need to grow?
  { en: 'First, dig a hole.', vi: 'Đầu tiên, hãy đào một chiếc hố.', type: 'SENTENCE', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'What\'s missing? Which part is missing?', vi: 'Có gì còn thiếu? Bộ phận nào đang thiếu?', type: 'QUESTION', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'The petals are missing.', vi: 'Những cánh hoa đang bị thiếu.', type: 'ANSWER', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'The stem is missing.', vi: 'Cành thân cây đang bị thiếu.', type: 'ANSWER', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'What are your favorite fruits?', vi: 'Trái cây yêu thích của bé là gì?', type: 'ORACY', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'My favorite fruits are strawberries and oranges.', vi: 'Trái cây yêu thích nhất của bé là dâu tây và cam.', type: 'ORACY', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },

  // =========================================================================
  // BOOK 3 — AGE 5–6 (LỚP LÁ)
  // =========================================================================

  // B3_U1: What do we do at school?
  { en: 'What day is today? Today is Monday.', vi: 'Hôm nay là thứ mấy? Hôm nay là Thứ Hai.', type: 'PATTERN', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'What day is it?', vi: 'Đó là ngày thứ mấy?', type: 'QUESTION', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'What do we have on Mondays?', vi: 'Chúng mình học môn gì vào các ngày Thứ Hai?', type: 'QUESTION', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'We have Art on Mondays.', vi: 'Chúng mình có tiết Mỹ thuật vào các ngày Thứ Hai.', type: 'ANSWER', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'What do you do at school?', vi: 'Bạn làm hoạt động gì ở trường?', type: 'QUESTION', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'I read books.', vi: 'Tớ đọc những cuốn sách.', type: 'ANSWER', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'Do you play music?', vi: 'Bạn có chơi âm nhạc không?', type: 'QUESTION', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'Yes, I do.', vi: 'Có, tớ có chơi nhạc.', type: 'ANSWER', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'No, I don\'t.', vi: 'Không, tớ không chơi nhạc.', type: 'ANSWER', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'What does she do at school?', vi: 'Bạn ấy làm gì ở trường?', type: 'QUESTION', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'She reads books.', vi: 'Bạn ấy đọc sách.', type: 'ANSWER', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'I need a pencil, please. Here you go. Thank you.', vi: 'Làm ơn cho mình mượn bút chì. Của bạn đây. Cảm ơn nhé.', type: 'ORACY', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'I need some books, please.', vi: 'Làm ơn cho mình mượn vài quyển sách nhé.', type: 'ORACY', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },

  // B3_U2: How can we show our feelings?
  { en: 'How does Mia feel?', vi: 'Bạn Mia đang cảm thấy thế nào?', type: 'QUESTION', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'She\'s happy.', vi: 'Bạn ấy đang vui vẻ.', type: 'ANSWER', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'When we are excited, we jump up and down.', vi: 'Khi chúng mình hào hứng, chúng mình nhảy cẫng lên.', type: 'SENTENCE', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'What do you do when you are bored?', vi: 'Bạn làm gì khi cảm thấy buồn chán?', type: 'QUESTION', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'When I\'m bored, I yawn.', vi: 'Khi buồn chán, tớ ngáp một cái.', type: 'ANSWER', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'What\'s different?', vi: 'Có điểm gì khác biệt?', type: 'QUESTION', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'How many candles are on the cake?', vi: 'Có bao nhiêu cây nến trên chiếc bánh sinh nhật?', type: 'QUESTION', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'What color is the balloon?', vi: 'Quả bóng bay có màu gì?', type: 'QUESTION', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'How old are you? I\'m five years old.', vi: 'Năm nay bạn mấy tuổi rồi? Tớ tròn năm tuổi.', type: 'ORACY', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },

  // B3_U3: How are we the same or different?
  { en: 'What does he look like?', vi: 'Trông chú ấy như thế nào?', type: 'QUESTION', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'He\'s a man.', vi: 'Đó là một người đàn ông.', type: 'ANSWER', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'She\'s a woman. She\'s tall.', vi: 'Đó là một người phụ nữ. Cô ấy có vóc dáng cao.', type: 'ANSWER', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'How many men can you see?', vi: 'Bạn có thể nhìn thấy bao nhiêu người đàn ông?', type: 'QUESTION', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'She has short hair.', vi: 'Cô ấy có mái tóc ngắn.', type: 'SENTENCE', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'Who is it?', vi: 'Đó là ai thế?', type: 'QUESTION', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'What\'s your name? What\'s your favorite color?', vi: 'Bạn tên là gì? Màu sắc yêu thích của bạn là gì?', type: 'ORACY', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'What\'s your mother\'s name? My mother\'s name is Kim.', vi: 'Mẹ của bạn tên là gì? Mẹ của tớ tên là Kim.', type: 'ORACY', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },

  // B3_U4: What is a wild animal?
  { en: 'Where does the whale go?', vi: 'Chú cá voi bơi ở đâu?', type: 'QUESTION', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'The whale goes in the water.', vi: 'Cá voi bơi lội dưới làn nước.', type: 'ANSWER', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'Where do kangaroos live?', vi: 'Những chú chuột túi kangaroo sống ở đâu?', type: 'QUESTION', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'Kangaroos live on land.', vi: 'Chuột túi kangaroo sống trên cạn.', type: 'ANSWER', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'What does a whale look like?', vi: 'Cá voi trông như thế nào?', type: 'QUESTION', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'It\'s big. It\'s gray.', vi: 'Nó to lớn. Nó có màu xám.', type: 'ANSWER', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'It has a long neck.', vi: 'Nó có một chiếc cổ dài.', type: 'SENTENCE', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'It has small ears.', vi: 'Nó có đôi tai nhỏ nhắn.', type: 'SENTENCE', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'Do you like bears? I like bears. Why? Because they are cute.', vi: 'Bạn có thích gấu không? Tớ thích gấu. Tại sao? Vì chúng rất đáng yêu.', type: 'ORACY', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'I don\'t like bears. Why not? Because they are big.', vi: 'Tớ không thích gấu. Tại sao thế? Vì chúng to lớn quá.', type: 'ORACY', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },

  // B3_U5: Who works in our community?
  { en: 'Where does a firefighter work?', vi: 'Lính cứu hỏa làm việc ở đâu?', type: 'QUESTION', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'She works in a fire station.', vi: 'Cô ấy làm việc ở trạm cứu hỏa.', type: 'ANSWER', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'Who\'s she? She\'s a doctor.', vi: 'Cô ấy là ai? Cô ấy là một bác sĩ.', type: 'PATTERN', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'Where does she work?', vi: 'Bác sĩ làm việc ở đâu?', type: 'QUESTION', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'She works in a hospital.', vi: 'Bác sĩ làm việc trong bệnh viện.', type: 'ANSWER', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'What does she do?', vi: 'Bác sĩ làm công việc gì?', type: 'QUESTION', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'She takes care of people.', vi: 'Bác sĩ chăm sóc sức khỏe cho mọi người.', type: 'ANSWER', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'What do you want to be? I want to be a chef. Why? Because I love to cook food.', vi: 'Bạn muốn làm nghề gì? Tớ muốn làm đầu bếp. Tại sao? Vì tớ thích nấu nướng.', type: 'ORACY', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },

  // B3_U6: Why are restaurants special?
  { en: 'Do you like beans?', vi: 'Bạn có thích ăn đậu không?', type: 'QUESTION', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'Yes, I do.', vi: 'Có, tớ thích.', type: 'ANSWER', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'No, I don\'t. I like rice.', vi: 'Không, tớ không thích. Tớ thích cơm hơn.', type: 'ANSWER', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'He likes rice. He doesn\'t like soda.', vi: 'Cậu ấy thích ăn cơm. Cậu ấy không thích uống nước ngọt.', type: 'SENTENCE', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'What do we need to eat steak?', vi: 'Chúng mình cần gì để ăn bít tết?', type: 'QUESTION', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'We need a fork, a knife, and a plate to eat steak.', vi: 'Chúng mình cần một chiếc nĩa, một con dao và một chiếc đĩa để ăn bít tết.', type: 'ANSWER', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'What would you like? I would like pizza, please. Anything else? No, thank you.', vi: 'Quý khách muốn dùng gì? Cho tôi pizza nhé. Còn gì nữa không? Dạ đủ rồi, cảm ơn bạn.', type: 'ORACY', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },

  // B3_U7: What does a routine look like?
  { en: 'What do you do after school?', vi: 'Sau giờ học bạn làm gì?', type: 'QUESTION', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'I have swimming lessons. I play with friends.', vi: 'Tớ đi học bơi. Tớ chơi cùng các bạn.', type: 'ANSWER', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'What does she do after school?', vi: 'Bạn nữ làm gì sau khi tan học?', type: 'QUESTION', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'She has soccer practice. He plays with friends.', vi: 'Bạn ấy đi tập đá bóng. Bạn nam chơi đùa cùng bạn bè.', type: 'ANSWER', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'What do you do in the evenings?', vi: 'Bạn làm gì vào các buổi tối?', type: 'QUESTION', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'I sometimes read a book.', vi: 'Thỉnh thoảng tớ đọc một quyển sách.', type: 'ANSWER', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'I\'m bored. What do you want to do? Let\'s play a game.', vi: 'Tớ thấy chán quá. Bạn muốn làm gì nào? Chúng mình cùng chơi trò chơi đi.', type: 'ORACY', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },

  // B3_U8: How can we care for the Earth?
  { en: 'What is it?', vi: 'Đây là cái gì?', type: 'QUESTION', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'It\'s a soda can.', vi: 'Đó là một vỏ lon nước ngọt.', type: 'ANSWER', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'Is it natural or human-made?', vi: 'Đồ vật này là tự nhiên hay nhân tạo?', type: 'QUESTION', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'I think it\'s natural.', vi: 'Tớ nghĩ nó là tự nhiên.', type: 'ANSWER', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'I think it\'s human-made.', vi: 'Tớ nghĩ nó là sản phẩm nhân tạo.', type: 'ANSWER', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'What can you do to help the Earth?', vi: 'Bạn có thể làm gì để giúp đỡ Trái Đất?', type: 'QUESTION', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'I can recycle.', vi: 'Tớ có thể tái chế rác thải.', type: 'ANSWER', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'What do you think? I think bees are beautiful. I agree.', vi: 'Bạn nghĩ sao? Tớ thấy loài ong rất đẹp. Mình đồng ý.', type: 'ORACY', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },

  // B3_U9: What do we do on vacation?
  { en: 'What do you take to the beach?', vi: 'Bạn mang gì ra bãi biển?', type: 'QUESTION', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'I take a towel to the beach.', vi: 'Tớ mang theo một chiếc khăn tắm ra bãi biển.', type: 'ANSWER', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'What does she do in the mountains?', vi: 'Cô ấy làm gì khi ở trên núi?', type: 'QUESTION', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'She hikes in the mountains.', vi: 'Cô ấy đi bộ leo núi.', type: 'ANSWER', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'What do you do?', vi: 'Bạn làm hoạt động gì?', type: 'QUESTION', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'I ride a horse.', vi: 'Tớ cưỡi ngựa.', type: 'ANSWER', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'Where are you going on vacation? What are you going to do at the beach? Good idea.', vi: 'Kỳ nghỉ bạn đi đâu? Bạn định làm gì ở bãi biển? Ý kiến hay đấy.', type: 'ORACY', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 }
];

module.exports = {
  LANGUAGE_CONTENT_DATA
};
