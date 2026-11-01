// Semantic corrections identified by reviewing all 409 vocabulary illustrations.
// Native SVG drawings use the same 320 x 320 canvas as the existing artwork.
function vocabularyArtOverride(k, { glyph, rect, line }) {
  const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const arrow = (x, y, tx, ty) => line(`M${x} ${y}L${tx} ${ty}`, '#E11D48', 8) + circle(tx, ty, 11, '#E11D48');
  const paper = () => rect(55, 70, 205, 205, '#F8FAFC', 16) + line('M75 70H235M55 90V250M75 275H235M260 90V250', '#CBD5E1', 4);
  const person = (pose = 'jump', shirt = '#0EA5E9') => {
    const head = circle(160, 60, 32, '#F5C8A4') + `<path d="M129 51Q140 9 181 32L193 55Q167 35 129 51" fill="#70452A"/>`;
    const body = line('M160 100V162', shirt, 43);
    const limbs = pose === 'kick' ? 'M145 160L110 255M174 165L230 190L275 190M143 105L105 155M178 110L220 145' : 'M145 160L105 215M175 160L218 215M140 105L95 77M180 105L225 77';
    return head + body + line(limbs, '#334155', 19) + line('M65 285H255', '#CBD5E1', 5);
  };
  const bowl = (liquid, food) => `<ellipse cx="160" cy="160" rx="118" ry="58" fill="#E2E8F0"/><path d="M42 162Q50 280 160 278Q270 280 278 162Z" fill="#0EA5E9"/><ellipse cx="160" cy="160" rx="104" ry="45" fill="${liquid}"/>${food}`;
  const hand = `<path d="M105 270V205L70 155Q58 137 73 128Q87 123 108 154V66Q108 47 123 47Q138 47 138 66V133V42Q138 22 154 22Q170 22 170 42V129V52Q170 32 186 32Q201 32 201 52V136V81Q201 64 216 64Q231 64 231 81V198Q231 252 203 270Z" fill="#FBBF5B" stroke="#D99B39" stroke-width="4"/>`;
  if (['aunt', 'uncle', 'cousin', 'brother', 'sister'].includes(k)) {
    const sibling = ['brother', 'sister'].includes(k);
    const target = sibling ? [240, 230] : k === 'cousin' ? [240, 245] : [240, 100];
    const tree = line(sibling ? 'M160 95V160M80 160H240M80 160V200M240 160V200' : 'M80 115H240M80 115V205M240 115V205', '#94A3B8', 7);
    return tree + circle(target[0], target[1], 52, '#FEF3C7') + (sibling ? glyph('👨', 120, 10, 80) + glyph('🧒', 30, 195, 95) + glyph(k === 'sister' ? '👧' : '👨', 195, 185, 95) : glyph('👨', 35, 25, 90) + glyph(k === 'aunt' ? '👩' : '👨', 195, 25, 90) + glyph('🧒', 35, 205, 90) + glyph('👧', 195, 205, 90)) + arrow(285, 160, ...target);
  }
  if (['leo', 'tickles', 'mia'].includes(k)) return glyph({ leo: '🦁', tickles: '🐱', mia: '👧' }[k], 30, 5, 245) + rect(90, 222, 150, 75, { leo: '#38BDF8', tickles: '#FBBF24', mia: '#F472B6' }[k], 8) + line('M165 228V292', '#FFF7ED', 5);
  if (k === 'playground') return glyph('🛝', 0, 45, 210) + line('M210 260V70H290V260M250 70V185', '#38BDF8', 9) + rect(225, 180, 50, 13, '#F59E0B', 3) + `<path d="M0 285H320V320H0Z" fill="#BBF7D0"/>`;
  if (k === 'blocks') return rect(30, 185, 115, 90, '#F87171') + rect(150, 185, 135, 90, '#38BDF8') + rect(90, 88, 135, 90, '#FBBF24') + [55, 100].map(x => rect(x, 170, 25, 18, '#DC2626', 4)).join('') + [175, 225].map(x => rect(x, 170, 25, 18, '#0284C7', 4)).join('') + [115, 165].map(x => rect(x, 73, 25, 18, '#F59E0B', 4)).join('');
  if (k === 'crawl') return circle(235, 115, 34, '#F5C8A4') + line('M94 150L180 142', '#38BDF8', 55) + line('M190 160L220 232L262 232M110 170L75 222L34 222M136 175L152 225L184 225', '#F5C8A4', 21) + line('M30 268H290', '#CBD5E1', 5) + circle(247, 111, 4, '#334155');
  if (k === 'jump') return person() + line('M61 230V160M48 175L61 160L74 175M259 230V160M246 175L259 160L272 175', '#F59E0B', 7);
  if (k === 'kick') return person('kick') + glyph('⚽', 220, 190, 85);
  if (k === 'grass') return `<path d="M20 285Q24 180 35 135Q55 193 58 233Q64 126 83 72Q105 167 105 225Q119 129 142 95Q148 180 154 240Q171 103 190 60Q206 168 208 233Q232 139 252 117Q252 221 265 253L285 183L300 285Z" fill="#22A55A"/>`;
  if (k === 'park') return glyph('🌳', 0, 15, 150) + glyph('🌳', 180, 15, 140) + `<path d="M0 265Q160 190 320 265V320H0Z" fill="#BBF7D0"/>` + rect(85, 165, 150, 28, '#B77936') + rect(85, 202, 150, 25, '#D9A45E') + line('M100 224V274M220 224V274', '#64748B', 13) + `<path d="M150 280L100 320H220L173 280" fill="#F5DEB3"/>`;
  if (k === 'orange_juice') return `<path d="M100 58H242L222 278H120Z" fill="#E0F2FE" stroke="#7DD3FC" stroke-width="6"/><path d="M110 120H232L218 268H125Z" fill="#FB923C"/><ellipse cx="171" cy="121" rx="61" ry="14" fill="#FDBA74"/>` + glyph('🍊', 7, 180, 125);
  if (k === 'skirt') return rect(97, 55, 126, 30, '#2563EB', 5) + `<path d="M98 85H222L283 270Q160 301 37 270Z" fill="#60A5FA" stroke="#2563EB" stroke-width="6"/>` + line('M125 90L105 275M160 90V280M195 90L215 275', '#BFDBFE', 7);
  if (k === 'sweater') return `<path d="M111 58L75 75L22 155L65 184L94 144V272H226V144L255 184L298 155L245 75L209 58Q160 110 111 58Z" fill="#0D9488" stroke="#0F766E" stroke-width="5"/>` + line('M99 194H221M99 221H221', '#99F6E4', 12) + rect(96, 258, 128, 25, '#115E59', 3);
  if (k === 'soup') return bowl('#FBBF24', circle(110, 155, 13, '#F97316') + circle(195, 144, 14, '#22C55E') + circle(160, 177, 10, '#F97316') + circle(223, 168, 9, '#22C55E')) + line('M102 91Q83 66 107 42M165 87Q145 60 168 30M225 91Q206 66 230 42', '#94A3B8', 8);
  if (k === 'cereal') return bowl('#FFF7ED', [75, 110, 150, 190, 225].map((x, i) => `<ellipse cx="${x}" cy="${145 + i % 2 * 24}" rx="18" ry="10" fill="#D69E45" transform="rotate(-25 ${x} 155)"/>`).join('')) + line('M242 135L280 49', '#64748B', 14);
  if (k === 'party_hat') return `<path d="M160 35L55 275Q160 310 265 275Z" fill="#A78BFA" stroke="#7C3AED" stroke-width="6"/><path d="M111 150L195 126L215 172L88 204Z" fill="#FBBF24"/>` + circle(160, 35, 25, '#F472B6') + circle(133, 235, 13, '#F472B6') + circle(208, 235, 13, '#38BDF8');
  if (k === 'jump_rope') return line('M75 80C-10 300 330 300 245 80', '#F97316', 10) + `<g transform="rotate(12 70 80)">${rect(57, 30, 27, 95, '#2563EB')}</g><g transform="rotate(-12 250 80)">${rect(237, 30, 27, 95, '#2563EB')}</g>`;
  if (k === 'shovel') return `<path d="M128 30H192V66Q160 103 128 66Z" fill="none" stroke="#8B5938" stroke-width="15"/>` + rect(151, 80, 18, 135, '#B77936', 3) + `<path d="M112 200H208V252L160 297L112 252Z" fill="#94A3B8" stroke="#475569" stroke-width="6"/>` + line('M160 218V275', '#CBD5E1', 6);
  if (k === 'monkey_bars') return line('M55 270V93L242 47V237M105 280V125L290 80V268M55 93L105 125M242 47L290 80', '#0284C7', 13) + [0, 1, 2, 3, 4].map(i => line(`M${55 + i * 47} ${93 - i * 11.5}L${105 + i * 46.25} ${125 - i * 11.25}`, '#F59E0B', 10)).join('');
  if (k === 'arms') return rect(113, 95, 94, 155, '#CBD5E1') + line('M110 112L65 145L33 220M210 112L255 145L287 220', '#F5C8A4', 29) + circle(33, 225, 20, '#F5C8A4') + circle(287, 225, 20, '#F5C8A4');
  if (k === 'legs') return rect(75, 40, 170, 62, '#94A3B8') + line('M115 100L108 260M205 100L212 260', '#F5C8A4', 45) + line('M108 270L68 275M212 270L252 275', '#F5C8A4', 32);
  if (k === 'feet') return `<g transform="translate(10 10) scale(.46 .9)"><path d="M130 52Q62 70 68 160L88 262Q148 293 214 258L216 138Q253 124 248 95Q235 66 209 80Q188 23 166 45Q143 9 130 52Z" fill="#F5C8A4"/></g><g transform="translate(307 10) scale(-.46 .9)"><path d="M130 52Q62 70 68 160L88 262Q148 293 214 258L216 138Q253 124 248 95Q235 66 209 80Q188 23 166 45Q143 9 130 52Z" fill="#F5C8A4"/></g>`;
  if (k === 'fingers') return hand + [ [80, 140], [123, 62], [154, 38], [186, 48], [216, 80] ].map(([x, y]) => circle(x, y, 12, '#FB7185')).join('');
  if (k === 'hands') return `<g transform="translate(0 42) scale(.65 .8)">${hand}</g><g transform="translate(320 42) scale(-.65 .8)">${hand}</g>`;
  if (['short', 'tall', 'thin'].includes(k)) {
    const figure = (x, h, w, color) => circle(x, 275 - h, 22, '#F5C8A4') + rect(x - w / 2, 303 - h, w, h - 80, color, 15) + line(`M${x - 12} 230V278M${x + 12} 230V278`, color, 15);
    const left = k === 'short' ? figure(85, 145, 48, '#0EA5E9') : figure(85, 205, k === 'thin' ? 30 : 48, '#0EA5E9');
    return line('M25 290H295', '#CBD5E1', 6) + left + figure(240, k === 'tall' ? 145 : 205, 60, '#CBD5E1') + arrow(25, 55, 77, k === 'short' ? 133 : 76);
  }
  if (k === 'draw') return paper() + line('M80 207L120 150L170 205L220 125', '#0EA5E9', 8) + `<g transform="translate(190 75) rotate(38)">${rect(0, 0, 28, 130, '#FBBF24', 4)}<path d="M0 130H28L14 159Z" fill="#A16207"/></g>`;
  if (k === 'color') return paper() + circle(138, 170, 58, '#FCA5A5') + circle(205, 205, 35, '#93C5FD') + `<g transform="translate(230 30) rotate(28)">${rect(0, 0, 27, 155, '#22C55E', 4)}<path d="M0 155H27L13.5 180Z" fill="#15803D"/></g>`;
  if (k === 'cut') return paper() + line('M80 112H230M80 122H155', '#CBD5E1', 4) + glyph('✂️', 90, 130, 160);
  if (k === 'hike') return glyph('⛰️', 0, 0, 240) + `<g transform="translate(70 50) scale(.7)">${person('kick', '#F97316')}${rect(85, 103, 45, 75, '#22C55E')}</g>`;
  if (k === 'chocolate_cake') return `<ellipse cx="160" cy="258" rx="130" ry="23" fill="#E2E8F0"/>` + rect(45, 125, 230, 130, '#8B4513') + rect(45, 167, 230, 22, '#F9D6A0', 1) + rect(45, 210, 230, 15, '#F9D6A0', 1) + `<ellipse cx="160" cy="125" rx="115" ry="35" fill="#4A2514"/>` + [90, 135, 180, 225].map(x => circle(x, 111 + x % 2 * 10, 13, '#7C3F20')).join('');
  if (k === 'glue_stick') return rect(115, 115, 90, 165, '#38BDF8', 8) + rect(125, 72, 70, 55, '#FFF7ED', 5) + rect(112, 258, 96, 26, '#2563EB', 4) + `<g transform="translate(-65 -35) rotate(-20 160 120)">${rect(115, 85, 90, 78, '#F97316', 8)}</g>`;
  if (k === 'cashier') return glyph('👨', 20, 10, 180) + rect(20, 210, 280, 70, '#B77936') + rect(170, 115, 110, 85, '#475569') + rect(182, 127, 86, 47, '#A7F3D0') + rect(165, 195, 125, 25, '#64748B') + [0, 1, 2].map(i => rect(180 + i * 30, 180, 15, 10, '#E2E8F0', 2)).join('');
  if (k === 'mail_carrier') return glyph('👨', 20, 0, 220) + rect(25, 185, 170, 100, '#2563EB', 10) + `<path d="M37 190L180 280" stroke="#A16207" stroke-width="15"/>` + rect(185, 172, 115, 80, '#FFF7ED', 4) + line('M188 177L242 215L295 177', '#D6A76F', 5);
  if (k === 'bored') return circle(160, 160, 108, '#FBBF24') + line('M100 145H135M187 145H222', '#6B4423', 9) + line('M127 220H194', '#6B4423', 8) + circle(263, 55, 38, '#E2E8F0') + line('M263 30V55L281 67', '#64748B', 5);
  if (k === 'scream') return circle(150, 158, 101, '#FBBF24') + circle(117, 128, 12, '#6B4423') + circle(188, 128, 12, '#6B4423') + `<ellipse cx="153" cy="210" rx="27" ry="43" fill="#9F1239"/>` + line('M265 150Q293 180 265 210M285 130Q326 180 285 230', '#F97316', 8);
  if (k === 'shy') return circle(160, 145, 96, '#F5C8A4') + circle(122, 137, 7, '#6B4423') + circle(198, 137, 7, '#6B4423') + circle(105, 166, 21, '#FB7185') + circle(215, 166, 21, '#FB7185') + line('M70 272L138 190M250 272L181 190', '#F5C8A4', 34) + circle(140, 185, 24, '#FBD7B9') + circle(180, 185, 24, '#FBD7B9');
  if (k === 'board_game') return rect(30, 50, 260, 220, '#A16207', 12) + Array.from({ length: 25 }, (_, i) => rect(42 + i % 5 * 47, 63 + Math.floor(i / 5) * 38, 47, 38, i % 2 ? '#FEF3C7' : '#0F766E', 0)).join('') + circle(115, 119, 16, '#F87171') + circle(209, 195, 16, '#FBBF24');
  if (k === 'bananas') return `<g transform="translate(-30 25) rotate(-15 160 150)">${glyph('🍌', 30, 35, 240)}</g><g transform="translate(40 0) rotate(18 160 150)">${glyph('🍌', 30, 35, 240)}</g>`;
  if (['boots', 'shoes'].includes(k)) {
    const emoji = k === 'boots' ? '👢' : '👟';
    return glyph(emoji, 0, 65, 190) + glyph(emoji, 140, 40, 180);
  }
  if (['roots', 'stem', 'petals'].includes(k)) {
    const target = { roots: [160, 254], stem: [160, 166], petals: [130, 68] }[k];
    const flower = line('M160 110V228', k === 'stem' ? '#F97316' : '#94A3B8', 15) + line('M160 228L95 282M160 228V290M160 228L220 282', k === 'roots' ? '#F97316' : '#CBD5E1', 12) + [0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="160" cy="56" rx="18" ry="33" fill="${k === 'petals' ? '#F472B6' : '#CBD5E1'}" transform="rotate(${a} 160 88)"/>`).join('') + circle(160, 88, 25, '#FBBF24');
    return flower + arrow(285, k === 'petals' ? 50 : 180, ...target);
  }
  return null;
}
module.exports = { vocabularyArtOverride };
