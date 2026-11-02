const rules = require('../../../shared/learningGames.json');
const { selectGames } = require('../../../shared/gameSelection.cjs');
const { vocabularyMeaning } = require('./vocabularySemantics');
const wordType = word => word.wordType || (/^(one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(word.english) ? 'number' : /^(red|blue|yellow|green|orange|purple|pink|black|white|brown|gray|grey)$/i.test(word.english) ? 'color' : /^(run|jump|eat|sleep|play|walk|sit|stand|clap|sing|dance|drink)$/i.test(word.english) ? 'verb' : ({colors:'color',color:'color',numbers:'number',number:'number',actions:'verb',verbs:'verb',action:'verb'}[String(word.category || '').toLowerCase()] || 'noun'));
const usable = (rule, words) => [...new Map(words.filter(w => rule.supportedWordTypes.includes(wordType(w)) && (!rule.requiresImage || !!w.imageUrl) && (!rule.requiresTransparentImage || w.isTransparent === true)).map(word => [vocabularyMeaning(word), word])).values()];
function availableGames(words, unit = 1, lesson = 1, catalog) {
  const pool = catalog || rules;
  return selectGames(pool, pool.filter(game => usable(game, words).length >= game.minVocab).map(game => game.id), unit, lesson);
}
module.exports={availableGames,usable};
