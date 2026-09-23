import React from 'react';
import type { Vocabulary } from '../../types';
import { AudioButton } from './AudioButton';
import { getSensibleSentenceClient } from '../../utils/sentenceDictionary';

interface VocabularyCardProps {
  item: Vocabulary;
  onPlay?: () => void;
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({ item }) => {
  const sentence = getSensibleSentenceClient(item);
  return (
    <div className="card-kid bg-white rounded-3xl border-3 border-amber-200/90 p-5 shadow-md hover:shadow-xl flex flex-col items-center text-center relative overflow-hidden group">
      {/* Background Soft Pastel Blob */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100/60 to-orange-100/40 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-sky-100/50 to-emerald-100/30 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />

      {/* Main Illustration Container */}
      <div className="w-36 h-36 mb-3 flex items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-amber-50/80 to-orange-50/60 border-2 border-amber-100 group-hover:scale-108 transition-transform duration-300 shadow-inner relative z-10">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.english}
            className="w-full h-full object-contain filter drop-shadow-md"
            loading="lazy"
          />
        ) : (
          <span className="text-6xl select-none">🐾</span>
        )}
      </div>

      {/* English Word & Pronounce Audio Button */}
      <div className="flex items-center justify-center gap-3 mb-1 relative z-10 w-full">
        <h3 className="font-black text-2xl sm:text-3xl text-slate-800 capitalize tracking-tight font-display">
          {item.english}
        </h3>
        <AudioButton word={item.english} audioUrl={item.audioUrl} size="sm" />
      </div>

      {/* Phonetic / IPA Reading */}
      {item.pronunciation && (
        <span className="text-xs font-extrabold text-slate-400 mb-2 font-mono tracking-wide">
          {item.pronunciation}
        </span>
      )}

      {/* Vietnamese Meaning Pill */}
      <span className="bg-amber-100 text-amber-900 font-extrabold px-4 py-1 rounded-full text-sm border-2 border-amber-200/80 mb-3 shadow-xs">
        {item.vietnamese}
      </span>

      {/* Redesigned Example Sentence */}
      {sentence.en && (
        <div className="w-full bg-gradient-to-r from-amber-50/70 to-orange-50/60 border border-amber-200/90 rounded-2xl p-2.5 text-xs text-slate-700 relative z-10 mt-1 shadow-2xs">
          <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-800 mb-0.5">
            <span>💬</span>
            <span>Ví dụ:</span>
          </div>
          <p className="font-bold text-slate-800 mb-0.5">
            "{sentence.en}"
          </p>
          {sentence.vi && (
            <p className="text-amber-800 font-medium text-[11px]">{sentence.vi}</p>
          )}
        </div>
      )}
    </div>
  );
};

