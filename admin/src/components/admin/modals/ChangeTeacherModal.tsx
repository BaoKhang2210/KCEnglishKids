import React, { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface ChangeTeacherModalProps {
  isOpen: boolean;
  classroom: any;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  teachersList: any[];
}

export const ChangeTeacherModal: React.FC<ChangeTeacherModalProps> = ({
  isOpen,
  classroom,
  onClose,
  onSuccess,
  teachersList
}) => {
  const [teacherId, setTeacherId] = useState(
    classroom && typeof classroom.teacher === 'object'
      ? classroom.teacher?._id || ''
      : classroom?.teacher || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !classroom) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      setError('Vui lòng chọn giáo viên giảng dạy.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.updateClassroom(classroom._id, { teacherId });
      if (res.success) {
        onSuccess(res.message || 'Phân công lại giáo viên thành công!');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Phân công lại giáo viên thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Phân Công Giáo Viên</h3>
              <p className="text-xs text-teal-100">{classroom.name}</p>
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
            <label className="block text-xs font-black text-slate-700 uppercase mb-2">
              Chọn giáo viên phụ trách mới
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-bold outline-none cursor-pointer"
            >
              <option value="">-- Chọn giáo viên --</option>
              {teachersList.map((t) => (
                <option key={t._id} value={t._id}>
                  Cô {t.name} ({t.username || t.email})
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
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu…' : 'Xác nhận phân công'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
