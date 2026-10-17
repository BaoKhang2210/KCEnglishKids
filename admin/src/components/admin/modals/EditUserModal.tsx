import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface EditUserModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  classroomsList: any[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  classroomsList
}) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    contact: '',
    dob: '',
    ageGroupCode: '3-4',
    assignedClass: '',
    status: 'ACTIVE'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        contact: user.contact || '',
        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
        ageGroupCode: user.ageGroupCode || '3-4',
        assignedClass: user.assignedClass?._id || user.assignedClass || '',
        status: user.status || 'ACTIVE'
      });
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isChild = user.role === 'CHILD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.updateUser(user._id, form);
      if (res.success) {
        onSuccess(res.message || 'Cập nhật thông tin thành công!');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Cập nhật người dùng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Chỉnh Sửa Hồ Sơ</h3>
              <p className="text-xs text-indigo-100">
                {isChild ? 'Học sinh mầm non' : user.role === 'TEACHER' ? 'Giáo viên phụ trách' : 'Quản trị viên'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Họ và tên *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
            />
          </div>

          {!isChild && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
                />
              </div>
            </div>
          )}

          {isChild && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Ngày sinh (DOB)
                </label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Nhóm tuổi
                </label>
                <select
                  value={form.ageGroupCode}
                  onChange={(e) => setForm({ ...form, ageGroupCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none cursor-pointer"
                >
                  <option value="3-4">3–4 tuổi (Sách 1 - Mầm)</option>
                  <option value="4-5">4–5 tuổi (Sách 2 - Chồi)</option>
                  <option value="5-6">5–6 tuổi (Sách 3 - Lá)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              {isChild ? 'Lớp học hiện tại' : 'Lớp phụ trách'}
            </label>
            <select
              value={form.assignedClass}
              onChange={(e) => setForm({ ...form, assignedClass: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none cursor-pointer"
            >
              <option value="">{isChild ? 'Chưa phân lớp' : 'Chưa phân công'}</option>
              {classroomsList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi - Sách {c.ageGroupCode === '3-4' ? '1' : c.ageGroupCode === '4-5' ? '2' : '3'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Số điện thoại {isChild ? 'phụ huynh' : 'liên hệ'}
            </label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Trạng thái tài khoản
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: 'ACTIVE' })}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  form.status === 'ACTIVE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Hoạt động
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: 'LOCKED' })}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  form.status === 'LOCKED'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Tạm khóa
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
