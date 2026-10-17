import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Play, PlayCircle, Plus, Search, Star, Users, X, Mail, Calendar, ChevronRight, Clock, Sparkles, Trash2, Award, School, BarChart3, ArrowUpDown, Send, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { teacherApi, parentNotificationApi } from '../../services/api';
import { sortByNameVi } from '../../utils/sortStudents';

const Loader = () => <div className="py-20 text-center text-slate-500"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />Đang tải không gian giảng dạy…</div>;
const Empty = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{children}</div>;
const Metric = ({ label, value, icon }: any) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between text-slate-500">{label}{icon}</div><div className="text-3xl font-bold text-slate-900">{value ?? 0}</div></div>;
const date = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';
const initials = (name?: string) => (name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

export const TeacherLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    ['Bảng điều khiển', '/teacher/dashboard', LayoutDashboard],
    ['Lịch & Tiến độ dạy', '/teacher/schedule', Calendar],
    ['Báo cáo & Phân tích', '/teacher/analytics', TrendingUp],
    ['Quản lý lớp học', '/teacher/classes', School],
    ['Buổi dạy trên lớp', '/teacher/classroom-sessions', PlayCircle],
    ['Mẫu câu', '/teacher/sentences', MessageSquare],
    ['Nội dung học', '/teacher/content', BookOpen],
    ['Bài được giao', '/teacher/assignments', ClipboardList],
    ['Học sinh theo lớp', '/teacher/students', GraduationCap]
  ];

  const isLinkActive = (to: string) => {
    if (to === '/teacher/dashboard') return location.pathname === '/teacher/dashboard' || location.pathname === '/teacher';
    return location.pathname.startsWith(to);
  };

  const navContent = (
    <nav className="space-y-1">
      {links.map(([label, to, Icon]: any) => {
        const active = isLinkActive(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
              active
                ? 'bg-teal-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700'
            }`}
          >
            <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col lg:justify-between z-20">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 font-bold text-white shadow-sm">KC</div>
            <div>
              <b className="text-slate-900">KCEnglishKids</b>
              <p className="text-xs font-semibold text-teal-700">Không gian giảng dạy</p>
            </div>
          </div>

          {/* Teacher Profile Card in Sidebar */}
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-3.5 border border-teal-100/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-600 font-black text-white shadow-sm text-sm">
                {initials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Giáo viên phụ trách</span>
                <p className="text-sm font-extrabold text-slate-900 truncate" title={user?.name}>
                  Cô {user?.name}
                </p>
              </div>
            </div>
          </div>

          {navContent}
        </div>
        <button
          onClick={() => { logout(); navigate('/teacher/login'); }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut size={17} /> Đăng xuất
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 font-bold text-white text-xs">KC</div>
          <div>
            <span className="font-bold text-xs text-slate-900 block leading-tight">Cô {user?.name}</span>
            <span className="text-[10px] text-teal-700 font-semibold">Giáo viên KCEnglishKids</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="h-full w-72 bg-white p-5 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 font-bold text-white">KC</div>
                  <div>
                    <b className="text-sm">Cô {user?.name}</b>
                    <p className="text-xs text-teal-700 font-medium">Giáo viên mầm non</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              {navContent}
            </div>
            <button
              onClick={() => { logout(); navigate('/teacher/login'); }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={17} /> Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-5 lg:ml-64 lg:p-8">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-black text-white shadow-md shadow-teal-500/20">
              {initials(user?.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                  <Sparkles size={12} className="text-teal-600" /> Giáo viên Tiếng Anh Mầm Non
                </span>
                <span className="text-xs text-slate-400">• KCEnglishKids</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Cô giáo: <span className="text-teal-700">{user?.name}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/schedule"
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-100 transition-all shadow-sm"
            >
              <Calendar size={16} /> Lịch & Tiến độ dạy
            </Link>
            <Link
              to="/teacher/classroom-sessions"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-sm"
            >
              <PlayCircle size={16} /> Bắt đầu buổi dạy
            </Link>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};

export const TeacherDashboard = () => {
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');

  useEffect(() => {
    teacherApi
      .getDashboard()
      .then((x) => setData(x.data))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Empty>Không thể tải thông tin. Vui lòng thử lại.</Empty>;
  if (!data) return <Loader />;
  const m = data.metrics;

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-teal-700">Tổng quan giảng dạy</p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Lớp học của bạn trong tầm mắt
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/teacher/sentences"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
          >
            <MessageSquare size={16} /> Dạy mẫu câu
          </Link>
          <Link
            to="/teacher/assignments"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-all cursor-pointer"
          >
            Giao bài tập
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Lớp đang phụ trách" value={m.classes} icon={<Users size={18} className="text-teal-600" />} />
        <Metric label="Tổng số học sinh" value={m.students} icon={<GraduationCap size={18} className="text-indigo-600" />} />
        <Metric label="Bài đang hiệu lực" value={m.activeAssignments} icon={<ClipboardList size={18} className="text-amber-600" />} />
        <Metric label="Cần quan tâm" value={m.needingAttention} icon={<CheckCircle2 size={18} className="text-rose-500" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="mb-4 font-bold text-slate-900">Tổng kết học tập</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50">
              <b className="block text-xl sm:text-2xl text-teal-700 font-black">{m.averageScore}%</b>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Điểm trung bình</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <b className="block text-xl sm:text-2xl text-amber-600 font-black flex items-center justify-center gap-1">
                <Star size={18} className="fill-amber-400 text-amber-400" /> {m.stars}
              </b>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Sao đã đạt</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <b className="block text-xl sm:text-2xl text-indigo-700 font-black">{m.completedAssignments}</b>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Đã hoàn thành</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="mb-4 font-bold text-slate-900">Bài giao gần đây</h3>
          {data.recentAssignments.length ? (
            data.recentAssignments.map((a: any) => (
              <Link
                key={a._id}
                to={`/teacher/assignments/${a._id}`}
                className="mb-2.5 flex items-center justify-between rounded-xl bg-slate-50 p-3 hover:bg-teal-50 transition-colors"
              >
                <span className="min-w-0 pr-2">
                  <b className="block truncate text-sm text-slate-800">{a.activity?.title || a.lesson?.title}</b>
                  <small className="text-slate-500">{a.classRoom?.name}</small>
                </span>
                <span className="text-xs font-bold text-teal-700 shrink-0">{a.status}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500 py-3">Chưa có bài giao nào.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h3 className="mb-4 font-bold text-slate-900">Buổi học gần đây</h3>
        {data.recentSessions.length ? (
          data.recentSessions.map((s: any) => (
            <div key={s._id} className="flex items-center justify-between border-t border-slate-100 py-3 text-sm">
              <span className="min-w-0 pr-2">
                <b className="text-slate-900">{s.child?.name}</b>
                <span className="text-slate-500"> · {s.lesson?.title}</span>
              </span>
              <span className="text-xs text-slate-400 shrink-0">{date(s.lastActivityAt)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 py-3">Chưa có buổi học nào.</p>
        )}
      </section>
    </>
  );
};

export const TeacherClasses = () => {
  const [classes, setClasses] = useState<any[]>();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        teacherApi.getClasses(),
        teacherApi.getStudents().catch(() => ({ data: [] }))
      ]);
      setClasses(cRes.data || []);
      setStudents(sRes.data || []);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => classes?.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [classes, search]
  );

  if (!classes) return <Loader />;

  // Calculate totals across all teacher's classes
  const totalAllStudents = students.length || classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  const totalAllStars = students.reduce((sum, s) => sum + (s.stats?.totalStars ?? s.stats?.stars ?? 0), 0);
  const overallAvg = students.length
    ? Math.round(students.reduce((sum, s) => sum + (s.stats?.averageScore || 0), 0) / students.length)
    : 0;

  return (
    <>
      <Header
        title="Quản Lý Lớp Học"
        text="Trung tâm điều hành và sổ chủ nhiệm các lớp bạn đang phụ trách. Theo dõi sĩ số, thành tích và bắt đầu buổi dạy trực tiếp theo đúng giáo trình."
      />

      {/* KPI Overview of all classes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lớp phụ trách</span>
            <School size={18} className="text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{classes.length} <span className="text-sm font-semibold text-slate-500">lớp</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng học sinh</span>
            <Users size={18} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAllStudents} <span className="text-sm font-semibold text-slate-500">bé</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng sao tích lũy</span>
            <Star size={18} className="fill-amber-400 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{totalAllStars} <span className="text-sm font-semibold text-slate-500">⭐</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Điểm TB toàn khối</span>
            <BarChart3 size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{overallAvg}%</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <SearchBox value={search} onChange={setSearch} />
        <Link
          to="/teacher/classroom-sessions/new"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-teal-700 transition-all cursor-pointer"
        >
          <PlayCircle size={18} /> Bắt đầu buổi dạy mới
        </Link>
      </div>

      {filtered?.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const classStudents = students.filter(
              (s) => String(s.assignedClass?._id || s.assignedClass) === String(c._id)
            );
            const studentCount = c.students?.length || classStudents.length || 0;
            const classStars = classStudents.reduce(
              (sum, s) => sum + (s.stats?.totalStars ?? s.stats?.stars ?? 0),
              0
            );
            const classAvg = classStudents.length
              ? Math.round(
                  classStudents.reduce((sum, s) => sum + (s.stats?.averageScore || 0), 0) /
                    classStudents.length
                )
              : 0;

            const bookLabel =
              c.ageGroupCode === '3-4'
                ? '📘 Sách Book 1 (3–4 tuổi)'
                : c.ageGroupCode === '4-5'
                ? '📗 Sách Book 2 (4–5 tuổi)'
                : '📙 Sách Book 3 (5–6 tuổi)';

            return (
              <div
                key={c._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700 font-black text-sm">
                          🏫
                        </span>
                        <h3 className="font-black text-lg text-slate-900 leading-tight">{c.name}</h3>
                      </div>
                      <span className="inline-block mt-2 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200/60">
                        {bookLabel}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-200">
                      {c.status === 'ACTIVE' ? 'Đang hoạt động' : c.status}
                    </span>
                  </div>

                  {/* 3 Metric Pills */}
                  <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div className="text-center">
                      <span className="block text-[11px] font-bold text-slate-400">Sĩ số</span>
                      <b className="text-base text-slate-800">{studentCount} bé</b>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <span className="block text-[11px] font-bold text-slate-400">Điểm TB</span>
                      <b className="text-base text-teal-700">{classAvg}%</b>
                    </div>
                    <div className="text-center">
                      <span className="block text-[11px] font-bold text-slate-400">Tổng sao</span>
                      <b className="text-base text-amber-600 flex items-center justify-center gap-0.5">
                        <Star size={13} className="fill-amber-400 text-amber-500" />
                        {classStars}
                      </b>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/teacher/classroom-sessions/new?classroomId=${c._id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    title="Bắt đầu buổi dạy trực tiếp cho lớp này"
                  >
                    <Play size={13} className="fill-white" /> Dạy ngay
                  </Link>

                  <Link
                    to={`/teacher/schedule`}
                    className="py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    title="Xem lịch và tiến độ giảng dạy"
                  >
                    <Calendar size={13} /> Lịch
                  </Link>

                  <Link
                    to={`/teacher/classes/${c._id}`}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    title="Xem sổ lớp và hồ sơ học sinh"
                  >
                    <Users size={13} /> Sổ lớp
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>Bạn chưa được phân công lớp nào.</Empty>
      )}
    </>
  );
};

const Header = ({ title, text, action }: any) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-sm font-bold text-teal-700">Không gian giảng dạy</p>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
    {action}
  </div>
);

const SearchBox = ({ value, onChange }: any) => (
  <label className="flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs">
    <Search size={17} className="text-slate-400 shrink-0" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Tìm theo tên hoặc mã học sinh…"
      className="w-full outline-none text-sm font-medium"
    />
  </label>
);

export const TeacherClassDetail = () => {
  const { classId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [eligible, setEligible] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'age' | 'stars' | 'progress'>('name');

  const load = () =>
    teacherApi
      .getClassDetail(classId)
      .then((x) => {
        setData(x.data);
        setError('');
      })
      .catch((e) => setError(e?.message || 'Không thể tải lớp học này.'));

  useEffect(() => {
    void load();
  }, [classId]);

  const openAdd = async () => {
    setEligible(sortByNameVi((await teacherApi.getEligibleStudents(classId)).data || []));
    setShow(true);
  };

  const add = async () => {
    await teacherApi.addStudents(classId, selected);
    setShow(false);
    setSelected([]);
    void load();
  };

  if (error)
    return (
      <Empty>
        Không thể tải lớp học này.{' '}
        <button onClick={() => { setError(''); void load(); }} className="font-semibold text-teal-700">
          Thử lại
        </button>
      </Empty>
    );
  if (!data) return <Loader />;

  const remove = async (s: any) => {
    if (confirm(`Cho ${s.name} ra khỏi lớp? (Không xóa tài khoản và lịch sử học của bé.)`)) {
      await teacherApi.removeStudent(classId, s._id);
      void load();
    }
  };

  const students = sortByNameVi(data.students || []);
  const filteredStudents = search
    ? students.filter((s: any) => String(s.name || '').toLowerCase().includes(search.toLowerCase()))
    : students;
  const sortedStudents =
    sortKey === 'name'
      ? filteredStudents
      : [...filteredStudents].sort((a: any, b: any) =>
          sortKey === 'stars'
            ? (b.stats?.totalStars ?? b.stats?.stars ?? 0) - (a.stats?.totalStars ?? a.stats?.stars ?? 0)
            : sortKey === 'progress'
            ? (b.stats?.completedLessons ?? 0) - (a.stats?.completedLessons ?? 0)
            : String(a.ageGroupCode || '').localeCompare(String(b.ageGroupCode || ''))
        );

  const th = (key: typeof sortKey, label: string) => (
    <button
      type="button"
      onClick={() => setSortKey(key)}
      className={`text-left text-xs font-bold uppercase tracking-wide cursor-pointer ${
        sortKey === key ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
      {sortKey === key ? ' ↓' : ''}
    </button>
  );

  return (
    <>
      <Header
        title={data.name}
        text={`Độ tuổi ${data.ageGroupCode || '—'} · ${data.students.length} học sinh`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/teacher/classes/${classId}/sessions/new`}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-xs transition-all"
            >
              <Play size={16} /> Bắt đầu buổi dạy
            </Link>
            <button
              onClick={openAdd}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="mr-1 inline" size={16} /> Thêm học sinh
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">Học sinh ({sortedStudents.length})</h3>
            <div className="w-full max-w-xs">
              <SearchBox value={search} onChange={setSearch} />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_70px_130px_80px_90px_70px] sm:items-center sm:gap-3 sm:border-b sm:pb-2">
            {th('name', 'Họ tên')}
            <span className="hidden sm:block">{th('age', 'Tuổi')}</span>
            <span className="hidden sm:block text-xs font-bold uppercase tracking-wide text-slate-400">Liên hệ PH</span>
            <span className="hidden sm:block">{th('stars', 'Sao')}</span>
            <span className="hidden sm:block">{th('progress', 'Bài học')}</span>
            <span className="hidden sm:block" />
          </div>

          {sortedStudents.length ? (
            sortedStudents.map((s: any) => (
              <div
                key={s._id}
                className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_70px_130px_80px_90px_70px] sm:items-center"
              >
                <Link to={`/teacher/students/${s._id}`} className="flex min-w-0 items-center gap-3">
                  <Avatar name={s.name} />
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-slate-900">{s.name}</b>
                    <small className="block truncate text-slate-500">
                      {s.stats?.averageScore ? `${Math.round(s.stats.averageScore)}% trung bình` : 'Chưa có hoạt động'}
                    </small>
                  </span>
                </Link>
                <span className="hidden sm:block text-sm text-slate-600">Tuổi {s.ageGroupCode || '—'}</span>
                <span className="hidden sm:block truncate text-sm text-slate-600" title={s.contact || s.parentContact || ''}>
                  {s.contact || s.parentContact || '—'}
                </span>
                <span className="hidden sm:block text-sm font-semibold">
                  <Star className="inline fill-amber-400 text-amber-400" size={14} />{' '}
                  {s.stats?.totalStars ?? s.stats?.stars ?? 0}
                </span>
                <span className="hidden sm:block text-sm text-slate-600">{s.stats?.completedLessons ?? 0} bài học</span>
                <button
                  onClick={() => remove(s)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Xóa khỏi lớp
                </button>
              </div>
            ))
          ) : (
            <Empty>{data.students.length ? 'Không có học sinh nào khớp tìm kiếm.' : 'Lớp này chưa có học sinh nào.'}</Empty>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="mb-4 font-bold text-slate-900">Bài được giao</h3>
          {data.assignments.length ? (
            data.assignments.slice(0, 5).map((a: any) => (
              <Link
                className="mb-2 block rounded-xl bg-slate-50 p-3 text-sm hover:bg-teal-50 transition-colors"
                to={`/teacher/assignments/${a._id}`}
                key={a._id}
              >
                <b className="text-slate-800">{a.activity?.title || a.lesson?.title}</b>
                <small className="block text-slate-500">{a.status}</small>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500 py-3">Chưa có bài giao nào.</p>
          )}
        </section>
      </div>

      {show && (
        <Modal title="Thêm học sinh vào lớp" close={() => setShow(false)}>
          <div className="max-h-80 overflow-auto">
            {eligible.length ? (
              eligible.map((s) => (
                <label key={s._id} className="flex items-center gap-3 border-b border-slate-100 p-3 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(s._id)}
                    onChange={(e) =>
                      setSelected(e.target.checked ? [...selected, s._id] : selected.filter((x) => x !== s._id))
                    }
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <Avatar name={s.name} />
                  <span>
                    <b className="text-slate-900">{s.name}</b>
                    <small className="block text-slate-500">Độ tuổi {s.ageGroupCode}</small>
                  </span>
                </label>
              ))
            ) : (
              <Empty>Không tìm thấy học sinh đủ điều kiện.</Empty>
            )}
          </div>
          <button
            disabled={!selected.length}
            onClick={add}
            className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
          >
            Thêm ({selected.length}) bé đã chọn
          </button>
        </Modal>
      )}
    </>
  );
};

const Avatar = ({ name }: any) => (
  <div className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 shrink-0">
    {initials(name)}
  </div>
);

const Modal = ({ title, close, children }: any) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
      <div className="mb-4 flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <button onClick={close} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1">{children}</div>
    </div>
  </div>
);

export const TeacherContent = () => {
  const [data, setData] = useState<any>();
  const [age, setAge] = useState('');
  const [lesson, setLesson] = useState<any>();

  const load = (a = '') => teacherApi.getContent(a ? `ageGroupCode=${a}` : '').then((x) => setData(x.data));

  useEffect(() => {
    void load();
  }, []);

  if (!data) return <Loader />;

  return (
    <>
      <Header
        title="Nội dung học tập"
        text="Xem trước nội dung chương trình, từ vựng và chọn mẫu câu bài học để dạy trực tiếp trên lớp."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {['', '3-4', '4-5', '5-6'].map((a) => (
          <button
            key={a || 'all'}
            onClick={() => {
              setAge(a);
              void load(a);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              age === a
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {a ? `Độ tuổi ${a}` : 'Tất cả 3 cấp độ'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          {data.units.map((u: any) => {
            const unitLessons = data.lessons.filter((l: any) =>
              l.curriculumUnits?.some((x: any) => String(x) === String(u._id))
            );

            return (
              <div key={u._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-700">
                    Sách {u.bookNumber} · Độ tuổi {u.ageGroupCode} · Unit {u.unitNumber}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {unitLessons.length} bài học
                  </span>
                </div>

                <h3 className="mt-2 text-lg font-black text-slate-900">{u.bigQuestion}</h3>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {u.vocabularyReferences?.join(' · ') || 'Chủ đề từ vựng và đàm thoại theo chuẩn giáo trình'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {unitLessons.map((l: any) => (
                    <button
                      key={l._id}
                      onClick={() => setLesson(l)}
                      className="group flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:border-teal-400 hover:bg-teal-50/50 hover:text-teal-900 transition-all cursor-pointer"
                    >
                      <span>{l.title}</span>
                      <span className="text-[11px] text-teal-600 opacity-70 group-hover:opacity-100">💬</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 mb-2">Chương trình học chuẩn</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              27 Unit chính thức trong Sách 1–3 thiết kế cho lứa tuổi mầm non (3-6 tuổi).
            </p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Bài học đã duyệt:</span>
                <b className="text-teal-700">{data.lessons.length} bài</b>
              </div>
              <div className="flex justify-between">
                <span>Hoạt động tương tác:</span>
                <b className="text-teal-700">{data.activities.length} hoạt động</b>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-5 shadow-xs">
            <span className="text-2xl">💬</span>
            <h4 className="mt-2 font-bold text-teal-900 text-sm">Dạy mẫu câu trên lớp</h4>
            <p className="mt-1 text-xs text-teal-700 leading-relaxed">
              Chiếu trực tiếp câu hỏi và câu trả lời tương ứng với bài học lên máy chiếu trong giờ dạy.
            </p>
            <Link
              to="/teacher/sentences"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-all"
            >
              Bắt đầu học mẫu câu <ChevronRight size={13} />
            </Link>
          </div>
        </section>
      </div>

      {lesson && (
        <Modal title={`Xem trước: ${lesson.title}`} close={() => setLesson(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{lesson.description || 'Nội dung bài học chuẩn chương trình.'}</p>

            {lesson.learningObjectives?.length > 0 && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <b className="text-slate-800 block mb-1">Mục tiêu học tập:</b>
                <p className="text-slate-600">{lesson.learningObjectives.join(' · ')}</p>
              </div>
            )}

            {lesson.vocabularyItems?.length > 0 && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <b className="text-slate-800 block mb-1">Từ vựng bài học ({lesson.vocabularyItems.length} từ):</b>
                <p className="text-slate-600">
                  {lesson.vocabularyItems.map((v: any) => v.english).join(', ')}
                </p>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                to={`/teacher/sentences?lessonId=${lesson._id}&mode=classroom`}
              >
                <MessageSquare size={14} /> Dạy mẫu câu bài này ngay 💬
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer"
                to={`/teacher/assignments?lesson=${lesson._id}`}
              >
                <ClipboardList size={14} /> Giao bài học này
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export const TeacherAssignments = () => {
  const [items, setItems] = useState<any[]>();
  const [classes, setClasses] = useState<any[]>([]);
  const [content, setContent] = useState<any>();
  const [create, setCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [form, setForm] = useState({
    classRoomId: '',
    assignedToType: 'CLASS',
    studentId: '',
    lessonId: '',
    activityId: '',
    dueDate: '',
    instructions: ''
  });

  const [classStudents, setClassStudents] = useState<any[]>([]);

  const load = () => teacherApi.getAssignments().then(x => setItems(x.data || []));

  useEffect(() => {
    void load();
    teacherApi.getClasses().then(x => setClasses(x.data || []));
    teacherApi.getContent().then(x => setContent(x.data || { lessons: [], activities: [] }));
  }, []);

  useEffect(() => {
    if (form.classRoomId) {
      teacherApi.getClassDetail(form.classRoomId).then(x => {
        setClassStudents(x.data?.students || []);
      }).catch(() => setClassStudents([]));
    } else {
      setClassStudents([]);
    }
  }, [form.classRoomId]);

  if (!items || !content) return <Loader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classRoomId || !form.lessonId) return;
    setSubmitting(true);
    try {
      await teacherApi.createAssignment({
        classRoomId: form.classRoomId,
        assignedToType: 'CLASS',
        lessonId: form.lessonId,
        activityId: form.activityId || undefined,
        dueDate: form.dueDate || undefined,
        instructions: form.instructions || undefined
      });
      setCreate(false);
      setForm({
        classRoomId: '',
        assignedToType: 'CLASS',
        studentId: '',
        lessonId: '',
        activityId: '',
        dueDate: '',
        instructions: ''
      });
      void load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể giao bài. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      try {
        await teacherApi.deleteAssignment(id);
        void load();
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Không thể xóa bài.');
      }
    }
  };

  const filtered = items.filter(a => {
    const title = (a.activity?.title || a.lesson?.title || '').toLowerCase();
    const matchSearch = !searchTerm || title.includes(searchTerm.toLowerCase());
    const matchClass = !selectedClassFilter || a.classRoom?._id === selectedClassFilter;
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const activeCount = items.filter(x => ['ASSIGNED', 'IN_PROGRESS'].includes(x.status)).length;
  const completedCount = items.filter(x => x.status === 'COMPLETED').length;

  return (
    <>
      <Header
        title="Quản lý Bài tập được giao"
        text="Theo dõi tiến độ làm bài, giao bài mới và chấm bài của các lớp."
        action={
          <button
            onClick={() => setCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 cursor-pointer"
          >
            <Plus size={16} /> Giao bài tập mới
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Metric label="Tổng số bài đã giao" value={items.length} icon={<ClipboardList size={18} />} />
        <Metric label="Đang diễn ra" value={activeCount} icon={<Clock size={18} className="text-amber-500" />} />
        <Metric label="Đã hoàn thành" value={completedCount} icon={<CheckCircle2 size={18} className="text-emerald-500" />} />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchBox value={searchTerm} onChange={setSearchTerm} />
          
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả các lớp</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ASSIGNED">Đang giao</option>
            <option value="IN_PROGRESS">Đang học</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Hiển thị {filtered.length} / {items.length} bài
        </span>
      </div>

      {filtered.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="p-4">Nội dung bài tập</th>
                <th className="p-4">Lớp áp dụng</th>
                <th className="p-4">Đối tượng</th>
                <th className="p-4">Hạn hoàn thành</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => {
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'COMPLETED';
                return (
                  <tr key={a._id} className="hover:bg-teal-50/40 transition-colors">
                    <td className="p-4">
                      <Link
                        className="font-bold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1.5"
                        to={`/teacher/assignments/${a._id}`}
                      >
                        {a.activity?.title || a.lesson?.title}
                        <ChevronRight size={14} className="text-teal-500" />
                      </Link>
                      <span className="mt-0.5 inline-block text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {a.activity?.activityType || 'Toàn bộ bài học'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {a.classRoom?.name || '—'}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-full text-xs">
                        <Users size={13} className="text-teal-600" />
                        Cả lớp ({a.classRoom?.students?.length || 0} bé)
                      </span>
                    </td>
                    <td className="p-4">
                      {a.dueDate ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isOverdue ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded' : 'text-slate-600'}`}>
                          <Calendar size={13} />
                          {date(a.dueDate)}
                          {isOverdue && ' (Hết hạn)'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Không giới hạn</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        a.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {a.status === 'ASSIGNED' ? 'Đang giao' :
                         a.status === 'IN_PROGRESS' ? 'Đang học' :
                         a.status === 'COMPLETED' ? 'Hoàn thành' :
                         a.status === 'CANCELLED' ? 'Đã hủy' : a.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/teacher/assignments/${a._id}`}
                          className="rounded-lg bg-teal-50 hover:bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors"
                        >
                          Chi tiết & Chấm bài
                        </Link>
                        <button
                          onClick={e => handleDelete(a._id, e)}
                          title="Xóa bài tập này"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Không có bài tập nào phù hợp với bộ lọc.</Empty>
      )}

      {create && (
        <Modal title="Giao bài tập mới cho học sinh" close={() => setCreate(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Select
              label="Chọn lớp học"
              value={form.classRoomId}
              onChange={(v: string) => setForm({ ...form, classRoomId: v, studentId: '' })}
              options={classes.map(c => ({ value: c._id, label: `${c.name} (${c.students?.length || 0} học sinh)` }))}
            />

            {form.classRoomId && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-3 text-xs text-teal-900 flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Users size={16} className="text-teal-700" />
                  Đối tượng nhận bài: <b>Toàn bộ học sinh trong lớp ({classStudents.length} bé)</b>
                </span>
                <span className="bg-teal-200/80 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                  Áp dụng cả lớp
                </span>
              </div>
            )}

            <Select
              label="Chọn bài học (Lesson)"
              value={form.lessonId}
              onChange={(v: string) => setForm({ ...form, lessonId: v, activityId: '' })}
              options={content.lessons.map((l: any) => ({ value: l._id, label: l.title }))}
            />

            {form.lessonId && (
              <Select
                label="Chọn hoạt động / Game cụ thể"
                value={form.activityId}
                onChange={(v: string) => setForm({ ...form, activityId: v })}
                options={[
                  { value: '', label: '📌 Toàn bộ bài học (Tất cả hoạt động)' },
                  ...content.activities
                    .filter((a: any) => String(a.lesson) === form.lessonId)
                    .map((a: any) => ({ value: a._id, label: `🎮 ${a.title} (${a.activityType})` }))
                ]}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Hạn hoàn thành bài tập
                <input
                  type="date"
                  value={form.dueDate}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Lời dặn dò của cô
                <textarea
                  rows={3}
                  placeholder="VD: Các con luyện phát âm thật to và hoàn thành bài tập này trước cuối tuần nhé!"
                  value={form.instructions}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreate(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submitting}
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? 'Đang tạo bài…' : 'Xác nhận giao bài'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

const Select = ({ label, value, onChange, options }: any) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <select
      required
      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-teal-500"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Chọn…</option>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

export const TeacherAssignmentDetail = () => {
  const { assignmentId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUBMITTED' | 'UNSUBMITTED' | 'NEEDS_REVIEW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected student submission for reviewing modal
  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  // Review form state
  const [reviewNote, setReviewNote] = useState('');
  const [bonusStars, setBonusStars] = useState(1);
  const [notifyParent, setNotifyParent] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = () => teacherApi.getAssignment(assignmentId).then(x => setData(x.data));

  useEffect(() => {
    void load();
  }, [assignmentId]);

  if (!data) return <Loader />;

  const a = data.assignment;
  const stats = data.stats || {
    totalStudents: 0,
    submittedStudents: 0,
    unsubmittedStudents: 0,
    submissionRate: 0,
    averageScore: 0
  };

  const studentSubmissions: any[] = data.studentSubmissions || [];

  // Open review modal
  const openReviewModal = (item: any) => {
    setSelectedSub(item);
    setReviewNote(item.submission?.teacherFeedback?.comment || '');
    setBonusStars(item.submission?.teacherFeedback?.bonusStars ?? 1);
    setNotifyParent(true);
    setSaveSuccess(false);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setSavingReview(true);
    try {
      await teacherApi.reviewSubmission(a._id, selectedSub.student._id, {
        comment: reviewNote,
        bonusStars,
        notifyParent
      });
      setSaveSuccess(true);
      await load();
      setTimeout(() => {
        setSelectedSub(null);
        setSaveSuccess(false);
      }, 1200);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể lưu nhận xét.');
    } finally {
      setSavingReview(false);
    }
  };

  const quickReviewChips = [
    { label: '🌟 Xuất sắc & Điểm tối đa', text: 'Bé hoàn thành bài tập xuất sắc, đạt điểm tuyệt đối và ghi nhớ bài rất nhanh! 🌟' },
    { label: '🗣️ Phát âm to rõ', text: 'Bé phát âm rất to, rõ ràng và chuẩn xác từng từ vựng! 🗣️' },
    { label: '🚀 Phản xạ nhanh', text: 'Bé có phản xạ nghe và chọn đáp án rất nhanh nhạy, đáng khen ngợi! 🚀' },
    { label: '✨ Tiến bộ rõ rệt', text: 'Bé có nhiều tiến bộ tích cực so với các buổi học trước, cô khen ngợi bé! ✨' },
    { label: '👏 Chăm chỉ hoàn thành', text: 'Bé rất chăm chỉ, tự giác hoàn thành bài tập đúng hạn! 👏' },
    { label: '📖 Cần ôn thêm từ vựng', text: 'Bé làm tốt, gia đình cho bé nghe lại từ vựng thêm 10 phút ở nhà để nhớ lâu hơn nhé! 📖' },
    { label: '💡 Cần rèn phản xạ nghe', text: 'Bé cần chú ý lắng nghe kỹ hơn ở các câu hỏi nghe chọn hình ảnh nhé! 💡' }
  ];

  // Filtering students
  const filteredSubmissions = studentSubmissions.filter(item => {
    const matchName = item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.username.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchName) return false;

    if (activeTab === 'SUBMITTED') return item.hasSubmitted;
    if (activeTab === 'UNSUBMITTED') return !item.hasSubmitted;
    if (activeTab === 'NEEDS_REVIEW') return item.hasSubmitted && !item.submission?.teacherFeedback?.comment;
    return true;
  });

  const needsReviewCount = studentSubmissions.filter(s => s.hasSubmitted && !s.submission?.teacherFeedback?.comment).length;

  return (
    <>
      <Header
        title={a.activity?.title || a.lesson?.title}
        text={`${a.classRoom?.name || 'Lớp học'} · ${
          a.status === 'ASSIGNED' ? 'Đang giao bài' :
          a.status === 'IN_PROGRESS' ? 'Đang làm bài' :
          a.status === 'COMPLETED' ? 'Đã hoàn thành' : a.status
        }`}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/assignments"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Quay lại danh sách
            </Link>
            {a.status !== 'CANCELLED' && (
              <button
                onClick={async () => {
                  if (confirm('Bạn có chắc muốn hủy bài giao này? Kết quả học đã có sẽ được giữ nguyên.')) {
                    await teacherApi.cancelAssignment(a._id);
                    void load();
                  }
                }}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                Hủy bài giao
              </button>
            )}
          </div>
        }
      />

      {/* Assignment instructions banner */}
      {a.instructions && (
        <div className="mb-6 rounded-2xl bg-teal-50 border border-teal-200 p-4 text-sm text-teal-900 flex items-start gap-3">
          <BookOpen className="text-teal-600 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <b>Lời dặn dò của cô:</b> {a.instructions}
          </div>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Tỷ lệ nộp bài</span>
            <Users size={18} className="text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.submittedStudents} / {stats.totalStudents} <span className="text-sm font-normal text-slate-500">({stats.submissionRate}%)</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all rounded-full"
              style={{ width: `${stats.submissionRate}%` }}
            />
          </div>
        </div>

        <Metric
          label="Điểm trung bình"
          value={`${stats.averageScore}%`}
          icon={<Award size={18} className="text-amber-500" />}
        />

        <Metric
          label="Chưa nộp bài"
          value={stats.unsubmittedStudents}
          icon={<Clock size={18} className="text-rose-500" />}
        />

        <Metric
          label="Cần chấm / Nhận xét"
          value={needsReviewCount}
          icon={<Sparkles size={18} className="text-indigo-500" />}
        />
      </div>

      {/* Filter and Tab Section */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({studentSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('SUBMITTED')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'SUBMITTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã nộp bài ({stats.submittedStudents})
            </button>
            <button
              onClick={() => setActiveTab('UNSUBMITTED')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'UNSUBMITTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa làm bài ({stats.unsubmittedStudents})
            </button>
            <button
              onClick={() => setActiveTab('NEEDS_REVIEW')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'NEEDS_REVIEW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa nhận xét ({needsReviewCount})
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <SearchBox value={searchTerm} onChange={setSearchTerm} />
          </div>
        </div>

        {/* Students Submission Table */}
        {filteredSubmissions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4">Học sinh</th>
                  <th className="p-4">Trạng thái làm bài</th>
                  <th className="p-4">Điểm số</th>
                  <th className="p-4">Sao đạt được</th>
                  <th className="p-4">Nhận xét của cô</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map(item => {
                  const sub = item.submission;
                  const hasFeedback = !!sub?.teacherFeedback?.comment;
                  return (
                    <tr key={item.student._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={item.student.name} />
                          <div>
                            <b className="text-slate-900 block">{item.student.name}</b>
                            <span className="text-xs text-slate-400">@{item.student.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.hasSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={14} /> Đã nộp ({date(sub.submittedAt)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                            <Clock size={14} /> Chưa làm bài
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.hasSubmitted ? (
                          <span className="font-bold text-slate-800 text-base">{sub.score}%</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.hasSubmitted ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                            <Star size={16} className="fill-amber-400 text-amber-400" />
                            {sub.stars}
                            {sub.teacherFeedback?.bonusStars > 0 && (
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                +{sub.teacherFeedback.bonusStars} thưởng
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        {item.hasSubmitted ? (
                          hasFeedback ? (
                            <div className="text-xs text-slate-700 line-clamp-2" title={sub.teacherFeedback.comment}>
                              <span className="font-bold text-teal-700">✓ Đã nhận xét:</span> {sub.teacherFeedback.comment}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              Chưa có lời nhận xét
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">Chờ bé làm bài</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {item.hasSubmitted ? (
                          <button
                            onClick={() => openReviewModal(item)}
                            className="rounded-xl bg-teal-600 hover:bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                          >
                            Xem bài & Chấm điểm
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có bài nộp</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            Không tìm thấy học sinh nào trong nhóm này.
          </div>
        )}
      </section>

      {/* Modal Chấm điểm & Xem chi tiết bài làm */}
      {selectedSub && selectedSub.submission && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={selectedSub.student.name} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    Bài làm của bé: {selectedSub.student.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nộp bài lúc {new Date(selectedSub.submission.submittedAt).toLocaleString()} · Thời gian: {selectedSub.submission.duration || 0}s
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-6">
              {/* Score Snapshot */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Điểm số</span>
                  <b className="text-2xl text-amber-700">{selectedSub.submission.score}%</b>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Số sao đạt</span>
                  <b className="text-2xl text-amber-700 flex items-center justify-center gap-1">
                    <Star size={20} className="fill-amber-400 text-amber-400 inline" />
                    {selectedSub.submission.stars}
                  </b>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Kết quả câu</span>
                  <b className="text-xl text-emerald-700">
                    {selectedSub.submission.correctCount || 0} đúng / {(selectedSub.submission.correctCount || 0) + (selectedSub.submission.incorrectCount || 0)} câu
                  </b>
                </div>
              </div>

              {/* Detailed Questions & Answers Breakdown */}
              <div>
                <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600" />
                  Chi tiết từng câu trả lời ({selectedSub.submission.answers?.length || 0} câu):
                </h4>

                {selectedSub.submission.answers && selectedSub.submission.answers.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSub.submission.answers.map((ans: any, idx: number) => {
                      const vocab = ans.vocabularyId;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            ans.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                ans.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}>
                                {idx + 1}
                              </span>

                              {vocab?.imageUrl && (
                                <img
                                  src={vocab.imageUrl}
                                  alt={vocab.english || ''}
                                  className="w-12 h-12 object-contain rounded-lg border bg-white"
                                />
                              )}

                              <div>
                                <b className="text-slate-900 block text-sm">
                                  {ans.promptText || vocab?.english || `Câu hỏi #${idx + 1}`}
                                </b>
                                {vocab && (
                                  <span className="text-xs text-slate-500">
                                    {vocab.english} · {vocab.vietnamese} {vocab.pronunciation && `(/${vocab.pronunciation}/)`}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                ans.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {ans.isCorrect ? '✓ Chính xác' : '✕ Sai'}
                              </span>
                              {ans.responseTimeMs && (
                                <span className="block text-[11px] text-slate-400 mt-1">
                                  {(ans.responseTimeMs / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-500 text-xs">
                    Bài nộp không có chi tiết từng câu hỏi riêng biệt.
                  </div>
                )}
              </div>

              {/* Teacher Review Form */}
              <form onSubmit={handleSaveReview} className="space-y-4 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  Nhận xét & Đánh giá của Giáo viên
                </h4>

                {/* Bonus Stars */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thưởng thêm sao khích lệ bé:
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setBonusStars(st)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                          bonusStars === st
                            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Star size={14} className={st > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
                        {st === 0 ? 'Không thưởng' : `+${st} sao`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lời nhận xét & dặn dò của cô:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Nhập nhận xét chi tiết gửi cho bé và phụ huynh..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
                    required
                  />

                  {/* Quick Chips */}
                  <div className="mt-2.5 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-500" />
                      <span>Chọn nhanh mẫu câu nhận xét:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {quickReviewChips.map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setReviewNote(prev => prev ? `${prev} ${chip.text}` : chip.text)}
                          className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-left"
                          title={chip.text}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notify Parent Checkbox */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={notifyParent}
                    onChange={e => setNotifyParent(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Đồng thời gửi thông báo kết quả này về Sổ liên lạc của Phụ huynh</span>
                </label>

                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                    ✓ Đã lưu nhận xét và gửi thành công cho bé!
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSub(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={savingReview || !reviewNote.trim()}
                    className="rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {savingReview ? 'Đang lưu…' : 'Lưu nhận xét & Gửi cho bé'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const TeacherStudents = () => {
  const [items, setItems] = useState<any[]>();
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'name' | 'score' | 'stars' | 'lessons'>('name');

  // Quick parent note modal state
  const [quickStudent, setQuickStudent] = useState<any>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickStars, setQuickStars] = useState(5);
  const [quickSubject, setQuickSubject] = useState('Nhận xét học tập');
  const [sendingNote, setSendingNote] = useState(false);

  const quickReviewChips = [
    '🌟 Bé học rất chăm chỉ và hăng hái phát biểu.',
    '👏 Bé phát âm rất to, rõ ràng và chuẩn ngữ điệu.',
    '⚡ Phản xạ nghe chọn và trả lời câu hỏi rất nhanh.',
    '✨ Bé có sự tiến bộ vượt bậc so với tuần trước.',
    '📖 Bé cần ôn lại các từ vựng bài trước ở nhà nhé.'
  ];

  const load = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        teacherApi.getStudents(),
        teacherApi.getClasses().catch(() => ({ data: [] }))
      ]);
      setItems(sRes.data || []);
      setClasses(cRes.data || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!items) return <Loader />;

  // Filter students by search
  const filtered = items.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username?.toLowerCase().includes(search.toLowerCase())
  );

  // Sorting function
  const sortStudents = (list: any[]) => {
    return [...list].sort((a, b) => {
      if (sortKey === 'score') {
        return (b.stats?.averageScore || 0) - (a.stats?.averageScore || 0);
      }
      if (sortKey === 'stars') {
        return (
          (b.stats?.totalStars ?? b.stats?.stars ?? 0) -
          (a.stats?.totalStars ?? a.stats?.stars ?? 0)
        );
      }
      if (sortKey === 'lessons') {
        return (b.stats?.completedLessons || 0) - (a.stats?.completedLessons || 0);
      }
      return sortByNameVi([a, b])[0] === a ? -1 : 1;
    });
  };

  // Group filtered students by assignedClass
  const classGroups = useMemo(() => {
    const map = new Map<string, { classInfo: any; students: any[] }>();

    // Initialize with all teacher's classes
    classes.forEach((c) => {
      map.set(String(c._id), { classInfo: c, students: [] });
    });

    const unassigned: any[] = [];

    filtered.forEach((s) => {
      const cid = s.assignedClass?._id || s.assignedClass;
      if (cid && map.has(String(cid))) {
        map.get(String(cid))!.students.push(s);
      } else if (cid) {
        if (!map.has(String(cid))) {
          map.set(String(cid), { classInfo: s.assignedClass || { _id: cid, name: 'Lớp khác' }, students: [] });
        }
        map.get(String(cid))!.students.push(s);
      } else {
        unassigned.push(s);
      }
    });

    return {
      classes: Array.from(map.values()),
      unassigned
    };
  }, [classes, filtered]);

  // Determine what to display based on selectedClassId
  const displayGroups = useMemo(() => {
    if (selectedClassId === 'all') {
      return classGroups.classes;
    }
    if (selectedClassId === 'unassigned') {
      return [];
    }
    return classGroups.classes.filter(
      (g) => String(g.classInfo?._id) === String(selectedClassId)
    );
  }, [classGroups, selectedClassId]);

  const showUnassigned =
    (selectedClassId === 'all' || selectedClassId === 'unassigned') &&
    classGroups.unassigned.length > 0;

  const handleSendQuickNote = async () => {
    if (!quickStudent || !quickNoteText.trim()) return;
    try {
      setSendingNote(true);
      await parentNotificationApi.sendNotification({
        childId: quickStudent._id,
        subject: quickSubject,
        teacherNote: quickNoteText,
        stars: quickStars,
        templateType: 'PROGRESS_UPDATE'
      });
      alert(`Đã gửi nhận xét đến phụ huynh của bé ${quickStudent.name}!`);
      setQuickStudent(null);
      setQuickNoteText('');
    } catch (e: any) {
      alert(e?.message || 'Không thể gửi nhận xét.');
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <>
      <Header
        title="Quản Lý Học Sinh Theo Lớp"
        text="Danh sách toàn bộ học sinh được nhóm khoa học theo từng lớp học để cô dễ dàng tìm kiếm, chấm điểm và theo dõi tiến độ."
      />

      {/* Class Selection Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        <button
          onClick={() => setSelectedClassId('all')}
          className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            selectedClassId === 'all'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>🏫 Tất cả lớp</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
              selectedClassId === 'all'
                ? 'bg-teal-700 text-teal-100'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {items.length}
          </span>
        </button>

        {classes.map((c) => {
          const count = items.filter(
            (s) => String(s.assignedClass?._id || s.assignedClass) === String(c._id)
          ).length;
          const active = selectedClassId === String(c._id);
          return (
            <button
              key={c._id}
              onClick={() => setSelectedClassId(String(c._id))}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                active
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{c.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                  active ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count} bé
              </span>
            </button>
          );
        })}

        {classGroups.unassigned.length > 0 && (
          <button
            onClick={() => setSelectedClassId('unassigned')}
            className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              selectedClassId === 'unassigned'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
            }`}
          >
            <span>⚠️ Chưa phân lớp</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
              {classGroups.unassigned.length}
            </span>
          </button>
        )}
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <SearchBox value={search} onChange={setSearch} />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <ArrowUpDown size={13} /> Sắp xếp:
          </span>
          <select
            value={sortKey}
            onChange={(e: any) => setSortKey(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none shadow-xs cursor-pointer"
          >
            <option value="name">Tên A–Z (Tiếng Việt)</option>
            <option value="score">Điểm trung bình cao nhất</option>
            <option value="stars">Nhiều sao nhất ⭐</option>
            <option value="lessons">Hoàn thành nhiều bài nhất</option>
          </select>
        </div>
      </div>

      {/* Grouped Class Sections */}
      {displayGroups.length === 0 && !showUnassigned ? (
        <Empty>Không tìm thấy học sinh nào phù hợp tìm kiếm.</Empty>
      ) : (
        <div className="space-y-8">
          {displayGroups.map(({ classInfo, students: groupStudents }) => {
            const sortedStudents = sortStudents(groupStudents);
            const classStars = sortedStudents.reduce(
              (sum, s) => sum + (s.stats?.totalStars ?? s.stats?.stars ?? 0),
              0
            );
            const classAvg = sortedStudents.length
              ? Math.round(
                  sortedStudents.reduce((sum, s) => sum + (s.stats?.averageScore || 0), 0) /
                    sortedStudents.length
                )
              : 0;

            const bookLabel =
              classInfo.ageGroupCode === '3-4'
                ? '📘 Sách Book 1 (3–4 tuổi)'
                : classInfo.ageGroupCode === '4-5'
                ? '📗 Sách Book 2 (4–5 tuổi)'
                : '📙 Sách Book 3 (5–6 tuổi)';

            return (
              <section
                key={classInfo._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
              >
                {/* Group Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700 font-black text-xl shadow-xs">
                      🏫
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900">{classInfo.name}</h3>
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200/60">
                          {bookLabel}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">
                        Sĩ số: {sortedStudents.length} bé · Niên khóa {classInfo.academicYear || '2025–2026'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">
                      <span>Điểm TB: <b className="text-teal-700">{classAvg}%</b></span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star size={13} className="fill-amber-400 text-amber-500" />
                        <b>{classStars} sao</b>
                      </span>
                    </div>

                    <Link
                      to={`/teacher/classroom-sessions/new?classroomId=${classInfo._id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-xs transition-all"
                    >
                      <Play size={12} className="fill-white" /> Dạy lớp này
                    </Link>

                    <Link
                      to={`/teacher/classes/${classInfo._id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      <Users size={13} /> Sổ lớp
                    </Link>
                  </div>
                </div>

                {/* Student Cards in this class */}
                {sortedStudents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">
                    Không có học sinh nào trong lớp khớp với bộ lọc tìm kiếm.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sortedStudents.map((s) => {
                      const avg = Math.round(s.stats?.averageScore || 0);
                      const stars = s.stats?.totalStars ?? s.stats?.stars ?? 0;
                      const lessons = s.stats?.completedLessons ?? 0;

                      const rankBadge =
                        avg >= 85
                          ? { label: '🌟 Xuất sắc', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
                          : avg >= 70
                          ? { label: '👍 Khá giỏi', color: 'bg-teal-50 text-teal-800 border-teal-200' }
                          : { label: '📖 Cần rèn thêm', color: 'bg-amber-50 text-amber-800 border-amber-200' };

                      return (
                        <div
                          key={s._id}
                          className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top: Avatar & Name */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar name={s.name} />
                                <div className="min-w-0">
                                  <Link
                                    to={`/teacher/students/${s._id}`}
                                    className="block font-black text-slate-900 truncate hover:text-teal-700 text-sm"
                                    title={s.name}
                                  >
                                    {s.name}
                                  </Link>
                                  <span className="text-[11px] font-bold text-slate-400 block truncate">
                                    @{s.username || 'hocsinh'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Rank Badge */}
                            <div className="mt-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black border ${rankBadge.color}`}
                              >
                                {rankBadge.label}
                              </span>
                            </div>

                            {/* 3 Metrics */}
                            <div className="mt-3 grid grid-cols-3 gap-1 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400">Điểm</span>
                                <b className="text-teal-700 font-black">{avg}%</b>
                              </div>
                              <div className="border-x border-slate-200">
                                <span className="block text-[10px] font-bold text-slate-400">Sao</span>
                                <b className="text-amber-600 font-black flex items-center justify-center gap-0.5">
                                  <Star size={11} className="fill-amber-400 text-amber-500" />
                                  {stars}
                                </b>
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400">Bài xong</span>
                                <b className="text-slate-700 font-black">{lessons}</b>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                            <Link
                              to={`/teacher/students/${s._id}`}
                              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-0.5"
                            >
                              Hồ sơ <ChevronRight size={13} />
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setQuickStudent(s);
                                setQuickNoteText(
                                  `Bé ${s.name} đã hoàn thành ${lessons} bài học, điểm trung bình đạt ${avg}% và tích lũy được ${stars} sao!`
                                );
                              }}
                              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded-lg"
                              title="Gửi nhận xét phụ huynh"
                            >
                              <Send size={11} /> Nhận xét
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {/* Unassigned Students Group if any */}
          {showUnassigned && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/30 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-black text-amber-900">Học sinh chưa phân vào lớp</h3>
                    <p className="text-xs font-bold text-amber-700">
                      Các bé này chưa được Admin gán vào lớp học nào.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
                  {classGroups.unassigned.length} bé
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortStudents(classGroups.unassigned).map((s) => (
                  <div
                    key={s._id}
                    className="rounded-2xl border border-amber-200 bg-white p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} />
                      <div className="min-w-0">
                        <Link
                          to={`/teacher/students/${s._id}`}
                          className="block font-black text-slate-900 truncate hover:text-amber-700 text-sm"
                        >
                          {s.name}
                        </Link>
                        <span className="text-[11px] font-bold text-slate-400 block truncate">
                          Độ tuổi {s.ageGroupCode || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal: Gửi nhanh nhận xét phụ huynh */}
      {quickStudent && (
        <Modal
          title={`Gửi nhận xét đến phụ huynh bé ${quickStudent.name}`}
          close={() => setQuickStudent(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tiêu đề thông báo</label>
              <input
                type="text"
                value={quickSubject}
                onChange={(e) => setQuickSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Mẫu nhận xét chọn nhanh
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickReviewChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setQuickNoteText((prev) => (prev ? `${prev} ${chip}` : chip))
                    }
                    className="rounded-lg bg-teal-50 border border-teal-100 px-2 py-1 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Lời nhận xét của cô giáo
              </label>
              <textarea
                rows={4}
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                placeholder="Nhập nhận xét chi tiết..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Tặng sao khen thưởng
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setQuickStars(st)}
                    className={`h-9 w-9 rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer ${
                      quickStars >= st
                        ? 'bg-amber-400 text-amber-950 shadow-xs'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-700 ml-2">
                  {quickStars} sao vàng
                </span>
              </div>
            </div>

            <button
              disabled={sendingNote || !quickNoteText.trim()}
              onClick={handleSendQuickNote}
              className="mt-2 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50 cursor-pointer shadow-sm transition-all"
            >
              {sendingNote ? 'Đang gửi thông báo...' : 'Gửi phiếu nhận xét phụ huynh 📨'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

export const TeacherStudentDetail = () => {
  const { studentId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [note, setNote] = useState('');
  const [isHomeroomOnly, setIsHomeroomOnly] = useState(false);
  const [parentNotifs, setParentNotifs] = useState<any[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [parentSubject, setParentSubject] = useState('Nhận xét học tập');
  const [parentNoteText, setParentNoteText] = useState('');
  const [parentStars, setParentStars] = useState(5);

  const studentNoteTemplates = [
    { label: '🌟 Phát âm to rõ', text: 'Bé phát âm rất to, rõ ràng và tự tin trước lớp.' },
    { label: '👏 Hăng hái tương tác', text: 'Bé rất hăng hái giơ tay phát biểu và tương tác sôi nổi.' },
    { label: '📖 Cần rèn luyện thêm', text: 'Bé cần ôn lại từ vựng và luyện tập thêm khả năng tập trung.' },
    { label: '🎯 Nhớ từ vựng tốt', text: 'Bé ghi nhớ từ vựng rất nhanh, trả lời chính xác các câu hỏi.' },
    { label: '✨ Tiến bộ rõ rệt', text: 'Bé có sự tiến bộ vượt bậc so với tuần trước.' },
    { label: '🔒 Lưu ý GVCN', text: 'Ghi chú riêng GVCN: Cần theo dõi thêm về sự tập trung và phản xạ của bé trong giờ học.' }
  ];

  const load = () => {
    teacherApi.getStudentOverview(studentId).then(x => setData(x.data));
    parentNotificationApi.getChildNotifications(studentId).then(x => setParentNotifs(x.data || [])).catch(() => {});
  };

  useEffect(() => { void load(); }, [studentId]);

  if (!data) return <Loader />;
  const { student, stats } = data;

  const add = async (e: any) => {
    e.preventDefault();
    if (note.trim()) {
      await teacherApi.createTeacherNote({ studentId, noteType: 'GENERAL', content: note.trim(), isHomeroomOnly });
      setNote('');
      setIsHomeroomOnly(false);
      void load();
    }
  };

  const sendToParent = async (e: any) => {
    e.preventDefault();
    if (!parentNoteText.trim()) return;
    await parentNotificationApi.sendNotification({
      childId: studentId,
      subject: parentSubject,
      teacherNote: parentNoteText.trim(),
      stars: parentStars,
      score: stats?.averageScore || 0,
      templateType: 'GENERAL'
    });
    setParentNoteText('');
    setShowSendModal(false);
    void load();
  };

  return (
    <>
      <Header
        title={student.name}
        text={`Độ tuổi ${student.ageGroupCode || '—'} · ${student.assignedClass?.name || 'Chưa phân lớp'}`}
        action={
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-xs cursor-pointer"
          >
            <Mail size={16} /> Gửi nhận xét cho Phụ huynh
          </button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Điểm tổng" value={`${stats.averageScore}%`} />
        <Metric label="Bài đã hoàn thành" value={stats.completedLessons} />
        <Metric label="Số sao" value={stats.totalStars} />
        <Metric label="Thời gian học" value={`${Math.round(stats.learningTime / 60)} phút`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6">
          <h3 className="mb-3 font-bold">Lịch sử học tập</h3>
          {data.recentActivities.length ? (
            data.recentActivities.map((r: any) => (
              <div key={r._id} className="flex justify-between border-t py-3 text-sm">
                <span>
                  <b>{r.lesson?.title}</b>
                  <small className="block text-slate-500">
                    {r.activity?.title} · {date(r.createdAt)}
                  </small>
                </span>
                <span>{r.score}% · {r.stars}★</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Chưa có hoạt động học nào.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-base">Ghi chú nội bộ giáo viên</h3>
            <span className="text-xs text-slate-400 font-medium">Lưu trữ sư phạm</span>
          </div>

          <form onSubmit={add} className="mb-4 space-y-3">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Thêm ghi chú riêng về bé (tiến độ, tâm lý, điểm cần lưu ý)…"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              rows={3}
            />

            {/* Quick chips for teacher note */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">Mẫu ghi chú nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {studentNoteTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNote(prev => prev ? `${prev} ${t.text}` : t.text)}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Homeroom Only Checkbox (GV-06) */}
            <label className="flex items-center gap-2 text-xs font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isHomeroomOnly}
                onChange={e => setIsHomeroomOnly(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>🔒 Ghi chú riêng cho Giáo viên chủ nhiệm (Chỉ GVCN lớp được xem)</span>
            </label>

            <button
              type="submit"
              disabled={!note.trim()}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              Lưu ghi chú nội bộ
            </button>
          </form>

          {data.notes.length ? (
            <div className="space-y-3">
              {data.notes.map((n: any) => (
                <div key={n._id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{n.teacher?.name || 'Giáo viên'}</span>
                      {n.isHomeroomOnly ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
                          🔒 Chỉ GVCN xem
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                          👥 Nội bộ lớp
                        </span>
                      )}
                    </div>
                    <small className="text-slate-400 text-xs">{date(n.createdAt)}</small>
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">Chưa có ghi chú nội bộ nào cho bé.</p>
          )}
        </section>
      </div>

      {/* Sổ liên lạc & Thông báo học tập tới Phụ huynh (GV-07: Hiển thị dạng thẻ thông báo, không phải dạng chat) */}
      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
              <Mail className="text-amber-500" size={20} />
              Sổ Liên Lạc & Thông Báo Tới Phụ Huynh ({parentNotifs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Các phiếu thông báo nhận xét học tập đã gửi về Sổ liên lạc của gia đình bé.
            </p>
          </div>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
          >
            + Gửi thông báo nhận xét mới
          </button>
        </div>

        {parentNotifs.length ? (
          <div className="space-y-4">
            {parentNotifs.map((item: any) => (
              <div key={item._id} className="rounded-2xl border-2 border-amber-200/80 bg-white p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-lg">
                      📢
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.subject || 'Phiếu nhận xét học tập'}</h4>
                      <span className="text-[11px] text-slate-400">
                        Gửi ngày {new Date(item.sentAt || item.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.stars > 0 && (
                      <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-bold flex items-center gap-1 border border-amber-300">
                        ⭐ {item.stars} sao khen thưởng
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
                      ✓ Đã gửi tới phụ huynh
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {item.teacherNote || item.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chưa có thông báo nào được gửi tới Sổ liên lạc của phụ huynh bé {student.name}.
          </p>
        )}
      </section>

      {/* Modal gửi nhận xét tới Phụ huynh */}
      {showSendModal && (
        <Modal title={`Gửi thông báo tới Sổ liên lạc bé ${student.name}`} close={() => setShowSendModal(false)}>
          <form onSubmit={sendToParent} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Tiêu đề thông báo
              <input
                type="text"
                value={parentSubject}
                onChange={e => setParentSubject(e.target.value)}
                placeholder="VD: Nhận xét học tập tuần này, Khen ngợi bé..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-amber-400"
                required
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tặng sao khen thưởng cho bé:
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setParentStars(s)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      parentStars === s
                        ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ⭐ {s} sao
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nội dung nhận xét & dặn dò phụ huynh:
              </label>
              <textarea
                value={parentNoteText}
                onChange={e => setParentNoteText(e.target.value)}
                rows={4}
                placeholder="Nhập lời nhận xét chi tiết gửi về cho phụ huynh bé (khen ngợi phát âm, mức độ tập trung, từ vựng cần ôn luyện thêm)..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-400"
                required
              />

              {/* Quick templates for parent note */}
              <div className="mt-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Mẫu nhận xét nhanh:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bé phát âm rất to, rõ ràng và có nhiều tiến bộ hôm nay! 🌟',
                    'Bé tích cực tương tác, hoàn thành rất tốt các bài tập trên lớp! 👏',
                    'Gia đình cho bé ôn thêm từ vựng bài này 10 phút mỗi ngày nhé! 📖',
                    'Bé nhớ bài nhanh, phản xạ nghe và chọn tranh rất chính xác! 🎯'
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setParentNoteText(prev => prev ? `${prev} ${tpl}` : tpl)}
                      className="text-[11px] font-medium bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!parentNoteText.trim()}
              className="mt-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 py-2.5 font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              Xác nhận gửi thông báo tới Sổ liên lạc
            </button>
          </form>
        </Modal>
      )}
    </>
  );
};

export { TeacherAnalyticsTab as TeacherAnalytics } from './TeacherAnalyticsTab';

