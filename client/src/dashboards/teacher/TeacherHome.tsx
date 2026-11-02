import { scheduleEffectiveAt } from '../../utils/teachingSchedule';
import { TeacherTasks } from './TeacherTasks';
import { StoryBanner } from '../../components/StoryScene';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, BellRing, BookOpen, CalendarDays, ClipboardCheck, KeyRound, Lightbulb, MessageSquare, Play, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { aiApi, authApi, classroomSessionApi, teacherApi } from '../../services/api';
import { vietnamClock, vietnamDate } from '../../utils/vietnamTime';

const status: Record<string, string> = { ASSIGNED: 'Đã giao', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };

// Self-service password recovery: the code is shown once and unlocks the "Quên mật khẩu?" flow later.
const AccountSecurity = () => {
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { void authApi.recoveryStatus().then(r => setConfigured(Boolean(r.data?.configured))).catch(() => setConfigured(undefined)); }, []);
  const rotate = async () => {
    setBusy(true); setNote('');
    try { const res = await authApi.rotateRecoveryCode(); setCode(res.data.code); setConfigured(true); }
    catch (e: any) { setNote(e.message || 'Không tạo được mã khôi phục.'); }
    finally { setBusy(false); }
  };
  return <div className="teacher-account-security p-4 space-y-3">
    <p className="text-sm text-slate-600">{configured === undefined ? 'Đang kiểm tra tài khoản…' : configured ? 'Tài khoản đã có mã khôi phục. Khi quên mật khẩu, cô dùng “Quên mật khẩu?” ở màn hình đăng nhập để tự lấy lại ngay.' : 'Tài khoản chưa có mã khôi phục. Cô tạo mã bên dưới và lưu lại nơi an toàn nhé.'}</p>
    {code && <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 text-center"><p className="font-mono text-2xl font-black tracking-[0.3em] text-amber-900">{code}</p><p className="text-xs font-bold text-amber-800 mt-1">Mã chỉ hiển thị một lần — cô lưu lại ngay nhé!</p></div>}
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="teacher-button" disabled={busy} onClick={() => void rotate()}><KeyRound size={16} /> {busy ? 'Đang tạo mã…' : configured ? 'Tạo mã khôi phục mới' : 'Tạo mã khôi phục'}</button>{note && <p role="alert" className="text-xs font-bold text-rose-700">{note}</p>}</div>
  </div>;
};
// §3.6 — Nhắc tiết dạy sắp tới (15 phút) bằng Web Notification API, không cần backend.
const REMINDER_LEAD_MINUTES = 15;
const toMinutes = (hhmm: string) => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + m; };
const ScheduleReminders = ({ slots }: { slots: any[] }) => {
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const nowMin = vietnamClock().minutes;
  const upcoming = slots
    .map((slot: any) => ({ ...slot, startMin: toMinutes(slot.startTime), minutesLeft: toMinutes(slot.startTime) - nowMin }))
    .filter((slot: any) => slot.minutesLeft > 0 && slot.minutesLeft <= REMINDER_LEAD_MINUTES)
    .sort((a: any, b: any) => a.minutesLeft - b.minutesLeft)[0];
  // Fire the system notification once per slot per day.
  useEffect(() => {
    if (!upcoming || permission !== 'granted') return;
    const key = `kc-schedule-notified-${vietnamDate()}-${upcoming.id}`;
    if (sessionStorage.getItem(key) || localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    try {
      new Notification('Sắp đến giờ dạy ⏰', {
        body: `Lớp ${upcoming.classroom?.name || 'của cô'} bắt đầu lúc ${upcoming.startTime} (còn ${upcoming.minutesLeft} phút).`,
        tag: key
      });
    } catch { /* một số trình duyệt chặn Notification ngoài user gesture */ }
  }, [upcoming?.id, permission]);
  if (!upcoming) return null;
  return <div className="teacher-schedule-reminder rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 mb-3 flex flex-wrap items-center gap-3">
    <BellRing size={20} className="text-orange-600" />
    <div className="flex-1 min-w-[180px]">
      <strong className="text-sm text-orange-900">Còn {upcoming.minutesLeft} phút — {upcoming.classroom?.name || 'Lớp học'} bắt đầu lúc {upcoming.startTime}</strong>
      <p className="text-xs font-bold text-orange-800">{upcoming.room || 'Theo thời khóa biểu của lớp'}</p>
    </div>
    {permission !== 'granted' && permission !== 'unsupported' && (
      <button type="button" className="teacher-button" onClick={() => void Notification.requestPermission().then(p => setPermission(p))}>
        <Bell size={15} /> Bật thông báo
      </button>
    )}
    <Link className="teacher-button primary" to={`/teacher/classes/${upcoming.classroom?._id}/sessions/new`}>Vào chuẩn bị <ArrowRight size={15} /></Link>
  </div>;
};

// §3.7 — AI Gap Detector: quy nạp từ VocabularyMastery toàn lớp, chỉ ra từ bé nào cũng chưa nắm vững.
type ClassGapRow = {
  english: string; vietnamese: string; severity: 'critical' | 'watch';
  masteredPercent: number; accuracyPercent: number | null; practicedStudents: number;
  reasons: string[]; suggestion: string;
};
const ClassGapsPanel = ({ classes }: { classes: any[] }) => {
  const [classRoomId, setClassRoomId] = useState(classes[0]?._id || '');
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const run = async (id: string) => {
    if (!id) return;
    setBusy(true); setNote(''); setReport(null);
    try { const res = await aiApi.detectClassGaps(id); setReport(res.data); }
    catch (e: any) { setNote(e.message || 'Không tải được báo cáo lỗ hổng.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { const first = classes[0]?._id; if (first) { setClassRoomId(first); void run(first); } }, [classes.length]);
  const gaps: ClassGapRow[] = (report?.gaps || []).slice(0, 6);
  return <section className="teacher-panel teacher-class-gaps">
    <div className="teacher-panel-heading"><div><p className="teacher-eyebrow">PHÂN TÍCH LỚP · TỰ ĐỘNG</p><h2>Lỗ hổng kiến thức của lớp</h2></div>
      {classes.length > 0 && <select className="teacher-select" value={classRoomId} onChange={e => { setClassRoomId(e.target.value); void run(e.target.value); }} aria-label="Chọn lớp">
        {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name || 'Lớp học'}</option>)}
      </select>}
    </div>
    {busy && <p className="teacher-empty-text">Đang phân tích dữ liệu luyện tập của lớp…</p>}
    {note && <p role="alert" className="text-xs font-bold text-rose-700">{note}</p>}
    {!busy && report && <> 
      <div className="teacher-observation"><strong>{report.meta.gapCount}</strong><p>từ có dữ liệu cần củng cố · {report.meta.unassessedCount || 0} từ chưa có lượt luyện. Chưa luyện không có nghĩa là yếu.</p></div>
      <p className="text-xs text-slate-600 mb-3">{report.basis}</p>
      {gaps.length === 0 && <div className="teacher-inline-note"><BookOpen size={19} /><p>{!report.meta.wordCount || report.meta.unassessedCount === report.meta.wordCount ? 'Chưa đủ dữ liệu luyện tập để xác định nhóm từ cần củng cố.' : 'Chưa phát hiện nhóm cần củng cố trong các lượt đã ghi nhận.'}</p></div>}
      <ul className="teacher-gap-list">{gaps.map(gap => <li key={gap.english} className="teacher-gap-row">
        <span className={`teacher-gap-badge ${gap.severity}`}>{gap.severity === 'critical' ? 'Cần ôn gấp' : 'Nên ôn'}</span>
        <div className="flex-1 min-w-[180px]">
          <strong>{gap.english} <span className="text-slate-500 font-normal">· {gap.vietnamese}</span></strong>
          <p className="text-xs text-slate-600">{gap.reasons.join(' · ')}</p>
          <p className="text-xs font-bold text-amber-800 flex items-start gap-1"><Lightbulb size={14} className="shrink-0 mt-[1px]" /> {gap.suggestion}</p>
        </div>
        <div className="text-right text-xs font-bold text-slate-700">
          <p>{gap.masteredPercent}% ôn vững trong nhóm đã luyện</p>
          <p className="text-slate-500">
            {gap.practicedStudents === 0
              ? 'Chưa có lượt làm'
              : gap.accuracyPercent == null
              ? 'Chưa luyện'
              : `${gap.accuracyPercent}% đúng (${gap.practicedStudents}/${report.meta.studentCount} bé)`}
          </p>
          <Link
            to={`/teacher/lesson-planner?classroomId=${classRoomId}&reviewMode=true&gapWords=${encodeURIComponent(gap.english)}`}
            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 block mt-1 transition-colors"
          >
            Ôn từ này →
          </Link>
        </div>
      </li>)}</ul>
      {gaps.length > 0 && (
        <Link
          className="teacher-button flex items-center justify-center gap-2"
          to={`/teacher/lesson-planner?classroomId=${classRoomId}&reviewMode=true&gapWords=${encodeURIComponent(gaps.map(g => g.english).join(', '))}`}
        >
          <span>🎯 Soạn giáo án ôn tập khắc phục {gaps.length} lỗ hổng kiến thức</span>
          <ArrowRight size={15} />
        </Link>
      )}
    </>}
  </section>;
};

const ParentFeedbackSection = ({ items }: { items: any[] }) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="teacher-panel rounded-2xl border border-amber-300 bg-amber-50/50 p-4 sm:p-5 mb-4 shadow-xs">
      <div className="teacher-panel-heading border-b border-amber-200/80 pb-3 mb-3">
        <div>
          <p className="teacher-eyebrow text-amber-800">TƯƠNG TÁC GIA ĐÌNH · LỜI NHẮN MỚI</p>
          <h2 className="flex items-center gap-2 text-slate-900">
            <MessageSquare size={20} className="text-amber-700" />
            <span>Phản Hồi &amp; Dặn Dò Từ Phụ Huynh</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
              {items.length} lời nhắn
            </span>
          </h2>
        </div>
        <Link to="/teacher/students" className="text-xs font-bold text-teal-800 hover:text-teal-900">
          Xem tất cả học sinh <ArrowRight size={14} className="inline ml-1" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it: any) => {
          const latest = it.latestReply || (it.replies && it.replies[it.replies.length - 1]);
          const childName = it.child?.name || 'Học sinh';
          const childAvatar = it.child?.avatarUrl || '';
          const author = latest?.senderName || ('Phụ huynh bé ' + childName);
          const message = latest?.message || it.parentFeedback?.message || '';
          const timeStr = latest?.createdAt
            ? new Date(latest.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(latest.createdAt).toLocaleDateString('vi-VN')
            : 'Mới gửi';

          return (
            <div
              key={it._id}
              className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-2xs flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/60 border border-amber-200 p-1 shrink-0 flex items-center justify-center font-black text-amber-800">
                  {childAvatar ? (
                    <img src={childAvatar} alt={childName} className="w-full h-full object-contain" />
                  ) : (
                    childName[0]
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-xs text-slate-900">{author}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                      Bé {childName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium ml-auto">{timeStr}</span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-800 font-medium bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 leading-relaxed whitespace-pre-wrap">
                    &ldquo;{message}&rdquo;
                  </p>

                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Gắn với: <b>{it.subject || 'Phiếu nhận xét'}</b>
                    {it.session?.title ? ` (${it.session.title})` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                {it.child?.contact && (
                  <span className="text-slate-500 text-[11px] font-semibold">
                    SĐT PH: {it.child.contact}
                  </span>
                )}
                <Link
                  to={`/teacher/students/${it.child?._id || it.child}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-900 ml-auto"
                >
                  Mở sổ bé <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

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
  const slots = data.schedules.filter((schedule: any) => scheduleEffectiveAt(schedule)).flatMap((s: any) => (s.weeklySlots || []).filter((slot: any) => slot.dayOfWeek === day).map((slot: any) => ({ ...slot, classroom: s.classroom, id: s._id + slot.startTime }))).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
  const m = data.metrics;
  const firstName = user?.name?.split(' ').filter(Boolean).slice(-1)[0] || '';
  return <div className="teacher-home">
    <StoryBanner scene="classroom" title={`Xin chào, ${firstName || 'thầy cô'}`} eyebrow="MỖI BUỔI HỌC · MỘT BƯỚC TIẾN NHỎ"><p>Cùng chuẩn bị những trải nghiệm vui vẻ và vừa sức. Quan sát điều bé làm được, khích lệ sự cố gắng.</p><div className="teacher-welcome-actions"><Link className="teacher-button primary" to="/teacher/classroom-sessions/new"><Play size={17}/> Chuẩn bị buổi dạy</Link><Link className="teacher-button" to="/teacher/content">Giáo trình & in tranh</Link></div></StoryBanner>
    <div className="teacher-metrics">{[
      { label: 'Buổi dạy hôm nay', value: slots.length, icon: CalendarDays, to: 'schedule' },
      { label: 'Học sinh', value: m.students, icon: Users, to: 'students' },
      { label: 'Bài giao đang mở', value: m.activeAssignments, icon: ClipboardCheck, to: 'assignments' },
      { label: 'Cần quan sát thêm', value: m.needingAttention, icon: MessageSquare, to: 'analytics' }
    ].map(item => <Link to={'/teacher/' + item.to} className="teacher-metric" key={item.label}><span><small>{item.label}</small><strong>{item.value ?? 0}</strong></span><item.icon size={23} /></Link>)}</div>
    <TeacherTasks/>
    {data.live.length > 0 && <section className="teacher-live-banner"><span className="teacher-live-dot" /><div><strong>Buổi dạy đang mở</strong><p>{data.live[0].classroom?.name} · {data.live[0].title}</p></div><Link to={`/teacher/classroom-sessions/${data.live[0]._id}/live`} className="teacher-button primary">Tiếp tục dạy <ArrowRight size={17} /></Link></section>}
    {data.parentFeedback && data.parentFeedback.length > 0 && <ParentFeedbackSection items={data.parentFeedback} />}
    <div className="teacher-home-agenda"><section className="teacher-panel"><div className="teacher-panel-heading"><div><p className="teacher-eyebrow">SẴN SÀNG CHO GIỜ HỌC</p><h2>Lịch dạy hôm nay</h2></div><Link to="/teacher/schedule">Xem lịch <ArrowRight size={16} /></Link></div><ScheduleReminders slots={slots}/>{slots.length ? slots.map((slot: any) => <div key={slot.id} className="teacher-agenda-row"><div className="teacher-agenda-time"><b>{slot.startTime}</b><span>{slot.endTime}</span></div><div><strong>{slot.classroom?.name || 'Lớp học'}</strong><p>{slot.room || 'Theo thời khóa biểu của lớp'}</p></div><Link className="teacher-button" to={`/teacher/classes/${slot.classroom?._id}/sessions/new`}>Chuẩn bị <ArrowRight size={15} /></Link></div>) : <div className="teacher-empty"><CalendarDays size={32} /><strong>Hôm nay chưa có tiết dạy theo lịch</strong><p>Bạn có thể chuẩn bị học liệu hoặc xem lại nhận xét cho buổi tới.</p><Link to="/teacher/lesson-planner">Mở giáo án <ArrowRight size={16} /></Link></div>}</section>
</div>
    <div className="teacher-home-columns"><section className="teacher-panel"><div className="teacher-panel-heading"><h2>Bài giao gần đây</h2><Link to="/teacher/assignments">Tất cả <ArrowRight size={16} /></Link></div>{data.recentAssignments.length ? data.recentAssignments.map((a: any) => <Link to={`/teacher/assignments/${a._id}`} key={a._id} className="teacher-list-row"><span className="teacher-list-icon"><ClipboardCheck size={20} /></span><span><strong>{a.activity?.title || a.lesson?.title || 'Bài tập'}</strong><small>{a.classRoom?.name || 'Lớp học'}</small></span><span className="teacher-status">{status[a.status] || a.status}</span></Link>) : <p className="teacher-empty-text">Chưa có bài giao. Hãy chọn hoạt động ngắn, phù hợp để bé ôn cùng gia đình.</p>}</section><section className="teacher-panel"><div className="teacher-panel-heading"><h2>Tài khoản & mã khôi phục</h2></div><AccountSecurity/></section>
    <section className="teacher-panel"><div className="teacher-panel-heading"><h2>Góc theo dõi học tập</h2><Link to="/teacher/analytics">Chi tiết <ArrowRight size={16} /></Link></div><div className="teacher-observation"><strong>{m.averageScore == null ? 'Chưa đủ dữ liệu' : m.averageScore + '%'}</strong><p>Độ đúng trung bình qua các câu trả lời đã ghi nhận.</p></div><div className="teacher-inline-note"><BookOpen size={19} /><p>{m.unassessedStudents || 0} học sinh chưa có dữ liệu đánh giá. Hãy quan sát thêm trước khi nhận xét năng lực của bé.</p></div><Link className="teacher-button" to="/teacher/students">Mở hồ sơ học sinh <ArrowRight size={16} /></Link></section><ClassGapsPanel classes={data.classes || []}/></div>
  </div>;
};
