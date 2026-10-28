import { useState } from 'react';
import { X } from 'lucide-react';
import { adminApi } from '../../services/api';
export function StaffPasswordDialog({ user, isSelf, onClose, onSaved }: { user: { _id: string; name: string }; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="password-title"><form className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6" onSubmit={async event => {
    event.preventDefault();
    if (password !== confirmPassword) { setError('Hai mật khẩu mới chưa khớp.'); return; }
    setSaving(true); setError('');
    try { await adminApi.resetStaffPassword(user._id, password, currentPassword); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Chưa đổi được mật khẩu.'); }
    finally { setSaving(false); }
  }}>
    <div className="flex items-center justify-between gap-3"><h2 id="password-title" className="text-xl font-bold">Đổi mật khẩu · {user.name}</h2><button type="button" aria-label="Đóng" disabled={saving} onClick={onClose}><X size={22} /></button></div>
    {isSelf && <label className="grid gap-2">Mật khẩu hiện tại<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="border border-slate-300" /></label>}
    <label className="grid gap-2">Mật khẩu mới<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} className="border border-slate-300" /></label>
    <label className="grid gap-2">Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="border border-slate-300" /></label>
    <p className="text-slate-600">Ít nhất 8 ký tự. Các phiên đăng nhập cũ sẽ kết thúc sau khi đổi mật khẩu.</p>
    {error && <p role="alert" className="text-rose-800">{error}</p>}
    <button disabled={saving} className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white">{saving ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</button>
  </form></div>;
}
