import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, ChevronLeft, ChevronRight, CircleHelp, Gamepad2, Heart, Mic, Search, Sparkles, Star, Volume2, X } from 'lucide-react';
import { vocabMasteryService, type WordMasteryDetail } from '../../services/vocabMasteryService';
import { useAuth } from '../../context/AuthContext';
import { playWordAudio, preloadWordAudio, sfx, stopWordAudio } from '../../utils/audio';
import { childSpeechEngine } from '../../utils/speechRecognition';
import { getSensibleSentenceClient } from '../../utils/sentenceDictionary';
import { KokoMascot } from './KokoMascot';

interface ChildVocabNotebookSectionProps { onNavigateTab: (tab: string) => void; }
type FilterType = 'all' | 'mastered' | 'review';
type MicState = 'idle' | 'intro' | 'listening' | 'success' | 'retry' | 'unsupported' | 'permission_denied' | 'error';
const MIN_PARENT_HOLD_MS = 1400;

const statusName = (status: WordMasteryDetail['status']) => status === 'MASTERED' ? 'Đã thuộc' : status === 'REVIEW' ? 'Cần ôn' : 'Đang học';

const FilterButton: React.FC<{ value: FilterType; label: string; count: number; icon: React.ReactNode; selected: boolean; onSelect: (value: FilterType) => void }> = ({ value, label, count, icon, selected, onSelect }) => (
  <button type="button" aria-pressed={selected} onClick={() => onSelect(value)} className={`min-h-12 flex-1 rounded-2xl px-3 py-2 font-black text-sm inline-flex justify-center items-center gap-2 transition-transform active:scale-95 ${selected ? 'bg-emerald-700 text-white ring-2 ring-emerald-300' : 'bg-white text-slate-700 border-2 border-emerald-100'}`}>
    {icon}<span>{label}</span><span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{count}</span>
  </button>
);

export const ChildVocabNotebookSection: React.FC<ChildVocabNotebookSectionProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const childId = (user as any)?.id || (user as any)?._id || 'guest';
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [_tick, setTick] = useState(0);
  const [parentMode, setParentMode] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);
  const [selected, setSelected] = useState<WordMasteryDetail | null>(null);
  const [quickReview, setQuickReview] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [micState, setMicState] = useState<MicState>('idle');
  const [micMessage, setMicMessage] = useState('');
  const holdTimer = useRef<number | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const returnFocusId = useRef<string | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const handleUpdate = (event?: Event) => {
      if (event?.type === 'visibilitychange' && document.visibilityState !== 'visible') return;
      const detail = (event as CustomEvent<{ childId?: string }>).detail;
      if (!event || event.type === 'focus' || event.type === 'visibilitychange' || !detail?.childId || detail.childId === childId) setTick(value => value + 1);
    };
    window.addEventListener('kc_vocab_mastery_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    document.addEventListener('visibilitychange', handleUpdate);
    return () => {
      aliveRef.current = false;
      window.removeEventListener('kc_vocab_mastery_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      document.removeEventListener('visibilitychange', handleUpdate);
      window.clearTimeout(holdTimer.current);
      childSpeechEngine.stop();
      stopWordAudio();
    };
  }, [childId]);

  const allWords = vocabMasteryService.getAllLearnedWords(childId);
  const masteredWords = vocabMasteryService.getMasteredWords(childId);
  const reviewWords = vocabMasteryService.getReviewWords(childId);
  const dueWords = vocabMasteryService.getDueWords(childId);
  const averageScore = useMemo(() => allWords.length ? Math.round(allWords.reduce((sum, word) => sum + (word.masteryScore || 0), 0) / allWords.length) : 0, [allWords]);
  const filteredWords = useMemo(() => {
    let words = filter === 'mastered' ? masteredWords : filter === 'review' ? reviewWords : allWords;
    const query = searchQuery.trim().toLocaleLowerCase();
    if (query) words = words.filter(word => `${word.english} ${word.vietnamese}`.toLocaleLowerCase().includes(query));
    return words;
  }, [allWords, masteredWords, reviewWords, filter, searchQuery]);
  const albumGroups = useMemo(() => {
    const groups = new Map<string, WordMasteryDetail[]>();
    filteredWords.forEach(word => {
      const title = word.topicName?.trim() || word.category?.trim() || 'Những từ bé đang khám phá';
      groups.set(title, [...(groups.get(title) || []), word]);
    });
    return [...groups.entries()];
  }, [filteredWords]);
  const activeReviewWords = useMemo(() => dueWords.slice(0, 5), [dueWords]);
  const reviewItem = activeReviewWords[reviewIndex];
  const selectedIndex = selected ? filteredWords.findIndex(word => word.vocabId === selected.vocabId) : -1;
  const sentence = selected ? getSensibleSentenceClient(selected) : null;

  useEffect(() => {
    if (selectedIndex < 0) return;
    const nextWord = filteredWords[selectedIndex + 1];
    if (!nextWord) return;
    if (nextWord.imageUrl) { const image = new Image(); image.src = nextWord.imageUrl; }
    preloadWordAudio([nextWord.audioUrl]);
  }, [selectedIndex, filteredWords]);

  const stopMic = useCallback(() => {
    childSpeechEngine.stop();
    setMicState('idle');
    setMicMessage('');
  }, []);
  const closeDetail = useCallback(() => {
    childSpeechEngine.stop();
    stopWordAudio();
    setMicState('idle');
    setMicMessage('');
    const previousId = returnFocusId.current;
    setSelected(null);
    if (previousId) requestAnimationFrame(() => cardRefs.current.get(previousId)?.focus());
  }, []);
  const openDetail = (word: WordMasteryDetail) => {
    returnFocusId.current = word.vocabId;
    stopWordAudio();
    childSpeechEngine.stop();
    setMicState('idle');
    setSelected(word);
  };

  useEffect(() => {
    if (!selected) return;
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDetail(); }
      if (event.key === 'ArrowRight' && selectedIndex >= 0 && selectedIndex < filteredWords.length - 1) {
        event.preventDefault(); stopMic(); stopWordAudio(); setSelected(filteredWords[selectedIndex + 1]);
      }
      if (event.key === 'ArrowLeft' && selectedIndex > 0) {
        event.preventDefault(); stopMic(); stopWordAudio(); setSelected(filteredWords[selectedIndex - 1]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selected, selectedIndex, filteredWords, closeDetail, stopMic]);

  const playSentence = (text: string) => {
    stopWordAudio();
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };
  const toggleStatus = (word: WordMasteryDetail) => {
    sfx.playPop();
    vocabMasteryService.toggleWordStatus(childId, word.vocabId);
    if (selected?.vocabId === word.vocabId) setSelected({ ...word, status: word.status === 'MASTERED' ? 'REVIEW' : 'MASTERED' });
  };
  const startMic = async (word: WordMasteryDetail) => {
    if (!childSpeechEngine.isAvailable()) { setMicState('unsupported'); setMicMessage('Thiết bị này chưa nghe được giọng nói. Bé vẫn có thể nghe Koko đọc nhé!'); return; }
    stopWordAudio();
    setMicState('listening'); setMicMessage('Koko đang lắng nghe…');
    const result = await childSpeechEngine.listenAndVerify(word.english, 6000);
    if (!aliveRef.current) return;
    if (result.isMatch) {
      setMicState('success'); setMicMessage('Giỏi quá! Bé nói rất rõ!');
      sfx.playCorrect(); vocabMasteryService.recordGameResult(childId, word.vocabId, true);
    } else if (result.error === 'not-allowed') {
      setMicState('permission_denied'); setMicMessage('Bé nhờ người lớn bật quyền micro nhé. Mình vẫn có thể nghe từ này!');
    } else if (result.error === 'unsupported') {
      setMicState('unsupported'); setMicMessage('Thiết bị này chưa hỗ trợ micro. Bé nghe Koko đọc nhé!');
    } else if (result.error === 'aborted') {
      setMicState('idle'); setMicMessage('');
    } else if (result.error) {
      setMicState('error'); setMicMessage('Micro chưa nghe rõ. Bé thử lại cùng người lớn nhé!');
    } else {
      setMicState('retry'); setMicMessage('Mình cùng nghe rồi thử nói lại nhé!');
    }
  };

  const advanceReview = (remembered: boolean) => {
    if (!reviewItem) return;
    if (remembered) vocabMasteryService.markMastered(childId, reviewItem as any);
    else vocabMasteryService.markReview(childId, reviewItem as any);
    stopWordAudio();
    if (reviewIndex + 1 >= activeReviewWords.length) { setQuickReview(false); setReviewIndex(0); }
    else setReviewIndex(index => index + 1);
  };
  const beginParentHold = () => {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => { setShowParentGate(false); setParentMode(true); setSearchQuery(''); }, MIN_PARENT_HOLD_MS);
  };

  if (quickReview && reviewItem) return (
    <section className="h-full min-h-0 flex flex-col items-center justify-center gap-3 overflow-auto rounded-3xl bg-gradient-to-b from-amber-50 to-emerald-50 p-3 sm:p-6" aria-label="Ôn nhanh từ vựng">
      <div className="flex w-full max-w-xl items-center justify-between gap-2"><p className="text-lg font-black text-slate-800">Ôn nhanh · {reviewIndex + 1}/{activeReviewWords.length}</p><button type="button" onClick={() => { stopWordAudio(); setQuickReview(false); setReviewIndex(0); }} aria-label="Đóng ôn nhanh" className="min-h-12 min-w-12 rounded-full bg-white text-slate-800"><X /></button></div>
      <article className="w-full max-w-md rounded-3xl border-4 border-amber-200 bg-white p-4 text-center shadow-xl"><img src={reviewItem.imageUrl} alt="" className="mx-auto h-40 w-full object-contain"/><h2 className="text-4xl font-black capitalize text-slate-900">{reviewItem.english}</h2><p className="mt-1 text-lg font-bold text-slate-600">{reviewItem.vietnamese}</p><button type="button" onClick={() => void playWordAudio(reviewItem.english, reviewItem.audioUrl)} aria-label={`Nghe từ ${reviewItem.english}`} className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sky-100 px-5 font-black text-sky-900"><Volume2 /> Nghe từ</button></article>
      <p className="text-center text-lg font-black text-slate-800">Bé đã nhớ từ này chưa?</p><div className="grid w-full max-w-md grid-cols-2 gap-3"><button type="button" onClick={() => advanceReview(false)} className="min-h-14 rounded-2xl border-2 border-amber-300 bg-amber-100 px-3 font-black text-amber-950">Mình ôn thêm</button><button type="button" onClick={() => advanceReview(true)} className="min-h-14 rounded-2xl bg-emerald-700 px-3 font-black text-white">Bé nhớ rồi!</button></div>
    </section>
  );

  return (
    <div className="relative flex min-w-0 flex-col">
      <header className="shrink-0 rounded-3xl border-2 border-emerald-100 bg-gradient-to-r from-teal-700 via-emerald-700 to-amber-700 p-3 text-white shadow-md sm:p-4">
        <div className="flex items-center gap-3"><KokoMascot state="happy" size="sm" interactive={false} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-xl font-black sm:text-2xl">Album từ vựng</h2><span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black">{masteredWords.length}/{allWords.length} từ đã thuộc</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-black/25" role="progressbar" aria-label="Tiến độ từ đã thuộc" aria-valuemin={0} aria-valuemax={allWords.length} aria-valuenow={masteredWords.length}><div className="h-full rounded-full bg-amber-300" style={{ width: `${allWords.length ? masteredWords.length / allWords.length * 100 : 0}%` }} /></div></div></div>
      </header>

      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
        <FilterButton value="all" label="Tất cả" count={allWords.length} icon={<BookMarked size={18} />} selected={filter === 'all'} onSelect={setFilter} />
        <FilterButton value="mastered" label="Đã thuộc" count={masteredWords.length} icon={<Star size={18} />} selected={filter === 'mastered'} onSelect={setFilter} />
        <FilterButton value="review" label="Cần ôn" count={reviewWords.length} icon={<Heart size={18} />} selected={filter === 'review'} onSelect={setFilter} />
      </div>
      {parentMode && <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 rounded-2xl bg-white p-2"><label className="relative min-w-48 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Tìm tiếng Anh hoặc tiếng Việt" aria-label="Tìm từ bằng tiếng Anh hoặc tiếng Việt" className="min-h-12 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-base font-bold text-slate-900" /></label>{searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="min-h-12 rounded-xl bg-slate-100 px-4 font-black text-slate-800">Xóa tìm kiếm</button>}<span className="text-sm font-bold text-slate-700">Độ nhớ trung bình: {averageScore}% · Nên ôn {reviewWords.length} từ</span></div>}

      <main className="mt-2 min-w-0 rounded-3xl bg-[#fffdf7] p-2 sm:p-4" aria-label={parentMode ? 'Danh sách từ vựng phụ huynh' : 'Album sticker từ vựng'}>
        {allWords.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center"><KokoMascot state="thinking" size="md" interactive={false} /><h3 className="text-2xl font-black text-slate-900">Album đang chờ sticker đầu tiên!</h3><p className="max-w-md text-lg font-bold text-slate-700">Cùng học một bài hoặc khám phá chủ đề để sưu tầm từ mới nhé.</p><div className="flex flex-wrap justify-center gap-3"><button type="button" onClick={() => onNavigateTab('path')} className="min-h-12 rounded-2xl bg-amber-300 px-5 font-black text-amber-950">Vào Hành trình học</button><button type="button" onClick={() => onNavigateTab('topics')} className="min-h-12 rounded-2xl bg-emerald-700 px-5 font-black text-white">Khám phá Chủ đề</button></div></div> : filteredWords.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center"><Search className="text-slate-400" size={40} /><h3 className="text-xl font-black text-slate-900">Chưa tìm thấy từ phù hợp</h3><button type="button" onClick={() => { setSearchQuery(''); setFilter('all'); }} className="min-h-12 rounded-2xl bg-emerald-700 px-5 font-black text-white">Xóa tìm kiếm và bộ lọc</button></div> : parentMode ? <div className="space-y-2">{filteredWords.map(word => <article key={word.vocabId} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3"><img src={word.imageUrl} alt="" className="h-14 w-14 rounded-xl bg-slate-50 object-contain"/><div className="min-w-32 flex-1"><h3 className="text-lg font-black capitalize text-slate-900">{word.english}</h3><p className="font-bold text-slate-700">{word.vietnamese} · {statusName(word.status)} · {word.masteryScore}%</p></div><button type="button" onClick={() => void playWordAudio(word.english, word.audioUrl)} aria-label={`Nghe từ ${word.english}`} className="min-h-12 min-w-12 rounded-xl bg-sky-100 text-sky-900"><Volume2 /></button><button type="button" onClick={() => openDetail(word)} aria-label={`Chi tiết từ ${word.english}`} className="min-h-12 rounded-xl bg-indigo-100 px-3 font-black text-indigo-950">Chi tiết</button><button type="button" onClick={() => toggleStatus(word)} aria-label={`Đổi trạng thái từ ${word.english}`} className="min-h-12 rounded-xl bg-emerald-100 px-3 font-black text-emerald-950">Đổi trạng thái</button></article>)}</div> : albumGroups.map(([group, words]) => <section key={group} className="mb-5"><h3 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-900"><Sparkles size={18} className="text-amber-600" />{group}<span className="text-sm font-bold text-slate-600">· {words.length} từ</span></h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">{words.map(word => { const mastered = word.status === 'MASTERED'; const needsReview = word.status === 'REVIEW'; return <button key={word.vocabId} ref={element => { if (element) cardRefs.current.set(word.vocabId, element); else cardRefs.current.delete(word.vocabId); }} type="button" onClick={() => { openDetail(word); void playWordAudio(word.english, word.audioUrl); }} aria-label={`${word.english}, ${statusName(word.status)}. Mở chi tiết`} className="group flex min-h-36 flex-col items-center justify-center rounded-3xl border-3 border-emerald-100 bg-white p-2 text-center shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-4 focus-visible:outline-amber-500 sm:min-h-44 sm:p-3"><div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl ${mastered ? 'bg-amber-50 ring-2 ring-amber-300' : needsReview ? 'bg-emerald-50' : 'bg-slate-100'}`}><img src={word.imageUrl} alt="" loading="lazy" className={`h-full w-full object-contain ${!mastered ? 'opacity-70' : ''}`} onError={event => { event.currentTarget.hidden = true; }} />{!mastered && <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-800/70 text-white" aria-hidden="true"><CircleHelp size={28} /></span>}{mastered && <Star className="absolute -right-2 -top-2 fill-amber-400 text-amber-700" size={24} aria-hidden="true" />}{needsReview && <Heart className="absolute -right-2 -top-2 fill-emerald-200 text-emerald-800" size={24} aria-hidden="true" />}</div><span className="mt-2 text-lg font-black capitalize text-slate-900 sm:text-xl">{word.english}</span><span className="mt-1 text-xs font-extrabold text-slate-700">{statusName(word.status)}</span></button>; })}</div></section>)}
      </main>

      <footer className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/90 p-2">
        <button type="button" onClick={() => { if (dueWords.length) { setReviewIndex(0); setQuickReview(true); void playWordAudio(dueWords[0].english, dueWords[0].audioUrl); } else onNavigateTab('games'); }} className="min-h-12 flex-1 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 text-base font-black text-amber-950 shadow">{dueWords.length ? `Ôn nhanh hôm nay · ${Math.min(5, dueWords.length)} từ` : 'Bé làm tốt lắm! Chơi trò chơi nào'}</button>
        {dueWords.length > 0 && <button type="button" onClick={() => onNavigateTab('games')} className="min-h-12 rounded-2xl bg-sky-700 px-4 font-black text-white"><Gamepad2 className="mr-1 inline" size={18} />Chơi trò chơi</button>}
        <button type="button" onClick={() => setShowParentGate(true)} aria-label="Mở xác nhận Góc phụ huynh" className="min-h-12 rounded-xl px-3 text-sm font-bold text-slate-700 underline underline-offset-2">Góc phụ huynh</button>
      </footer>

      {showParentGate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="parent-gate-title"><div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><h2 id="parent-gate-title" className="text-xl font-black text-slate-900">Dành cho người lớn</h2><p className="my-3 text-base font-bold text-slate-700">Nhấn và giữ nút bên dưới trong một lúc để mở danh sách chi tiết.</p><button type="button" onPointerDown={beginParentHold} onPointerUp={() => window.clearTimeout(holdTimer.current)} onPointerLeave={() => window.clearTimeout(holdTimer.current)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') beginParentHold(); }} onKeyUp={event => { if (event.key === 'Enter' || event.key === ' ') window.clearTimeout(holdTimer.current); }} className="min-h-14 w-full rounded-2xl bg-emerald-700 font-black text-white">Giữ để xác nhận</button><button type="button" onClick={() => setShowParentGate(false)} className="mt-2 min-h-12 px-4 font-bold text-slate-700">Đóng</button></div></div>}
      {parentMode && <button type="button" onClick={() => { setParentMode(false); setSearchQuery(''); }} className="absolute right-2 top-2 z-10 min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white shadow">Thoát Góc phụ huynh</button>}

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeDetail(); }}><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="word-dialog-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-4 border-amber-200 bg-[#fffdf7] p-4 shadow-2xl outline-none sm:rounded-3xl sm:p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-100 px-3 py-1 font-black text-emerald-950">{statusName(selected.status)}</span><button type="button" onClick={closeDetail} aria-label="Đóng chi tiết từ" className="min-h-12 min-w-12 rounded-full bg-slate-200 text-slate-900"><X className="mx-auto" /></button></div><img src={selected.imageUrl} alt={selected.english} className="mx-auto my-2 h-40 w-full object-contain sm:h-48"/><h2 id="word-dialog-title" className="text-center text-4xl font-black capitalize text-slate-950 sm:text-5xl">{selected.english}</h2><p className="mt-1 text-center text-lg font-bold text-slate-700">{selected.pronunciation && <span>/{selected.pronunciation}/ · </span>}{selected.vietnamese}</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void playWordAudio(selected.english, selected.audioUrl)} className="min-h-14 rounded-2xl bg-sky-700 font-black text-white"><Volume2 className="mr-2 inline" />Nghe từ</button>{sentence?.en && <button type="button" onClick={() => playSentence(sentence.en)} className="min-h-14 rounded-2xl bg-indigo-700 font-black text-white">Nghe câu ví dụ</button>}<button type="button" onClick={() => micState === 'listening' ? stopMic() : micState === 'intro' ? void startMic(selected) : (setMicState('intro'), setMicMessage('Trước khi bật micro, bé hãy nhờ người lớn ở bên cạnh nhé.'))} className="col-span-2 min-h-14 rounded-2xl bg-rose-100 font-black text-rose-950"><Mic className="mr-2 inline" />{micState === 'listening' ? 'Dừng micro' : micState === 'intro' ? 'Bắt đầu nghe' : 'Bé đọc cùng Koko'}</button></div>{micMessage && <p role="status" aria-live="polite" className="mt-3 rounded-2xl bg-amber-50 p-3 text-center text-lg font-black text-slate-900">{micMessage}{['retry','error','permission_denied'].includes(micState) && <button type="button" onClick={() => void startMic(selected)} className="ml-2 min-h-12 rounded-xl bg-amber-300 px-3 text-base text-amber-950">Thử lại</button>}</p>}<button type="button" onClick={() => toggleStatus(selected)} className="mt-3 min-h-14 w-full rounded-2xl bg-emerald-700 font-black text-white">{selected.status === 'MASTERED' ? 'Chuyển sang cần ôn' : 'Đánh dấu đã thuộc'}</button><div className="mt-3 flex justify-between gap-3"><button type="button" disabled={selectedIndex <= 0} onClick={() => { stopMic(); stopWordAudio(); setSelected(filteredWords[selectedIndex - 1]); }} className="min-h-12 flex-1 rounded-xl bg-slate-200 font-black text-slate-900 disabled:opacity-50"><ChevronLeft className="mr-1 inline" />Từ trước</button><button type="button" disabled={selectedIndex < 0 || selectedIndex >= filteredWords.length - 1} onClick={() => { stopMic(); stopWordAudio(); setSelected(filteredWords[selectedIndex + 1]); }} className="min-h-12 flex-1 rounded-xl bg-slate-200 font-black text-slate-900 disabled:opacity-50">Từ tiếp theo<ChevronRight className="ml-1 inline" /></button></div></div></div>}
    </div>
  );
};
