import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardCheck, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

type Task = { kind: string; label: string; to: string };
const groups = [
  {
    kind: 'SUPPORT',
    label: 'Học sinh cần hỗ trợ',
    desc: 'Các bé phát âm hoặc phản xạ chưa vững ở buổi học vừa qua',
    icon: ClipboardCheck,
    theme: 'border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40',
    iconCls: 'bg-amber-100 text-amber-800 border-amber-300',
    badgeCls: 'bg-amber-200/80 text-amber-900 border-amber-300',
    accentText: 'text-amber-900',
    hoverCls: 'hover:border-amber-400 hover:bg-amber-50/50'
  },
  {
    kind: 'OBSERVE',
    label: 'Cần ghi nhận thêm',
    desc: 'Hồ sơ năng lực và mức độ tự tin của bé cần cô đánh giá',
    icon: Eye,
    theme: 'border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40',
    iconCls: 'bg-teal-100 text-teal-800 border-teal-300',
    badgeCls: 'bg-teal-200/80 text-teal-900 border-teal-300',
    accentText: 'text-teal-900',
    hoverCls: 'hover:border-teal-400 hover:bg-teal-50/50'
  }
];

export function TeacherTasks() {
  const [tasks, setTasks] = useState<Task[]>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    api.get('/teacher/tasks')
      .then(res => { if (active) setTasks(res.data); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);

  return (
    <section className="teacher-panel rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-full mb-1">
            <Sparkles size={13} className="text-teal-700" />
            CÔNG VIỆC CỦA BẠN
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            Nhiệm vụ cần lưu ý & xử lý
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black border border-slate-200">
            {tasks?.length ?? '…'} việc cần chú ý
          </span>
        </div>
      </div>

      {error ? (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setReload(n => n + 1)} className="px-3 py-1 rounded-xl bg-white border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors">
            Thử lại
          </button>
        </div>
      ) : !tasks ? (
        <div role="status" className="py-8 text-center text-slate-500 font-bold text-sm">
          Đang kiểm tra hồ sơ học sinh và các lưu ý giảng dạy…
        </div>
      ) : !tasks.length ? (
        <div className="py-8 px-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={26} />
          </div>
          <strong className="block text-base font-black text-emerald-950">
            Cô giáo đã hoàn thành tốt các việc hiện có!
          </strong>
          <p className="text-xs sm:text-sm text-emerald-800 font-medium">
            Tất cả các bé trong các lớp đều đang theo kịp tiến độ và được quan sát chu đáo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {groups.map(group => {
            const items = tasks.filter(task => task.kind === group.kind);
            return (
              <section
                key={group.kind}
                className={`p-4 sm:p-5 rounded-2xl border ${group.theme} flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${group.iconCls} shrink-0`}>
                        <group.icon size={18} />
                      </div>
                      <div>
                        <h3 className={`text-base font-black ${group.accentText}`}>
                          {group.label}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium leading-tight">
                          {group.desc}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-black shrink-0 ${group.badgeCls}`}>
                      {items.length} việc
                    </span>
                  </div>

                  {items.length ? (
                    <ul className="space-y-2">
                      {items.slice(0, 4).map(task => (
                        <li key={task.to + task.label}>
                          <Link
                            to={task.to}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs sm:text-[13px] font-bold text-slate-800 transition-all ${group.hoverCls}`}
                          >
                            <span className="truncate">{task.label}</span>
                            <ArrowUpRight size={15} className="text-slate-400 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-4 text-center text-xs font-medium text-slate-500 bg-white/60 rounded-xl border border-dashed border-slate-200">
                      Chưa có học sinh nào cần chú ý thêm ở mục này.
                    </div>
                  )}
                </div>

                {items.length > 4 && (
                  <Link
                    to="/teacher/analytics"
                    className="inline-flex items-center gap-1.5 mt-3 pt-2 text-xs font-black text-teal-800 hover:text-teal-900 border-t border-slate-200/50"
                  >
                    <span>Xem thêm {items.length - 4} học sinh khác</span>
                    <ArrowUpRight size={14} />
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
