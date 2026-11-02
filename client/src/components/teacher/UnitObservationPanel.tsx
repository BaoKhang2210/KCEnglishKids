import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

const skills = [['LISTEN_POINT', 'Nghe và chọn'], ['EXPRESS', 'Lời nói / cử chỉ'], ['PARTICIPATE', 'Tham gia và chờ lượt']];
const levels: Record<string, string> = { INDEPENDENT: 'Tự làm được', SUPPORTED: 'Có gợi ý', EMERGING: 'Cần luyện thêm' };

export function UnitObservationPanel({ classId, initialUnitId = '' }: { classId: string; initialUnitId?: string }) {
  const [units, setUnits] = useState<any[]>([]);
  const [unitId, setUnitId] = useState(initialUnitId);
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setUnits([]); setData(undefined); setError(''); setLoading(Boolean(classId));
    if (!classId) return;
    const abort = new AbortController();
    api.get('/teacher/content?classroomId=' + classId, abort.signal).then(result => {
      if (abort.signal.aborted) return;
      const list = result.data.units || [];
      setUnits(list); setUnitId(list.some((unit: any) => unit._id === initialUnitId) ? initialUnitId : list[0]?._id || '');
    }).catch(error => { if (!abort.signal.aborted) setError(error.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [classId, initialUnitId]);
  useEffect(() => {
    setData(undefined);
    if (!classId || !units.some(unit => unit._id === unitId)) return;
    const abort = new AbortController(); setLoading(true); setError('');
    api.get(`/teacher/classes/${classId}/unit-review?unitId=${unitId}`, abort.signal)
      .then(result => { if (!abort.signal.aborted) setData(result.data); })
      .catch(error => { if (!abort.signal.aborted) setError(error.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [classId, unitId, units]);
  if (!classId) return <p className="teacher-inline-note">Chọn một lớp phụ trách để xem quan sát theo Unit.</p>;
  return <section className="teacher-panel">
    <h2 className="text-xl font-bold">Quan sát theo Unit</h2>
    <p className="my-3 text-sm text-slate-600">Dùng chung minh chứng cô ghi trong hồ sơ và buổi dạy. Chưa quan sát được hiển thị riêng, không đổi sao thành năng lực.</p>
    <label className="block mb-5">Unit đã chọn<select aria-label="Chọn Unit quan sát" className="ml-3 rounded-xl border p-2" value={unitId} onChange={event => setUnitId(event.target.value)}>
      {units.map(unit => <option key={unit._id} value={unit._id}>Unit {unit.unitNumber} · {unit.bigQuestion}</option>)}
    </select></label>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Đang tải quan sát…</p>}
    {!loading && !error && !units.length && <p>Chưa có Unit trong giáo trình của lớp này.</p>}
    {data && <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr><th>Học sinh</th>{skills.map(([key, label]) => <th key={key}>{label}</th>)}<th>Minh chứng</th></tr></thead><tbody>
      {data.roster.map((row: any) => <tr key={row.child._id}><td className="p-3 font-bold">{row.child.name}</td>{skills.map(([key]) => <td className="p-3" key={key}>{row.latest[key] ? <><strong>{levels[row.latest[key].level]}</strong><p className="text-xs mt-1">{row.latest[key].evidence}</p></> : 'Chưa quan sát'}</td>)}<td><Link className="teacher-button" to={`/teacher/students/${row.child._id}?unitId=${unitId}&classroomId=${classId}&lessonId=${data.lessons.at(-1)?._id || ''}`}>Ghi nhận</Link></td></tr>)}
    </tbody></table>{!data.roster.length && <p>Lớp chưa có học sinh.</p>}</div>}
  </section>;
}
