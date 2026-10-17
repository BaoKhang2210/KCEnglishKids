import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classroomsList: any[];
}

export const CreateTeacherModal: React.FC<CreateTeacherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classroomsList
}) => {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    contact: '',
    assignedClass: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.createTeacher(form);
      if (res.success) {
        setForm({ name: '', username: '', email: '', password: '', contact: '', assignedClass: '' });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Tạo tài khoản giáo viên thất bại');
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
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Cấp Tài Khoản Giáo Viên</h3>
              <p className="text-xs text-indigo-100">Tạo tài khoản giáo viên mầm non phụ trách lớp</p>
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
              Họ và tên Giáo viên *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Cô Nguyễn Mai Phương"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Tên đăng nhập *
              </label>
              <input
                type="text"
                required
                placeholder="VD: co_phuong"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Mật khẩu ban đầu *
              </label>
              <input
                type="password"
                required
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Email công vụ *
            </label>
            <input
              type="email"
              required
              placeholder="VD: maiphuong@kcenglishkids.edu.vn"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().trim() })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Số điện thoại liên hệ
            </label>
            <input
              type="text"
              placeholder="VD: 0912 345 678"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Phân công lớp phụ trách (Tùy chọn)
            </label>
            <select
              value={form.assignedClass}
              onChange={(e) => setForm({ ...form, assignedClass: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none cursor-pointer"
            >
              <option value="">Chưa phân lớp (sẽ phân công sau)</option>
              {classroomsList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi - Sách {c.ageGroupCode === '3-4' ? '1' : c.ageGroupCode === '4-5' ? '2' : '3'})
                </option>
              ))}
            </select>
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
              {submitting ? 'Đang tạo…' : 'Xác nhận tạo giáo viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
