import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { GameRunner } from '../../games/core/GameRunner';
import { getAvailableLessonGames } from '../../games/registry';
import type { GameId } from '../../games/core/types';
import type { AgeGroupCode, Vocabulary } from '../../types';
import { KokoMascot } from './KokoMascot';

interface Props {
  vocabularyList?: Vocabulary[];
  ageGroupCode?: string;
  initialSource?: 'learned' | 'mastered' | 'review';
  onNavigateTab?: (tab: string) => void;
}
interface ArcadeLibrary {
  ageGroupCode: AgeGroupCode;
  vocabulary: Array<Vocabulary & { masteryLevel: number }>;
  lessons: Array<{ _id: string; title: string; unitNumber?: number; wordIds: string[] }>;
  gameIds: string[];
}

/** The arcade and lesson stage use the same games, assets and round lifecycle.
 * The API supplies real learned words and the admin catalog; no demo words or
 * fabricated mastery are introduced when a child is new. */
export function ChildArcadeSection({ initialSource = 'learned', onNavigateTab }: Props) {
  const { user } = useAuth();
  const childId = user?._id || user?.id || '';
  const [library, setLibrary] = useState<ArcadeLibrary>();
  const [source, setSource] = useState(initialSource);
  const [lessonId, setLessonId] = useState('');
  const [gameId, setGameId] = useState<GameId | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!childId) return;
    const abort = new AbortController();
    setError(''); setLibrary(undefined); setGameId(null);
    api.get(`/children/${childId}/arcade`, abort.signal).then(result => {
      if (!abort.signal.aborted) setLibrary(result.data);
    }).catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => abort.abort();
  }, [childId, reload]);
  const words = useMemo(() => {
    const selected = library?.lessons.find(lesson => lesson._id === lessonId);
    return (library?.vocabulary || []).filter(word =>
      (!selected || selected.wordIds.includes(word._id)) &&
      (source === 'learned' || (source === 'mastered' ? word.masteryLevel >= 3 : word.masteryLevel < 3))
    );
  }, [library, source, lessonId]);
  const games = useMemo(() => getAvailableLessonGames(words, 1, 1, library?.gameIds || []), [words, library]);
  return <section className="space-y-5">
    <header className="rounded-3xl border border-teal-100 bg-white p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-black tracking-widest text-teal-700">NGHE · CHỌN · CÙNG CHƠI</p><h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-800">Khu vườn trò chơi của bé</h2><p className="mt-2 text-slate-600">Chơi với những từ bé đã khám phá. Mình có thể dừng và nghỉ bất cứ lúc nào.</p></div>
      <KokoMascot state="waving" size="sm" interactive={false}/>
    </header>
    {error ? <div role="alert" className="rounded-2xl bg-amber-50 p-5"><p>{error}</p><button type="button" className="mt-3 rounded-xl border p-3 font-bold" onClick={() => setReload(value => value + 1)}>Thử tải lại</button></div>
      : !library ? <p role="status" className="p-5">Koko đang chuẩn bị trò chơi…</p>
      : <>
        <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 items-end">
          <label className="flex-1 min-w-48 font-bold text-sm text-slate-700">Nhóm từ<select value={source} onChange={event => { setSource(event.target.value as typeof source); setDone(false); }} className="mt-2 w-full rounded-xl border p-3"><option value="learned">Từ bé đã khám phá</option><option value="mastered">Từ bé đã nhớ</option><option value="review">Từ mình cùng ôn</option></select></label>
          <label className="flex-1 min-w-48 font-bold text-sm text-slate-700">Bài đã học<select value={lessonId} onChange={event => { setLessonId(event.target.value); setDone(false); }} className="mt-2 w-full rounded-xl border p-3"><option value="">Tất cả bài đã khám phá</option>{library.lessons.map(lesson => <option key={lesson._id} value={lesson._id}>{lesson.unitNumber ? `Unit ${lesson.unitNumber} · ` : ''}{lesson.title}</option>)}</select></label>
          <span className="p-3 font-bold text-teal-800">{words.length} từ cùng chơi</span>
        </div>
        {done && <p role="status" className="rounded-2xl bg-teal-50 p-4 font-bold text-teal-800">Bé đã cố gắng thật tốt! Mình cùng vươn vai và nghỉ một chút nhé.</p>}
        {games.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{games.map(game => <button type="button" key={game.id} onClick={() => { setDone(false); setGameId(game.id); }} className="rounded-3xl border-2 border-white bg-white p-6 text-left shadow-sm transition hover:border-teal-300 active:scale-95 motion-reduce:transform-none"><span className="text-5xl" aria-hidden>{game.icon}</span><h3 className="mt-4 text-xl font-black text-slate-800">{game.title}</h3><p className="mt-1 text-sm text-slate-600">{game.subtitle}</p><span className="mt-4 inline-block rounded-full bg-teal-100 px-4 py-2 font-bold text-teal-900">▶ Cùng chơi</span></button>)}</div>
          : <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center"><KokoMascot state="encouraging" size="sm" interactive={false}/><p className="mt-3 font-bold text-slate-800">{words.length ? 'Nhóm từ này chưa đủ để mở trò phù hợp. Bé thử chọn tất cả bài đã khám phá nhé!' : 'Mình cùng khám phá thêm vài tranh trong bài học rồi quay lại chơi nhé!'}</p><button type="button" className="mt-4 rounded-2xl bg-teal-700 px-5 py-3 font-bold text-white" onClick={() => onNavigateTab?.('path')}>Về hành trình</button></div>}
        <p className="text-sm text-slate-500">Trò ôn giúp bé nhớ từ; phần thưởng bài học và rương quà vẫn theo hành trình. <Link className="underline font-semibold text-teal-800" to="/my-learning">Xem bài cô giao ôn ở nhà</Link></p>
      </>}
    {gameId && library && <GameRunner key={childId+lessonId+source+gameId} allowedGameIds={games.map(game=>game.id)} config={{ unitId:'arcade', lessonId:'arcade-'+(lessonId||source), gameId, vocabularyList:words, ageGroup:library.ageGroupCode, childId }} onExit={()=>setGameId(null)} onGameComplete={()=>setDone(true)} onNextGame={next=>setGameId(next as GameId)}/>}
  </section>;
}
