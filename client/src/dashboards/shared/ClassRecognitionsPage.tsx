import { useEffect, useState } from 'react';
import { Award, CheckCircle2, RefreshCw, Send, Star, Trophy } from 'lucide-react';
import { recognitionApi, recognitionDate } from '../../services/recognitionApi';
import type { RecognitionKind, RecognitionPreview } from '../../services/recognitionApi';

function previousPeriodDate(kind: RecognitionKind) {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  if (kind === 'WEEK') now.setUTCDate(now.getUTCDate() - 7);
  else { now.setUTCDate(1); now.setUTCMonth(now.getUTCMonth() - 1); }
  return now.toISOString().slice(0, 10);
}

export function ClassRecognitionsPage() {
  const [classes, setClasses] = useState<{ _id: string; name: string; status: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [kind, setKind] = useState<RecognitionKind>('WEEK');
  const [date, setDate] = useState(() => previousPeriodDate('WEEK'));
  const [data, setData] = useState<RecognitionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setClassesLoading(true);
    recognitionApi.classes().then(response => {
      if (!active) return;
      setClasses(response.data);
      setClassId(current => current || response.data[0]?._id || '');
    }).catch(error => { if (active) setError(error.message || 'Không tải được danh sách lớp.'); })
      .finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    setData(null);
    if (!classId || !date) { setLoading(false); return; }
    setLoading(true);
    setError('');
    recognitionApi.preview(classId, kind, date).then(response => {
      if (active) setData(response.data);
    }).catch(error => { if (active) setError(error.message || 'Không tải được kết quả.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, kind, date, reload]);

  const publish = async () => {
    if (!data?.canPublish || publishing) return;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      const response = await recognitionApi.publish(classId, kind, date);
      // Use the server's final snapshot, including a publication made concurrently.
      setData(current => current ? {
        ...current, ranking: response.data.ranking, reward: response.data.reward,
        canPublish: false, published: { _id: response.data._id, publishedAt: response.data.publishedAt }
      } : current);
      setNotice('Đã công bố! Các bé được khen đã nhận vinh danh trong tài khoản.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chưa công bố được. Vui lòng thử lại.');
    } finally { setPublishing(false); }
  };
  const winners = data?.ranking.filter(row => row.winner) || [];

  return (
    <div className="space-y-6">
      <header className="recognition-panel">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 font-bold text-amber-900">
          <Award size={24} /> Ghi nhận nỗ lực học tập
        </div>
        <h1 className="text-3xl sm:text-4xl font-black">Vinh danh của lớp</h1>
        <p className="mt-3 text-lg text-slate-600">Xem sao trong kỳ, kiểm tra các bé đồng hạng và công bố lời khen đến từng bé.</p>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 text-lg font-bold">
          <li className="rounded-xl bg-slate-50 p-3">1. Chọn lớp và kỳ</li>
          <li className="rounded-xl bg-slate-50 p-3">2. Kiểm tra kết quả</li>
          <li className="rounded-xl bg-teal-50 p-3 text-teal-900">3. Công bố vinh danh</li>
        </ol>
      </header>

      <section className="recognition-panel" aria-label="Chọn kỳ vinh danh">
        <div className="recognition-filters">
          <label>Lớp học
            <select value={classId} disabled={classesLoading || publishing} onChange={event => { setClassId(event.target.value); setNotice(''); }}>
              {!classes.length && <option value="">{classesLoading ? 'Đang tải lớp…' : 'Chưa có lớp được phân công'}</option>}
              {classes.map(classroom => <option key={classroom._id} value={classroom._id}>{classroom.name}</option>)}
            </select>
          </label>
          <label>Kỳ khen thưởng
            <select value={kind} disabled={publishing} onChange={event => {
              const next = event.target.value as RecognitionKind;
              setKind(next); setDate(previousPeriodDate(next)); setNotice('');
            }}>
              <option value="WEEK">Theo tuần</option><option value="MONTH">Theo tháng</option>
            </select>
          </label>
          <label>{kind === 'WEEK' ? 'Một ngày trong tuần cần xem' : 'Một ngày trong tháng cần xem'}
            <input type="date" value={date} disabled={publishing} onChange={event => { setDate(event.target.value); setNotice(''); }} />
          </label>
        </div>
        <p className="mt-4 text-base text-slate-600">Tuần: thứ Hai đến Chủ nhật. Tháng: từ ngày đầu đến ngày cuối tháng. Theo giờ Việt Nam.</p>
        <button type="button" className="mt-3 inline-flex items-center gap-2 font-bold text-teal-800" disabled={publishing || loading || classesLoading} onClick={() => { setError(''); setReload(current => current + 1); }}>
          <RefreshCw size={20} /> Tải lại kết quả
        </button>
      </section>

      {error && <div role="alert" className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 text-lg font-bold text-rose-900">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-lg font-bold text-emerald-900">{notice}</div>}
      {(loading || classesLoading) && <p role="status" className="recognition-panel">Đang tổng hợp sao của lớp…</p>}
      {!classesLoading && !classes.length && !error && <p className="recognition-panel">Chưa có lớp học để vinh danh. Hãy tạo lớp hoặc kiểm tra phân công giáo viên.</p>}
      {data && !loading && (
        <>
          <section className="recognition-panel">
            <p className="font-bold text-teal-800">{data.className} · {recognitionDate(data.period.start)} – {new Date(data.period.lastDate + 'T12:00:00+07:00').toLocaleDateString('vi-VN')}</p>
            <h2 className="mt-3 flex items-center gap-3 text-2xl sm:text-3xl font-black"><Trophy className="text-amber-600 shrink-0" size={32} /> {data.reward.title}</h2>
            <p className="mt-3 text-lg text-slate-700">{data.reward.description}. {data.reward.suggestion}</p>
            <p className="mt-2 text-base text-slate-600">Đây là gợi ý hoạt động để cô tổ chức trong lớp; hệ thống trao huy hiệu và gửi thông báo cho bé.</p>
            {winners.length ? (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {winners.map(winner => (
                  <li key={winner.child} className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
                    <span aria-hidden="true" className="text-4xl">{data.reward.symbol}</span>
                    <p className="mt-2 text-2xl font-black break-words">{winner.name}</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-amber-900"><Star size={22} className="fill-amber-400" /> {winner.stars} sao trong kỳ</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-5 rounded-xl bg-slate-50 p-4">Chưa có sao từ buổi học đã hoàn thành trong kỳ này. Chưa có bé được chọn để vinh danh.</p>}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {data.published ? (
                <p className="inline-flex items-center gap-2 text-lg font-bold text-emerald-800"><CheckCircle2 /> Đã công bố ngày {recognitionDate(data.published.publishedAt)}</p>
              ) : (
                <button type="button" className="recognition-button" disabled={!data.canPublish || publishing} onClick={publish}>
                  <Send size={22} /> {publishing ? 'Đang công bố…' : 'Công bố & gửi vinh danh'}
                </button>
              )}
              {!data.published && !data.canPublish && <p className="text-slate-600">Chỉ công bố khi kỳ đã kết thúc và có ít nhất một bé đạt sao.</p>}
            </div>
          </section>
          <section className="recognition-panel">
            <h2 className="text-2xl font-black">Đối chiếu sao trong kỳ</h2>
            <p className="mt-2 mb-4 text-slate-600">Bảng dành cho giáo viên/admin. Bé chỉ nhận lời khen của mình.</p>
            <div className="overflow-x-auto" role="region" aria-label="Bảng đối chiếu sao, có thể cuộn ngang" tabIndex={0}>
              <table className="recognition-table">
                <thead><tr><th scope="col">Học sinh</th><th scope="col">Buổi tham gia</th><th scope="col">Sao trong kỳ</th><th scope="col">Ghi nhận</th></tr></thead>
                <tbody>{data.ranking.map(row => <tr key={row.child} data-winner={row.winner}>
                  <th scope="row">{row.name}</th><td>{row.sessions}</td><td>{row.stars} ⭐</td><td>{row.winner ? '🌟 Được vinh danh' : 'Tiếp tục khích lệ'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <aside className="recognition-panel">
        <h2 className="text-2xl font-black">Khen thưởng công bằng, khích lệ từng bé</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-lg text-slate-700">
          <li>Tính sao trên lớp từ buổi đã hoàn thành, theo ngày kết thúc buổi học. Bỏ qua buổi vắng hoặc có phép.</li>
          <li>Số sao cao nhất phải lớn hơn 0. Các bé bằng sao cùng được vinh danh; không dùng điểm số để phân hạng phụ.</li>
          <li>Thưởng bằng huy hiệu/huy chương; không cộng sao vào kỳ sau. Sao tự học và sao thưởng bài học không tham gia bảng này.</li>
          <li>Kết quả đã công bố được lưu lại và không gửi trùng khi bấm lại. Khen cả nỗ lực, sự hợp tác và tiến bộ của những bé khác trong giờ học.</li>
        </ul>
      </aside>
    </div>
  );
}
