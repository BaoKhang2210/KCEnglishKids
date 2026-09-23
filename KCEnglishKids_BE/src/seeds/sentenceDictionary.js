/**
 * Comprehensive, age-appropriate sentence dictionary for KCEnglishKids (Ages 3-6)
 * Replaces generic "Look at the X." with meaningful, cheerful, and educational sentences.
 */

const CURATED_SENTENCES = {
  // Animals (Pet & Wild)
  'bee': { en: 'The little bee makes sweet honey.', vi: 'Chú ong nhỏ làm ra mật ngọt ngào.' },
  'dog': { en: 'The friendly dog wags its tail happily.', vi: 'Chú chó thân thiện vẫy đuôi mừng rỡ.' },
  'cat': { en: 'The soft cat likes to purr and sleep.', vi: 'Chú mèo êm ái thích kêu meo meo và nằm ngủ.' },
  'bird': { en: 'The pretty bird sings high in the green tree.', vi: 'Chú chim xinh hót líu lo trên cành cây xanh.' },
  'rabbit': { en: 'The white rabbit loves to hop in the garden.', vi: 'Chú thỏ trắng thích nhảy nhót trong vườn.' },
  'fish': { en: 'The colorful fish swims quickly in the water.', vi: 'Chú cá sặc sỡ bơi thoăn thoắt trong làn nước.' },
  'turtle': { en: 'The gentle turtle walks slowly with its shell.', vi: 'Chú rùa hiền lành mang mai và bò chầm chậm.' },
  'hamster': { en: 'The cute hamster runs around its little wheel.', vi: 'Chú chuột hamster đáng yêu chạy quanh chiếc bánh xe nhỏ.' },
  'lizard': { en: 'The green lizard rests on the warm sunny rock.', vi: 'Chú thằn lằn xanh nghỉ ngơi trên tảng đá ấm áp.' },
  'butterfly': { en: 'The colorful butterfly dances over sweet flowers.', vi: 'Chú bướm sặc sỡ lượn múa trên những bông hoa thơm.' },
  'duck': { en: 'The yellow duck quacks and swims in the pond.', vi: 'Chú vịt vàng kêu cạp cạp và bơi trong ao.' },
  'frog': { en: 'The green frog jumps high from leaf to leaf.', vi: 'Chú ếch xanh nhảy thật cao từ chiếc lá này sang lá khác.' },
  'bear': { en: 'The big brown bear loves sweet honey.', vi: 'Chú gấu nâu to lớn rất thích ăn mật ong ngọt ngào.' },
  'lion': { en: 'The brave lion has a magnificent golden mane.', vi: 'Chú sư tử dũng cảm có chiếc bờm vàng thật oai vệ.' },
  'elephant': { en: 'The gentle elephant sprays water with its long trunk.', vi: 'Chú voi hiền lành dùng chiếc vòi dài phun nước mát.' },
  'monkey': { en: 'The playful monkey swings happily from branches.', vi: 'Chú khỉ tinh nghịch đu đưa vui vẻ trên các cành cây.' },
  'tiger': { en: 'The strong tiger has bold orange and black stripes.', vi: 'Chú hổ dũng mãnh có những sọc cam và đen tuyệt đẹp.' },
  'pig': { en: 'The little pink pig plays happily on the farm.', vi: 'Chú heo con màu hồng chơi đùa vui vẻ ở nông trại.' },
  'cow': { en: 'The gentle cow gives us fresh healthy milk.', vi: 'Bác bò sữa hiền lành mang đến cho chúng mình dòng sữa tươi ngon.' },
  'horse': { en: 'The tall horse gallops swiftly across the grassy field.', vi: 'Chú ngựa cao lớn phi nhanh qua cánh đồng cỏ xanh.' },
  'sheep': { en: 'The fluffy sheep has warm and soft white wool.', vi: 'Chú cừu có bộ lông trắng muốt thật ấm áp và mềm mại.' },
  'chicken': { en: 'The hen pecks grains and watches over her chicks.', vi: 'Cô gà mái mổ thóc và ân cần chăm sóc đàn con.' },
  'mouse': { en: 'The tiny mouse squeaks softly in its cozy home.', vi: 'Chú chuột nhắt kêu chít chít trong tổ ấm cúng.' },
  'snake': { en: 'The smooth snake glides quietly through the grass.', vi: 'Chú rắn lướt đi êm ả qua thảm cỏ.' },
  'dolphin': { en: 'The smart dolphin leaps playfully over ocean waves.', vi: 'Chú cá heo thông minh nhảy múa trên những ngọn sóng biển.' },
  'whale': { en: 'The giant blue whale glides peacefully in the deep sea.', vi: 'Chú cá voi khổng lồ bơi lội thanh bình dưới đại dương sâu.' },
  'penguin': { en: 'The cute penguin waddles funny on the cold ice.', vi: 'Chú chim cánh cụt lạch bạch bước đi trên tảng băng lạnh.' },
  'owl': { en: 'The wise owl opens its big round eyes at night.', vi: 'Bác cú mèo thông thái mở to đôi mắt tròn trong đêm tối.' },
  'fox': { en: 'The clever orange fox has a fluffy warm tail.', vi: 'Chú cáo lông cam nhanh nhẹn có chiếc đuôi xù ấm áp.' },
  'deer': { en: 'The gentle deer walks quietly through the quiet forest.', vi: 'Chú hươu hiền lành bước đi nhẹ nhàng qua khu rừng êm đềm.' },

  // People & Family
  'teacher': { en: 'Our teacher smiles and reads us a wonderful story.', vi: 'Cô giáo mỉm cười và đọc cho chúng mình nghe một câu chuyện hay.' },
  'boy': { en: 'The cheerful boy builds a tall castle with blocks.', vi: 'Cậu bé vui tính đang xếp một tòa lâu đài thật cao.' },
  'girl': { en: 'The sweet girl draws a bright rainbow with crayons.', vi: 'Cô bé đáng yêu vẽ chiếc cầu vồng rực rỡ bằng sáp màu.' },
  'baby': { en: 'The baby sleeps soundly with a sweet gentle smile.', vi: 'Em bé ngủ thật ngoan với nụ cười ngọt ngào trên môi.' },
  'mother': { en: 'Mother gives me warm hugs and cooks yummy meals.', vi: 'Mẹ dành cho bé những cái ôm ấm áp và nấu các món ăn ngon.' },
  'mom': { en: 'I love Mom and give her a tight sweet hug.', vi: 'Bé yêu mẹ và trao mẹ một cái ôm thật chặt.' },
  'father': { en: 'Father holds my hand when we cross the street.', vi: 'Bố dắt tay bé khi chúng mình cùng qua đường.' },
  'dad': { en: 'Dad plays fun ball games with me in the park.', vi: 'Bố chơi trò ném bóng thật vui cùng bé ở công viên.' },
  'sister': { en: 'My sister shares her favorite picture book with me.', vi: 'Chị gái chia sẻ quyển sách tranh yêu thích cùng bé.' },
  'brother': { en: 'My brother helps me put together the puzzle pieces.', vi: 'Anh trai giúp bé ghép những mảnh ghép hình lại với nhau.' },
  'grandfather': { en: 'Grandfather tells exciting tales about his childhood.', vi: 'Ông kể những câu chuyện tuổi thơ vô cùng hấp dẫn.' },
  'grandmother': { en: 'Grandmother bakes sweet delicious cookies for us.', vi: 'Bà nướng những chiếc bánh quy ngọt ngào thơm nức cho chúng mình.' },
  'family': { en: 'Our family loves laughing and eating dinner together.', vi: 'Gia đình chúng mình luôn yêu thương và quây quần bên nhau.' },
  'friend': { en: 'My best friend always plays and shares toys with me.', vi: 'Người bạn thân luôn cùng chơi và chia sẻ đồ chơi với bé.' },
  'doctor': { en: 'The kind doctor checks my heartbeat with a smile.', vi: 'Bác sĩ tốt bụng mỉm cười kiểm tra nhịp tim cho bé.' },
  'nurse': { en: 'The gentle nurse helps us feel comfortable and well.', vi: 'Cô y tá dịu dàng chăm sóc giúp bé luôn khỏe mạnh.' },
  'policeman': { en: 'The polite police officer keeps our neighborhood safe.', vi: 'Chú cảnh sát giúp giữ gìn trật tự và an toàn cho khu phố.' },
  'firefighter': { en: 'The brave firefighter puts out big fires safely.', vi: 'Chú lính cứu hỏa dũng cảm dập tắt đám cháy an toàn.' },

  // School & Objects
  'school': { en: 'We learn, sing, and have fun at school every day.', vi: 'Chúng mình cùng học, ca hát và vui đùa ở trường mỗi ngày.' },
  'book': { en: 'Open this storybook to discover wonderful adventures.', vi: 'Mở trang sách truyện này ra để khám phá những điều kỳ diệu nhé.' },
  'crayon': { en: 'I use a red crayon to color a lovely heart.', vi: 'Bé dùng sáp màu đỏ để tô một trái tim xinh xắn.' },
  'pencil': { en: 'I hold my pencil properly to write neat letters.', vi: 'Bé cầm bút chì thật khéo để viết những chữ cái nắn nót.' },
  'chair': { en: 'Please sit nicely on your wooden chair.', vi: 'Bé hãy ngồi ngay ngắn trên chiếc ghế gỗ của mình nhé.' },
  'table': { en: 'We place our colorful books neatly on the table.', vi: 'Chúng mình xếp những cuốn sách màu gọn gàng trên bàn.' },
  'clock': { en: 'The clock goes tick-tock to tell us it is time to play.', vi: 'Chiếc đồng hồ kêu tích tắc báo hiệu đã đến giờ vui chơi.' },
  'door': { en: 'Please gently close the door when you walk into class.', vi: 'Bé nhớ đóng cửa nhẹ nhàng khi bước vào lớp học nhé.' },
  'window': { en: 'Sunlight shines through the bright open window.', vi: 'Ánh nắng ấm áp chiếu qua khung cửa sổ rộng mở.' },
  'bag': { en: 'I pack my storybook and water bottle into my school bag.', vi: 'Bé xếp sách truyện và bình nước vào chiếc cặp xinh.' },
  'scissors': { en: 'Use child-safe scissors carefully to cut paper shapes.', vi: 'Bé dùng kéo an toàn cẩn thận để cắt những hình giấy xinh xắn.' },
  'paper': { en: 'We fold colorful paper into pretty little boats.', vi: 'Chúng mình cùng gấp giấy màu thành những chiếc thuyền nhỏ.' },

  // Body Parts
  'face': { en: 'Wash your face with clean water to stay fresh.', vi: 'Bé rửa mặt bằng nước sạch để khuôn mặt luôn tươi tắn nhé.' },
  'eyes': { en: 'My eyes help me see colorful rainbows and flowers.', vi: 'Đôi mắt giúp bé nhìn thấy cầu vồng rực rỡ và muôn hoa đua sắc.' },
  'nose': { en: 'I use my little nose to smell fragrant flowers.', vi: 'Bé dùng chiếc mũi nhỏ để ngửi mùi hoa thơm ngát.' },
  'mouth': { en: 'Smile warmly and say kind polite words with your mouth.', vi: 'Hãy mỉm cười thật tươi và nói những lời lễ phép bằng miệng nhé.' },
  'ears': { en: 'My ears listen attentively to lovely bedtime songs.', vi: 'Đôi tai của bé lắng nghe những bài hát ru êm dịu.' },
  'hands': { en: 'Wash your hands clean with soap before every meal.', vi: 'Bé nhớ rửa tay sạch sẽ với xà phòng trước mỗi bữa ăn.' },
  'feet': { en: 'My feet take big energetic steps along the garden path.', vi: 'Đôi bàn chân của bé bước từng bước khỏe khoắn trên đường.' },
  'hair': { en: 'Brush your soft hair neatly before going outside.', vi: 'Bé hãy chải mái tóc mềm mại cho thật gọn gàng trước khi ra ngoài.' },
  'teeth': { en: 'Brush your teeth twice every day for a sparkling smile.', vi: 'Bé đánh răng hai lần mỗi ngày để có nụ cười trắng sáng nhé.' },
  'head': { en: 'Nod your head gently when saying hello to teachers.', vi: 'Bé gật đầu nhẹ nhàng khi chào thầy cô giáo nhé.' },
  'arms': { en: 'Stretch your arms wide to greet the sunny new day.', vi: 'Dang rộng hai cánh tay để đón chào một ngày mới ngập tràn ánh nắng.' },
  'legs': { en: 'Strong legs help us run, jump, and play all day.', vi: 'Đôi chân khỏe mạnh giúp chúng mình chạy nhảy và vui chơi suốt cả ngày.' },
  'cheeks': { en: 'The baby has rosy round cheeks like two red apples.', vi: 'Em bé có đôi má ửng hồng tròn xoe như hai quả táo đỏ.' },
  'chin': { en: 'Rest your chin gently and listen to the sweet song.', vi: 'Chống nhẹ chiếc cằm và lắng nghe giai điệu ngọt ngào nào.' },
  'fingers': { en: 'Wiggle your ten little fingers to say hello.', vi: 'Cử động mười ngón tay nhỏ nhắn để vẫy chào nhé.' },
  'toes': { en: 'Wiggle your tiny toes on the warm soft carpet.', vi: 'Cựa quậy những ngón chân nhỏ trên tấm thảm êm ấm.' },
  'knees': { en: 'Bend your knees and jump up like a little frog.', vi: 'Khuỵu đầu gối xuống và bật nhảy lên như chú ếch con nào.' },

  // Feelings
  'happy': { en: 'I feel so happy when we sing cheerful songs together.', vi: 'Bé cảm thấy rất vui vẻ khi chúng mình cùng hát những bài ca rộn rã.' },
  'sad': { en: 'When you feel sad, a warm hug will make you feel better.', vi: 'Khi bé buồn, một cái ôm ấm áp sẽ giúp bé thấy nhẹ nhõm hơn.' },
  'angry': { en: 'Take a deep gentle breath when you feel angry.', vi: 'Hãy hít một hơi thật sâu khi bé cảm thấy tức giận nhé.' },
  'excited': { en: 'We are excited to go on a fun weekend picnic.', vi: 'Chúng mình vô cùng hào hứng chuẩn bị cho buổi dã ngoại cuối tuần.' },
  'tired': { en: 'After playing hard, the tired puppy rests on its pillow.', vi: 'Sau một ngày vui chơi, chú cún con mệt mỏi nằm nghỉ trên gối.' },
  'scared': { en: 'Do not be scared, mother is always right here with you.', vi: 'Bé đừng sợ hãi nhé, mẹ luôn ở ngay cạnh bên bé.' },
  'proud': { en: 'Mom is very proud of your good listening today.', vi: 'Mẹ rất tự hào vì hôm nay bé đã biết lắng nghe thật ngoan.' },
  'surprised': { en: 'Mia was surprised by the colorful birthday gift.', vi: 'Bạn Mia rất bất ngờ trước món quà sinh nhật đầy màu sắc.' },

  // Actions / Verbs
  'run': { en: 'Let us run fast across the soft green grass.', vi: 'Chúng mình cùng chạy nhanh qua bãi cỏ xanh êm ái nhé.' },
  'jump': { en: 'Can you jump up high toward the blue sky?', vi: 'Bé có thể bật nhảy thật cao lên hướng về bầu trời xanh không?' },
  'dance': { en: 'We dance happily to the playful rhythm of the music.', vi: 'Chúng mình cùng nhảy múa vui vẻ theo nhịp điệu rộn ràng.' },
  'sing': { en: 'Sing the sweet alphabet song with all your friends.', vi: 'Hãy cùng các bạn hát vang bài hát chữ cái ngọt ngào nào.' },
  'swim': { en: 'The little ducks swim joyfully across the calm lake.', vi: 'Những chú vịt con bơi lội tung tăng qua mặt hồ phẳng lặng.' },
  'walk': { en: 'We walk holding hands safely on the clean sidewalk.', vi: 'Chúng mình nắm tay nhau đi bộ an toàn trên vỉa hè.' },
  'play': { en: 'Children love to play together in the sunny park.', vi: 'Các bạn nhỏ rất thích cùng nhau vui chơi trong công viên đầy nắng.' },
  'sleep': { en: 'Close your eyes and sleep well under the soft warm blanket.', vi: 'Bé hãy nhắm mắt và ngủ thật ngon dưới chiếc chăn ấm áp nhé.' },
  'eat': { en: 'Always eat healthy fresh fruits to grow strong and tall.', vi: 'Bé hãy ăn hoa quả tươi ngon để lớn nhanh và khỏe mạnh nhé.' },
  'drink': { en: 'Drink a glass of clean fresh water every morning.', vi: 'Bé hãy uống một ly nước sạch mỗi sáng thức dậy.' },
  'read': { en: 'Dad reads a wonderful fairy tale before bedtime.', vi: 'Bố đọc một câu chuyện cổ tích tuyệt vời cho bé trước giờ ngủ.' },
  'draw': { en: 'I draw a smiling golden sun with my bright yellow crayon.', vi: 'Bé vẽ ông mặt trời mỉm cười bằng sáp màu vàng tươi.' },
  'climb': { en: 'The active kitten loves to climb the soft sofa cushion.', vi: 'Chú mèo con hiếu động thích leo trèo lên đệm ghế êm.' },
  'help': { en: 'Always help your friends when they drop their toys.', vi: 'Bé hãy luôn giúp đỡ bạn bè khi bạn làm rơi đồ chơi nhé.' },
  'share': { en: 'It is so kind to share your toys with little friends.', vi: 'Thật tuyệt vời khi bé biết chia sẻ đồ chơi cùng các bạn nhỏ.' },
  'wash': { en: 'Wash your hands with soap before having yummy lunch.', vi: 'Rửa tay sạch bằng xà phòng trước khi thưởng thức bữa trưa nhé.' },
  'brush': { en: 'Brush your teeth carefully in small gentle circles.', vi: 'Bé đánh răng cẩn thận theo vòng tròn nhỏ thật nhẹ nhàng.' },
  'kick': { en: 'Kick the soccer ball gently into the goal.', vi: 'Đá nhẹ quả bóng tròn vào lưới ghi bàn nào.' },
  'fly': { en: 'Pretty birds flap their wings and fly across the sky.', vi: 'Những chú chim vỗ cánh bay lượn trên bầu trời cao.' },
  'crawl': { en: 'The baby bunny crawls out of its warm burrow.', vi: 'Chú thỏ con bò ra khỏi hang ấm áp để đón nắng mai.' },

  // Food & Fruits
  'apple': { en: 'Crunchy sweet red apples are delicious and healthy.', vi: 'Những quả táo đỏ ngọt giòn vừa ngon miệng vừa bổ dưỡng.' },
  'pear': { en: 'The sweet green pear is delicious to eat.', vi: 'Quả lê xanh ngọt lịm ăn thật là ngon.' },
  'banana': { en: 'Peel the sweet yellow banana before eating.', vi: 'Bé nhớ bóc vỏ quả chuối vàng ngọt trước khi thưởng thức nhé.' },
  'bananas': { en: 'Monkeys love sweet yellow bananas very much.', vi: 'Những chú khỉ rất thích ăn những quả chuối chín vàng ngọt ngào.' },
  'orange': { en: 'Juicy oranges give us lots of healthy vitamin C.', vi: 'Những quả cam mọng nước mang đến cho bé thật nhiều vitamin C.' },
  'carrot': { en: 'The cute rabbit loves crunching on orange carrots.', vi: 'Chú thỏ xinh xắn rất thích gặm những củ cà rốt màu cam.' },
  'tomato': { en: 'Bright red tomatoes make our salad colorful.', vi: 'Những quả cà chua đỏ tươi làm món rau trộn thêm bắt mắt.' },
  'cucumber': { en: 'Crisp cucumbers are cool and fresh in the summer.', vi: 'Dưa chuột giòn tan thật mát lành trong mùa hè.' },
  'cucumbers': { en: 'Fresh cucumbers are crunchy and cool.', vi: 'Những quả dưa chuột tươi ngon thật giòn và mát.' },
  'lettuce': { en: 'Crisp green lettuce is fresh and healthy.', vi: 'Rau xà lách xanh giòn tươi ngon và bổ dưỡng.' },
  'pineapple': { en: 'Sweet golden pineapples smell so wonderful.', vi: 'Những quả dứa vàng ươm tỏa hương thơm nức.' },
  'potato': { en: 'Warm baked potatoes taste wonderful with dinner.', vi: 'Món khoai tây nướng ấm áp ăn kèm bữa tối thật ngon.' },
  'peas': { en: 'Little green peas pop happily in the bowl.', vi: 'Những hạt đậu Hà Lan xanh tròn trĩnh trong chiếc bát nhỏ.' },
  'milk': { en: 'Drink a cup of warm fresh milk every morning.', vi: 'Bé hãy uống một ly sữa ấm tươi ngon vào mỗi buổi sáng.' },
  'water': { en: 'Clean cool water keeps our bodies healthy and hydrated.', vi: 'Nước mát sạch sẽ giúp cơ thể bé luôn khỏe khoắn và sảng khoái.' },
  'bread': { en: 'Warm fresh bread smells so good in the kitchen.', vi: 'Ổ bánh mì nướng nóng hổi tỏa hương thơm lừng trong gian bếp.' },
  'rice': { en: 'Eat all your bowl of steamed rice to grow tall and strong.', vi: 'Bé hãy ăn hết bát cơm dẻo để nhanh cao lớn và khỏe mạnh nhé.' },
  'egg': { en: 'Mom cooks a tasty boiled egg for my nutritious breakfast.', vi: 'Mẹ làm món trứng thơm ngon cho bữa sáng giàu dinh dưỡng của bé.' },
  'strawberry': { en: 'Sweet red strawberries taste wonderful on our cake.', vi: 'Những quả dâu tây đỏ ngọt ngào trang trí chiếc bánh thật ngon mắt.' },
  'grapes': { en: 'We wash the bunch of purple grapes clean before eating.', vi: 'Chúng mình rửa sạch chùm nho tím trước khi ăn nhé.' },

  // Nature & Weather
  'sun': { en: 'The warm sun shines brightly in the clear morning sky.', vi: 'Ánh mặt trời ấm áp tỏa sáng rực rỡ trên bầu trời sáng sớm.' },
  'tree': { en: 'The tall green tree gives cool shade on warm sunny days.', vi: 'Cây xanh cao lớn tỏa bóng mát rượi trong những ngày nắng ấm.' },
  'flower': { en: 'The red flower blooms beautifully in our sunny garden.', vi: 'Bông hoa đỏ nở rộ khoe sắc thắm trong khu vườn đầy nắng.' },
  'rain': { en: 'Raindrops fall gently on the leaves with pitter-patter sounds.', vi: 'Những hạt mưa rơi tí tách dịu dàng trên những tán lá.' },
  'cloud': { en: 'Fluffy white clouds float peacefully across the blue sky.', vi: 'Những đám mây trắng xốp bồng bềnh trôi qua bầu trời xanh.' },
  'wind': { en: 'The cool gentle breeze blows soft leaves dancing in the air.', vi: 'Làn gió mát lành khẽ đưa những chiếc lá khiêu vũ trong không gian.' },
  'star': { en: 'Tiny bright stars sparkle peacefully in the night sky.', vi: 'Những vì sao nhỏ lấp lánh lung linh trên bầu trời đêm thanh bình.' },
  'moon': { en: 'The gentle silver moon glows softly over the sleeping town.', vi: 'Vầng trăng bạc êm đềm tỏa ánh sáng dịu dàng soi sáng thị trấn.' },
  'rainbow': { en: 'A colorful arc of the rainbow appears after the rain.', vi: 'Chiếc cầu vồng bảy sắc tuyệt đẹp xuất hiện rực rỡ sau cơn mưa.' },

  // Colors
  'red': { en: 'The ripe red tomato is sweet and delicious.', vi: 'Quả cà chua màu đỏ chín mọng ngọt ngào và ngon lành.' },
  'blue': { en: 'The blue ocean sparkles under the warm morning sun.', vi: 'Đại dương xanh biếc lấp lánh dưới ánh mặt trời ban mai ấm áp.' },
  'yellow': { en: 'The yellow sunflower turns its face to the morning sun.', vi: 'Bông hoa hướng dương vàng tươi hướng về phía ánh mặt trời.' },
  'green': { en: 'The park is covered with a soft blanket of green grass.', vi: 'Công viên được phủ một tấm thảm cỏ xanh mướt và êm dịu.' },
  'pink': { en: 'The baby bunny has a tiny pink nose.', vi: 'Chú thỏ con có chiếc mũi nhỏ màu hồng thật xinh xắn.' },
  'purple': { en: 'Sweet purple grapes hang from the garden vine.', vi: 'Những chùm nho tím ngọt ngào đung đưa trên giàn cây trong vườn.' },
  'white': { en: 'Fluffy white snow falls softly in the winter.', vi: 'Những bông tuyết trắng muốt rơi nhẹ nhàng trong mùa đông.' },
  'black': { en: 'The friendly panda has black and white patches.', vi: 'Chú gấu trúc thân thiện có những mảng lông đen trắng xen kẽ.' },
  'brown': { en: 'The gentle bear has thick warm brown fur.', vi: 'Chú gấu hiền lành có bộ lông dày màu nâu ấm áp.' },
  'gray': { en: 'The little kitten has soft gray fur.', vi: 'Chú mèo con có bộ lông màu xám thật mềm mại.' },

  // Toys
  'car': { en: 'The little red toy car zooms smoothly across the room.', vi: 'Chiếc ô tô đồ chơi màu đỏ chạy vèo vèo qua khắp căn phòng.' },
  'ball': { en: 'Roll the bouncy ball gently across the carpet to me.', vi: 'Bé hãy lăn quả bóng nảy nhẹ nhàng qua tấm thảm lại đây nào.' },
  'doll': { en: 'Mia combs her pretty doll hair with gentle care.', vi: 'Bạn Mia nhẹ nhàng chải tóc cho cô búp bê xinh xắn.' },
  'teddy bear': { en: 'Hugging my soft teddy bear helps me sleep peacefully.', vi: 'Ôm chú gấu bông mềm mại giúp bé dễ dàng chìm vào giấc ngủ ngoan.' },
  'kite': { en: 'The colorful kite flies high above in the windy park.', vi: 'Chiếc diều rực rỡ bay lượn trên cao giữa công viên lộng gió.' },
  'train': { en: 'The toy train goes choo-choo along the wooden track.', vi: 'Đoàn tàu hỏa đồ chơi chạy xình xịch trên đường ray gỗ.' },
  'blocks': { en: 'We stack colorful blocks carefully to build a castle.', vi: 'Chúng mình cẩn thận xếp các khối gỗ màu để tạo thành lâu đài.' },
  'puzzle': { en: 'Fitting the last puzzle piece makes everyone cheer.', vi: 'Ghép mảnh ghép cuối cùng vào bức tranh khiến ai cũng reo vui.' },

  // Numbers
  'one': { en: 'I have one nose and one mouth on my happy face.', vi: 'Bé có một chiếc mũi và một chiếc miệng trên khuôn mặt xinh tươi.' },
  'two': { en: 'I have two bright eyes to see the colorful world.', vi: 'Bé có hai mắt sáng long lanh để nhìn ngắm thế giới muôn màu.' },
  'three': { en: 'Three little birds sit side-by-side on the branch.', vi: 'Ba chú chim non ngồi cạnh bên nhau trên cành cây.' },
  'four': { en: 'A little wooden table has four sturdy legs.', vi: 'Chiếc bàn gỗ nhỏ có bốn chiếc chân vững chãi.' },
  'five': { en: 'There are five playful fingers on each of my hands.', vi: 'Có năm ngón tay xinh xắn trên mỗi bàn tay nhỏ của bé.' },
  'six': { en: 'Six cute chicks follow their mother hen in the grass.', vi: 'Sáu chú gà con lon ton chạy theo gà mẹ trên thảm cỏ.' },
  'seven': { en: 'The rainbow in the sky shines with seven pretty colors.', vi: 'Chiếc cầu vồng trên bầu trời tỏa sáng bảy sắc màu rực rỡ.' },
  'eight': { en: 'The friendly octopus swims in the sea with eight arms.', vi: 'Chú bạch tuộc thân thiện bơi dưới biển với tám chiếc xúc tu.' },
  'nine': { en: 'Nine twinkling stars glow softly in the night sky.', vi: 'Chín ngôi sao lấp lánh tỏa sáng êm dịu trên bầu trời đêm.' },
  'ten': { en: 'We clap our hands together and count from one to ten.', vi: 'Chúng mình cùng vỗ tay và đếm từ một đến mười nhé.' },
  'eleven': { en: 'There are eleven shiny stars in our drawing.', vi: 'Có mười một ngôi sao lấp lánh trong bức tranh của chúng mình.' },
  'twelve': { en: 'The clock shows twelve hours on its round face.', vi: 'Chiếc đồng hồ hiển thị mười hai giờ trên mặt tròn.' },
  'twenty': { en: 'We have twenty fingers and toes altogether.', vi: 'Bé có tất cả hai mươi ngón tay và ngón chân xinh xắn.' },
  'count': { en: 'Let us count the colorful balloons in the sky.', vi: 'Chúng mình cùng đếm những quả bóng bay sắc màu trên trời nào.' }
};

function getSensibleSentence(vocab) {
  if (!vocab) return { en: '', vi: '' };
  const norm = (vocab.english || vocab.en || '').toLowerCase().trim();
  if (CURATED_SENTENCES[norm]) {
    return CURATED_SENTENCES[norm];
  }

  const en = vocab.english || vocab.en || '';
  const vi = (vocab.vietnamese || vocab.vi || '').toLowerCase();
  const cat = vocab.category || vocab.cat || '';
  const pos = vocab.partOfSpeech || vocab.pos || '';
  const topics = vocab.topics || [];

  if (cat === 'animals' || topics.includes('animals')) {
    return {
      en: `The cute ${en} is friendly and playful.`,
      vi: `Chú ${vi} này thật đáng yêu và tinh nghịch.`
    };
  }

  if (cat === 'food' || cat === 'meals' || topics.includes('food')) {
    return {
      en: `Fresh ${en} is delicious and healthy for growing kids.`,
      vi: `${vocab.vietnamese || vocab.vi} tươi ngon và rất tốt cho sức khỏe của bé.`
    };
  }

  if (pos === 'verb' || cat === 'actions') {
    return {
      en: `Children love to ${en} and have lots of fun.`,
      vi: `Các bạn nhỏ rất thích ${vi} và vui chơi mỗi ngày.`
    };
  }

  if (cat === 'feelings' || topics.includes('feelings')) {
    return {
      en: `I feel so ${en} when I play happily with my friends.`,
      vi: `Bé cảm thấy rất ${vi} khi được vui chơi cùng các bạn.`
    };
  }

  if (cat === 'body' || topics.includes('my-body')) {
    return {
      en: `Keep your ${en} clean, strong, and healthy every day.`,
      vi: `Bé hãy luôn giữ ${vi} sạch sẽ và khỏe mạnh mỗi ngày nhé.`
    };
  }

  if (cat === 'clothes' || topics.includes('clothes')) {
    return {
      en: `Put on your lovely ${en} before going outside to play.`,
      vi: `Bé hãy mặc ${vi} xinh xắn trước khi ra ngoài vui chơi nhé.`
    };
  }

  if (cat === 'toys' || topics.includes('toys')) {
    return {
      en: `We share the fun ${en} nicely with friends in class.`,
      vi: `Chúng mình cùng chia sẻ món ${vi} vui vẻ với bạn bè trong lớp nhé.`
    };
  }

  if (cat === 'nature' || cat === 'weather' || topics.includes('nature') || topics.includes('weather')) {
    return {
      en: `The ${en} makes our day bright, fresh, and lovely.`,
      vi: `${vocab.vietnamese || vocab.vi} làm cho ngày mới của chúng mình thật tươi sáng và đáng yêu.`
    };
  }

  if (cat === 'places' || cat === 'rooms') {
    return {
      en: `We explore the friendly ${en} together safely.`,
      vi: `Chúng mình cùng nhau khám phá ${vi} thân thương này nhé.`
    };
  }

  if (cat === 'family' || cat === 'people' || cat === 'jobs') {
    return {
      en: `The ${en} is very kind, caring, and helpful to us.`,
      vi: `${vocab.vietnamese || vocab.vi} rất tốt bụng và luôn ân cần giúp đỡ chúng mình.`
    };
  }

  if (pos === 'adjective' || cat === 'descriptors') {
    return {
      en: `This little friend is very ${en} and cute.`,
      vi: `Người bạn nhỏ này trông thật là ${vi} và dễ thương.`
    };
  }

  return {
    en: `Let us learn about the wonderful ${en} together!`,
    vi: `Chúng mình cùng tìm hiểu về ${vi} tuyệt vời này nhé!`
  };
}

module.exports = {
  CURATED_SENTENCES,
  getSensibleSentence
};
