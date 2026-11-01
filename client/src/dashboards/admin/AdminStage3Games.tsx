import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, Save } from 'lucide-react';
import { api } from '../../services/api';
import { selectGames } from '../../utils/gameSelection';
import { GameRunner } from '../../games/core/GameRunner';
import { getAvailableLessonGames } from '../../games/registry';
import type { GameId } from '../../games/core/types';
import type { AgeGroupCode } from '../../types';

type Game = { id: string; category: string; gameId?: string; title: string; icon: string; enabled: boolean; displayOrder: number; minVocab: number; supportedLessons?: number; requiresTransparentImage?: boolean; supportedWordTypes: string[] };
export function AdminStage3Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState<Array<{ _id: string; title: string; ageGroupCode: string }>>([]);
  const [lessonId, setLessonId] = useState('');
  const [preview, setPreview] = useState<any>();
  const [previewError, setPreviewError] = useState('');
  const [playing, setPlaying] = useState<GameId | null>(null);
  useEffect(() => {
    setPreview(undefined); setPreviewError(''); setPlaying(null);
    if (!lessonId) return;
    const abort = new AbortController();
    api.get('/admin/game-catalog/preview?lessonId=' + lessonId, abort.signal).then(result => { if (!abort.signal.aborted) setPreview(result.data); }).catch(error => { if (!abort.signal.aborted) setPreviewError(error.message); });
    return () => abort.abort();
  }, [lessonId]);
  const load = async () => {
    setLoading(true); setError(''); setMessage('');
    try { const { data } = await api.get('/admin/game-catalog'); setGames(data.games); setLessons(data.lessons || []); setRevision(data.revision); setDirty(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được danh mục.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const move = (index: number, delta: number) => {
    setGames(current => { const next = [...current]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
    setDirty(true); setMessage('');
  };
  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const { data } = await api.put('/admin/game-catalog', { revision, games: games.map((game, displayOrder) => ({ gameId: game.id, enabled: game.enabled, displayOrder })) });
      setGames(data.games); setRevision(data.revision); setDirty(false); setMessage('Đã lưu. Các bé nhận danh mục mới khi mở lại bài học.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được cấu hình.'); }
    finally { setSaving(false); }
  };
  const previewGames = preview ? selectGames(games, games.filter(game => getAvailableLessonGames(preview.vocabularyItems,1,1,[game.id]).length).map(game=>game.id),1,preview.displayOrder||1) : [];
  return <section className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">12 trò chơi ở chặng 3 của trẻ</h2><p className="mt-1 text-sm text-slate-600">Bật/tắt và xếp ưu tiên trong từng nhóm. Hệ thống xoay vòng theo bài, chọn tối đa 4 trò phù hợp; bé hoàn thành 2 trò khác nhau.</p></div><div className="flex items-start gap-2"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-50" onClick={() => void load()} disabled={loading || saving}><RefreshCw size={16} /> Tải lại</button><button className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={!dirty || saving || loading} onClick={() => void save()}><Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button></div></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{message}</p>}
    {loading ? <p role="status">Đang tải cấu hình trò chơi…</p> : <ol className="grid gap-3 md:grid-cols-2">{games.map((game, index) => <li key={game.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="text-slate-500 text-sm">{index + 1}</span><span className="text-2xl" aria-hidden="true">{game.icon}</span><div className="flex-1 min-w-0"><strong className="text-sm text-slate-900">{game.title}</strong><p className="text-xs text-slate-500">Tối thiểu {game.minVocab} từ · {game.supportedWordTypes.join(", ")}{game.requiresTransparentImage?" · Ảnh tách nền":""}{game.supportedLessons!=null?` · Phù hợp ${game.supportedLessons} bài`:""}</p></div><label className="flex items-center gap-1 text-sm whitespace-nowrap"><input type="checkbox" checked={game.enabled} disabled={saving} onChange={e => { setGames(current => current.map(row => row.id === game.id ? { ...row, enabled: e.target.checked } : row)); setDirty(true); setMessage(''); }} />Bật</label><div className="flex flex-col gap-1"><button aria-label={'Đưa ' + game.title + ' lên'} disabled={index === 0 || saving} onClick={() => move(index, -1)} className="rounded border p-1 disabled:opacity-30"><ArrowUp size={15} /></button><button aria-label={'Đưa ' + game.title + ' xuống'} disabled={index === games.length - 1 || saving} onClick={() => move(index, 1)} className="rounded border p-1 disabled:opacity-30"><ArrowDown size={15} /></button></div></li>)}</ol>}
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 space-y-3"><h3 className="font-bold">Kiểm tra & chơi thử theo bài học</h3><p className="text-sm">Chọn bài để kiểm tra từ vựng và trải nghiệm trò trước khi giao cho trẻ. Bản chơi thử không ghi kết quả.</p><select aria-label="Bài học để chơi thử" value={lessonId} onChange={event=>setLessonId(event.target.value)} className="w-full rounded-xl border bg-white p-3"><option value="">Chọn bài học</option>{lessons.map(lesson=><option key={lesson._id} value={lesson._id}>{lesson.ageGroupCode} · {lesson.title}</option>)}</select>{previewError&&<p role="alert">{previewError}</p>}{lessonId&&!preview&&!previewError&&<p role="status">Đang kiểm tra học liệu…</p>}{preview&&<><p className="text-sm">{preview.vocabularyItems.length} từ đang hoạt động. Các trò dưới đây theo cấu hình đang chỉnh. Lưu cấu hình để áp dụng cho bé.</p><div className="flex flex-wrap gap-2">{previewGames.map(game=><button type="button" className="rounded-xl border bg-white p-3 font-semibold" key={game.id} onClick={()=>setPlaying(game.id as GameId)}>{game.icon} {game.title}</button>)}</div></>}</div>
    {preview&&playing&&<GameRunner key={lessonId+playing} config={{preview:true,unitId:'catalog-preview',lessonId:'preview-'+lessonId,gameId:playing,vocabularyList:preview.vocabularyItems,ageGroup:preview.ageGroupCode as AgeGroupCode}} onExit={()=>setPlaying(null)} onGameComplete={()=>{}}/>}
  </section>;
}
