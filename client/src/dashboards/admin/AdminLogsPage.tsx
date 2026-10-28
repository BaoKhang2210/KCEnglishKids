import { fetchAllPages } from '../../services/adminPagination';
import React, { useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Download,
  Calendar,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Clock,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from '../../services/api';

export const AdminLogsPage: React.FC = () => {
  const requestVersion = useRef(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [page, limit, actionFilter, targetTypeFilter, startDate, endDate, search]);

  const loadLogs = async (customSearch?: string, customPage = page) => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAuditLogs({
        page: customPage,
        limit,
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        search: customSearch !== undefined ? customSearch : (search.trim() || undefined),
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (version === requestVersion.current && res.success) {
        setLogs(res.data);
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (e: any) {
      if (version === requestVersion.current) setError(e.message || 'Không tải được nhật ký. Vui lòng thử lại.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(search.trim(), 1);
  };

  const handleApplyPreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const past7 = new Date(now);
      past7.setUTCDate(now.getUTCDate() - 6);
      setStartDate(past7.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'MONTH') {
      const past30 = new Date(now);
      past30.setUTCDate(now.getUTCDate() - 29);
      setStartDate(past30.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('');
    setTargetTypeFilter('');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setPage(1);

  };

  const hasActiveFilters = Boolean(
    search.trim() || actionFilter || targetTypeFilter || startDate || endDate
  );

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('IMPORT')) {
      return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20';
    }
    if (action.includes('UPDATE') || action.includes('ASSIGN')) {
      return 'bg-indigo-500/10 text-indigo-800 border-indigo-500/20';
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-rose-500/10 text-rose-800 border-rose-500/20';
    }
    if (action.includes('RESET') || action.includes('STATUS')) {
      return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
    }
    return 'bg-purple-500/10 text-purple-800 border-purple-500/20';
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      CREATE_CLASSROOM: 'Tạo lớp học',
      UPDATE_CLASSROOM: 'Cập nhật lớp',
      DELETE_CLASSROOM: 'Xóa lớp học',
      ASSIGN_TEACHER_TO_CLASS: 'Phân công GV',
      REMOVE_TEACHER_FROM_CLASS: 'Gỡ phân công GV',
      ADD_STUDENTS_TO_CLASS: 'Thêm học sinh',
      REMOVE_STUDENT_FROM_CLASS: 'Gỡ học sinh',
      BULK_ASSIGN_STUDENTS: 'Xếp lớp hàng loạt',
      BULK_IMPORT_STUDENTS: 'Nhập học sinh Excel',
      CREATE_USER: 'Tạo tài khoản',
      UPDATE_USER: 'Cập nhật tài khoản',
      DELETE_USER: 'Xóa tài khoản',
      RESET_PIN: 'Đặt lại mã PIN',
      CREATE_CURRICULUM_UNIT: 'Tạo Unit',
      CREATE_UNIT: 'Tạo Unit',
      UPDATE_UNIT: 'Cập nhật Unit',
      DELETE_UNIT: 'Xóa Unit',
      CREATE_LESSON: 'Tạo bài học',
      UPDATE_LESSON: 'Cập nhật bài học',
      DELETE_LESSON: 'Xóa bài học',
      CREATE_SENTENCE_PATTERN: 'Tạo mẫu câu',
      UPDATE_SENTENCE_PATTERN: 'Cập nhật mẫu câu',
      DELETE_SENTENCE_PATTERN: 'Xóa mẫu câu',
      CREATE_VOCABULARY: 'Thêm từ vựng',
      UPDATE_VOCABULARY: 'Cập nhật từ vựng',
      DELETE_VOCABULARY: 'Xóa từ vựng',
      UPDATE_TOPIC_STATUS: 'Đổi trạng thái chủ đề',
      CREATE_REWARD: 'Tạo phần thưởng',
      UPDATE_REWARD: 'Cập nhật phần thưởng',
      REWARD_GRANTED: 'Trao thưởng cho trẻ'
    };
    return map[action] || action;
  };

  const getLogSummary = (log: any) => {
    const { action, details } = log;
    if (!details || Object.keys(details).length === 0) return '—';
    if (typeof details === 'string') return details;

    if (action === 'BULK_IMPORT_STUDENTS') {
      return `Nhập ${details.importedCount ?? details.successCount ?? 0} học sinh vào hệ thống${details.className ? ` (Lớp: ${details.className})` : ''}`;
    }
    if (action === 'DELETE_CLASSROOM') {
      return `Đã xóa lớp "${details.name || details.className || '—'}" (gỡ ${details.deletedStudentsCount ?? details.releasedStudentsCount ?? 0} học sinh)`;
    }
    if (action === 'CREATE_CLASSROOM' || action === 'UPDATE_CLASSROOM') {
      return `Lớp "${details.name || details.className || '—'}" ${details.status ? `[${details.status}]` : ''}`;
    }
    if (action === 'ASSIGN_TEACHER_TO_CLASS') {
      return `Phân công GV: ${details.teacherName || ''} ➔ Lớp ${details.className || ''}`;
    }
    if (action === 'ADD_STUDENTS_TO_CLASS') {
      return `Thêm ${details.count || details.studentCount || (details.studentIds ? details.studentIds.length : 1)} học sinh vào lớp ${details.className || ''}`;
    }
    if (action === 'REMOVE_STUDENT_FROM_CLASS') {
      return `Gỡ học sinh khỏi lớp ${details.className || ''}`;
    }
    if (action === 'CREATE_SENTENCE_PATTERN' || action === 'UPDATE_SENTENCE_PATTERN') {
      return `Mẫu câu: "${details.english || details.name || '—'}"`;
    }
    if (action === 'CREATE_VOCABULARY' || action === 'UPDATE_VOCABULARY') {
      return `Từ vựng: "${details.word || details.english || '—'}"`;
    }
    if (action === 'CREATE_LESSON' || action === 'UPDATE_LESSON') {
      return `Bài học: "${details.title || details.name || '—'}"`;
    }
    if (action === 'CREATE_UNIT' || action === 'UPDATE_UNIT') {
      return `Unit: "${details.title || details.name || '—'}"`;
    }
    if (action === 'RESET_PIN') {
      return `Đổi mã PIN tài khoản: "${details.username || details.name || '—'}"`;
    }
    if (action === 'DELETE_USER' || action === 'CREATE_USER' || action === 'UPDATE_USER') {
      return `Tài khoản: "${details.name || details.username || details.email || '—'}"`;
    }
    return details.name || details.title || details.english || details.className || JSON.stringify(details);
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const dataToExport = await fetchAllPages<any>(page => adminApi.getAuditLogs({
        page, limit: 100, action: actionFilter || undefined, targetType: targetTypeFilter || undefined,
        search: search.trim() || undefined, startDate: startDate || undefined, endDate: endDate || undefined
      }));
      const excelRows = dataToExport.map((item: any, idx: number) => ({
        STT: idx + 1,
        'Thời gian': new Date(item.createdAt).toLocaleString('vi-VN'),
        'Người thực hiện': item.user?.name || 'Hệ thống',
        'Email / Tài khoản': item.user?.email || item.user?.username || '—',
        'Vai trò': item.user?.role || 'admin',
        'Mã hành động': item.action,
        'Hành động (Tiếng Việt)': getActionLabel(item.action),
        'Đối tượng': item.targetType || 'Hệ thống',
        'ID Đối tượng': item.targetId || '—',
        'Tóm tắt thao tác': getLogSummary(item),
        'Chi tiết (JSON)': typeof item.details === 'object' ? JSON.stringify(item.details) : String(item.details || '')
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 22 },
        { wch: 28 },
        { wch: 12 },
        { wch: 28 },
        { wch: 26 },
        { wch: 18 },
        { wch: 26 },
        { wch: 40 },
        { wch: 45 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'NhatKyHoatDong');
      const filename = `KCEnglishKids_AuditLogs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    } finally {
      setExporting(false);
    }
  };

  const copyDetailsJson = () => {
    if (!selectedLog?.details) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {error && <p role="alert" className="admin-page-error">{error}</p>}
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-inherit flex items-center gap-2.5">
            <ClipboardList className="text-indigo-800" size={26} />
            <span>Nhật Ký Hoạt Động Hệ Thống (Audit Logs)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Ghi nhận chi tiết lịch sử mọi thao tác: quản lý lớp học, phân công giáo viên, nhập học sinh Excel, cập nhật giáo trình & mẫu câu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-inherit hover:bg-slate-100 transition flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-800' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={exportToExcel}
            disabled={exporting || loading}
            className="px-4 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white  transition flex items-center gap-2"
          >
            <Download size={14} className={exporting ? 'animate-bounce' : ''} />
            <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {/* Stats summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tổng bản ghi</p>
            <p className="text-xl font-black text-inherit mt-0.5">{totalCount.toLocaleString('vi-VN')}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-800">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Trang hiện tại</p>
            <p className="text-xl font-black text-indigo-800 mt-0.5">
              {page} <span className="text-xs font-normal text-slate-600">/ {totalPages}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-800">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Hiển thị / Trang</p>
            <p className="text-xl font-black text-emerald-800 mt-0.5">{logs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-800">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Bảo mật hệ thống</p>
            <p className="text-xs font-bold text-emerald-800 mt-1">Toàn vẹn 100%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-800">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-4">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Tìm theo tên admin, nội dung, lớp học, bài học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-inherit placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </form>

          {/* Action Filter */}
          <div className="md:col-span-4">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-inherit focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Tất cả nhóm hành động --</option>
              <optgroup label="🏢 Quản lý Lớp học">
                <option value="CREATE_CLASSROOM">Tạo lớp học</option>
                <option value="UPDATE_CLASSROOM">Cập nhật lớp học</option>
                <option value="DELETE_CLASSROOM">Xóa lớp học</option>
                <option value="ASSIGN_TEACHER_TO_CLASS">Phân công giáo viên</option>
                <option value="REMOVE_TEACHER_FROM_CLASS">Gỡ phân công giáo viên</option>
                <option value="ADD_STUDENTS_TO_CLASS">Thêm học sinh vào lớp</option>
                <option value="REMOVE_STUDENT_FROM_CLASS">Gỡ học sinh khỏi lớp</option>
                <option value="BULK_ASSIGN_STUDENTS">Xếp lớp hàng loạt</option>
              </optgroup>
              <optgroup label="👥 Người dùng & Học sinh">
                <option value="BULK_IMPORT_STUDENTS">Nhập học sinh từ Excel</option>
                <option value="CREATE_USER">Tạo tài khoản</option>
                <option value="UPDATE_USER">Cập nhật tài khoản</option>
                <option value="DELETE_USER">Xóa tài khoản</option>
                <option value="RESET_PIN">Đặt lại mã PIN</option>
              </optgroup>
              <optgroup label="📚 Giáo trình & Bài học">
                <option value="CREATE_UNIT">Tạo Unit mới</option>
                <option value="UPDATE_UNIT">Cập nhật Unit</option>
                <option value="DELETE_UNIT">Xóa Unit</option>
                <option value="CREATE_LESSON">Tạo bài học</option>
                <option value="UPDATE_LESSON">Cập nhật bài học</option>
                <option value="DELETE_LESSON">Xóa bài học</option>
              </optgroup>
              <optgroup label="💬 Mẫu câu & Từ vựng">
                <option value="CREATE_SENTENCE_PATTERN">Tạo mẫu câu</option>
                <option value="UPDATE_SENTENCE_PATTERN">Cập nhật mẫu câu</option>
                <option value="DELETE_SENTENCE_PATTERN">Xóa mẫu câu</option>
                <option value="CREATE_VOCABULARY">Thêm từ vựng</option>
                <option value="UPDATE_VOCABULARY">Cập nhật từ vựng</option>
                <option value="DELETE_VOCABULARY">Xóa từ vựng</option>
              </optgroup>
              <optgroup label="⚙️ Khác">
                <option value="UPDATE_TOPIC_STATUS">Đổi trạng thái chủ đề</option>
                <option value="CREATE_REWARD">Tạo phần thưởng</option>
                <option value="REWARD_GRANTED">Trao thưởng học sinh</option>
              </optgroup>
            </select>
          </div>

          {/* Target Type Filter */}
          <div className="md:col-span-3">
            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-inherit focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Mọi đối tượng --</option>
              <option value="ClassRoom">Lớp học (ClassRoom)</option>
              <option value="User">Người dùng / Học sinh (User)</option>
              <option value="Unit">Chương học (Unit)</option>
              <option value="Lesson">Bài học (Lesson)</option>
              <option value="LanguageContent">Mẫu câu (LanguageContent)</option>
              <option value="Vocabulary">Từ vựng (Vocabulary)</option>
              <option value="Topic">Chủ đề (Topic)</option>
              <option value="Reward">Phần thưởng (Reward)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date presets & pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mr-1">
              <Calendar size={14} className="text-indigo-800" />
              <span>Thời gian:</span>
            </span>

            <button
              type="button"
              onClick={() => handleApplyPreset('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                datePreset === 'ALL'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-inherit'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('TODAY')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                datePreset === 'TODAY'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-inherit'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('WEEK')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                datePreset === 'WEEK'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-inherit'
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('MONTH')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                datePreset === 'MONTH'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-inherit'
              }`}
            >
              30 ngày qua
            </button>

            {/* Custom Date Range */}
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('ALL');
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs text-inherit focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-600 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('ALL');
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs text-inherit focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition ml-auto"
            >
              <X size={13} />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-slate-600 font-bold">Đang tải nhật ký hoạt động...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
          <ClipboardList size={44} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-700">Không tìm thấy bản ghi nhật ký nào</p>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem các nhật ký khác.'
              : 'Các thao tác trên cổng quản trị sẽ tự động ghi lại tại đây.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-xs font-bold text-inherit transition"
            >
              Đặt lại tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3.5 px-4 w-44">Thời gian</th>
                  <th className="py-3.5 px-4 w-48">Người thực hiện</th>
                  <th className="py-3.5 px-4 w-40">Hành động</th>
                  <th className="py-3.5 px-4 w-32">Đối tượng</th>
                  <th className="py-3.5 px-4">Tóm tắt thao tác</th>
                  <th className="py-3.5 px-4 text-center w-24">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-100 transition-colors group">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-600 shrink-0" />
                        <span>{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {log.user?.avatar ? (
                          <img
                            src={log.user.avatar}
                            alt=""
                            className="h-7 w-7 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-800 border border-indigo-500/30 flex items-center justify-center font-black text-xs shrink-0">
                            {log.user?.name?.[0] || 'A'}
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-bold text-inherit text-xs truncate max-w-[130px]">
                            {log.user?.name || 'Admin'}
                          </p>
                          <p className="text-[10px] text-slate-600 truncate max-w-[130px]">
                            {log.user?.email || log.user?.role || 'admin'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                        {log.targetType || 'Hệ thống'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <p className="line-clamp-2 leading-relaxed">{getLogSummary(log)}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        title="Xem đầy đủ chi tiết"
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-700 text-slate-600 hover:text-inherit transition group-hover:scale-105"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị bản ghi {(page - 1) * limit + 1} -{' '}
                {Math.min(page * limit, totalCount)} trong tổng số{' '}
                <strong className="text-inherit font-bold">{totalCount}</strong>
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-600">Mỗi trang:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs text-inherit focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 disabled:opacity-40 text-inherit font-bold flex items-center gap-1 transition"
                >
                  <ChevronLeft size={14} />
                  <span>Trước</span>
                </button>

                <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 font-bold text-inherit text-xs">
                  {page} / {totalPages}
                </div>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 disabled:opacity-40 text-inherit font-bold flex items-center gap-1 transition"
                >
                  <span>Sau</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-800 flex items-center justify-center font-bold">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-inherit">Chi Tiết Nhật Ký Hoạt Động</h3>
                  <p className="text-xs text-slate-600">ID: {selectedLog._id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-inherit transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Key metadata grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <p className="text-slate-600 font-bold text-[10px] uppercase">Thời gian thực hiện</p>
                  <p className="text-inherit font-bold mt-0.5">
                    {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <p className="text-slate-600 font-bold text-[10px] uppercase">Người thực hiện</p>
                  <p className="text-inherit font-bold mt-0.5">
                    {selectedLog.user?.name || 'Admin'}{' '}
                    <span className="text-slate-600 font-normal">
                      ({selectedLog.user?.email || selectedLog.user?.role || 'admin'})
                    </span>
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <p className="text-slate-600 font-bold text-[10px] uppercase">Hành động</p>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getActionColor(
                        selectedLog.action
                      )}`}
                    >
                      {getActionLabel(selectedLog.action)}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-slate-600">
                      ({selectedLog.action})
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <p className="text-slate-600 font-bold text-[10px] uppercase">Đối tượng tác động</p>
                  <p className="text-inherit font-bold mt-0.5">
                    {selectedLog.targetType || 'Hệ thống'}
                    {selectedLog.targetId && (
                      <span className="text-slate-600 text-[10px] ml-1.5 font-mono">
                        [ID: {selectedLog.targetId}]
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Tóm tắt */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                <p className="text-slate-600 font-bold text-[10px] uppercase mb-1">Tóm tắt hoạt động</p>
                <p className="text-sm font-bold text-indigo-800">{getLogSummary(selectedLog)}</p>
              </div>

              {/* Payload Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Dữ liệu chi tiết (Payload JSON):</p>
                  <button
                    onClick={copyDetailsJson}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-100 text-[11px] font-bold text-slate-700 hover:text-inherit flex items-center gap-1.5 transition"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-800" />
                        <span className="text-emerald-800">Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Sao chép JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-2xl bg-white border border-slate-200 text-[11px] font-mono text-emerald-800 overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-xs font-bold text-inherit transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
