import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CheckCircle2, Search, Users } from 'lucide-react';
import { teacherApi } from '../../services/api';
import { sortByNameVi } from '../../utils/sortStudents';
export const TeacherAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const load = async () => {
    setError('');
    try { const [classes, students] = await Promise.all([teacherApi.getClasses(), teacherApi.getStudents()]); setData({ classes: classes.data || [], students: students.data || [] }); }
    catch (e: any) { setError(e.message || 'Không thể tải dữ liệu học tập.'); }
  };
  useEffect(() => { void load(); }, []);
  if (error) return <div role="alert" className="teacher-error">{error}<button onClick={() => void load()}>Thử lại</button></div>;
  if (!data) return <div className="teacher-loading">Đang tải dữ liệu theo dõi…</div>;
  const members = data.students.filter((s: any) => !classId || String(s.assignedClass?._id || s.assignedClass) === classId);
  const assessed = members.filter((s: any) => s.stats?.hasAssessment);
  const support = assessed.filter((s: any) => s.stats.averageScore < 60);
  const students = sortByNameVi(members).filter((s: any) => s.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) && (filter === 'ALL' || (filter === 'UNASSESSED' ? !s.stats?.hasAssessment : s.stats?.hasAssessment && s.stats.averageScore < 60)));
  const avg = assessed.length ? Math.round(assessed.reduce((n: number, s: any) => n + s.stats.averageScore, 0) / assessed.length) : null;
  return <><header className="staff-page-header"><div><p className="teacher-eyebrow">QUAN SÁT ĐỂ ĐỒNG HÀNH</p><h1>Theo dõi tiến bộ</h1><p>Đọc kết quả cùng với ghi chú quan sát để chọn hoạt động phù hợp cho từng bé.</p></div><Link className="teacher-button" to="/teacher/assignments">Mở bài tập & nhận xét <ArrowUpRight size={17} /></Link></header>
    <div className="teacher-metrics">{[{ label: 'Học sinh trong phạm vi', value: members.length, icon: Users }, { label: 'Đã có dữ liệu trả lời', value: assessed.length, icon: CheckCircle2 }, { label: 'Độ đúng trung bình', value: avg == null ? '—' : avg + '%', icon: BookOpen }, { label: 'Cần quan sát thêm', value: support.length, icon: Users }].map(item => <div className="teacher-metric" key={item.label}><span><small>{item.label}</small><strong>{item.value}</strong></span><item.icon size={23} /></div>)}</div>
    <div className="teacher-inline-note"><BookOpen size={20} /><p>Độ đúng được tính từ các câu trả lời đã ghi nhận. Nhóm cần quan sát thêm có độ đúng dưới 60%; đây là gợi ý chọn nội dung ôn tập. {members.length - assessed.length} bé chưa có dữ liệu được theo dõi riêng.</p></div>
    <section className="teacher-panel"><div className="flex flex-wrap items-center gap-3 mb-5"><label className="flex-1 min-w-48 flex items-center gap-2 rounded-xl border px-3"><Search size={18} /><input aria-label="Tìm học sinh" className="w-full outline-none" placeholder="Tìm tên học sinh…" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Lọc lớp học" className="rounded-xl border bg-white px-3" value={classId} onChange={e => setClassId(e.target.value)}><option value="">Tất cả lớp phụ trách</option>{data.classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}</select><select aria-label="Lọc dữ liệu theo dõi" className="rounded-xl border bg-white px-3" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">Tất cả học sinh</option><option value="SUPPORT">Cần quan sát thêm</option><option value="UNASSESSED">Chưa có dữ liệu</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr><th>Học sinh</th><th>Độ đúng</th><th>Bài đã hoàn thành</th><th>Lượt luyện tập</th><th>Theo dõi cá nhân</th></tr></thead><tbody>{students.map((student: any) => <tr key={student._id}><td><strong className="text-sm">{student.name}</strong><p className="text-xs text-slate-500">{student.assignedClass?.name || 'Chưa phân lớp'}</p></td><td>{student.stats?.hasAssessment ? <div className="flex items-center gap-3"><span className="w-12 text-sm font-semibold">{student.stats.averageScore}%</span><span className="w-20 h-1.5 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-teal-600" style={{ width: `${student.stats.averageScore}%` }} /></span></div> : <span className="text-sm text-slate-500">Chưa có dữ liệu</span>}</td><td>{student.stats?.completedLessons || 0}</td><td>{student.stats?.attempts || 0}</td><td><Link className="teacher-button" to={`/teacher/students/${student._id}`}>Hồ sơ & ghi chú <ArrowUpRight size={15} /></Link></td></tr>)}</tbody></table></div>{!students.length && <div className="teacher-empty"><Users size={32} /><p>Chưa có học sinh phù hợp bộ lọc.</p></div>}</section>
  </>;
};
