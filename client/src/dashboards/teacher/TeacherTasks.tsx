import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardCheck, Eye, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';

type Task = { kind: string; label: string; to: string };
const groups = [
  { kind: 'REVIEW', label: 'Bài nộp cần nhận xét', icon: MessageSquare },
  { kind: 'SUPPORT', label: 'Học sinh cần hỗ trợ', icon: ClipboardCheck },
  { kind: 'OBSERVE', label: 'Cần ghi nhận thêm', icon: Eye }
];

export function TeacherTasks() {
  const [tasks, setTasks] = useState<Task[]>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    api.get('/teacher/tasks').then(res => { if (active) setTasks(res.data); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  return <section className="teacher-panel teacher-tasks">
    <div className="teacher-panel-heading"><div><p className="teacher-eyebrow">CÔNG VIỆC CỦA BẠN</p><h2>Việc cần xử lý</h2></div><span className="teacher-status">{tasks?.length ?? '…'} việc</span></div>
    {error ? <div role="alert" className="teacher-error">{error}<button onClick={() => setReload(n => n + 1)}>Thử lại</button></div>
      : !tasks ? <p role="status">Đang kiểm tra bài nộp và hồ sơ…</p>
      : !tasks.length ? <div className="teacher-empty"><ClipboardCheck size={28} /><strong>Bạn đã xử lý xong các việc hiện có</strong></div>
      : <div className="teacher-task-groups">{groups.map(group => {
        const items = tasks.filter(task => task.kind === group.kind);
        return <section key={group.kind} className="teacher-task-group"><h3><group.icon size={18} /><span>{group.label}</span><b>{items.length}</b></h3>
          {items.length ? <ul>{items.slice(0, 4).map(task => <li key={task.to + task.label}><Link to={task.to}><span>{task.label}</span><ArrowUpRight size={16} /></Link></li>)}</ul> : <p>Chưa có việc trong nhóm này.</p>}
          {items.length > 4 && <Link className="teacher-task-more" to={group.kind === 'REVIEW' ? '/teacher/assignments' : '/teacher/analytics'}>Xem thêm {items.length - 4} việc <ArrowUpRight size={15} /></Link>}
        </section>;
      })}</div>}
  </section>;
}
