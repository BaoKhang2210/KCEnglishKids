/**
 * Preschool & Kindergarten Total Physical Response (TPR) Movement Guide
 * Provides fun, interactive physical mime actions for preschool English vocabulary.
 */

export const PRESCHOOL_TPR_MAP: Record<string, string> = {
  // ── Classroom & School Items ──────────────────────────────────────────────
  'book': 'Hai bàn tay chắp lại rồi mở ra như mở cuốn sách tranh, cả lớp hô vang: "Book!" 📖',
  'crayon': 'Ngón cái và trỏ chụm lại giả vờ tô màu bức tranh rực rỡ lên không trung: "Crayon!" 🖍️',
  'chair': 'Hai tay chống hông, hơi khuỵu gối giả vờ ngồi xuống chiếc ghế êm ái: "Chair!" 🪑',
  'table': 'Hai cánh tay dang ngang trước ngực làm mặt bàn phẳng phiu: "Table!" 🪵',
  'pencil': 'Cầm ngón trỏ vung vẩy như đang nắn nót viết từng nét chữ thật đẹp: "Pencil!" ✏️',
  'pen': 'Bấm ngón tay cái "Tách!" như bút bi rồi vẽ một đường thẳng: "Pen!" 🖊️',
  'eraser': 'Nắm bàn tay lại xoa qua xoa lại như đang tẩy sạch bảng: "Eraser!" 🧼',
  'ruler': 'Hai tay kéo thẳng một đoạn thật dài đo chiều dài: "Ruler!" 📏',
  'bag': 'Hai tay vòng qua vai làm động tác đeo chiếc ba lô xinh xắn đến trường: "Bag!" 🎒',
  'school bag': 'Hai tay vòng qua vai làm động tác đeo ba lô đi học: "School bag!" 🎒',
  'teacher': 'Một tay cầm sách, một tay chỉ lên bảng chỉ bài cho học sinh thật dịu dàng: "Teacher!" 👩‍🏫',
  'school': 'Hai bàn tay tạo thành hình mái nhà tam giác trên đỉnh đầu: "School!" 🏫',
  'boy': 'Đội chiếc mũ lưỡi trai giả vờ và nháy mắt chào thật ngầu: "Boy!" 👦',
  'girl': 'Hai tay vuốt nhẹ hai bên bím tóc xinh xắn và mỉm cười: "Girl!" 👧',
  'friend': 'Hai tay đan chéo vào nhau hoặc khoác vai bạn bên cạnh: "Friend!" 🤝',

  // ── Colors ─────────────────────────────────────────────────────────────────
  'blue': 'Hai tay vung nhẹ như sóng biển dập dềnh và chỉ lên bầu trời xanh mát: "Blue!" 🌊',
  'red': 'Hai tay làm hình trái tim ấm áp đặt trước ngực, đập thình thịch: "Red!" ❤️',
  'yellow': 'Mười ngón tay xòe tròn quanh khuôn mặt tỏa sáng như tia nắng mặt trời: "Yellow!" ☀️',
  'green': 'Hai tay đưa lên như chồi cây non vươn mình lớn lên trong vườn: "Green!" 🌱',
  'orange': 'Hai bàn tay khum tròn lại như ôm quả cam ngọt ngào: "Orange!" 🍊',
  'pink': 'Hai ngón trỏ chỉ nhẹ vào hai bên má hồng mỉm cười thật tươi: "Pink!" 🌸',
  'purple': 'Hai tay chụm lại làm chùm nho rung rinh lắc lư: "Purple!" 🍇',
  'white': 'Hai tay vuốt nhẹ như bông tuyết trắng rơi êm ái: "White!" ❄️',
  'black': 'Hai tay che nhẹ mắt rồi bất ngờ mở ra: "Black!" 🕶️',
  'brown': 'Xoa hai bàn tay vào nhau ấm áp như ôm chú gấu nâu: "Brown!" 🐻',

  // ── Animals ────────────────────────────────────────────────────────────────
  'cat': 'Hai tay khum lên đầu làm tai mèo vẫy vẫy, vuốt râu "Meow!": "Cat!" 🐱',
  'dog': 'Hai bàn tay gập nhẹ trước ngực vẫy vẫy, lắc lư đuôi "Woof woof!": "Dog!" 🐶',
  'bird': 'Hai cánh tay dang rộng vỗ nhẹ như chim đang bay lượn: "Bird!" 🐦',
  'fish': 'Hai bàn tay chắp lại uốn lượn như chú cá nhỏ bơi lội dưới nước: "Fish!" 🐟',
  'bear': 'Hai tay giơ lên cao gầm gừ như chú gấu tròn đáng yêu: "Bear!" 🐻',
  'lion': 'Hai bàn tay xòe rộng làm bờm sư tử dũng mãnh gầm "Roar!": "Lion!" 🦁',
  'elephant': 'Một cánh tay giơ dài ra trước mũi đung đưa như vòi voi: "Elephant!" 🐘',
  'monkey': 'Hai tay gãi đầu gãi nách nhảy tưng tưng "Ooh ooh aah aah!": "Monkey!" 🐒',
  'duck': 'Hai bàn tay chắp ngang miệng làm mỏ vịt quạc quạc: "Duck!" 🦆',
  'cow': 'Hai ngón trỏ đặt lên đầu làm đôi sừng chú bò "Moo moo!": "Cow!" 🐮',
  'sheep': 'Hai tay xoa xoa vòng lông cừu xù bông ấm áp "Baa baa!": "Sheep!" 🐑',
  'rabbit': 'Hai ngón tay giơ thẳng lên làm tai thỏ nhảy nhót: "Rabbit!" 🐰',
  'frog': 'Ngồi xổm bật nhảy lên như chú ếch con "Ribbit!": "Frog!" 🐸',
  'tiger': 'Giơ móng vuốt về phía trước gầm to dũng mãnh: "Tiger!" 🐯',

  // ── Body Parts ─────────────────────────────────────────────────────────────
  'head': 'Hai tay nhẹ nhàng chạm lên đỉnh đầu, lắc lư qua lại: "Head!" 🙆',
  'eyes': 'Hai ngón trỏ chỉ nhẹ vào hai bên mắt rồi chớp chớp: "Eyes!" 👀',
  'eye': 'Ngón trỏ chỉ nhẹ vào mắt rồi chớp chớp: "Eye!" 👁️',
  'nose': 'Ngón trỏ chạm nhẹ vào chóp mũi, hít một hơi thật sâu: "Nose!" 👃',
  'mouth': 'Ngón trỏ chỉ vào khuôn miệng và mỉm cười thật rạng rỡ: "Mouth!" 👄',
  'ears': 'Hai tay áp nhẹ vào hai vành tai lắng nghe chăm chú: "Ears!" 👂',
  'ear': 'Tay áp nhẹ vào vành tai lắng nghe: "Ear!" 👂',
  'hands': 'Hai bàn tay giơ lên cao vỗ tay "Bộp bộp!": "Hands!" 👏',
  'hand': 'Giơ bàn tay lên cao vẫy chào thật tươi: "Hand!" ✋',
  'arms': 'Dang rộng hai cánh tay gập bắp tay khoe sức mạnh: "Arms!" 💪',
  'arm': 'Gập bắp tay khoe cánh tay khỏe mạnh: "Arm!" 💪',
  'legs': 'Dậm chân tại chỗ rộn ràng theo nhịp điệu: "Legs!" 🦵',
  'feet': 'Nhón chân xoay một vòng tròn xinh xắn: "Feet!" 🦶',
  'foot': 'Nhấc một bàn chân lên chỉ vào mũi giày: "Foot!" 👟',
  'face': 'Hai bàn tay xòe ra làm thành khung tròn quanh khuôn mặt tươi cười: "Face!" 😊',
  'hair': 'Hai tay nhẹ nhàng vuốt mái tóc mượt mà: "Hair!" 💇',
  'shoulders': 'Hai tay chạm nhẹ lên hai đầu vai nhún nhẩy: "Shoulders!" 🤷',
  'knees': 'Hai tay cúi xuống vỗ nhẹ lên hai đầu gối: "Knees!" 🦵',
  'toes': 'Cúi người xuống chạm nhẹ vào các ngón chân: "Toes!" 👣',

  // ── Actions & Movements ────────────────────────────────────────────────────
  'run': 'Đánh tay chân nhịp nhàng chạy bước nhỏ tại chỗ thật nhanh: "Run!" 🏃',
  'jump': 'Khuỵu gối bật nhảy lên cao như chú thỏ con: "Jump!" 🦘',
  'dance': 'Hai tay lắc lư qua lại, xoay tròn theo điệu nhạc vui tươi: "Dance!" 💃',
  'sing': 'Một tay cầm micro vô hình say sưa cất tiếng hát: "Sing!" 🎤',
  'clap': 'Vỗ hai bàn tay vào nhau thật giòn giã: "Clap!" 👏',
  'sleep': 'Hai lòng bàn tay áp vào một bên má, nhắm mắt ngủ ngoan: "Sleep!" 😴',
  'eat': 'Bốc thìa vô hình đưa vào miệng nhai nhóp nhép thật ngon: "Eat!" 🥄',
  'drink': 'Cầm chiếc cốc vô hình nghiêng uống "Ực ực!": "Drink!" 🥤',
  'walk': 'Bước từng bước thong thả nhịp nhàng tại chỗ: "Walk!" 🚶',
  'stop': 'Giơ một bàn tay thẳng ra trước làm biển báo dừng lại: "Stop!" 🛑',
  'swim': 'Hai tay quạt nước như đang bơi lội tung tăng: "Swim!" 🏊',
  'fly': 'Dang hai tay sang hai bên lượn vòng như máy bay trên trời: "Fly!" ✈️',

  // ── Family & Emotions ──────────────────────────────────────────────────────
  'dad': 'Vuốt cằm như chú râu của bố và cười tươi: "Dad!" 👨',
  'father': 'Khoanh tay đứng oai phong như người cha mẫu mực: "Father!" 👨',
  'mom': 'Hai tay ôm vòng quanh người trao cái ôm ấm áp của mẹ: "Mom!" 👩',
  'mother': 'Hai tay ôm ấp dịu dàng như vòng tay của mẹ: "Mother!" 👩',
  'baby': 'Hai tay đung đưa qua lại ru em bé ngủ: "Baby!" 👶',
  'brother': 'Đập tay high-five với bạn bên cạnh: "Brother!" 🤜🤛',
  'sister': 'Nắm tay lắc lư cùng bạn vui vẻ: "Sister!" 👭',
  'happy': 'Hai tay giơ chữ V nở nụ cười rạng rỡ nhất: "Happy!" 😄',
  'sad': 'Hai tay lau nhẹ hai bên khóe mắt làm nũng: "Sad!" 😢',
  'angry': 'Hai tay chống hông, dậm chân giậm gót giả vờ giận hờn: "Angry!" 😠',

  // ── Food & Fruits ──────────────────────────────────────────────────────────
  'apple': 'Hai tay cầm quả táo tròn cắn một miếng giòn rụm "Rộp!": "Apple!" 🍎',
  'banana': 'Hai tay làm động tác bóc vỏ quả chuối rồi cắn: "Banana!" 🍌',
  'milk': 'Hai tay cầm bình sữa uống ngon lành: "Milk!" 🥛',
  'water': 'Chụm hai tay như hứng dòng nước mát lành rồi uống: "Water!" 💧',
  'bread': 'Hai tay bẻ đôi ổ bánh mì thơm phức đưa lên mũi ngửi: "Bread!" 🍞',
  'cake': 'Làm động tác thổi nến trên chiếc bánh sinh nhật: "Cake!" 🎂',

  // ── Nature & World ─────────────────────────────────────────────────────────
  'sun': 'Hai tay vươn cao vẽ một vòng tròn rực rỡ tỏa sáng trên trời: "Sun!" ☀️',
  'tree': 'Đứng thẳng người vươn hai tay lên cao làm cành lá đu đưa: "Tree!" 🌳',
  'flower': 'Hai cổ tay chụm lại, ngón tay xòe ra như bông hoa nở rộ: "Flower!" 🌸',
  'star': 'Mười ngón tay nhấp nháy trên cao như những vì sao lấp lánh: "Star!" ⭐',
  'car': 'Hai tay nắm vô lăng xoay qua xoay lại "Bíp bíp!": "Car!" 🚗',
  'ball': 'Hai tay ôm quả bóng tròn rồi làm động tác ném bóng lên cao: "Ball!" ⚽'
};

/**
 * Returns a vivid TPR movement string for any preschool vocabulary word.
 */
export function getPreschoolTprGesture(englishWord?: string, vietnameseWord?: string, aiGesture?: string): string {
  if (aiGesture && aiGesture.trim().length > 3) {
    return aiGesture.trim();
  }
  if (!englishWord) return '';

  const clean = englishWord.toLowerCase().trim();
  if (PRESCHOOL_TPR_MAP[clean]) {
    return PRESCHOOL_TPR_MAP[clean];
  }

  // Check partial key matches
  for (const [key, gesture] of Object.entries(PRESCHOOL_TPR_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return gesture;
    }
  }

  // Generative fallback for words not in map
  const name = vietnameseWord || englishWord;
  return `Hai tay làm động tác sinh động mô tả "${name}", cả lớp cùng nhún nhảy và hô to: "${englishWord}!" ✨`;
}

