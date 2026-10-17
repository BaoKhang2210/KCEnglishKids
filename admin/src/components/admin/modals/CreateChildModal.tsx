import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface CreateChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  classroomsList: any[];
}

export const CreateChildModal: React.FC<CreateChildModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classroomsList
}) => {
  const [form, setForm] = useState({
    name: '',
    dob: '',
    pin: '1234',
    avatar: 'lion',
    email: '',
    contact: '',
    password: '',
    assignedClass: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateAgePreview = (dobStr: string) => {
    if (!dobStr) return null;
    const birth = new Date(dobStr);
    const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age <= 3) return { age, code: '3-4', book: 'Book 1 (Khối Mầm)' };
    if (age === 4) return { age, code: '4-5', book: 'Book 2 (Khối Chồi)' };
    return { age, code: '5-6', book: 'Book 3 (Khối Lá)' };
  };

  const agePreview = calculateAgePreview(form.dob);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(form.pin)) {
      setError('Mã PIN của trẻ phải đúng 4 chữ số (0-9).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createChild(form);
      if (res.success) {
        setForm({
          name: '',
          dob: '',
          pin: '1234',
          avatar: 'lion',
          email: '',
          contact: '',
          password: '',
          assignedClass: ''
        });
        onSuccess(res.message || 'Tạo tài khoản học sinh thành công!');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Tạo tài khoản học sinh thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xl">
              🦁
            </div>
            <div>
              <h3 className="font-black text-lg">Thêm Hồ Sơ Học Sinh Mầm Non</h3>
              <p className="text-xs text-amber-100">Cấp tài khoản đăng nhập học tập & ghép lớp</p>
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
              Họ và tên của Bé *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Bé Bảo An"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-medium outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Ngày sinh (DOB) *
              </label>
              <input
                type="date"
                required
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-medium outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Mã PIN đăng nhập (4 số) *
              </label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="1234"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono font-bold tracking-widest outline-none text-center"
              />
            </div>
          </div>

          {agePreview && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Tính toán theo ngày sinh: <b>{agePreview.age} tuổi</b> ➔ Tự động xếp nhóm <b>{agePreview.code} tuổi</b> ({agePreview.book})
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Chọn Avatar linh vật đại diện
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { key: 'lion', emoji: '🦁', label: 'Sư tử' },
                { key: 'panda', emoji: '🐼', label: 'Gấu trúc' },
                { key: 'rabbit', emoji: '🐰', label: 'Thỏ con' },
                { key: 'bear', emoji: '🐻', label: 'Gấu nâu' },
                { key: 'fox', emoji: '🦊', label: 'Cáo nhỏ' },
                { key: 'koala', emoji: '🐨', label: 'Koala' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setForm({ ...form, avatar: item.key })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    form.avatar === item.key
                      ? 'border-amber-500 bg-amber-50 shadow-xs ring-2 ring-amber-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-2xl block">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-600 block mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Phân bổ vào lớp học
            </label>
            <select
              value={form.assignedClass}
              onChange={(e) => setForm({ ...form, assignedClass: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-medium outline-none cursor-pointer"
            >
              <option value="">Chưa phân lớp (vào danh sách chờ)</option>
              {classroomsList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi - Sách {c.ageGroupCode === '3-4' ? '1' : c.ageGroupCode === '4-5' ? '2' : '3'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Số điện thoại phụ huynh nhận thông báo
            </label>
            <input
              type="text"
              placeholder="VD: 0988 776 655"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-medium outline-none"
            />
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
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu…' : 'Xác nhận tạo học sinh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
