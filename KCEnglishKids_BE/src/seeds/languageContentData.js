/**
 * Language Content Dataset for KCEnglishKids (27 Units)
 * Contains questions, answers, sentences, phrases, and patterns.
 * Structured by Age Group progression (3-4: short, 4-5: phrases/descriptions, 5-6: conversational).
 * Source Type: OFFICIAL_CURRICULUM
 */

const LANGUAGE_CONTENT_DATA = [
  // ===================== BOOK 1 (AGE 3–4) =====================
  // B1_U1 (School)
  { en: 'What can you see?', vi: 'Bạn nhìn thấy gì nào?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'I can see a boy.', vi: 'Mình nhìn thấy một cậu bé.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'Is it a book?', vi: 'Đó có phải là quyển sách không?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'Yes, it is.', vi: 'Đúng rồi.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'No, it isn\'t.', vi: 'Không phải đâu.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'What is it?', vi: 'Đây là cái gì?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'It\'s a book.', vi: 'Đó là một quyển sách.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'What\'s your name?', vi: 'Bạn tên là gì?', type: 'QUESTION', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },
  { en: 'My name is Leo.', vi: 'Tên mình là Leo.', type: 'ANSWER', unit: 'B1_U1', age: '3-4', topic: 'school', diff: 1 },

  // B1_U2 (My Face & Feelings)
  { en: 'This is my nose.', vi: 'Đây là mũi của mình.', type: 'SENTENCE', unit: 'B1_U2', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'These are my eyes.', vi: 'Đây là đôi mắt của mình.', type: 'SENTENCE', unit: 'B1_U2', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'How do you feel?', vi: 'Bạn cảm thấy thế nào?', type: 'QUESTION', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Are you happy?', vi: 'Bạn có đang vui không?', type: 'QUESTION', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Yes, I am.', vi: 'Vâng, mình rất vui.', type: 'ANSWER', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'Are you sad?', vi: 'Bạn có buồn không?', type: 'QUESTION', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },
  { en: 'No, I\'m not.', vi: 'Không, mình không buồn đâu.', type: 'ANSWER', unit: 'B1_U2', age: '3-4', topic: 'feelings', diff: 1 },

  // B1_U3 (Body Movements)
  { en: 'I have a head.', vi: 'Mình có một cái đầu.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'I have two knees.', vi: 'Mình có hai đầu gối.', type: 'SENTENCE', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Can she dance?', vi: 'Bạn ấy có biết múa không?', type: 'QUESTION', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Yes, she can.', vi: 'Có, bạn ấy múa được.', type: 'ANSWER', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Can you run?', vi: 'Bé có chạy được không?', type: 'QUESTION', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },
  { en: 'Yes, I can.', vi: 'Có, bé chạy được ạ.', type: 'ANSWER', unit: 'B1_U3', age: '3-4', topic: 'my-body', diff: 1 },

  // B1_U4 (Family)
  { en: 'What is a family?', vi: 'Gia đình là gì?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Is he the father?', vi: 'Chú ấy có phải là bố không?', type: 'QUESTION', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'Yes, he is.', vi: 'Đúng rồi, đó là bố.', type: 'ANSWER', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'My mother is tall.', vi: 'Mẹ của mình rất cao.', type: 'SENTENCE', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },
  { en: 'My brother is young.', vi: 'Em trai mình còn nhỏ.', type: 'SENTENCE', unit: 'B1_U4', age: '3-4', topic: 'family', diff: 1 },

  // B1_U5 (Pets)
  { en: 'How many birds can you see?', vi: 'Bạn nhìn thấy bao nhiêu chú chim?', type: 'QUESTION', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'I can see two birds.', vi: 'Mình nhìn thấy hai chú chim.', type: 'ANSWER', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Can cats walk?', vi: 'Mèo có biết đi bộ không?', type: 'QUESTION', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Yes, they can.', vi: 'Có, mèo biết đi bộ.', type: 'ANSWER', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Cats can walk.', vi: 'Những chú mèo có thể đi bộ.', type: 'SENTENCE', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },
  { en: 'Cats can\'t fly.', vi: 'Những chú mèo không biết bay.', type: 'SENTENCE', unit: 'B1_U5', age: '3-4', topic: 'animals', diff: 1 },

  // B1_U6 (Healthy Food)
  { en: 'Which foods do you like?', vi: 'Bé thích món ăn nào?', type: 'QUESTION', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'I like bananas.', vi: 'Bé thích chuối.', type: 'ANSWER', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'She has an apple.', vi: 'Bạn ấy có một quả táo.', type: 'SENTENCE', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },
  { en: 'I have a carrot.', vi: 'Mình có một củ cà rốt.', type: 'SENTENCE', unit: 'B1_U6', age: '3-4', topic: 'food', diff: 1 },

  // B1_U7 (Toys)
  { en: 'What color is the ball?', vi: 'Quả bóng có màu gì?', type: 'QUESTION', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'The ball is red.', vi: 'Quả bóng màu đỏ.', type: 'ANSWER', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'Is it big or small?', vi: 'Nó to hay nhỏ?', type: 'QUESTION', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },
  { en: 'The ball is small and blue.', vi: 'Quả bóng nhỏ và có màu xanh.', type: 'SENTENCE', unit: 'B1_U7', age: '3-4', topic: 'toys', diff: 1 },

  // B1_U8 (Park)
  { en: 'Do you like to play on the swings?', vi: 'Bé có thích chơi xích đu không?', type: 'QUESTION', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'Yes, I do.', vi: 'Dạ có, bé rất thích.', type: 'ANSWER', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'I can see a butterfly.', vi: 'Mình thấy một chú bướm xinh.', type: 'SENTENCE', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },
  { en: 'I can see some clouds.', vi: 'Mình thấy vài đám mây trắng.', type: 'SENTENCE', unit: 'B1_U8', age: '3-4', topic: 'nature', diff: 1 },

  // B1_U9 (Where We Live)
  { en: 'Where do you live?', vi: 'Bé sống ở đâu?', type: 'QUESTION', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'I live in a house.', vi: 'Bé sống trong một ngôi nhà.', type: 'ANSWER', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'She lives in an apartment building.', vi: 'Bạn ấy sống ở một tòa chung cư.', type: 'SENTENCE', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },
  { en: 'I can see a park near my house.', vi: 'Gần nhà mình có một công viên xanh.', type: 'SENTENCE', unit: 'B1_U9', age: '3-4', topic: 'my-house', diff: 1 },

  // ===================== BOOK 2 (AGE 4–5) =====================
  // B2_U1 (School Tools & Activities)
  { en: 'What do you do with a pencil?', vi: 'Bạn làm gì với cây bút chì?', type: 'QUESTION', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'I draw with a pencil.', vi: 'Mình vẽ tranh bằng bút chì.', type: 'ANSWER', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'What do you like to do at school?', vi: 'Bạn thích làm gì ở trường?', type: 'QUESTION', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },
  { en: 'I like to listen to stories and sing songs.', vi: 'Mình thích nghe kể chuyện và hát các bài hát.', type: 'ANSWER', unit: 'B2_U1', age: '4-5', topic: 'school', diff: 2 },

  // B2_U2 (Self-Care & Healthy Habits)
  { en: 'How do we take care of ourselves?', vi: 'Chúng mình tự chăm sóc bản thân thế nào?', type: 'QUESTION', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },
  { en: 'I wash my face and brush my hair.', vi: 'Bé rửa mặt và chải tóc gọn gàng.', type: 'ANSWER', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },
  { en: 'Drink water when you are thirsty.', vi: 'Hãy uống nước lọc khi bé cảm thấy khát.', type: 'SENTENCE', unit: 'B2_U2', age: '4-5', topic: 'daily-routines', diff: 2 },

  // B2_U3 (Home & Chores)
  { en: 'Where is the lamp?', vi: 'Chiếc đèn bàn ở đâu?', type: 'QUESTION', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'It\'s in the living room.', vi: 'Nó ở trong phòng khách.', type: 'ANSWER', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },
  { en: 'I help set the table and sweep the floor.', vi: 'Bé giúp dọn bàn ăn và quét nhà.', type: 'SENTENCE', unit: 'B2_U3', age: '4-5', topic: 'my-house', diff: 2 },

  // B2_U4 (Farm Animals)
  { en: 'What can you see on a farm?', vi: 'Bạn nhìn thấy gì trong nông trại?', type: 'QUESTION', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'I can see a cow and a little calf.', vi: 'Mình nhìn thấy một chú bò mẹ và chú bê con.', type: 'ANSWER', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },
  { en: 'A baby duck is called a duckling.', vi: 'Một chú vịt con được gọi là duckling.', type: 'SENTENCE', unit: 'B2_U4', age: '4-5', topic: 'animals', diff: 2 },

  // B2_U5 (Daily Meals)
  { en: 'What do you eat for breakfast?', vi: 'Bé ăn món gì vào bữa sáng?', type: 'QUESTION', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'I eat eggs, pancakes, and drink milk.', vi: 'Bé ăn trứng, bánh kếp và uống sữa tươi.', type: 'ANSWER', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },
  { en: 'We eat delicious soup and rice for dinner.', vi: 'Chúng mình ăn súp thơm ngon và cơm vào bữa tối.', type: 'SENTENCE', unit: 'B2_U5', age: '4-5', topic: 'food', diff: 2 },

  // B2_U6 (Clothes & Weather)
  { en: 'What are you wearing today?', vi: 'Hôm nay bạn đang mặc trang phục gì?', type: 'QUESTION', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'I\'m wearing a yellow T-shirt and blue pants.', vi: 'Mình đang mặc áo phông vàng và quần dài xanh.', type: 'ANSWER', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },
  { en: 'It\'s rainy today. Put on your raincoat and boots.', vi: 'Hôm nay trời mưa. Hãy mặc áo mưa và đi ủng nhé.', type: 'SENTENCE', unit: 'B2_U6', age: '4-5', topic: 'clothes', diff: 2 },

  // B2_U7 (Senses)
  { en: 'What can you do with your senses?', vi: 'Chúng mình làm được gì với các giác quan?', type: 'QUESTION', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'I can see beautiful flowers and hear sweet music.', vi: 'Mình có thể nhìn hoa đẹp và nghe nhạc êm dịu.', type: 'ANSWER', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },
  { en: 'The lemon tastes sour and fresh.', vi: 'Quả chanh có vị chua tươi mát.', type: 'SENTENCE', unit: 'B2_U7', age: '4-5', topic: 'senses', diff: 2 },

  // B2_U8 (Transportation & Travel)
  { en: 'How do we get to the beach?', vi: 'Làm thế nào để chúng mình đến bãi biển?', type: 'QUESTION', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'We can travel by car or by bus.', vi: 'Chúng mình có thể đi bằng xe ô tô hoặc xe buýt.', type: 'ANSWER', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },
  { en: 'An airplane flies high in the air.', vi: 'Máy bay bay lượn trên bầu trời cao.', type: 'SENTENCE', unit: 'B2_U8', age: '4-5', topic: 'transportation', diff: 2 },

  // B2_U9 (Plants & Growing)
  { en: 'What do plants need to grow?', vi: 'Cây cối cần những gì để lớn lên?', type: 'QUESTION', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'Plants need sun, soil, water, and air.', vi: 'Cây cần ánh nắng, đất, nước và không khí.', type: 'ANSWER', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },
  { en: 'The red petals grow on green stems.', vi: 'Những cánh hoa đỏ nở trên cành thân xanh.', type: 'SENTENCE', unit: 'B2_U9', age: '4-5', topic: 'nature', diff: 2 },

  // ===================== BOOK 3 (AGE 5–6) =====================
  // B3_U1 (School Subjects & Days)
  { en: 'What do we do on Monday?', vi: 'Chúng mình làm gì vào ngày Thứ Hai?', type: 'QUESTION', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'We have Science and Math on Monday.', vi: 'Chúng mình có tiết Khoa học và Toán vào Thứ Hai.', type: 'ANSWER', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },
  { en: 'I like to speak English and paint with watercolors.', vi: 'Tớ thích nói tiếng Anh và vẽ tranh màu nước.', type: 'SENTENCE', unit: 'B3_U1', age: '5-6', topic: 'school', diff: 3 },

  // B3_U2 (Feelings & Birthday Celebration)
  { en: 'How do you show you are excited?', vi: 'Bé thể hiện sự háo hức như thế nào?', type: 'QUESTION', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'When I am excited, I jump up and down and shout hooray!', vi: 'Khi háo hức, tớ nhảy cẫng lên và reo hò hoan hô!', type: 'ANSWER', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },
  { en: 'He was surprised because he opened a big present.', vi: 'Bạn ấy ngạc nhiên vì mở được một hộp quà to.', type: 'SENTENCE', unit: 'B3_U2', age: '5-6', topic: 'feelings', diff: 3 },

  // B3_U3 (Describing People & Hair)
  { en: 'How are we the same or different?', vi: 'Chúng mình giống hay khác nhau như thế nào?', type: 'QUESTION', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'She has long curly hair, and he has short straight hair.', vi: 'Bạn nữ có tóc xoăn dài, còn bạn nam có tóc ngắn thẳng.', type: 'ANSWER', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },
  { en: 'We look different, but we are all wonderful friends.', vi: 'Chúng mình trông khác nhau, nhưng đều là những người bạn tuyệt vời.', type: 'SENTENCE', unit: 'B3_U3', age: '5-6', topic: 'family', diff: 3 },

  // B3_U4 (Wild Animals & Parts)
  { en: 'What is a wild animal?', vi: 'Động vật hoang dã là gì?', type: 'QUESTION', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'An elephant is a wild animal with a long trunk.', vi: 'Voi là loài động vật hoang dã có chiếc vòi dài.', type: 'ANSWER', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },
  { en: 'Eagles have strong wings and sharp beaks to hunt.', vi: 'Đại bàng có đôi cánh khỏe và mỏ sắc để săn mồi.', type: 'SENTENCE', unit: 'B3_U4', age: '5-6', topic: 'animals', diff: 3 },

  // B3_U5 (Community Helpers & Jobs)
  { en: 'Who works in our community?', vi: 'Ai làm việc trong cộng đồng của chúng ta?', type: 'QUESTION', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'A firefighter puts out fires and keeps everyone safe.', vi: 'Lính cứu hỏa dập tắt lửa và giữ an toàn cho mọi người.', type: 'ANSWER', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },
  { en: 'I want to be a chef because I love cooking delicious food.', vi: 'Tớ muốn làm đầu bếp vì tớ thích nấu món ăn ngon.', type: 'SENTENCE', unit: 'B3_U5', age: '5-6', topic: 'community', diff: 3 },

  // B3_U6 (Restaurants & Menus)
  { en: 'May I have the menu, please?', vi: 'Làm ơn cho tôi xem thực đơn được không?', type: 'QUESTION', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'I would like spaghetti and lemonade for my lunch.', vi: 'Tớ muốn dùng món mì Ý và nước chanh cho bữa trưa.', type: 'ANSWER', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },
  { en: 'For dessert, we love chocolate cake and vanilla ice cream.', vi: 'Về món tráng miệng, chúng mình thích bánh sô-cô-la và kem va-ni.', type: 'SENTENCE', unit: 'B3_U6', age: '5-6', topic: 'food', diff: 3 },

  // B3_U7 (Daily Routines)
  { en: 'What does your routine look like?', vi: 'Lịch sinh hoạt thường ngày của bạn thế nào?', type: 'QUESTION', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'First, I get up, get dressed, and have breakfast.', vi: 'Đầu tiên, tớ thức dậy, mặc quần áo và ăn sáng.', type: 'ANSWER', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },
  { en: 'At night, I take a warm bath, brush my teeth, and go to bed.', vi: 'Buổi tối, tớ tắm nước ấm, đánh răng và đi ngủ.', type: 'SENTENCE', unit: 'B3_U7', age: '5-6', topic: 'daily-routines', diff: 3 },

  // B3_U8 (Caring for Earth & Recycling)
  { en: 'How can we care for the Earth?', vi: 'Làm sao để chúng mình chăm sóc Trái Đất?', type: 'QUESTION', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'We can recycle plastic bottles, soda cans, and cardboard boxes.', vi: 'Chúng mình có thể tái chế chai nhựa, lon nước và hộp giấy.', type: 'ANSWER', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },
  { en: 'Remember to turn off lights and use reusable cloth bags.', vi: 'Hãy nhớ tắt đèn và sử dụng túi vải thân thiện môi trường.', type: 'SENTENCE', unit: 'B3_U8', age: '5-6', topic: 'environment', diff: 3 },

  // B3_U9 (Vacation & Adventures)
  { en: 'What do you do on vacation?', vi: 'Bạn làm gì vào kỳ nghỉ?', type: 'QUESTION', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'We hike in the forest and make a campfire by the lake.', vi: 'Chúng mình đi bộ trong rừng và nhóm lửa trại bên bờ hồ.', type: 'ANSWER', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 },
  { en: 'At the beach, I wear sunglasses and build huge sandcastles.', vi: 'Ở bãi biển, tớ đeo kính râm và xây lâu đài cát khổng lồ.', type: 'SENTENCE', unit: 'B3_U9', age: '5-6', topic: 'vacation', diff: 3 }
];

module.exports = {
  LANGUAGE_CONTENT_DATA
};
