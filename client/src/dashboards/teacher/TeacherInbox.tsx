import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageSquare, Search, Send } from 'lucide-react';
import { parentNotificationApi } from '../../services/api';
const stamp = (d: string) => new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
export const TeacherInbox = () => {
  const [threads, setThreads] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const load = async () => {
    setError('');
    try { const response = await parentNotificationApi.getNotifications(); setThreads(response.data || []); setSelected(current => current || response.data?.[0]?._id || ''); }
    catch (e: any) { setError(e.message || 'Không thể tải hộp thư.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const filtered = threads.filter(t => `${t.childName || t.child?.name} ${t.subject} ${t.className}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  // Searching the list must never change the recipient of a draft reply.
  const thread = threads.find(t => t._id === selected);
  const reply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!thread || !message.trim() || sending) return;
    setSending(true); setError('');
    try {
      const result = await parentNotificationApi.replyAsTeacher(thread._id, message.trim());
      setThreads(items => items.map(item => item._id === thread._id ? { ...item, replies: result.data.replies } : item));
      setMessage('');
    } catch (e: any) { setError(e.message || 'Chưa gửi được lời nhắn. Vui lòng thử lại.'); }
    finally { setSending(false); }
  };
  return <div><header className="staff-page-header"><div><p className="teacher-eyebrow">KẾT NỐI NHÀ TRƯỜNG & GIA ĐÌNH</p><h1>Trao đổi phụ huynh</h1><p>Nhận xét và phản hồi được lưu trong hộp thư của ứng dụng để gia đình cùng đồng hành với bé.</p></div><Link className="teacher-button primary" to="/teacher/students">Viết nhận xét cho học sinh <ArrowUpRight size={17} /></Link></header>
    {error && <div className="teacher-error mb-5" role="alert">{error}<button onClick={() => void load()}>Tải lại</button></div>}
    {loading ? <div className="teacher-loading">Đang tải trao đổi…</div> : !threads.length ? <div className="teacher-panel teacher-empty"><MessageSquare size={38} /><strong>Chưa có trao đổi nào</strong><p>Mở hồ sơ học sinh để gửi nhận xét cụ thể hoặc gửi tổng kết sau buổi dạy.</p><Link to="/teacher/students">Mở hồ sơ học sinh <ArrowUpRight size={16} /></Link></div> : <div className="teacher-inbox-grid"><section className="teacher-panel !p-0"><label className="flex items-center gap-2 border-b p-4"><Search size={18} className="text-slate-400" /><input className="w-full bg-transparent outline-none" aria-label="Tìm trao đổi theo học sinh hoặc tiêu đề" placeholder="Tìm tên học sinh, tiêu đề…" value={search} onChange={e => setSearch(e.target.value)} /></label>{filtered.map(item => <button disabled={sending} className={`teacher-thread ${thread?._id === item._id ? 'active' : ''}`} key={item._id} onClick={() => { setSelected(item._id); setMessage(''); }}><strong>{item.childName || item.child?.name || 'Học sinh'}</strong><p className="text-sm text-slate-600">{item.subject || 'Nhận xét học tập'}</p><small>{item.className} · {stamp(item.createdAt)}</small>{item.replies?.at(-1)?.senderRole === 'PARENT' && <span className="teacher-status inline-block mt-2">Gia đình đã phản hồi</span>}</button>)}{!filtered.length && <p className="p-5 text-slate-600">Không tìm thấy trao đổi phù hợp.</p>}</section>
    {thread && <section className="teacher-panel"><div className="teacher-panel-heading"><div><h2>{thread.subject || 'Nhận xét học tập'}</h2><p className="mt-2 text-sm text-slate-500">{thread.childName || thread.child?.name} · {thread.className}</p></div><Link to={`/teacher/students/${thread.child?._id || thread.child}`}>Hồ sơ <ArrowUpRight size={15} /></Link></div><article className="teacher-message from-teacher"><div className="teacher-message-header"><b>Giáo viên</b><small>{stamp(thread.sentAt || thread.createdAt)}</small></div><p>{thread.content || thread.teacherNote}</p></article>{thread.replies?.map((item: any, index: number) => <article key={item._id || index} className={`teacher-message ${item.senderRole === 'TEACHER' ? 'from-teacher' : ''}`}><div className="teacher-message-header"><b>{item.senderRole === 'TEACHER' ? 'Giáo viên' : 'Phụ huynh'} · {item.senderName}</b><small>{stamp(item.createdAt)}</small></div><p>{item.message}</p></article>)}<form onSubmit={reply} className="mt-6"><label htmlFor="teacher-reply" className="text-sm font-semibold">Phản hồi cho gia đình</label><textarea id="teacher-reply" disabled={sending} required maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3" placeholder="Chia sẻ một quan sát cụ thể và cách gia đình có thể hỗ trợ bé…" value={message} onChange={e => setMessage(e.target.value)} /><div className="mt-3 flex justify-end"><button disabled={sending || !message.trim()} className="teacher-button primary"><Send size={16} />{sending ? 'Đang gửi…' : 'Gửi phản hồi'}</button></div></form></section>}</div>}
  </div>;
};
