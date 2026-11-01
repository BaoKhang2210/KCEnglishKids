import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, Save } from 'lucide-react';
import { api } from '../../services/api';

type Game = { id: string; gameId?: string; title: string; icon: string; enabled: boolean; displayOrder: number; minVocab: number };
export function AdminStage3Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError(''); setMessage('');
    try { const { data } = await api.get('/admin/game-catalog'); setGames(data.games); setRevision(data.revision); setDirty(false); }
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
  return <section className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">12 trò chơi ở chặng 3 của trẻ</h2><p className="mt-1 text-sm text-slate-600">Bật/tắt và xếp thứ tự ưu tiên. Mỗi bài hiển thị tối đa 4 trò phù hợp với từ vựng; cần hoàn thành 2 trò khác nhau.</p></div><div className="flex items-start gap-2"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-50" onClick={() => void load()} disabled={loading || saving}><RefreshCw size={16} /> Tải lại</button><button className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={!dirty || saving || loading} onClick={() => void save()}><Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button></div></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{message}</p>}
    {loading ? <p role="status">Đang tải cấu hình trò chơi…</p> : <ol className="grid gap-3 md:grid-cols-2">{games.map((game, index) => <li key={game.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="text-slate-500 text-sm">{index + 1}</span><span className="text-2xl" aria-hidden="true">{game.icon}</span><div className="flex-1 min-w-0"><strong className="text-sm text-slate-900">{game.title}</strong><p className="text-xs text-slate-500">Tối thiểu {game.minVocab} từ phù hợp</p></div><label className="flex items-center gap-1 text-sm whitespace-nowrap"><input type="checkbox" checked={game.enabled} disabled={saving} onChange={e => { setGames(current => current.map(row => row.id === game.id ? { ...row, enabled: e.target.checked } : row)); setDirty(true); setMessage(''); }} />Bật</label><div className="flex flex-col gap-1"><button aria-label={'Đưa ' + game.title + ' lên'} disabled={index === 0 || saving} onClick={() => move(index, -1)} className="rounded border p-1 disabled:opacity-30"><ArrowUp size={15} /></button><button aria-label={'Đưa ' + game.title + ' xuống'} disabled={index === games.length - 1 || saving} onClick={() => move(index, 1)} className="rounded border p-1 disabled:opacity-30"><ArrowDown size={15} /></button></div></li>)}</ol>}
  </section>;
}
