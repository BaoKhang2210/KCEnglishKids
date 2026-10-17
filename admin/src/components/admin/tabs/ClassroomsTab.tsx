import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { adminApi } from '../../../services/api';

interface ClassroomsTabProps {
  classroomsList: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateClass: () => void;
  onOpenChangeTeacher: (classroom: any) => void;
  onOpenAssignStudents: (classroom: any) => void;
  onNotify: (msg: string) => void;
}

export const ClassroomsTab: React.FC<ClassroomsTabProps> = ({
  classroomsList,
  loading,
  onRefresh,
  onOpenCreateClass,
  onOpenChangeTeacher,
  onOpenAssignStudents,
  onNotify
}) => {
  const [ageFilter, setAgeFilter] = useState<'ALL' | '3-4' | '4-5' | '5-6'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const count34 = classroomsList.filter((c) => c.ageGroupCode === '3-4').length;
  const count45 = classroomsList.filter((c) => c.ageGroupCode === '4-5').length;
  const count56 = classroomsList.filter((c) => c.ageGroupCode === '5-6').length;

  const filteredClassrooms = classroomsList.filter((c) => {
    const matchAge = ageFilter === 'ALL' || c.ageGroupCode === ageFilter;
    const matchSearch =
      !searchQuery ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.teacher?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchAge && matchSearch;
  });

  const handleDeleteClass = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn dừng hoạt động lớp ${name}?`)) return;
    try {
      const res = await adminApi.deleteClassroom(id);
      if (res.success) {
        onNotify(res.message);
        onRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Xóa lớp học thất bại');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards for Classrooms */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng số lớp</span>
          </div>
          <div className="text-3xl font-black text-slate-800">
            {classroomsList.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
              B1
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Khối Mầm (3–4T)</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{count34}</div>
          <p className="text-[11px] font-bold text-amber-600 mt-1">Học giáo trình Sách 1</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
              B2
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Khối Chồi (4–5T)</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{count45}</div>
          <p className="text-[11px] font-bold text-emerald-600 mt-1">Học giáo trình Sách 2</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-black">
              B3
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Khối Lá (5–6T)</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{count56}</div>
          <p className="text-[11px] font-bold text-sky-600 mt-1">Học giáo trình Sách 3</p>
        </div>
      </section>

      {/* Toolbar: Search, Age filter, Add Class button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên lớp hoặc tên cô giáo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 font-medium outline-none"
            />
          </div>

          {/* Age Group Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: '3-4', label: '3–4T (Mầm)' },
              { key: '4-5', label: '4–5T (Chồi)' },
              { key: '5-6', label: '5–6T (Lá)' }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setAgeFilter(f.key as any)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-colors cursor-pointer ${
                  ageFilter === f.key
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCreateClass}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo Lớp Học Mới</span>
        </button>
      </div>

      {/* Classrooms List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải danh sách lớp học…
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold">
            Chưa có lớp học nào thỏa mãn điều kiện tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                <tr>
                  <th className="py-3.5 px-4">Tên Lớp Học</th>
                  <th className="py-3.5 px-4">Độ Tuổi & Sách Khóa</th>
                  <th className="py-3.5 px-4">Giáo Viên Phụ Trách</th>
                  <th className="py-3.5 px-4">Sĩ Số Học Sinh</th>
                  <th className="py-3.5 px-4">Niên Khóa</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác Quản Trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredClassrooms.map((c) => {
                  const bookNum = c.ageGroupCode === '3-4' ? 1 : c.ageGroupCode === '4-5' ? 2 : 3;
                  const teacherName = c.teacher?.name;
                  const studentCount = Array.isArray(c.students) ? c.students.length : 0;

                  return (
                    <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        {c.name}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          bookNum === 1
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : bookNum === 2
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}>
                          📕 Sách {bookNum} ({c.ageGroupCode} tuổi)
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {teacherName ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Cô {teacherName}</span>
                            <button
                              type="button"
                              onClick={() => onOpenChangeTeacher(c)}
                              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                            >
                              Đổi GV
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenChangeTeacher(c)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-100 cursor-pointer"
                          >
                            ⚠️ Phân công GV
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                            👥 {studentCount} bé
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenAssignStudents(c)}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                          >
                            Phân bổ bé
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {c.academicYear || '2026-2027'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {c.status === 'ACTIVE' ? 'Đang học' : 'Dừng hoạt động'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(c._id, c.name)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Dừng hoạt động lớp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
