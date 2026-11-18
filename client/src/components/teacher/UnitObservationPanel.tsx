import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Layers, ArrowUpRight } from 'lucide-react';

const skills: [string, string][] = [
  ['LISTEN_POINT', 'Nghe & Chọn hình'],
  ['EXPRESS', 'Phát âm / Cử chỉ'],
  ['PARTICIPATE', 'Tham gia & Tương tác']
];

const levelBadges: Record<string, { label: string; cls: string }> = {
  INDEPENDENT: { label: 'Tự làm được', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  SUPPORTED: { label: 'Có gợi ý', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  EMERGING: { label: 'Cần luyện thêm', cls: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export function UnitObservationPanel({ classId, initialUnitId = '' }: { classId: string; initialUnitId?: string }) {
  const [units, setUnits] = useState<any[]>([]);
  const [unitId, setUnitId] = useState(initialUnitId);
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUnits([]);
    setData(undefined);
    setError('');
    setLoading(Boolean(classId));
    if (!classId) return;
    const abort = new AbortController();
    api
      .get('/teacher/content?classroomId=' + classId, abort.signal)
      .then(result => {
        if (abort.signal.aborted) return;
        const list = result.data.units || [];
        setUnits(list);
        setUnitId(list.some((unit: any) => unit._id === initialUnitId) ? initialUnitId : list[0]?._id || '');
      })
      .catch(err => {
        if (!abort.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [classId, initialUnitId]);

  useEffect(() => {
    setData(undefined);
    if (!classId || !units.some(unit => unit._id === unitId)) return;
    const abort = new AbortController();
    setLoading(true);
    setError('');
    api
      .get(`/teacher/classes/${classId}/unit-review?unitId=${unitId}`, abort.signal)
      .then(result => {
        if (!abort.signal.aborted) setData(result.data);
      })
      .catch(err => {
        if (!abort.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [classId, unitId, units]);

  if (!classId) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 font-bold text-sm">
        Vui lòng chọn một lớp phụ trách để xem hồ sơ quan sát năng lực theo Unit.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Layers size={20} className="text-indigo-600" />
            <span>Quan Sát Năng Lực Học Sinh Theo Unit</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Tổng hợp minh chứng cô ghi trong hồ sơ và các buổi học trực tiếp trên lớp.
          </p>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit:</span>
          <select
            aria-label="Chọn Unit quan sát"
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold shadow-2xs focus:outline-none focus:border-indigo-600 cursor-pointer"
            value={unitId}
            onChange={event => setUnitId(event.target.value)}
          >
            {units.map(unit => (
              <option key={unit._id} value={unit._id}>
                Unit {unit.unitNumber}: {unit.bigQuestion}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Đang tải hồ sơ quan sát của lớp…</p>
        </div>
      )}

      {!loading && !error && !units.length && (
        <p className="py-8 text-center text-slate-500 text-xs font-bold">
          Chưa có Unit nào trong giáo trình của lớp này.
        </p>
      )}

      {data && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5 min-w-[150px]">Học Sinh</th>
                {skills.map(([key, label]) => (
                  <th key={key} className="py-3 px-3 text-center min-w-[160px]">
                    {label}
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[110px]">Ghi Nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {!data.roster.length ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-bold">
                    Lớp chưa có học sinh.
                  </td>
                </tr>
              ) : (
                data.roster.map((row: any) => (
                  <tr key={row.child._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Tên Học Sinh */}
                    <td className="py-3 px-3.5">
                      <p className="font-black text-slate-900 text-sm">{row.child.name}</p>
                    </td>

                    {/* Kỹ năng 1, 2, 3 */}
                    {skills.map(([key]) => {
                      const record = row.latest?.[key];
                      if (!record) {
                        return (
                          <td key={key} className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[11px] font-semibold">
                              Chưa quan sát
                            </span>
                          </td>
                        );
                      }
                      const badge = levelBadges[record.level] || {
                        label: record.level,
                        cls: 'bg-slate-100 text-slate-700'
                      };
                      return (
                        <td key={key} className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                          {record.evidence && (
                            <p className="text-[11px] text-slate-500 font-normal mt-1 max-w-[180px] mx-auto line-clamp-2">
                              {record.evidence}
                            </p>
                          )}
                        </td>
                      );
                    })}

                    {/* Nút Ghi Nhận */}
                    <td className="py-3 px-3 text-center">
                      <Link
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                        to={`/teacher/students/${row.child._id}?unitId=${unitId}&classroomId=${classId}&lessonId=${
                          data.lessons.at(-1)?._id || ''
                        }`}
                      >
                        <span>Ghi nhận</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
