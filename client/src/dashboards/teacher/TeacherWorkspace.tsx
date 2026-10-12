import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Play, PlayCircle, Plus, Search, Star, Users, X, Mail } from 'lucide-react';
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

export const TeacherAssignments=()=>{const [items,setItems]=useState<any[]>();const [classes,setClasses]=useState<any[]>([]);const [content,setContent]=useState<any>();const [form,setForm]=useState({classRoomId:'',lessonId:'',activityId:'',assignedToType:'CLASS',studentId:'',dueDate:'',instructions:''});const [create,setCreate]=useState(false);const load=()=>teacherApi.getAssignments().then(x=>setItems(x.data));useEffect(()=>{load();teacherApi.getClasses().then(x=>setClasses(x.data));teacherApi.getContent().then(x=>setContent(x.data));},[]);if(!items||!content)return <Loader/>;const submit=async(e:any)=>{e.preventDefault();await teacherApi.createAssignment(form);setCreate(false);load()};return <><Header title="Bài được giao" text="Nội dung bạn đã giao cho các lớp." action={<button onClick={()=>setCreate(true)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="mr-1 inline" size={16}/>Giao nội dung</button>}/>{items.length?<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Nội dung</th><th>Lớp</th><th>Học sinh</th><th>Trạng thái</th><th>Ngày giao</th></tr></thead><tbody>{items.map(a=><tr key={a._id} className="border-t hover:bg-slate-50"><td className="p-4"><Link className="font-semibold text-teal-700" to={`/teacher/assignments/${a._id}`}>{a.activity?.title||a.lesson?.title}</Link><small className="block text-slate-500">{a.activity?.activityType||'Bài học'}</small></td><td>{a.classRoom?.name}</td><td>{a.assignedToType==='STUDENT'?1:a.classRoom?.students?.length||0}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{a.status}</span></td><td>{date(a.createdAt)}</td></tr>)}</tbody></table></div>:<Empty>Chưa có bài giao nào.</Empty>}{create&&<Modal title="Giao nội dung học tập" close={()=>setCreate(false)}><form onSubmit={submit} className="space-y-3"><Select label="Lớp" value={form.classRoomId} onChange={(v:string)=>setForm({...form,classRoomId:v})} options={classes.map(c=>({value:c._id,label:c.name}))}/><Select label="Bài học" value={form.lessonId} onChange={(v:string)=>setForm({...form,lessonId:v,activityId:''})} options={content.lessons.map((l:any)=>({value:l._id,label:l.title}))}/>{form.lessonId&&<Select label="Hoạt động (tùy chọn)" value={form.activityId} onChange={(v:string)=>setForm({...form,activityId:v})} options={[{value:'',label:'Cả bài học'},...content.activities.filter((a:any)=>String(a.lesson)===form.lessonId).map((a:any)=>({value:a._id,label:a.title}))]}/>}<label className="block text-sm font-medium">Hạn hoàn thành<input type="date" className="mt-1 w-full rounded-lg border p-2" onChange={e=>setForm({...form,dueDate:e.target.value})}/></label><label className="block text-sm font-medium">Hướng dẫn<textarea className="mt-1 w-full rounded-lg border p-2" onChange={e=>setForm({...form,instructions:e.target.value})}/></label><button className="rounded-xl bg-teal-600 px-4 py-2 text-white">Xác nhận giao bài</button></form></Modal>}</>};
const Select=({label,value,onChange,options}:any)=><label className="block text-sm font-medium">{label}<select required className="mt-1 w-full rounded-lg border bg-white p-2" value={value} onChange={e=>onChange(e.target.value)}><option value="">Chọn…</option>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;

export const TeacherAssignmentDetail=()=>{const {assignmentId=''}=useParams();const [data,setData]=useState<any>();const load=()=>teacherApi.getAssignment(assignmentId).then(x=>setData(x.data));useEffect(()=>{void load()},[assignmentId]);if(!data)return <Loader/>;const a=data.assignment;const avg=data.results.length?Math.round(data.results.reduce((n:number,x:any)=>n+x.score,0)/data.results.length):0;return <><Header title={a.activity?.title||a.lesson?.title} text={`${a.classRoom?.name} · ${a.status}`} action={a.status!=='CANCELLED'?<button onClick={async()=>{if(confirm('Hủy bài giao này? Kết quả học đã có sẽ được giữ nguyên.')){await teacherApi.cancelAssignment(a._id);void load()}}} className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-600">Hủy bài giao</button>:null}/><div className="grid gap-4 sm:grid-cols-3"><Metric label="Tiến độ" value={`${data.results.length}/${a.assignedToType==='STUDENT'?1:a.classRoom?.students?.length||0}`}/><Metric label="Điểm trung bình" value={`${avg}%`}/><Metric label="Kết quả" value={data.results.length}/></div><section className="mt-6 rounded-2xl border bg-white p-6"><h3 className="mb-3 font-bold">Kết quả của bé</h3>{data.results.length?data.results.map((r:any)=><div key={r._id} className="flex justify-between border-t py-3"><span><b>{r.child?.name}</b><small className="ml-2 text-slate-500">{r.completed?'Hoàn thành':'Đang học'}</small></span><span>{r.score}% · <Star className="inline fill-amber-400 text-amber-400" size={15}/>{r.stars}</span></div>):<Empty>Chưa có kết quả nào của bé.</Empty>}</section></>};

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
