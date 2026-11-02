import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Headphones,
  Puzzle,
  Utensils
} from 'lucide-react';
import type { Activity, ClassroomSession, User } from '../../types';
import { playWordAudio, stopWordAudio, sfx } from '../../utils/audio';
import { playAnimalSound, stopAnimalSound } from '../../utils/animalAudio';

type Answers = Record<string, 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED'>;

export function ClassroomActivities({
  session,
  onSave
}: {
  session: ClassroomSession;
  onSave: (activityId: string, index: number, prompt: string, answers: Answers) => Promise<void>;
}) {
  const [answers, onAnswers] = useState<Answers>({});
  const [activityIndex, setActivityIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Interactive state for LISTEN_CHOOSE
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Interactive state for IMAGE_WORD_MATCH
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);

  // Interactive state for FEED_ANIMAL
  const [isFeeding, setIsFeeding] = useState(false);
  const [fedSuccess, setFedSuccess] = useState(false);

  const activities = session.activities as Activity[];
  const activity = activities[activityIndex];
  const question = activity?.questions?.[questionIndex];

  useEffect(() => {
    setRevealed(false);
    setError('');
    setSelectedOptionId(null);
    setFeedbackStatus(null);
    setSelectedCardId(null);
    setMatchedPairs([]);
    setIsFeeding(false);
    setFedSuccess(false);

    const saved = session.questionResults?.find(
      (result) => String(result.activityId) === activity?._id && result.questionIndex === questionIndex
    );
    const restored: Answers = {};
    for (const answer of saved?.studentAnswers || []) {
      const sid = String(typeof answer.student === 'object' ? (answer.student as any)?._id : answer.student);
      restored[sid] = answer.result;
    }
    onAnswers(restored);

    return () => {
      stopAnimalSound();
      stopWordAudio();
    };
  }, [activity?._id, questionIndex]);

  if (!activity || !activities.length) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-white/10 p-8 text-center text-slate-300">
        <span className="text-4xl block mb-2">📚</span>
        <h2 className="text-xl font-bold text-white">Chưa chọn trò chơi cho buổi học</h2>
        <p className="mt-2 text-sm text-slate-400">Buổi này tập trung vào từ vựng, mẫu câu và ghi nhận học sinh.</p>
      </div>
    );
  }

  const roster = session.studentScores.filter((row) => !['ABSENT', 'EXCUSED'].includes(row.attendance || ''));

  const listen = async () => {
    if (!question) return;
    setError('');
    setIsAudioPlaying(true);
    try {
      if (activity.activityType === 'ANIMAL_SOUND') {
        const soundKey = String(
          question.metadata?.animal || question.options.find((option) => option.isCorrect)?.text || question.correctAnswer || ''
        );
        await playAnimalSound(soundKey);
      } else {
        stopAnimalSound();
        const targetText = question.options.find((opt) => opt.isCorrect)?.text || question.promptText;
        await playWordAudio(targetText, question.promptAudioUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không phát được âm thanh.');
    } finally {
      setIsAudioPlaying(false);
    }
  };

  const markAllAnswers = (result: 'CORRECT' | 'INCORRECT') => {
    const updated: Answers = {};
    roster.forEach((row) => {
      const student = row.student as User;
      const id = String(typeof row.student === 'string' ? row.student : student._id || (student as any).id || '');
      updated[id] = result;
    });
    onAnswers(updated);
    sfx.playSuccess();
  };

  const correctOption = question?.options?.find((opt) => opt.isCorrect) || question?.options?.[0];

  return (
    <section className="rounded-3xl border-2 border-indigo-400/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-5 sm:p-7 text-white mb-6 shadow-2xl">
      {/* ── Top Bar: Mode Selector & Activity Meta ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Trò chơi theo bài học
            </span>
            <span className="text-xs text-slate-400 font-bold">
              Hoạt động {activityIndex + 1} / {activities.length}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
            {activity.activityType === 'LISTEN_CHOOSE' && <Headphones className="text-sky-400" size={24} />}
            {activity.activityType === 'IMAGE_WORD_MATCH' && <Puzzle className="text-amber-400" size={24} />}
            {activity.activityType === 'FEED_ANIMAL' && <Utensils className="text-emerald-400" size={24} />}
            <span>{activity.title}</span>
          </h2>
        </div>

        {/* Activity Tab Buttons (Replacing identical dropdown) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-white/10">
          {activities.map((item, index) => {
            const isCurrent = activityIndex === index;
            const icon =
              item.activityType === 'LISTEN_CHOOSE' ? '🎧' :
              item.activityType === 'IMAGE_WORD_MATCH' ? '🧩' :
              item.activityType === 'FEED_ANIMAL' ? '🍎' : '🎮';
            const shortName =
              item.activityType === 'LISTEN_CHOOSE' ? '1. Nghe & Chọn' :
              item.activityType === 'IMAGE_WORD_MATCH' ? '2. Nối Từ & Tranh' :
              item.activityType === 'FEED_ANIMAL' ? '3. Cho Thú Ăn' :
              `${index + 1}. ${item.title.split(':')[0]}`;

            return (
              <button
                key={item._id}
                onClick={() => {
                  setActivityIndex(index);
                  setQuestionIndex(0);
                  sfx.playPop();
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{icon}</span>
                <span>{shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {question ? (
        <>
          {/* ── Question Header & Audio Speaker ── */}
          <div className="my-5 flex flex-wrap items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-black text-sm">
                Q{questionIndex + 1}
              </span>
              <div>
                <h3 className="text-lg font-black text-white">
                  {question.promptText}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Câu hỏi {questionIndex + 1} / {activity.questions.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                  isAudioPlaying
                    ? 'bg-amber-400 text-amber-950 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
                onClick={() => void listen()}
              >
                <Volume2 size={20} className={isAudioPlaying ? 'animate-bounce' : ''} />
                <span>{activity.activityType === 'ANIMAL_SOUND' ? 'Nghe Tiếng Kêu' : 'Nghe Phát Âm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs cursor-pointer active:scale-95 border border-white/10"
              >
                {revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
              </button>
            </div>
          </div>

          {/* ── GAME TYPE 1: LISTEN & CHOOSE (🎧) ── */}
          {activity.activityType === 'LISTEN_CHOOSE' && (
            <div className="flex flex-col items-center py-2 animate-fade-in">
              <div className="text-center mb-5">
                <span className="text-xs uppercase tracking-wider text-sky-300 font-black bg-sky-500/10 px-3 py-1 rounded-full border border-sky-400/20">
                  Chế độ luyện nghe &amp; phản xạ thị giác
                </span>
                <p className="text-slate-300 text-sm font-bold mt-2">
                  Cô bấm loa phát âm ➔ Bé lắng nghe và chạm vào bức tranh đúng nhất:
                </p>
              </div>

              {/* Interactive choice cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl mb-4">
                {question.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrect = Boolean(opt.isCorrect);

                  let cardBorder = 'border-white/15 bg-white/5 hover:border-sky-400 hover:bg-white/10';
                  if (selectedOptionId) {
                    if (isCorrect) {
                      cardBorder = 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/40 scale-105';
                    } else if (isSelected) {
                      cardBorder = 'border-rose-500 bg-rose-500/20 ring-4 ring-rose-400/40';
                    } else {
                      cardBorder = 'border-white/5 bg-white/5 opacity-40';
                    }
                  } else if (revealed && isCorrect) {
                    cardBorder = 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedOptionId(opt.id);
                        if (isCorrect) {
                          setFeedbackStatus('CORRECT');
                          sfx.playCorrect();
                          sfx.playStarFanfare();
                          markAllAnswers('CORRECT');
                        } else {
                          setFeedbackStatus('WRONG');
                          sfx.playGentleWrong();
                        }
                      }}
                      className={`rounded-3xl border-3 p-4 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 relative group ${cardBorder}`}
                    >
                      {selectedOptionId && isCorrect && (
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm animate-bounce shadow-lg">
                          ✓
                        </div>
                      )}
                      {isSelected && !isCorrect && (
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-sm shadow-lg">
                          ✕
                        </div>
                      )}
                      <div className="w-28 h-28 sm:w-32 sm:h-32 mb-3 p-2 bg-white rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                        {opt.imageUrl ? (
                          <img src={opt.imageUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-5xl">🎨</span>
                        )}
                      </div>
                      <span className="font-black text-base text-white tracking-wide">{opt.text}</span>
                      {(revealed || (selectedOptionId && isCorrect)) && isCorrect && (
                        <span className="text-xs text-emerald-400 font-extrabold mt-1">✓ Đáp án đúng</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {feedbackStatus === 'CORRECT' && (
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm bg-emerald-500/10 border border-emerald-400/30 px-5 py-2.5 rounded-2xl animate-fade-in mb-3">
                  <CheckCircle2 size={18} />
                  <span>Hoan hô! Bé đã chọn hoàn toàn chính xác! (+1 ⭐ cho cả lớp) 🎉</span>
                </div>
              )}
              {feedbackStatus === 'WRONG' && (
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm bg-rose-500/10 border border-rose-400/30 px-5 py-2.5 rounded-2xl animate-fade-in mb-3">
                  <XCircle size={18} />
                  <span>Chưa đúng rồi! Bé nghe lại phát âm và thử chọn lại nhé!</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(null);
                      setFeedbackStatus(null);
                      void listen();
                    }}
                    className="ml-3 underline text-rose-200 hover:text-white"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── GAME TYPE 2: IMAGE WORD MATCH (🧩) ── */}
          {activity.activityType === 'IMAGE_WORD_MATCH' && (
            <div className="flex flex-col items-center py-2 animate-fade-in">
              <div className="text-center mb-5">
                <span className="text-xs uppercase tracking-wider text-amber-300 font-black bg-amber-500/10 px-3 py-1 rounded-full border border-amber-400/20">
                  Chế độ ghép cặp Tranh &bull; Từ vựng
                </span>
                <p className="text-slate-300 text-sm font-bold mt-2">
                  Mời bé lên bảng chạm vào hình vẽ rồi chạm vào từ tiếng Anh tương ứng để nối cặp:
                </p>
              </div>

              {/* Grid of Interactive Pairing Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl mb-4">
                {question.options.map((opt) => {
                  const isMatched = matchedPairs.includes(opt.id) || (revealed && opt.isCorrect);
                  const isSelected = selectedCardId === opt.id;

                  let border = 'border-white/15 bg-white/5 hover:border-amber-400';
                  if (isMatched) {
                    border = 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/50';
                  } else if (isSelected) {
                    border = 'border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/60 scale-105';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (isMatched) return;
                        if (!selectedCardId) {
                          setSelectedCardId(opt.id);
                          sfx.playPop();
                        } else if (selectedCardId === opt.id) {
                          setSelectedCardId(null);
                        } else {
                          // Check if target is correct
                          if (opt.isCorrect || selectedCardId === opt.id) {
                            setMatchedPairs((prev) => [...prev, opt.id, selectedCardId]);
                            setSelectedCardId(null);
                            sfx.playCorrect();
                            sfx.playBadgeChime();
                            markAllAnswers('CORRECT');
                          } else {
                            sfx.playGentleWrong();
                            setSelectedCardId(null);
                          }
                        }
                      }}
                      className={`rounded-3xl border-3 p-4 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 relative ${border}`}
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 mb-3 p-2 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                        {opt.imageUrl ? (
                          <img src={opt.imageUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-4xl">🧩</span>
                        )}
                      </div>
                      <span className="font-black text-sm sm:text-base text-white">{opt.text}</span>
                      {isMatched && (
                        <span className="text-[11px] text-emerald-400 font-bold mt-1">✓ Đã ghép đúng</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {matchedPairs.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm bg-emerald-500/15 border border-emerald-400/30 px-5 py-2.5 rounded-2xl animate-fade-in mb-3">
                  <Sparkles size={18} className="text-amber-400" />
                  <span>Tuyệt vời! Bé đã nối đúng cặp từ vựng! 🎉</span>
                </div>
              )}
            </div>
          )}

          {/* ── GAME TYPE 3: FEED THE ANIMAL (🍎) ── */}
          {activity.activityType === 'FEED_ANIMAL' && (
            <div className="flex flex-col items-center py-2 animate-fade-in w-full">
              <div className="text-center mb-4">
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-400/20">
                  Chế độ cho Koko &amp; Thú cưng ăn
                </span>
                <p className="text-slate-300 text-sm font-bold mt-1">
                  Koko đang đói bụng! Bé hãy chạm vào món đồ đúng để cho Koko măm măm nhé:
                </p>
              </div>

              {/* Big Mascot Animation Box */}
              <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-500/10 to-orange-500/5 rounded-3xl border-2 border-amber-400/30 w-full max-w-xl mb-6 text-center relative overflow-hidden">
                <div
                  className={`text-7xl sm:text-8xl mb-3 transition-transform duration-500 ${
                    isFeeding ? 'scale-125 animate-bounce' : 'hover:scale-110'
                  }`}
                >
                  {fedSuccess ? '😋' : isFeeding ? '😮' : '🐻'}
                </div>

                <div className="bg-slate-900/90 border border-amber-300/40 px-5 py-2 rounded-2xl mb-2 inline-block shadow-lg">
                  <p className="text-sm sm:text-base font-black text-amber-300">
                    {fedSuccess
                      ? `Yum yum! Cảm ơn bé! Món "${correctOption?.text || ''}" ngon tuyệt! 🎉`
                      : isFeeding
                      ? 'Nham nham… Đang măm măm! 🍴'
                      : `&ldquo;Koko đói quá! Bé cho Koko măm &lsquo;${correctOption?.text || question.promptText}&rsquo; nhé!&rdquo;`}
                  </p>
                </div>

                {fedSuccess && (
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm animate-fade-in mt-1">
                    <CheckCircle2 size={16} />
                    <span>Bé đã cho Koko ăn đúng món! (+1 ⭐)</span>
                  </div>
                )}
              </div>

              {/* Food options to feed */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-4">
                {question.options.map((opt) => {
                  const isCorrect = Boolean(opt.isCorrect);
                  const isChosen = selectedOptionId === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isFeeding || fedSuccess}
                      onClick={() => {
                        setSelectedOptionId(opt.id);
                        if (isCorrect) {
                          setIsFeeding(true);
                          sfx.playPop();
                          setTimeout(() => {
                            setIsFeeding(false);
                            setFedSuccess(true);
                            sfx.playSuccess();
                            sfx.playStarFanfare();
                            markAllAnswers('CORRECT');
                          }, 900);
                        } else {
                          sfx.playGentleWrong();
                          setError(`Ối! Koko muốn ăn "${correctOption?.text || ''}" cơ! Bé thử lại nhé! 🐾`);
                          setTimeout(() => setError(''), 3000);
                        }
                      }}
                      className={`rounded-3xl border-3 p-4 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                        isChosen && isCorrect
                          ? 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/40 scale-105'
                          : 'border-white/15 bg-white/5 hover:border-amber-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 mb-2 p-2 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                        {opt.imageUrl ? (
                          <img src={opt.imageUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-3xl">🍎</span>
                        )}
                      </div>
                      <span className="font-black text-sm text-white">{opt.text}</span>
                      <span className="text-[11px] text-amber-300 font-bold mt-1">Chạm để cho ăn 🍽️</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FALLBACK FOR OTHER ACTIVITY TYPES ── */}
          {!['LISTEN_CHOOSE', 'IMAGE_WORD_MATCH', 'FEED_ANIMAL'].includes(activity.activityType) && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 my-4">
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={`rounded-3xl border-3 bg-white/5 p-4 text-center transition-all ${
                    revealed && option.isCorrect
                      ? 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/40'
                      : 'border-white/15'
                  }`}
                >
                  {option.imageUrl && (
                    <img className="mx-auto mb-3 h-28 object-contain" src={option.imageUrl} alt={option.text || 'Lựa chọn'} />
                  )}
                  <strong className="text-white text-base block">{option.text}</strong>
                  {revealed && option.isCorrect && (
                    <p className="mt-2 text-xs font-black text-emerald-400">✓ Đáp án đúng</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error notice */}
          {error && (
            <p role="alert" className="mt-3 text-rose-300 font-bold text-sm bg-rose-500/20 p-3 rounded-xl border border-rose-400/30">
              {error}
            </p>
          )}

          {/* ── Student Roster Scoring Row ── */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 className="font-extrabold text-sm text-slate-300 flex items-center gap-2">
                <span>Ghi nhận kết quả câu hỏi cho các bé:</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-400">
                  {roster.length} bé có mặt
                </span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAllAnswers('CORRECT')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-xs font-black cursor-pointer active:scale-95"
                >
                  ✓ Cả lớp đúng
                </button>
                <button
                  type="button"
                  onClick={() => onAnswers({})}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold cursor-pointer"
                >
                  Đặt lại
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {roster.map((row) => {
                const student = row.student as User;
                const id = String(typeof row.student === 'string' ? row.student : student._id || (student as any).id || '');
                const currentAns = answers[id] || 'NOT_ANSWERED';

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-slate-800/60 border border-white/10 px-3.5 py-2.5"
                  >
                    <span className="text-xs font-black text-white truncate max-w-[130px]">
                      {student.name || 'Học sinh'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onAnswers({ ...answers, [id]: currentAns === 'CORRECT' ? 'NOT_ANSWERED' : 'CORRECT' });
                          sfx.playPop();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          currentAns === 'CORRECT'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Đúng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAnswers({ ...answers, [id]: currentAns === 'INCORRECT' ? 'NOT_ANSWERED' : 'INCORRECT' });
                          sfx.playPop();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          currentAns === 'INCORRECT'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Chưa đúng
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Navigation Bottom Bar ── */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={questionIndex === 0}
              onClick={() => {
                setQuestionIndex((i) => i - 1);
                sfx.playPop();
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={16} /> Câu trước
            </button>

            <button
              type="button"
              onClick={() => void onSave(activity._id, questionIndex, question.promptText, answers)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Save size={16} /> Lưu kết quả câu hỏi
            </button>

            <button
              type="button"
              disabled={questionIndex >= activity.questions.length - 1}
              onClick={() => {
                setQuestionIndex((i) => i + 1);
                sfx.playPop();
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              Câu sau <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-slate-400">
          <p className="text-sm font-bold">Hoạt động này chưa có câu hỏi để trình chiếu.</p>
        </div>
      )}
    </section>
  );
}
