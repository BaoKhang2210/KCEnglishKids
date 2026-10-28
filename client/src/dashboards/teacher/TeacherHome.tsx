import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Check, ClipboardCheck, GraduationCap, MessageSquare, Play, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { classroomSessionApi, teacherApi } from '../../services/api';
import { vietnamClock } from '../../utils/vietnamTime';

const status: Record<string, string> = { ASSIGNED: 'Đã giao', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };
export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try {
      const [dashboard, classes, schedule, live] = await Promise.all([teacherApi.getDashboard(), teacherApi.getClasses(), teacherApi.getMySchedule(), classroomSessionApi.getSessions({ status: 'LIVE' })]);
      setData({ ...dashboard.data, classes: classes.data, schedules: schedule.data, live: live.data });
    } catch (e: any) { setError(e.message || 'Không thể tải tổng quan giảng dạy.'); }
  };
  useEffect(() => { void load(); }, []);
  if (error) return <div className="teacher-error" role="alert">{error}<button onClick={() => void load()}>Thử lại</button></div>;
  if (!data) return <div className="teacher-loading" role="status">Đang tải công việc giảng dạy…</div>;
  const day = vietnamClock().day;
  const slots = data.schedules.flatMap((s: any) => (s.weeklySlots || []).filter((slot: any) => slot.dayOfWeek === day).map((slot: any) => ({ ...slot, classroom: s.classroom, id: s._id + slot.startTime }))).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  const m = data.metrics;
  const firstName = user?.name?.split(' ').filter(Boolean).slice(-1)[0] || '';
  return <div className="teacher-home">
    <section className="teacher-welcome"><div><p className="teacher-eyebrow">MỘT NGÀY GIẢNG DẠY MỚI</p><h1>Xin chào, {firstName || 'thầy cô'} <span aria-hidden="true">☀️</span></h1><p>Cùng chuẩn bị những trải nghiệm học tập vui vẻ và vừa sức cho các bé.</p><div className="teacher-welcome-actions"><Link className="teacher-button primary" to="/teacher/classes"><Play size={17} /> Chuẩn bị buổi dạy</Link><Link className="teacher-button" to="/teacher/schedule"><CalendarDays size={17} /> Xem lịch dạy</Link></div></div><div className="teacher-welcome-note"><span className="teacher-note-icon"><BookOpen size={31} /></span><strong>Quan sát · Khích lệ · Đồng hành</strong><p>Ghi nhận nỗ lực của từng bé, bắt đầu từ những tiến bộ nhỏ.</p></div></section>
    <div className="teacher-metrics">{[
      { label: 'Lớp phụ trách', value: m.classes, icon: GraduationCap, to: 'classes' },
      { label: 'Học sinh', value: m.students, icon: Users, to: 'students' },
      { label: 'Bài giao đang mở', value: m.activeAssignments, icon: ClipboardCheck, to: 'assignments' },
      { label: 'Cần quan sát thêm', value: m.needingAttention, icon: MessageSquare, to: 'analytics' }
    ].map(item => <Link to={'/teacher/' + item.to} className="teacher-metric" key={item.label}><span><small>{item.label}</small><strong>{item.value ?? 0}</strong></span><item.icon size={23} /></Link>)}</div>
    {data.live.length > 0 && <section className="teacher-live-banner"><span className="teacher-live-dot" /><div><strong>Buổi dạy đang mở</strong><p>{data.live[0].classroom?.name} · {data.live[0].title}</p></div><Link to={`/teacher/classroom-sessions/${data.live[0]._id}/live`} className="teacher-button primary">Tiếp tục dạy <ArrowRight size={17} /></Link></section>}
    <div className="teacher-home-columns"><section className="teacher-panel"><div className="teacher-panel-heading"><div><p className="teacher-eyebrow">SẴN SÀNG CHO GIỜ HỌC</p><h2>Lịch dạy hôm nay</h2></div><Link to="/teacher/schedule">Xem lịch <ArrowRight size={16} /></Link></div>{slots.length ? slots.map((slot: any) => <div key={slot.id} className="teacher-agenda-row"><div className="teacher-agenda-time"><b>{slot.startTime}</b><span>{slot.endTime}</span></div><div><strong>{slot.classroom?.name || 'Lớp học'}</strong><p>{slot.room || 'Theo thời khóa biểu của lớp'}</p></div><Link className="teacher-button" to={`/teacher/classes/${slot.classroom?._id}/sessions/new`}>Chuẩn bị <ArrowRight size={15} /></Link></div>) : <div className="teacher-empty"><CalendarDays size={32} /><strong>Hôm nay chưa có tiết dạy theo lịch</strong><p>Bạn có thể chuẩn bị học liệu hoặc xem lại nhận xét cho buổi tới.</p><Link to="/teacher/lesson-planner">Mở giáo án <ArrowRight size={16} /></Link></div>}</section>
    <section className="teacher-panel"><div className="teacher-panel-heading"><div><p className="teacher-eyebrow">THEO NHỊP GIẢNG DẠY</p><h2>Công việc thường dùng</h2></div></div>{[
      { title: 'Trước giờ học', text: 'Chọn bài, chuẩn bị đồ dùng và giáo án.', to: 'lesson-planner', icon: Sparkles },
      { title: 'Trong giờ học', text: 'Điểm danh, tổ chức hoạt động và động viên.', to: 'classes', icon: Play },
      { title: 'Sau giờ học', text: 'Xem tổng kết, giao bài và viết nhận xét.', to: 'classroom-sessions', icon: Check }
    ].map((step, index) => <Link to={'/teacher/' + step.to} className="teacher-workflow" key={step.title}><span className="teacher-workflow-icon"><step.icon size={20} /></span><div><small>BƯỚC {index + 1}</small><strong>{step.title}</strong><p>{step.text}</p></div><ArrowRight size={17} /></Link>)}</section></div>
    <div className="teacher-home-columns"><section className="teacher-panel"><div className="teacher-panel-heading"><h2>Bài giao gần đây</h2><Link to="/teacher/assignments">Tất cả <ArrowRight size={16} /></Link></div>{data.recentAssignments.length ? data.recentAssignments.map((a: any) => <Link to={`/teacher/assignments/${a._id}`} key={a._id} className="teacher-list-row"><span className="teacher-list-icon"><ClipboardCheck size={20} /></span><span><strong>{a.activity?.title || a.lesson?.title || 'Bài tập'}</strong><small>{a.classRoom?.name || 'Lớp học'}</small></span><span className="teacher-status">{status[a.status] || a.status}</span></Link>) : <p className="teacher-empty-text">Chưa có bài giao. Hãy chọn hoạt động ngắn, phù hợp để bé ôn cùng gia đình.</p>}</section><section className="teacher-panel"><div className="teacher-panel-heading"><h2>Góc theo dõi học tập</h2><Link to="/teacher/analytics">Chi tiết <ArrowRight size={16} /></Link></div><div className="teacher-observation"><strong>{m.averageScore == null ? 'Chưa đủ dữ liệu' : m.averageScore + '%'}</strong><p>Độ đúng trung bình qua các câu trả lời đã ghi nhận.</p></div><div className="teacher-inline-note"><BookOpen size={19} /><p>{m.unassessedStudents || 0} học sinh chưa có dữ liệu đánh giá. Hãy quan sát thêm trước khi nhận xét năng lực của bé.</p></div><Link className="teacher-button" to="/teacher/students">Mở hồ sơ học sinh <ArrowRight size={16} /></Link></section></div>
  </div>;
};
