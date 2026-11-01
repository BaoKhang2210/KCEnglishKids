import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Send, Star, Trophy } from 'lucide-react';
import { recognitionApi, recognitionDate } from '../../services/recognitionApi';
import type { RecognitionKind, RecognitionPreview } from '../../services/recognitionApi';
import { useAuth } from '../../context/AuthContext';

function previousPeriodDate(kind: RecognitionKind) {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  if (kind === 'WEEK') now.setUTCDate(now.getUTCDate() - 7);
  else { now.setUTCDate(1); now.setUTCMonth(now.getUTCMonth() - 1); }
  return now.toISOString().slice(0, 10);
}

export function ClassRecognitionsPage() {
  const { user } = useAuth();
  const school = user?.role === 'ADMIN';
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
    if (school) { setClassesLoading(false); return; }
    setClassesLoading(true);
    recognitionApi.classes().then(response => {
      if (!active) return;
      setClasses(response.data);
      setClassId(current => current || response.data[0]?._id || '');
    }).catch(error => { if (active) setError(error.message || 'Không tải được danh sách lớp.'); })
      .finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, [reload, school]);

  useEffect(() => {
    let active = true;
    setData(null);
    if ((!school && !classId) || !date) { setLoading(false); return; }
    setLoading(true);
    setError('');
    (school ? recognitionApi.schoolPreview(kind, date) : recognitionApi.preview(classId, kind, date)).then(response => {
      if (active) setData(response.data);
    }).catch(error => { if (active) setError(error.message || 'Không tải được kết quả.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, kind, date, reload, school]);

  const publish = async () => {
    if (!data?.canPublish || publishing) return;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      const response = await (school ? recognitionApi.schoolPublish(kind, date) : recognitionApi.publish(classId, kind, date));
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
      <h1 className="text-3xl font-black">{school ? 'Vinh danh của trường' : 'Ghi nhận & động viên'}</h1>

      <section className="recognition-panel" aria-label="Chọn kỳ vinh danh">
        <div className="recognition-filters">
          {!school && <label>Lớp học
            <select value={classId} disabled={classesLoading || publishing} onChange={event => { setClassId(event.target.value); setNotice(''); }}>
              {!classes.length && <option value="">{classesLoading ? 'Đang tải lớp…' : 'Chưa có lớp được phân công'}</option>}
              {classes.map(classroom => <option key={classroom._id} value={classroom._id}>{classroom.name}</option>)}
            </select>
          </label>}
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
        {school && <p className="mt-2 text-slate-600">So sánh sao trung bình mỗi buổi đã hoàn thành trên toàn trường; tối thiểu {kind === 'WEEK' ? 2 : 4} buổi tham gia trong kỳ. Bỏ qua buổi vắng/có phép. Cùng tỷ lệ được đồng hạng, không cộng thêm sao khi vinh danh.</p>}
        <button type="button" className="mt-3 inline-flex items-center gap-2 font-bold text-teal-800" disabled={publishing || loading || classesLoading} onClick={() => { setError(''); setReload(current => current + 1); }}>
          <RefreshCw size={20} /> Tải lại kết quả
        </button>
      </section>

      {error && <div role="alert" className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 text-lg font-bold text-rose-900">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-lg font-bold text-emerald-900">{notice}</div>}
      {(loading || classesLoading) && <p role="status" className="recognition-panel">Đang tổng hợp sao của lớp…</p>}
      {!school && !classesLoading && !classes.length && !error && <p className="recognition-panel">Chưa có lớp học để vinh danh. Hãy tạo lớp hoặc kiểm tra phân công giáo viên.</p>}
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
                    {school && <p className="font-bold">{winner.starsPerSession} sao/buổi · {winner.sessions} buổi</p>}
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
              {!data.published && !data.canPublish && <p className="text-slate-600">Chỉ công bố khi kỳ đã kết thúc và có ít nhất một bé {school ? 'đủ số buổi, ' : ''}đạt sao.</p>}
            </div>
          </section>
          <section className="recognition-panel">
            <h2 className="text-2xl font-black">Đối chiếu sao trong kỳ</h2>
            <p className="mt-2 mb-4 text-slate-600">Bảng dành cho giáo viên/admin. Bé chỉ nhận lời khen của mình.</p>
            <div className="overflow-x-auto" role="region" aria-label="Bảng đối chiếu sao, có thể cuộn ngang" tabIndex={0}>
              <table className="recognition-table">
                <thead><tr>{school && <th scope="col">Hạng</th>}<th scope="col">Học sinh</th><th scope="col">Buổi tham gia</th><th scope="col">Sao trong kỳ</th>{school && <th scope="col">Sao/buổi</th>}<th scope="col">Ghi nhận</th></tr></thead>
                <tbody>{data.ranking.map(row => <tr key={row.child} data-winner={row.winner}>
                  {school && <td>{row.rank ?? '—'}</td>}<th scope="row">{row.name}</th><td>{row.sessions}</td><td>{row.stars} ⭐</td>{school && <td>{row.starsPerSession ?? '—'}</td>}<td>{row.winner ? '🌟 Được vinh danh' : school && !row.eligible ? 'Chưa đủ số buổi' : 'Tiếp tục khích lệ'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}

    </div>
  );
}
