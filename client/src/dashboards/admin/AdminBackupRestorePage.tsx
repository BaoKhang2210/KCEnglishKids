import React, { useEffect, useRef, useState } from 'react';
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileJson,
  RotateCcw,
  Users,
  School,
  BookOpen,
  CalendarCheck,
  X
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { browserStorage } from '../../utils/browserStorage';

interface BackupValidationData {
  version: string;
  exportedAt: string | null;
  totalCollections: number;
  totalDocuments: number;
  keyMetrics: {
    users: number;
    students: number;
    teachers: number;
    admins: number;
    classrooms: number;
    schedules: number;
    lessons: number;
    units: number;
    vocabularies: number;
    activities: number;
    classroomSessions: number;
    progresses: number;
    starGrants: number;
  };
}

export const AdminBackupRestorePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentStats, setCurrentStats] = useState<any>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Backup state
  const [backingUp, setBackingUp] = useState(false);

  // Restore state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    sizeBytes: number;
    rawContent: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BackupValidationData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(prev => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getBackupRestoreOverview();
      if (res?.success && res.data?.currentStats) {
        setCurrentStats(res.data.currentStats);
      }
    } catch (err: any) {
      showAlert('error', 'Không thể tải thông tin dữ liệu: ' + (err?.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  // 1. Tải file sao lưu (.json) về máy
  const handleDownloadBackup = async () => {
    try {
      setBackingUp(true);
      const res = await adminApi.exportSystemBackup();
      const jsonString = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      anchor.setAttribute('href', downloadUrl);
      anchor.setAttribute('download', `KCEnglishKids_Backup_${timeStr}.json`);
      try {
        document.body.appendChild(anchor);
        anchor.click();
      } finally {
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
      showAlert('success', 'Đã tải file sao lưu hệ thống (.json) về máy thành công!');
    } catch (err: any) {
      showAlert('error', 'Lỗi khi tải file sao lưu: ' + (err?.message || 'Thất bại'));
    } finally {
      setBackingUp(false);
    }
  };

  // 2. Chọn file từ máy tính & Kiểm tra trước khi khôi phục
  const handleSelectFile = async (file: File) => {
    setValidationResult(null);
    setValidationError(null);
    setConfirmText('');

    if (!file.name.toLowerCase().endsWith('.json')) {
      setValidationError('Vui lòng chọn đúng file sao lưu có đuôi .json của hệ thống.');
      return;
    }

    try {
      setValidating(true);
      const rawText = await file.text();
      setSelectedFile({
        fileName: file.name,
        sizeBytes: file.size,
        rawContent: rawText
      });

      const res = await adminApi.validateSystemBackup({ backupRaw: rawText });
      if (res?.success && res.data) {
        setValidationResult(res.data);
      } else {
        setValidationError(res?.message || 'File sao lưu không hợp lệ.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'File sao lưu không đúng định dạng hoặc bị lỗi.');
    } finally {
      setValidating(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setValidationError(null);
    setConfirmText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Thực hiện khôi phục dữ liệu
  const isConfirmValid = ['KHÔI PHỤC', 'KHOI PHUC'].includes(confirmText.trim().toUpperCase());

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !validationResult || !isConfirmValid) return;

    try {
      setRestoring(true);
      const res = await adminApi.restoreSystemBackup({
        backupRaw: selectedFile.rawContent,
        fileName: selectedFile.fileName,
        confirmText: confirmText.trim()
      });

      if (res?.success) {
        if (res.data?.newToken) {
          browserStorage.setItem('kc_token', res.data.newToken);
        }
        showAlert('success', 'Khôi phục dữ liệu toàn hệ thống thành công!');
        handleClearFile();
        await loadOverview();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Khôi phục dữ liệu thất bại.');
    } finally {
      setRestoring(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header gọn gàng ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <span className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Database size={26} />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Sao Lưu &amp; Phục Hồi Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
              Tải bản sao lưu toàn bộ dữ liệu về máy tính hoặc khôi phục lại dữ liệu khi cần thiết
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="self-start sm:self-auto py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-700' : ''} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* ── Thông báo kết quả ───────────────────────────────────────────── */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs ${
            alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-700 shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Bố cục 2 cột chính: Trái (Sao lưu) - Phải (Phục hồi) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── KHỐI 1: SAO LƯU DỮ LIỆU (BACKUP) ────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
              <Download size={22} />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                Chức năng 1
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Sao Lưu Dữ Liệu Về Máy (Backup)
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Hệ thống sẽ gom toàn bộ dữ liệu hiện tại của trường (tài khoản, lớp học, thời khóa biểu, giáo trình, điểm danh, tiến độ học tập của bé...) thành <b>1 file <code>.json</code> duy nhất</b> để bạn lưu trữ an toàn trên máy tính.
          </p>

          {/* Tóm tắt dữ liệu đang có trên hệ thống */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Dữ liệu hiện có trong hệ thống:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Users size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-500">Người dùng</p>
                  <p className="text-sm font-black text-slate-900">
                    {currentStats.students || 0} học sinh • {currentStats.teachers || 0} GV
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                  <School size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-500">Lớp &amp; Lịch học</p>
                  <p className="text-sm font-black text-slate-900">
                    {currentStats.classrooms || 0} lớp • {currentStats.schedules || 0} lịch TKB
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <BookOpen size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-500">Giáo trình</p>
                  <p className="text-sm font-black text-slate-900">
                    {currentStats.lessons || 0} bài học • {currentStats.vocabularies || 0} từ vựng
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
                  <CalendarCheck size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-500">Giảng dạy</p>
                  <p className="text-sm font-black text-slate-900">
                    {currentStats.classroomSessions || 0} buổi dạy • {currentStats.progresses || 0} kết quả
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={backingUp}
            onClick={handleDownloadBackup}
            className="w-full py-3.5 px-5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 active:scale-99 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
          >
            <Download size={18} className={backingUp ? 'animate-bounce' : ''} />
            <span>{backingUp ? 'Đang tạo file sao lưu...' : 'Tải File Sao Lưu Về Máy (.json)'}</span>
          </button>
        </div>

        {/* ── KHỐI 2: PHỤC HỒI DỮ LIỆU (RESTORE) ───────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Upload size={22} />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                Chức năng 2
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Phục Hồi Dữ Liệu Từ File (Restore)
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Chọn một file sao lưu <code>.json</code> từ máy tính để đưa toàn bộ dữ liệu hệ thống quay về đúng trạng thái tại thời điểm file đó được tạo.
          </p>

          {/* Ô chọn file */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void handleSelectFile(file);
              }}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-400 text-center transition-all cursor-pointer space-y-2"
              >
                <div className="h-12 w-12 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-700 shadow-2xs">
                  <FileJson size={24} />
                </div>
                <p className="text-sm font-black text-slate-800">
                  Bấm vào đây để chọn file sao lưu <code className="text-indigo-700">.json</code> từ máy tính
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Hệ thống sẽ tự động kiểm tra nội dung file trước khi khôi phục
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                    <FileJson size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {selectedFile.fileName}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Dung lượng: {formatBytes(selectedFile.sizeBytes)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-rose-100 hover:text-rose-800 text-slate-700 text-xs font-bold shrink-0 cursor-pointer transition-colors"
                >
                  Đổi file khác
                </button>
              </div>
            )}
          </div>

          {/* Trạng thái đang kiểm tra file */}
          {validating && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center gap-3 text-xs font-bold text-indigo-950">
              <RefreshCw size={18} className="animate-spin text-indigo-700 shrink-0" />
              <span>Đang đọc và kiểm tra tính hợp lệ của file sao lưu...</span>
            </div>
          )}

          {/* Báo lỗi nếu file không hợp lệ */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-rose-900">
                <AlertTriangle size={17} className="text-rose-700 shrink-0" />
                <span>File không hợp lệ</span>
              </div>
              <p className="text-xs font-semibold text-rose-800">{validationError}</p>
            </div>
          )}

          {/* Khi file hợp lệ -> Hiện tóm tắt gọn gàng + Ô xác nhận */}
          {validationResult && (
            <form onSubmit={handleRestore} className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    <span>File sao lưu hợp lệ ({validationResult.totalDocuments} bản ghi)</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Ngày tạo: {formatDateTime(validationResult.exportedAt)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-white border border-emerald-100">
                    <p className="text-[11px] font-semibold text-slate-500">Học sinh</p>
                    <p className="text-sm font-black text-slate-900">{validationResult.keyMetrics.students}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-100">
                    <p className="text-[11px] font-semibold text-slate-500">Giáo viên</p>
                    <p className="text-sm font-black text-slate-900">{validationResult.keyMetrics.teachers}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-100">
                    <p className="text-[11px] font-semibold text-slate-500">Lớp học</p>
                    <p className="text-sm font-black text-slate-900">{validationResult.keyMetrics.classrooms}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-100">
                    <p className="text-[11px] font-semibold text-slate-500">Buổi dạy</p>
                    <p className="text-sm font-black text-slate-900">{validationResult.keyMetrics.classroomSessions}</p>
                  </div>
                </div>
              </div>

              {/* Bước xác nhận chống bấm nhầm */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                  ⚠️ <b>Lưu ý:</b> Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu trong file sao lưu này. Để tránh bấm nhầm, vui lòng gõ chữ{' '}
                  <code className="px-1.5 py-0.5 rounded bg-amber-200/80 font-black">KHÔI PHỤC</code> vào ô dưới đây:
                </p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="Gõ chữ: KHÔI PHỤC"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-xs sm:text-sm font-black text-slate-900 focus:outline-none focus:border-amber-600"
                />

                <button
                  type="submit"
                  disabled={!isConfirmValid || restoring}
                  className="w-full py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  {restoring ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đang khôi phục dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      <span>Xác Nhận Khôi Phục Dữ Liệu Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBackupRestorePage;
