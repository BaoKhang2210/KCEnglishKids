// Build a local, versioned vector library from pinned MIT-licensed Fluent artwork.
// First run needs public network access. Subsequent builds use the local source cache.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const cache = path.join(root, '.tmp/asset-source');
const output = path.join(root, 'client/public/images');
const revision = '1ffb34c752ecf5d402f04cfb4b392c77f57c54bc';
const { VOCABULARY_DATA } = require('../src/seeds/vocabularyData');
const { TOPICS_DATA } = require('../src/seeds/topicData');
const source = fs.readFileSync(path.join(__dirname, '../src/seeds/index.js'), 'utf8');
const base = vm.runInNewContext('(' + source.match(/const EMOJI_MAP = (\{[\s\S]*?\n\});/)[1] + ')');
const clean = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const key = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const glyphOverrides = { dog: '🐕', cat: '🐈', rabbit: '🐇', cow: '🐄', horse: '🐎', lion: '🦁', tiger: '🐅',
  beautiful: '🌺', art: '🎨', rainbow: '🌈', angry: '😠', blond: '👱', table: null, family: null, children: null, women: null, men: null,
  english: '🗣️', speak_english: '🗣️', listen_to_stories: '📖', play_in_the_playground: '🛝', paint_with_watercolors: '🎨' };
const scenes = {
  family: ['👨', '👩', '👧'], children: ['🧒', '👦'], women: ['👩', '👩‍🦰'], men: ['👨', '👨‍🦱'],
  listen_to_stories: ['📖', '👂'], play_with_friends: ['🧒', '⚽', '👧'], play_in_the_playground: ['🛝', '🧒'],
  tidy_up: ['🧒', '🧹'], eat_lunch: ['🧒', '🍱'], wash_my_face: ['🙂', '💧'], brush_my_hair: ['👧', '🪮'],
  eat_healthy_food: ['🧒', '🥦', '🍎'], put_on_a_jacket: ['🧒', '🧥'], drink_water: ['🧒', '🥛'],
  thirsty: ['😓', '💧'], hungry: ['😋', '🍽️'], tired: ['🥱', '🌙'], dirty: ['👕', '🟤'],
  living_room: ['🛋️', '💡'], dining_room: ['🍽️', '🪑'], kitchen: ['🍳', '🧊'], bedroom: ['🛏️', '💡'], bathroom: ['🛁', '🚿'],
  sweep_the_floor: ['🧒', '🧹'], set_the_table: ['🍽️', '🥄'], watch_tv: ['🧒', '📺'], make_the_bed: ['🛏️', '🧒'],
  feed_the_ducks: ['🦆', '🌾'], milk_the_cows: ['🐄', '🥛'], groom_the_horses: ['🐎', '🪮'], shear_the_sheep: ['🐑', '✂️'], collect_the_eggs: ['🥚', '🧺'],
  calf: ['🐄', '🐄'], lamb: ['🐑', '🐑'], duckling: ['🦆', '🦆'], foal: ['🐎', '🐎'],
  air: ['☁️', '✈️'], land: ['🌳', '🚗'], toy_store: ['🏪', '🧸'], fire_station: ['🏠', '🚒'], police_station: ['🏢', '🚓'],
  grocery_store: ['🏪', '🛒'], restaurant: ['🏪', '🍽️'], market: ['🏪', '🥕'],
  use_a_computer: ['🧒', '💻'], play_music: ['🎹', '🎵'], speak_english: ['🧒', '💬'], paint_with_watercolors: ['🎨', '🖌️'],
  read_books: ['🧒', '📚'], writing: ['✍️', '📄'], physical_education: ['🏃', '⚽'],
  jump_up_and_down: ['🧒', '⬆️', '⬇️'], shout_hooray: ['🙌', '🎉'],
  take_care_of_people: ['🩺', '🧒'], put_out_fires: ['🚒', '🔥'], cook_food: ['👩‍🍳', '🍳'], keep_people_safe: ['👮', '🛡️'],
  deliver_mail: ['✉️', '📬'], ring_up_groceries: ['🛒', '💳'], waiter: ['🧑', '🍽️'], menu: ['📋', '🍽️'],
  main_dish: ['🍽️', '🍗'], side_dish: ['🍽️', '🥗'], dessert: ['🍨', '🍓'], lemonade: ['🍋', '🥛'],
  get_up: ['🛏️', '☀️'], get_dressed: ['🧒', '👕'], have_breakfast: ['☀️', '🍳'], go_to_school: ['🧒', '🏫'], go_home: ['🧒', '🏠'], do_homework: ['✏️', '📖'],
  dance_class: ['💃', '🎵'], soccer_practice: ['🏃', '⚽'], music_lessons: ['🎹', '🎵'], swimming_lessons: ['🏊', '💧'],
  eat_dinner: ['🌙', '🍲'], take_a_bath: ['🛁', '🫧'], brush_teeth: ['🪥', '🦷'], put_on_pajamas: ['👕', '🌙'], read_a_book: ['🧒', '📖'], go_to_bed: ['🛏️', '🌙'],
  natural: ['🌳', '🌻', '🪨'], human_made: ['🏠', '🚗', '🧱'], cloth_bag: ['🛍️', '🧵'],
  sleeping_bag: ['🏕️', '🌙'], build_a_sandcastle: ['🏖️', '🏰'], make_a_campfire: ['🔥', '🪵'], go_on_rides: ['🎡', '🧒'],
  turn_on: ['💡', '✅'], turn_off: ['💡', '❌'], plant: ['🪴'], petals: ['🌸'], soil: ['🌱', '🟤'], seed: ['🌰'],
  roots: ['🌱'], stem: ['🌷'], beak: ['🐦'], wing: ['🪶'], tail: ['🐈'], trunk: ['🐘'], fin: ['🐟'], paw: ['🐾'],
  soft: ['🧸', '🪶'], rough: ['🪨'], smooth: ['🧊'], long: ['📏'], short: ['🧒'], tall: ['🧒'], thin: ['🧍'],
  breakfast: ['☀️', '🍳'], lunch: ['☀️', '🥪'], dinner: ['🌙', '🍲'], play_music: ['🎹', '🎵']
};
const colors = { red: '#EF4444', blue: '#3B82F6', yellow: '#FACC15', green: '#22C55E', pink: '#F472B6', purple: '#A855F7', brown: '#A16207', black: '#253248', white: '#F8FAFC', gray: '#94A3B8' };
const numbers = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, twenty: 20 };
const diagramKeys = new Set(['table', 'forehead', 'cheeks', 'elbow', 'knee', 'fingers', 'arms', 'legs', 'feet', 'head', 'hair', 'fin', 'beak', 'trunk', 'tail', 'wing', 'roots', 'stem', 'petals', 'curly', 'straight', 'long', 'short', 'tall', 'thin', 'peas', 'swing', 'seesaw', 'monkey_bars', 'watering_can', 'glue', 'glue_stick', 'raincoat', 'plastic_bag', 'cloth_bag', 'plastic_bottle', 'glass_bottle', 'soda_can', 'count', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
for (const item of ['fridge', 'towel', 'tricycle', 'sleeping_bag']) diagramKeys.add(item);
const topicGlyphs = {
  animals: ['🐕', '🐈', '🐇'], school: ['🏫', '📚', '✏️'], family: ['👨', '👩', '👧'], colors: ['🎨', '🖍️', '🌈'],
  numbers: ['🧮', '🔢', '⭐'], food: ['🍎', '🥕', '🥞'], toys: ['🧸', '🪁', '⚽'], body: ['🧒', '✋', '🦶'],
  feelings: ['😊', '😢', '😮'], nature: ['🌳', '🌷', '🦋'], weather: ['☀️', '🌧️', '☁️'], transport: ['🚌', '✈️', '⛵'],
  clothes: ['👕', '👗', '👟'], 'my-house': ['🏠', '🛋️', '🛏️'], actions: ['🏃', '💃', '🏊'],
  community: ['👨‍🚒', '👩‍⚕️', '👮'], routines: ['⏰', '🪥', '🛏️'], environment: ['🌳', '♻️', '🌱'], places: ['🏖️', '🏙️', '🏞️']
};
Object.assign(topicGlyphs, { 'my-body': topicGlyphs.body, transportation: topicGlyphs.transport, 'daily-routines': topicGlyphs.routines,
  senses: ['👀', '👂', '👃'], vacation: ['🏖️', '⛺', '🎡'] });
const extra = ['🦁', '🐯', '🐼', '🚀', '🏆', '🌈', '⭐', '🦄', '🦖', '🍎', '🎨', '🐬', '👑', '🎈', '🍓', '🦊', '🐻', '🐰', '👍', '✋', '💬', '❓', '💡'];
const unicodeNames = new Map();
const catalogFile = path.join(__dirname, 'learning_art_sources.json');
const catalog = fs.existsSync(catalogFile) ? JSON.parse(fs.readFileSync(catalogFile, 'utf8')) : null;
for (const item of catalog?.glyphs || []) unicodeNames.set(item.emoji.replace(/\uFE0F/g, ''), item.name);
for (const line of (fs.existsSync(path.join(cache, 'unicode-emoji-test.txt')) ? fs.readFileSync(path.join(cache, 'unicode-emoji-test.txt'), 'utf8') : '').split('\n')) {
  const match = /^([A-F0-9 ]+)\s*;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/.exec(line);
  if (match) unicodeNames.set(match[2].replace(/\uFE0F/g, ''), match[3]);
}
const flat = (fs.existsSync(path.join(cache, 'fluent-tree.json')) ? JSON.parse(fs.readFileSync(path.join(cache, 'fluent-tree.json'), 'utf8')).tree : []).filter(t => /\/Flat\/.*\.svg$/.test(t.path) && !/\/(Dark|Light|Medium|Medium-Dark|Medium-Light)\//.test(t.path));
const byName = new Map(flat.map(t => [clean(t.path.split('/')[1]), t.path]));
const nameAliases = { 'enraged face': 'Pouting face', 'person: blond hair': 'Person blonde hair' };
const glyphFor = v => { const k = key(v.normalizedText); return Object.hasOwn(glyphOverrides, k) ? glyphOverrides[k] : base[k] || base[k.split('_')[0]]; };
const required = new Set([...VOCABULARY_DATA.filter(v => !diagramKeys.has(key(v.normalizedText)) && !colors[key(v.normalizedText)] && !numbers[key(v.normalizedText)]).flatMap(v => scenes[key(v.normalizedText)] || [glyphFor(v)]), ...Object.values(topicGlyphs).flat(), ...extra]);
const files = new Map(); const unresolved = [];
for (const emoji of required) {
  if (!emoji) { unresolved.push('[missing mapping]'); continue; }
  const name = unicodeNames.get(emoji.replace(/\uFE0F/g, ''));
  const file = catalog?.glyphs.find(item => item.emoji === emoji)?.path || byName.get(clean(nameAliases[name] || name || ''));
  if (file) files.set(emoji, file); else unresolved.push(`${emoji} (${name})`);
}
const glyphs = new Map(); let serial = 0;
function glyph(emoji, x = 32, y = 32, width = 256, height = width) {
  const raw = glyphs.get(emoji); if (!raw) throw new Error(`Missing glyph ${emoji}`);
  const prefix = 'g' + serial++ + '_';
  const normalized = raw.replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`).replace(/url\(#([^\)]+)\)/g, (_, id) => `url(#${prefix}${id})`);
  return normalized.replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(width|height|x|y)="[^"]*"/g, '').replace('>', ` x="${x}" y="${y}" width="${width}" height="${height}">`));
}
const wrap = (label, body, w = 320, h = 320) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img"><title>${esc(label)}</title>${body}</svg>`;
function composition(items, baby = false) {
  if (items.length === 1) return glyph(items[0]);
  if (baby) return glyph(items[0], 0, 30, 240) + glyph(items[1], 170, 155, 135);
  if (items.length === 2) return glyph(items[0], 5, 35, 215) + glyph(items[1], 165, 150, 145);
  return glyph(items[0], 0, 70, 150) + glyph(items[1], 87, 20, 155) + glyph(items[2], 175, 125, 140);
}
const line = (d, stroke = '#475569', width = 12) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, fill, radius = 12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
function diagram(k) {
  if (k === 'fridge') return rect(70, 25, 180, 265, '#BAE6FD', 22) + rect(85, 40, 150, 85, '#E0F2FE', 12) + rect(85, 135, 150, 140, '#E0F2FE', 12) + rect(95, 65, 9, 35, '#64748B', 4) + rect(95, 155, 9, 50, '#64748B', 4);
  if (k === 'towel') return rect(65, 45, 190, 230, '#7DD3FC', 18) + rect(65, 90, 190, 15, '#E0F2FE', 0) + rect(65, 215, 190, 15, '#E0F2FE', 0) + line('M80 267V286M105 267V286M130 267V286M155 267V286M180 267V286M205 267V286M230 267V286', '#38BDF8', 7);
  if (k === 'sleeping_bag') return rect(65, 30, 190, 265, '#38BDF8', 65) + `<ellipse cx="160" cy="80" rx="65" ry="35" fill="#334155"/><ellipse cx="160" cy="87" rx="50" ry="22" fill="#E0F2FE"/>` + line('M90 140Q160 165 230 140M80 190Q160 215 240 190M85 240Q160 260 235 240', '#0EA5E9', 7) + line('M215 115V250', '#FDE68A', 5);
  if (k === 'tricycle') return [70, 175, 255].map((x, i) => `<circle cx="${x}" cy="${i === 2 ? 210 : 235}" r="${i === 2 ? 47 : 29}" fill="#475569"/><circle cx="${x}" cy="${i === 2 ? 210 : 235}" r="${i === 2 ? 29 : 15}" fill="#BAE6FD"/>`).join('') + line('M70 235L140 220L175 235M140 220L155 155L245 180L255 210M245 180L225 110H195', '#F97316', 15) + rect(125, 140, 70, 20, '#38BDF8', 10);
  if (k === 'table') return rect(40, 95, 240, 45, '#D9954C') + rect(60, 135, 25, 140, '#A96A38') + rect(235, 135, 25, 140, '#A96A38') + rect(40, 80, 240, 35, '#F9C679');
  if (['short', 'tall', 'thin'].includes(k)) return `<path d="M45 280H275" stroke="#D6E4EE" stroke-width="8"/>` + glyph('🧒', k === 'short' ? 15 : 75, k === 'short' ? 120 : 20, k === 'thin' ? 150 : k === 'short' ? 160 : 230, k === 'short' ? 160 : 260) + line(`M${k === 'short' ? 245 : 40} 60V275`, '#14B8A6', 6);
  if (k === 'long') return line('M45 185H275', '#F59E0B', 32) + line('M45 140V225M275 140V225', '#475569', 5);
  if (k === 'curly') return line('M55 240C10 90 175 10 120 140S230 310 265 100', '#A16207', 24);
  if (k === 'straight') return line('M65 250L255 60', '#A16207', 24);
  if (k === 'peas') return `<path d="M35 205Q130 35 285 110Q225 285 35 205" fill="#22A06B"/>` + [90, 145, 200, 248].map((x, i) => `<circle cx="${x}" cy="${180 - i * 17}" r="24" fill="#AAE46D"/>`).join('');
  if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(k)) return rect(35, 55, 250, 225, '#EAF4FF', 25) + rect(35, 55, 250, 55, '#38BDF8', 18) + line('M85 40V80M235 40V80', '#475569', 12) + Array.from({ length: 5 }, (_, i) => rect(55 + i * 44, 145, 34, 60, i === ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(k) ? '#F59E0B' : '#CBDDEE', 12)).join('');
  if (k === 'count') return Array.from({ length: 10 }, (_, i) => `<circle cx="${55 + (i % 5) * 53}" cy="${110 + Math.floor(i / 5) * 95}" r="21" fill="${['#FB7185', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA'][i % 5]}"/>`).join('');
  if (['glue', 'glue_stick'].includes(k)) return rect(110, 75, 100, 190, '#BAE6FD', 18) + rect(110, 40, 100, 55, '#F97316') + rect(123, 128, 74, 80, '#FFF7ED') + `<path d="M160 140Q110 190 160 195Q210 190 160 140" fill="#FBBF24"/>`;
  if (['plastic_bottle', 'glass_bottle', 'soda_can'].includes(k)) return k === 'soda_can' ? rect(85, 60, 150, 210, '#38BDF8', 24) + rect(85, 55, 150, 30, '#94A3B8', 18) + `<ellipse cx="160" cy="68" rx="30" ry="7" fill="#475569"/>` : `<path d="M130 45H190V100Q235 110 235 155V265Q160 290 85 265V155Q85 110 130 100Z" fill="${k === 'glass_bottle' ? '#77BCA2' : '#BAE6FD'}" stroke="#4F9CAE" stroke-width="5"/>` + rect(125, 30, 70, 25, '#38BDF8') + rect(85, 170, 150, 55, '#FDE68A', 5);
  if (['plastic_bag', 'cloth_bag'].includes(k)) return line('M110 110V75Q160 10 210 75V110', '#EC4899', 17) + `<path d="M65 100H255L275 275H45Z" fill="${k === 'cloth_bag' ? '#FDE68A' : '#BAE6FD'}" stroke="#F59E0B" stroke-width="5"/>` + (k === 'cloth_bag' ? line('M80 130L240 250M240 130L80 250', '#F5CA70', 4) : '');
  if (k === 'raincoat') return `<path d="M110 80Q160 0 210 80L265 135L230 185L210 155V280H110V155L90 185L55 135Z" fill="#FACC15" stroke="#E49B16" stroke-width="6"/>` + line('M160 110V280', '#F8FAFC', 5) + rect(115, 200, 30, 25, '#EAB308') + rect(175, 200, 30, 25, '#EAB308');
  if (['swing', 'seesaw', 'monkey_bars'].includes(k)) {
    if (k === 'seesaw') return `<path d="M130 270L160 190L190 270Z" fill="#38BDF8"/>` + line('M40 120L280 210', '#FB923C', 25) + line('M70 100V135M250 170V205', '#475569', 8);
    return line('M35 280L85 50H235L285 280', '#38BDF8', 15) + (k === 'swing' ? line('M110 60V210M210 60V210', '#64748B', 7) + rect(95, 200, 130, 25, '#F59E0B') : [90, 135, 180, 225].map(x => line(`M${x} 60V190`, '#F59E0B', 12)).join(''));
  }
  if (k === 'watering_can') return rect(80, 115, 140, 150, '#34D399', 30) + `<path d="M95 125Q10 10 205 75" fill="none" stroke="#059669" stroke-width="18"/>` + `<path d="M210 155L265 95L290 115L225 230" fill="#34D399"/>` + [260, 280, 300].map((x, i) => `<ellipse cx="${x}" cy="${150 + i * 28}" rx="6" ry="11" fill="#38BDF8"/>`).join('');
  if (['forehead', 'cheeks', 'head', 'hair'].includes(k)) return `<ellipse cx="160" cy="170" rx="96" ry="112" fill="#F5C8A4"/><path d="M65 125Q55 25 165 35Q270 35 255 130L220 90L180 110L125 75Z" fill="#8B5938"/><circle cx="125" cy="165" r="9" fill="#334155"/><circle cx="195" cy="165" r="9" fill="#334155"/>` + line('M135 220Q160 240 185 220', '#8B5938', 7) + (k === 'forehead' ? rect(110, 112, 100, 28, '#FB7185', 14) : k === 'cheeks' ? `<circle cx="95" cy="200" r="22" fill="#FB7185"/><circle cx="225" cy="200" r="22" fill="#FB7185"/>` : k === 'hair' ? line('M80 95Q155 15 240 95', '#F59E0B', 10) : '');
  if (['elbow', 'knee', 'arms', 'legs', 'feet', 'fingers'].includes(k)) {
    if (k === 'feet') return glyph('🦶', 30, 30, 245) + glyph('🦶', 160, 155, 130);
    if (k === 'fingers') return glyph('🖐️', 30, 30, 260) + `<circle cx="158" cy="45" r="19" fill="#FB7185" opacity=".8"/>`;
    const d = ['elbow', 'arms'].includes(k) ? 'M65 70V190H250' : 'M95 55L195 160V270';
    return line(d, '#F0B98D', 58) + line(d, '#F8D4B5', 38) + `<circle cx="${['elbow', 'arms'].includes(k) ? 65 : 195}" cy="${['elbow', 'arms'].includes(k) ? 190 : 160}" r="26" fill="#FB7185"/>`;
  }
  if (['roots', 'stem', 'petals'].includes(k)) return line('M160 90V220', k === 'stem' ? '#F59E0B' : '#22C55E', 17) + `<ellipse cx="123" cy="165" rx="45" ry="18" transform="rotate(30 123 165)" fill="#4ADE80"/>` + line('M160 220L105 275M160 220V285M160 220L210 275', k === 'roots' ? '#F59E0B' : '#A16207', 12) + [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="160" cy="60" rx="20" ry="35" fill="${k === 'petals' ? '#FB7185' : '#C084FC'}" transform="rotate(${a} 160 90)"/>`).join('') + `<circle cx="160" cy="90" r="24" fill="#FACC15"/>`;
  if (k === 'beak') return `<path d="M70 75Q200 40 220 130L285 165L220 195Q160 290 65 220Z" fill="#38BDF8"/><path d="M215 125L290 165L215 190Z" fill="#FB923C"/><circle cx="180" cy="115" r="13" fill="#253248"/>`;
  if (k === 'fin') return `<path d="M70 230L170 70Q200 120 220 230Z" fill="#38BDF8" stroke="#0284C7" stroke-width="7"/>` + line('M95 225L165 105M130 225L175 125M165 225L185 155', '#7DD3FC', 5);
  if (k === 'trunk') return `<path d="M95 65Q180 30 215 75L205 195Q200 260 115 255Q65 250 70 210" fill="none" stroke="#94A3B8" stroke-width="70" stroke-linecap="round"/>` + line('M155 145L205 150M150 175L200 180M130 210L165 235', '#64748B', 7);
  if (k === 'tail') return line('M90 260Q245 260 235 130Q235 30 170 50', '#F59E0B', 50) + line('M225 145L245 130M210 195L240 185', '#A16207', 12);
  if (k === 'wing') return `<path d="M65 255Q40 120 255 50Q270 85 195 130Q260 95 260 135Q260 165 185 185Q250 170 235 205Q215 255 65 255" fill="#E0F2FE" stroke="#38BDF8" stroke-width="7"/>`;
  throw new Error(`Diagram missing: ${k}`);
}

async function main() {
  if (unresolved.length) throw new Error('Unmapped Fluent artwork: ' + unresolved.join(', '));
  fs.mkdirSync(path.join(cache, 'fluent'), { recursive: true });
  const queue = [...files.entries()];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const [emoji, filename] = queue.shift();
      const local = path.join(cache, 'fluent', crypto.createHash('sha256').update(filename).digest('hex') + '.svg');
      if (!fs.existsSync(local)) {
        const url = `https://raw.githubusercontent.com/microsoft/fluentui-emoji/${revision}/${filename.split('/').map(encodeURIComponent).join('/')}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`Asset HTTP ${response.status}: ${filename}`);
        const svg = await response.text(); if (!svg.includes('<svg') || /<script\b|<foreignObject\b/.test(svg)) throw new Error('Unexpected SVG content');
        fs.writeFileSync(local, svg);
      }
      glyphs.set(emoji, fs.readFileSync(local, 'utf8'));
    }
  }));
  for (const dir of ['vocabulary', 'animations', 'topics', 'symbols', 'licenses']) fs.mkdirSync(path.join(output, dir), { recursive: true });
  const manifest = { version: 'learning-art-v1', source: 'Microsoft Fluent Emoji + KCEnglishKids educational compositions', revision, license: 'MIT', vocabulary: {}, topics: {}, symbols: {} };
  for (const v of VOCABULARY_DATA) {
    const k = key(v.normalizedText); let body; let type = 'symbol';
    if (colors[k]) { type = 'color'; body = `<path d="M85 50Q180 15 250 75Q300 150 245 240Q150 300 75 250Q15 155 85 50" fill="${colors[k]}" stroke="${k === 'white' ? '#CBD5E1' : colors[k]}" stroke-width="8"/><ellipse cx="115" cy="95" rx="32" ry="18" fill="white" opacity=".35" transform="rotate(-30 115 95)"/>`; }
    else if (numbers[k]) { type = 'number'; const n = numbers[k], cols = n <= 3 ? n : n <= 8 ? 4 : 5, rows = Math.ceil(n / cols), size = Math.min(90, 260 / cols, 260 / rows); body = Array.from({ length: n }, (_, i) => `<circle cx="${160 - (cols - 1) * size / 2 + i % cols * size}" cy="${160 - (rows - 1) * size / 2 + Math.floor(i / cols) * size}" r="${size * .34}" fill="${['#FB7185', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA'][i % 5]}"/>`).join(''); }
    else if (diagramKeys.has(k)) { type = 'diagram'; body = diagram(k); }
    else if (scenes[k]) { type = 'scene'; body = composition(scenes[k], ['calf', 'lamb', 'duckling', 'foal'].includes(k)); }
    else body = glyph(glyphFor(v));
    const file = `/images/vocabulary/${k}-v1.svg`;
    fs.writeFileSync(path.join(root, 'client/public', file), wrap(v.en, body));
    const animationUrl = `/images/animations/${k}-v1.svg`;
    fs.writeFileSync(path.join(root, 'client/public', animationUrl), wrap(v.en, '<style>@media(prefers-reduced-motion:no-preference){.art{transform-origin:160px 210px;animation:float 3.2s ease-in-out infinite}@keyframes float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(2deg)}}}</style><g class="art">' + body + '</g>'));
    manifest.vocabulary[k] = { english: v.en, url: file, animationUrl, isTransparent: type === 'symbol' && !['verb', 'phrase', 'adjective'].includes(v.pos), visualType: type === 'scene' || ['verb', 'phrase', 'adjective'].includes(v.pos) ? 'abstract' : 'concrete', kind: type };
  }
  for (const topic of TOPICS_DATA) {
    const items = topicGlyphs[topic.slug]; if (!items) throw new Error('Missing topic ' + topic.slug);
    const body = `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${topic.colorCode}" stop-opacity=".16"/><stop offset="1" stop-color="#FFFDF6"/></linearGradient></defs><rect width="640" height="400" rx="38" fill="url(#sky)"/><circle cx="555" cy="65" r="33" fill="#FDE68A"/><path d="M0 315Q175 235 350 320Q500 255 640 300V400H0Z" fill="${topic.colorCode}" opacity=".18"/>` + glyph(items[0], 25, 65, 275) + glyph(items[1], 265, 115, 190) + glyph(items[2], 440, 100, 175);
    const file = `/images/topics/${topic.slug}-v1.svg`;
    fs.writeFileSync(path.join(root, 'client/public', file), wrap(topic.englishName, body, 640, 400)); manifest.topics[topic.slug] = { url: file, isTransparent: false };
  }
  for (const emoji of new Set([...extra, ...required])) {
    const k = [...emoji].map(c => c.codePointAt(0).toString(16)).join('-');
    const file = `/images/symbols/${k}.svg`; fs.writeFileSync(path.join(root, 'client/public', file), wrap(unicodeNames.get(emoji.replace(/\uFE0F/g, '')) || 'Illustration', glyph(emoji)));
    manifest.symbols[emoji] = file;
  }
  if (fs.existsSync(path.join(cache, 'fluent-license.txt'))) fs.copyFileSync(path.join(cache, 'fluent-license.txt'), path.join(output, 'licenses/fluent-emoji-MIT.txt'));
  if (!fs.existsSync(path.join(output, 'licenses/fluent-emoji-MIT.txt'))) throw new Error('The Fluent MIT license must be included.');
  fs.writeFileSync(catalogFile, JSON.stringify({ revision, glyphs: [...files].map(([emoji, path]) => ({ emoji, path, name: unicodeNames.get(emoji.replace(/\uFE0F/g, '')) })) }, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'client/src/data/learningArt.ts'), '// Generated by build_learning_assets.js. Fluent artwork: MIT; see public/images/licenses.\nexport const learningArt = ' + JSON.stringify({ vocabulary: manifest.vocabulary, topics: manifest.topics, symbols: manifest.symbols }) + ' as const;\n');
  console.log(JSON.stringify({ vocabulary: Object.keys(manifest.vocabulary).length, topics: Object.keys(manifest.topics).length, symbols: Object.keys(manifest.symbols).length, output }));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
