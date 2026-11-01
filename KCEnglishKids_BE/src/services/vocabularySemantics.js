const aliases = require('../../../shared/vocabularyAliases.json');
const vocabularyMeaning = word => {
  const normalized = String(word.english || '').trim().toLowerCase();
  return aliases[normalized] || normalized || String(word._id || '');
};
module.exports = { vocabularyMeaning };
