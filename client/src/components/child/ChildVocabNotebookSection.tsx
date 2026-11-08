import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Droplets,
  Gamepad2,
  Lock,
  Mic,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Volume2,
  X
} from 'lucide-react';
import roundsConfig from '../../../../shared/stage2Rounds.json';
import type {
  ActivityOption,
  ActivityQuestion,
  AgeGroupCode,
  VocabNotebook,
  VocabNotebookLesson,
  VocabNotebookUnit,
  VocabReviewWord
} from '../../types';
import { vocabReviewService } from '../../services/vocabReviewService';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { useAuth } from '../../context/AuthContext';
import { playWordAudio, preloadWordAudio, sfx, stopWordAudio } from '../../utils/audio';
import { childSpeechEngine } from '../../utils/speechRecognition';
import { getSensibleSentenceClient } from '../../utils/sentenceDictionary';
import { KokoMascot } from './KokoMascot';
import { ListenChooseEngine } from './games/ListenChooseEngine';
import { RoundMark, Stage2RoundMarks } from './lesson/Stage2RoundMarks';
import { MemoryTreeIcon, memoryTreeLabel } from './vocab/MemoryTreeIcon';

interface ChildVocabNotebookSectionProps {
  onNavigateTab: (tab: string) => void;
  autoStartReview?: boolean;
}

type FilterType = 'all' | 'due' | 'mastered';
type MicState = 'idle' | 'intro' | 'listening' | 'success' | 'retry' | 'unsupported' | 'permission_denied' | 'error';
type ReviewResult = { word: VocabReviewWord; wrongAttempts: number; pending: boolean };

const MIN_PARENT_HOLD_MS = 1400;
const SESSION_LIMIT_FALLBACK = 5;
const MAX_LEVEL_FALLBACK = 5;
const ROUNDS = roundsConfig as Array<{ code: number; key: string; name: string }>;

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00.000Z`);
const dueLabel = (dueOn: string | null | undefined, today: string) => {
  if (!dueOn || !today) return '';
  const days = Math.round((dayNumber(dueOn) - dayNumber(today)) / 86400000);
  if (!Number.isFinite(days)) return '';
  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'ngày mai';
  return `${days} ngày nữa`;
};
const duePhrase = (word: VocabReviewWord, today: string) => {
  const label = dueLabel(word.dueOn, today);
  return label === 'hôm nay' ? 'Cần ôn hôm nay' : label ? `Ôn lại vào ${label}` : '';
};

const opinionKey = (childId: string) => `kc_vocab_self_marks_${childId}`;
const readOpinions = (childId: string): Record<string, number> => {
  try {
    const rows = JSON.parse(localStorage.getItem(opinionKey(childId)) || '{}');
    return rows && typeof rows === 'object' ? rows : {};
  } catch {
    return {};
  }
};
const saveOpinion = (childId: string, vocabId: string) => {
  const rows = readOpinions(childId);
  rows[vocabId] = Date.now();
  localStorage.setItem(opinionKey(childId), JSON.stringify(rows));
};

const emptyNotebook = (ageGroup: AgeGroupCode, words: VocabReviewWord[]): VocabNotebook => ({
  ageGroup,
  today: '',
  summary: { total: words.length, mastered: 0, learning: words.length, dueToday: 0 },
  dueToday: [],
  limits: { dailyDueLimit: 10, sessionLimit: SESSION_LIMIT_FALLBACK },
  units: words.length ? [{
    _id: 'explore',
    unitNumber: 0,
    title: 'Từ đã khám phá',
    subtitle: 'Đang chờ đồng bộ',
    icon: 'explore',
    color: '#0EA5E9',
    locked: false,
    totalWords: words.length,
    learnedWords: words.length,
    masteredWords: 0,
    dueWords: 0,
    lessons: [{
      _id: 'explore',
      title: 'Từ đã khám phá',
      vietnameseTitle: '',
      displayOrder: 0,
      totalWords: words.length,
      learnedWords: words.length,
      masteredWords: 0,
      dueWords: 0,
      words
    }]
  }] : []
});

const offlineNotebook = (childId: string, ageGroup: AgeGroupCode): VocabNotebook => {
  const words: VocabReviewWord[] = vocabMasteryService.getAllLearnedWords(childId).map((word) => ({
    vocabId: word.vocabId,
    english: word.english,
    vietnamese: word.vietnamese,
    pronunciation: word.pronunciation,
    imageUrl: word.imageUrl,
    audioUrl: word.audioUrl,
    category: word.category,
    exampleSentence: word.exampleSentence,
    exampleSentenceVietnamese: word.exampleSentenceVietnamese,
    level: 0,
    maxLevel: MAX_LEVEL_FALLBACK,
    dueOn: null,
    dueAt: null,
    status: 'LEARNING',
    mastered: false,
    lastOutcome: null,
    lastRounds: [],
    lastPracticedOn: null
  }));
  return emptyNotebook(ageGroup, words);
};

const FilterButton: React.FC<{ value: FilterType; label: string; count: number; icon: React.ReactNode; selected: boolean; onSelect: (value: FilterType) => void }> = ({ value, label, count, icon, selected, onSelect }) => (
  <button type="button" aria-pressed={selected} onClick={() => onSelect(value)} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition-transform active:scale-95 ${selected ? 'bg-emerald-700 text-white ring-2 ring-emerald-300' : 'border-2 border-emerald-100 bg-white text-slate-700'}`}>
    {icon}<span>{label}</span><span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{count}</span>
  </button>
);

const WordMarks: React.FC<{ word: VocabReviewWord; ageGroup: AgeGroupCode; size?: 'sm' | 'md' }> = ({ word, ageGroup, size = 'sm' }) => {
  if (!word.lastRounds.some((round) => round.code != null)) return null;
  return <Stage2RoundMarks rounds={word.lastRounds as any} ageGroup={ageGroup} size={size} />;
};

const WordCard: React.FC<{
  word: VocabReviewWord;
  ageGroup: AgeGroupCode;
  today: string;
  confirmed: boolean;
  opinionated: boolean;
  onOpen: (word: VocabReviewWord) => void;
  cardRef?: (element: HTMLButtonElement | null) => void;
}> = ({ word, ageGroup, today, confirmed, opinionated, onOpen, cardRef }) => {
  const isDue = confirmed && Boolean(word.dueOn) && Boolean(today) && word.dueOn! <= today;
  const showEnglish = ageGroup !== '3-4';
  const label = `${word.english}${isDue ? ', đến hạn ôn' : ''}${word.mastered ? ', đã thuộc' : ''}. Mở chi tiết`;
  return <button
    ref={cardRef}
    type="button"
    onClick={() => onOpen(word)}
    aria-label={label}
    className="group relative flex min-h-36 flex-col items-center justify-center gap-1 rounded-3xl border-3 border-emerald-100 bg-white p-2 text-center shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-4 focus-visible:outline-amber-500 sm:min-h-44 sm:p-3"
  >
    {isDue && <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-sky-700" title="Cần ôn hôm nay"><Droplets aria-hidden="true" className="h-4 w-4" /></span>}
    {opinionated && <span className="absolute left-1.5 top-1.5 text-amber-500" title="Bé đã đánh dấu nhớ rồi"><Star aria-hidden="true" className="h-4 w-4 fill-amber-400" /></span>}
    <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50">
      {word.imageUrl
        ? <img src={word.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.hidden = true; }} />
        : <Sparkles aria-hidden="true" className="h-8 w-8 text-amber-400" />}
    </span>
    {showEnglish && <span className="max-w-full truncate text-lg font-black capitalize text-slate-900 sm:text-xl">{word.english}</span>}
    <WordMarks word={word} ageGroup={ageGroup} />
    {confirmed && <MemoryTreeIcon level={word.level} maxLevel={word.maxLevel} mastered={word.mastered} className="h-8 w-8" />}
  </button>;
};

const buildQuickQuestion = (word: VocabReviewWord, pool: VocabReviewWord[], ageGroup: AgeGroupCode): ActivityQuestion => {
  const optionCount = ageGroup === '3-4' ? 2 : 4;
  const chosen: VocabReviewWord[] = [word];
  const seen = new Set([word.vocabId]);
  for (const candidate of pool) {
    if (chosen.length >= optionCount) break;
    if (seen.has(candidate.vocabId) || !candidate.english) continue;
    seen.add(candidate.vocabId);
    chosen.push(candidate);
  }
  const options: ActivityOption[] = chosen.map((item) => ({
    id: item.vocabId,
    text: item.english,
    imageUrl: item.imageUrl,
    isCorrect: item.vocabId === word.vocabId,
  }));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { promptText: word.english, promptAudioUrl: word.audioUrl, correctAnswer: word.vocabId, options };
};

const QuickQuestion: React.FC<{
  word: VocabReviewWord;
  pool: VocabReviewWord[];
  ageGroup: AgeGroupCode;
  onAnswer: (wrongAttempts: number) => void;
}> = ({ word, pool, ageGroup, onAnswer }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const timer = useRef<number | null>(null);
  const question = useMemo(() => buildQuickQuestion(word, pool, ageGroup), [word, pool, ageGroup]);
  const playPrompt = useCallback(() => { void playWordAudio(word.english, word.audioUrl); }, [word]);

  useEffect(() => { playPrompt(); }, [playPrompt]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const selectOption = (option: ActivityOption) => {
    if (feedback !== 'idle') return;
    if (timer.current) window.clearTimeout(timer.current);
    if (option.isCorrect) {
      setSelectedId(option.id);
      setFeedback('correct');
      timer.current = window.setTimeout(() => onAnswer(wrongAttempts), 750);
      return;
    }
    setWrongAttempts((previous) => previous + 1);
    setSelectedId(option.id);
    setFeedback('wrong');
    setWrongIds((previous) => previous.includes(option.id) ? previous : [...previous, option.id]);
    timer.current = window.setTimeout(() => { setFeedback('idle'); setSelectedId(null); }, 650);
  };

  return <div className="flex min-h-0 flex-1 flex-col">
    <p className="shrink-0 pb-1 text-center text-sm font-black text-slate-600">Nghe từ rồi chạm vào hình đúng nhé!</p>
    <div className="min-h-0 flex-1">
      <ListenChooseEngine
        question={question}
        selectedOptionId={selectedId}
        feedbackState={feedback}
        onSelectOption={selectOption}
        onPlayPrompt={playPrompt}
        practiceMode
        disabledOptionIds={wrongIds}
      />
    </div>
  </div>;
};

const QuickReview: React.FC<{
  words: VocabReviewWord[];
  pool: VocabReviewWord[];
  ageGroup: AgeGroupCode;
  results: ReviewResult[];
  done: boolean;
  busy: boolean;
  offline: boolean;
  onAnswer: (wrongAttempts: number) => void;
  onClose: () => void;
  onFinish: () => void;
}> = ({ words, pool, ageGroup, results, done, busy, offline, onAnswer, onClose, onFinish }) => {
  const index = results.length;
  const word = words[index];
  return <section className="flex h-full min-h-0 flex-col gap-2 pb-16 sm:pb-20 xl:pb-0" aria-label="Ôn nhanh từ vựng">
    <div className="flex shrink-0 items-center justify-between gap-2">
      <p className="text-lg font-black text-slate-800">{done ? 'Xong rồi!' : `Ôn nhanh · ${Math.min(index + 1, words.length)}/${words.length}`}</p>
      <button type="button" onClick={onClose} aria-label="Đóng ôn nhanh" className="grid min-h-12 min-w-12 place-items-center rounded-full bg-white text-slate-800"><X /></button>
    </div>

    {!done && word && <div className="flex min-h-0 flex-1 flex-col gap-2">
      {offline && <p role="status" className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-100 px-3 py-1.5 text-sm font-black text-amber-950"><CloudOff className="h-4 w-4" />Đang chờ đồng bộ</p>}
      <QuickQuestion key={word.vocabId} word={word} pool={pool} ageGroup={ageGroup} onAnswer={onAnswer} />
      {busy && <p role="status" className="shrink-0 text-center text-xs font-bold text-slate-500">Đang lưu kết quả…</p>}
    </div>}

    {done && <div className="min-h-0 flex-1 overflow-y-auto">
      <ul className="mx-auto flex max-w-xl flex-col gap-2">
        {results.map((result) => <li key={result.word.vocabId} className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-2">
          <RoundMark round={{ rating: result.wrongAttempts === 0 ? 'SECURE' : 'PRACTICE', wrongAttemptCount: result.wrongAttempts } as any} ageGroup={ageGroup} size="md" decorative />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-black capitalize text-slate-900">{result.word.english}</span>
            <span className="block text-xs font-bold text-slate-600">{result.pending ? 'Đang chờ đồng bộ' : result.wrongAttempts === 0 ? 'Đúng ngay' : `Cần ôn thêm · ${result.wrongAttempts} lần chọn sai`}</span>
          </span>
        </li>)}
      </ul>
      <button type="button" onClick={onFinish} className="mt-3 min-h-14 w-full rounded-2xl bg-emerald-700 font-black text-white">Xong</button>
    </div>}
  </section>;
};

export const ChildVocabNotebookSection: React.FC<ChildVocabNotebookSectionProps> = ({ onNavigateTab, autoStartReview = false }) => {
  const { user } = useAuth();
  const childId = (user as any)?.id || (user as any)?._id || 'guest';
  const ageGroup: AgeGroupCode = (user as any)?.ageGroupCode || '4-5';

  const [notebook, setNotebook] = useState<VocabNotebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [unitId, setUnitId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const [parentMode, setParentMode] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [opinions, setOpinions] = useState<Record<string, number>>(() => readOpinions(childId));

  const [selected, setSelected] = useState<VocabReviewWord | null>(null);
  const [detailList, setDetailList] = useState<VocabReviewWord[]>([]);
  const [micState, setMicState] = useState<MicState>('idle');
  const [micMessage, setMicMessage] = useState('');

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickWords, setQuickWords] = useState<VocabReviewWord[] | null>(null);
  const [quickResults, setQuickResults] = useState<ReviewResult[]>([]);
  const [quickDone, setQuickDone] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickOffline, setQuickOffline] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const returnFocusId = useRef<string | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const aliveRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const autoStarted = useRef(false);
  const refreshTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!childId || childId === 'guest') {
      setNotebook(offlineNotebook(childId, ageGroup));
      setOffline(true);
      setLoading(false);
      return;
    }
    try {
      const data = await vocabReviewService.getNotebook(childId);
      setNotebook(data);
      setOffline(false);
      setLoadError('');
    } catch {
      setNotebook((current) => current || offlineNotebook(childId, ageGroup));
      setOffline(true);
      setLoadError('Không tải được sổ từ. Bé thử lại nhé.');
    } finally {
      setLoading(false);
    }
  }, [childId, ageGroup]);

  useEffect(() => {
    aliveRef.current = true;
    setOpinions(readOpinions(childId));
    setLoading(true);
    void vocabReviewService.flush(childId).finally(() => { void refresh(); });
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ childId?: string }>).detail;
      if (detail?.childId && detail.childId !== childId) return;
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => { void refresh(); }, 350);
    };
    const onOnline = () => { void vocabReviewService.flush(childId).then(() => refresh()); };
    window.addEventListener('kc_vocab_mastery_updated', onUpdate);
    window.addEventListener('focus', onUpdate);
    window.addEventListener('online', onOnline);
    return () => {
      aliveRef.current = false;
      window.clearTimeout(refreshTimer.current);
      window.clearTimeout(holdTimer.current);
      window.removeEventListener('kc_vocab_mastery_updated', onUpdate);
      window.removeEventListener('focus', onUpdate);
      window.removeEventListener('online', onOnline);
      childSpeechEngine.stop();
      stopWordAudio();
    };
  }, [childId, refresh]);

  const scrollKey = unitId ? (lessonId ? `lesson:${lessonId}` : `unit:${unitId}`) : 'units';
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = scrollPositions.current.get(scrollKey) || 0;
  }, [scrollKey]);

  const rememberScroll = () => {
    if (scrollRef.current) scrollPositions.current.set(scrollKey, scrollRef.current.scrollTop);
  };
  const openUnit = (unit: VocabNotebookUnit) => {
    if (unit.locked) return;
    sfx.playPop();
    rememberScroll();
    setFilter('all');
    setUnitId(unit._id);
    setLessonId(null);
  };
  const openLesson = (lesson: VocabNotebookLesson) => {
    sfx.playPop();
    rememberScroll();
    setFilter('all');
    setLessonId(lesson._id);
  };
  const goUnits = () => {
    rememberScroll();
    setUnitId(null);
    setLessonId(null);
  };
  const goUnit = () => {
    rememberScroll();
    setLessonId(null);
  };

  const activeUnit = unitId ? notebook?.units.find((unit) => unit._id === unitId) || null : null;
  const activeLesson = activeUnit && lessonId ? activeUnit.lessons.find((lesson) => lesson._id === lessonId) || null : null;

  const filterWords = useCallback((words: VocabReviewWord[]) => {
    const today = notebook?.today || '';
    if (filter === 'mastered') return words.filter((word) => word.mastered);
    if (filter === 'due') return words.filter((word) => Boolean(word.dueOn) && Boolean(today) && word.dueOn! <= today);
    return words;
  }, [filter, notebook?.today]);

  const lessonWords = useMemo(() => activeLesson ? filterWords(activeLesson.words) : [], [activeLesson, filterWords]);
  const allWords = useMemo(() => {
    const byId = new Map<string, VocabReviewWord>();
    (notebook?.units || []).forEach((unit) => unit.lessons.forEach((lesson) => lesson.words.forEach((word) => byId.set(word.vocabId, word))));
    return [...byId.values()];
  }, [notebook]);
  const parentWords = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return query
      ? allWords.filter((word) => `${word.english} ${word.vietnamese}`.toLocaleLowerCase().includes(query))
      : allWords;
  }, [allWords, searchQuery]);
  const averageScore = notebook?.summary.total ? Math.round(notebook.summary.mastered / notebook.summary.total * 100) : 0;

  const openDetail = (word: VocabReviewWord, list: VocabReviewWord[]) => {
    returnFocusId.current = word.vocabId;
    stopWordAudio();
    childSpeechEngine.stop();
    setMicState('idle');
    setMicMessage('');
    setDetailList(list.length ? list : [word]);
    setSelected(word);
    void playWordAudio(word.english, word.audioUrl);
  };
  const closeDetail = useCallback(() => {
    childSpeechEngine.stop();
    stopWordAudio();
    setMicState('idle');
    setMicMessage('');
    const previousId = returnFocusId.current;
    setSelected(null);
    if (previousId) requestAnimationFrame(() => cardRefs.current.get(previousId)?.focus());
  }, []);
  const stopMic = useCallback(() => {
    childSpeechEngine.stop();
    setMicState('idle');
    setMicMessage('');
  }, []);
  const selectedIndex = selected ? detailList.findIndex((word) => word.vocabId === selected.vocabId) : -1;
  const sentence = selected ? getSensibleSentenceClient(selected as any) : null;

  useEffect(() => {
    if (selectedIndex < 0) return;
    const nextWord = detailList[selectedIndex + 1];
    if (!nextWord) return;
    if (nextWord.imageUrl) { const image = new Image(); image.src = nextWord.imageUrl; }
    preloadWordAudio([nextWord.audioUrl]);
  }, [selectedIndex, detailList]);

  useEffect(() => {
    if (!selected) return;
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDetail(); }
      if (event.key === 'ArrowRight' && selectedIndex >= 0 && selectedIndex < detailList.length - 1) {
        event.preventDefault(); stopMic(); stopWordAudio(); setSelected(detailList[selectedIndex + 1]);
      }
      if (event.key === 'ArrowLeft' && selectedIndex > 0) {
        event.preventDefault(); stopMic(); stopWordAudio(); setSelected(detailList[selectedIndex - 1]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selected, selectedIndex, detailList, closeDetail, stopMic]);

  const playSentence = (text: string) => {
    stopWordAudio();
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const startMic = async (word: VocabReviewWord) => {
    if (!childSpeechEngine.isAvailable()) { setMicState('unsupported'); setMicMessage('Thiết bị này chưa nghe được giọng nói. Bé vẫn có thể nghe Koko đọc nhé!'); return; }
    stopWordAudio();
    setMicState('listening'); setMicMessage('Koko đang lắng nghe…');
    const result = await childSpeechEngine.listenAndVerify(word.english, 6000);
    if (!aliveRef.current) return;
    if (result.isMatch) {
      setMicState('success'); setMicMessage('Giỏi quá! Bé nói rất rõ!');
      sfx.playCorrect();
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

  const markOpinion = (word: VocabReviewWord) => {
    sfx.playPop();
    saveOpinion(childId, word.vocabId);
    setOpinions(readOpinions(childId));
  };

  const startQuickReview = useCallback(async () => {
    if (!notebook) return;
    const limit = notebook.limits.sessionLimit || SESSION_LIMIT_FALLBACK;
    setQuickOpen(true);
    setQuickDone(false);
    setQuickResults([]);
    setQuickBusy(false);
    setQuickOffline(false);
    if (!notebook.summary.dueToday) { setQuickWords([]); return; }
    setQuickWords(null);
    try {
      const due = await vocabReviewService.getDue(childId, limit);
      setQuickWords(due.data.slice(0, limit));
    } catch {
      setQuickWords(notebook.dueToday.slice(0, limit));
      setQuickOffline(true);
    }
  }, [notebook, childId]);

  useEffect(() => {
    if (!autoStartReview || autoStarted.current || !notebook || offline) return;
    if (!notebook.summary.dueToday) return;
    autoStarted.current = true;
    void startQuickReview();
  }, [autoStartReview, notebook, offline, startQuickReview]);

  const answerQuick = async (wrongAttempts: number) => {
    const word = quickWords?.[quickResults.length];
    if (!word || quickBusy) return;
    setQuickBusy(true);
    let pending = true;
    try {
      const result = await vocabReviewService.record(childId, word.vocabId, {
        isCorrect: true,
        wrongAttempts,
        independent: wrongAttempts === 0,
        activityType: 'QUICK_REVIEW'
      });
      pending = result.pending;
    } catch {
      pending = true;
    }
    setQuickResults((previous) => [...previous, { word, wrongAttempts, pending }]);
    setQuickBusy(false);
    if (quickResults.length + 1 >= (quickWords?.length || 0)) setQuickDone(true);
  };
  const closeQuick = () => {
    stopWordAudio();
    setQuickOpen(false);
    setQuickWords(null);
    setQuickResults([]);
    setQuickDone(false);
    setQuickOffline(false);
    void refresh();
  };
  const finishQuick = () => { closeQuick(); };

  const beginParentHold = () => {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => { setShowParentGate(false); setParentMode(true); setSearchQuery(''); }, MIN_PARENT_HOLD_MS);
  };

  if (quickOpen) {
    if (quickWords === null) {
      return <section className="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-b from-amber-50 to-emerald-50 p-6 pb-20 xl:pb-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <p className="text-base font-black text-slate-800">Đang chuẩn bị các từ cần ôn…</p>
      </section>;
    }
    const words = quickWords;
    if (!words.length) {
      return <section className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-b from-amber-50 to-emerald-50 p-6 pb-20 text-center xl:pb-6">
        <KokoMascot state="celebrating" size="md" interactive={false} />
        <h2 className="text-2xl font-black text-slate-900">Hôm nay bé đã ôn đủ rồi!</h2>
        <p className="text-lg font-bold text-slate-700">Mình chơi một trò chơi hoặc học bài mới nhé.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => { setQuickOpen(false); onNavigateTab('games'); }} className="min-h-12 rounded-2xl bg-sky-700 px-5 font-black text-white">Chơi trò chơi</button>
          <button type="button" onClick={() => setQuickOpen(false)} className="min-h-12 rounded-2xl bg-white px-5 font-black text-slate-800">Đóng</button>
        </div>
      </section>;
    }
    return <QuickReview
      words={words}
      pool={allWords}
      ageGroup={ageGroup}
      results={quickResults}
      done={quickDone}
      busy={quickBusy}
      offline={quickOffline || quickResults.some((result) => result.pending)}
      onAnswer={(wrongAttempts) => void answerQuick(wrongAttempts)}
      onClose={closeQuick}
      onFinish={finishQuick}
    />;
  }

  const header = <header className="shrink-0 rounded-3xl border-2 border-emerald-100 bg-gradient-to-r from-teal-700 via-emerald-700 to-amber-700 p-2.5 text-white shadow-md sm:p-3">
    <div className="flex items-center gap-2">
      <KokoMascot state="happy" size="sm" interactive={false} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-xl font-black sm:text-2xl">Sổ từ của bé</h2>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black sm:text-sm">{notebook?.summary.mastered || 0}/{notebook?.summary.total || 0} từ đã thuộc</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/25" role="progressbar" aria-label="Tiến độ từ đã thuộc" aria-valuemin={0} aria-valuemax={notebook?.summary.total || 0} aria-valuenow={notebook?.summary.mastered || 0}>
          <div className="h-full rounded-full bg-amber-300" style={{ width: `${averageScore}%` }} />
        </div>
      </div>
      <button type="button" onClick={() => setShowParentGate(true)} aria-label="Mở xác nhận Góc phụ huynh" className="min-h-12 shrink-0 rounded-xl bg-white/20 px-2 text-xs font-black text-white underline underline-offset-2">Góc phụ huynh</button>
    </div>
    <div className="mt-2">
      {notebook?.summary.dueToday
        ? <button type="button" onClick={() => void startQuickReview()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-3 text-base font-black text-amber-950 shadow"><Droplets className="h-5 w-5" /><span>Cần ôn hôm nay · {notebook.summary.dueToday} từ</span></button>
        : <button type="button" onClick={() => onNavigateTab('games')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-3 text-base font-black text-white"><Gamepad2 className="h-5 w-5" /><span>Bé làm tốt lắm! Chơi trò chơi nào</span></button>}
    </div>
  </header>;

  const unitListView = <div className="flex flex-col gap-3">
    {(notebook?.dueToday?.length || 0) > 0 && <section aria-label="Cần ôn hôm nay">
      <h3 className="mb-1.5 flex items-center gap-2 text-lg font-black text-slate-900"><Droplets className="h-5 w-5 text-sky-600" />Cần ôn hôm nay<span className="text-sm font-bold text-slate-600">· {notebook?.summary.dueToday} từ</span></h3>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(notebook?.dueToday || []).map((word) => <button key={word.vocabId} type="button" onClick={() => openDetail(word, notebook?.dueToday || [])} aria-label={`Ôn từ ${word.english} hôm nay`} className="flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border-2 border-sky-200 bg-sky-50 p-1.5 text-center">
          {word.imageUrl ? <img src={word.imageUrl} alt="" className="h-14 w-14 object-contain" /> : <Sparkles className="h-10 w-10 text-amber-400" />}
          <span className="max-w-full truncate text-xs font-black capitalize text-slate-900">{word.english}</span>
          <WordMarks word={word} ageGroup={ageGroup} />
        </button>)}
      </div>
    </section>}

    <section aria-label="Các Unit">
      <h3 className="mb-1.5 flex items-center gap-2 text-lg font-black text-slate-900"><BookMarked className="h-5 w-5 text-emerald-700" />Unit trong sổ từ</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {(notebook?.units || []).map((unit) => {
          const firstImage = unit.lessons.flatMap((lesson) => lesson.words).find((word) => word.imageUrl)?.imageUrl;
          const percent = unit.totalWords ? Math.round(unit.learnedWords / unit.totalWords * 100) : 0;
          return <button key={unit._id} type="button" disabled={unit.locked} onClick={() => openUnit(unit)} aria-label={`${unit.title}${unit.locked ? ', chưa mở' : ''}, đã học ${unit.learnedWords} trên ${unit.totalWords} từ`} className={`flex min-h-20 items-center gap-3 rounded-3xl border-2 p-2.5 text-left shadow-sm transition-transform active:scale-[0.98] focus-visible:outline-4 focus-visible:outline-amber-500 ${unit.locked ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60' : 'border-emerald-200 bg-white hover:-translate-y-0.5'}`}>
            <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ backgroundColor: `${unit.color || '#F59E0B'}22` }}>
              {firstImage ? <img src={firstImage} alt="" className="h-full w-full object-contain p-1" /> : <BookOpen className="h-8 w-8 text-emerald-700" />}
              {unit.locked && <span className="absolute inset-0 grid place-items-center bg-slate-900/45 text-white"><Lock className="h-6 w-6" /></span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-black text-slate-900">{unit.title}</span>
              {unit.subtitle && <span className="block truncate text-xs font-bold text-slate-600">{unit.subtitle}</span>}
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></span>
              <span className="mt-0.5 flex items-center gap-2 text-xs font-bold text-slate-600"><span>{unit.learnedWords}/{unit.totalWords} từ</span>{unit.dueWords > 0 && <span className="inline-flex items-center gap-0.5 text-sky-700"><Droplets className="h-3.5 w-3.5" />{unit.dueWords}</span>}{unit.locked && <span className="text-slate-500">Chưa mở</span>}</span>
            </span>
          </button>;
        })}
      </div>
    </section>
  </div>;

  const unitView = activeUnit && <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <button type="button" onClick={goUnits} aria-label="Quay lại danh sách Unit" className="grid min-h-12 min-w-12 place-items-center rounded-2xl bg-white text-slate-800 shadow-sm"><ArrowLeft /></button>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xl font-black text-slate-900">{activeUnit.title}</h3>
        {activeUnit.subtitle && <p className="truncate text-sm font-bold text-slate-600">{activeUnit.subtitle}</p>}
      </div>
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-950">{activeUnit.learnedWords}/{activeUnit.totalWords} từ</span>
    </div>
    <ul className="flex flex-col gap-2">
      {activeUnit.lessons.map((lesson) => <li key={lesson._id}>
        <button type="button" onClick={() => openLesson(lesson)} aria-label={`${lesson.title}, ${lesson.learnedWords} trên ${lesson.totalWords} từ`} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-2 text-left shadow-sm transition-transform active:scale-[0.98]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><BookOpen className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-black text-slate-900">{lesson.title}</span>
            {lesson.vietnameseTitle && <span className="block truncate text-xs font-bold text-slate-600">{lesson.vietnameseTitle}</span>}
            <span className="block text-xs font-bold text-slate-600">{lesson.learnedWords}/{lesson.totalWords} từ · {lesson.masteredWords} đã thuộc</span>
          </span>
          {lesson.dueWords > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-1 text-xs font-black text-sky-800"><Droplets className="h-3.5 w-3.5" />{lesson.dueWords}</span>}
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </li>)}
    </ul>
  </div>;

  const lessonView = activeUnit && activeLesson && <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <button type="button" onClick={goUnit} aria-label={`Quay lại ${activeUnit.title}`} className="grid min-h-12 min-w-12 place-items-center rounded-2xl bg-white text-slate-800 shadow-sm"><ArrowLeft /></button>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xl font-black text-slate-900">{activeLesson.title}</h3>
        <p className="text-xs font-bold text-slate-600">{activeUnit.title} · {activeLesson.learnedWords}/{activeLesson.totalWords} từ</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <FilterButton value="all" label="Tất cả" count={activeLesson.words.length} icon={<BookMarked size={18} />} selected={filter === 'all'} onSelect={setFilter} />
      <FilterButton value="due" label="Cần ôn" count={activeLesson.dueWords} icon={<Droplets size={18} />} selected={filter === 'due'} onSelect={setFilter} />
      <FilterButton value="mastered" label="Đã thuộc" count={activeLesson.masteredWords} icon={<Star size={18} />} selected={filter === 'mastered'} onSelect={setFilter} />
    </div>
    {lessonWords.length === 0
      ? <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl bg-white p-4 text-center">
        <KokoMascot state="thinking" size="sm" interactive={false} />
        <p className="text-lg font-black text-slate-900">{activeLesson.words.length ? 'Không có từ trong nhóm này' : 'Chưa có từ nào trong album'}</p>
        <p className="text-sm font-bold text-slate-600">{activeLesson.words.length ? 'Bé chọn nhóm khác nhé.' : 'Học xong Chặng 2, từ sẽ xuất hiện ở đây.'}</p>
        {filter !== 'all' && <button type="button" onClick={() => setFilter('all')} className="min-h-12 rounded-2xl bg-emerald-700 px-4 font-black text-white">Xem tất cả</button>}
      </div>
      : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {lessonWords.map((word) => <WordCard
          key={word.vocabId}
          word={word}
          ageGroup={ageGroup}
          today={notebook?.today || ''}
          confirmed={!offline}
          opinionated={Boolean(opinions[word.vocabId])}
          cardRef={(element) => { if (element) cardRefs.current.set(word.vocabId, element); else cardRefs.current.delete(word.vocabId); }}
          onOpen={(item) => openDetail(item, lessonWords)}
        />)}
      </div>}
  </div>;

  const parentView = <div className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2">
      <label className="relative min-w-48 flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm tiếng Anh hoặc tiếng Việt" aria-label="Tìm từ bằng tiếng Anh hoặc tiếng Việt" className="min-h-12 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-base font-bold text-slate-900" />
      </label>
      {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="min-h-12 rounded-xl bg-slate-100 px-4 font-black text-slate-800">Xóa tìm kiếm</button>}
      <span className="text-sm font-bold text-slate-700">{notebook?.summary.mastered || 0}/{notebook?.summary.total || 0} từ đã thuộc · {notebook?.summary.dueToday || 0} cần ôn</span>
    </div>
    <div className="space-y-2">
      {parentWords.map((word) => <article key={word.vocabId} className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-2">
        {word.imageUrl ? <img src={word.imageUrl} alt="" className="h-14 w-14 rounded-xl bg-slate-50 object-contain" /> : <Sparkles className="h-10 w-10 text-amber-400" />}
        <div className="min-w-32 flex-1">
          <h3 className="text-lg font-black capitalize text-slate-900">{word.english}</h3>
          <p className="text-sm font-bold text-slate-700">{word.vietnamese} · Cấp {word.level}/{word.maxLevel} · {word.dueOn ? duePhrase(word, notebook?.today || '') || `Ôn ngày ${word.dueOn}` : 'Chưa có lịch ôn'}</p>
          <div className="mt-1"><WordMarks word={word} ageGroup={ageGroup} size="md" /></div>
          {opinions[word.vocabId] && <p className="text-xs font-bold text-amber-700">Ý kiến của bé: đã nhớ rồi</p>}
        </div>
        <button type="button" onClick={() => void playWordAudio(word.english, word.audioUrl)} aria-label={`Nghe từ ${word.english}`} className="min-h-12 min-w-12 rounded-xl bg-sky-100 text-sky-900"><Volume2 className="mx-auto" /></button>
        <button type="button" onClick={() => openDetail(word, parentWords)} className="min-h-12 rounded-xl bg-indigo-100 px-3 font-black text-indigo-950">Chi tiết</button>
      </article>)}
      {parentWords.length === 0 && <p className="rounded-2xl bg-white p-4 text-center text-base font-bold text-slate-700">Không tìm thấy từ phù hợp.</p>}
    </div>
  </div>;

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col gap-2">
      {header}

      {offline && <div role="status" className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-950">
        <CloudOff className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">Đang chờ đồng bộ. Kết quả và lịch ôn sẽ hiện khi máy chủ xác nhận.</span>
        <button type="button" onClick={() => void refresh()} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-amber-200 px-3"><RefreshCw className="h-4 w-4" />Thử lại</button>
      </div>}
      {loadError && !offline && <p role="status" className="shrink-0 rounded-2xl bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-950">{loadError}</p>}

      {parentMode && <button type="button" onClick={() => { setParentMode(false); setSearchQuery(''); }} className="shrink-0 self-end rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Thoát Góc phụ huynh</button>}

      <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto rounded-3xl bg-[#fffdf7] p-2 sm:p-3" aria-label={parentMode ? 'Danh sách từ vựng phụ huynh' : 'Sổ từ vựng của bé'}>
        {loading && !notebook
          ? <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3"><div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /><p className="text-sm font-black text-slate-700">Đang mở sổ từ…</p></div>
          : parentMode
            ? parentView
            : !notebook || notebook.summary.total === 0
              ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
                <KokoMascot state="thinking" size="md" interactive={false} />
                <h3 className="text-2xl font-black text-slate-900">Sổ từ đang chờ từ đầu tiên!</h3>
                <p className="max-w-md text-lg font-bold text-slate-700">Học Chặng 2 của một bài để từ xuất hiện trong sổ và có lịch ôn nhé.</p>
                <button type="button" onClick={() => onNavigateTab('path')} className="min-h-12 rounded-2xl bg-amber-300 px-5 font-black text-amber-950">Vào Hành trình học</button>
              </div>
              : lessonView || unitView || unitListView}
        <div className="h-20 xl:hidden" aria-hidden="true" />
      </main>

      {showParentGate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="parent-gate-title"><div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><h2 id="parent-gate-title" className="text-xl font-black text-slate-900">Dành cho người lớn</h2><p className="my-3 text-base font-bold text-slate-700">Nhấn và giữ nút bên dưới trong một lúc để mở danh sách chi tiết.</p><button type="button" onPointerDown={beginParentHold} onPointerUp={() => window.clearTimeout(holdTimer.current)} onPointerLeave={() => window.clearTimeout(holdTimer.current)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') beginParentHold(); }} onKeyUp={(event) => { if (event.key === 'Enter' || event.key === ' ') window.clearTimeout(holdTimer.current); }} className="min-h-14 w-full rounded-2xl bg-emerald-700 font-black text-white">Giữ để xác nhận</button><button type="button" onClick={() => setShowParentGate(false)} className="mt-2 min-h-12 px-4 font-bold text-slate-700">Đóng</button></div></div>}

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="word-dialog-title" className="flex max-h-[94dvh] w-full max-w-xl flex-col gap-2 overflow-hidden rounded-t-3xl border-4 border-amber-200 bg-[#fffdf7] p-3 shadow-2xl outline-none sm:rounded-3xl sm:p-4">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-black text-emerald-950"><MemoryTreeIcon level={selected.level} maxLevel={selected.maxLevel} mastered={selected.mastered} className="h-5 w-5" />{memoryTreeLabel(selected.level, selected.maxLevel, selected.mastered)}</span>
            <button type="button" onClick={closeDetail} aria-label="Đóng chi tiết từ" className="min-h-12 min-w-12 rounded-full bg-slate-200 text-slate-900"><X className="mx-auto" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selected.imageUrl
              ? <img src={selected.imageUrl} alt={selected.english} className="mx-auto my-1 h-32 w-full object-contain sm:h-40" />
              : <Sparkles className="mx-auto my-4 h-20 w-20 text-amber-400" aria-hidden="true" />}
            <h2 id="word-dialog-title" className="text-center text-4xl font-black capitalize text-slate-950 sm:text-5xl">{selected.english}</h2>
            <p className="mt-1 text-center text-lg font-bold text-slate-700">{selected.pronunciation && <span>/{selected.pronunciation}/ · </span>}{selected.vietnamese}</p>

            {selected.lastRounds.some((round) => round.code != null) && <section className="mt-2" aria-label={`Kết quả vòng gần nhất của ${selected.english}`}>
              <h3 className="text-center text-sm font-black text-slate-700">Kết quả vòng gần nhất</h3>
              <ol className="mt-1 flex flex-col gap-1">
                {ROUNDS.map((config) => {
                  const round = selected.lastRounds.find((item) => Number(item.code) === config.code);
                  return <li key={config.code} className="flex min-h-12 items-center gap-2 rounded-2xl bg-white px-2 py-1">
                    <RoundMark round={round as any} ageGroup={ageGroup} size="lg" decorative />
                    <span className="min-w-0 flex-1"><span className="block text-xs font-black text-amber-700">Vòng {config.code}</span><span className="block truncate text-xl font-black text-slate-900">{config.name}</span></span>
                  </li>;
                })}
              </ol>
            </section>}

            {!offline && ageGroup !== '3-4' && selected.dueOn && <p className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-sky-100 px-3 py-1.5 text-base font-black text-sky-950"><Droplets className="h-5 w-5" />{duePhrase(selected, notebook?.today || '')}</p>}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void playWordAudio(selected.english, selected.audioUrl)} className="min-h-12 rounded-2xl bg-sky-700 font-black text-white"><Volume2 className="mr-1 inline h-5 w-5" />Nghe từ</button>
              {sentence?.en && <button type="button" onClick={() => playSentence(sentence.en)} className="min-h-12 rounded-2xl bg-indigo-700 font-black text-white">Nghe câu ví dụ</button>}
              <button type="button" onClick={() => micState === 'listening' ? stopMic() : micState === 'intro' ? void startMic(selected) : (setMicState('intro'), setMicMessage('Trước khi bật micro, bé hãy nhờ người lớn ở bên cạnh nhé.'))} className="col-span-2 min-h-12 rounded-2xl bg-rose-100 font-black text-rose-950"><Mic className="mr-1 inline h-5 w-5" />{micState === 'listening' ? 'Dừng micro' : micState === 'intro' ? 'Bắt đầu nghe' : 'Bé đọc cùng Koko'}</button>
            </div>
            {micMessage && <p role="status" aria-live="polite" className="mt-2 rounded-2xl bg-amber-50 p-2 text-center text-base font-black text-slate-900">{micMessage}{['retry', 'error', 'permission_denied'].includes(micState) && <button type="button" onClick={() => void startMic(selected)} className="ml-2 min-h-10 rounded-xl bg-amber-300 px-3 text-sm text-amber-950">Thử lại</button>}</p>}

            <button type="button" onClick={() => markOpinion(selected)} className="mt-2 min-h-12 w-full rounded-2xl bg-emerald-700 font-black text-white">{opinions[selected.vocabId] ? 'Bé đã đánh dấu nhớ rồi' : 'Bé nhớ rồi (ghi nhận ý kiến)'}</button>
            <p className="mt-1 text-center text-xs font-bold text-slate-600">Máy chủ quyết định cấp ghi nhớ và ngày ôn; nút này chỉ ghi nhận ý kiến của bé.</p>
          </div>
          <div className="flex shrink-0 justify-between gap-3">
            <button type="button" disabled={selectedIndex <= 0} onClick={() => { stopMic(); stopWordAudio(); setSelected(detailList[selectedIndex - 1]); }} className="min-h-12 flex-1 rounded-xl bg-slate-200 font-black text-slate-900 disabled:opacity-50"><ChevronLeft className="mr-1 inline" />Từ trước</button>
            <button type="button" disabled={selectedIndex < 0 || selectedIndex >= detailList.length - 1} onClick={() => { stopMic(); stopWordAudio(); setSelected(detailList[selectedIndex + 1]); }} className="min-h-12 flex-1 rounded-xl bg-slate-200 font-black text-slate-900 disabled:opacity-50">Từ tiếp theo<ChevronRight className="ml-1 inline" /></button>
          </div>
        </div>
      </div>}
    </div>
  );
};
