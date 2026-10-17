import React, { useState } from 'react';
import { X, Users, Search, CheckSquare, Square } from 'lucide-react';
import { adminApi } from '../../../services/api';

interface AssignStudentsModalProps {
  isOpen: boolean;
  classroom: any;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
  allChildren: any[];
}

export const AssignStudentsModal: React.FC<AssignStudentsModalProps> = ({
  isOpen,
  classroom,
  onClose,
  onSuccess,
  allChildren
}) => {
  const currentIds = Array.isArray(classroom?.students)
    ? classroom.students.map((s: any) => typeof s === 'object' ? s._id : s)
    : [];

  const [selectedIds, setSelectedIds] = useState<string[]>(currentIds);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !classroom) return null;

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = (ids: string[]) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllFiltered = (ids: string[]) => {
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const filteredChildren = allChildren.filter((ch) =>
    ch.name?.toLowerCase().includes(search.toLowerCase()) ||
    ch.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminApi.assignStudentsToClassroom(classroom._id, selectedIds);
      if (res.success) {
        onSuccess(`Đã cập nhật sĩ số lớp ${classroom.name}: ${selectedIds.length} học sinh!`);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Phân bổ học sinh thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Phân Bổ Học Sinh Vào Lớp</h3>
              <p className="text-xs text-teal-100">
                {classroom.name} (Đã chọn: <b>{selectedIds.length}</b> bé)
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

        <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold shrink-0">
              {error}
            </div>
          )}

          {/* Search & Bulk Selection Actions */}
          <div className="shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-medium outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">
                Hiển thị {filteredChildren.length} học sinh
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAllFiltered(filteredChildren.map((c) => c._id))}
                  className="text-teal-700 hover:underline font-bold cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => deselectAllFiltered(filteredChildren.map((c) => c._id))}
                  className="text-slate-500 hover:underline font-bold cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>
          </div>

          {/* Student list scrollable */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl p-2 divide-y divide-slate-100 min-h-[240px]">
            {filteredChildren.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">
                Không tìm thấy học sinh nào.
              </div>
            ) : (
              filteredChildren.map((child) => {
                const isSelected = selectedIds.includes(child._id);
                const isAssignedOther = child.assignedClass && String(child.assignedClass?._id || child.assignedClass) !== String(classroom._id);

                return (
                  <div
                    key={child._id}
                    onClick={() => toggleStudent(child._id)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-teal-600">
                        {isSelected ? <CheckSquare className="w-4 h-4 fill-teal-600 text-white" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </div>
                      <span className="text-xl">
                        {child.avatar === 'lion' ? '🦁' : child.avatar === 'panda' ? '🐼' : child.avatar === 'rabbit' ? '🐰' : '🦁'}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{child.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {child.ageGroupCode ? `Nhóm ${child.ageGroupCode} tuổi` : 'Chưa xếp nhóm'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {isSelected ? (
                        <span className="text-[10px] bg-teal-100 text-teal-800 font-black px-2 py-0.5 rounded-md">
                          Trong lớp
                        </span>
                      ) : isAssignedOther ? (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">
                          Lớp khác: {child.assignedClass?.name || 'Đã có lớp'}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-md">
                          Chưa có lớp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
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
              {submitting ? 'Đang lưu…' : `Lưu danh sách (${selectedIds.length} bé)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
