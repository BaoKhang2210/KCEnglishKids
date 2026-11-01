const rules = require('../../../shared/learningGames.json');
const { vocabularyMeaning } = require('./vocabularySemantics');
const wordType = word => word.wordType || (/^(one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(word.english) ? 'number' : /^(red|blue|yellow|green|orange|purple|pink|black|white|brown|gray|grey)$/i.test(word.english) ? 'color' : /^(run|jump|eat|sleep|play|walk|sit|stand|clap|sing|dance|drink)$/i.test(word.english) ? 'verb' : ({colors:'color',color:'color',numbers:'number',number:'number',actions:'verb',verbs:'verb',action:'verb'}[String(word.category || '').toLowerCase()] || 'noun'));
const usable = (rule, words) => [...new Map(words.filter(w => rule.supportedWordTypes.includes(wordType(w)) && (!rule.requiresImage || !!w.imageUrl) && (!rule.requiresTransparentImage || w.isTransparent === true)).map(word => [vocabularyMeaning(word), word])).values()];
function availableGames(words, unit = 1, lesson = 1, catalog) {
  if (catalog) return catalog.filter(game => game.enabled !== false && usable(game, words).length >= game.minVocab).slice(0, 4);
  const r = (Math.max(1, unit)-1)*4 + Math.max(1, lesson)-1;
  const tap=['bubble-pop','balloon-float','tunnel-runner','prize-wheel','koko-says'], match=['memory-match','shadow-puzzle','peek-a-boo','feed-the-monsters','mystery-boxes'], build=['picture-builder','kokos-delivery'];
  const ids=[tap[r%5],tap[(r+2)%5],match[r%5],build[r%2]];
  return [...ids.map(id=>rules.find(g=>g.id===id)),...rules.filter(g=>!ids.includes(g.id))].filter(g=>usable(g,words).length>=g.minVocab).slice(0,4);
}
module.exports={availableGames,usable};
