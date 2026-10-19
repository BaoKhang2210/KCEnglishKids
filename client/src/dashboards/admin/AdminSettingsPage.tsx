import React, { useEffect, useState } from 'react';
import {
  Settings,
  School,
  Save,
  Star,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { adminApi } from '../../services/api';

export const AdminSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    schoolName: 'Trường Mầm Non Song Ngữ KCEnglishKids',
    academicYear: '2026-2027',
    contactPhone: '0901 234 567',
    contactEmail: 'admin@kcenglishkids.edu.vn',
    address: '123 Đường Sư Phạm, Quận 1, TP. Hồ Chí Minh',
    defaultStudentPin: '1234',
    starsPerActivity: 3,
    maxBonusStarsPerUnit: 10
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSettings();
      if (res.success && res.data) {
        setForm({
          schoolName: res.data.schoolName || 'Trường Mầm Non Song Ngữ KCEnglishKids',
          academicYear: res.data.academicYear || '2026-2027',
          contactPhone: res.data.contactPhone || '0901 234 567',
          contactEmail: res.data.contactEmail || 'admin@kcenglishkids.edu.vn',
          address: res.data.address || '123 Đường Sư Phạm, Quận 1, TP. Hồ Chí Minh',
          defaultStudentPin: res.data.defaultStudentPin || '1234',
          starsPerActivity: res.data.starsPerActivity ?? 3,
          maxBonusStarsPerUnit: res.data.maxBonusStarsPerUnit ?? 10
        });
      }
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      showAlert('error', 'Không thể tải cấu hình: ' + (err?.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi.updateSettings(form);
      if (res.success) {
        showAlert('success', res.message || 'Cập nhật cấu hình tham số hệ thống thành công!');
      }
    } catch (err: any) {
      showAlert('error', 'Cập nhật cấu hình thất bại: ' + (err?.message || 'Lỗi server'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Đang tải thông số cấu hình hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Alert toast notification */}
      {alert && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold shadow-lg transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-xs opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <Settings size={14} />
            <span>Cài Đặt Quản Trị</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Cấu Hình Tham Số Hệ Thống
          </h1>
          <p className="text-sm text-slate-400">
            Thiết lập thông tin trường mầm non, niên khóa và quy tắc tính điểm sao khen thưởng.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* School Profile Card */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <School size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Thông Tin Trường Mầm Non / Trung Tâm</h2>
              <p className="text-xs text-slate-400">Tên cơ sở giáo dục và thông tin liên hệ hiển thị toàn nền tảng</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Tên Trường / Trung Tâm *
              </label>
              <input
                type="text"
                required
                value={form.schoolName}
                onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Niên Khóa Hoạt Động Mặc Định *
              </label>
              <input
                type="text"
                required
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Số Điện Thoại Hotline
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Liên Hệ Quản Trị
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Địa Chỉ Trường Học
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Reward Rules Card */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star size={20} className="fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Quy Tắc Điểm Sao & Đăng Nhập Học Sinh</h2>
              <p className="text-xs text-slate-400">Cơ chế bảo mật mã PIN và hệ thống kinh tế sao khen thưởng cho bé</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound size={14} className="text-amber-400" />
                <span>Mã PIN Mặc Định</span>
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={form.defaultStudentPin}
                onChange={(e) => setForm({ ...form, defaultStudentPin: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-base text-amber-400 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-amber-400 mt-2"
              />
              <p className="text-[10px] text-slate-400 mt-2">Dành cho bé khi vừa tạo tài khoản chưa đổi PIN</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span>Sao / Trò Chơi</span>
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={form.starsPerActivity}
                onChange={(e) => setForm({ ...form, starsPerActivity: parseInt(e.target.value, 10) || 3 })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-base text-white font-black text-center focus:outline-none focus:border-indigo-500 mt-2"
              />
              <p className="text-[10px] text-slate-400 mt-2">Số sao tối đa nhận được khi hoàn thành 1 mini-game (1-5)</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <Star size={14} className="text-teal-400 fill-teal-400" />
                <span>Sao Rương Unit</span>
              </label>
              <input
                type="number"
                min={5}
                max={50}
                required
                value={form.maxBonusStarsPerUnit}
                onChange={(e) => setForm({ ...form, maxBonusStarsPerUnit: parseInt(e.target.value, 10) || 10 })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-base text-teal-400 font-black text-center focus:outline-none focus:border-teal-400 mt-2"
              />
              <p className="text-[10px] text-slate-400 mt-2">Sao thưởng khi mở rương hoàn thành trọn bộ Unit (5-50)</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Đang lưu cài đặt…' : 'Lưu Thay Đổi Cấu Hình'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
