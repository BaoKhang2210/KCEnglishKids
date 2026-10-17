import React, { useEffect, useState } from 'react';
import {
  Settings,
  School,
  Save,
  Star
} from 'lucide-react';
import { adminApi } from '../../../services/api';

interface SettingsTabProps {
  onNotify: (msg: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSystemSettings();
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
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi.updateSystemSettings(form);
      if (res.success) {
        onNotify('Cập nhật cấu hình hệ thống thành công!');
      }
    } catch (err: any) {
      alert(err.message || 'Cập nhật cấu hình thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Đang tải thông số cấu hình hệ thống…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>Cấu Hình Tham Số Hệ Thống</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Thiết lập thông tin trường học, niên khóa và quy tắc tính điểm sao khen thưởng
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* School Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <School className="w-5 h-5 text-indigo-600" />
            <span>Thông Tin Trường Mầm Non / Trung Tâm</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Tên Trường / Trung Tâm
              </label>
              <input
                type="text"
                required
                value={form.schoolName}
                onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Niên Khóa Hoạt Động Mặc Định
              </label>
              <input
                type="text"
                required
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Số Điện Thoại Hotline
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Email Liên Hệ Quản Trị
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Địa Chỉ Trường Học
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
              />
            </div>
          </div>
        </div>

        {/* Security & Reward System Rules */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Star className="w-5 h-5 text-amber-500" />
            <span>Quy Tắc Điểm Sao & Đăng Nhập Học Sinh</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Mã PIN mặc định cho bé mới
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={form.defaultStudentPin}
                onChange={(e) => setForm({ ...form, defaultStudentPin: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono font-bold tracking-widest outline-none text-center"
              />
              <p className="text-[10px] text-slate-400 mt-1">Dành cho học sinh khi vừa được thêm vào hệ thống</p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Sao tối đa mỗi game mini
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={form.starsPerActivity}
                onChange={(e) => setForm({ ...form, starsPerActivity: parseInt(e.target.value, 10) || 3 })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-black outline-none text-center"
              />
              <p className="text-[10px] text-slate-400 mt-1">Mặc định: 3 sao / trò chơi</p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                Sao thưởng mở rương Unit
              </label>
              <input
                type="number"
                min={5}
                max={50}
                required
                value={form.maxBonusStarsPerUnit}
                onChange={(e) => setForm({ ...form, maxBonusStarsPerUnit: parseInt(e.target.value, 10) || 10 })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 font-black outline-none text-center"
              />
              <p className="text-[10px] text-slate-400 mt-1">Mặc định: 10 sao khi mở rương hoàn thành Unit</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu cài đặt…' : 'Lưu Thay Đổi Cấu Hình'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
