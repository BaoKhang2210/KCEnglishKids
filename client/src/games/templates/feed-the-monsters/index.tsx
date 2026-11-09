import React, { useEffect, useMemo, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { shuffleArray } from '../../core/targetSelector';
import type { Vocabulary } from '../../../types';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

const MONSTER_STYLES = [
  {
    body: 'from-violet-500 to-purple-700 border-violet-300',
    horn: 'bg-fuchsia-400',
    name: 'Purple Monster',
  },
  {
    body: 'from-emerald-400 to-teal-700 border-emerald-200',
    horn: 'bg-lime-300',
    name: 'Green Monster',
  },
];

/**
 * Feed the Monsters chuẩn kidscards.vercel.app (Bg):
 * Hỗ trợ KÉP:
 * 1) Chạm chọn món ăn ở khay dưới -> Chạm bạn quái vật đang thèm món đó
 * 2) Kéo thả trực tiếp món ăn vào miệng quái vật
 */
export const FeedTheMonstersGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const monsterChoices = useMemo(() => {
    const others = options.filter((v) => v._id !== targetVocab._id);
    return [targetVocab, ...others].slice(0, 2);
  }, [options, targetVocab]);

  const treats = useMemo(() => {
    const items = [targetVocab, ...monsterChoices.slice(1), targetVocab];
    return shuffleArray(items);
  }, [targetVocab, monsterChoices]);

  const [selectedTreat, setSelectedTreat] = useState<Vocabulary | null>(null);
  const [dragging, setDragging] = useState<Vocabulary | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [chompId, setChompId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const activeTreat = dragging || selectedTreat;

  useEffect(() => {
    setLocked(false);
    setChompId(null);
    setShakeId(null);
    setSelectedTreat(null);
    setDragging(null);
  }, [targetVocab._id]);

  const feed = (monster: Vocabulary, treatArg?: Vocabulary) => {
    const treat = treatArg || activeTreat;
    if (locked || !treat) return;

    if (treat._id === targetVocab._id && monster._id === targetVocab._id) {
      sfx.playSuccess();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setChompId(monster._id);
      setLocked(true);
      setSelectedTreat(null);
      setDragging(null);
      scheduleTimeout(onCorrect, 550);
      return;
    }

    setShakeId(monster._id);
    scheduleTimeout(() => setShakeId(null), 480);
    onWrong(treat._id !== targetVocab._id ? treat._id : monster._id);
    setDragging(null);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col justify-between pt-10 pb-2 select-none"
      onPointerMove={(e) => dragging && setPos({ x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (!dragging) return;
        const dropId = hitDropId(e.clientX, e.clientY);
        const monster = monsterChoices.find((v) => v._id === dropId);
        if (monster) {
          feed(monster, dragging);
        } else {
          setDragging(null);
        }
      }}
    >
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Feed the monster that wants <span className="text-lime-300 capitalize">{targetVocab.english}</span>! 👾
          </>
        }
        subtext={
          activeTreat
            ? `Bây giờ chạm vào bạn quái vật thích "${activeTreat.english}"!`
            : `Chạm chọn "${targetVocab.vietnamese || targetVocab.english}" ở khay dưới để đút cho quái vật!`
        }
      />

      {/* Hàng quái vật chuẩn monster-row của kidscards */}
      <div className="flex-1 flex items-center justify-center gap-6 sm:gap-12 flex-wrap px-4">
        {monsterChoices.map((vocab, idx) => {
          const style = MONSTER_STYLES[idx % MONSTER_STYLES.length];
          const glow = (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
          const isChomping = chompId === vocab._id;
          const isShaking = shakeId === vocab._id;

          return (
            <button
              key={vocab._id}
              type="button"
              data-drop-id={vocab._id}
              aria-label={`Quái vật thích ${vocab.english}`}
              onClick={() => activeTreat && feed(vocab, activeTreat)}
              className={`relative w-[clamp(138px,26vmin,200px)] rounded-[2.2rem] bg-gradient-to-b ${style.body} border-4 p-4 flex flex-col items-center gap-2.5 shadow-2xl transition-all cursor-pointer ${
                glow ? 'ring-8 ring-amber-300 border-amber-300' : ''
              } ${isChomping ? 'scale-110 ring-8 ring-emerald-300' : ''} ${
                isShaking ? 'animate-gentle-wobble border-rose-400' : ''
              } ${activeTreat ? 'hover:scale-105' : ''}`}
            >
              {/* Bong bóng suy nghĩ món ăn yêu thích */}
              <div className=" -mt-8 self-end flex items-center gap-1.5 rounded-2xl border-3 border-white bg-white px-2.5 py-1 shadow-lg">
                <VocabImage vocab={vocab} className="w-8 h-8 object-contain" />
                <span className="text-xs font-black text-slate-800 capitalize">{vocab.english}</span>
              </div>

              {/* Đôi mắt to tròn (m-eye) */}
              <div className="flex items-center justify-center gap-4 mt-1">
                {[0, 1].map((eye) => (
                  <span
                    key={eye}
                    className="w-8 h-8 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center shadow-inner"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
                  </span>
                ))}
              </div>

              {/* Miệng quái vật há to (m-mouth) */}
              <div
                className={`w-[78%] h-14 rounded-b-3xl rounded-t-xl bg-slate-950/85 border-3 border-white/30 flex items-center justify-center transition-transform ${
                  isChomping ? 'scale-y-50 bg-emerald-950' : activeTreat ? 'scale-y-110' : ''
                }`}
              >
                <span className="text-xl">{isChomping ? '😋 Yum!' : '🍽️'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Khay đồ ăn phía dưới (sort-tray) */}
      <div className="h-[28%] flex items-center justify-center gap-3 sm:gap-5 px-3">
        {treats.map((vocab, index) => {
          const isSelected = selectedTreat === vocab || dragging === vocab;
          return (
            <button
              key={`treat_${vocab._id}_${index}`}
              type="button"
              aria-label={`Món ${vocab.english}`}
              aria-pressed={isSelected}
              onPointerDown={(e) => {
                if (locked) return;
                sfx.playPop();
                stopWordAudio();
                void playWordAudio(vocab.english, vocab.audioUrl);
                setSelectedTreat(vocab);
                setDragging(vocab);
                setPos({ x: e.clientX, y: e.clientY });
              }}
              onClick={() => {
                if (locked) return;
                setSelectedTreat(vocab);
              }}
              className={`w-[clamp(86px,17vmin,124px)] h-[clamp(94px,18vmin,132px)] rounded-3xl border-4 p-2 flex flex-col items-center justify-between transition-all cursor-grab shadow-xl ${
                isSelected
                  ? 'bg-amber-100 border-amber-400 ring-6 ring-amber-300 -translate-y-2 scale-105'
                  : 'bg-white/95 border-indigo-200 hover:border-amber-300'
              }`}
            >
              <VocabImage vocab={vocab} className="w-[74%] h-[74%] object-contain" />
              <span className="text-[11px] font-black text-slate-800 capitalize truncate max-w-full">
                {vocab.english}
              </span>
            </button>
          );
        })}
      </div>

      {dragging && (
        <div
          className="pointer-events-none fixed z-[10000] w-20 h-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          <VocabImage vocab={dragging} className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default FeedTheMonstersGame;
