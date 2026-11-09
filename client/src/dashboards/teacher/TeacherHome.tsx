import { scheduleEffectiveAt } from '../../utils/teachingSchedule';
import { TeacherTasks } from './TeacherTasks';
import { StoryBanner } from '../../components/StoryScene';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, BellRing, BookOpen, CalendarDays, ClipboardCheck, KeyRound, MessageSquare, Play, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi, classroomSessionApi, teacherApi } from '../../services/api';
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

const ParentFeedbackSection = ({ items }: { items: any[] }) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="teacher-panel rounded-2xl border border-amber-300 bg-amber-50/50 p-4 sm:p-5 mb-4 shadow-xs">
      <div className="teacher-panel-heading border-b border-amber-200/80 pb-3 mb-3">
        <div>
          <p className="teacher-eyebrow text-amber-800">TƯƠNG TÁC GIA ĐÌNH · LỜI NHẮN MỚI</p>
          <h2 className="flex items-center gap-2 text-slate-900">
            <MessageSquare size={20} className="text-amber-700" />
            <span>Phản hồi từ phụ huynh</span>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {[
        {
          label: 'Buổi dạy hôm nay',
          value: slots.length,
          icon: CalendarDays,
          to: 'schedule',
          theme: 'from-blue-50/90 to-indigo-50/40 border-indigo-200/90',
          badge: 'bg-indigo-600 text-white shadow-xs',
          numColor: 'text-indigo-950'
        },
        {
          label: 'Tổng số học sinh',
          value: m.students,
          icon: Users,
          to: 'students',
          theme: 'from-teal-50/90 to-emerald-50/40 border-teal-200/90',
          badge: 'bg-teal-600 text-white shadow-xs',
          numColor: 'text-teal-950'
        },
        {
          label: 'Bài giao đang mở',
          value: m.activeAssignments,
          icon: ClipboardCheck,
          to: 'assignments',
          theme: 'from-amber-50/90 to-orange-50/40 border-amber-200/90',
          badge: 'bg-amber-600 text-white shadow-xs',
          numColor: 'text-amber-950'
        },
        {
          label: 'Cần quan sát thêm',
          value: m.needingAttention,
          icon: MessageSquare,
          to: 'analytics',
          theme: 'from-rose-50/90 to-pink-50/40 border-rose-200/90',
          badge: 'bg-rose-600 text-white shadow-xs',
          numColor: 'text-rose-950'
        }
      ].map((item) => (
        <Link
          to={'/teacher/' + item.to}
          key={item.label}
          className={`p-5 rounded-3xl bg-gradient-to-br ${item.theme} border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 group`}
        >
          <div>
            <span className="block text-xs font-bold text-slate-700 tracking-wide mb-1">
              {item.label}
            </span>
            <strong className={`text-3xl font-black ${item.numColor} tracking-tight`}>
              {item.value ?? 0}
            </strong>
          </div>
          <div className={`w-12 h-12 rounded-2xl ${item.badge} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <item.icon size={22} />
          </div>
        </Link>
      ))}
    </div>
    <TeacherTasks/>
    {data.live.length > 0 && (
      <section className="my-5 p-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-300"></span>
          </span>
          <div>
            <strong className="block text-base font-black text-white">Buổi dạy đang diễn ra (Live)</strong>
            <p className="text-xs text-teal-100 font-semibold">{data.live[0].classroom?.name} · {data.live[0].title}</p>
          </div>
        </div>
        <Link
          to={`/teacher/classroom-sessions/${data.live[0]._id}/live`}
          className="px-4 py-2 rounded-xl bg-white text-teal-900 font-black text-xs hover:bg-teal-50 transition-all flex items-center gap-1.5 shadow-sm"
        >
          Tiếp tục dạy <ArrowRight size={15} />
        </Link>
      </section>
    )}
    {data.parentFeedback && data.parentFeedback.length > 0 && <ParentFeedbackSection items={data.parentFeedback} />}
    <div className="mb-6">
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black shrink-0">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider uppercase text-indigo-800">Sẵn sàng cho giờ học</p>
              <h2 className="text-lg font-black text-slate-900">Lịch dạy hôm nay</h2>
            </div>
          </div>
          <Link to="/teacher/schedule" className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1">
            Xem lịch <ArrowRight size={14} />
          </Link>
        </div>
        <ScheduleReminders slots={slots}/>
        {slots.length ? (
          <div className="divide-y divide-slate-100">
            {slots.map((slot: any) => (
              <div key={slot.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-900 text-center shrink-0">
                    <b className="block text-xs font-black">{slot.startTime}</b>
                    <span className="text-[10px] text-teal-800 font-bold">{slot.endTime}</span>
                  </div>
                  <div>
                    <strong className="block text-sm font-black text-slate-900">{slot.classroom?.name || 'Lớp học'}</strong>
                    <p className="text-xs text-slate-600 font-medium">{slot.room || 'Theo thời khóa biểu của lớp'}</p>
                  </div>
                </div>
                <Link
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                  to={`/teacher/classes/${slot.classroom?._id}/sessions/new`}
                >
                  Chuẩn bị <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            <CalendarDays size={32} className="mx-auto text-teal-700 mb-2 opacity-80" />
            <strong className="block text-sm font-black text-slate-800">Hôm nay chưa có tiết dạy theo lịch</strong>
            <p className="text-xs text-slate-600 mt-1 mb-3">Bạn có thể chuẩn bị học liệu hoặc xem lại nhận xét cho buổi tới.</p>
            <Link to="/teacher/content" className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:underline">
              Xem giáo trình <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </section>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Cột 1: Bài giao gần đây */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold">
                <ClipboardCheck size={18} />
              </span>
              <h2 className="text-base font-black text-slate-900">Bài giao gần đây</h2>
            </div>
            <Link to="/teacher/assignments" className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-0.5">
              Tất cả <ArrowRight size={13} />
            </Link>
          </div>
          {data.recentAssignments.length ? (
            <div className="divide-y divide-slate-100">
              {data.recentAssignments.map((a: any) => (
                <Link
                  to={`/teacher/assignments/${a._id}`}
                  key={a._id}
                  className="py-2.5 flex items-center justify-between gap-2 group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <strong className="block text-xs font-black text-slate-900 group-hover:text-teal-900 truncate">
                      {a.activity?.title || a.lesson?.title || 'Bài tập'}
                    </strong>
                    <small className="text-[11px] font-semibold text-slate-500">
                      {a.classRoom?.name || 'Lớp học'}
                    </small>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-950 border border-emerald-200' :
                    a.status === 'CANCELLED' ? 'bg-rose-100 text-rose-950 border border-rose-200' :
                    'bg-amber-100 text-amber-950 border border-amber-200'
                  }`}>
                    {status[a.status] || a.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">
              Chưa có bài giao. Hãy chọn hoạt động ngắn, phù hợp để bé ôn cùng gia đình.
            </p>
          )}
        </div>
      </section>

      {/* Cột 2: Góc theo dõi học tập */}
      <section className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 rounded-3xl border border-indigo-200/90 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                <BookOpen size={18} />
              </span>
              <h2 className="text-base font-black text-slate-900">Góc theo dõi học tập</h2>
            </div>
            <Link to="/teacher/analytics" className="text-xs font-bold text-indigo-800 hover:underline flex items-center gap-0.5">
              Chi tiết <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/80 border border-indigo-100 text-center my-2">
            <strong className="block text-3xl font-black text-indigo-950">
              {m.averageScore == null ? 'Chưa đủ dữ liệu' : m.averageScore + '%'}
            </strong>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Độ đúng trung bình qua các câu trả lời đã ghi nhận.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-medium flex items-center gap-2">
            <BookOpen size={16} className="text-amber-700 shrink-0" />
            <p>
              {m.unassessedStudents || 0} học sinh chưa có dữ liệu đánh giá.
            </p>
          </div>
        </div>
        <div className="pt-3 border-t border-indigo-50 mt-3 text-right">
          <Link
            to="/teacher/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition-all shadow-xs"
          >
            Mở hồ sơ học sinh <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* Cột 3: Tài khoản & mã khôi phục */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-teal-50 text-teal-700 font-bold">
                <KeyRound size={18} />
              </span>
              <h2 className="text-base font-black text-slate-900">Tài khoản & bảo mật</h2>
            </div>
          </div>
          <AccountSecurity/>
        </div>
      </section>
    </div>
  </div>;
};
