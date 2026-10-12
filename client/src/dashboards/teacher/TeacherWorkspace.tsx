import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Play, PlayCircle, Plus, Search, Star, Users, X, Mail, Calendar, ChevronRight, Clock, Sparkles, Trash2, Award } from 'lucide-react';
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
    ['Lớp học', '/teacher/classes', Users],
    ['Buổi dạy trên lớp', '/teacher/classroom-sessions', PlayCircle],
    ['Mẫu câu', '/teacher/sentences', MessageSquare],
    ['Nội dung học', '/teacher/content', BookOpen],
    ['Bài được giao', '/teacher/assignments', ClipboardList],
    ['Học sinh', '/teacher/students', GraduationCap]
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
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 font-bold text-white shadow-sm">KC</div>
            <div>
              <b className="text-slate-900">KCEnglishKids</b>
              <p className="text-xs font-semibold text-teal-700">Không gian giảng dạy</p>
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
          <span className="font-bold text-sm text-slate-900">KCEnglishKids Sư phạm</span>
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
                    <b className="text-sm">KCEnglishKids</b>
                    <p className="text-xs text-teal-700">Không gian giảng dạy</p>
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
        <header className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Chào mừng trở lại</p>
            <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
            {initials(user?.name)}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};

export const TeacherDashboard = () => { const [data, setData] = useState<any>(); const [error, setError] = useState(''); useEffect(() => { teacherApi.getDashboard().then(x => setData(x.data)).catch(e => setError(e.message)); }, []); if (error) return <Empty>Không thể tải thông tin. Vui lòng thử lại.</Empty>; if (!data) return <Loader/>; const m=data.metrics; return <><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-teal-700">Tổng quan giảng dạy</p><h2 className="text-3xl font-bold">Lớp học của bạn trong tầm mắt</h2></div><Link to="/teacher/assignments" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Giao bài tập</Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Lớp đang phụ trách" value={m.classes} icon={<Users size={18}/>}/><Metric label="Tổng số học sinh" value={m.students} icon={<GraduationCap size={18}/>}/><Metric label="Bài đang hiệu lực" value={m.activeAssignments} icon={<ClipboardList size={18}/>}/><Metric label="Cần quan tâm" value={m.needingAttention} icon={<CheckCircle2 size={18}/>}/></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="mb-4 font-bold">Tổng kết học tập</h3><div className="grid grid-cols-3 gap-3 text-center"><div><b className="block text-2xl">{m.averageScore}%</b><span className="text-xs text-slate-500">Điểm trung bình</span></div><div><b className="block text-2xl">{m.stars}</b><span className="text-xs text-slate-500">Sao đã đạt</span></div><div><b className="block text-2xl">{m.completedAssignments}</b><span className="text-xs text-slate-500">Đã hoàn thành</span></div></div></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="mb-4 font-bold">Bài giao gần đây</h3>{data.recentAssignments.length ? data.recentAssignments.map((a:any)=><Link key={a._id} to={`/teacher/assignments/${a._id}`} className="mb-3 flex justify-between rounded-lg bg-slate-50 p-3 hover:bg-teal-50"><span><b>{a.activity?.title || a.lesson?.title}</b><small className="ml-2 text-slate-500">{a.classRoom?.name}</small></span><span className="text-xs font-semibold text-teal-700">{a.status}</span></Link>) : <p className="text-sm text-slate-500">Chưa có bài giao nào.</p>}</section></div><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h3 className="mb-4 font-bold">Buổi học gần đây</h3>{data.recentSessions.length ? data.recentSessions.map((s:any)=><div key={s._id} className="flex justify-between border-t py-3 text-sm"><span><b>{s.child?.name}</b> · {s.lesson?.title}</span><span className="text-slate-500">{date(s.lastActivityAt)}</span></div>) : <p className="text-sm text-slate-500">Chưa có buổi học nào.</p>}</section></> };

export const TeacherClasses = () => { const [classes,setClasses]=useState<any[]>(); const [search,setSearch]=useState(''); const load=()=>teacherApi.getClasses().then(x=>setClasses(x.data)); useEffect(() => { void load(); },[]); const filtered=useMemo(()=>classes?.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())),[classes,search]); if(!classes)return <Loader/>; return <><Header title="Lớp học của tôi" text="Các lớp học bạn đang phụ trách."/><SearchBox value={search} onChange={setSearch}/>{filtered?.length?<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(c=><Link key={c._id} to={`/teacher/classes/${c._id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300"><div className="flex justify-between"><h3 className="font-bold">{c.name}</h3><span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700">{c.status}</span></div><p className="mt-2 text-sm text-slate-500">Độ tuổi {c.ageGroupCode || '—'} · {c.academicYear || '—'}</p><div className="mt-5 flex items-center gap-2 text-sm"><Users size={16} className="text-teal-600"/>{c.students?.length || 0} học sinh</div></Link>)}</div>:<Empty>Bạn chưa được phân công lớp nào.</Empty>}</> };
const Header=({title,text,action}:any)=><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-teal-700">Không gian giảng dạy</p><h2 className="text-3xl font-bold">{title}</h2><p className="mt-1 text-slate-500">{text}</p></div>{action}</div>;
const SearchBox=({value,onChange}:any)=><label className="flex max-w-md items-center gap-2 rounded-xl border bg-white px-3 py-2"><Search size={17} className="text-slate-400"/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Tìm theo tên hoặc mã học sinh" className="w-full outline-none"/></label>;

export const TeacherClassDetail=()=>{
  const {classId=''}=useParams();
  const [data,setData]=useState<any>();
  const [error,setError]=useState('');
  const [eligible,setEligible]=useState<any[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [show,setShow]=useState(false);
  // §1.1.7 — search + column sort state
  const [search,setSearch]=useState('');
  const [sortKey,setSortKey]=useState<'name'|'age'|'stars'|'progress'>('name');
  // §1.1.6 — real error state instead of an endless loader
  const load=()=>teacherApi.getClassDetail(classId).then(x=>{setData(x.data);setError('')}).catch(e=>setError(e?.message||'Không thể tải lớp học này.'));
  useEffect(() => { void load(); },[classId]);
  const openAdd=async()=>{setEligible(sortByNameVi((await teacherApi.getEligibleStudents(classId)).data||[]));setShow(true)};
  const add=async()=>{await teacherApi.addStudents(classId,selected);setShow(false);setSelected([]);void load()};
  if(error)return <Empty>Không thể tải lớp học này. <button onClick={()=>{setError('');void load()}} className="font-semibold text-teal-700">Thử lại</button></Empty>;
  if(!data)return <Loader/>;
  const remove=async(s:any)=>{if(confirm(`Cho ${s.name} ra khỏi lớp? (Không xóa tài khoản và lịch sử học của bé.)`)){await teacherApi.removeStudent(classId,s._id);void load()}};
  // §1.1.1 + §1.1.7 — Vietnamese A-Z first, then the chosen column sort
  const students=sortByNameVi(data.students||[]);
  const filteredStudents=search?students.filter((s:any)=>String(s.name||'').toLowerCase().includes(search.toLowerCase())):students;
  const sortedStudents=sortKey==='name'?filteredStudents:[...filteredStudents].sort((a:any,b:any)=>sortKey==='stars'?((b.stats?.totalStars??b.stats?.stars??0)-(a.stats?.totalStars??a.stats?.stars??0)):sortKey==='progress'?((b.stats?.completedLessons??0)-(a.stats?.completedLessons??0)):String(a.ageGroupCode||'').localeCompare(String(b.ageGroupCode||'')));
  const th=(key:typeof sortKey,label:string)=><button type="button" onClick={()=>setSortKey(key)} className={`text-left text-xs font-semibold uppercase tracking-wide ${sortKey===key?'text-teal-700':'text-slate-400 hover:text-slate-600'}`}>{label}{sortKey===key?' ↓':''}</button>;
  return <><Header title={data.name} text={`Độ tuổi ${data.ageGroupCode||'—'} · ${data.students.length} học sinh`} action={<div className="flex gap-2"><Link to={`/teacher/classes/${classId}/sessions/new`} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Play size={16}/>Bắt đầu buổi dạy</Link><button onClick={openAdd} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-1 inline" size={16}/>Thêm học sinh</button></div>}/><div className="grid gap-6 lg:grid-cols-3"><section className="lg:col-span-2 rounded-2xl border bg-white p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Học sinh ({sortedStudents.length})</h3><div className="w-full max-w-xs"><SearchBox value={search} onChange={setSearch}/></div></div><div className="sm:grid sm:grid-cols-[minmax(0,1fr)_70px_130px_80px_90px_70px] sm:items-center sm:gap-3 sm:border-b sm:pb-2">{th('name','Họ tên')}<span className="hidden sm:block">{th('age','Tuổi')}</span><span className="hidden sm:block text-xs font-semibold uppercase tracking-wide text-slate-400">Liên hệ PH</span><span className="hidden sm:block">{th('stars','Sao')}</span><span className="hidden sm:block">{th('progress','Bài học')}</span><span className="hidden sm:block"/></div>{sortedStudents.length?sortedStudents.map((s:any)=><div key={s._id} className="flex items-center justify-between gap-3 border-t py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_70px_130px_80px_90px_70px] sm:items-center"><Link to={`/teacher/students/${s._id}`} className="flex min-w-0 items-center gap-3"><Avatar name={s.name}/><span className="min-w-0"><b className="block truncate">{s.name}</b><small className="block truncate text-slate-500">{s.stats?.averageScore ? `${Math.round(s.stats.averageScore)}% trung bình` : 'Chưa có hoạt động'}</small></span></Link><span className="hidden sm:block text-sm text-slate-600">Tuổi {s.ageGroupCode||'—'}</span><span className="hidden sm:block truncate text-sm text-slate-600" title={s.contact||s.parentContact||''}>{s.contact||s.parentContact||'—'}</span><span className="hidden sm:block text-sm"><Star className="inline fill-amber-400 text-amber-400" size={14}/> {s.stats?.totalStars??s.stats?.stars??0}</span><span className="hidden sm:block text-sm text-slate-600">{s.stats?.completedLessons??0} bài học</span><button onClick={()=>remove(s)} className="text-sm text-rose-600">Xóa khỏi lớp</button></div>):<Empty>{data.students.length?'Không có học sinh nào khớp tìm kiếm.':"Lớp này chưa có học sinh nào."}</Empty>}</section><section className="rounded-2xl border bg-white p-6"><h3 className="mb-4 font-bold">Bài được giao</h3>{data.assignments.length?data.assignments.slice(0,5).map((a:any)=><Link className="mb-2 block rounded-lg bg-slate-50 p-3 text-sm" to={`/teacher/assignments/${a._id}`} key={a._id}>{a.activity?.title||a.lesson?.title}<small className="block text-slate-500">{a.status}</small></Link>):<p className="text-sm text-slate-500">Chưa có bài giao nào.</p>}</section></div>{show&&<Modal title="Thêm học sinh" close={()=>setShow(false)}><div className="max-h-80 overflow-auto">{eligible.length?eligible.map(s=><label key={s._id} className="flex items-center gap-3 border-b p-3"><input type="checkbox" checked={selected.includes(s._id)} onChange={e=>setSelected(e.target.checked?[...selected,s._id]:selected.filter(x=>x!==s._id))}/><Avatar name={s.name}/><span>{s.name}<small className="block text-slate-500">Độ tuổi {s.ageGroupCode}</small></span></label>):<Empty>Không tìm thấy học sinh đủ điều kiện.</Empty>}</div><button disabled={!selected.length} onClick={add} className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-white disabled:opacity-50">Thêm ({selected.length}) bé đã chọn</button></Modal>}</>};
const Avatar=({name}:any)=><div className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{initials(name)}</div>;
const Modal=({title,close,children}:any)=><div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="mb-4 flex justify-between"><h3 className="font-bold">{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>;

export const TeacherContent=()=>{const [data,setData]=useState<any>();const [age,setAge]=useState(''); const [lesson,setLesson]=useState<any>();const load=(a='')=>teacherApi.getContent(a?`ageGroupCode=${a}`:'').then(x=>setData(x.data));useEffect(()=>{void load()},[]);if(!data)return <Loader/>;return <><Header title="Nội dung học tập" text="Xem trước nội dung chương trình trước khi giao bài."/><div className="mb-5 flex gap-2">{['','3-4','4-5','5-6'].map(a=><button key={a||'all'} onClick={()=>{setAge(a);void load(a)}} className={`rounded-full px-3 py-1.5 text-sm ${age===a?'bg-teal-600 text-white':'bg-white border'}`}>{a?`Độ tuổi ${a}`:'Tất cả sách'}</button>)}</div><div className="grid gap-6 lg:grid-cols-3"><section className="lg:col-span-2 space-y-3">{data.units.map((u:any)=><div key={u._id} className="rounded-2xl border bg-white p-5"><p className="text-xs font-semibold text-teal-700">Sách {u.bookNumber} · Độ tuổi {u.ageGroupCode} · Unit {u.unitNumber}</p><h3 className="mt-1 font-bold">{u.bigQuestion}</h3><p className="mt-2 text-sm text-slate-500">{u.vocabularyReferences?.join(' · ')}</p><div className="mt-4 flex flex-wrap gap-2">{data.lessons.filter((l:any)=>l.curriculumUnits?.some((x:any)=>String(x)===String(u._id))).map((l:any)=><button key={l._id} onClick={()=>setLesson(l)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-teal-50">{l.title}</button>)}</div></div>)}</section><section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Chương trình học</h3><p className="mt-2 text-sm text-slate-500">27 Unit chính thức trong Sách 1–3. Giáo viên chỉ xem.</p><p className="mt-4 text-sm"><b>{data.lessons.length}</b> bài học đã duyệt<br/><b>{data.activities.length}</b> hoạt động đã duyệt</p></section></div>{lesson&&<Modal title={lesson.title} close={()=>setLesson(null)}><p className="text-sm text-slate-500">{lesson.description||'Xem trước bài học'}</p><p className="mt-3 text-sm"><b>Mục tiêu:</b> {lesson.learningObjectives?.join(' · ')||'—'}</p><p className="mt-3 text-sm"><b>Từ vựng:</b> {lesson.vocabularyItems?.map((v:any)=>v.english).join(', ')||'—'}</p><Link className="mt-4 inline-block rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white" to={`/teacher/assignments?lesson=${lesson._id}`}>Giao bài học này</Link></Modal>}</>};

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
        assignedToType: form.assignedToType,
        studentId: form.assignedToType === 'STUDENT' ? form.studentId : undefined,
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
                      {a.assignedToType === 'STUDENT' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full text-xs">
                          <Avatar name={a.student?.name} />
                          {a.student?.name || '1 bé'}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                          Cả lớp ({a.classRoom?.students?.length || 0} bé)
                        </span>
                      )}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đối tượng nhận bài</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, assignedToType: 'CLASS', studentId: '' })}
                    className={`p-2.5 rounded-xl border text-sm font-bold transition-all ${
                      form.assignedToType === 'CLASS'
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    👥 Cả lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, assignedToType: 'STUDENT' })}
                    className={`p-2.5 rounded-xl border text-sm font-bold transition-all ${
                      form.assignedToType === 'STUDENT'
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    👤 Một học sinh cụ thể
                  </button>
                </div>
              </div>
            )}

            {form.assignedToType === 'STUDENT' && form.classRoomId && (
              <Select
                label="Chọn bé nhận bài"
                value={form.studentId}
                onChange={(v: string) => setForm({ ...form, studentId: v })}
                options={classStudents.map(s => ({ value: s._id, label: s.name }))}
              />
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
    'Bé làm bài rất tốt và phát âm to rõ ràng! 🌟',
    'Hoàn thành bài tập xuất sắc, rất đáng khen ngợi! 👏',
    'Bé cần chú ý ôn tập thêm các từ vựng này ở nhà nhé! 📚',
    'Con phản xạ rất nhanh, tiếp tục phát huy nhé! 🚀'
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickReviewChips.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewNote(chip)}
                        className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
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

export const TeacherStudents=()=>{const [items,setItems]=useState<any[]>();const [search,setSearch]=useState('');useEffect(()=>{teacherApi.getStudents().then(x=>setItems(x.data))},[]);if(!items)return <Loader/>;const filtered=items.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.username?.toLowerCase().includes(search.toLowerCase()));return <><Header title="Học sinh" text="Học sinh trong các lớp bạn phụ trách."/><SearchBox value={search} onChange={setSearch}/><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(s=><Link key={s._id} to={`/teacher/students/${s._id}`} className="rounded-2xl border bg-white p-5"><div className="flex gap-3"><Avatar name={s.name}/><div><b>{s.name}</b><p className="text-sm text-slate-500">{s.assignedClass?.name||'Chưa có lớp'} · Độ tuổi {s.ageGroupCode}</p></div></div><div className="mt-4 flex justify-between text-sm"><span>{Math.round(s.stats?.averageScore||0)}% trung bình</span><span>{s.stats?.stars||0} sao</span></div></Link>)}</div>{!filtered.length&&<Empty>Không tìm thấy học sinh nào.</Empty>}</>};

export const TeacherStudentDetail = () => {
  const { studentId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [note, setNote] = useState('');
  const [parentNotifs, setParentNotifs] = useState<any[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [parentSubject, setParentSubject] = useState('Nhận xét học tập');
  const [parentNoteText, setParentNoteText] = useState('');
  const [parentStars, setParentStars] = useState(5);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);

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
      await teacherApi.createTeacherNote({ studentId, noteType: 'GENERAL', content: note });
      setNote('');
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

  const handleTeacherReply = async (notifId: string) => {
    const text = (replyTextMap[notifId] || '').trim();
    if (!text) return;
    setSendingReplyId(notifId);
    try {
      await parentNotificationApi.replyAsTeacher(notifId, text);
      setReplyTextMap(prev => ({ ...prev, [notifId]: '' }));
      void load();
    } finally {
      setSendingReplyId(null);
    }
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

      <div className="grid gap-4 sm:grid-cols-4">
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

        <section className="rounded-2xl border bg-white p-6">
          <h3 className="mb-3 font-bold">Ghi chú nội bộ giáo viên</h3>
          <form onSubmit={add} className="mb-4">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Thêm ghi chú riêng về bé (chỉ giáo viên thấy)…"
              className="w-full rounded-lg border p-2 text-sm"
            />
            <button className="mt-2 rounded-lg bg-teal-600 px-3 py-2 text-sm text-white">
              Lưu ghi chú nội bộ
            </button>
          </form>
          {data.notes.length ? (
            data.notes.map((n: any) => (
              <div key={n._id} className="border-t py-3 text-sm">
                <b>{n.noteType}</b>
                <p>{n.content}</p>
                <small className="text-slate-500">{date(n.createdAt)}</small>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Chưa có ghi chú riêng nào.</p>
          )}
        </section>
      </div>

      {/* Sổ liên lạc & Trao đổi với Phụ huynh */}
      <section className="mt-6 rounded-2xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
              <Mail className="text-amber-500" size={20} />
              Sổ Liên Lạc & Trao Đổi Với Phụ Huynh ({parentNotifs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Nhận xét đã gửi về cho gia đình và tin nhắn phản hồi 2 chiều của phụ huynh.
            </p>
          </div>
          <button
            onClick={() => setShowSendModal(true)}
            className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
          >
            + Gửi nhận xét mới
          </button>
        </div>

        {parentNotifs.length ? (
          <div className="space-y-4">
            {parentNotifs.map((item: any) => (
              <div key={item._id} className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <span className="font-bold text-sm text-slate-800">{item.subject}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                      ⭐ {item.stars || 0} sao
                    </span>
                    <span className="text-slate-400">{date(item.sentAt || item.createdAt)}</span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{item.teacherNote || item.content}</p>

                {/* Replies Thread */}
                {item.replies && item.replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-amber-100 pt-2">
                    <p className="text-xs font-bold text-slate-500">Trao đổi 2 chiều:</p>
                    {item.replies.map((r: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        className={`rounded-lg p-2 text-xs ${
                          r.senderRole === 'PARENT'
                            ? 'bg-white border border-amber-200 text-amber-950 ml-3'
                            : 'bg-teal-50 border border-teal-200 text-teal-950 mr-3'
                        }`}
                      >
                        <b>{r.senderRole === 'PARENT' ? '👨‍👩‍👧 ' : '👩‍🏫 '}{r.senderName}: </b>
                        <span>{r.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyTextMap[item._id] || ''}
                    onChange={e => setReplyTextMap(prev => ({ ...prev, [item._id]: e.target.value }))}
                    placeholder="Nhắn tin phản hồi lại phụ huynh…"
                    className="flex-1 rounded-lg border bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleTeacherReply(item._id)}
                    disabled={sendingReplyId === item._id || !(replyTextMap[item._id] || '').trim()}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-40"
                  >
                    Gửi phản hồi
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4 text-center">
            Chưa gửi nhận xét nào về cho phụ huynh bé {student.name}.
          </p>
        )}
      </section>

      {/* Modal gửi nhận xét tới Phụ huynh */}
      {showSendModal && (
        <Modal title={`Gửi nhận xét tới Phụ huynh bé ${student.name}`} close={() => setShowSendModal(false)}>
          <form onSubmit={sendToParent} className="space-y-3">
            <label className="block text-sm font-medium">
              Chủ đề nhận xét
              <input
                type="text"
                value={parentSubject}
                onChange={e => setParentSubject(e.target.value)}
                placeholder="VD: Tiến bộ học tập, Khen ngợi bé..."
                className="mt-1 w-full rounded-lg border p-2 text-sm"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Tặng sao khen thưởng cho bé
              <div className="mt-1 flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setParentStars(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      parentStars === s ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    ⭐ {s} sao
                  </button>
                ))}
              </div>
            </label>

            <label className="block text-sm font-medium">
              Nội dung nhận xét & dặn dò phụ huynh
              <textarea
                value={parentNoteText}
                onChange={e => setParentNoteText(e.target.value)}
                rows={4}
                placeholder="Nhập lời nhận xét chi tiết gửi về cho phụ huynh bé (khen ngợi phát âm, mức độ tập trung, từ vựng cần ôn luyện thêm)..."
                className="mt-1 w-full rounded-lg border p-2 text-sm"
                required
              />
            </label>

            <button className="mt-3 w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 font-bold text-white">
              Gửi nhận xét tới Phụ huynh
            </button>
          </form>
        </Modal>
      )}
    </>
  );
};
