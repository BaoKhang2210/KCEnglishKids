import { useCallback, useEffect, useState } from 'react';
import { Award, Bell, CheckCircle2 } from 'lucide-react';
import { recognitionApi, recognitionDate } from '../../services/recognitionApi';
import type { ChildRecognition } from '../../services/recognitionApi';
import { useAuth } from '../../context/AuthContext';

export function ChildRecognitions() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChildRecognition[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => setRetry(value => value + 1), []);

  useEffect(() => {
    if (user?.role !== 'CHILD') return;
    let active = true;
    const refresh = () => {
      if (document.hidden) return;
      setLoading(true);
      recognitionApi.mine().then(response => {
        if (active) { setItems(response.data); setLoadError(false); }
      }).catch(() => { if (active) setLoadError(true); })
        .finally(() => { if (active) setLoading(false); });
    };
    refresh();
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [user?._id, user?.role, retry]);

  const markRead = async (item: ChildRecognition) => {
    setBusy(item._id);
    setError('');
    try {
      await recognitionApi.read(item._id);
      setItems(current => current.map(row => row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row));
    } catch { setError('Chưa lưu được. Bé thử lại nhé!'); }
    finally { setBusy(''); }
  };
  if (user?.role !== 'CHILD') return null;
  if (!items.length && !loadError) return null;
  const unread = items.filter(item => !item.readAt);
  const visible = expanded ? items : items.filter((item, index) => !item.readAt || index < 3);

  return (
    <section className="mb-5 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-6 text-slate-900" aria-label="Lời khen và huy hiệu của bé">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-black"><Award className="text-amber-700" size={30} /> Góc vinh danh của bé</h2>
        {unread.length > 0 && <span role="status" className="inline-flex items-center gap-2 rounded-full bg-amber-200 px-4 py-2 text-lg font-bold"><Bell size={22} /> {unread.length} lời khen mới</span>}
      </div>
      {loadError && <p role="status" className="mt-3 text-lg">Chưa tải được lời khen. <button type="button" onClick={load} disabled={loading} className="rounded-xl bg-white px-3 py-2 font-bold text-teal-800">Thử lại</button></p>}
      {error && <p role="alert" className="mt-3 text-lg font-bold text-rose-800">{error}</p>}
      <div className={visible.length === 1 ? 'mt-4 grid gap-4' : 'mt-4 grid gap-4 sm:grid-cols-2'}>
        {visible.map(item => (
          <article key={item._id} className="rounded-2xl border-2 border-amber-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="text-5xl" aria-hidden="true">{item.reward.symbol}</span>
              <div><h3 className="text-2xl font-black text-amber-900">{item.reward.title}</h3><p className="text-base font-bold text-slate-600">{item.className}</p></div>
            </div>
            <p className="mt-4 text-xl font-bold">Hoan hô {item.name}! Bé có số sao cao nhất lớp trong {item.kind === 'WEEK' ? 'tuần' : 'tháng'} được vinh danh! 🎉</p>
            <p className="mt-3 text-lg text-slate-700">Bé đã nhận {item.stars} ⭐ bằng sự cố gắng của mình. Cùng tiếp tục học vui với các bạn nhé!</p>
            <p className="mt-3 text-base text-slate-600">{recognitionDate(item.periodStart)} – {recognitionDate(new Date(new Date(item.periodEnd).getTime() - 1).toISOString())}</p>
            {!item.readAt ? (
              <button type="button" disabled={!!busy} onClick={() => markRead(item)}
                className="mt-4 min-h-12 rounded-xl bg-teal-700 px-5 py-3 text-lg font-black text-white hover:bg-teal-800 disabled:opacity-60">
                {busy === item._id ? 'Đang lưu…' : 'Bé nhận lời khen!'}
              </button>
            ) : <p className="mt-4 flex items-center gap-2 text-lg font-bold text-emerald-800"><CheckCircle2 size={22} /> Huy hiệu của bé</p>}
          </article>
        ))}
      </div>
      {items.length > 3 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}
        className="mt-4 min-h-12 rounded-xl border-2 border-amber-300 bg-white px-4 py-2 text-lg font-bold text-amber-900">
        {expanded ? 'Thu gọn' : 'Xem tất cả huy hiệu'}
      </button>}
    </section>
  );
}
