import React, { useState } from 'react';
import { X, GraduationCap } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  teachersList: any[];
}

export const CreateClassroomModal: React.FC<CreateClassroomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  teachersList
}) => {
  const [form, setForm] = useState({
    name: '',
    ageGroupCode: '3-4',
    teacherId: '',
    academicYear: '2026-2027',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.teacherId) {
      setError('Vui lòng chọn giáo viên phụ trách lớp.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createClassroom(form);
      if (res.success) {
        setForm({
          name: '',
          ageGroupCode: '3-4',
          teacherId: '',
          academicYear: '2026-2027',
          description: ''
        });
        onSuccess(res.message || 'Tạo lớp học và phân công giáo viên thành công!');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Tạo lớp học thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Tạo Lớp Học & Phân Công</h3>
              <p className="text-xs text-teal-100">Khóa chặt giáo trình theo độ tuổi của lớp</p>
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
              Tên lớp học *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Lớp Mầm 1, Lớp Chồi 2, Lớp Lá 3..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-medium outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Độ tuổi & Sách *
              </label>
              <select
                value={form.ageGroupCode}
                onChange={(e) => setForm({ ...form, ageGroupCode: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-bold outline-none cursor-pointer"
              >
                <option value="3-4">3–4T (Sách 1 - Mầm)</option>
                <option value="4-5">4–5T (Sách 2 - Chồi)</option>
                <option value="5-6">5–6T (Sách 3 - Lá)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Niên khóa
              </label>
              <input
                type="text"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-medium outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Giáo viên phụ trách giảng dạy *
            </label>
            <select
              required
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-bold outline-none cursor-pointer text-slate-800"
            >
              <option value="">-- Chọn giáo viên phụ trách --</option>
              {teachersList.map((t) => (
                <option key={t._id} value={t._id}>
                  Cô {t.name} ({t.username || t.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Ghi chú giới thiệu lớp
            </label>
            <textarea
              rows={2}
              placeholder="VD: Lớp sáng từ thứ 2 đến thứ 6, phòng học A2..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-medium outline-none"
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
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Đang tạo…' : 'Xác nhận tạo lớp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
