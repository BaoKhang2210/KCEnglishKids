import aliases from '../../../shared/vocabularyAliases.json';
export function vocabularyMeaning(word: { english?: string; _id?: string }) {
  const normalized = (word.english || '').trim().toLowerCase();
  return (aliases as Record<string, string>)[normalized] || normalized || word._id || '';
}
